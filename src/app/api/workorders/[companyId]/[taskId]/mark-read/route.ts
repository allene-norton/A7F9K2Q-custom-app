import { NextRequest } from 'next/server';
import { getNotificationIds, clearUnreadTask } from '@/lib/store';
import { markNotificationRead } from '@/lib/assembly/client';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ companyId: string; taskId: string }> },
) {
  const { companyId, taskId } = await params;
  const { token } = await req.json();

  if (!token) return Response.json({ success: false, error: 'token required' }, { status: 400 });

  const notificationIds = await getNotificationIds(taskId);

  if (notificationIds.length > 0) {
    await Promise.allSettled(
      notificationIds.map((id) => markNotificationRead(token, id)),
    );
    await clearUnreadTask(companyId, taskId);
  }

  return Response.json({ success: true, cleared: notificationIds.length });
}
