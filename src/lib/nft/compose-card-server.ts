/**
 * Серверная сборка NFT-карты через sharp + SVG (без @napi-rs/canvas / Path2D).
 */
import sharp from 'sharp';
import { CARD_FACE, buildCardFaceSvg, type CardFaceSpec } from '@/lib/nft/card-face-builder';

export async function composeCardBufferServer(
  spec: CardFaceSpec,
  themeImageBuffer?: Buffer | null
): Promise<Buffer> {
  const svgBuffer = Buffer.from(buildCardFaceSvg(spec));
  const baseBuffer = await sharp(svgBuffer).png().toBuffer();

  if (!themeImageBuffer || themeImageBuffer.length <= 100) {
    return baseBuffer;
  }

  const { art } = CARD_FACE;
  const themeMeta = await sharp(themeImageBuffer).metadata();
  const tw = themeMeta.width || art.size;
  const th = themeMeta.height || art.size;
  const scale = Math.min(art.size / tw, art.size / th);
  const drawW = Math.max(1, Math.round(tw * scale));
  const drawH = Math.max(1, Math.round(th * scale));
  const drawX = art.left + Math.round((art.size - drawW) / 2);
  const drawY = art.top + Math.round((art.size - drawH) / 2);

  const resizedTheme = await sharp(themeImageBuffer)
    .resize(drawW, drawH, { fit: 'inside' })
    .png()
    .toBuffer();

  return sharp(baseBuffer)
    .composite([{ input: resizedTheme, top: drawY, left: drawX }])
    .png()
    .toBuffer();
}
