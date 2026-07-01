/**
 * Серверная сборка NFT-карты — тот же canvas API, что и в generate-theme-card-client.
 * sharp/librsvg ломает SVG-текст (крошечные ранги, жёлтая полоса бейджа).
 */
import { createCanvas, loadImage } from '@napi-rs/canvas';
import { CARD_FACE, drawCardFaceCanvas, type CardFaceSpec } from '@/lib/nft/card-face-builder';

export async function composeCardBufferServer(
  spec: CardFaceSpec,
  themeImageBuffer?: Buffer | null
): Promise<Buffer> {
  const canvas = createCanvas(CARD_FACE.width, CARD_FACE.height);
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Canvas 2D context unavailable');
  }

  let themeImg: Awaited<ReturnType<typeof loadImage>> | null = null;
  if (themeImageBuffer && themeImageBuffer.length > 100) {
    themeImg = await loadImage(themeImageBuffer);
  }

  drawCardFaceCanvas(ctx as unknown as CanvasRenderingContext2D, spec, themeImg as unknown as CanvasImageSource);
  return canvas.toBuffer('image/png');
}
