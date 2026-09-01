'use client';

import { useMemo, type CSSProperties } from 'react';
import { CARD_FACE, displayRank } from '@/lib/nft/card-face-builder';
import { generateHeroCardFastDataUrl } from '@/lib/nft/generate-theme-card-client';
import { getThemeAssetCandidateUrls } from '@/lib/nft/theme-asset-urls';
import { NFT_THEME_CONFIG, type NftThemeKey } from '@/lib/nft/theme-config';
import { normalizeRankToken, normalizeSuitToken } from '@/lib/game/cardAssets';
import styles from './UniqueLivingCard.module.css';

type Props = {
  suit: string;
  rank: string;
  theme: NftThemeKey;
  themeId: number;
  width?: number;
  height?: number;
  fluid?: boolean;
  className?: string;
  style?: CSSProperties;
  onClick?: () => void;
  alt?: string;
};

/**
 * Unique-карта: рамка статичная, внутри окна играет GIF как стикер в Telegram.
 * Карту целиком не крутим — двигается только картинка.
 */
export default function UniqueLivingCard({
  suit,
  rank,
  theme,
  themeId,
  width = CARD_FACE.width,
  height = CARD_FACE.height,
  fluid = false,
  className,
  style,
  onClick,
  alt,
}: Props) {
  const suitNorm = normalizeSuitToken(suit) || 'spades';
  const rankNorm = normalizeRankToken(rank) || String(rank || '').trim().toLowerCase() || '2';

  const frameUrl = useMemo(
    () => generateHeroCardFastDataUrl(suitNorm, rankNorm, theme),
    [suitNorm, rankNorm, theme]
  );

  const gifSrc = getThemeAssetCandidateUrls(theme, themeId)[0];
  const label = displayRank(rank, rankNorm);

  return (
    <div
      className={`${styles.wrap} ${className ?? ''}`}
      onClick={onClick}
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
      style={{
        width: fluid ? '100%' : width,
        height: fluid ? '100%' : height,
        aspectRatio: fluid ? `${CARD_FACE.width} / ${CARD_FACE.height}` : undefined,
        ...style,
      }}
    >
      <img className={styles.frame} src={frameUrl} alt="" draggable={false} />
      <div className={styles.photo} aria-hidden={false}>
        <img
          className={styles.sticker}
          src={gifSrc}
          alt={alt ?? `${label} ${NFT_THEME_CONFIG[theme].name}`}
          draggable={false}
        />
      </div>
    </div>
  );
}
