import { setSentAssessment } from '@/lib/store';

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = await req.json();
  await setSentAssessment(id, {
    companyId: id,
    companyName: body.companyName,
    items: body.items,
    sentAt: new Date().toISOString(),
  });
  return Response.json({ success: true });
}
