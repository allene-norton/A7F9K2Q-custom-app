import { NextRequest } from 'next/server';
import { getRecentInternalNotifications } from '@/lib/store';

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token');
  if (!token) return Response.json({ error: 'token required' }, { status: 400 });

  const notifications = await getRecentInternalNotifications();
  return Response.json({ notifications });
}
