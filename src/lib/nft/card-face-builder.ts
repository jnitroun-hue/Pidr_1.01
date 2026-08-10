/**
 * Единая сборка лицевой стороны NFT-карты (сервер + клиент).
 * Все 13 рангов × 4 масти — canvas на сервере и в браузере.
 */

import { normalizeRankToken, normalizeSuitToken } from '@/lib/game/cardAssets';

export const CARD_FACE = {
  width: 300,
  height: 420,
  border: 6,
  cornerMargin: 14,
  rankFontSize: 54,
  suitIconSize: 36,
  art: { top: 78, left: 24, size: 252 },
  /** Внутри арта, по центру — не заходит на нижние углы с рангом */
  themeBadge: { top: 300, height: 22, left: 85, width: 130 },
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
  return suit === 'hearts' || suit === 'diamonds' ? '#dc2626' : '#0f172a';
}

function fallbackArtPalette(themeLabel?: string): {
  background: string;
  accent: string;
  secondary: string;
} {
  const label = String(themeLabel || '').toLowerCase();
  if (label.includes('легендар') || label.includes('legendary')) {
    return { background: '#451a03', accent: '#fbbf24', secondary: '#f97316' };
  }
  if (label.includes('хеллоу') || label.includes('halloween')) {
    return { background: '#2e1065', accent: '#fb923c', secondary: '#a855f7' };
  }
  if (label.includes('звезд') || label.includes('star')) {
    return { background: '#020617', accent: '#60a5fa', secondary: '#a78bfa' };
  }
  if (label.includes('покемон') || label.includes('pokemon')) {
    return { background: '#172554', accent: '#facc15', secondary: '#ef4444' };
  }
  return { background: '#0f172a', accent: '#e2e8f0', secondary: '#64748b' };
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

function cornerGroupSvg(rank: string, suit: string, color: string, suitSize: number): string {
  return `
    <text x="0" y="42" font-family="Helvetica, Arial, sans-serif" font-size="${CARD_FACE.rankFontSize}" font-weight="800" fill="${color}">${escapeXml(rank)}</text>
    ${suitPathSvg(suit, 0, 52, suitSize, color)}
  `;
}

/** SVG-основа карты: рамка, углы, зона арта, бейдж темы */
export function buildCardFaceSvg(spec: CardFaceSpec): string {
  const rank = displayRank(spec.rankRaw, spec.rankNormalized);
  const color = suitColor(spec.suit);
  const suit = resolveSuitKey(spec.suit);
  const { width, height, border, cornerMargin, art, themeBadge } = CARD_FACE;
  const themeLabel = spec.themeLabel ? escapeXml(spec.themeLabel.toUpperCase()) : '';
  const palette = fallbackArtPalette(spec.themeLabel);
  const fallbackArtwork = spec.themeLabel
    ? `
      <rect x="${art.left}" y="${art.top}" width="${art.size}" height="${art.size}" rx="8" fill="${palette.background}"/>
      <circle cx="${art.left + art.size / 2}" cy="${art.top + art.size / 2}" r="104" fill="${palette.secondary}" opacity="0.24"/>
      <circle cx="${art.left + art.size / 2}" cy="${art.top + art.size / 2}" r="78" fill="none" stroke="${palette.accent}" stroke-width="4" opacity="0.8"/>
      ${suitPathSvg(suit, art.left + 72, art.top + 72, 112, palette.accent)}
      <circle cx="${art.left + 34}" cy="${art.top + 34}" r="5" fill="${palette.accent}"/>
      <circle cx="${art.left + art.size - 34}" cy="${art.top + 34}" r="5" fill="${palette.accent}"/>
      <circle cx="${art.left + 34}" cy="${art.top + art.size - 34}" r="5" fill="${palette.accent}"/>
      <circle cx="${art.left + art.size - 34}" cy="${art.top + art.size - 34}" r="5" fill="${palette.accent}"/>
    `
    : '';

  const badgeBlock = themeLabel
    ? `
      <rect x="${themeBadge.left}" y="${themeBadge.top}" width="${themeBadge.width}" height="${themeBadge.height}" rx="11" fill="#fef3c7" stroke="#fcd34d" stroke-width="1"/>
      <text x="${themeBadge.left + themeBadge.width / 2}" y="${themeBadge.top + 15}" font-family="Helvetica, Arial, sans-serif" font-size="10" font-weight="700" fill="#92400e" text-anchor="middle" letter-spacing="0.06em">${themeLabel}</text>
    `
    : '';

  return `
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <rect width="${width}" height="${height}" fill="#ffffff"/>
      <rect x="${border / 2}" y="${border / 2}" width="${width - border}" height="${height - border}" rx="10" fill="none" stroke="#0f172a" stroke-width="${border}"/>
      <rect x="${art.left}" y="${art.top}" width="${art.size}" height="${art.size}" rx="8" fill="#f1f5f9" stroke="#cbd5e1" stroke-width="1"/>
      ${fallbackArtwork}
      <rect x="9" y="9" width="74" height="100" rx="10" fill="#ffffff" fill-opacity="0.94" stroke="#cbd5e1" stroke-width="1"/>
      <rect x="${width - 83}" y="${height - 109}" width="74" height="100" rx="10" fill="#ffffff" fill-opacity="0.94" stroke="#cbd5e1" stroke-width="1"/>
      <g transform="translate(${cornerMargin},${cornerMargin})">
        ${cornerGroupSvg(rank, suit, color, CARD_FACE.suitIconSize)}
      </g>
      <!-- Без rotate(180): 6 и 9 при повороте выглядят как друг друг -->
      <g transform="translate(${width - cornerMargin},${height - cornerMargin - 78})">
        <text x="0" y="42" font-family="Helvetica, Arial, sans-serif" font-size="${CARD_FACE.rankFontSize}" font-weight="800" fill="${color}" text-anchor="end">${escapeXml(rank)}</text>
        ${suitPathSvg(suit, -CARD_FACE.suitIconSize, 52, CARD_FACE.suitIconSize, color)}
      </g>
      ${badgeBlock}
    </svg>`;
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
  const r = size * 0.22;

  const circle = (ox: number, oy: number, radius: number) => {
    ctx.beginPath();
    ctx.arc(ox, oy, radius, 0, Math.PI * 2);
    ctx.fill();
  };

  switch (suit) {
    case 'hearts': {
      circle(cx - r * 0.95, r * 1.05, r);
      circle(cx + r * 0.95, r * 1.05, r);
      ctx.beginPath();
      ctx.moveTo(cx - r * 2.1, r * 1.35);
      ctx.lineTo(cx + r * 2.1, r * 1.35);
      ctx.lineTo(cx, size - r * 0.15);
      ctx.closePath();
      ctx.fill();
      break;
    }
    case 'diamonds': {
      ctx.beginPath();
      ctx.moveTo(cx, 0);
      ctx.lineTo(size, cx);
      ctx.lineTo(cx, size);
      ctx.lineTo(0, cx);
      ctx.closePath();
      ctx.fill();
      break;
    }
    case 'clubs': {
      circle(cx, r * 1.15, r);
      circle(cx - r * 1.35, r * 2.35, r);
      circle(cx + r * 1.35, r * 2.35, r);
      ctx.fillRect(cx - r * 0.35, r * 3.05, r * 0.7, size - r * 3.05);
      break;
    }
    case 'spades':
    default: {
      const w = size;
      const h = size;
      const stemW = w * 0.14;
      ctx.beginPath();
      ctx.moveTo(cx, h * 0.02);
      ctx.bezierCurveTo(w * 0.92, h * 0.38, w * 0.78, h * 0.58, cx, h * 0.62);
      ctx.bezierCurveTo(w * 0.22, h * 0.58, w * 0.08, h * 0.38, cx, h * 0.02);
      ctx.closePath();
      ctx.fill();
      ctx.fillRect(cx - stemW / 2, h * 0.6, stemW, h * 0.38);
      break;
    }
  }

  ctx.restore();
}

export function drawCardFaceCanvas(
  ctx: CanvasRenderingContext2D,
  spec: CardFaceSpec,
  themeImage?: CanvasImageSource | null
) {
  const { width, height, border, cornerMargin, art, themeBadge } = CARD_FACE;
  const rankNorm = normalizeRankToken(spec.rankNormalized || spec.rankRaw) || spec.rankNormalized;
  const rank = displayRank(spec.rankRaw, rankNorm);
  const color = suitColor(resolveSuitKey(spec.suit));
  const suit = resolveSuitKey(spec.suit);

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);

  ctx.strokeStyle = '#0f172a';
  ctx.lineWidth = border;
  ctx.strokeRect(border / 2, border / 2, width - border, height - border);

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(art.left, art.top, art.size, art.size);

  if (themeImage) {
    const img = themeImage as HTMLImageElement;
    const scale = Math.min(art.size / img.width, art.size / img.height);
    const drawW = img.width * scale;
    const drawH = img.height * scale;
    const drawX = art.left + (art.size - drawW) / 2;
    const drawY = art.top + (art.size - drawH) / 2;
    ctx.drawImage(img, drawX, drawY, drawW, drawH);
  } else {
    const palette = fallbackArtPalette(spec.themeLabel);
    ctx.fillStyle = spec.themeLabel ? palette.background : '#f1f5f9';
    ctx.fillRect(art.left, art.top, art.size, art.size);
    if (spec.themeLabel) {
      const centerX = art.left + art.size / 2;
      const centerY = art.top + art.size / 2;

      ctx.globalAlpha = 0.24;
      ctx.fillStyle = palette.secondary;
      ctx.beginPath();
      ctx.arc(centerX, centerY, 104, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;

      ctx.strokeStyle = palette.accent;
      ctx.lineWidth = 4;
      ctx.globalAlpha = 0.8;
      ctx.beginPath();
      ctx.arc(centerX, centerY, 78, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 1;

      drawSuitIconCanvas(ctx, suit, art.left + 72, art.top + 72, 112, palette.accent);
      ctx.fillStyle = palette.accent;
      for (const [x, y] of [
        [art.left + 34, art.top + 34],
        [art.left + art.size - 34, art.top + 34],
        [art.left + 34, art.top + art.size - 34],
        [art.left + art.size - 34, art.top + art.size - 34],
      ]) {
        ctx.beginPath();
        ctx.arc(x, y, 5, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  // Контрастная подложка сохраняет ранг и масть читаемыми поверх любого арта.
  ctx.fillStyle = 'rgba(255, 255, 255, 0.94)';
  ctx.strokeStyle = '#cbd5e1';
  ctx.lineWidth = 1;
  ctx.fillRect(9, 9, 74, 100);
  ctx.strokeRect(9, 9, 74, 100);
  ctx.fillRect(width - 83, height - 109, 74, 100);
  ctx.strokeRect(width - 83, height - 109, 74, 100);

  // Углы без rotate(180): иначе 6↔9 и часть мастей читаются вверх ногами / как другой ранг.
  const drawCorner = (originX: number, originY: number, align: CanvasTextAlign = 'left') => {
    ctx.save();
    ctx.translate(originX, originY);
    ctx.fillStyle = color;
    ctx.font = `800 ${CARD_FACE.rankFontSize}px Helvetica, Arial, sans-serif`;
    ctx.textAlign = align;
    ctx.textBaseline = 'alphabetic';
    ctx.fillText(rank, 0, 42);
    drawSuitIconCanvas(
      ctx,
      suit,
      align === 'right' ? -CARD_FACE.suitIconSize : 0,
      52,
      CARD_FACE.suitIconSize,
      color
    );
    ctx.restore();
  };

  drawCorner(cornerMargin, cornerMargin);
  drawCorner(width - cornerMargin, height - cornerMargin - 78, 'right');

  if (spec.themeLabel) {
    const label = spec.themeLabel.toUpperCase();
    const bx = themeBadge.left;
    const by = themeBadge.top;
    const bw = themeBadge.width;
    const bh = themeBadge.height;
    const r = 11;
    ctx.fillStyle = '#fef3c7';
    ctx.strokeStyle = '#fcd34d';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(bx + r, by);
    ctx.lineTo(bx + bw - r, by);
    ctx.quadraticCurveTo(bx + bw, by, bx + bw, by + r);
    ctx.lineTo(bx + bw, by + bh - r);
    ctx.quadraticCurveTo(bx + bw, by + bh, bx + bw - r, by + bh);
    ctx.lineTo(bx + r, by + bh);
    ctx.quadraticCurveTo(bx, by + bh, bx, by + bh - r);
    ctx.lineTo(bx, by + r);
    ctx.quadraticCurveTo(bx, by, bx + r, by);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#92400e';
    ctx.font = '700 10px Helvetica, Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(label, bx + bw / 2, by + 15);
    ctx.textAlign = 'start';
  }
}
