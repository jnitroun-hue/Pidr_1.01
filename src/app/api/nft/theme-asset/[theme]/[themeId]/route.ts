import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { supabaseAdmin } from '@/lib/supabase';
import { downloadStorageBuffer } from '@/lib/nft/compose-theme-card';
import { NFT_STORAGE_BUCKET, POKEMON_STORAGE_BUCKET } from '@/lib/nft/constants';
import { NFT_THEME_CONFIG, THEME_ASSET_EXTS, getThemeAssetRelativePath, themeAssetFileName, type NftThemeKey } from '@/lib/nft/theme-config';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** PNG ассета темы — local / Storage / CDN (для клиентской сборки карты) */
export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ theme: string; themeId: string }> }
) {
  const { theme, themeId: themeIdRaw } = await context.params;
  const themeId = Number(themeIdRaw);

  if (!(theme in NFT_THEME_CONFIG) || !Number.isFinite(themeId) || themeId < 1) {
    return NextResponse.json({ error: 'Invalid theme' }, { status: 400 });
  }

  const pick = { theme: theme as NftThemeKey, themeId };
  const cfg = NFT_THEME_CONFIG[pick.theme];

  for (const ext of THEME_ASSET_EXTS) {
    const fileName = themeAssetFileName(pick, ext);
    const localPath = path.join(process.cwd(), 'public', cfg.folder, fileName);
    if (fs.existsSync(localPath)) {
      const buffer = fs.readFileSync(localPath);
      const contentType =
        ext === 'gif' ? 'image/gif' : ext === 'webp' ? 'image/webp' : 'image/png';
      return new NextResponse(buffer, {
        headers: {
          'Content-Type': contentType,
          'Cache-Control': 'public, max-age=86400, immutable',
        },
      });
    }
  }

  const fileName = themeAssetFileName(pick);
  const relativePath = getThemeAssetRelativePath(pick);

  const storageCandidates = [
    { bucket: NFT_STORAGE_BUCKET, path: `themes/${relativePath}` },
    { bucket: NFT_STORAGE_BUCKET, path: relativePath },
    { bucket: POKEMON_STORAGE_BUCKET, path: fileName },
    { bucket: POKEMON_STORAGE_BUCKET, path: `${themeId}.png` },
  ];

  for (const { bucket, path: objectPath } of storageCandidates) {
    const buffer = await downloadStorageBuffer(bucket, objectPath);
    if (buffer) {
      return new NextResponse(buffer, {
        headers: {
          'Content-Type': 'image/png',
          'Cache-Control': 'public, max-age=86400',
        },
      });
    }
  }

  return NextResponse.json({ error: 'Theme asset not found' }, { status: 404 });
}
