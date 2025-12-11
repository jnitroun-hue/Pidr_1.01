import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { NextRequest } from 'next/server';

// Создаем Redis клиент только если переменные окружения настроены
let redis: Redis | null = null;
let ratelimit: Ratelimit | null = null;

const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;

// Проверяем, что Redis правильно настроен
const isRedisConfigured = redisUrl && redisToken && 
  redisUrl !== '<!-- ВСТАВЬ_СЮДА -->' && 
  !redisUrl.includes('your-redis') &&
  redisUrl.startsWith('https://') &&
  redisToken.length > 10;

if (isRedisConfigured) {
  try {
    redis = new Redis({
      url: redisUrl,
      token: redisToken,
    });

    ratelimit = new Ratelimit({
      redis: redis,
      limiter: Ratelimit.slidingWindow(10, "10 s"), // 10 запросов в 10 секунд
      analytics: true,
    });
  } catch (error) {
    console.warn('Redis not available, rate limiting disabled:', error);
  }
}

// Fallback rate limiter (в памяти)
const memoryLimiter = new Map<string, { count: number; resetTime: number }>();

// Fallback rate limiting функция
export async function checkRateLimit(id: string): Promise<{ success: boolean }> {
  if (ratelimit) {
    return await ratelimit.limit(id);
  }

  // Fallback: простая проверка в памяти
  const now = Date.now();
  const windowMs = 10 * 1000; // 10 секунд
  const maxRequests = 10;

  const key = `rate_limit:${id}`;
  const current = memoryLimiter.get(key);

  if (!current || now > current.resetTime) {
    memoryLimiter.set(key, { count: 1, resetTime: now + windowMs });
    return { success: true };
  }

  if (current.count >= maxRequests) {
    return { success: false };
  }

  current.count++;
  memoryLimiter.set(key, current);
  return { success: true };
}

export { ratelimit };

// Получаем ID для rate limiting из запроса
export function getRateLimitId(req: NextRequest): string {
  const forwardedFor = req.headers.get('x-forwarded-for');
  const realIp = req.headers.get('x-real-ip');
  const ip = forwardedFor?.split(',')[0] || realIp || '127.0.0.1';
  
  // Можно также использовать user ID если доступен
  const auth = req.headers.get('authorization');
  if (auth) {
    const token = auth.replace('Bearer ', '');
    return `user:${token.slice(-8)}`; // Последние 8 символов токена
  }
  
  return `ip:${ip}`;
}