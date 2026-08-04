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
};

/**
 * Единый рендер лица NFT-карты: theme → canvas с углами; иначе image_url / стандартная карта.
 * Без HTML-оверлеев ранга/масти поверх уже составленного арта.
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
}: Props) {
  const themeInfo = resolveThemeFromMetadata(metadata, rarity);

  if (themeInfo || imageUrl) {
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
        className={className}
        style={{ width: '100%', height: '100%', boxShadow: 'none', borderRadius: 6, ...style }}
        alt={alt || `${rank} of ${suit}`}
      />
    );
  }

  const src = getCardAssetSrc({ rank, suit }) || getCardAssetSrc({ faceDown: true });

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
        ...style,
      }}
    />
  );
}
