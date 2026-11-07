import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, getUserIdFromDatabase } from '@/lib/auth-utils';
import { settleOpen, withUserLock } from '@/lib/slots/roundLedger';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function noStore(body: unknown, status = 200) {
  const response = NextResponse.json(body, { status });
  response.headers.set('Cache-Control', 'private, no-store');
  return response;
}

/** Зачислить выигрыш после того, как клиент доиграл ролик. Повтор безопасен. */
export async function POST(req: NextRequest) {
  const auth = requireAuth(req);
  if (auth.error || !auth.userId) {
    return noStore({ success: false, error: auth.error || 'Нужно войти в аккаунт' }, 401);
  }
  const body = await req.json().catch(() => null);
  const spinId = String(body?.spinId || '');
  if (!spinId || spinId.length > 80) return noStore({ success: false, error: 'Некорректный запрос' }, 400);

  const { dbUserId } = await getUserIdFromDatabase(auth.userId, auth.environment);
  if (!dbUserId) return noStore({ success: false, error: 'Игрок не найден' }, 404);

  const locked = await withUserLock(String(dbUserId), () => settleOpen(String(dbUserId), spinId));
  if ('locked' in locked) return noStore({ success: false, error: 'Раунд уже закрывается' }, 409);
  if (!locked.ok) return noStore({ success: false, error: locked.error }, locked.status);
  return noStore({ success: true, balance: locked.balance, totalWin: locked.payout, already: locked.already });
}
