import { NextRequest } from 'next/server';
import { getWorkOrderRefs } from '@/lib/store';
import { hexToRgba } from '@/lib/utils';
import { findMatchingFolder, getFolderLists } from '@/lib/clickup/clickup_actions';

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
    comments: '',
    estimated_cost_min: 0,
    estimated_cost_max: 0,
  };
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ companyId: string }> },
) {
  const { companyId } = await params;
  const key = process.env.CLICKUP_KEY;
  if (!key) return Response.json({ items: [] }, { status: 500 });

  const companyName = req.nextUrl.searchParams.get('companyName');

  // Internal mode: fetch top-level tasks directly from ClickUp
  if (companyName) {
    try {
      const folder = await findMatchingFolder(companyName);
      if (!folder) return Response.json({ items: [] });

      const lists = await getFolderLists(folder.id);
      const assessmentsList = lists.find((l) =>
        l.name.toLowerCase().includes('assessment'),
      );
      if (!assessmentsList) return Response.json({ items: [] });

      const res = await fetch(
        `${CLICKUP_BASE}/list/${assessmentsList.id}/task?subtasks=false&include_closed=true`,
        { headers: { Authorization: key } },
      );
      const data = await res.json();
      const allTasks: unknown[] = data.tasks ?? [];

      const workOrderTasks = (allTasks as Array<{ name: string }>).filter(
        (t) => !t.name.toLowerCase().includes('assessment'),
      );

      return Response.json({ items: workOrderTasks.map(formatTask) });
    } catch {
      return Response.json({ items: [] });
    }
  }

  // Customer mode: fetch from Redis work order refs
  const refs = await getWorkOrderRefs(companyId);
  if (refs.length === 0) return Response.json({ items: [] });

  const headers = { Authorization: key };
  const tasks = await Promise.allSettled(
    refs.map((ref) =>
      fetch(`${CLICKUP_BASE}/task/${ref.taskId}`, { headers }).then((r) =>
        r.json(),
      ),
    ),
  );

  const items = tasks
    .filter((r) => r.status === 'fulfilled')
    .map((r) => (r as PromiseFulfilledResult<unknown>).value)
    .filter((task) => (task as { id?: string })?.id)
    .map(formatTask);

  return Response.json({ items });
}
