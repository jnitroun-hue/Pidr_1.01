'use client';

import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import {
  generateHeroCardFastDataUrl,
  generateThemeCardImageDataUrl,
} from '@/lib/nft/generate-theme-card-client';
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
 * Не зависит от server-side sharp / кэша Storage.
 */
export default function NftThemedCardCanvas({
  suit,
  rank,
  theme,
  themeId,
  fallbackImageUrl,
  width = 300,
  height = 420,
  fluid = false,
  className,
  style,
  onClick,
  alt,
}: Props) {
  const themeKey = theme && theme in NFT_THEME_CONFIG ? (theme as NftThemeKey) : null;
  const validThemeId = themeId != null && themeId > 0 ? themeId : null;
  const usesClientCompose = Boolean(themeKey && validThemeId);

  const cacheKey = useMemo(
    () => `${suit}|${rank}|${themeKey ?? ''}|${validThemeId ?? ''}`,
    [suit, rank, themeKey, validThemeId]
  );

  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setFailed(false);

    const run = async () => {
      try {
        if (themeKey && validThemeId) {
          const url = await generateThemeCardImageDataUrl(suit, rank, themeKey, validThemeId);
          if (!cancelled && url) {
            setDataUrl(url);
            return;
          }
        }
        const fast = generateHeroCardFastDataUrl(suit, rank);
        if (!cancelled && fast) {
          setDataUrl(fast);
          return;
        }
        if (!cancelled) setFailed(true);
      } catch {
        if (!cancelled) setFailed(true);
      }
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [cacheKey, themeKey, validThemeId, suit, rank]);

  const imgSrc =
    dataUrl ??
    (!usesClientCompose && !failed ? fallbackImageUrl : null) ??
    (failed ? fallbackImageUrl : null);

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
          alt={alt ?? `${rank} ${suit}`}
          style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }}
          draggable={false}
        />
      ) : (
        <div
          style={{
            width: '100%',
            height: '100%',
            display: 'grid',
            placeItems: 'center',
            color: '#64748b',
            fontSize: 12,
          }}
        >
          …
        </div>
      )}
    </div>
  );
}
