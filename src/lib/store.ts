import { Redis } from '@upstash/redis';
import { AssessmentItem } from '@/types/types-index';

export interface StoredAssessment {
  assessmentId: string;
  assessmentName: string;
  companyId: string;
  companyName: string;
  items: AssessmentItem[];
  sentAt: string;
}

const redis = new Redis({
  url: process.env.STORAGE_KV_REST_API_URL!,
  token: process.env.STORAGE_KV_REST_API_TOKEN!,
});

export async function getAssessmentsForCompany(companyId: string): Promise<StoredAssessment[]> {
  const list = await redis.get<StoredAssessment[]>(`assessments:${companyId}`);
  if (list && list.length > 0) return list;
  // Backward compat: migrate old single-assessment key
  const old = await redis.get<StoredAssessment>(`assessment:${companyId}`);
  return old ? [old] : [];
}

export async function getAssessmentById(companyId: string, assessmentId: string): Promise<StoredAssessment | null> {
  const list = await getAssessmentsForCompany(companyId);
  return list.find((a) => a.assessmentId === assessmentId) ?? null;
}

export async function appendAssessment(companyId: string, data: StoredAssessment): Promise<void> {
  const existing = await getAssessmentsForCompany(companyId);
  // Replace if same assessmentId already exists, otherwise append
  const without = existing.filter((a) => a.assessmentId !== data.assessmentId);
  await redis.set(`assessments:${companyId}`, [...without, data]);
}
