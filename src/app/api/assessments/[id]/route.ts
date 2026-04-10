import { getAssessmentsForCompany } from '@/lib/store';

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const data = await getAssessmentsForCompany(id);
  return Response.json(data);
}
