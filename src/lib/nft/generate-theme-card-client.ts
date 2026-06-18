import { NFT_THEME_CONFIG, pickRandomThemeAsset, type NftThemeKey } from '@/lib/nft/theme-config';

const SUITS = ['spades', 'hearts', 'diamonds', 'clubs'] as const;
const RANKS = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'j', 'q', 'k', 'a'] as const;

const CARD_WIDTH = 300;
const CARD_HEIGHT = 420;
const ART_X = 50;
const ART_Y = 110;
const ART_SIZE = 200;

export type RandomHeroCardSpec = {
  theme: NftThemeKey;
  themeId: number;
  suit: string;
  rank: string;
};

export function pickRandomHeroCardSpec(): RandomHeroCardSpec {
  const { theme, themeId } = pickRandomThemeAsset();
  const suit = SUITS[Math.floor(Math.random() * SUITS.length)];
  const rank = RANKS[Math.floor(Math.random() * RANKS.length)];
  return { theme, themeId, suit, rank };
}

function drawRankAndSuit(
  ctx: CanvasRenderingContext2D,
  suit: string,
  rank: string,
  withStroke: boolean
) {
  const suitColor = suit === 'hearts' || suit === 'diamonds' ? '#ef4444' : '#000000';
  const suitSymbol =
    ({ hearts: '♥', diamonds: '♦', clubs: '♣', spades: '♠' } as Record<string, string>)[suit] || suit;
  const rankLabel = rank.toUpperCase();

  if (withStroke) {
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 3;
    ctx.font = 'bold 40px Arial';
    ctx.strokeText(rankLabel, 20, 50);
    ctx.strokeText(rankLabel, 260, 400);
    ctx.font = 'bold 36px Arial';
    ctx.strokeText(suitSymbol, 20, 90);
    ctx.strokeText(suitSymbol, 260, 360);
  }

  ctx.fillStyle = suitColor;
  ctx.font = 'bold 40px Arial';
  ctx.fillText(rankLabel, 20, 50);
  ctx.fillText(rankLabel, 260, 400);
  ctx.font = 'bold 36px Arial';
  ctx.fillText(suitSymbol, 20, 90);
  ctx.fillText(suitSymbol, 260, 360);
}

/** Белая основа карты с чёрной рамкой — для всех тем */
function drawWhiteCardBase(ctx: CanvasRenderingContext2D) {
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, CARD_WIDTH, CARD_HEIGHT);
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 8;
  ctx.strokeRect(4, 4, CARD_WIDTH - 8, CARD_HEIGHT - 8);
}

function drawImageContain(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  x: number,
  y: number,
  width: number,
  height: number
) {
  const scale = Math.min(width / img.width, height / img.height);
  const drawWidth = img.width * scale;
  const drawHeight = img.height * scale;
  const drawX = x + (width - drawWidth) / 2;
  const drawY = y + (height - drawHeight) / 2;
  ctx.drawImage(img, drawX, drawY, drawWidth, drawHeight);
}

function drawThemedCardFace(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  suit: string,
  rank: string
) {
  drawWhiteCardBase(ctx);
  drawImageContain(ctx, img, ART_X, ART_Y, ART_SIZE, ART_SIZE);
  drawRankAndSuit(ctx, suit, rank, false);
}

function drawFallbackFace(ctx: CanvasRenderingContext2D, suit: string, rank: string) {
  drawWhiteCardBase(ctx);
  drawRankAndSuit(ctx, suit, rank, false);
}

const themeImageCache = new Map<string, HTMLImageElement>();

function loadThemeImage(imagePath: string): Promise<HTMLImageElement> {
  const cached = themeImageCache.get(imagePath);
  if (cached) return Promise.resolve(cached);

  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      themeImageCache.set(imagePath, img);
      resolve(img);
    };
    img.onerror = () => reject(new Error(`Failed to load ${imagePath}`));
    img.src = imagePath;
  });
}

/** Мгновенная карта без загрузки темы — для первого кадра на главной */
export function generateHeroCardFastDataUrl(suit: string, rank: string): string {
  const canvas = document.createElement('canvas');
  canvas.width = CARD_WIDTH;
  canvas.height = CARD_HEIGHT;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';
  drawFallbackFace(ctx, suit, rank);
  return canvas.toDataURL('image/png');
}

/** Клиентская сборка лицевой стороны NFT-карты (белая основа для всех тем) */
export function generateThemeCardImageDataUrl(
  suit: string,
  rank: string,
  theme: NftThemeKey,
  themeId: number
): Promise<string> {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas');
    canvas.width = CARD_WIDTH;
    canvas.height = CARD_HEIGHT;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      resolve('');
      return;
    }

    const themeConfig = NFT_THEME_CONFIG[theme];
    const fileName = `${themeConfig.prefix}${themeId}.png`;
    const imagePath = `/${themeConfig.folder}/${fileName}`;

    const finish = (img: HTMLImageElement) => {
      try {
        drawThemedCardFace(ctx, img, suit, rank);
        resolve(canvas.toDataURL('image/png'));
      } catch {
        drawFallbackFace(ctx, suit, rank);
        resolve(canvas.toDataURL('image/png'));
      }
    };

    loadThemeImage(imagePath)
      .then(finish)
      .catch(() => {
        drawFallbackFace(ctx, suit, rank);
        resolve(canvas.toDataURL('image/png'));
      });
  });
}
