/**
 * 🔐 АДМИН УТИЛИТЫ
 * Функции для проверки прав администратора
 */

import { NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { requireAuth } from '@/lib/auth-utils';

/**
 * Проверка, является ли пользователь администратором
 */
export async function isAdmin(userId: string): Promise<boolean> {
  try {
    // Ищем по telegram_id ИЛИ по id (для web-авторизации)
    const numericId = parseInt(userId, 10);
    let data: any = null;
    let error: any = null;

    if (!isNaN(numericId)) {
      // Пробуем сначала по id (numeric)
      const res = await supabaseAdmin
        .from('_pidr_users')
        .select('is_admin')
        .eq('id', numericId)
        .single();
      data = res.data;
      error = res.error;
    }

    if (!data) {
      // Пробуем по telegram_id (string)
      const res = await supabaseAdmin
        .from('_pidr_users')
        .select('is_admin')
        .eq('telegram_id', userId)
        .single();
      data = res.data;
      error = res.error;
    }

    if (error || !data) {
      console.error('❌ [isAdmin] Ошибка проверки админ-прав:', error);
      return false;
    }

    return data.is_admin === true;
  } catch (error) {
    console.error('❌ [isAdmin] Ошибка:', error);
    return false;
  }
}

/**
 * Проверка админ-прав из запроса (универсально для всех платформ)
 */
export async function requireAdmin(req: NextRequest): Promise<{ 
  isAdmin: boolean; 
  userId: string; 
  error?: string 
}> {
  const auth = requireAuth(req);
  
  if (auth.error || !auth.userId) {
    return { isAdmin: false, userId: '', error: auth.error || 'Unauthorized' };
  }
  
  const { userId, environment } = auth;
  
  // Получаем ID пользователя из БД
  const { getUserIdFromDatabase } = await import('@/lib/auth-utils');
  const { dbUserId, user } = await getUserIdFromDatabase(userId, environment);
  
  if (!dbUserId || !user) {
    console.error(`❌ [requireAdmin] Пользователь не найден (${environment}):`, userId);
    return { isAdmin: false, userId: '', error: 'Пользователь не найден' };
  }

  const adminStatus = user.is_admin === true;
  console.log(`✅ [requireAdmin] Пользователь ${userId} (${environment}): is_admin = ${adminStatus}`);
  
  if (!adminStatus) {
    return { isAdmin: false, userId: userId, error: 'Forbidden: Требуются права администратора' };
  }

  return { isAdmin: true, userId: userId };
}

