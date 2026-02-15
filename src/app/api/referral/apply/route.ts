/**
 * 🎁 API: Применение реферального кода
 * 
 * POST /api/referral/apply
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { requireAuth, getUserIdFromDatabase } from '@/lib/auth-utils';

export async function POST(request: NextRequest) {
  try {
    console.log('🎁 [referral/apply] Применение реферального кода');

    const body = await request.json();
    const { referralCode } = body;

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

    if (!referralCode) {
      return NextResponse.json(
        { success: false, error: 'Referral code is required' },
        { status: 400 }
      );
    }

    console.log(`👤 Пользователь ${dbUserId} применяет код: ${referralCode}`);

    // Вызываем функцию обработки реферала
    const { data, error } = await supabase.rpc('process_referral', {
      p_referred_id: dbUserId,
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

