import { appendAssessment } from '@/lib/store';

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = await req.json();
  const rawName: string = body.assessmentName ?? 'Assessment';
  const assessmentName = rawName.replace(/\s*[—–-]+\s*approval needed\s*$/i, '').trim();

  await appendAssessment(id, {
    assessmentId: body.assessmentId ?? `assess_${id}_${Date.now()}`,
    assessmentName,
    companyId: id,
    companyName: body.companyName,
    items: body.items,
    sentAt: new Date().toISOString(),
    isHourly: body.isHourly ?? false,
  });
  return Response.json({ success: true });
}
