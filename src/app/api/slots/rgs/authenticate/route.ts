import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, getUserIdFromDatabase } from '@/lib/auth-utils';
import { COIN_BETS, GRAM_UNIT_BETS, getSlotGame, liveSlotGames } from '@/lib/slots/games';
import { BET_MODES, modeCost, stakeIndex } from '@/lib/slots/release';
import { changeBalance } from '@/lib/slots/wallet';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Ответ в духе Stake /wallet/authenticate:
 * баланс, лестница ставок, режимы и флаги юрисдикции.
 * autoplay=0 и buy=0 прячут автоспины и покупку бонуса.
 */
export async function POST(req: NextRequest) {
  const auth = requireAuth(req);
  if (auth.error || !auth.userId) {
    return NextResponse.json({ success: false, error: auth.error || 'Нужно войти в аккаунт' }, { status: 401 });
  }
  const body = await req.json().catch(() => ({}));
  const mode = body?.mode === 'gram' ? 'gram' : 'coins';
  const game = getSlotGame(String(body?.gameId || '')) ?? getSlotGame('golden-must');
  if (!game) return NextResponse.json({ success: false, error: 'Игра не найдена' }, { status: 404 });

  const { dbUserId } = await getUserIdFromDatabase(auth.userId, auth.environment);
  if (!dbUserId) return NextResponse.json({ success: false, error: 'Игрок не найден' }, { status: 404 });

  const balance = await changeBalance(String(dbUserId), mode, 0);
  if (!balance.ok) return NextResponse.json({ success: false, error: balance.error }, { status: balance.status });

  const jurisdiction = {
    autoplay: body?.autoplay !== false && body?.autoplay !== 0 && body?.autoplay !== '0',
    bonusBuy: body?.buy !== false && body?.buy !== 0 && body?.buy !== '0',
  };

  return NextResponse.json({
    success: true,
    currency: mode === 'gram' ? 'GRAM' : 'COIN',
    balance: { amount: balance.balance, decimals: 2 },
    betLevels: mode === 'gram' ? GRAM_UNIT_BETS : COIN_BETS,
    game: { id: game.id, title: game.title, maxWin: game.maxWinMultiplier, volatility: game.volatility },
    games: liveSlotGames().map((item) => ({ id: item.id, title: item.title, maxWin: item.maxWinMultiplier })),
    modes: BET_MODES.map((name) => ({ name, cost: modeCost(name) })),
    jurisdiction,
    index: stakeIndex(game),
  });
}
