import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

/**
 * POST /api/referral/bonus
 * Начислить реферальный бонус (вызывается после успешной регистрации)
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const body = await request.json();
    const { referrer_id, new_user_id } = body;

    if (!referrer_id || !new_user_id) {
      return NextResponse.json(
        { success: false, error: 'Missing parameters' },
        { status: 400 }
      );
    }

    console.log(`🎁 Начисление реферального бонуса: referrer=${referrer_id}, new_user=${new_user_id}`);

    // ✅ БОНУСЫ:
    // - Пригласивший: +500 монет
    // - Новый пользователь: +200 монет

    const REFERRER_BONUS = 500;
    const NEW_USER_BONUS = 200;

    // Начисляем бонус пригласившему
    const { data: referrerData } = await supabase
      .from('_pidr_users')
      .select('id, coins')
      .eq('telegram_id', referrer_id)
      .single();

    if (referrerData) {
      const oldBalance = referrerData.coins || 0;
      const newBalance = oldBalance + REFERRER_BONUS;
      
      const { error: referrerError } = await supabase
        .from('_pidr_users')
        .update({
          coins: newBalance
        })
        .eq('telegram_id', referrer_id);

      if (referrerError) {
        console.error('❌ Ошибка начисления бонуса пригласившему:', referrerError);
      } else {
        console.log(`✅ Пригласившему ${referrer_id} начислено +${REFERRER_BONUS} монет`);
        
        // ✅ ИСПРАВЛЕНО: Записываем транзакцию в _pidr_coin_transactions
        await supabase
          .from('_pidr_coin_transactions')
          .insert({
            user_id: referrerData.id,
            transaction_type: 'bonus',
            amount: REFERRER_BONUS,
            description: `Реферальный бонус за приглашение друга`,
            balance_before: oldBalance,
            balance_after: newBalance,
            created_at: new Date().toISOString()
          });
      }
    }

    // Начисляем бонус новому пользователю
    const { data: newUserData } = await supabase
      .from('_pidr_users')
      .select('id, coins')
      .eq('telegram_id', new_user_id)
      .single();

    if (newUserData) {
      const oldBalance = newUserData.coins || 0;
      const newBalance = oldBalance + NEW_USER_BONUS;
      
      const { error: newUserError } = await supabase
        .from('_pidr_users')
        .update({
          coins: newBalance
        })
        .eq('telegram_id', new_user_id);

      if (newUserError) {
        console.error('❌ Ошибка начисления бонуса новому пользователю:', newUserError);
      } else {
        console.log(`✅ Новому пользователю ${new_user_id} начислено +${NEW_USER_BONUS} монет`);
        
        // ✅ ИСПРАВЛЕНО: Записываем транзакцию в _pidr_coin_transactions
        await supabase
          .from('_pidr_coin_transactions')
          .insert({
            user_id: newUserData.id,
            transaction_type: 'bonus',
            amount: NEW_USER_BONUS,
            description: `Бонус за регистрацию по реферальной ссылке`,
            balance_before: oldBalance,
            balance_after: newBalance,
            created_at: new Date().toISOString()
          });
      }
    }

    // Создаем запись о реферальном бонусе (для статистики)
    await supabase
      .from('_pidr_referral_bonuses')
      .insert({
        referrer_id: parseInt(referrer_id),
        referred_user_id: parseInt(new_user_id),
        referrer_bonus: REFERRER_BONUS,
        referred_bonus: NEW_USER_BONUS,
        created_at: new Date().toISOString()
      });

    return NextResponse.json({
      success: true,
      referrer_bonus: REFERRER_BONUS,
      new_user_bonus: NEW_USER_BONUS
    });

  } catch (error: any) {
    console.error('❌ Ошибка API /api/referral/bonus:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

