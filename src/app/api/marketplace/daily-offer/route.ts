import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, getUserIdFromDatabase } from '@/lib/auth-utils';
import { getSupabaseAdmin } from '@/lib/supabase';
import { getRedis } from '@/lib/redis/client';
import { NFT_STORAGE_BUCKET } from '@/lib/nft/constants';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const DAILY_DISCOUNT = 0.29;
const COOLDOWN_SECONDS = 24 * 60 * 60;
const TARGET_DISCOUNTED_RUB = 200;
const TON_TO_RUB = 550;
const SOL_TO_RUB = 14000;
const COIN_TO_RUB = 0.2;

type MarketplaceListing = {
  id: number;
  price_coins: number | null;
  price_ton: number | null;
  price_sol: number | null;
  price_rub: number | null;
  nft_card?: {
    rank?: string;
    suit?: string;
    rarity?: string;
    image_url?: string;
  } | null;
};

function getSuitSymbol(suit?: string): string {
  const symbols: Record<string, string> = {
    hearts: '♥',
    diamonds: '♦',
    clubs: '♣',
    spades: '♠',
  };
  return suit ? symbols[suit] || '♠' : '♠';
}

function getRankDisplay(rank?: string): string {
  const map: Record<string, string> = {
    a: 'A',
    j: 'J',
    q: 'Q',
    k: 'K',
    A: 'A',
    J: 'J',
    Q: 'Q',
    K: 'K',
  };
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
      const discounted = Math.max(29, Math.round(rub * (1 - DAILY_DISCOUNT)));
      return {
        item,
        originalRub: Math.max(50, Math.round(rub)),
        discountedRub: discounted,
        score: Math.abs(discounted - TARGET_DISCOUNTED_RUB),
      };
    })
    .filter(Boolean) as Array<{
    item: MarketplaceListing;
    originalRub: number;
    discountedRub: number;
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
  if (contentType?.includes('gif')) return 'gif';
  const fromUrl = sourceUrl.split('?')[0].split('.').pop()?.toLowerCase();
  if (fromUrl && ['png', 'jpg', 'jpeg', 'webp', 'gif'].includes(fromUrl)) {
    return fromUrl === 'jpeg' ? 'jpg' : fromUrl;
  }
  return 'png';
}

async function ensurePromoCloneImage(
  db: any,
  redis: any,
  listingId: number,
  sourceImageUrl: string | null
): Promise<{ promoImageUrl: string | null; isClonedImage: boolean }> {
  if (!sourceImageUrl) {
    return { promoImageUrl: null, isClonedImage: false };
  }

  const dayTag = new Date().toISOString().slice(0, 10);
  const cloneKey = `marketplace:daily-offer:clone:${dayTag}:${listingId}`;

  if (redis) {
    const cached = await redis.get(cloneKey);
    if (cached) {
      return { promoImageUrl: cached, isClonedImage: true };
    }
  }

  try {
    const imageResponse = await fetch(sourceImageUrl, { cache: 'no-store' });
    if (!imageResponse.ok) {
      throw new Error(`fetch image failed: ${imageResponse.status}`);
    }

    const contentType = imageResponse.headers.get('content-type');
    const extension = getImageExtension(contentType, sourceImageUrl);
    const arrayBuffer = await imageResponse.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const filePath = `promo-clones/${dayTag}/listing-${listingId}.${extension}`;

    const uploadRes = await db.storage
      .from(NFT_STORAGE_BUCKET)
      .upload(filePath, buffer, {
        contentType: contentType || `image/${extension}`,
        cacheControl: '86400',
        upsert: true,
      });

    if (uploadRes.error) {
      throw uploadRes.error;
    }

    const { data: urlData } = db.storage.from(NFT_STORAGE_BUCKET).getPublicUrl(filePath);
    const promoImageUrl = urlData?.publicUrl || sourceImageUrl;

    if (redis && promoImageUrl) {
      await redis.set(cloneKey, promoImageUrl, { ex: 3 * 24 * 60 * 60 });
    }

    return { promoImageUrl, isClonedImage: true };
  } catch (error) {
    console.warn('⚠️ [daily-offer] Не удалось создать клон изображения, используем оригинал:', error);
    return { promoImageUrl: sourceImageUrl, isClonedImage: false };
  }
}

async function getOfferFromDb(redis?: any) {
  const db = getSupabaseAdmin();
  if (!db) return { offer: null, error: 'База данных недоступна' };

  const { data, error } = await db
    .from('_pidr_nft_marketplace')
    .select(
      `
      id,
      price_coins,
      price_ton,
      price_sol,
      price_rub,
      nft_card:_pidr_nft_cards(
        rank,
        suit,
        rarity,
        image_url
      )
      `
    )
    .eq('status', 'active')
    .limit(120);

  if (error) {
    return { offer: null, error: error.message || 'Ошибка загрузки лотов' };
  }

  const rawOffer = buildOffer((data || []) as MarketplaceListing[]);
  if (!rawOffer) {
    return { offer: null, error: null };
  }

  const { promoImageUrl, isClonedImage } = await ensurePromoCloneImage(
    db,
    redis,
    rawOffer.listingId,
    rawOffer.sourceImageUrl
  );

  const { sourceImageUrl, ...offerWithoutSource } = rawOffer;
  const offer = {
    ...offerWithoutSource,
    promoImageUrl,
    isClonedImage,
  };

  return { offer, error: null };
}

export async function GET(request: NextRequest) {
  try {
    const dbUserId = await getAuthDbUserId(request);
    if (!dbUserId) {
      return NextResponse.json({ success: false, error: 'Не авторизован' }, { status: 401 });
    }

    const redis = getRedis();
    const { offer, error } = await getOfferFromDb(redis);
    if (error || !offer) {
      return NextResponse.json({ success: false, error: error || 'Нет подходящих лотов для акции' }, { status: 404 });
    }

    const claimKey = `marketplace:daily-offer:claim:${dbUserId}`;
    const claimedAtRaw = redis ? await redis.get(claimKey) : null;
    const claimedAt = claimedAtRaw ? Number(claimedAtRaw) : null;
    const now = Date.now();
    const remainingMs = claimedAt ? Math.max(0, claimedAt + COOLDOWN_SECONDS * 1000 - now) : 0;

    const response = NextResponse.json({
      success: true,
      offer,
      claim: {
        canClaim: remainingMs <= 0,
        remainingMs,
      },
      rates: {
        tonToRub: TON_TO_RUB,
        solToRub: SOL_TO_RUB,
        coinToRub: COIN_TO_RUB,
      },
    });

    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    return response;
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || 'Internal server error' },
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

    const redis = getRedis();
    if (!redis) {
      return NextResponse.json(
        { success: false, error: 'Redis недоступен: акция дня временно недоступна' },
        { status: 503 }
      );
    }

    const claimKey = `marketplace:daily-offer:claim:${dbUserId}`;
    const existing = await redis.get(claimKey);
    if (existing) {
      const claimedAt = Number(existing);
      const remainingMs = Math.max(0, claimedAt + COOLDOWN_SECONDS * 1000 - Date.now());
      if (remainingMs > 0) {
        return NextResponse.json(
          {
            success: false,
            error: 'Акция уже активирована',
            claim: { canClaim: false, remainingMs },
          },
          { status: 429 }
        );
      }
    }

    const { offer, error } = await getOfferFromDb(redis);
    if (error || !offer) {
      return NextResponse.json({ success: false, error: error || 'Нет подходящих лотов для акции' }, { status: 404 });
    }

    const now = Date.now();
    await redis.set(claimKey, String(now), { ex: COOLDOWN_SECONDS });

    return NextResponse.json({
      success: true,
      message: 'Акция дня активирована',
      offer,
      claim: {
        canClaim: false,
        remainingMs: COOLDOWN_SECONDS * 1000,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
