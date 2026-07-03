/**
 * Серверная сборка NFT-карты через @napi-rs/canvas (ранг/масть без шрифтов SVG).
 */
import { createCanvas, loadImage } from '@napi-rs/canvas';
import { CARD_FACE, drawCardFaceCanvas, type CardFaceSpec } from '@/lib/nft/card-face-builder';

export async function composeCardBufferServer(
  spec: CardFaceSpec,
  themeImageBuffer?: Buffer | null
): Promise<Buffer> {
  const canvas = createCanvas(CARD_FACE.width, CARD_FACE.height);
  const ctx = canvas.getContext('2d');

  let themeImage: Awaited<ReturnType<typeof loadImage>> | null = null;
  if (themeImageBuffer && themeImageBuffer.length > 100) {
    try {
      themeImage = await loadImage(themeImageBuffer);
    } catch {
      themeImage = null;
    }
  }

  drawCardFaceCanvas(
    ctx as unknown as CanvasRenderingContext2D,
    spec,
    themeImage as unknown as CanvasImageSource | null
  );
  return canvas.toBuffer('image/png');
}
