// lib/upstash-storage.ts
import { Redis } from '@upstash/redis';
import type { BackgroundCheckFormData } from '@/types';

const redis = Redis.fromEnv();

export async function saveFormData(clientId: string, data: BackgroundCheckFormData) {
  await redis.set(`form:${clientId}`, data);
}

export async function getFormData(clientId: string): Promise<BackgroundCheckFormData | null> {
  return await redis.get(`form:${clientId}`);
}

export async function deleteFormData(clientId: string) {
  await redis.del(`form:${clientId}`);
}

// Optional for admin/debugging
// export async function listFormDataKeys(): Promise<string[]> {
//   return await redis.keys('form:*');
// }