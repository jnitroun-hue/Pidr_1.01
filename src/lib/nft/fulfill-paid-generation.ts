import { supabaseAdmin } from '@/lib/supabase';
import { NFT_CARDS_TABLE, NFT_STORAGE_BUCKET } from '@/lib/nft/constants';
import { composeThemeCardBuffer } from '@/lib/nft/compose-theme-card';
import { NFT_THEME_CONFIG, isNftThemeKey, type NftThemeKey } from '@/lib/nft/theme-config';
import { normalizeRankToken, normalizeSuitToken } from '@/lib/game/cardAssets';

const SUITS = ['spades', 'hearts', 'diamonds', 'clubs'] as const;
const RANKS = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'j', 'q', 'k', 'a'] as const;

function randomPick<T>(items: readonly T[]): T {
  return items[Math.floor(Math.random() * items.length)]!;
}

function deckPairs(): Array<{ suit: string; rank: string }> {
  const pairs: Array<{ suit: string; rank: string }> = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      pairs.push({ suit, rank });
    }
  }
  for (let i = pairs.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [pairs[i], pairs[j]] = [pairs[j]!, pairs[i]!];
  }
  return pairs;
}

export async function saveGeneratedThemeCard(params: {
  userId: number;
  theme: NftThemeKey;
  suit: string;
  rank: string;
  themeId?: number;
}): Promise<{ id: number; image_url: string; rank: string; suit: string; rarity: string; metadata: Record<string, unknown> }> {
  const cfg = NFT_THEME_CONFIG[params.theme];
  const themeId = params.themeId && params.themeId >= 1
    ? ((params.themeId - 1) % cfg.total) + 1
    : Math.floor(Math.random() * cfg.total) + 1;
  const suit = normalizeSuitToken(params.suit) || 'spades';
  const rankNormalized = normalizeRankToken(params.rank) || '2';
  const buffer = await composeThemeCardBuffer({
    suit,
    rankRaw: params.rank,
    rankNormalized,
    theme: params.theme,
    themeId,
  });

  const fileName = `${params.theme}_${rankNormalized}_${suit}_${themeId}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}.png`;
  const filePath = `${params.userId}/${fileName}`;

  const { error: uploadError } = await supabaseAdmin.storage
    .from(NFT_STORAGE_BUCKET)
    .upload(filePath, buffer, { contentType: 'image/png', upsert: false });
  if (uploadError) {
    throw new Error(`Ошибка загрузки: ${uploadError.message}`);
  }

  const { data: urlData } = supabaseAdmin.storage.from(NFT_STORAGE_BUCKET).getPublicUrl(filePath);
  const imageUrl = urlData?.publicUrl;
  if (!imageUrl) throw new Error('Не удалось получить URL карты');

  const metadata = {
    theme: params.theme,
    theme_id: themeId,
    generator: 'paid_generation',
    created_at: new Date().toISOString(),
  };

  const { data: nftData, error: dbError } = await supabaseAdmin
    .from(NFT_CARDS_TABLE)
    .insert({
      user_id: params.userId,
      suit,
      rank: rankNormalized,
      rarity: params.theme,
      image_url: imageUrl,
      storage_path: filePath,
      metadata,
      created_at: new Date().toISOString(),
    })
    .select('id, image_url, rank, suit, rarity, metadata')
    .single();

  if (dbError || !nftData) {
    await supabaseAdmin.storage.from(NFT_STORAGE_BUCKET).remove([filePath]);
    throw new Error(dbError?.message || 'Ошибка сохранения карты');
  }

  return nftData;
}

export async function fulfillPaidNftGeneration(params: {
  userId: number;
  theme: string;
  count: number;
}): Promise<{ created: number; nfts: Array<{ id: number; image_url: string; rank: string; suit: string }> }> {
  if (!isNftThemeKey(params.theme)) {
    throw new Error('Неизвестная коллекция');
  }
  const count = Math.min(52, Math.max(1, Math.floor(params.count)));
  const pairs = count >= 52 ? deckPairs() : Array.from({ length: count }, () => ({
    suit: randomPick(SUITS),
    rank: randomPick(RANKS),
  }));

  const nfts: Array<{ id: number; image_url: string; rank: string; suit: string }> = [];
  for (const pair of pairs) {
    const nft = await saveGeneratedThemeCard({
      userId: params.userId,
      theme: params.theme,
      suit: pair.suit,
      rank: pair.rank,
    });
    nfts.push({
      id: nft.id,
      image_url: nft.image_url,
      rank: String(nft.rank),
      suit: String(nft.suit),
    });
  }

  return { created: nfts.length, nfts };
}
