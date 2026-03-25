import { Redis } from '@upstash/redis';
import { AssessmentItem, StoredComment } from '@/types/types-index';

export type { StoredComment };

export interface StoredAssessment {
  assessmentId: string;
  assessmentName: string;
  companyId: string;
  companyName: string;
  items: AssessmentItem[];
  sentAt: string;
  submittedAt?: string; // set when the customer submits selections
  isHourly?: boolean;
}

export interface WorkOrderRef {
  taskId: string;
  listId: string;
  addedAt: string;
  location?: string;
  assessmentName?: string;
  comments?: StoredComment[];
}

const redis = new Redis({
  url: process.env.STORAGE_KV_REST_API_URL!,
  token: process.env.STORAGE_KV_REST_API_TOKEN!,
});

// ─── Assessments ──────────────────────────────────────────────────────────────

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
  const without = existing.filter((a) => a.assessmentId !== data.assessmentId);
  await redis.set(`assessments:${companyId}`, [...without, data]);
}

// ─── Work Orders ──────────────────────────────────────────────────────────────

export async function getWorkOrderRefs(companyId: string): Promise<WorkOrderRef[]> {
  return (await redis.get<WorkOrderRef[]>(`workorders:${companyId}`)) ?? [];
}

export async function markAssessmentSubmitted(companyId: string, assessmentId: string): Promise<void> {
  const existing = await getAssessmentsForCompany(companyId);
  const updated = existing.map((a) =>
    a.assessmentId === assessmentId ? { ...a, submittedAt: new Date().toISOString() } : a,
  );
  await redis.set(`assessments:${companyId}`, updated);
}

export async function appendWorkOrderRef(companyId: string, ref: WorkOrderRef): Promise<void> {
  const existing = await getWorkOrderRefs(companyId);
  // Deduplicate by taskId
  const without = existing.filter((r) => r.taskId !== ref.taskId);
  await redis.set(`workorders:${companyId}`, [...without, ref]);
}

export async function appendWorkOrderComment(
  companyId: string,
  taskId: string,
  comment: StoredComment,
): Promise<void> {
  const refs = await getWorkOrderRefs(companyId);
  const updated = refs.map((r) =>
    r.taskId === taskId
      ? { ...r, comments: [...(r.comments ?? []), comment] }
      : r,
  );
  await redis.set(`workorders:${companyId}`, updated);
}
