import { deleteAssessment } from '@/lib/store';

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string; assessmentId: string }> },
) {
  const { id, assessmentId } = await params;
  await deleteAssessment(id, assessmentId);
  return Response.json({ success: true });
}
