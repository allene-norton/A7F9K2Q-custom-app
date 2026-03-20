import { NextRequest } from 'next/server';
import { getAssessmentById } from '@/lib/store';

const CLICKUP_BASE = 'https://api.clickup.com/api/v2';
const CUSTOMER_SELECTION_FIELD_ID = 'd82819f0-eaad-45d2-8c67-af1aa08a5949';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const { assessmentId, items } = await req.json();
  const key = process.env.CLICKUP_KEY;

  if (!key) {
    return Response.json(
      { success: false, error: 'Missing API key' },
      { status: 500 },
    );
  }

  const assessmentData = await getAssessmentById(id, assessmentId);
  if (!assessmentData) {
    return Response.json(
      { success: false, error: 'Assessment not found' },
      { status: 404 },
    );
  }

  const headers = {
    Authorization: key,
    'Content-Type': 'application/json',
  };

  const now = new Date();
  const formattedDate = `${(now.getMonth() + 1).toString().padStart(2, '0')}/${now.getDate().toString().padStart(2, '0')}/${now.getFullYear()}`;

  const results = await Promise.allSettled(
    items.map(
      async ({
        clickup_task_id,
        orderindex,
        comment,
      }: {
        clickup_task_id: string;
        orderindex: number;
        comment?: string;
      }) => {
        await fetch(
          `${CLICKUP_BASE}/task/${clickup_task_id}/field/${CUSTOMER_SELECTION_FIELD_ID}`,
          {
            method: 'POST',
            headers,
            body: JSON.stringify({ value: orderindex }),
          },
        );

        if (comment?.trim()) {
          const formattedComment = `Comment from ${assessmentData.companyName} at ${formattedDate}: ${comment}`;
          await fetch(`${CLICKUP_BASE}/task/${clickup_task_id}/comment`, {
            method: 'POST',
            headers,
            body: JSON.stringify({
              comment_text: formattedComment,
              notify_all: false,
            }),
          });
        }
      },
    ),
  );

  const failed = results.filter((r) => r.status === 'rejected').length;
  return Response.json({ success: failed === 0, failed });
}
