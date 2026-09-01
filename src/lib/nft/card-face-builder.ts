/**
 * Единая сборка лицевой стороны NFT-карты (сервер + клиент).
 * Классическая игральная карта: слоновая кость, двойная рамка, индекс без квадратов,
 * иллюстрация в золотом окне. Один шаблон для генерации, магазина и колоды.
 */

import { normalizeRankToken, normalizeSuitToken } from '@/lib/game/cardAssets';

export const CARD_FACE = {
  width: 300,
  height: 420,
  radius: 18,
  outerPad: 7,
  innerPad: 12,
  cornerMargin: 16,
  rankFontSize: 34,
  suitIconSize: 22,
  art: { top: 62, left: 48, width: 204, height: 292 },
  caption: { bottom: 16, height: 14 },
} as const;

export type CardFaceSpec = {
  suit: string;
  rankRaw: string;
  rankNormalized: string;
  themeLabel?: string;
};

export function displayRank(rankRaw: string, rankNormalized: string): string {
  if (rankRaw === '10' || rankNormalized === '10') return '10';

  const map: Record<string, string> = {
    jack: 'J',
    queen: 'Q',
    king: 'K',
    ace: 'A',
    j: 'J',
    q: 'Q',
    k: 'K',
    a: 'A',
  };

  const fromNorm = map[String(rankNormalized).toLowerCase()];
  if (fromNorm) return fromNorm;

  const fromRaw = map[String(rankRaw).toLowerCase()];
  if (fromRaw) return fromRaw;

  const num = parseInt(String(rankRaw), 10);
  if (!Number.isNaN(num) && num >= 2 && num <= 9) return String(num);

  return String(rankRaw).toUpperCase();
}

function resolveSuitKey(suit: string): keyof typeof SUIT_PATHS {
  const normalized = normalizeSuitToken(suit) || suit.toLowerCase();
  if (normalized in SUIT_PATHS) return normalized as keyof typeof SUIT_PATHS;
  return 'spades';
}

export function suitColor(suit: string): string {
  return suit === 'hearts' || suit === 'diamonds' ? '#b42318' : '#141414';
}

type ThemePalette = {
  stockTop: string;
  stockBottom: string;
  frame: string;
  gold: string;
  artTop: string;
  artBottom: string;
  artAccent: string;
  caption: string;
};

function themePalette(themeLabel?: string): ThemePalette {
  const label = String(themeLabel || '').toLowerCase();
  if (label.includes('уникал') || label.includes('unique')) {
    return {
      stockTop: '#f8fafc',
      stockBottom: '#e0e7ff',
      frame: '#1e1b4b',
      gold: '#e879f9',
      artTop: '#2e1065',
      artBottom: '#0f172a',
      artAccent: '#22d3ee',
      caption: '#5b21b6',
    };
  }
  if (label.includes('легендар') || label.includes('legendary')) {
    return {
      stockTop: '#fffaf0',
      stockBottom: '#f3e6c8',
      frame: '#3f2a0a',
      gold: '#d4af37',
      artTop: '#3b1d08',
      artBottom: '#120801',
      artAccent: '#f5d76e',
      caption: '#8a5a12',
    };
  }
  if (label.includes('хеллоу') || label.includes('halloween')) {
    return {
      stockTop: '#fff8f1',
      stockBottom: '#f4e4d4',
      frame: '#2b1238',
      gold: '#e8943a',
      artTop: '#2a1038',
      artBottom: '#12081c',
      artAccent: '#fb923c',
      caption: '#9a3412',
    };
  }
  if (label.includes('звезд') || label.includes('star')) {
    return {
      stockTop: '#f5f8ff',
      stockBottom: '#e4ebf6',
      frame: '#0b1b33',
      gold: '#7dd3fc',
      artTop: '#071426',
      artBottom: '#020617',
      artAccent: '#60a5fa',
      caption: '#1e3a5f',
    };
  }
  if (label.includes('покемон') || label.includes('pokemon')) {
    return {
      stockTop: '#fffdf6',
      stockBottom: '#f4ead3',
      frame: '#1e3a5f',
      gold: '#e8b923',
      artTop: '#163a63',
      artBottom: '#0b1f38',
      artAccent: '#facc15',
      caption: '#7c4a12',
    };
  }
  return {
    stockTop: '#fffdf8',
    stockBottom: '#f0e6d4',
    frame: '#1a1a1a',
    gold: '#c4a574',
    artTop: '#1e293b',
    artBottom: '#0f172a',
    artAccent: '#e2e8f0',
    caption: '#6b4f2a',
  };
}

/** Path data in 24×24 viewBox — масштабируется без шрифтов */
const SUIT_PATHS: Record<string, string> = {
  hearts:
    'M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z',
  diamonds: 'M12 2l9.5 10L12 22 2.5 12z',
  clubs:
    'M12 2.5c-1.1 0-2 .7-2.3 1.7-.4-1.2-1.6-2-2.9-1.5-1.5.8-1.9 2.7-.9 4.1.1.1.2.2.3.3-1.2.8-1.6 2.4-.9 3.7.6 1.1 1.9 1.7 3.1 1.4-.1 1.4 1 2.6 2.4 2.8 1.4.2 2.6-.8 3-2.1.4 1.3 1.6 2.3 3 2.1 1.4-.2 2.5-1.4 2.4-2.8 1.2.3 2.5-.3 3.1-1.4.7-1.3.3-2.9-.9-3.7.1-.1.2-.2.3-.3 1-1.4.6-3.3-.9-4.1-1.3-.5-2.5.3-2.9 1.5-.3-1-1.2-1.7-2.3-1.7zm-1 17.5v3.5h2v-3.5h-2z',
  spades:
    'M12 2C8.5 2 5.5 5 5.5 8.5c0 2.2 1.2 4.1 3 5.2-1.2.9-2 2.4-2 4.1 0 2.8 2.2 5 5 5.2.5 0 1-.1 1.4-.3.4.2.9.3 1.4.3 2.8-.2 5-2.4 5-5.2 0-1.7-.8-3.2-2-4.1 1.8-1.1 3-3 3-5.2C18.5 5 15.5 2 12 2zm-1.2 18.5h2.4v3.5h-2.4v-3.5z',
};

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function suitPathSvg(suit: string, x: number, y: number, size: number, color: string): string {
  const path = SUIT_PATHS[suit] ?? SUIT_PATHS.spades;
  const scale = size / 24;
  return `<g transform="translate(${x},${y}) scale(${scale})"><path d="${path}" fill="${color}"/></g>`;
}

function roundedRectSvg(x: number, y: number, w: number, h: number, r: number, extra: string): string {
  return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" ${extra}/>`;
}

/** SVG-основа карты: рамка, углы без квадратов, окно арта, подпись темы */
export function buildCardFaceSvg(spec: CardFaceSpec): string {
  const rank = displayRank(spec.rankRaw, spec.rankNormalized);
  const color = suitColor(spec.suit);
  const suit = resolveSuitKey(spec.suit);
  const { width, height, radius, outerPad, innerPad, cornerMargin, art, caption } = CARD_FACE;
  const palette = themePalette(spec.themeLabel);
  const themeLabel = spec.themeLabel ? escapeXml(spec.themeLabel.toUpperCase()) : '';
  const rankSize = rank === '10' ? 26 : CARD_FACE.rankFontSize;
  const indexWidth = 36;

  const fallbackArtwork = `
      <defs>
        <linearGradient id="artGlow" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="${palette.artTop}"/>
          <stop offset="100%" stop-color="${palette.artBottom}"/>
        </linearGradient>
        <radialGradient id="artSpot" cx="50%" cy="42%" r="55%">
          <stop offset="0%" stop-color="${palette.artAccent}" stop-opacity="0.28"/>
          <stop offset="100%" stop-color="${palette.artAccent}" stop-opacity="0"/>
        </radialGradient>
      </defs>
      ${roundedRectSvg(art.left, art.top, art.width, art.height, 10, `fill="url(#artGlow)"`)}
      ${roundedRectSvg(art.left, art.top, art.width, art.height, 10, `fill="url(#artSpot)"`)}
      ${suitPathSvg(suit, art.left + art.width / 2 - 48, art.top + art.height / 2 - 48, 96, palette.artAccent)}
    `;

  const captionBlock = themeLabel
    ? `<text x="${width / 2}" y="${height - caption.bottom}" font-family="Georgia, 'Times New Roman', serif" font-size="9" font-weight="700" fill="${palette.caption}" text-anchor="middle" letter-spacing="2.4">${themeLabel}</text>`
    : '';

  return `
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="stock" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="${palette.stockTop}"/>
          <stop offset="100%" stop-color="${palette.stockBottom}"/>
        </linearGradient>
      </defs>
      ${roundedRectSvg(0, 0, width, height, radius, `fill="url(#stock)"`)}
      ${roundedRectSvg(outerPad, outerPad, width - outerPad * 2, height - outerPad * 2, 14, `fill="none" stroke="${palette.frame}" stroke-width="2.4"`)}
      ${roundedRectSvg(innerPad, innerPad, width - innerPad * 2, height - innerPad * 2, 11, `fill="none" stroke="${palette.gold}" stroke-width="1.2"`)}
      ${fallbackArtwork}
      ${roundedRectSvg(art.left - 1, art.top - 1, art.width + 2, art.height + 2, 11, `fill="none" stroke="${palette.gold}" stroke-width="1.6"`)}
      <g transform="translate(${cornerMargin},${cornerMargin + 4})">
        <text x="${indexWidth / 2}" y="${rankSize}" font-family="Georgia, 'Times New Roman', serif" font-size="${rankSize}" font-weight="700" fill="${color}" text-anchor="middle">${escapeXml(rank)}</text>
        ${suitPathSvg(suit, (indexWidth - CARD_FACE.suitIconSize) / 2, rankSize + 6, CARD_FACE.suitIconSize, color)}
      </g>
      <g transform="translate(${width - cornerMargin - indexWidth},${height - cornerMargin - rankSize - CARD_FACE.suitIconSize - 18})">
        <text x="${indexWidth / 2}" y="${rankSize}" font-family="Georgia, 'Times New Roman', serif" font-size="${rankSize}" font-weight="700" fill="${color}" text-anchor="middle">${escapeXml(rank)}</text>
        ${suitPathSvg(suit, (indexWidth - CARD_FACE.suitIconSize) / 2, rankSize + 6, CARD_FACE.suitIconSize, color)}
      </g>
      ${captionBlock}
    </svg>`;
}

function roundedRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

function fillRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  roundedRectPath(ctx, x, y, w, h, r);
  ctx.fill();
}

function strokeRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  roundedRectPath(ctx, x, y, w, h, r);
  ctx.stroke();
}

function drawImageContained(
  ctx: CanvasRenderingContext2D,
  img: CanvasImageSource,
  x: number,
  y: number,
  w: number,
  h: number,
  pad = 10
) {
  const iw = Number((img as HTMLImageElement).width || (img as { width?: number }).width || w);
  const ih = Number((img as HTMLImageElement).height || (img as { height?: number }).height || h);
  if (!iw || !ih) return;
  const innerW = Math.max(1, w - pad * 2);
  const innerH = Math.max(1, h - pad * 2);
  const scale = Math.min(innerW / iw, innerH / ih);
  const dw = iw * scale;
  const dh = ih * scale;
  ctx.drawImage(img, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh);
}

/** Canvas: масть примитивами (Path2D ломается в Telegram WebView) */
export function drawSuitIconCanvas(
  ctx: CanvasRenderingContext2D,
  suit: string,
  x: number,
  y: number,
  size: number,
  color: string
) {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = color;

  const cx = size / 2;
  const cy = size / 2;

  switch (suit) {
    case 'hearts': {
      ctx.beginPath();
      ctx.moveTo(cx, size * 0.34);
      ctx.bezierCurveTo(cx - size * 0.42, size * 0.02, cx - size * 0.52, size * 0.46, cx, size * 0.92);
      ctx.bezierCurveTo(cx + size * 0.52, size * 0.46, cx + size * 0.42, size * 0.02, cx, size * 0.34);
      ctx.closePath();
      ctx.fill();
      break;
    }
    case 'diamonds': {
      ctx.beginPath();
      ctx.moveTo(cx, size * 0.04);
      ctx.lineTo(size * 0.92, cy);
      ctx.lineTo(cx, size * 0.96);
      ctx.lineTo(size * 0.08, cy);
      ctx.closePath();
      ctx.fill();
      break;
    }
    case 'clubs': {
      const r = size * 0.2;
      const circle = (ox: number, oy: number) => {
        ctx.beginPath();
        ctx.arc(ox, oy, r, 0, Math.PI * 2);
        ctx.fill();
      };
      circle(cx, size * 0.3);
      circle(cx - size * 0.24, size * 0.52);
      circle(cx + size * 0.24, size * 0.52);
      ctx.beginPath();
      ctx.moveTo(cx - size * 0.07, size * 0.54);
      ctx.lineTo(cx + size * 0.07, size * 0.54);
      ctx.lineTo(cx + size * 0.12, size * 0.96);
      ctx.lineTo(cx - size * 0.12, size * 0.96);
      ctx.closePath();
      ctx.fill();
      break;
    }
    case 'spades':
    default: {
      ctx.beginPath();
      ctx.moveTo(cx, size * 0.04);
      ctx.bezierCurveTo(cx - size * 0.5, size * 0.4, cx - size * 0.42, size * 0.68, cx, size * 0.7);
      ctx.bezierCurveTo(cx + size * 0.42, size * 0.68, cx + size * 0.5, size * 0.4, cx, size * 0.04);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(cx - size * 0.07, size * 0.62);
      ctx.lineTo(cx + size * 0.07, size * 0.62);
      ctx.lineTo(cx + size * 0.13, size * 0.98);
      ctx.lineTo(cx - size * 0.13, size * 0.98);
      ctx.closePath();
      ctx.fill();
      break;
    }
  }

  ctx.restore();
}

function drawClassicIndex(
  ctx: CanvasRenderingContext2D,
  rank: string,
  suit: string,
  color: string,
  originX: number,
  originY: number
) {
  const rankSize = rank === '10' ? 26 : CARD_FACE.rankFontSize;
  const indexWidth = 36;
  ctx.save();
  ctx.translate(originX, originY);
  ctx.fillStyle = color;
  ctx.font = `700 ${rankSize}px Georgia, "Times New Roman", serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.shadowColor = 'rgba(255,248,240,0.9)';
  ctx.shadowBlur = 3;
  ctx.fillText(rank, indexWidth / 2, rankSize);
  ctx.shadowBlur = 0;
  drawSuitIconCanvas(
    ctx,
    suit,
    (indexWidth - CARD_FACE.suitIconSize) / 2,
    rankSize + 4,
    CARD_FACE.suitIconSize,
    color
  );
  ctx.restore();
}

export function drawCardFaceCanvas(
  ctx: CanvasRenderingContext2D,
  spec: CardFaceSpec,
  themeImage?: CanvasImageSource | null
) {
  const { width, height, radius, outerPad, innerPad, cornerMargin, art, caption } = CARD_FACE;
  const rankNorm = normalizeRankToken(spec.rankNormalized || spec.rankRaw) || spec.rankNormalized;
  const rank = displayRank(spec.rankRaw, rankNorm);
  const color = suitColor(resolveSuitKey(spec.suit));
  const suit = resolveSuitKey(spec.suit);
  const palette = themePalette(spec.themeLabel);

  ctx.clearRect(0, 0, width, height);

  const stock = ctx.createLinearGradient(0, 0, 0, height);
  stock.addColorStop(0, palette.stockTop);
  stock.addColorStop(1, palette.stockBottom);
  ctx.fillStyle = stock;
  fillRoundedRect(ctx, 0, 0, width, height, radius);

  ctx.strokeStyle = palette.frame;
  ctx.lineWidth = 2.4;
  strokeRoundedRect(ctx, outerPad, outerPad, width - outerPad * 2, height - outerPad * 2, 14);

  ctx.strokeStyle = palette.gold;
  ctx.lineWidth = 1.2;
  strokeRoundedRect(ctx, innerPad, innerPad, width - innerPad * 2, height - innerPad * 2, 11);

  ctx.save();
  roundedRectPath(ctx, art.left, art.top, art.width, art.height, 10);
  ctx.clip();

  const artBg = ctx.createLinearGradient(art.left, art.top, art.left, art.top + art.height);
  artBg.addColorStop(0, palette.artTop);
  artBg.addColorStop(1, palette.artBottom);
  ctx.fillStyle = artBg;
  ctx.fillRect(art.left, art.top, art.width, art.height);

  const spot = ctx.createRadialGradient(
    art.left + art.width / 2,
    art.top + art.height * 0.4,
    12,
    art.left + art.width / 2,
    art.top + art.height * 0.45,
    art.width * 0.62
  );
  spot.addColorStop(0, palette.artAccent);
  spot.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.globalAlpha = 0.22;
  ctx.fillStyle = spot;
  ctx.fillRect(art.left, art.top, art.width, art.height);
  ctx.globalAlpha = 1;

  if (themeImage) {
    drawImageContained(ctx, themeImage, art.left, art.top, art.width, art.height, 8);
  } else {
    drawSuitIconCanvas(
      ctx,
      suit,
      art.left + art.width / 2 - 48,
      art.top + art.height / 2 - 52,
      96,
      palette.artAccent
    );
  }

  const vignette = ctx.createLinearGradient(art.left, art.top, art.left, art.top + art.height);
  vignette.addColorStop(0, 'rgba(0,0,0,0.22)');
  vignette.addColorStop(0.18, 'rgba(0,0,0,0)');
  vignette.addColorStop(0.82, 'rgba(0,0,0,0)');
  vignette.addColorStop(1, 'rgba(0,0,0,0.28)');
  ctx.fillStyle = vignette;
  ctx.fillRect(art.left, art.top, art.width, art.height);
  ctx.restore();

  ctx.strokeStyle = palette.gold;
  ctx.lineWidth = 1.7;
  strokeRoundedRect(ctx, art.left - 1, art.top - 1, art.width + 2, art.height + 2, 11);

  const rankSize = rank === '10' ? 26 : CARD_FACE.rankFontSize;
  drawClassicIndex(ctx, rank, suit, color, cornerMargin, cornerMargin + 2);
  drawClassicIndex(
    ctx,
    rank,
    suit,
    color,
    width - cornerMargin - 36,
    height - cornerMargin - rankSize - CARD_FACE.suitIconSize - 16
  );

  if (spec.themeLabel) {
    const label = spec.themeLabel.toUpperCase();
    ctx.fillStyle = palette.caption;
    ctx.font = '700 9px Georgia, "Times New Roman", serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const gap = 2.4;
    const chars = label.split('');
    const widths = chars.map((ch) => ctx.measureText(ch).width);
    const total = widths.reduce((sum, w) => sum + w, 0) + gap * Math.max(0, chars.length - 1);
    let cursor = width / 2 - total / 2;
    for (let i = 0; i < chars.length; i += 1) {
      ctx.textAlign = 'left';
      ctx.fillText(chars[i], cursor, height - caption.bottom);
      cursor += widths[i] + gap;
    }
    ctx.textAlign = 'start';
  }
}
