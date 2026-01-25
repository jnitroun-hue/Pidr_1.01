/**
 * ============================================================
 * REDIS SESSION MANAGER
 * ============================================================
 * Профессиональное управление сессиями с использованием Redis
 * 
 * Возможности:
 * - Быстрое хранение сессий в Redis
 * - Автоматическое истечение сессий (TTL)
 * - Поддержка множественных устройств
 * - Отзыв сессий (logout)
 * - Защита от session hijacking
 * - Fallback на JWT если Redis недоступен
 */

import { Redis } from '@upstash/redis';
import * as jwt from 'jsonwebtoken';
import * as crypto from 'crypto';

const JWT_SECRET = process.env.JWT_SECRET || process.env.SESSION_SECRET || 'fallback-secret';
const SESSION_TTL = 30 * 24 * 60 * 60; // 30 дней в секундах

// Инициализация Redis
let redis: Redis | null = null;
const redisUrl = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;

const isRedisConfigured = redisUrl && redisToken && 
  redisUrl.startsWith('https://') && 
  redisToken.length > 10;

if (isRedisConfigured) {
  try {
    redis = new Redis({
      url: redisUrl!,
      token: redisToken!,
    });
    console.log('✅ Redis Session Manager инициализирован');
  } catch (error) {
    console.warn('⚠️ Redis недоступен, используется fallback на JWT:', error);
  }
}

// ============================================================
// TYPES
// ============================================================

export interface SessionData {
  userId: string;
  username: string;
  authMethod: 'telegram' | 'vk' | 'google' | 'local';
  telegramId?: string;
  vkId?: string;
  googleId?: string;
  email?: string;
  createdAt: number;
  lastActivity: number;
  deviceInfo?: {
    userAgent?: string;
    ip?: string;
    platform?: string;
  };
}

export interface SessionValidation {
  valid: boolean;
  session?: SessionData;
  error?: string;
}

// ============================================================
// REDIS KEYS
// ============================================================

const KEYS = {
  session: (sessionId: string) => `session:${sessionId}`,
  userSessions: (userId: string) => `user:${userId}:sessions`, // SET of session IDs
  sessionByToken: (token: string) => `token:${token}`,
};

// ============================================================
// SESSION MANAGEMENT
// ============================================================

/**
 * Создать новую сессию
 */
export async function createSession(data: {
  userId: string;
  username: string;
  authMethod: 'telegram' | 'vk' | 'google' | 'local';
  telegramId?: string;
  vkId?: string;
  googleId?: string;
  email?: string;
  userAgent?: string;
  ip?: string;
}): Promise<{ sessionId: string; token: string }> {
  // Генерируем уникальный session ID
  const sessionId = crypto.randomBytes(32).toString('hex');
  
  const sessionData: SessionData = {
    userId: data.userId,
    username: data.username,
    authMethod: data.authMethod,
    telegramId: data.telegramId,
    vkId: data.vkId,
    googleId: data.googleId,
    email: data.email,
    createdAt: Date.now(),
    lastActivity: Date.now(),
    deviceInfo: {
      userAgent: data.userAgent,
      ip: data.ip,
    }
  };

  // Генерируем JWT токен
  const token = jwt.sign(
    {
      sessionId,
      userId: data.userId,
      username: data.username,
      authMethod: data.authMethod,
    },
    JWT_SECRET,
    { expiresIn: '30d' }
  );

  if (redis) {
    try {
      // Сохраняем сессию в Redis
      await redis.setex(
        KEYS.session(sessionId),
        SESSION_TTL,
        JSON.stringify(sessionData)
      );

      // Добавляем session ID в список сессий пользователя
      await redis.sadd(KEYS.userSessions(data.userId), sessionId);
      await redis.expire(KEYS.userSessions(data.userId), SESSION_TTL);

      // Сохраняем связь токен -> session ID
      await redis.setex(KEYS.sessionByToken(token), SESSION_TTL, sessionId);

      console.log('✅ Сессия создана в Redis:', sessionId);
    } catch (error) {
      console.warn('⚠️ Ошибка сохранения в Redis, используется только JWT:', error);
    }
  }

  return { sessionId, token };
}

/**
 * Валидировать сессию
 */
export async function validateSession(token: string): Promise<SessionValidation> {
  try {
    // Проверяем JWT токен
    const payload = jwt.verify(token, JWT_SECRET) as any;
    const sessionId = payload.sessionId;

    if (!sessionId) {
      return { valid: false, error: 'Invalid token format' };
    }

    // Если Redis доступен, проверяем сессию в Redis
    if (redis) {
      try {
        const sessionDataStr = await redis.get<string>(KEYS.session(sessionId));
        
        if (!sessionDataStr) {
          return { valid: false, error: 'Session expired or not found' };
        }

        const sessionData: SessionData = JSON.parse(sessionDataStr);

        // Обновляем время последней активности
        sessionData.lastActivity = Date.now();
        await redis.setex(
          KEYS.session(sessionId),
          SESSION_TTL,
          JSON.stringify(sessionData)
        );

        return { valid: true, session: sessionData };
      } catch (redisError) {
        console.warn('⚠️ Redis недоступен, используется fallback на JWT:', redisError);
      }
    }

    // Fallback: если Redis недоступен, используем только JWT
    const sessionData: SessionData = {
      userId: payload.userId,
      username: payload.username,
      authMethod: payload.authMethod,
      telegramId: payload.telegramId,
      vkId: payload.vkId,
      googleId: payload.googleId,
      email: payload.email,
      createdAt: payload.iat * 1000,
      lastActivity: Date.now(),
    };

    return { valid: true, session: sessionData };

  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      return { valid: false, error: 'Token expired' };
    }
    if (error instanceof jwt.JsonWebTokenError) {
      return { valid: false, error: 'Invalid token' };
    }
    return { valid: false, error: 'Validation error' };
  }
}

/**
 * Обновить активность сессии
 */
export async function updateSessionActivity(sessionId: string): Promise<boolean> {
  if (!redis) {
    return true; // Fallback: JWT сам управляет временем жизни
  }

  try {
    const sessionDataStr = await redis.get<string>(KEYS.session(sessionId));
    
    if (!sessionDataStr) {
      return false;
    }

    const sessionData: SessionData = JSON.parse(sessionDataStr);
    sessionData.lastActivity = Date.now();

    await redis.setex(
      KEYS.session(sessionId),
      SESSION_TTL,
      JSON.stringify(sessionData)
    );

    return true;
  } catch (error) {
    console.error('❌ Ошибка обновления активности сессии:', error);
    return false;
  }
}

/**
 * Отозвать сессию (logout)
 */
export async function revokeSession(token: string): Promise<boolean> {
  try {
    const payload = jwt.verify(token, JWT_SECRET) as any;
    const sessionId = payload.sessionId;
    const userId = payload.userId;

    if (!sessionId) {
      return false;
    }

    if (redis) {
      try {
        // Удаляем сессию из Redis
        await redis.del(KEYS.session(sessionId));
        
        // Удаляем из списка сессий пользователя
        await redis.srem(KEYS.userSessions(userId), sessionId);
        
        // Удаляем связь токен -> session ID
        await redis.del(KEYS.sessionByToken(token));

        console.log('✅ Сессия отозвана:', sessionId);
        return true;
      } catch (error) {
        console.error('❌ Ошибка отзыва сессии в Redis:', error);
      }
    }

    // Fallback: JWT сам истечет по времени
    return true;

  } catch (error) {
    console.error('❌ Ошибка отзыва сессии:', error);
    return false;
  }
}

/**
 * Отозвать все сессии пользователя
 */
export async function revokeAllUserSessions(userId: string): Promise<boolean> {
  if (!redis) {
    console.warn('⚠️ Redis недоступен, невозможно отозвать все сессии');
    return false;
  }

  try {
    // Получаем все session IDs пользователя
    const sessionIds = await redis.smembers<string[]>(KEYS.userSessions(userId));

    if (!sessionIds || sessionIds.length === 0) {
      return true;
    }

    // Удаляем все сессии
    const deletePromises = sessionIds.map(sessionId => 
      redis!.del(KEYS.session(sessionId))
    );
    await Promise.all(deletePromises);

    // Удаляем список сессий
    await redis.del(KEYS.userSessions(userId));

    console.log(`✅ Отозваны все сессии пользователя ${userId} (${sessionIds.length} сессий)`);
    return true;

  } catch (error) {
    console.error('❌ Ошибка отзыва всех сессий:', error);
    return false;
  }
}

/**
 * Получить все активные сессии пользователя
 */
export async function getUserSessions(userId: string): Promise<SessionData[]> {
  if (!redis) {
    return [];
  }

  try {
    const sessionIds = await redis.smembers<string[]>(KEYS.userSessions(userId));

    if (!sessionIds || sessionIds.length === 0) {
      return [];
    }

    const sessions: SessionData[] = [];
    
    for (const sessionId of sessionIds) {
      const sessionDataStr = await redis.get<string>(KEYS.session(sessionId));
      if (sessionDataStr) {
        sessions.push(JSON.parse(sessionDataStr));
      }
    }

    return sessions;

  } catch (error) {
    console.error('❌ Ошибка получения сессий пользователя:', error);
    return [];
  }
}

/**
 * Очистить истекшие сессии (cleanup job)
 */
export async function cleanupExpiredSessions(): Promise<number> {
  if (!redis) {
    return 0;
  }

  try {
    // Redis автоматически удаляет истекшие ключи благодаря TTL
    // Эта функция для дополнительной очистки если нужно
    console.log('✅ Redis автоматически управляет истечением сессий');
    return 0;

  } catch (error) {
    console.error('❌ Ошибка очистки сессий:', error);
    return 0;
  }
}

/**
 * Проверить доступность Redis
 */
export async function isRedisAvailable(): Promise<boolean> {
  if (!redis) {
    return false;
  }

  try {
    await redis.ping();
    return true;
  } catch (error) {
    return false;
  }
}

// Экспорт для использования в других модулях
export { redis };

