import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, getUserIdFromDatabase } from '@/lib/auth-utils';
import { getPremiumStatus } from '@/lib/premium/premium-service';
import {
  DAILY_OFFER_COOLDOWN_MS,
  getDailyOfferClaimState,
  recordDailyOfferClaim,
} from '@/lib/marketplace/daily-offer-claims';
import {
  buildPremiumDailyOffer,
  buildPremiumDailyOfferWithPreview,
  DAILY_OFFER_MAX_COINS,
  DAILY_OFFER_MIN_COINS,
  offerToApiPayload,
  purchasePremiumDailyOffer,
} from '@/lib/marketplace/daily-offer-premium';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

function jsonError(error: unknown, status = 500) {
  const message = error instanceof Error ? error.message : 'Internal server error';
  console.error('❌ [daily-offer]', message, error);
  return NextResponse.json({ success: false, error: message }, { status });
}

async function getAuthDbUserId(request: NextRequest): Promise<number | null> {
  const auth = requireAuth(request);
  if (auth.error || !auth.userId) return null;
  const { dbUserId } = await getUserIdFromDatabase(auth.userId, auth.environment);
  return dbUserId || null;
}

export async function GET(request: NextRequest) {
  try {
    const dbUserId = await getAuthDbUserId(request);
    if (!dbUserId) {
      return NextResponse.json({ success: false, error: 'Не авторизован' }, { status: 401 });
    }

    const premium = await getPremiumStatus(dbUserId);
    if (!premium.isPremium) {
      return NextResponse.json(
        {
          success: false,
          requiresPremium: true,
          error: 'Акция дня доступна только с Premium',
          priceRange: { min: DAILY_OFFER_MIN_COINS, max: DAILY_OFFER_MAX_COINS },
        },
        { status: 403 }
      );
    }

    const spec = await buildPremiumDailyOfferWithPreview(dbUserId);
    const claim = await getDailyOfferClaimState(dbUserId);

    const response = NextResponse.json({
      success: true,
      offer: offerToApiPayload(spec),
      claim: {
        canClaim: claim.canClaim,
        remainingMs: claim.remainingMs,
      },
    });
    response.headers.set('Cache-Control', 'no-store');
    return response;
  } catch (error: unknown) {
    return jsonError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const dbUserId = await getAuthDbUserId(request);
    if (!dbUserId) {
      return NextResponse.json({ success: false, error: 'Не авторизован' }, { status: 401 });
    }

    const premium = await getPremiumStatus(dbUserId);
    if (!premium.isPremium) {
      return NextResponse.json(
        {
          success: false,
          requiresPremium: true,
          error: 'Акция дня доступна только с Premium',
        },
        { status: 403 }
      );
    }

    const claim = await getDailyOfferClaimState(dbUserId);
    if (!claim.canClaim) {
      return NextResponse.json(
        {
          success: false,
          error: 'Акция дня уже использована. Новый шанс через 24 часа.',
          claim: { canClaim: false, remainingMs: claim.remainingMs },
        },
        { status: 429 }
      );
    }

    const spec = buildPremiumDailyOffer(dbUserId);
    const result = await purchasePremiumDailyOffer(dbUserId, spec);

    try {
      await recordDailyOfferClaim(dbUserId, {
        listingId: 0,
        coinsPaid: spec.priceCoins,
        balanceAfter: result.newBalance,
      });
    } catch (claimError) {
      console.warn('⚠️ [daily-offer] claim log failed (purchase ok):', claimError);
    }

    return NextResponse.json({
      success: true,
      message: 'Карта акции дня куплена за монеты!',
      offer: offerToApiPayload({ ...spec, promoImageUrl: result.imageUrl }),
      purchase: {
        newBalance: result.newBalance,
        cardId: result.cardId,
        imageUrl: result.imageUrl,
      },
      claim: { canClaim: false, remainingMs: DAILY_OFFER_COOLDOWN_MS },
    });
  } catch (error: unknown) {
    return jsonError(error);
  }
}
