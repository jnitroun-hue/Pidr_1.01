'use client';

import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import {
  generateHeroCardFastDataUrl,
  generateThemeCardImageDataUrl,
} from '@/lib/nft/generate-theme-card-client';
import { normalizeRankToken, normalizeSuitToken } from '@/lib/game/cardAssets';
import { NFT_THEME_CONFIG, type NftThemeKey } from '@/lib/nft/theme-config';

export type NftCardRenderSpec = {
  suit: string;
  rank: string;
  theme?: NftThemeKey | string | null;
  themeId?: number | null;
  themeLabel?: string | null;
  fallbackImageUrl?: string | null;
};

export function resolveThemeFromMetadata(
  metadata?: Record<string, unknown> | null,
  rarity?: string | null
): { theme: NftThemeKey; themeId: number } | null {
  if (metadata) {
    const theme = (metadata.theme ?? metadata.nft_theme) as string | undefined;
    const themeId = Number(metadata.theme_id ?? metadata.themeId);
    if (theme && theme in NFT_THEME_CONFIG && Number.isFinite(themeId) && themeId >= 1) {
      return { theme: theme as NftThemeKey, themeId };
    }
  }
  if (rarity && rarity in NFT_THEME_CONFIG) {
    const themeId = Number(metadata?.theme_id ?? metadata?.themeId ?? 1);
    return {
      theme: rarity as NftThemeKey,
      themeId: Number.isFinite(themeId) && themeId >= 1 ? themeId : 1,
    };
  }
  return null;
}

function normalizeForCanvas(rank: string, suit: string) {
  const suitNorm = normalizeSuitToken(suit) || 'spades';
  const rankNorm = normalizeRankToken(rank) || String(rank || '').trim().toLowerCase() || '2';
  return { suitNorm, rankNorm };
}

/** URL похож на готовую карту с рангом/мастью, а не на голый ассет темы */
function isComposedCardUrl(url?: string | null): boolean {
  if (!url) return false;
  return /daily-offer|base-cards|\/cards\/|_of_(clubs|diamonds|hearts|spades)/i.test(url);
}

type Props = NftCardRenderSpec & {
  width?: number;
  height?: number;
  fluid?: boolean;
  className?: string;
  style?: CSSProperties;
  onClick?: () => void;
  alt?: string;
};

/**
 * Рендер NFT-карты на клиенте (масти SVG-path, тема из /public).
 * Сразу показывает ранг и масть через canvas, затем подгружает тему.
 */
export default function NftThemedCardCanvas({
  suit,
  rank,
  theme,
  themeId,
  themeLabel,
  fallbackImageUrl,
  width = 300,
  height = 420,
  fluid = false,
  className,
  style,
  onClick,
  alt,
}: Props) {
  const { suitNorm, rankNorm } = useMemo(() => normalizeForCanvas(rank, suit), [rank, suit]);
  const themeKey = theme && theme in NFT_THEME_CONFIG ? (theme as NftThemeKey) : null;
  const validThemeId = themeId != null && themeId > 0 ? themeId : null;

  const cacheKey = useMemo(
    () => `${suitNorm}|${rankNorm}|${themeKey ?? ''}|${validThemeId ?? ''}|${themeLabel ?? ''}`,
    [suitNorm, rankNorm, themeKey, validThemeId, themeLabel]
  );

  const [dataUrl, setDataUrl] = useState('');

  useEffect(() => {
    const fastPreview = generateHeroCardFastDataUrl(suitNorm, rankNorm);
    setDataUrl(fastPreview);

    if (!themeKey || !validThemeId) return;

    let cancelled = false;

    void generateThemeCardImageDataUrl(suitNorm, rankNorm, themeKey, validThemeId).then((url) => {
      if (!cancelled && url) setDataUrl(url);
    });

    return () => {
      cancelled = true;
    };
  }, [cacheKey, suitNorm, rankNorm, themeKey, validThemeId]);

  const imgSrc =
    dataUrl ||
    (suitNorm && rankNorm ? null : isComposedCardUrl(fallbackImageUrl) ? fallbackImageUrl : null);

  return (
    <div
      className={className}
      onClick={onClick}
      style={{
        width: fluid ? '100%' : width,
        height: fluid ? '100%' : height,
        aspectRatio: fluid ? '300 / 420' : undefined,
        borderRadius: 12,
        overflow: 'hidden',
        background: '#fff',
        boxShadow: '0 12px 32px rgba(0,0,0,0.35)',
        cursor: onClick ? 'pointer' : undefined,
        ...style,
      }}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={
        onClick
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onClick();
              }
            }
          : undefined
      }
    >
      {imgSrc ? (
        <img
          src={imgSrc}
          alt={alt ?? `${getRankLabel(rankNorm)} ${suitNorm}`}
          style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }}
          draggable={false}
        />
      ) : (
        <div
          aria-hidden
          style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#64748b',
            fontWeight: 800,
            fontSize: 28,
          }}
        >
          {getRankLabel(rankNorm)}
          {suitNorm === 'hearts' ? 'H' : suitNorm === 'diamonds' ? 'D' : suitNorm === 'clubs' ? 'C' : 'S'}
        </div>
      )}
    </div>
  );
}

function getRankLabel(rankNorm: string): string {
  const map: Record<string, string> = {
    jack: 'J',
    queen: 'Q',
    king: 'K',
    ace: 'A',
  };
  return map[rankNorm] ?? rankNorm.toUpperCase();
}
