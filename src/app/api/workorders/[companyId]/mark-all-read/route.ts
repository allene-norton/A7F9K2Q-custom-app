import { NextRequest } from 'next/server';
import { getUnreadTaskIds, getNotificationIds, clearUnreadTask } from '@/lib/store';
import { markNotificationRead } from '@/lib/assembly/client';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ companyId: string }> },
) {
  const { companyId } = await params;
  const { token } = await req.json();

  if (!token) return Response.json({ success: false, error: 'token required' }, { status: 400 });

  const taskIds = await getUnreadTaskIds(companyId);
  if (taskIds.length === 0) return Response.json({ success: true, cleared: 0 });

  const allNotificationIds = (
    await Promise.all(taskIds.map((taskId) => getNotificationIds(taskId)))
  ).flat();

  await Promise.allSettled(allNotificationIds.map((id) => markNotificationRead(token, id)));
  await Promise.all(taskIds.map((taskId) => clearUnreadTask(companyId, taskId)));

  return Response.json({ success: true, cleared: taskIds.length });
}
