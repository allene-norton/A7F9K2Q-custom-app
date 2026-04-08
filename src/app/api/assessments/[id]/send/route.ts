import { appendAssessment } from '@/lib/store';
import { notifyClientsAbout } from '@/lib/notifications';

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = await req.json();
  const rawName: string = body.assessmentName ?? 'Assessment';
  const assessmentName = rawName.replace(/\s*[—–-]+\s*approval needed\s*$/i, '').trim();
  const companyName: string = body.companyName ?? 'Your company';

  await appendAssessment(id, {
    assessmentId: body.assessmentId ?? `assess_${id}_${Date.now()}`,
    assessmentName,
    companyId: id,
    companyName,
    items: body.items,
    sentAt: new Date().toISOString(),
    isHourly: body.isHourly ?? false,
  });

  // Notify clients — fire and don't block the response
  notifyClientsAbout(id, {
    inProduct: {
      title: 'New Assessment Ready for Review',
      body: `${assessmentName} has been sent for your review.`,
    },
  }).catch(() => {});

  return Response.json({ success: true });
}
