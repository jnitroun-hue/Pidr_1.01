import { NFT_THEME_CONFIG, getThemeAssetPublicPath, getThemeAssetRelativePath, type NftThemeKey } from '@/lib/nft/theme-config';
import { NFT_STORAGE_BUCKET, POKEMON_STORAGE_BUCKET } from '@/lib/nft/constants';

/** Публичные URL ассета темы — public, Supabase, API-прокси */
export function getThemeAssetCandidateUrls(theme: NftThemeKey, themeId: number): string[] {
  const cfg = NFT_THEME_CONFIG[theme];
  const relative = getThemeAssetRelativePath({ theme, themeId });
  const fileName = `${cfg.prefix}${themeId}.png`;
  const urls: string[] = [getThemeAssetPublicPath({ theme, themeId })];

  const supabaseBase = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, '');
  if (supabaseBase) {
    urls.push(
      `${supabaseBase}/storage/v1/object/public/${NFT_STORAGE_BUCKET}/themes/${relative}`,
      `${supabaseBase}/storage/v1/object/public/${NFT_STORAGE_BUCKET}/${relative}`,
      `${supabaseBase}/storage/v1/object/public/${POKEMON_STORAGE_BUCKET}/${fileName}`,
      `${supabaseBase}/storage/v1/object/public/${POKEMON_STORAGE_BUCKET}/${themeId}.png`
    );
  }

  urls.push(`/api/nft/theme-asset/${theme}/${themeId}`);
  return [...new Set(urls)];
}
