import { AssessmentItem } from '@/types/types-index';

export interface StoredAssessment {
  companyId: string;
  companyName: string;
  items: AssessmentItem[];
  sentAt: string;
}

// In-memory store (swap body of functions for Upstash Redis calls)
// Redis migration: import { Redis } from '@upstash/redis'; then use redis.set/get with JSON
const store = new Map<string, StoredAssessment>();

export async function getSentAssessment(companyId: string): Promise<StoredAssessment | null> {
  return store.get(companyId) ?? null;
}

export async function setSentAssessment(companyId: string, data: StoredAssessment): Promise<void> {
  store.set(companyId, data);
}
