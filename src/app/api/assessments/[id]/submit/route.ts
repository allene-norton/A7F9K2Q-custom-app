import { NextRequest } from 'next/server';
import { getAssessmentById, appendWorkOrderRef, markAssessmentSubmitted } from '@/lib/store';
import {
  APPROVAL_NEEDED_FIELD_ID,
  CUSTOMER_SELECTION_OPTIONS,
} from '@/lib/constants';

const CLICKUP_BASE = 'https://api.clickup.com/api/v2';
const CUSTOMER_SELECTION_FIELD_ID = 'd82819f0-eaad-45d2-8c67-af1aa08a5949';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const { assessmentId, items } = await req.json();
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

  const results = await Promise.allSettled(
    items.map(
      async ({
        clickup_task_id,
        orderindex,
        comment,
      }: {
        clickup_task_id: string;
        orderindex: number;
        comment?: string;
      }) => {
        const selectedOption = CUSTOMER_SELECTION_OPTIONS.find(
          (opt) => opt.orderindex === orderindex,
        );

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
        const createRes = await fetch(`${CLICKUP_BASE}/list/${listId}/task`, {
          method: 'POST',
          headers: authHeaders,
          body: JSON.stringify({
            name: task.name,
            description: task.description ?? '',
            status: selectedOption?.clickupStatus,
            tags: (task.tags ?? []).map((t: { name: string }) => t.name),
            assignees: (task.assignees ?? []).map((a: { id: number }) => a.id),
          }),
        });
        const newTask = await createRes.json();
        const newTaskId: string = newTask.id;

        if (!newTaskId) {
          throw new Error(`Failed to create new task for ${clickup_task_id}`);
        }

        // 3. Merge the original subtask into the new task
        await fetch(`${CLICKUP_BASE}/task/${newTaskId}/merge`, {
          method: 'POST',
          headers: authHeaders,
          body: JSON.stringify({ source_task_ids: [clickup_task_id] }),
        });

        // 4. Set Customer Selection field + clear Approval Needed on the new task
        await Promise.all([
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
        ]);

        // 5. Post customer comment on the new task if provided
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

        // 6. Save work order ref to Redis (with location from assessment item)
        const assessmentItem = assessmentData.items.find(
          (item) => item.clickup_task_id === clickup_task_id,
        );
        await appendWorkOrderRef(id, {
          taskId: newTaskId,
          listId,
          addedAt: new Date().toISOString(),
          location: assessmentItem?.location ?? '',
          assessmentName: assessmentData.assessmentName,
        });
      },
    ),
  );

  const failed = results.filter((r) => r.status === 'rejected').length;
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
    ]);
  }
  return Response.json({ success: failed === 0, failed });
}
