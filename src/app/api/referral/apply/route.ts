/**
 * 🎁 API: Применение реферального кода
 * 
 * POST /api/referral/apply
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    console.log('🎁 [referral/apply] Применение реферального кода');

    const body = await request.json();
    const { referralCode } = body;

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

    if (!referralCode) {
      return NextResponse.json(
        { success: false, error: 'Referral code is required' },
        { status: 400 }
      );
    }

    console.log(`👤 Пользователь ${userId} применяет код: ${referralCode}`);

    // Вызываем функцию обработки реферала
    const { data, error } = await supabase.rpc('process_referral', {
      p_referred_id: userId,
      p_referral_code: referralCode
    });

    if (error) {
      console.error('❌ Ошибка обработки реферала:', error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    if (!data.success) {
      return NextResponse.json(
        { success: false, error: data.error },
        { status: 400 }
      );
    }

    console.log('✅ Реферальный код применен:', data);

    return NextResponse.json({
      success: true,
      referrerBonus: data.referrer_bonus,
      referredBonus: data.referred_bonus,
      message: `Вы получили ${data.referred_bonus} монет! Ваш друг получил ${data.referrer_bonus} монет!`
    });

  } catch (error: any) {
    console.error('❌ [referral/apply] Критическая ошибка:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Internal server error'
    }, { status: 500 });
  }
}

