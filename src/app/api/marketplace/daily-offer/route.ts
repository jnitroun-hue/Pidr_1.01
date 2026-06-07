import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, getUserIdFromDatabase } from '@/lib/auth-utils';
import { getSupabaseAdmin } from '@/lib/supabase';
import { getRedis } from '@/lib/redis/client';
import { NFT_STORAGE_BUCKET } from '@/lib/nft/constants';
import {
  DAILY_OFFER_COOLDOWN_MS,
  getDailyOfferClaimState,
  recordDailyOfferClaim,
} from '@/lib/marketplace/daily-offer-claims';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const DAILY_DISCOUNT = 0.29;
const TARGET_DISCOUNTED_RUB = 200;
const TON_TO_RUB = 550;
const SOL_TO_RUB = 14000;
const COIN_TO_RUB = 0.2;

type MarketplaceListing = {
  id: number;
  seller_user_id?: number;
  nft_card_id?: number;
  price_coins: number | null;
  price_ton: number | null;
  price_sol: number | null;
  price_rub: number | null;
  status?: string;
  nft_card?: {
    rank?: string;
    suit?: string;
    rarity?: string;
    image_url?: string;
  } | null;
};

function getSuitSymbol(suit?: string): string {
  const symbols: Record<string, string> = {
    hearts: '♥', diamonds: '♦', clubs: '♣', spades: '♠',
  };
  return suit ? symbols[suit] || '♠' : '♠';
}

function getRankDisplay(rank?: string): string {
  const map: Record<string, string> = { a: 'A', j: 'J', q: 'Q', k: 'K', A: 'A', J: 'J', Q: 'Q', K: 'K' };
  return rank ? map[rank] || rank : '?';
}

function listingToRub(item: MarketplaceListing): number | null {
  if (item.price_rub && item.price_rub > 0) return Number(item.price_rub);
  if (item.price_ton && item.price_ton > 0) return Number(item.price_ton) * TON_TO_RUB;
  if (item.price_sol && item.price_sol > 0) return Number(item.price_sol) * SOL_TO_RUB;
  if (item.price_coins && item.price_coins > 0) return Number(item.price_coins) * COIN_TO_RUB;
  return null;
}

function buildOffer(listings: MarketplaceListing[]) {
  const eligible = listings
    .map((item) => {
      const rub = listingToRub(item);
      if (!rub) return null;
      const discountedRub = Math.max(29, Math.round(rub * (1 - DAILY_DISCOUNT)));
      return {
        item,
        originalRub: Math.max(50, Math.round(rub)),
        discountedRub,
        discountedCoins: Math.max(1, Math.ceil(discountedRub / COIN_TO_RUB)),
        originalCoins: Math.max(1, Math.ceil(Math.max(50, Math.round(rub)) / COIN_TO_RUB)),
        score: Math.abs(discountedRub - TARGET_DISCOUNTED_RUB),
      };
    })
    .filter(Boolean) as Array<{
    item: MarketplaceListing;
    originalRub: number;
    discountedRub: number;
    discountedCoins: number;
    originalCoins: number;
    score: number;
  }>;

  if (eligible.length === 0) return null;

  eligible.sort((a, b) => a.score - b.score);
  const topPool = eligible.slice(0, Math.min(8, eligible.length));
  const daySeed = Number(new Date().toISOString().slice(0, 10).replace(/-/g, ''));
  const selected = topPool[daySeed % topPool.length];
  const tonPrice = Number((selected.discountedRub / TON_TO_RUB).toFixed(3));
  const solPrice = Number((selected.discountedRub / SOL_TO_RUB).toFixed(4));

  return {
    listingId: selected.item.id,
    cardTitle: `${getRankDisplay(selected.item.nft_card?.rank)} ${getSuitSymbol(selected.item.nft_card?.suit)} · ${selected.item.nft_card?.rarity || 'rare'}`,
    originalRub: selected.originalRub,
    discountedRub: selected.discountedRub,
    originalCoins: selected.originalCoins,
    discountedCoins: selected.discountedCoins,
    tonPrice,
    solPrice,
    discountPercent: Math.round(DAILY_DISCOUNT * 100),
    sourceImageUrl: selected.item.nft_card?.image_url || null,
  };
}

async function getAuthDbUserId(request: NextRequest): Promise<number | null> {
  const auth = requireAuth(request);
  if (auth.error || !auth.userId) return null;
  const { dbUserId } = await getUserIdFromDatabase(auth.userId, auth.environment);
  return dbUserId || null;
}

function getImageExtension(contentType: string | null, sourceUrl: string): string {
  if (contentType?.includes('png')) return 'png';
  if (contentType?.includes('jpeg') || contentType?.includes('jpg')) return 'jpg';
  if (contentType?.includes('webp')) return 'webp';
  const fromUrl = sourceUrl.split('?')[0].split('.').pop()?.toLowerCase();
  if (fromUrl && ['png', 'jpg', 'jpeg', 'webp', 'gif'].includes(fromUrl)) {
    return fromUrl === 'jpeg' ? 'jpg' : fromUrl;
  }
  return 'png';
}

async function ensurePromoCloneImage(
  db: NonNullable<ReturnType<typeof getSupabaseAdmin>>,
  listingId: number,
  sourceImageUrl: string | null
): Promise<{ promoImageUrl: string | null; isClonedImage: boolean }> {
  if (!sourceImageUrl) return { promoImageUrl: null, isClonedImage: false };

  const dayTag = new Date().toISOString().slice(0, 10);
  const cloneKey = `marketplace:daily-offer:clone:${dayTag}:${listingId}`;
  const redis = getRedis();

  if (redis) {
    try {
      const cached = await redis.get(cloneKey);
      if (cached) return { promoImageUrl: cached, isClonedImage: true };
    } catch { /* ignore */ }
  }

  try {
    const imageResponse = await fetch(sourceImageUrl, { cache: 'no-store' });
    if (!imageResponse.ok) throw new Error(`fetch ${imageResponse.status}`);

    const contentType = imageResponse.headers.get('content-type');
    const extension = getImageExtension(contentType, sourceImageUrl);
    const buffer = Buffer.from(await imageResponse.arrayBuffer());
    const filePath = `promo-clones/${dayTag}/listing-${listingId}.${extension}`;

    const uploadRes = await db.storage.from(NFT_STORAGE_BUCKET).upload(filePath, buffer, {
      contentType: contentType || `image/${extension}`,
      cacheControl: '86400',
      upsert: true,
    });
    if (uploadRes.error) throw uploadRes.error;

    const { data: urlData } = db.storage.from(NFT_STORAGE_BUCKET).getPublicUrl(filePath);
    const promoImageUrl = urlData?.publicUrl || sourceImageUrl;

    if (redis && promoImageUrl) {
      try {
        await redis.set(cloneKey, promoImageUrl, { ex: 3 * 24 * 60 * 60 });
      } catch { /* ignore */ }
    }

    return { promoImageUrl, isClonedImage: true };
  } catch (error) {
    console.warn('⚠️ [daily-offer] clone image fallback:', error);
    return { promoImageUrl: sourceImageUrl, isClonedImage: false };
  }
}

async function getOfferFromDb() {
  const db = getSupabaseAdmin();
  if (!db) return { offer: null, error: 'База данных недоступна' };

  const { data, error } = await db
    .from('_pidr_nft_marketplace')
    .select(`
      id,
      seller_user_id,
      nft_card_id,
      price_coins,
      price_ton,
      price_sol,
      price_rub,
      status,
      nft_card:_pidr_nft_cards(rank, suit, rarity, image_url)
    `)
    .eq('status', 'active')
    .limit(120);

  if (error) return { offer: null, error: error.message || 'Ошибка загрузки лотов' };

  const rawOffer = buildOffer((data || []) as MarketplaceListing[]);
  if (!rawOffer) return { offer: null, error: null };

  const { promoImageUrl, isClonedImage } = await ensurePromoCloneImage(
    db,
    rawOffer.listingId,
    rawOffer.sourceImageUrl
  );

  const { sourceImageUrl, ...rest } = rawOffer;
  return {
    offer: { ...rest, promoImageUrl, isClonedImage },
    error: null,
  };
}

async function buyDailyOfferWithCoins(dbUserId: number, listingId: number, priceCoins: number) {
  const db = getSupabaseAdmin();
  if (!db) throw new Error('База данных недоступна');

  const { data: listing, error: listingError } = await db
    .from('_pidr_nft_marketplace')
    .select('*, nft_card:_pidr_nft_cards(*)')
    .eq('id', listingId)
    .maybeSingle();

  if (listingError || !listing) throw new Error('Лот не найден');
  if (listing.status !== 'active') throw new Error('Лот уже продан');
  if (listing.seller_user_id === dbUserId) throw new Error('Нельзя купить собственную карту');

  const { data: buyer, error: buyerError } = await db
    .from('_pidr_users')
    .select('id, coins')
    .eq('id', dbUserId)
    .single();

  if (buyerError || !buyer) throw new Error('Пользователь не найден');
  if ((buyer.coins || 0) < priceCoins) {
    throw new Error(`Недостаточно монет. Нужно ${priceCoins.toLocaleString('ru-RU')}, есть ${(buyer.coins || 0).toLocaleString('ru-RU')}`);
  }

  const platformFee = Math.floor(priceCoins * 0.05);
  const sellerAmount = priceCoins - platformFee;
  const newBuyerBalance = buyer.coins - priceCoins;

  const { error: deductError } = await db
    .from('_pidr_users')
    .update({ coins: newBuyerBalance })
    .eq('id', dbUserId);

  if (deductError) throw new Error('Ошибка списания монет');

  const { data: seller } = await db
    .from('_pidr_users')
    .select('coins')
    .eq('id', listing.seller_user_id)
    .maybeSingle();

  if (seller) {
    await db
      .from('_pidr_users')
      .update({ coins: (seller.coins || 0) + sellerAmount })
      .eq('id', listing.seller_user_id);
  }

  const { error: transferError } = await db
    .from('_pidr_nft_cards')
    .update({ user_id: dbUserId })
    .eq('id', listing.nft_card_id);

  if (transferError) {
    await db.from('_pidr_users').update({ coins: buyer.coins }).eq('id', dbUserId);
    throw new Error('Ошибка переноса NFT');
  }

  await db
    .from('_pidr_nft_marketplace')
    .update({
      status: 'sold',
      buyer_user_id: dbUserId,
      sold_at: new Date().toISOString(),
    })
    .eq('id', listingId);

  await recordDailyOfferClaim(dbUserId, {
    listingId,
    coinsPaid: priceCoins,
    balanceAfter: newBuyerBalance,
  });

  return { newBalance: newBuyerBalance, listingId };
}

export async function GET(request: NextRequest) {
  try {
    const dbUserId = await getAuthDbUserId(request);
    if (!dbUserId) {
      return NextResponse.json({ success: false, error: 'Не авторизован' }, { status: 401 });
    }

    const { offer, error } = await getOfferFromDb();
    if (error || !offer) {
      return NextResponse.json({ success: false, error: error || 'Нет подходящих лотов для акции' }, { status: 404 });
    }

    const claim = await getDailyOfferClaimState(dbUserId);

    const response = NextResponse.json({
      success: true,
      offer,
      claim: {
        canClaim: claim.canClaim,
        remainingMs: claim.remainingMs,
      },
      rates: { tonToRub: TON_TO_RUB, solToRub: SOL_TO_RUB, coinToRub: COIN_TO_RUB },
    });
    response.headers.set('Cache-Control', 'no-store');
    return response;
  } catch (error: unknown) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const dbUserId = await getAuthDbUserId(request);
    if (!dbUserId) {
      return NextResponse.json({ success: false, error: 'Не авторизован' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const action = body.action === 'activate' ? 'activate' : 'buy_coins';

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

    const { offer, error } = await getOfferFromDb();
    if (error || !offer) {
      return NextResponse.json({ success: false, error: error || 'Нет подходящих лотов для акции' }, { status: 404 });
    }

    if (action === 'activate') {
      await recordDailyOfferClaim(dbUserId, { listingId: offer.listingId });
      return NextResponse.json({
        success: true,
        message: 'Акция дня активирована',
        offer,
        claim: { canClaim: false, remainingMs: DAILY_OFFER_COOLDOWN_MS },
      });
    }

    const result = await buyDailyOfferWithCoins(dbUserId, offer.listingId, offer.discountedCoins);

    return NextResponse.json({
      success: true,
      message: 'Карта акции дня куплена за монеты!',
      offer,
      purchase: result,
      claim: { canClaim: false, remainingMs: DAILY_OFFER_COOLDOWN_MS },
    });
  } catch (error: unknown) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
