import {
  getThemeAssetPublicPath,
  NFT_THEME_CONFIG,
  pickSeededThemeAsset,
  type NftThemeKey,
  type ThemeAssetPick,
} from '@/lib/nft/theme-config';
import {
  composeSeededThemeCardBuffer,
  composeSvgOnlyCardBuffer,
  COMPOSE_VERSION,
} from '@/lib/nft/compose-theme-card';
import { normalizeRankToken, normalizeSuitToken } from '@/lib/game/cardAssets';
import { supabaseAdmin } from '@/lib/supabase';
import { NFT_CARDS_TABLE, NFT_STORAGE_BUCKET } from '@/lib/nft/constants';

export const DAILY_OFFER_MIN_COINS = 1000;
export const DAILY_OFFER_MAX_COINS = 5000;

const SUITS = ['hearts', 'diamonds', 'clubs', 'spades'] as const;
const RANKS = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'] as const;

export interface PremiumDailyOfferSpec {
  dayTag: string;
  suit: string;
  rankRaw: string;
  rankNormalized: string;
  priceCoins: number;
  themePick: ThemeAssetPick;
  cardTitle: string;
  promoImageUrl: string;
  themeLabel: string;
  seed: number;
}

function hashSeed(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function normalizeRank(rank: string): string {
  const r = rank.toUpperCase();
  if (r === 'J') return 'jack';
  if (r === 'Q') return 'queen';
  if (r === 'K') return 'king';
  if (r === 'A') return 'ace';
  return rank.toLowerCase();
}

function suitSymbol(suit: string): string {
  const map: Record<string, string> = {
    hearts: '♥',
    diamonds: '♦',
    clubs: '♣',
    spades: '♠',
  };
  return map[suit] ?? suit;
}

function rankDisplay(rankRaw: string): string {
  return rankRaw === '10' ? '10' : rankRaw.toUpperCase();
}

export function getDayTag(date = new Date()): string {
  return date.toISOString().slice(0, 10);
}

export function buildPremiumDailyOffer(userId: number, dayTag = getDayTag()): PremiumDailyOfferSpec {
  const seed = hashSeed(`${dayTag}:${userId}`);
  const suit = SUITS[seed % SUITS.length];
  const rankRaw = RANKS[(seed >>> 8) % RANKS.length];
  const rankNormalized = normalizeRank(rankRaw);
  const priceRange = DAILY_OFFER_MAX_COINS - DAILY_OFFER_MIN_COINS + 1;
  const priceCoins = DAILY_OFFER_MIN_COINS + ((seed >>> 16) % priceRange);
  const themePick = pickSeededThemeAsset(seed >>> 4);
  const themeLabel = NFT_THEME_CONFIG[themePick.theme].name;

  return {
    dayTag,
    suit,
    rankRaw,
    rankNormalized,
    priceCoins,
    themePick,
    themeLabel,
    seed,
    promoImageUrl: '',
    cardTitle: `${rankDisplay(rankRaw)} ${suitSymbol(suit)} · ${themeLabel}`,
  };
}

function getDailyOfferPreviewStoragePath(userId: number, spec: PremiumDailyOfferSpec): string {
  return `daily-offer/v${COMPOSE_VERSION}/${spec.dayTag}/preview/user-${userId}-${spec.suit}_${spec.rankNormalized}.png`;
}

function getDailyOfferCardStoragePath(userId: number, spec: PremiumDailyOfferSpec): string {
  return `daily-offer/v${COMPOSE_VERSION}/${spec.dayTag}/user-${userId}-${spec.suit}_${spec.rankNormalized}.png`;
}

async function uploadDailyOfferCardBuffer(
  storagePath: string,
  buffer: Buffer
): Promise<string | null> {
  const { error: uploadError } = await supabaseAdmin.storage.from(NFT_STORAGE_BUCKET).upload(storagePath, buffer, {
    contentType: 'image/png',
    cacheControl: '86400',
    upsert: true,
  });

  if (uploadError) {
    console.warn('⚠️ [daily-offer] upload failed:', uploadError.message);
    return null;
  }

  const { data: urlData } = supabaseAdmin.storage.from(NFT_STORAGE_BUCKET).getPublicUrl(storagePath);
  return urlData?.publicUrl || null;
}

/** Собирает PNG карты: всегда canvas v3 (не кэш v1/v2 sharp) */
async function resolveDailyOfferCardBuffer(
  userId: number,
  spec: PremiumDailyOfferSpec
): Promise<{ buffer: Buffer; themePick: ThemeAssetPick }> {
  try {
    const composed = await composeSeededThemeCardBuffer({
      suit: spec.suit,
      rankRaw: spec.rankRaw,
      rankNormalized: spec.rankNormalized,
      seed: spec.seed,
    });
    return { buffer: composed.buffer, themePick: composed.pick };
  } catch (error) {
    console.warn('⚠️ [daily-offer] themed compose failed, SVG fallback:', error);
  }

  const buffer = await composeSvgOnlyCardBuffer({
    suit: spec.suit,
    rankRaw: spec.rankRaw,
    rankNormalized: spec.rankNormalized,
    themeLabel: spec.themeLabel,
  });
  return { buffer, themePick: spec.themePick };
}

/** Собирает PNG карты с рангом/мастью и заливает в Storage (превью акции дня). */
export async function buildPremiumDailyOfferPreviewUrl(
  userId: number,
  spec: PremiumDailyOfferSpec
): Promise<string> {
  const storagePath = getDailyOfferPreviewStoragePath(userId, spec);

  try {
    const { buffer } = await resolveDailyOfferCardBuffer(userId, spec);
    const publicUrl = await uploadDailyOfferCardBuffer(storagePath, buffer);
    if (publicUrl) return publicUrl;
  } catch (error) {
    console.warn('⚠️ [daily-offer] preview compose failed:', error);
  }

  try {
    const buffer = await composeSvgOnlyCardBuffer({
      suit: spec.suit,
      rankRaw: spec.rankRaw,
      rankNormalized: spec.rankNormalized,
      themeLabel: spec.themeLabel,
    });
    const publicUrl = await uploadDailyOfferCardBuffer(storagePath, buffer);
    if (publicUrl) return publicUrl;
  } catch {
    /* ignore */
  }

  return '';
}

export async function buildPremiumDailyOfferWithPreview(
  userId: number,
  dayTag = getDayTag()
): Promise<PremiumDailyOfferSpec> {
  const spec = buildPremiumDailyOffer(userId, dayTag);
  const promoImageUrl = await buildPremiumDailyOfferPreviewUrl(userId, spec);
  return { ...spec, promoImageUrl };
}

export async function purchasePremiumDailyOffer(
  userId: number,
  spec: PremiumDailyOfferSpec
): Promise<{ newBalance: number; cardId: number; imageUrl: string }> {
  const { data: buyer, error: buyerError } = await supabaseAdmin
    .from('_pidr_users')
    .select('id, coins')
    .eq('id', userId)
    .single();

  if (buyerError || !buyer) throw new Error('Пользователь не найден');
  if ((buyer.coins || 0) < spec.priceCoins) {
    throw new Error(
      `Недостаточно монет. Нужно ${spec.priceCoins.toLocaleString('ru-RU')}, есть ${(buyer.coins || 0).toLocaleString('ru-RU')}`
    );
  }

  const { buffer, themePick } = await resolveDailyOfferCardBuffer(userId, spec);
  const storagePath = getDailyOfferCardStoragePath(userId, spec);
  const imageUrl =
    (await uploadDailyOfferCardBuffer(storagePath, buffer)) ||
    spec.promoImageUrl ||
    getThemeAssetPublicPath(themePick);

  const normalizedSuit = normalizeSuitToken(spec.suit);
  const normalizedRank = normalizeRankToken(spec.rankNormalized);
  const newBalance = (buyer.coins || 0) - spec.priceCoins;

  const { error: deductError } = await supabaseAdmin
    .from('_pidr_users')
    .update({ coins: newBalance })
    .eq('id', userId);

  if (deductError) {
    await supabaseAdmin.storage.from(NFT_STORAGE_BUCKET).remove([storagePath]).catch(() => {});
    throw new Error(`Ошибка списания монет: ${deductError.message}`);
  }

  const { data: savedCard, error: saveError } = await supabaseAdmin
    .from(NFT_CARDS_TABLE)
    .insert({
      user_id: userId,
      suit: normalizedSuit,
      rank: normalizedRank,
      rarity: themePick.theme,
      image_url: imageUrl,
      storage_path: storagePath,
      cost: spec.priceCoins,
      payment_method: 'coins',
      metadata: {
        daily_offer_premium: true,
        day_tag: spec.dayTag,
        theme: themePick.theme,
        theme_id: themePick.themeId,
        price_coins: spec.priceCoins,
        purchased_at: new Date().toISOString(),
        offer_payment_method: 'daily_offer_premium',
      },
    })
    .select('id')
    .single();

  if (saveError || !savedCard) {
    await supabaseAdmin.from('_pidr_users').update({ coins: buyer.coins }).eq('id', userId);
    await supabaseAdmin.storage.from(NFT_STORAGE_BUCKET).remove([storagePath]).catch(() => {});
    throw new Error(`Ошибка создания NFT: ${saveError?.message || 'unknown'}`);
  }

  return { newBalance, cardId: savedCard.id, imageUrl };
}

export function offerToApiPayload(spec: PremiumDailyOfferSpec) {
  const promoImageUrl = spec.promoImageUrl
    ? `${spec.promoImageUrl}${spec.promoImageUrl.includes('?') ? '&' : '?'}v=${spec.dayTag}`
    : spec.promoImageUrl;

  return {
    listingId: 0,
    cardTitle: spec.cardTitle,
    priceCoins: spec.priceCoins,
    discountedCoins: spec.priceCoins,
    originalCoins: spec.priceCoins,
    promoImageUrl,
    theme: spec.themePick.theme,
    themeId: spec.themePick.themeId,
    themeLabel: spec.themeLabel,
    rank: spec.rankRaw,
    suit: spec.suit,
    isPremiumDaily: true,
    composeVersion: COMPOSE_VERSION,
  };
}
