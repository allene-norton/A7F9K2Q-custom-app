import { NextRequest } from 'next/server';
import { getAssessmentById, getWorkOrderRefs, appendTaskComment, copyTaskComments, markAssessmentSubmitted, getNotificationIds, clearUnreadTask, setWorkOrderCompany, redis } from '@/lib/store';
import { markNotificationRead } from '@/lib/assembly/client';
import { notifyInternalUsersAbout } from '@/lib/notifications';
import type { StoredComment } from '@/types/types-index';
import { APPROVAL_NEEDED_FIELD_ID, CUSTOMER_SELECTION_FIELD_ID, CUSTOMER_SELECTION_OPTIONS } from '@/lib/constants';

async function withConcurrency<T>(tasks: (() => Promise<T>)[], limit: number): Promise<PromiseSettledResult<T>[]> {
  const results: PromiseSettledResult<T>[] = new Array(tasks.length);
  let next = 0;
  async function run(): Promise<void> {
    while (next < tasks.length) {
      const i = next++;
      try { results[i] = { status: 'fulfilled', value: await tasks[i]() }; }
      catch (e) { results[i] = { status: 'rejected', reason: e }; }
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, tasks.length) }, run));
  return results;
}

const CLICKUP_BASE = 'https://api.clickup.com/api/v2';
const PRIMARY_CATEGORY_FIELD_ID = '3188285b-248d-4f23-b84d-58baddbaba0b';
const HIGH_CATEGORY_FIELD_ID = '2a8dcc4f-7c19-40b3-b399-3d83ec3e99c3';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const { assessmentId, items, senderId, token } = await req.json();
  const key = process.env.CLICKUP_KEY;

  if (!key) {
    return Response.json(
      { success: false, error: 'Missing API key' },
      { status: 500 },
    );
  }

  const assessmentData = await getAssessmentById(id, assessmentId);
  if (!assessmentData) {
    return Response.json(
      { success: false, error: 'Assessment not found' },
      { status: 404 },
    );
  }

  const authHeaders = {
    Authorization: key,
    'Content-Type': 'application/json',
  };

  const now = new Date();
  const formattedDate = `${(now.getMonth() + 1).toString().padStart(2, '0')}/${now.getDate().toString().padStart(2, '0')}/${now.getFullYear()}`;

  // Process items sequentially to avoid ClickUp rate limits.
  // Each item makes ~6 API calls; concurrent processing reliably triggers 429s.
  type ItemResult = { clickup_task_id: string; newTaskId: string; listId: string; comment?: string };
  const succeeded: ItemResult[] = [];
  const errors: string[] = [];

  for (const { clickup_task_id, orderindex, comment } of items as { clickup_task_id: string; orderindex: number; comment?: string }[]) {
    try {
      // 1. Fetch the original subtask to get list ID, name, tags, assignees
      const taskRes = await fetch(
        `${CLICKUP_BASE}/task/${clickup_task_id}`,
        { headers: { Authorization: key } },
      );
      const task = await taskRes.json();
      const listId: string = task.list?.id;

      if (!listId) {
        throw new Error(`Could not resolve list ID for task ${clickup_task_id}`);
      }

      // 2. Create a new top-level task in the same list
      // description is intentionally omitted — the merge (step 3) brings it
      // from the original subtask, avoiding duplication
      const createRes = await fetch(`${CLICKUP_BASE}/list/${listId}/task`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
          name: task.name,
          tags: (task.tags ?? []).map((t: { name: string }) => t.name),
          assignees: (task.assignees ?? []).map((a: { id: number }) => a.id),
        }),
      });
      const newTask = await createRes.json();
      const newTaskId: string = newTask.id;

      if (!newTaskId) {
        throw new Error(`Failed to create new task for ${clickup_task_id}: ${JSON.stringify(newTask)}`);
      }

      // 3. Merge the original subtask into the new task
      await fetch(`${CLICKUP_BASE}/task/${newTaskId}/merge`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({ source_task_ids: [clickup_task_id] }),
      });

      // 4. After merge, explicitly set description to the original's content
      //    (ClickUp's merge can concatenate descriptions, causing duplication)
      //    + Set task status from customer selection + Set Customer Selection field + clear Approval Needed
      //    + Re-apply category fields — ClickUp merge does not reliably copy custom fields
      const originalDescription = task.description ?? task.text_content ?? '';
      const selectionOption = CUSTOMER_SELECTION_OPTIONS.find((o) => o.orderindex === orderindex);

      // Extract category field values from the original task to re-apply after merge
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const getFieldValue = (fieldId: string) => (task.custom_fields ?? []).find((f: any) => f.id === fieldId)?.value;
      const primaryCategoryValue = getFieldValue(PRIMARY_CATEGORY_FIELD_ID);
      const highCategoryValue = getFieldValue(HIGH_CATEGORY_FIELD_ID);

      await Promise.all([
        fetch(`${CLICKUP_BASE}/task/${newTaskId}`, {
          method: 'PUT',
          headers: authHeaders,
          body: JSON.stringify({
            description: originalDescription,
            ...(selectionOption ? { status: selectionOption.clickupStatus } : {}),
          }),
        }),
        fetch(
          `${CLICKUP_BASE}/task/${newTaskId}/field/${CUSTOMER_SELECTION_FIELD_ID}`,
          {
            method: 'POST',
            headers: authHeaders,
            body: JSON.stringify({ value: orderindex }),
          },
        ),
        fetch(
          `${CLICKUP_BASE}/task/${newTaskId}/field/${APPROVAL_NEEDED_FIELD_ID}`,
          {
            method: 'POST',
            headers: authHeaders,
            body: JSON.stringify({ value: false }),
          },
        ),
        ...(primaryCategoryValue !== undefined && primaryCategoryValue !== null
          ? [fetch(`${CLICKUP_BASE}/task/${newTaskId}/field/${PRIMARY_CATEGORY_FIELD_ID}`, {
              method: 'POST',
              headers: authHeaders,
              body: JSON.stringify({ value: primaryCategoryValue }),
            })]
          : []),
        ...(highCategoryValue !== undefined && highCategoryValue !== null
          ? [fetch(`${CLICKUP_BASE}/task/${newTaskId}/field/${HIGH_CATEGORY_FIELD_ID}`, {
              method: 'POST',
              headers: authHeaders,
              body: JSON.stringify({ value: highCategoryValue }),
            })]
          : []),
      ]);

      // 5b. Copy any pre-submission notes from old task ID to new work order task ID
      await copyTaskComments(clickup_task_id, newTaskId);

      // 6. Sync customer comment to ClickUp (Redis write batched below)
      if (comment?.trim()) {
        const formattedComment = `Comment from ${assessmentData.companyName} at ${formattedDate}: ${comment}`;
        await fetch(`${CLICKUP_BASE}/task/${newTaskId}/comment`, {
          method: 'POST',
          headers: authHeaders,
          body: JSON.stringify({
            comment_text: formattedComment,
            notify_all: false,
          }),
        });
      }

      succeeded.push({ clickup_task_id, newTaskId, listId, comment });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error('[submit] item failed:', msg);
      errors.push(msg);
    }
  }

  // Batch all Redis writes after ClickUp processing completes.
  // Doing this serially avoids read-modify-write race conditions when
  // appendWorkOrderRef is called concurrently (last writer would overwrite others).
  const existingRefs = await getWorkOrderRefs(id);
  const newRefs = succeeded.map(({ clickup_task_id, newTaskId, listId }) => {
    const assessmentItem = assessmentData.items.find(
      (item) => item.clickup_task_id === clickup_task_id,
    );
    return {
      taskId: newTaskId,
      listId,
      addedAt: new Date().toISOString(),
      location: assessmentItem?.location ?? '',
      assessmentName: assessmentData.assessmentName,
    };
  });
  const existingIds = new Set(existingRefs.map((r) => r.taskId));
  const mergedRefs = [...existingRefs, ...newRefs.filter((r) => !existingIds.has(r.taskId))];

  await Promise.all([
    redis.set(`workorders:${id}`, mergedRefs),
    ...succeeded.map(({ newTaskId }) => setWorkOrderCompany(newTaskId, id)),
    ...succeeded
      .filter(({ comment }) => comment?.trim())
      .map(({ newTaskId, comment }) => {
        const storedComment: StoredComment = {
          id: crypto.randomUUID(),
          text: comment!.trim(),
          authorName: assessmentData.companyName,
          isInternal: false,
          createdAt: new Date().toISOString(),
        };
        return appendTaskComment(newTaskId, storedComment);
      }),
  ]);

  const failed = errors.length;
  if (failed === 0) {
    // assessmentId is stored as "assess_{companyId}_{clickupTaskId}" — extract the real ClickUp ID
    const prefix = `assess_${id}_`;
    const parentClickUpTaskId = assessmentData.assessmentId.startsWith(prefix)
      ? assessmentData.assessmentId.slice(prefix.length)
      : assessmentData.assessmentId;

    await Promise.all([
      markAssessmentSubmitted(id, assessmentId),
      fetch(`${CLICKUP_BASE}/task/${parentClickUpTaskId}`, {
        method: 'PUT',
        headers: authHeaders,
        body: JSON.stringify({ status: 'submitted' }),
      }),
      fetch(
        `${CLICKUP_BASE}/task/${parentClickUpTaskId}/field/${APPROVAL_NEEDED_FIELD_ID}`,
        {
          method: 'POST',
          headers: authHeaders,
          body: JSON.stringify({ value: false }),
        },
      ),
    ]);
  }
  if (failed === 0) {
    // Clear the assessment-sent notification for this customer
    const assessNotifIds = await getNotificationIds(`assess:${id}`);
    if (assessNotifIds.length > 0 && token) {
      await Promise.allSettled(assessNotifIds.map((nid) => markNotificationRead(token, nid)));
    }
    await clearUnreadTask(id, `assess:${id}`);
  }

  if (failed === 0 && senderId && token) {
    await notifyInternalUsersAbout(
      token,
      senderId,
      {
        inProduct: {
          title: `${assessmentData.companyName} submitted their assessment`,
          body: `${assessmentData.assessmentName} has been submitted. Work orders have been created in ClickUp.`,
        },
      },
      {
        type: 'assessment_submitted',
        companyId: id,
        companyName: assessmentData.companyName,
        assessmentName: assessmentData.assessmentName,
      },
    );
  }

  return Response.json({ success: failed === 0, failed, errors });
}
