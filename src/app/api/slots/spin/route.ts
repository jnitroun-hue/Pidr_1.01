import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, getUserIdFromDatabase } from '@/lib/auth-utils';
import { supabaseAdmin } from '@/lib/supabase';
import { getRedis } from '@/lib/redis/init';
import { COIN_BETS, GRAM_UNIT_BETS, getSlotGame } from '@/lib/slots/games';
import { anteCharge } from '@/lib/slots/speed';
import { buyBonus, spinSlot } from '@/lib/slots/engine';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function noStore(body: unknown, status = 200) {
  const response = NextResponse.json(body, { status });
  response.headers.set('Cache-Control', 'private, no-store');
  return response;
}

export async function POST(req: NextRequest) {
  const auth = requireAuth(req);
  if (auth.error || !auth.userId) {
    return noStore({ success: false, error: auth.error || 'Нужно войти в аккаунт' }, 401);
  }

  const body = await req.json().catch(() => null);
  const gameId = String(body?.gameId || '');
  const mode = body?.mode === 'gram' ? 'gram' : body?.mode === 'coins' ? 'coins' : '';
  const bet = Number(body?.bet);
  const spinId = String(body?.spinId || '');
  const game = getSlotGame(gameId);

  if (!game || !mode || !spinId || spinId.length > 80) {
    return noStore({ success: false, error: 'Некорректный запрос' }, 400);
  }
  const allowed = mode === 'coins' ? COIN_BETS : GRAM_UNIT_BETS;
  if (!allowed.includes(bet)) {
    return noStore({ success: false, error: 'Такая ставка не разрешена' }, 400);
  }

  const { dbUserId, user } = await getUserIdFromDatabase(auth.userId, auth.environment);
  if (!dbUserId || !user) {
    return noStore({ success: false, error: 'Игрок не найден' }, 404);
  }

  const redis = getRedis();
  const doneKey = `slots:spin:${dbUserId}:${spinId}`;
  if (redis) {
    const cached = await redis.get<string>(doneKey);
    if (cached) return noStore(typeof cached === 'string' ? JSON.parse(cached) : cached);
  }

  const buy = body?.buy === 'top' ? 'top' : body?.buy === 'regular' ? 'regular' : null;
  const ante = body?.ante === true && !buy;
  const result = buy ? buyBonus(game, bet, buy) : spinSlot(game, bet, ante);
  const stake = buy === 'top' ? bet * 500 : buy === 'regular' ? bet * 100 : ante ? anteCharge(bet) : bet;
  const payout = result.totalWin;

  if (mode === 'coins') {
    const current = Number(user.coins || 0);
    if (current < stake) return noStore({ success: false, error: 'Не хватает монет' }, 400);
    const next = Math.round((current - stake + payout) * 100) / 100;
    const { data: updated, error } = await supabaseAdmin
      .from('_pidr_users')
      .update({ coins: next })
      .eq('id', dbUserId)
      .eq('coins', current)
      .select('coins')
      .maybeSingle();
    if (error || !updated) {
      return noStore({ success: false, error: 'Баланс уже изменился, нажмите ещё раз' }, 409);
    }
    const payload = {
      success: true,
      mode,
      balance: Number(updated.coins),
      bet: stake,
      ...result,
    };
    if (redis) await redis.set(doneKey, JSON.stringify(payload), { ex: 600 });
    return noStore(payload);
  }

  const { data: wallet, error: walletError } = await supabaseAdmin
    .from('_pidr_slot_balances')
    .select('gram_units')
    .eq('user_id', dbUserId)
    .maybeSingle();
  if (walletError) {
    return noStore({ success: false, error: 'Крипто-баланс слотов ещё не создан. Нужно применить SQL из scripts/sql/slots-wallet.sql' }, 503);
  }
  const current = Number(wallet?.gram_units || 0);
  if (current < stake) return noStore({ success: false, error: 'Не хватает GRAM' }, 400);
  const next = Math.round((current - stake + payout) * 100) / 100;
  const write = wallet
    ? supabaseAdmin.from('_pidr_slot_balances').update({ gram_units: next, updated_at: new Date().toISOString() }).eq('user_id', dbUserId).eq('gram_units', current)
    : supabaseAdmin.from('_pidr_slot_balances').insert({ user_id: dbUserId, gram_units: next });
  const { error } = await write;
  if (error) {
    return noStore({ success: false, error: 'Баланс GRAM уже изменился, нажмите ещё раз' }, 409);
  }
  const payload = {
    success: true,
    mode,
    balance: next,
    bet: stake,
    ...result,
  };
  if (redis) await redis.set(doneKey, JSON.stringify(payload), { ex: 600 });
  return noStore(payload);
}
