import { NextRequest, NextResponse } from 'next/server';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

interface BonusTargetUser {
  id: number;
  coins: number | null;
  telegram_id: string | null;
  vk_id: string | null;
}

async function resolveUserByIdentifier(
  supabase: SupabaseClient,
  identifier: string
): Promise<BonusTargetUser | null> {
  const normalized = identifier.trim();
  const numeric = Number(normalized);

  if (!Number.isNaN(numeric)) {
    const { data: byId } = await supabase
      .from('_pidr_users')
      .select('id, coins, telegram_id, vk_id')
      .eq('id', numeric)
      .maybeSingle();
    if (byId) return byId;
  }

  const { data: byTelegram } = await supabase
    .from('_pidr_users')
    .select('id, coins, telegram_id, vk_id')
    .eq('telegram_id', normalized)
    .maybeSingle();
  if (byTelegram) return byTelegram;

  const { data: byVk } = await supabase
    .from('_pidr_users')
    .select('id, coins, telegram_id, vk_id')
    .eq('vk_id', normalized)
    .maybeSingle();
  if (byVk) return byVk;

  return null;
}

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
    const referrerIdRaw = String(body.referrer_id || '');
    const newUserIdRaw = String(body.new_user_id || '');

    if (!referrerIdRaw || !newUserIdRaw) {
      return NextResponse.json(
        { success: false, error: 'Missing parameters' },
        { status: 400 }
      );
    }

    console.log(`🎁 Начисление реферального бонуса: referrer=${referrerIdRaw}, new_user=${newUserIdRaw}`);

    // ✅ БОНУСЫ:
    // - Пригласивший: +500 монет
    // - Новый пользователь: +200 монет

    const REFERRER_BONUS = 500;
    const NEW_USER_BONUS = 200;

    // Начисляем бонус пригласившему
    const referrerData = await resolveUserByIdentifier(supabase, referrerIdRaw);

    if (referrerData) {
      const oldBalance = referrerData.coins || 0;
      const newBalance = oldBalance + REFERRER_BONUS;
      
      const { error: referrerError } = await supabase
        .from('_pidr_users')
        .update({
          coins: newBalance
        })
        .eq('id', referrerData.id);

      if (referrerError) {
        console.error('❌ Ошибка начисления бонуса пригласившему:', referrerError);
      } else {
        console.log(`✅ Пригласившему ${referrerIdRaw} начислено +${REFERRER_BONUS} монет`);
        
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
    const newUserData = await resolveUserByIdentifier(supabase, newUserIdRaw);

    if (newUserData) {
      const oldBalance = newUserData.coins || 0;
      const newBalance = oldBalance + NEW_USER_BONUS;
      
      const { error: newUserError } = await supabase
        .from('_pidr_users')
        .update({
          coins: newBalance
        })
        .eq('id', newUserData.id);

      if (newUserError) {
        console.error('❌ Ошибка начисления бонуса новому пользователю:', newUserError);
      } else {
        console.log(`✅ Новому пользователю ${newUserIdRaw} начислено +${NEW_USER_BONUS} монет`);
        
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
    if (referrerData && newUserData) {
      await supabase
        .from('_pidr_referral_bonuses')
        .insert({
          referrer_id: referrerData.id,
          referred_user_id: newUserData.id,
          referrer_bonus: REFERRER_BONUS,
          referred_bonus: NEW_USER_BONUS,
          created_at: new Date().toISOString()
        });
    }

    return NextResponse.json({
      success: true,
      referrer_bonus: REFERRER_BONUS,
      new_user_bonus: NEW_USER_BONUS
    });

  } catch (error: unknown) {
    console.error('❌ Ошибка API /api/referral/bonus:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

