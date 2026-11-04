import { getRedis } from '@/lib/redis/init';

export type ClipJob = {
  taskId: string;
  dbUserId: number;
  telegramId: string;
  prompt: string;
  sent: boolean;
};

const memory = new Map<string, ClipJob>();

function key(taskId: string): string {
  return `clips:task:${taskId}`;
}

export async function saveClipJob(job: ClipJob): Promise<void> {
  memory.set(job.taskId, job);
  const redis = getRedis();
  if (redis) await redis.set(key(job.taskId), job, { ex: 60 * 60 * 6 });
}

export async function loadClipJob(taskId: string): Promise<ClipJob | null> {
  const redis = getRedis();
  if (redis) {
    const raw = await redis.get<string>(key(taskId));
    if (raw) {
      const job = (typeof raw === 'string' ? JSON.parse(raw) : raw) as ClipJob;
      memory.set(taskId, job);
      return job;
    }
  }
  return memory.get(taskId) ?? null;
}
