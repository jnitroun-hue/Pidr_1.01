import { supabaseAdmin } from '@/lib/supabase';
import { NFT_STORAGE_BUCKET } from '@/lib/nft/constants';
import { getPayoutWeekKey } from '@/lib/rating/weekly-prizes';
import { composeRandomThemedCardBuffer } from '@/lib/nft/compose-theme-card';
import type { ThemeAssetPick } from '@/lib/nft/theme-config';

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

/** Premium free roll: случайная картинка из ВСЕХ тем + сохранение в premium-free/ */
export async function uploadPremiumFreeThemedCardToBucket(params: {
  userId: number;
  suit: string;
  rankRaw: string;
  rankNormalized: string;
  weekKey?: string;
}): Promise<{
  storagePath: string;
  publicUrl: string;
  themePick: ThemeAssetPick;
}> {
  const { buffer, pick } = await composeRandomThemedCardBuffer({
    suit: params.suit,
    rankRaw: params.rankRaw,
    rankNormalized: params.rankNormalized,
  });

  const storagePath = buildPremiumFreeStoragePath({
    userId: params.userId,
    suit: params.suit,
    rank: params.rankNormalized,
    weekKey: params.weekKey,
    ext: 'png',
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

  return { storagePath, publicUrl: urlData.publicUrl, themePick: pick };
}

export async function removePremiumFreeCardFromBucket(storagePath: string | null | undefined): Promise<void> {
  if (!storagePath) return;
  const normalized = storagePath.startsWith(`${NFT_STORAGE_BUCKET}/`)
    ? storagePath.slice(NFT_STORAGE_BUCKET.length + 1)
    : storagePath;
  await supabaseAdmin.storage.from(NFT_STORAGE_BUCKET).remove([normalized]);
}
