import { NextRequest } from 'next/server';
import { getWorkOrderCompany } from '@/lib/store';
import { notifyClientsServerSide } from '@/lib/notifications';

const CLICKUP_BASE = 'https://api.clickup.com/api/v2';

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { event, task_id, history_items } = body;

  if (event !== 'taskStatusUpdated' || !task_id) {
    return Response.json({ ok: true });
  }

  // Look up which company owns this task
  const companyId = await getWorkOrderCompany(task_id);
  if (!companyId) {
    // Not a tracked work order — ignore
    return Response.json({ ok: true });
  }

  // Extract new status from history payload
  const newStatus: string =
    history_items?.[0]?.after?.status ?? 'updated';

  // Fetch task name from ClickUp
  const key = process.env.CLICKUP_KEY;
  let taskName = 'Your work order';
  if (key) {
    try {
      const taskRes = await fetch(`${CLICKUP_BASE}/task/${task_id}`, {
        headers: { Authorization: key },
      });
      if (taskRes.ok) {
        const task = await taskRes.json();
        if (task.name) taskName = task.name;
      }
    } catch {
      // non-fatal — we still send the notification with the generic name
    }
  }

  const statusLabel = newStatus.charAt(0).toUpperCase() + newStatus.slice(1);

  await notifyClientsServerSide(
    companyId,
    {
      inProduct: {
        title: `Work order status updated: ${statusLabel}`,
        body: `"${taskName}" has been moved to ${statusLabel}.`,
      },
    },
    task_id,
  );

  return Response.json({ ok: true });
}
