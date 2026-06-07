import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, getUserIdFromDatabase } from '@/lib/auth-utils';
import { activatePremium, getPremiumStatus } from '@/lib/premium/premium-service';
import { PREMIUM_BENEFITS, PREMIUM_PRICE_COINS, PREMIUM_PRICE_RUB } from '@/lib/premium/constants';
import { supabaseAdmin } from '@/lib/supabase';

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

  let premium = await getPremiumStatus(dbUserId);

  if (!premium.isPremium) {
    const { data: paidPremium } = await supabaseAdmin
      .from('_pidr_payments')
      .select('payment_id, amount')
      .eq('user_id', dbUserId)
      .eq('item_type', 'premium')
      .eq('status', 'succeeded')
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (paidPremium?.payment_id) {
      try {
        await activatePremium({
          userId: dbUserId,
          source: 'yookassa',
          paymentId: paidPremium.payment_id,
          amountPaidRub: Number(paidPremium.amount) || PREMIUM_PRICE_RUB,
        });
        premium = await getPremiumStatus(dbUserId);
      } catch (err) {
        console.error('❌ Premium recovery from payment failed:', err);
      }
    }
  }

  return NextResponse.json({
    success: true,
    premium,
    pricing: { rub: PREMIUM_PRICE_RUB, coins: PREMIUM_PRICE_COINS },
    benefits: PREMIUM_BENEFITS,
  });
}
