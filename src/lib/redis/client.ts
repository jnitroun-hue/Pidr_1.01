export { getRedis, initRedis, isRedisAvailable } from '@/lib/redis/init';
export type { RedisLike } from '@/lib/redis/init';

import { selectRedisConfiguration } from '@/lib/redis/config';

export function getRedisType(): 'upstash' | 'native' | null {
  const type = selectRedisConfiguration(process.env).type;
  return type === 'none' ? null : type;
}

