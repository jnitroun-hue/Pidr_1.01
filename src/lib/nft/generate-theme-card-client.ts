import { NFT_THEME_CONFIG, pickRandomThemeAsset, type NftThemeKey } from '@/lib/nft/theme-config';

const SUITS = ['spades', 'hearts', 'diamonds', 'clubs'] as const;
const RANKS = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'j', 'q', 'k', 'a'] as const;

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

function drawFallbackFace(ctx: CanvasRenderingContext2D, suit: string, rank: string) {
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, 300, 420);
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 8;
  ctx.strokeRect(4, 4, 292, 412);
  drawRankAndSuit(ctx, suit, rank, false);
}

/** Клиентская сборка лицевой стороны NFT-карты (как в генераторе тем) */
export function generateThemeCardImageDataUrl(
  suit: string,
  rank: string,
  theme: NftThemeKey,
  themeId: number
): Promise<string> {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas');
    canvas.width = 300;
    canvas.height = 420;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      resolve('');
      return;
    }

    const themeConfig = NFT_THEME_CONFIG[theme];
    const fileName = `${themeConfig.prefix}${themeId}.png`;
    const imagePath = `/${themeConfig.folder}/${fileName}`;
    const isLegendary = theme === 'legendary';

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = imagePath;

    img.onload = () => {
      try {
        if (isLegendary) {
          ctx.drawImage(img, 0, 0, 300, 420);
          ctx.strokeStyle = '#000000';
          ctx.lineWidth = 8;
          ctx.strokeRect(4, 4, 292, 412);
          drawRankAndSuit(ctx, suit, rank, true);
        } else {
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, 300, 420);
          ctx.strokeStyle = '#000000';
          ctx.lineWidth = 8;
          ctx.strokeRect(4, 4, 292, 412);
          ctx.drawImage(img, 50, 110, 200, 200);
          drawRankAndSuit(ctx, suit, rank, false);
        }
        resolve(canvas.toDataURL('image/png'));
      } catch {
        drawFallbackFace(ctx, suit, rank);
        resolve(canvas.toDataURL('image/png'));
      }
    };

    img.onerror = () => {
      drawFallbackFace(ctx, suit, rank);
      resolve(canvas.toDataURL('image/png'));
    };
  });
}
