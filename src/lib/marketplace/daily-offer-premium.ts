import {
  getThemeAssetPublicPath,
  NFT_THEME_CONFIG,
  pickSeededThemeAsset,
  type NftThemeKey,
  type ThemeAssetPick,
} from '@/lib/nft/theme-config';
import { composeThemeCardBuffer } from '@/lib/nft/compose-theme-card';
import { normalizeRankToken, normalizeSuitToken } from '@/lib/game/cardAssets';
import { getSupabaseAdmin } from '@/lib/supabase';
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
    promoImageUrl: getThemeAssetPublicPath(themePick),
    cardTitle: `${rankDisplay(rankRaw)} ${suitSymbol(suit)} · ${themeLabel}`,
  };
}

export async function purchasePremiumDailyOffer(
  userId: number,
  spec: PremiumDailyOfferSpec
): Promise<{ newBalance: number; cardId: number }> {
  const db = getSupabaseAdmin();
  if (!db) throw new Error('База данных недоступна');

  const { data: buyer, error: buyerError } = await db
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

  const buffer = await composeThemeCardBuffer({
    suit: spec.suit,
    rankRaw: spec.rankRaw,
    rankNormalized: spec.rankNormalized,
    theme: spec.themePick.theme,
    themeId: spec.themePick.themeId,
  });

  const storagePath = `daily-offer/${spec.dayTag}/user-${userId}-${spec.suit}_${spec.rankNormalized}.png`;
  const { error: uploadError } = await db.storage.from(NFT_STORAGE_BUCKET).upload(storagePath, buffer, {
    contentType: 'image/png',
    cacheControl: '86400',
    upsert: true,
  });

  if (uploadError) {
    throw new Error(`Ошибка сохранения карты: ${uploadError.message}`);
  }

  const { data: urlData } = db.storage.from(NFT_STORAGE_BUCKET).getPublicUrl(storagePath);
  const imageUrl = urlData?.publicUrl || spec.promoImageUrl;

  const normalizedSuit = normalizeSuitToken(spec.suit);
  const normalizedRank = normalizeRankToken(spec.rankNormalized);
  const newBalance = (buyer.coins || 0) - spec.priceCoins;

  const { error: deductError } = await db
    .from('_pidr_users')
    .update({ coins: newBalance })
    .eq('id', userId);

  if (deductError) {
    await db.storage.from(NFT_STORAGE_BUCKET).remove([storagePath]);
    throw new Error('Ошибка списания монет');
  }

  const { data: savedCard, error: saveError } = await db
    .from(NFT_CARDS_TABLE)
    .insert({
      user_id: userId,
      suit: normalizedSuit,
      rank: normalizedRank,
      rarity: spec.themePick.theme,
      image_url: imageUrl,
      storage_path: storagePath,
      cost: spec.priceCoins,
      payment_method: 'daily_offer_premium',
      metadata: {
        daily_offer_premium: true,
        day_tag: spec.dayTag,
        theme: spec.themePick.theme,
        theme_id: spec.themePick.themeId,
        price_coins: spec.priceCoins,
        purchased_at: new Date().toISOString(),
      },
    })
    .select('id')
    .single();

  if (saveError || !savedCard) {
    await db.from('_pidr_users').update({ coins: buyer.coins }).eq('id', userId);
    await db.storage.from(NFT_STORAGE_BUCKET).remove([storagePath]);
    throw new Error('Ошибка создания NFT');
  }

  return { newBalance, cardId: savedCard.id };
}

export function offerToApiPayload(spec: PremiumDailyOfferSpec) {
  return {
    listingId: 0,
    cardTitle: spec.cardTitle,
    priceCoins: spec.priceCoins,
    discountedCoins: spec.priceCoins,
    originalCoins: spec.priceCoins,
    promoImageUrl: spec.promoImageUrl,
    theme: spec.themePick.theme,
    themeId: spec.themePick.themeId,
    themeLabel: spec.themeLabel,
    rank: spec.rankRaw,
    suit: spec.suit,
    isPremiumDaily: true,
  };
}
