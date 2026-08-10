import { Redis as UpstashRedis } from '@upstash/redis';
import type { RedisClientType } from 'redis';
import { selectRedisConfiguration } from '@/lib/redis/config';

export interface RedisLike {
  get<T = unknown>(key: string): Promise<T | null>;
  set(key: string, value: unknown, options?: { ex?: number; px?: number; nx?: boolean }): Promise<unknown>;
  setex(key: string, seconds: number, value: unknown): Promise<unknown>;
  del(...keys: string[]): Promise<unknown>;
  incr(key: string): Promise<number>;
  expire(key: string, seconds: number): Promise<unknown>;
  exists(key: string): Promise<number>;
  ping(): Promise<string>;
  lpush(key: string, ...values: unknown[]): Promise<number>;
  rpop<T = unknown>(key: string): Promise<T | null>;
  sadd(key: string, ...members: unknown[]): Promise<number>;
  srem(key: string, ...members: unknown[]): Promise<number>;
  smembers<T = unknown[]>(key: string): Promise<T>;
  sismember(key: string, member: unknown): Promise<number>;
  scard(key: string): Promise<number>;
  hset(key: string, values: Record<string, unknown>): Promise<number>;
  hdel(key: string, ...fields: string[]): Promise<number>;
  hgetall<T = Record<string, unknown>>(key: string): Promise<T | null>;
  zadd(key: string, entry: { score: number; member: unknown }): Promise<number>;
  zrange<T = unknown[]>(key: string, start: number, stop: number): Promise<T>;
  zrem(key: string, ...members: unknown[]): Promise<number>;
  zcard(key: string): Promise<number>;
}

let redisClient: RedisLike | null = null;
let redisInitialized = false;
let nativeConnection: Promise<RedisClientType> | null = null;

function nativeAdapter(client: RedisClientType): RedisLike {
  const encode = (value: unknown) => JSON.stringify(value);
  const decode = <T,>(value: string | null): T | null => {
    if (value === null) return null;
    try {
      return JSON.parse(value) as T;
    } catch {
      return value as T;
    }
  };
  const ready = async () => {
    if (!client.isOpen) {
      nativeConnection ??= client.connect().then(() => client);
      await nativeConnection;
    }
    return client;
  };

  return {
    async get<T>(key: string) {
      return decode<T>(await (await ready()).get(key));
    },
    async set(key, value, options) {
      return (await ready()).set(key, encode(value), {
        ...(options?.ex ? { EX: options.ex } : {}),
        ...(options?.px ? { PX: options.px } : {}),
        ...(options?.nx ? { NX: true } : {}),
      });
    },
    async setex(key, seconds, value) {
      return (await ready()).setEx(key, seconds, encode(value));
    },
    async del(...keys) {
      return (await ready()).del(keys);
    },
    async incr(key) {
      return (await ready()).incr(key);
    },
    async expire(key, seconds) {
      return (await ready()).expire(key, seconds);
    },
    async exists(key) {
      return (await ready()).exists(key);
    },
    async ping() {
      return (await ready()).ping();
    },
    async lpush(key, ...values) {
      return (await ready()).lPush(key, values.map(encode));
    },
    async rpop<T>(key: string) {
      return decode<T>(await (await ready()).rPop(key));
    },
    async sadd(key, ...members) {
      return (await ready()).sAdd(key, members.map(encode));
    },
    async srem(key, ...members) {
      return (await ready()).sRem(key, members.map(encode));
    },
    async smembers<T>(key: string) {
      const values = await (await ready()).sMembers(key);
      return values.map((value) => decode(value)) as T;
    },
    async sismember(key, member) {
      return (await ready()).sIsMember(key, encode(member));
    },
    async scard(key) {
      return (await ready()).sCard(key);
    },
    async hset(key, values) {
      return (await ready()).hSet(
        key,
        Object.fromEntries(Object.entries(values).map(([field, value]) => [field, encode(value)]))
      );
    },
    async hdel(key, ...fields) {
      return (await ready()).hDel(key, fields);
    },
    async hgetall<T>(key: string) {
      const values = await (await ready()).hGetAll(key);
      if (Object.keys(values).length === 0) return null;
      return Object.fromEntries(
        Object.entries(values).map(([field, value]) => [field, decode(value)])
      ) as T;
    },
    async zadd(key, entry) {
      return (await ready()).zAdd(key, { score: entry.score, value: encode(entry.member) });
    },
    async zrange<T>(key: string, start: number, stop: number) {
      const values = await (await ready()).zRange(key, start, stop);
      return values.map((value) => decode(value)) as T;
    },
    async zrem(key, ...members) {
      return (await ready()).zRem(key, members.map(encode));
    },
    async zcard(key) {
      return (await ready()).zCard(key);
    },
  };
}

/**
 * Инициализация Redis клиента
 * Проверяет все возможные переменные окружения
 */
export function initRedis(): RedisLike | null {
  if (redisInitialized) {
    return redisClient;
  }

  redisInitialized = true;

  const config = selectRedisConfiguration(process.env);
  try {
    if (config.type === 'upstash') {
      redisClient = new UpstashRedis({ url: config.url, token: config.token }) as RedisLike;
    } else if (config.type === 'native') {
      if (typeof window !== 'undefined') return null;
      // Keep Node's TCP client out of browser bundles; this branch only runs in API/server code.
      const dynamicRequire = eval('require') as NodeRequire;
      const { createClient } = dynamicRequire('redis') as typeof import('redis');
      const native = createClient({
        url: config.url,
        socket: {
          reconnectStrategy: (retries) => Math.min(100 * 2 ** retries, 3000),
        },
      });
      native.on('error', (error) => {
        if (process.env.NODE_ENV !== 'test') {
          console.warn('[Redis] Connection error; callers will use their fallback:', error.message);
        }
      });
      redisClient = nativeAdapter(native as RedisClientType);
    } else {
      redisClient = null;
    }
  } catch (error) {
    console.warn('[Redis] Initialization failed; using fallback:', error);
    redisClient = null;
  }

  return redisClient;
}

/**
 * Получить Redis клиент (инициализирует если нужно)
 */
export function getRedis(): RedisLike | null {
  if (!redisClient && !redisInitialized) {
    return initRedis();
  }
  return redisClient;
}

/**
 * Проверить доступность Redis
 */
export function isRedisAvailable(): boolean {
  return getRedis() !== null;
}

