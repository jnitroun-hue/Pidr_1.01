import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, getUserIdFromDatabase } from '@/lib/auth-utils';
import { getPremiumStatus } from '@/lib/premium/premium-service';
import { PREMIUM_BENEFITS, PREMIUM_PRICE_COINS, PREMIUM_PRICE_RUB } from '@/lib/premium/constants';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const auth = requireAuth(req);
  if (auth.error || !auth.userId) {
    return NextResponse.json({ success: false, error: auth.error }, { status: 401 });
  }

  const { dbUserId } = await getUserIdFromDatabase(auth.userId, auth.environment);
  if (!dbUserId) {
    return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
  }

  const premium = await getPremiumStatus(dbUserId);

  return NextResponse.json({
    success: true,
    premium,
    pricing: { rub: PREMIUM_PRICE_RUB, coins: PREMIUM_PRICE_COINS },
    benefits: PREMIUM_BENEFITS,
  });
}
