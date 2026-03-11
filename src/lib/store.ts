import { Redis } from '@upstash/redis';
import { AssessmentItem } from '@/types/types-index';

export interface StoredAssessment {
  companyId: string;
  companyName: string;
  items: AssessmentItem[];
  sentAt: string;
}

const redis = new Redis({
  url: process.env.STORAGE_KV_REST_API_URL!,
  token: process.env.STORAGE_KV_REST_API_TOKEN!,
});

export async function getSentAssessment(companyId: string): Promise<StoredAssessment | null> {
  return redis.get<StoredAssessment>(`assessment:${companyId}`);
}

export async function setSentAssessment(companyId: string, data: StoredAssessment): Promise<void> {
  await redis.set(`assessment:${companyId}`, data);
}
