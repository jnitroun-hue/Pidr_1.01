/**
 * 📊 API: Статистика рефералов
 * 
 * GET /api/referral/stats
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { requireAuth, getUserIdFromDatabase } from '@/lib/auth-utils';

export async function GET(request: NextRequest) {
  try {
    console.log('📊 [referral/stats] Получение статистики рефералов');

    // ✅ УНИВЕРСАЛЬНО: Используем универсальную авторизацию
    const auth = requireAuth(request);

    if (auth.error || !auth.userId) {
      return NextResponse.json(
        { success: false, error: auth.error || 'Unauthorized' },
        { status: 401 }
      );
    }

    const { userId, environment } = auth;
    const { dbUserId } = await getUserIdFromDatabase(userId, environment);

    if (!dbUserId) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    console.log(`👤 Получаем статистику рефералов для ${dbUserId}`);

    // Вызываем функцию получения статистики
    const { data, error } = await supabase.rpc('get_referral_stats', {
      p_user_id: dbUserId
    });

    if (error) {
      console.error('❌ Ошибка получения статистики:', error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    console.log('✅ Статистика получена:', data);

    return NextResponse.json({
      success: true,
      stats: data
    });

  } catch (error: any) {
    console.error('❌ [referral/stats] Критическая ошибка:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Internal server error'
    }, { status: 500 });
  }
}

