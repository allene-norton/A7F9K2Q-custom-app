import { NextRequest } from 'next/server';
import { getUnreadTaskIds } from '@/lib/store';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ companyId: string }> },
) {
  const { companyId } = await params;
  const taskIds = await getUnreadTaskIds(companyId);
  return Response.json({ taskIds });
}
