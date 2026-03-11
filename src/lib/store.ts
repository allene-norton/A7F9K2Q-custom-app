import { Redis } from '@upstash/redis';
import { AssessmentItem } from '@/types/types-index';

export interface StoredAssessment {
  companyId: string;
  companyName: string;
  items: AssessmentItem[];
  sentAt: string;
}

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

export async function getSentAssessment(companyId: string): Promise<StoredAssessment | null> {
  return redis.get<StoredAssessment>(`assessment:${companyId}`);
}

export async function setSentAssessment(companyId: string, data: StoredAssessment): Promise<void> {
  await redis.set(`assessment:${companyId}`, data);
}
