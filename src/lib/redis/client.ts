/**
 * Универсальный Redis клиент
 * Поддерживает как Upstash Redis (REST API), так и обычный Redis
 */

import { Redis as UpstashRedis } from '@upstash/redis';

// Типы для обычного Redis (если будет установлен)
type RedisClient = UpstashRedis | any;

let redisClient: RedisClient | null = null;
let redisType: 'upstash' | 'native' | null = null;

/**
 * Инициализация Redis клиента
 */
export function initRedis(): RedisClient | null {
  if (redisClient) {
    return redisClient;
  }

  const redisUrl = process.env.UPSTASH_REDIS_REST_URL || process.env.REDIS_URL || '';
  const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.REDIS_TOKEN || '';

  // Проверяем тип Redis URL
  if (redisUrl.startsWith('https://') && redisToken) {
    // Upstash Redis (REST API)
    try {
      redisClient = new UpstashRedis({
        url: redisUrl,
        token: redisToken,
      });
      redisType = 'upstash';
      console.log('✅ Redis инициализирован (Upstash REST API)');
      return redisClient;
    } catch (error) {
      console.warn('⚠️ Ошибка инициализации Upstash Redis:', error);
    }
  } else if (redisUrl.startsWith('redis://') || redisUrl.startsWith('rediss://')) {
    // Обычный Redis - требует установки пакета ioredis или redis
    console.warn('⚠️ Обнаружен обычный Redis URL. Для работы с обычным Redis установите пакет "ioredis" или "redis"');
    console.warn('⚠️ Текущий код использует только Upstash Redis. Используется fallback на БД.');
    // TODO: Можно добавить поддержку обычного Redis через ioredis
    // Пример:
    // import Redis from 'ioredis';
    // redisClient = new Redis(redisUrl);
    // redisType = 'native';
  }

  return null;
}

/**
 * Получить Redis клиент
 */
export function getRedis(): RedisClient | null {
  if (!redisClient) {
    return initRedis();
  }
  return redisClient;
}

/**
 * Проверить доступность Redis
 */
export function isRedisAvailable(): boolean {
  return redisClient !== null;
}

/**
 * Получить тип Redis
 */
export function getRedisType(): 'upstash' | 'native' | null {
  return redisType;
}

// Инициализируем при загрузке модуля
initRedis();

