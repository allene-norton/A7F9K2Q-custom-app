import { NextRequest } from 'next/server';
import { getWorkOrderCompany } from '@/lib/store';
import { notifyClientsServerSide } from '@/lib/notifications';

const CLICKUP_BASE = 'https://api.clickup.com/api/v2';

// Health check — some platforms probe with GET before registering
export async function GET() {
  return Response.json({ ok: true });
}

export async function POST(req: NextRequest) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    // ClickUp test pings can arrive with an empty body
    return Response.json({ ok: true });
  }

  const { event, task_id, history_items } = body ?? {};

  if (event !== 'taskStatusUpdated' || !task_id) {
    return Response.json({ ok: true });
  }

  try {
    // Look up which company owns this task
    const companyId = await getWorkOrderCompany(task_id);
    if (!companyId) {
      return Response.json({ ok: true });
    }

    const newStatus: string = history_items?.[0]?.after?.status ?? 'updated';

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
        // non-fatal
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
  } catch (err) {
    console.error('[webhook] taskStatusUpdated error:', err);
    // Still return 200 so ClickUp doesn't retry indefinitely
  }

  return Response.json({ ok: true });
}
