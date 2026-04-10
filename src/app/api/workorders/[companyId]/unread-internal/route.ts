import { NextRequest } from 'next/server';
import { getUnreadInternalTaskIds } from '@/lib/store';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ companyId: string }> },
) {
  const { companyId } = await params;
  const taskIds = await getUnreadInternalTaskIds(companyId);
  return Response.json({ taskIds });
}
