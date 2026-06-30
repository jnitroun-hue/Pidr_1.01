import type { SupabaseClient } from '@supabase/supabase-js';
import {
  buildNftDeckKey,
  normalizeRankToken,
  normalizeSuitToken,
} from '@/lib/game/cardAssets';
import { USER_NFT_DECK_TABLE } from '@/lib/nft/constants';

export type DeckSlotRow = {
  id: number;
  user_id: number;
  nft_card_id: number;
  suit?: string | null;
  rank?: string | number | null;
  image_url?: string | null;
  created_at?: string;
  nft_card?: {
    id: number;
    suit?: string | null;
    rank?: string | number | null;
    image_url?: string | null;
    rarity?: string | null;
    metadata?: unknown;
  } | null;
};

/** Все возможные user_id в колоде (db id + legacy telegram_id) */
export function deckOwnerIds(dbUserId: number, telegramId?: string | number | null): number[] {
  const ids = new Set<number>([dbUserId]);
  if (telegramId != null && String(telegramId).trim() !== '') {
    const tg = parseInt(String(telegramId), 10);
    if (!Number.isNaN(tg)) ids.add(tg);
  }
  return [...ids];
}

export function deckSlotKey(rank?: string | number | null, suit?: string | null): string {
  return buildNftDeckKey(rank ?? '', suit ?? '');
}

export async function fetchUserDeckRows(
  supabase: SupabaseClient,
  ownerIds: number[]
): Promise<DeckSlotRow[]> {
  if (ownerIds.length === 0) return [];

  const { data, error } = await supabase
    .from(USER_NFT_DECK_TABLE)
    .select(`
      id,
      user_id,
      nft_card_id,
      suit,
      rank,
      image_url,
      created_at,
      nft_card:_pidr_nft_cards!nft_card_id(
        id,
        suit,
        rank,
        image_url,
        rarity,
        metadata
      )
    `)
    .in('user_id', ownerIds)
    .order('created_at', { ascending: false });

  if (error) {
    console.warn('⚠️ [deck-slots] fetchUserDeckRows:', error.message);
    return [];
  }

  return (data || []).map((row) => {
    const rawNft = row.nft_card;
    const nft_card = Array.isArray(rawNft) ? rawNft[0] : rawNft;
    return { ...row, nft_card } as DeckSlotRow;
  });
}

/** Найти слот колоды с тем же рангом+мастью (нормализованно) */
export function findDeckSlotByRankSuit(
  deckRows: DeckSlotRow[],
  rank: string | number,
  suit: string
): DeckSlotRow | null {
  const targetKey = deckSlotKey(rank, suit);
  if (!targetKey) return null;

  for (const row of deckRows) {
    const rowRank = row.nft_card?.rank ?? row.rank;
    const rowSuit = row.nft_card?.suit ?? row.suit;
    if (deckSlotKey(rowRank, rowSuit ?? '') === targetKey) {
      return row;
    }
  }
  return null;
}

export function formatDuplicateDeckResponse(
  existing: DeckSlotRow,
  newCard: { id: number | string; image_url?: string | null; rank: string; suit: string }
) {
  const existingInfo = existing.nft_card;
  return {
    success: false as const,
    error: 'DUPLICATE_CARD',
    message: `У вас уже есть карта ${newCard.rank} ${newCard.suit} в колоде`,
    existingCard: {
      id: existing.id,
      nft_card_id: existing.nft_card_id,
      image_url: existing.image_url || existingInfo?.image_url,
      rarity: existingInfo?.rarity,
    },
    newCard: {
      id: newCard.id,
      image_url: newCard.image_url,
      suit: newCard.suit,
      rank: newCard.rank,
    },
  };
}

export function isUniqueViolation(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false;
  return error.code === '23505' || (error.message || '').toLowerCase().includes('duplicate');
}
