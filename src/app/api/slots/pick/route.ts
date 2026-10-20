import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, getUserIdFromDatabase } from '@/lib/auth-utils';
import { supabaseAdmin } from '@/lib/supabase';
import { getSlotGame } from '@/lib/slots/games';
import { scoreArcherPick } from '@/lib/slots/engine';
import { loadPick, savePick } from '@/lib/slots/pendingPick';

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
  const spinId = String(body?.spinId || '');
  const gameId = String(body?.gameId || '');
  const opened = Array.isArray(body?.opened) ? body.opened.map(Number) : [];
  const game = getSlotGame(gameId);
  if (!game || !spinId || spinId.length > 80) {
    return noStore({ success: false, error: 'Некорректный запрос' }, 400);
  }

  const { dbUserId, user } = await getUserIdFromDatabase(auth.userId, auth.environment);
  if (!dbUserId || !user) return noStore({ success: false, error: 'Игрок не найден' }, 404);

  const pending = await loadPick(dbUserId, spinId);
  if (!pending) return noStore({ success: false, error: 'Тир уже закрыт' }, 404);
  if (pending.settled) {
    return noStore({ success: true, balance: pending.settled.balance, totalWin: pending.settled.total, extra: pending.settled.extra, floorAdded: pending.settled.floorAdded, capped: pending.settled.capped });
  }

  const scored = scoreArcherPick(pending.cells, opened, pending.missLimit, pending.already, pending.baseBet, pending.tier, pending.maxWin);

  if (pending.mode === 'coins') {
    const current = Number(user.coins || 0);
    const next = Math.round((current + scored.extra) * 100) / 100;
    const { data: updated, error } = await supabaseAdmin
      .from('_pidr_users')
      .update({ coins: next })
      .eq('id', dbUserId)
      .eq('coins', current)
      .select('coins')
      .maybeSingle();
    if (error || !updated) return noStore({ success: false, error: 'Баланс уже изменился, нажмите ещё раз' }, 409);
    const settled = { balance: Number(updated.coins), total: scored.total, extra: scored.extra, floorAdded: scored.floorAdded, capped: scored.capped };
    await savePick(dbUserId, spinId, { ...pending, settled });
    return noStore({ success: true, ...settled, totalWin: scored.total });
  }

  const { data: wallet, error: walletError } = await supabaseAdmin
    .from('_pidr_slot_balances')
    .select('gram_units')
    .eq('user_id', dbUserId)
    .maybeSingle();
  if (walletError || !wallet) return noStore({ success: false, error: 'Крипто-баланс слотов ещё не создан' }, 503);
  const current = Number(wallet.gram_units || 0);
  const next = Math.round((current + scored.extra) * 100) / 100;
  const { error } = await supabaseAdmin
    .from('_pidr_slot_balances')
    .update({ gram_units: next, updated_at: new Date().toISOString() })
    .eq('user_id', dbUserId)
    .eq('gram_units', current);
  if (error) return noStore({ success: false, error: 'Баланс GRAM уже изменился, нажмите ещё раз' }, 409);
  const settled = { balance: next, total: scored.total, extra: scored.extra, floorAdded: scored.floorAdded, capped: scored.capped };
  await savePick(dbUserId, spinId, { ...pending, settled });
  return noStore({ success: true, ...settled, totalWin: scored.total });
}
