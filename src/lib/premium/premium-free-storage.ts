import { supabaseAdmin } from '@/lib/supabase';
import { NFT_STORAGE_BUCKET } from '@/lib/nft/constants';
import { getPayoutWeekKey } from '@/lib/rating/weekly-prizes';

/** Корневая папка бесплатных Premium-генераций в бакете nft-card */
export const PREMIUM_FREE_STORAGE_PREFIX = 'premium-free';

export function buildPremiumFreeStoragePath(params: {
  userId: number;
  suit: string;
  rank: string;
  weekKey?: string;
}): string {
  const weekKey = params.weekKey ?? getPayoutWeekKey();
  const safeRank = params.rank.replace(/[^a-z0-9]/gi, '_').toLowerCase();
  const safeSuit = params.suit.replace(/[^a-z0-9]/gi, '_').toLowerCase();
  return `${PREMIUM_FREE_STORAGE_PREFIX}/${params.userId}/${weekKey}/${safeSuit}_${safeRank}_${Date.now()}.png`;
}

function baseCardCandidates(suit: string, rankRaw: string, rankNormalized: string): string[] {
  const raw = rankRaw === '10' ? '10' : rankRaw;
  const upper = raw.toUpperCase();
  const lower = raw.toLowerCase();
  return [
    `base-cards/${suit}/${raw}.png`,
    `base-cards/${suit}/${upper}.png`,
    `base-cards/${suit}/${lower}.png`,
    `base-cards/${suit}/${rankNormalized}.png`,
  ];
}

async function downloadBaseCardBuffer(suit: string, rankRaw: string, rankNormalized: string): Promise<Buffer | null> {
  const tried = new Set<string>();
  for (const path of baseCardCandidates(suit, rankRaw, rankNormalized)) {
    if (tried.has(path)) continue;
    tried.add(path);

    const { data, error } = await supabaseAdmin.storage.from(NFT_STORAGE_BUCKET).download(path);
    if (error || !data) continue;

    return Buffer.from(await data.arrayBuffer());
  }
  return null;
}

export async function uploadPremiumFreeCardToBucket(params: {
  userId: number;
  suit: string;
  rankRaw: string;
  rankNormalized: string;
  weekKey?: string;
}): Promise<{ storagePath: string; publicUrl: string }> {
  const buffer = await downloadBaseCardBuffer(params.suit, params.rankRaw, params.rankNormalized);
  if (!buffer?.length) {
    throw new Error(
      `Базовая карта не найдена в бакете (base-cards/${params.suit}/…). Запустите прегенерацию базовых карт.`
    );
  }

  const storagePath = buildPremiumFreeStoragePath({
    userId: params.userId,
    suit: params.suit,
    rank: params.rankNormalized,
    weekKey: params.weekKey,
  });

  const { error: uploadError } = await supabaseAdmin.storage.from(NFT_STORAGE_BUCKET).upload(storagePath, buffer, {
    contentType: 'image/png',
    cacheControl: '3600',
    upsert: false,
  });

  if (uploadError) {
    throw new Error(`Не удалось сохранить Premium free roll в Storage: ${uploadError.message}`);
  }

  const { data: urlData } = supabaseAdmin.storage.from(NFT_STORAGE_BUCKET).getPublicUrl(storagePath);
  if (!urlData?.publicUrl) {
    await supabaseAdmin.storage.from(NFT_STORAGE_BUCKET).remove([storagePath]);
    throw new Error('Не удалось получить публичный URL для Premium free roll');
  }

  return { storagePath, publicUrl: urlData.publicUrl };
}

export async function removePremiumFreeCardFromBucket(storagePath: string | null | undefined): Promise<void> {
  if (!storagePath) return;
  const normalized = storagePath.startsWith(`${NFT_STORAGE_BUCKET}/`)
    ? storagePath.slice(NFT_STORAGE_BUCKET.length + 1)
    : storagePath;
  await supabaseAdmin.storage.from(NFT_STORAGE_BUCKET).remove([normalized]);
}
