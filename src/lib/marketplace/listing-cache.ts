import { getRedis } from '@/lib/redis/init';

const VERSION_KEY = 'marketplace:listings:version';
const TTL_SECONDS = 30;

export async function getMarketplaceCacheVersion(): Promise<number> {
  const redis = getRedis();
  if (!redis) return 0;

  try {
    return Number((await redis.get<number>(VERSION_KEY)) || 0);
  } catch {
    return 0;
  }
}

export function marketplaceListCacheKey(
  version: number,
  params: {
    sort: string;
    filter: string;
    suit: string | null;
    rarity: string | null;
    limit: number;
    offset: number;
  }
): string {
  const parts = [
    version,
    params.sort,
    params.filter,
    params.suit || 'all',
    params.rarity || 'all',
    params.limit,
    params.offset,
  ];
  return `marketplace:listings:${parts.join(':')}`;
}

export async function readMarketplaceListCache<T>(key: string): Promise<T | null> {
  const redis = getRedis();
  if (!redis) return null;

  try {
    return (await redis.get<T>(key)) ?? null;
  } catch {
    return null;
  }
}

export async function writeMarketplaceListCache(key: string, value: unknown): Promise<void> {
  const redis = getRedis();
  if (!redis) return;

  try {
    await redis.set(key, value, { ex: TTL_SECONDS });
  } catch {
    // Redis — ускорение, БД остаётся источником истины.
  }
}

/** Инвалидация без scan/del: новые чтения автоматически используют новую версию ключа. */
export async function invalidateMarketplaceListCache(): Promise<void> {
  const redis = getRedis();
  if (!redis) return;

  try {
    await redis.incr(VERSION_KEY);
  } catch {
    // При недоступном Redis API продолжает работать напрямую через БД.
  }
}
