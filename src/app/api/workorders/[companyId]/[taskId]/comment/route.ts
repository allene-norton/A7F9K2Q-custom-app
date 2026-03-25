import { NextRequest } from 'next/server';

const CLICKUP_BASE = 'https://api.clickup.com/api/v2';
const MM_TEAM_NAME = 'MM Team';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ companyId: string; taskId: string }> },
) {
  const { taskId } = await params;
  const { text, authorName, isInternal } = await req.json();
  const key = process.env.CLICKUP_KEY;

  if (!key) return Response.json({ success: false }, { status: 500 });
  if (!text?.trim()) return Response.json({ success: false, error: 'Empty comment' }, { status: 400 });

  const now = new Date();
  const timestamp = `${(now.getMonth() + 1).toString().padStart(2, '0')}/${now.getDate().toString().padStart(2, '0')}/${now.getFullYear()} ${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
  const displayName = isInternal ? MM_TEAM_NAME : (authorName ?? 'Customer');
  const formatted = `${displayName} [${timestamp}]: ${text.trim()}`;

  const res = await fetch(`${CLICKUP_BASE}/task/${taskId}/comment`, {
    method: 'POST',
    headers: {
      Authorization: key,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ comment_text: formatted, notify_all: false }),
  });

  return Response.json({ success: res.ok });
}
