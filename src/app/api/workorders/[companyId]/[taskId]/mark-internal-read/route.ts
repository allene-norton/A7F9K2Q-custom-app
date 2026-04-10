import { NextRequest } from 'next/server';
import { clearUnreadInternalTask } from '@/lib/store';

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ companyId: string; taskId: string }> },
) {
  const { companyId, taskId } = await params;
  await clearUnreadInternalTask(companyId, taskId);
  return Response.json({ success: true });
}
