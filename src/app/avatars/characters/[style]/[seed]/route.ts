import { NextRequest, NextResponse } from 'next/server';
import {
  buildCharacterAvatarDataUrl,
  isCharacterAvatarStyle,
} from '@/lib/avatars/character-avatars';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /avatars/characters/{style}/{seed}.svg
 * Offline-friendly SVG из DiceBear (без внешних CDN).
 */
export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ style: string; seed: string }> }
) {
  const { style, seed: seedRaw } = await context.params;
  if (!isCharacterAvatarStyle(style)) {
    return new NextResponse('Unknown style', { status: 404 });
  }

  const seed = decodeURIComponent(seedRaw || '').replace(/\.svg$/i, '').trim();
  if (!seed || seed.length > 80) {
    return new NextResponse('Invalid seed', { status: 400 });
  }

  const dataUrl = buildCharacterAvatarDataUrl(style, seed);
  const comma = dataUrl.indexOf(',');
  const encoded = comma >= 0 ? dataUrl.slice(comma + 1) : '';
  const svg = decodeURIComponent(encoded);

  return new NextResponse(svg, {
    status: 200,
    headers: {
      'Content-Type': 'image/svg+xml; charset=utf-8',
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  });
}
