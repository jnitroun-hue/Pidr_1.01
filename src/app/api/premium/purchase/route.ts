import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, getUserIdFromDatabase } from '@/lib/auth-utils';
import { supabaseAdmin } from '@/lib/supabase';
import { activatePremium, assertCanPurchasePremium, getPremiumStatus } from '@/lib/premium/premium-service';
import { PREMIUM_PRICE_COINS } from '@/lib/premium/constants';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const auth = requireAuth(req);
  if (auth.error || !auth.userId) {
    return NextResponse.json({ success: false, error: auth.error }, { status: 401 });
  }

  const { dbUserId, user: dbUser } = await getUserIdFromDatabase(auth.userId, auth.environment);
  if (!dbUserId || !dbUser) {
    return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
  }

  const body = await req.json().catch(() => ({}));
  const method = body.method === 'coins' ? 'coins' : null;
  if (method !== 'coins') {
    return NextResponse.json({ success: false, error: 'Поддерживается только method: coins' }, { status: 400 });
  }

  try {
    await assertCanPurchasePremium(dbUserId);
  } catch (e: unknown) {
    return NextResponse.json(
      { success: false, error: e instanceof Error ? e.message : 'Premium уже активен' },
      { status: 400 }
    );
  }

  const currentCoins = dbUser.coins || 0;
  if (currentCoins < PREMIUM_PRICE_COINS) {
    return NextResponse.json(
      { success: false, error: `Недостаточно монет. Нужно ${PREMIUM_PRICE_COINS.toLocaleString('ru-RU')}` },
      { status: 400 }
    );
  }

  const newBalance = currentCoins - PREMIUM_PRICE_COINS;
  const { error: updateError } = await supabaseAdmin
    .from('_pidr_users')
    .update({ coins: newBalance })
    .eq('id', dbUserId);

  if (updateError) {
    return NextResponse.json({ success: false, error: updateError.message }, { status: 500 });
  }

  await supabaseAdmin.from('_pidr_coin_transactions').insert({
    user_id: dbUserId,
    amount: -PREMIUM_PRICE_COINS,
    transaction_type: 'premium_purchase',
    description: 'Покупка Premium на 30 дней',
    balance_before: currentCoins,
    balance_after: newBalance,
  });

  try {
    const { expiresAt } = await activatePremium({
      userId: dbUserId,
      source: 'coins',
      amountPaidCoins: PREMIUM_PRICE_COINS,
    });

    const premium = await getPremiumStatus(dbUserId);
    if (!premium.isPremium || !premium.expiresAt) {
      await supabaseAdmin.from('_pidr_users').update({ coins: currentCoins }).eq('id', dbUserId);
      return NextResponse.json(
        {
          success: false,
          error: 'Premium не сохранился в базе. Выполните SQL из supabase/migrations/0008_premium.sql в Supabase.',
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      newBalance,
      expiresAt,
      premium,
      message: 'Premium активирован на 30 дней!',
    });
  } catch (e: unknown) {
    await supabaseAdmin.from('_pidr_users').update({ coins: currentCoins }).eq('id', dbUserId);
    return NextResponse.json(
      { success: false, error: e instanceof Error ? e.message : 'Ошибка активации Premium' },
      { status: 500 }
    );
  }
}
