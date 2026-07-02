import { getRedis } from '@/lib/redis/init';
import { PRICING_REDIS_KEY } from '@/lib/pricing/constants';
import type { ExchangeRateSnapshot } from '@/lib/pricing/types';

let memoryCache: ExchangeRateSnapshot | null = null;

export function getMemoryRates(): ExchangeRateSnapshot | null {
  return memoryCache;
}

export function setMemoryRates(snapshot: ExchangeRateSnapshot): void {
  memoryCache = snapshot;
}

export async function loadRatesFromRedis(): Promise<ExchangeRateSnapshot | null> {
  try {
    const redis = getRedis();
    if (!redis) return memoryCache;
    const raw = await redis.get(PRICING_REDIS_KEY);
    if (!raw || typeof raw !== 'string') return memoryCache;
    const parsed = JSON.parse(raw) as ExchangeRateSnapshot;
    memoryCache = parsed;
    return parsed;
  } catch {
    return memoryCache;
  }
}

export async function saveRatesToRedis(snapshot: ExchangeRateSnapshot): Promise<void> {
  setMemoryRates(snapshot);
  try {
    const redis = getRedis();
    if (!redis) return;
    await redis.set(PRICING_REDIS_KEY, JSON.stringify(snapshot), {
      ex: 25 * 60 * 60,
    });
  } catch {
    /* ignore */
  }
}
