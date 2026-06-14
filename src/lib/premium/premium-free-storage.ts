import { supabaseAdmin } from '@/lib/supabase';
import { NFT_STORAGE_BUCKET } from '@/lib/nft/constants';
import { getPayoutWeekKey } from '@/lib/rating/weekly-prizes';
import { resolveBaseCardBuffer } from '@/lib/nft/base-card-image';

/** Корневая папка бесплатных Premium-генераций в бакете nft-card */
export const PREMIUM_FREE_STORAGE_PREFIX = 'premium-free';

export function buildPremiumFreeStoragePath(params: {
  userId: number;
  suit: string;
  rank: string;
  weekKey?: string;
  ext?: 'png' | 'svg';
}): string {
  const weekKey = params.weekKey ?? getPayoutWeekKey();
  const safeRank = params.rank.replace(/[^a-z0-9]/gi, '_').toLowerCase();
  const safeSuit = params.suit.replace(/[^a-z0-9]/gi, '_').toLowerCase();
  const ext = params.ext ?? 'png';
  return `${PREMIUM_FREE_STORAGE_PREFIX}/${params.userId}/${weekKey}/${safeSuit}_${safeRank}_${Date.now()}.${ext}`;
}

export async function uploadPremiumFreeCardToBucket(params: {
  userId: number;
  suit: string;
  rankRaw: string;
  rankNormalized: string;
  weekKey?: string;
  rarity?: string;
}): Promise<{ storagePath: string; publicUrl: string; imageSource: string }> {
  const { buffer, contentType, source } = await resolveBaseCardBuffer({
    suit: params.suit,
    rankRaw: params.rankRaw,
    rankNormalized: params.rankNormalized,
    rarity: params.rarity,
  });

  if (source === 'generated') {
    console.warn(
      `⚠️ [premium-free] Базовая карта не в бакете — сгенерирован SVG fallback (${params.rankRaw} ${params.suit})`
    );
  }

  const ext = contentType.includes('svg') ? 'svg' : 'png';
  const storagePath = buildPremiumFreeStoragePath({
    userId: params.userId,
    suit: params.suit,
    rank: params.rankNormalized,
    weekKey: params.weekKey,
    ext,
  });

  const { error: uploadError } = await supabaseAdmin.storage.from(NFT_STORAGE_BUCKET).upload(storagePath, buffer, {
    contentType,
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

  return { storagePath, publicUrl: urlData.publicUrl, imageSource: source };
}

export async function removePremiumFreeCardFromBucket(storagePath: string | null | undefined): Promise<void> {
  if (!storagePath) return;
  const normalized = storagePath.startsWith(`${NFT_STORAGE_BUCKET}/`)
    ? storagePath.slice(NFT_STORAGE_BUCKET.length + 1)
    : storagePath;
  await supabaseAdmin.storage.from(NFT_STORAGE_BUCKET).remove([normalized]);
}
