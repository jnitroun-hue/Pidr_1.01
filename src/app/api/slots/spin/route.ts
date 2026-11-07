import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, getUserIdFromDatabase } from '@/lib/auth-utils';
import { getRedis } from '@/lib/redis/init';
import { bookOf } from '@/lib/slots/release';
import { COIN_BETS, GRAM_UNIT_BETS, getSlotGame } from '@/lib/slots/games';
import { anteCharge } from '@/lib/slots/speed';
import { buyBonus, spinSlot } from '@/lib/slots/engine';
import { rememberPick } from '@/lib/slots/pendingPick';
import { loadOpen, saveOpen, settleOpen, withUserLock } from '@/lib/slots/roundLedger';
import { changeBalance } from '@/lib/slots/wallet';

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

  const { dbUserId } = await getUserIdFromDatabase(auth.userId, auth.environment);
  if (!dbUserId) return noStore({ success: false, error: 'Игрок не найден' }, 404);

  const locked = await withUserLock(String(dbUserId), async () => {
    const redis = getRedis();
    const doneKey = `slots:spin:${dbUserId}:${spinId}`;
    if (redis) {
      const cached = await redis.get<string>(doneKey);
      if (cached) return { status: 200, body: typeof cached === 'string' ? JSON.parse(cached) : cached };
    }

    const pending = await loadOpen(String(dbUserId));
    if (pending && !pending.settled) {
      const closed = await settleOpen(String(dbUserId));
      if (!closed.ok) return { status: closed.status, body: { success: false, error: closed.error } };
    }

    const buy = body?.buy === 'top' ? 'top' : body?.buy === 'regular' ? 'regular' : null;
    const ante = body?.ante === true && !buy;
    const result = buy ? buyBonus(game, bet, buy) : spinSlot(game, bet, ante);
    if (result.bonus?.pick?.cells?.length) {
      await rememberPick(dbUserId, spinId, {
        mode,
        baseBet: bet,
        already: result.totalWin,
        tier: result.bonus.tier,
        maxWin: game.maxWinMultiplier,
        cells: result.bonus.pick.cells,
        missLimit: result.bonus.pick.missLimit ?? 3,
      });
    }
    const stake = buy === 'top' ? bet * 500 : buy === 'regular' ? bet * 100 : ante ? anteCharge(bet) : bet;
    const debited = await changeBalance(String(dbUserId), mode, -stake);
    if (!debited.ok) return { status: debited.status, body: { success: false, error: debited.error } };

    const book = bookOf(game, result, bet, 0);
    await saveOpen(String(dbUserId), {
      spinId,
      gameId: game.id,
      mode,
      stake,
      baseBet: bet,
      payout: result.totalWin,
      capped: result.capped,
      book,
      settled: false,
      balance: null,
    });

    const payload = {
      success: true,
      mode,
      balance: debited.balance,
      bet: stake,
      activeRound: true,
      payoutMultiplier: book.payoutMultiplier,
      book,
      ...result,
    };
    if (redis) await redis.set(doneKey, JSON.stringify(payload), { ex: 600 });
    return { status: 200, body: payload };
  });

  if ('locked' in locked) return noStore({ success: false, error: 'Предыдущий раунд ещё закрывается' }, 409);
  return noStore(locked.body, locked.status);
}
