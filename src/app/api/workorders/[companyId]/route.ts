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

const CATEGORY_FIELD_ID = '3188285b-248d-4f23-b84d-58baddbaba0b';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractCategory(task: any): string {
  const field = (task.custom_fields ?? []).find((f: { id: string }) => f.id === CATEGORY_FIELD_ID);
  if (field?.value !== undefined && field?.value !== null && field?.type_config?.options) {
    const valueAsNumber = typeof field.value === 'string' ? parseInt(field.value, 10) : field.value;
    const option = field.type_config.options.find((opt: { orderindex: number }) => opt.orderindex === valueAsNumber);
    if (option) return option.name;
  }
  return task.priority?.priority ?? 'Uncategorized';
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function formatTask(task: any) {
  return {
    id: task.id,
    clickup_task_id: task.id,
    issue: task.name,
    description: task.description || task.text_content || '',
    status: task.status?.status ?? '',
    statusColor: task.status?.color ?? '#6b7280',
    location: task.list?.name ?? '',
    category: extractCategory(task),
    priority: task.priority?.priority?.toLowerCase() ?? null,
    images: (task.attachments ?? [])
      .filter((a: { url?: string; thumbnail_large?: string; mimetype?: string }) => {
        if (!a.url) return false;
        if (!a.thumbnail_large) {
          const ext = a.url.split('?')[0].toLowerCase();
          if (ext.endsWith('.heic') || ext.endsWith('.heif')) return false;
          if (a.mimetype === 'image/heic' || a.mimetype === 'image/heif') return false;
        }
        return true;
      })
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
  // Redis refs are used as a fallback to catch any submitted work orders
  // that the folder discovery misses (pagination gaps, folder name mismatch, etc.).
  if (companyName) {
    try {
      const [folders, storedAssessments, redisRefs] = await Promise.all([
        findMatchingFolders(companyName, companyId),
        getAssessmentsForCompany(companyId),
        getWorkOrderRefs(companyId),
      ]);

      // Build a name→location lookup from all stored assessment items
      const nameToLocation = new Map<string, string>();
      for (const assessment of storedAssessments) {
        for (const item of assessment.items) {
          if (item.location) nameToLocation.set(item.issue, item.location);
        }
      }

      // Build a ref map for location overlay on Redis-sourced tasks
      const refMap = new Map(redisRefs.map((r) => [r.taskId, r]));

      const discoveredItems: ReturnType<typeof formatTask>[] = [];

      if (folders.length > 0) {
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
        discoveredItems.push(...folderItems.flat());
      }

      // Fill in any Redis-known work orders not found by folder discovery
      const discoveredIds = new Set(discoveredItems.map((i) => i.id));
      const missingRefs = redisRefs.filter((r) => !discoveredIds.has(r.taskId));

      if (missingRefs.length > 0) {
        const missingTasks = await Promise.allSettled(
          missingRefs.map((ref) =>
            fetch(`${CLICKUP_BASE}/task/${ref.taskId}`, { headers: { Authorization: key } }).then((r) => r.json()),
          ),
        );
        for (const result of missingTasks) {
          if (result.status === 'fulfilled' && result.value?.id) {
            const formatted = formatTask(result.value);
            const ref = refMap.get(formatted.id);
            if (ref?.location) formatted.location = ref.location;
            discoveredItems.push(formatted);
          }
        }
      }

      return Response.json({ items: await attachThreads(discoveredItems) });
    } catch (e) {
      console.error('[workorders internal] error:', e);
      return Response.json({ items: [] });
    }
  }

  // Customer mode: fetch from Redis work order refs
  const refs = await getWorkOrderRefs(companyId);
  if (refs.length === 0) return Response.json({ items: [] });

  const refMap = new Map(refs.map((r) => [r.taskId, r]));

  const headers = { Authorization: key };
  const taskResults = await withConcurrency(
    refs.map((ref) => async () => {
      try {
        const r = await fetch(`${CLICKUP_BASE}/task/${ref.taskId}`, { headers });
        if (r.status === 429) {
          const retryAfter = parseInt(r.headers.get('Retry-After') ?? '1', 10);
          await new Promise((resolve) => setTimeout(resolve, (retryAfter || 1) * 1000));
          const r2 = await fetch(`${CLICKUP_BASE}/task/${ref.taskId}`, { headers });
          return r2.ok ? r2.json() : null;
        }
        return r.ok ? r.json() : null;
      } catch {
        return null;
      }
    }),
    4,
  );

  const items = taskResults
    .filter((task): task is NonNullable<typeof task> => !!(task as { id?: string })?.id)
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
