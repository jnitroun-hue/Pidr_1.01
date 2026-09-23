import { supabaseAdmin } from '@/lib/supabase';
import { NFT_CARDS_TABLE } from '@/lib/nft/constants';
import { uploadPremiumFreeThemedCardToBucket, removePremiumFreeCardFromBucket } from '@/lib/premium/premium-free-storage';
import { normalizeRankToken, normalizeSuitToken } from '@/lib/game/cardAssets';

function normalizeRank(rank: string): string {
  const r = rank.toUpperCase();
  if (r === 'J') return 'jack';
  if (r === 'Q') return 'queen';
  if (r === 'K') return 'king';
  if (r === 'A') return 'ace';
  return rank.toLowerCase();
}

export interface PromoMintedCard {
  id: number;
  rank: string;
  suit: string;
  rarity: string;
  image_url: string;
  theme?: string;
  theme_id?: number;
}

/** Случайная тематическая NFT без списания монет. Вызывается один раз на грант промокода. */
export async function mintPromoFreeNft(userId: number): Promise<PromoMintedCard> {
  const suits = ['hearts', 'diamonds', 'clubs', 'spades'] as const;
  const ranks = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
  const suit = suits[Math.floor(Math.random() * suits.length)];
  const rankRaw = ranks[Math.floor(Math.random() * ranks.length)];
  const rank = normalizeRank(rankRaw);

  const uploaded = await uploadPremiumFreeThemedCardToBucket({
    userId,
    suit,
    rankRaw,
    rankNormalized: rank,
  });

  const { data: savedCard, error } = await supabaseAdmin
    .from(NFT_CARDS_TABLE)
    .insert({
      user_id: userId,
      suit,
      rank,
      rarity: uploaded.themePick.theme,
      image_url: uploaded.publicUrl,
      storage_path: uploaded.storagePath,
      cost: 0,
      payment_method: 'promo_free',
      metadata: {
        mint_type: 'promo_free',
        generated_at: new Date().toISOString(),
        promo_free_storage_path: uploaded.storagePath,
        theme: uploaded.themePick.theme,
        theme_id: uploaded.themePick.themeId,
        fallback_face: `/img/cards/${normalizeRankToken(rank)}_of_${normalizeSuitToken(suit)}.png`,
      },
    })
    .select('id, rank, suit, rarity, image_url')
    .single();

  if (error || !savedCard) {
    await removePremiumFreeCardFromBucket(uploaded.storagePath);
    throw new Error(error?.message || 'Не удалось сохранить NFT');
  }

  return {
    id: savedCard.id,
    rank: savedCard.rank,
    suit: savedCard.suit,
    rarity: savedCard.rarity,
    image_url: savedCard.image_url,
    theme: uploaded.themePick.theme,
    theme_id: uploaded.themePick.themeId,
  };
}
