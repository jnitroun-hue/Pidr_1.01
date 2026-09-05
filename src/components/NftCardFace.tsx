'use client';

import type { CSSProperties } from 'react';
import NftThemedCardCanvas, {
  resolveThemeFromMetadata,
} from '@/components/NftThemedCardCanvas';
import { getCardAssetSrc } from '@/lib/game/cardAssets';

type Props = {
  suit: string;
  rank: string;
  imageUrl?: string | null;
  rarity?: string | null;
  metadata?: Record<string, unknown> | null;
  themeLabel?: string | null;
  style?: CSSProperties;
  className?: string;
  alt?: string;
  faceDown?: boolean;
  ensureReadableCorners?: boolean;
};

/**
 * Единый рендер карты: NFT через canvas, стандартная — через canvas-лицо, рубашка — SVG.
 */
export default function NftCardFace({
  suit,
  rank,
  imageUrl,
  rarity,
  metadata,
  themeLabel,
  style,
  className,
  alt,
  faceDown = false,
  ensureReadableCorners = true,
}: Props) {
  if (faceDown) {
    const src = getCardAssetSrc({ faceDown: true });
    return (
      <img
        src={src}
        alt={alt || 'Card back'}
        className={className}
        loading="lazy"
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          display: 'block',
          borderRadius: 6,
          ...style,
        }}
      />
    );
  }

  const themeInfo = resolveThemeFromMetadata(metadata, rarity, imageUrl);
  const hasIdentity = Boolean(String(rank || '').trim() && String(suit || '').trim());

  if (hasIdentity) {
    return (
      <NftThemedCardCanvas
        suit={suit}
        rank={rank}
        theme={themeInfo?.theme ?? rarity ?? null}
        themeId={themeInfo?.themeId ?? null}
        themeLabel={
          themeLabel ??
          (typeof metadata?.theme_label === 'string' ? metadata.theme_label : null)
        }
        fallbackImageUrl={imageUrl ?? null}
        fluid
        ensureReadableCorners={ensureReadableCorners}
        className={className}
        style={{ width: '100%', height: '100%', boxShadow: 'none', borderRadius: 6, ...style }}
        alt={alt || `${rank} of ${suit}`}
      />
    );
  }

  const src = getCardAssetSrc({ rank, suit, image: imageUrl ?? undefined, faceDown: false })
    || getCardAssetSrc({ faceDown: true });

  return (
    <img
      src={src}
      alt={alt || `${rank} of ${suit}`}
      className={className}
      loading="lazy"
      style={{
        width: '100%',
        height: '100%',
        objectFit: 'contain',
        display: 'block',
        background: '#fff',
        borderRadius: 6,
        ...style,
      }}
    />
  );
}
