/**
 * 🔐 ЕДИНАЯ СИСТЕМА РАБОТЫ С СЕССИЯМИ
 * Парсинг pidr_session cookie для всех API endpoints
 */

import { NextRequest } from 'next/server';
import { cookies } from 'next/headers';

export interface SessionData {
  userId: string;
  telegramId: string;
  username?: string;
  firstName?: string;
  lastName?: string;
}

/**
 * Получить данные сессии из cookie (для Server Components / API Routes)
 */
export async function getSession(): Promise<SessionData | null> {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('pidr_session');
    
    if (!sessionCookie || !sessionCookie.value) {
      return null;
    }

    const sessionData = JSON.parse(sessionCookie.value);
    
    // Извлекаем userId из разных возможных полей
    const userId = String(
      sessionData.userId || 
      sessionData.user_id ||
      sessionData.telegramId || 
      sessionData.telegram_id || 
      sessionData.id || 
      ''
    );
    
    const telegramId = String(
      sessionData.telegramId || 
      sessionData.telegram_id || 
      sessionData.userId ||
      sessionData.id || 
      ''
    );

    if (!userId || !telegramId) {
      console.warn('⚠️ Session cookie exists but userId/telegramId not found:', {
        sessionKeys: Object.keys(sessionData)
      });
      return null;
    }

    return {
      userId,
      telegramId,
      username: sessionData.username || sessionData.userName,
      firstName: sessionData.firstName || sessionData.first_name,
      lastName: sessionData.lastName || sessionData.last_name,
    };
  } catch (error) {
    console.error('❌ Error parsing session:', error);
    return null;
  }
}

/**
 * Получить данные сессии из NextRequest (для API Routes)
 */
export function getSessionFromRequest(request: NextRequest): SessionData | null {
  try {
    const sessionCookie = request.cookies.get('pidr_session');
    
    if (!sessionCookie || !sessionCookie.value) {
      return null;
    }

    const sessionData = JSON.parse(sessionCookie.value);
    
    // Извлекаем userId из разных возможных полей
    const userId = String(
      sessionData.userId || 
      sessionData.user_id ||
      sessionData.telegramId || 
      sessionData.telegram_id || 
      sessionData.id || 
      ''
    );
    
    const telegramId = String(
      sessionData.telegramId || 
      sessionData.telegram_id || 
      sessionData.userId ||
      sessionData.id || 
      ''
    );

    if (!userId || !telegramId) {
      console.warn('⚠️ Session cookie exists but userId/telegramId not found:', {
        sessionKeys: Object.keys(sessionData)
      });
      return null;
    }

    return {
      userId,
      telegramId,
      username: sessionData.username || sessionData.userName,
      firstName: sessionData.firstName || sessionData.first_name,
      lastName: sessionData.lastName || sessionData.last_name,
    };
  } catch (error) {
    console.error('❌ Error parsing session from request:', error);
    return null;
  }
}

/**
 * Требовать авторизацию (выбросит ошибку если нет сессии)
 */
export async function requireSession(): Promise<SessionData> {
  const session = await getSession();
  
  if (!session) {
    throw new Error('Требуется авторизация');
  }
  
  return session;
}

/**
 * Требовать авторизацию из NextRequest
 */
export function requireSessionFromRequest(request: NextRequest): SessionData {
  const session = getSessionFromRequest(request);
  
  if (!session) {
    throw new Error('Требуется авторизация');
  }
  
  return session;
}

