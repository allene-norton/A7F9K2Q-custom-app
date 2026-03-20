import { appendAssessment } from '@/lib/store';

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = await req.json();
  await appendAssessment(id, {
    assessmentId: body.assessmentId ?? `assess_${id}_${Date.now()}`,
    assessmentName: body.assessmentName ?? 'Assessment',
    companyId: id,
    companyName: body.companyName,
    items: body.items,
    sentAt: new Date().toISOString(),
  });
  return Response.json({ success: true });
}
