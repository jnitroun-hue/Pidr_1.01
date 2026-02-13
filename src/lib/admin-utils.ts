/**
 * 🔐 АДМИН УТИЛИТЫ
 * Функции для проверки прав администратора
 */

import { NextRequest } from 'next/server';
import { supabase } from '@/lib/supabase';
import { requireAuth } from '@/lib/auth-utils';

/**
 * Проверка, является ли пользователь администратором
 */
export async function isAdmin(userId: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('_pidr_users')
      .select('is_admin')
      .eq('telegram_id', userId)
      .single();

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
 * Проверка админ-прав из запроса
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

  const adminStatus = await isAdmin(auth.userId);
  
  if (!adminStatus) {
    return { isAdmin: false, userId: auth.userId, error: 'Forbidden: Требуются права администратора' };
  }

  return { isAdmin: true, userId: auth.userId };
}

