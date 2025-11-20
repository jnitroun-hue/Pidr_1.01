/**
 * 🔐 ЕДИНАЯ СИСТЕМА АВТОРИЗАЦИИ
 * Консистентные функции для работы с токенами во всех API
 */

import { NextRequest } from 'next/server';
import * as jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET;

/**
 * ✅ ЕДИНАЯ функция получения userId из запроса
 * Поддерживает все методы передачи токена:
 * 0. Telegram WebApp headers (ПРИОРИТЕТ для мультиплеера)
 * 1. HTTP-only cookies
 * 2. Authorization header (Bearer token)
 * 3. Query параметры (для тестирования)
 */
export function getUserIdFromRequest(req: NextRequest): string | null {
  if (!JWT_SECRET) {
    console.error('❌ JWT_SECRET не настроен');
    return null;
  }
  
  let token: string | null = null;
  let userIdFromToken: string | null = null;
  
  // 1. HTTP-only cookies (ПРИОРИТЕТ - самый безопасный)
  const cookieToken = req.cookies.get('auth_token')?.value;
  if (cookieToken) {
    token = cookieToken;
    console.log('🍪 Токен найден в cookies');
  }
  
  // 2. Fallback: Authorization header
  if (!token) {
    const authHeader = req.headers.get('authorization');
    if (authHeader?.startsWith('Bearer ')) {
      token = authHeader.replace('Bearer ', '');
      console.log('🔑 Токен найден в Authorization header');
    }
  }
  
  // 3. Для тестирования: query параметры (только в dev режиме)
  if (!token && process.env.NODE_ENV === 'development') {
    const url = new URL(req.url);
    const queryToken = url.searchParams.get('token');
    if (queryToken) {
      token = queryToken;
      console.log('🧪 Токен найден в query (dev режим)');
    }
  }
  
  // Верифицируем токен
  if (token) {
    try {
      const payload = jwt.verify(token, JWT_SECRET) as any;
      userIdFromToken = payload.userId || payload.telegramId;
      
      if (!userIdFromToken) {
        console.error('❌ userId отсутствует в токене');
        return null;
      }
      
      console.log('✅ Пользователь из токена:', userIdFromToken);
    } catch (error: any) {
      console.error('❌ Ошибка проверки токена:', error.message);
      return null;
    }
  }
  
  // ✅ БЕЗОПАСНАЯ ПРОВЕРКА: x-telegram-id должен совпадать с токеном!
  const telegramIdHeader = req.headers.get('x-telegram-id');
  if (telegramIdHeader) {
    if (userIdFromToken && String(userIdFromToken) !== String(telegramIdHeader)) {
      console.error('🚨 SECURITY: x-telegram-id не совпадает с токеном!', {
        fromToken: userIdFromToken,
        fromHeader: telegramIdHeader
      });
      return null; // БЛОКИРУЕМ ДОСТУП!
    }
    console.log('✅ x-telegram-id совпадает с токеном');
  }
  
  if (!userIdFromToken) {
    console.log('❌ Токен не найден');
    return null;
  }
  
  return userIdFromToken;
}

/**
 * 🛡️ Проверка авторизации с детальным логированием
 */
export function requireAuth(req: NextRequest): { userId: string; error?: never } | { userId?: never; error: string } {
  const userId = getUserIdFromRequest(req);
  
  if (!userId) {
    return { error: 'Unauthorized: Требуется авторизация' };
  }
  
  return { userId };
}

/**
 * 🔑 Создание JWT токена
 */
export function createAuthToken(userId: string): string {
  if (!JWT_SECRET) {
    throw new Error('JWT_SECRET не настроен');
  }
  
  const payload = {
    userId,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + (30 * 24 * 60 * 60), // 30 дней
  };
  
  return jwt.sign(payload, JWT_SECRET);
}

/**
 * 🧪 Валидация токена без извлечения данных
 */
export function validateToken(token: string): boolean {
  if (!JWT_SECRET) return false;
  
  try {
    jwt.verify(token, JWT_SECRET);
    return true;
  } catch {
    return false;
  }
}
