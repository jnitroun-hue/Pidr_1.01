import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, getUserIdFromDatabase } from '@/lib/auth-utils';
import { loadReplay } from '@/lib/slots/roundLedger';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Книга сыгранного раунда. Хранится 7 дней, этого хватает для разбора спора. */
export async function GET(req: NextRequest) {
  const auth = requireAuth(req);
  if (auth.error || !auth.userId) {
    return NextResponse.json({ success: false, error: auth.error || 'Нужно войти в аккаунт' }, { status: 401 });
  }
  const spinId = req.nextUrl.searchParams.get('spinId') || '';
  if (!spinId || spinId.length > 80) {
    return NextResponse.json({ success: false, error: 'Некорректный запрос' }, { status: 400 });
  }
  const { dbUserId } = await getUserIdFromDatabase(auth.userId, auth.environment);
  if (!dbUserId) return NextResponse.json({ success: false, error: 'Игрок не найден' }, { status: 404 });

  const round = await loadReplay(String(dbUserId), spinId);
  if (!round) return NextResponse.json({ success: false, error: 'Раунд не найден' }, { status: 404 });
  return NextResponse.json({
    success: true,
    spinId: round.spinId,
    gameId: round.gameId,
    mode: round.mode,
    stake: round.stake,
    payout: round.payout,
    capped: round.capped,
    settled: round.settled,
    book: round.book,
  });
}
