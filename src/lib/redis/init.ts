/**
 * Универсальная инициализация Redis для всего проекта
 * Поддерживает Vercel Upstash (KV_REST_API_URL) и старые переменные
 */

import { Redis } from '@upstash/redis';

let redisClient: Redis | null = null;
let redisInitialized = false;

/**
 * Инициализация Redis клиента
 * Проверяет все возможные переменные окружения
 */
export function initRedis(): Redis | null {
  if (redisInitialized) {
    return redisClient;
  }

  redisInitialized = true;

  // Приоритет переменных (Vercel Upstash → старые названия → общие)
  const redisUrl = 
    process.env.KV_REST_API_URL ||           // Vercel Upstash (приоритет 1)
    process.env.UPSTASH_REDIS_REST_URL ||    // Старое название Upstash
    process.env.REDIS_URL ||                 // Общее название (может быть rediss://)
    '';

  const redisToken = 
    process.env.KV_REST_API_TOKEN ||         // Vercel Upstash (приоритет 1)
    process.env.UPSTASH_REDIS_REST_TOKEN ||  // Старое название Upstash
    process.env.REDIS_TOKEN ||               // Общее название
    '';

  // Проверяем что это Upstash Redis (должен начинаться с https://)
  if (redisUrl && redisToken && redisUrl.startsWith('https://')) {
    try {
      redisClient = new Redis({
        url: redisUrl,
        token: redisToken,
      });
      console.log('✅ [Redis] Инициализирован (Upstash REST API)');
      return redisClient;
    } catch (error) {
      console.error('❌ [Redis] Ошибка инициализации:', error);
      redisClient = null;
      return null;
    }
  } else if (redisUrl && redisUrl.startsWith('rediss://')) {
    // Обнаружен обычный Redis (rediss://) - не поддерживается @upstash/redis
    console.warn('⚠️ [Redis] Обнаружен обычный Redis URL (rediss://). Для работы нужен Upstash Redis (https://).');
    console.warn('⚠️ [Redis] Добавьте переменные KV_REST_API_URL и KV_REST_API_TOKEN в Vercel.');
    redisClient = null;
    return null;
  } else {
    console.warn('⚠️ [Redis] Переменные окружения не настроены. Redis функции будут недоступны.');
    console.warn('⚠️ [Redis] Добавьте KV_REST_API_URL и KV_REST_API_TOKEN в Vercel Environment Variables.');
    redisClient = null;
    return null;
  }
}

/**
 * Получить Redis клиент (инициализирует если нужно)
 */
export function getRedis(): Redis | null {
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

// Инициализируем при загрузке модуля
initRedis();

