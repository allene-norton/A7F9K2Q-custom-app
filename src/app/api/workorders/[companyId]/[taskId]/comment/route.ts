import { NextRequest } from 'next/server';
import { appendTaskComment } from '@/lib/store';
import { StoredComment } from '@/types/types-index';
import { notifyClientsAbout, notifyInternalUsersAbout } from '@/lib/notifications';

const CLICKUP_BASE = 'https://api.clickup.com/api/v2';
const MM_TEAM_NAME = 'MM Team';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ companyId: string; taskId: string }> },
) {
  const { companyId, taskId } = await params;
  const body = await req.json();
  const { text, authorName, isInternal, senderId, token, companyName } = body;
  console.log(`[comment] companyId=${companyId} taskId=${taskId} isInternal=${isInternal} senderId=${senderId} hasToken=${!!token} text="${text?.slice(0, 30)}"`);
  const key = process.env.CLICKUP_KEY;

  if (!key) return Response.json({ success: false }, { status: 500 });
  if (!text?.trim()) return Response.json({ success: false, error: 'Empty comment' }, { status: 400 });

  const displayName = isInternal ? MM_TEAM_NAME : (authorName ?? 'Customer');

  const comment: StoredComment = {
    id: crypto.randomUUID(),
    text: text.trim(),
    authorName: displayName,
    isInternal: Boolean(isInternal),
    createdAt: new Date().toISOString(),
  };

  // Save to Redis by taskId (independent of WorkOrderRef)
  await appendTaskComment(taskId, comment);

  // Sync to ClickUp
  const now = new Date(comment.createdAt);
  const timestamp = `${(now.getMonth() + 1).toString().padStart(2, '0')}/${now.getDate().toString().padStart(2, '0')}/${now.getFullYear()} ${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
  const formatted = `${displayName} [${timestamp}]: ${comment.text}`;

  const clickupRes = await fetch(`${CLICKUP_BASE}/task/${taskId}/comment`, {
    method: 'POST',
    headers: { Authorization: key, 'Content-Type': 'application/json' },
    body: JSON.stringify({ comment_text: formatted, notify_all: false }),
  });

  if (!clickupRes.ok) {
    const errBody = await clickupRes.text();
    console.error(`ClickUp comment sync failed for task ${taskId}: ${clickupRes.status} ${errBody}`);
  }

  // Notify the other party
  const truncated = comment.text.length > 80 ? comment.text.slice(0, 80) + '…' : comment.text;

  if (token) {
    if (isInternal) {
      await notifyClientsAbout(token, companyId, {
        inProduct: {
          title: 'New comment from MM Team',
          body: truncated,
        },
      }, taskId);
    } else if (senderId) {
      await notifyInternalUsersAbout(
        token,
        senderId as string,
        {
          inProduct: {
            title: `${displayName} left a comment`,
            body: truncated,
          },
        },
        {
          type: 'comment',
          companyId,
          companyName: companyName ?? undefined,
          taskId,
          authorName: displayName,
          commentPreview: comment.text.slice(0, 100),
        },
      );
    } else {
      console.warn(`[notify] customer comment — no senderId, skipping notification (companyId=${companyId})`);
    }
  } else {
    console.warn(`[notify] comment — no token, skipping notification`);
  }

  return Response.json({ success: true, comment, clickupOk: clickupRes.ok });
}
