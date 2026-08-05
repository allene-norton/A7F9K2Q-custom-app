import { NextRequest } from 'next/server';
import { getWorkOrderRefs, getAssessmentsForCompany, getTaskComments, getTaskStatuses, setTaskStatus, addUnreadTask } from '@/lib/store';
import { hexToRgba } from '@/lib/utils';
import { findMatchingFolders, getFolderLists } from '@/lib/clickup/clickup_actions';

async function withConcurrency<T>(tasks: (() => Promise<T>)[], limit: number): Promise<T[]> {
  const results: T[] = new Array(tasks.length);
  let next = 0;
  async function run(): Promise<void> {
    while (next < tasks.length) { const i = next++; results[i] = await tasks[i](); }
  }
  await Promise.all(Array.from({ length: Math.min(limit, tasks.length) }, run));
  return results;
}

const CLICKUP_BASE = 'https://api.clickup.com/api/v2';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function formatTask(task: any) {
  return {
    id: task.id,
    clickup_task_id: task.id,
    issue: task.name,
    description: task.text_content || task.description || '',
    status: task.status?.status ?? '',
    statusColor: task.status?.color ?? '#6b7280',
    location: task.list?.name ?? '',
    category: task.priority?.priority ?? 'Uncategorized',
    priority: task.priority?.priority?.toLowerCase() ?? null,
    images: (task.attachments ?? [])
      .filter((a: { url?: string }) => a.url)
      .map((a: { url: string; thumbnail_large?: string }) => a.thumbnail_large || a.url),
    tags: (task.tags ?? []).map((t: { name: string; tag_bg: string }) => ({
      name: t.name,
      fg: '#1a1c1f',
      bg: hexToRgba(t.tag_bg, 0.15),
    })),
    technician: task.assignees?.[0]?.username ?? '',
    created_date: task.date_created
      ? new Date(parseInt(task.date_created)).toISOString().split('T')[0]
      : '',
    updated_date: task.date_updated
      ? new Date(parseInt(task.date_updated)).toISOString().split('T')[0]
      : '',
    comments: '',
    thread: [],
    estimated_cost_min: 0,
    estimated_cost_max: 0,
  };
}

async function attachThreads<T extends { id: string }>(items: T[]) {
  const threads = await Promise.all(items.map((item) => getTaskComments(item.id)));
  return items.map((item, i) => ({ ...item, thread: threads[i] }));
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ companyId: string }> },
) {
  const { companyId } = await params;
  const key = process.env.CLICKUP_KEY;
  if (!key) return Response.json({ items: [] }, { status: 500 });

  const companyName = req.nextUrl.searchParams.get('companyName');

  // Internal mode: fetch top-level tasks directly from ClickUp,
  // then overlay location from stored assessment items.
  if (companyName) {
    try {
      const [folders, storedAssessments] = await Promise.all([
        findMatchingFolders(companyName, companyId),
        getAssessmentsForCompany(companyId),
      ]);
      if (folders.length === 0) return Response.json({ items: [] });

      // Build a name→location lookup from all stored assessment items
      const nameToLocation = new Map<string, string>();
      for (const assessment of storedAssessments) {
        for (const item of assessment.items) {
          if (item.location) nameToLocation.set(item.issue, item.location);
        }
      }

      const folderItems = await withConcurrency(
        folders.map((folder) => async () => {
          const lists = await getFolderLists(folder.id);
          const assessmentsList = lists.find((l) =>
            l.name.toLowerCase().includes('assessment'),
          );
          if (!assessmentsList) return [];

          const res = await fetch(
            `${CLICKUP_BASE}/list/${assessmentsList.id}/task?subtasks=false&include_closed=true`,
            { headers: { Authorization: key } },
          );
          const data = await res.json();
          const workOrderTasks = (data.tasks ?? []).filter(
            (t: { name: string }) => !t.name.toLowerCase().includes('assessment'),
          );

          return workOrderTasks.map((task: unknown) => {
            const formatted = formatTask(task);
            const storedLocation = nameToLocation.get(formatted.issue);
            return {
              ...formatted,
              ...(storedLocation ? { location: storedLocation } : {}),
              folderName: folder.name,
            };
          });
        }),
        5,
      );

      const items = folderItems.flat();
      return Response.json({ items: await attachThreads(items) });
    } catch {
      return Response.json({ items: [] });
    }
  }

  // Customer mode: fetch from Redis work order refs
  const refs = await getWorkOrderRefs(companyId);
  if (refs.length === 0) return Response.json({ items: [] });

  const refMap = new Map(refs.map((r) => [r.taskId, r]));

  const headers = { Authorization: key };
  const tasks = await Promise.allSettled(
    refs.map((ref) =>
      fetch(`${CLICKUP_BASE}/task/${ref.taskId}`, { headers }).then((r) => r.json()),
    ),
  );

  const items = tasks
    .filter((r) => r.status === 'fulfilled')
    .map((r) => (r as PromiseFulfilledResult<unknown>).value)
    .filter((task) => (task as { id?: string })?.id)
    .map((task) => {
      const formatted = formatTask(task);
      const ref = refMap.get(formatted.id);
      if (ref?.location) formatted.location = ref.location;
      return formatted;
    });

  const [itemsWithThreads, storedStatuses] = await Promise.all([
    attachThreads(items),
    getTaskStatuses(items.map((i) => i.id)),
  ]);

  // Detect status changes; collect IDs so the client can merge them into unread state immediately
  const newlyUnreadIds: string[] = [];
  await Promise.all(
    items.map(async (item) => {
      const stored = storedStatuses.get(item.id);
      if (stored === undefined) {
        // First time seeing this task — store status, don't mark unread
        await setTaskStatus(item.id, item.status);
      } else if (stored !== item.status) {
        newlyUnreadIds.push(item.id);
        await Promise.all([
          addUnreadTask(companyId, item.id),
          setTaskStatus(item.id, item.status),
        ]);
      }
    }),
  );

  return Response.json({ items: itemsWithThreads, newlyUnreadIds });
}
