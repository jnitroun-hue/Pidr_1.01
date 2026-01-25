/**
 * 📊 API: Статистика рефералов
 * 
 * GET /api/referral/stats
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    console.log('📊 [referral/stats] Получение статистики рефералов');

    // Получаем user_id из headers
    const telegramIdHeader = request.headers.get('x-telegram-id');
    
    if (!telegramIdHeader) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Telegram ID отсутствует' },
        { status: 401 }
      );
    }

    const userId = parseInt(telegramIdHeader, 10);

    if (isNaN(userId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid user ID' },
        { status: 400 }
      );
    }

    console.log(`👤 Получаем статистику рефералов для ${userId}`);

    // Вызываем функцию получения статистики
    const { data, error } = await supabase.rpc('get_referral_stats', {
      p_user_id: userId
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

