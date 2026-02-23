/**
 * 🔐 УНИВЕРСАЛЬНАЯ СИСТЕМА АВТОРИЗАЦИИ
 * Поддерживает Telegram, VK и веб-версию
 */

import { NextRequest } from 'next/server';
import * as jwt from 'jsonwebtoken';
import { supabase, supabaseAdmin } from './supabase';

const JWT_SECRET = process.env.JWT_SECRET || process.env.SUPABASE_JWT_SECRET;

/**
 * Определение типа окружения
 */
export type AuthEnvironment = 'telegram' | 'vk' | 'web' | 'unknown';

/**
 * Определение окружения из запроса
 */
export function detectAuthEnvironment(req: NextRequest): AuthEnvironment {
  const telegramIdHeader = req.headers.get('x-telegram-id');
  const vkIdHeader = req.headers.get('x-vk-id');
  const authSource = req.headers.get('x-auth-source');
  
  if (telegramIdHeader || authSource === 'telegram') {
    return 'telegram';
  }
  
  if (vkIdHeader || authSource === 'vk') {
    return 'vk';
  }
  
  if (authSource === 'web') {
    return 'web';
  }
  
  // Проверяем токен в cookies
  const cookieToken = req.cookies.get('auth_token')?.value;
  if (cookieToken) {
    try {
      const payload = jwt.verify(cookieToken, JWT_SECRET || '') as any;
      if (payload.authSource) {
        return payload.authSource as AuthEnvironment;
      }
      // Если в токене нет authSource, проверяем по userId
      if (payload.telegramId) return 'telegram';
      if (payload.vkId) return 'vk';
      return 'web';
    } catch {
      // Токен невалидный
    }
  }
  
  return 'unknown';
}

/**
 * ✅ УНИВЕРСАЛЬНАЯ функция получения userId из запроса
 * Поддерживает Telegram, VK и веб-версию
 */
export function getUserIdFromRequest(req: NextRequest): { userId: string | null; environment: AuthEnvironment; source: string } {
  const environment = detectAuthEnvironment(req);
  
  // 1. ПРИОРИТЕТ: Headers (Telegram или VK)
  const telegramIdHeader = req.headers.get('x-telegram-id');
  const vkIdHeader = req.headers.get('x-vk-id');
  
  if (telegramIdHeader && environment === 'telegram') {
    console.log('✅ [getUserIdFromRequest] Используем x-telegram-id из header:', telegramIdHeader);
    return { userId: telegramIdHeader, environment: 'telegram', source: 'header' };
  }
  
  if (vkIdHeader && environment === 'vk') {
    console.log('✅ [getUserIdFromRequest] Используем x-vk-id из header:', vkIdHeader);
    return { userId: vkIdHeader, environment: 'vk', source: 'header' };
  }
  
  // 2. Токен из cookies или Authorization header
  let token: string | null = null;
  
  const cookieToken = req.cookies.get('auth_token')?.value;
  console.log('🍪 [getUserIdFromRequest] Проверка cookies:', {
    hasCookie: !!cookieToken,
    cookieLength: cookieToken?.length || 0,
    cookiePreview: cookieToken?.substring(0, 20) + '...' || 'none'
  });
  
  if (cookieToken) {
    token = cookieToken;
    console.log('🍪 [getUserIdFromRequest] Токен найден в cookies');
  }
  
  if (!token) {
    const authHeader = req.headers.get('authorization');
    console.log('🔑 [getUserIdFromRequest] Проверка Authorization header:', {
      hasHeader: !!authHeader,
      headerPreview: authHeader?.substring(0, 20) + '...' || 'none'
    });
    if (authHeader?.startsWith('Bearer ')) {
      token = authHeader.replace('Bearer ', '');
      console.log('🔑 [getUserIdFromRequest] Токен найден в Authorization header');
    }
  }
  
  if (!token && process.env.NODE_ENV === 'development') {
    const url = new URL(req.url);
    const queryToken = url.searchParams.get('token');
    if (queryToken) {
      token = queryToken;
      console.log('🧪 [getUserIdFromRequest] Токен найден в query (dev режим)');
    }
  }
  
  console.log('🔍 [getUserIdFromRequest] Итоговый токен:', {
    hasToken: !!token,
    tokenLength: token?.length || 0,
    hasJwtSecret: !!JWT_SECRET
  });
  
  // Верифицируем токен
  if (token && JWT_SECRET) {
    try {
      const payload = jwt.verify(token, JWT_SECRET) as any;
      console.log('✅ [getUserIdFromRequest] Токен верифицирован:', {
        hasTelegramId: !!payload.telegramId,
        hasVkId: !!payload.vkId,
        hasUserId: !!payload.userId,
        authSource: payload.authSource,
        authMethod: payload.authMethod
      });
      
      // Извлекаем userId в зависимости от источника
      let userId: string | null = null;
      let detectedEnv: AuthEnvironment = environment;
      
      // ✅ КРИТИЧНО: Сначала определяем authMethod/authSource из токена
      // Это предотвращает путаницу между веб и Telegram сессиями
      const tokenAuthMethod = payload.authMethod || payload.authSource;
      
      if (tokenAuthMethod === 'web') {
        // ✅ ВЕБ-СЕССИЯ: userId это числовой id из БД
        userId = payload.userId?.toString() || null;
        detectedEnv = 'web';
      } else if (tokenAuthMethod === 'vk' || payload.vkId) {
        userId = payload.vkId?.toString() || payload.userId?.toString() || null;
        detectedEnv = 'vk';
      } else if (tokenAuthMethod === 'telegram' || payload.telegramId) {
        // Telegram-сессия: используем telegramId если есть, иначе userId
        userId = payload.telegramId?.toString() || payload.userId?.toString() || null;
        detectedEnv = 'telegram';
      } else if (payload.userId) {
        // Fallback: нет явного authMethod — определяем по наличию полей
        userId = payload.userId.toString();
        detectedEnv = payload.telegramId ? 'telegram' : 'web';
      }
      
      if (userId) {
        console.log(`✅ [getUserIdFromRequest] Пользователь из токена: ${userId} (${detectedEnv})`);
        return { userId, environment: detectedEnv, source: 'token' };
      }
    } catch (error: any) {
      console.error('❌ [getUserIdFromRequest] Ошибка проверки токена:', error.message);
    }
  }
  
  // 3. Fallback: используем headers если они есть
  if (telegramIdHeader) {
    return { userId: telegramIdHeader, environment: 'telegram', source: 'header-fallback' };
  }
  
  if (vkIdHeader) {
    return { userId: vkIdHeader, environment: 'vk', source: 'header-fallback' };
  }
  
  console.log('❌ [getUserIdFromRequest] userId не найден');
  return { userId: null, environment, source: 'none' };
}

/**
 * Получение userId из БД по telegram_id, vk_id или id (для веб)
 */
export async function getUserIdFromDatabase(
  userId: string, 
  environment: AuthEnvironment
): Promise<{ dbUserId: number | null; user: any }> {
  try {
    // ✅ ИСПРАВЛЕНО: Используем supabaseAdmin для обхода RLS политик и предотвращения бесконечной рекурсии
    let query = supabaseAdmin.from('_pidr_users').select('*');
    
    if (environment === 'telegram') {
      // Для Telegram - ищем по telegram_id
      query = query.eq('telegram_id', userId);
    } else if (environment === 'vk') {
      // Для VK - ищем по vk_id
      query = query.eq('vk_id', userId);
    } else {
      // ✅ ДЛЯ ВЕБ: userId из токена - это id из БД (число)
      const numericId = parseInt(userId, 10);
      if (!isNaN(numericId)) {
        query = query.eq('id', numericId);
      } else {
        // Fallback: ищем по email или username
        query = query.or(`email.eq.${userId},username.eq.${userId}`);
      }
    }
    
    // ✅ ИСПРАВЛЕНО: Используем maybeSingle() вместо single() чтобы не выбрасывать ошибку если пользователь не найден
    const { data: user, error } = await query.maybeSingle();
    
    if (error) {
      console.error(`❌ [getUserIdFromDatabase] Ошибка поиска пользователя (${environment}, userId=${userId}):`, error);
      return { dbUserId: null, user: null };
    }
    
    if (!user) {
      console.error(`❌ [getUserIdFromDatabase] Пользователь не найден (${environment}, userId=${userId})`);
      return { dbUserId: null, user: null };
    }
    
    console.log(`✅ [getUserIdFromDatabase] Пользователь найден (${environment}): id=${user.id}, username=${user.username}`);
    return { dbUserId: user.id, user };
  } catch (error: any) {
    console.error('❌ [getUserIdFromDatabase] Ошибка:', error);
    return { dbUserId: null, user: null };
  }
}

/**
 * 🛡️ УНИВЕРСАЛЬНАЯ проверка авторизации
 */
export function requireAuth(req: NextRequest): { 
  userId: string; 
  environment: AuthEnvironment;
  error?: never 
} | { 
  userId?: never; 
  environment?: never;
  error: string 
} {
  console.log('🔍 [requireAuth] Проверка авторизации...');
  console.log('🔍 [requireAuth] Headers:', {
    'x-telegram-id': req.headers.get('x-telegram-id'),
    'x-vk-id': req.headers.get('x-vk-id'),
    'x-auth-source': req.headers.get('x-auth-source'),
    'authorization': req.headers.get('authorization')?.substring(0, 20) + '...',
  });
  console.log('🔍 [requireAuth] Cookies:', {
    hasAuthToken: !!req.cookies.get('auth_token')?.value,
    authTokenLength: req.cookies.get('auth_token')?.value?.length || 0,
  });
  
  const { userId, environment, source } = getUserIdFromRequest(req);
  
  console.log('🔍 [requireAuth] Результат:', { userId, environment, source });
  
  if (!userId) {
    console.error('❌ [requireAuth] userId не найден');
    return { error: 'Unauthorized: Требуется авторизация' };
  }
  
  console.log('✅ [requireAuth] Авторизация успешна:', { userId, environment });
  return { userId, environment };
}

/**
 * 🔑 Создание JWT токена с указанием источника
 */
export function createAuthToken(
  userId: string, 
  environment: AuthEnvironment = 'web',
  additionalData?: Record<string, any>
): string {
  if (!JWT_SECRET) {
    throw new Error('JWT_SECRET не настроен');
  }
  
  const payload: any = {
    userId,
    authSource: environment,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + (30 * 24 * 60 * 60), // 30 дней
    ...additionalData
  };
  
  // Добавляем специфичные поля для каждого источника
  if (environment === 'telegram') {
    payload.telegramId = userId;
  } else if (environment === 'vk') {
    payload.vkId = userId;
  }
  
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
