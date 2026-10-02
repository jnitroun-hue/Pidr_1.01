import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, getUserIdFromDatabase } from '@/lib/auth-utils';
import { supabaseAdmin } from '@/lib/supabase';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function noStore(body: unknown, status = 200) {
  const response = NextResponse.json(body, { status });
  response.headers.set('Cache-Control', 'private, no-store');
  return response;
}

export async function POST(req: NextRequest) {
  const auth = requireAuth(req);
  if (auth.error || !auth.userId) return noStore({ success: false, error: 'Нужно войти в аккаунт' }, 401);

  const body = await req.json().catch(() => null);
  const direction = body?.direction === 'to-coins' ? 'to-coins' : body?.direction === 'to-gram' ? 'to-gram' : '';
  const coins = Math.floor(Number(body?.coins));
  if (!direction || !Number.isFinite(coins) || coins < 100 || coins > 1_000_000 || coins % 100 !== 0) {
    return noStore({ success: false, error: 'Можно обменять от 100 монет, кратно 100' }, 400);
  }

  const { dbUserId, user } = await getUserIdFromDatabase(auth.userId, auth.environment);
  if (!dbUserId || !user) return noStore({ success: false, error: 'Игрок не найден' }, 404);

  // 1000 монет = 1.00 GRAM = 100 единиц. 100 монет = 0.10 GRAM = 10 единиц.
  const gramUnits = coins / 10;

  const { data: wallet, error: walletError } = await supabaseAdmin
    .from('_pidr_slot_balances')
    .select('gram_units')
    .eq('user_id', dbUserId)
    .maybeSingle();
  if (walletError) {
    return noStore({ success: false, error: 'Сначала примените scripts/sql/slots-wallet.sql' }, 503);
  }

  const currentCoins = Number(user.coins || 0);
  const currentUnits = Number(wallet?.gram_units || 0);

  if (direction === 'to-gram') {
    if (currentCoins < coins) return noStore({ success: false, error: 'Не хватает монет' }, 400);
    const nextCoins = currentCoins - coins;
    const nextUnits = currentUnits + gramUnits;
    const { data: updated, error } = await supabaseAdmin
      .from('_pidr_users')
      .update({ coins: nextCoins })
      .eq('id', dbUserId)
      .eq('coins', currentCoins)
      .select('coins')
      .maybeSingle();
    if (error || !updated) return noStore({ success: false, error: 'Баланс изменился, попробуйте ещё раз' }, 409);
    const write = wallet
      ? supabaseAdmin.from('_pidr_slot_balances').update({ gram_units: nextUnits, updated_at: new Date().toISOString() }).eq('user_id', dbUserId).eq('gram_units', currentUnits)
      : supabaseAdmin.from('_pidr_slot_balances').insert({ user_id: dbUserId, gram_units: nextUnits });
    const { error: gramError } = await write;
    if (gramError) {
      await supabaseAdmin.from('_pidr_users').update({ coins: currentCoins }).eq('id', dbUserId);
      return noStore({ success: false, error: 'Не удалось зачислить GRAM' }, 500);
    }
    return noStore({ success: true, coins: nextCoins, gramUnits: nextUnits });
  }

  if (currentUnits < gramUnits) return noStore({ success: false, error: 'Не хватает GRAM' }, 400);
  const nextUnits = currentUnits - gramUnits;
  const nextCoins = currentCoins + coins;
  const { error: gramError } = await supabaseAdmin
    .from('_pidr_slot_balances')
    .update({ gram_units: nextUnits, updated_at: new Date().toISOString() })
    .eq('user_id', dbUserId)
    .eq('gram_units', currentUnits);
  if (gramError) return noStore({ success: false, error: 'Баланс GRAM изменился, попробуйте ещё раз' }, 409);
  const { error } = await supabaseAdmin.from('_pidr_users').update({ coins: nextCoins }).eq('id', dbUserId);
  if (error) {
    await supabaseAdmin.from('_pidr_slot_balances').update({ gram_units: currentUnits }).eq('user_id', dbUserId);
    return noStore({ success: false, error: 'Не удалось вернуть монеты' }, 500);
  }
  return noStore({ success: true, coins: nextCoins, gramUnits: nextUnits });
}
