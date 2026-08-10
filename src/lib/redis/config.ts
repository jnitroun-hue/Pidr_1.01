export type RedisConfiguration =
  | { type: 'upstash'; url: string; token: string }
  | { type: 'native'; url: string }
  | { type: 'none' };

export function selectRedisConfiguration(env: NodeJS.ProcessEnv): RedisConfiguration {
  const restUrl = env.KV_REST_API_URL || env.UPSTASH_REDIS_REST_URL || '';
  const restToken = env.KV_REST_API_TOKEN || env.UPSTASH_REDIS_REST_TOKEN || env.REDIS_TOKEN || '';

  if (restUrl.startsWith('https://') && restToken) {
    return { type: 'upstash', url: restUrl, token: restToken };
  }

  const nativeUrl =
    [env.REDIS_URL, env.REDIS_TLS_URL].find(
      (value) => value?.startsWith('redis://') || value?.startsWith('rediss://')
    ) || '';

  if (nativeUrl) {
    return { type: 'native', url: nativeUrl };
  }

  return { type: 'none' };
}
