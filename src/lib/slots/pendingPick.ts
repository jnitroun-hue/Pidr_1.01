import { getRedis } from '@/lib/redis/init';
import type { Tier } from './engine';

export type PendingPick = {
  mode: 'coins' | 'gram';
  baseBet: number;
  already: number;
  tier: Tier;
  maxWin: number;
  cells: { kind: 'mult' | 'miss'; value: number; amount: number }[];
  missLimit: number;
  settled: { balance: number; total: number; extra: number; floorAdded: number; capped: boolean } | null;
};

const memory = new Map<string, PendingPick>();

function keyOf(userId: string | number, spinId: string): string {
  return `${userId}:${spinId}`;
}

export async function rememberPick(userId: string | number, spinId: string, value: Omit<PendingPick, 'settled'>): Promise<void> {
  const row: PendingPick = { ...value, settled: null };
  const key = keyOf(userId, spinId);
  memory.set(key, row);
  const redis = getRedis();
  if (redis) await redis.set(`slots:pick:${key}`, JSON.stringify(row), { ex: 900 });
}

export async function loadPick(userId: string | number, spinId: string): Promise<PendingPick | null> {
  const key = keyOf(userId, spinId);
  const local = memory.get(key);
  if (local) return local;
  const redis = getRedis();
  if (!redis) return null;
  const raw = await redis.get<string>(`slots:pick:${key}`);
  if (!raw) return null;
  const parsed = (typeof raw === 'string' ? JSON.parse(raw) : raw) as PendingPick;
  memory.set(key, parsed);
  return parsed;
}

export async function savePick(userId: string | number, spinId: string, value: PendingPick): Promise<void> {
  const key = keyOf(userId, spinId);
  memory.set(key, value);
  const redis = getRedis();
  if (redis) await redis.set(`slots:pick:${key}`, JSON.stringify(value), { ex: 900 });
}
