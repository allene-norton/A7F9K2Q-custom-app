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

// ─── Task Comments (stored independently per ClickUp task ID) ─────────────────

export async function getTaskComments(taskId: string): Promise<StoredComment[]> {
  return (await redis.get<StoredComment[]>(`comments:${taskId}`)) ?? [];
}

export async function appendTaskComment(
  taskId: string,
  comment: StoredComment,
): Promise<void> {
  const existing = await getTaskComments(taskId);
  await redis.set(`comments:${taskId}`, [...existing, comment]);
}

// ─── Unread Notification Tracking ─────────────────────────────────────────────

export async function addUnreadNotification(companyId: string, taskId: string, notificationId: string): Promise<void> {
  await Promise.all([
    redis.sadd(`unread_tasks:${companyId}`, taskId),
    redis.sadd(`notification_ids:${taskId}`, notificationId),
  ]);
}

export async function getUnreadTaskIds(companyId: string): Promise<string[]> {
  const members = await redis.smembers(`unread_tasks:${companyId}`);
  return members as string[];
}

export async function getNotificationIds(taskId: string): Promise<string[]> {
  const members = await redis.smembers(`notification_ids:${taskId}`);
  return members as string[];
}

export async function clearUnreadTask(companyId: string, taskId: string): Promise<void> {
  await Promise.all([
    redis.srem(`unread_tasks:${companyId}`, taskId),
    redis.del(`notification_ids:${taskId}`),
  ]);
}
