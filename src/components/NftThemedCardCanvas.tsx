'use client';



import { useEffect, useMemo, useState, type CSSProperties } from 'react';

import {

  generateHeroCardFastDataUrl,

  generateThemeCardImageDataUrl,

} from '@/lib/nft/generate-theme-card-client';

import { normalizeRankToken, normalizeSuitToken } from '@/lib/game/cardAssets';

import { NFT_THEME_CONFIG, isAnimatedNftTheme, parseNftThemeFromImageUrl, type NftThemeKey } from '@/lib/nft/theme-config';
import UniqueLivingCard from '@/components/UniqueLivingCard';



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
  rarity?: string | null,
  imageUrl?: string | null
): { theme: NftThemeKey; themeId: number } | null {
  if (metadata) {
    const theme = (metadata.theme ?? metadata.nft_theme) as string | undefined;
    const themeId = Number(metadata.theme_id ?? metadata.themeId);
    if (theme && theme in NFT_THEME_CONFIG && Number.isFinite(themeId) && themeId >= 1) {
      return { theme: theme as NftThemeKey, themeId };
    }
  }

  const fromUrl = parseNftThemeFromImageUrl(imageUrl);
  if (fromUrl) return fromUrl;

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



/** Готовая карта с сервера (акция дня, купленная NFT) */

function isComposedCardUrl(url?: string | null): boolean {
  if (!url) return false;
  const dailyOfferVersion = url.match(/daily-offer\/v(\d+)\//i);
  if (dailyOfferVersion) return Number(dailyOfferVersion[1]) >= 11;
  if (/base-cards/i.test(url)) return true;
  return false;
}



type Props = NftCardRenderSpec & {

  width?: number;

  height?: number;

  fluid?: boolean;

  className?: string;

  style?: CSSProperties;

  onClick?: () => void;

  alt?: string;

  /** Добавить угол только для сырого арта, который ещё не является готовой картой. */
  ensureReadableCorners?: boolean;

};



/**

 * NFT-карта: сначала серверный PNG (акция дня), иначе клиентская сборка

 * (классическое лицо карты + арт темы + ранг/масть без квадратов).

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

  ensureReadableCorners = false,

}: Props) {

  const { suitNorm, rankNorm } = useMemo(() => normalizeForCanvas(rank, suit), [rank, suit]);

  const parsedFromUrl = parseNftThemeFromImageUrl(fallbackImageUrl);
  const themeKey = (theme && theme in NFT_THEME_CONFIG ? (theme as NftThemeKey) : null) || parsedFromUrl?.theme || null;
  const validThemeId = (themeId != null && themeId > 0 ? themeId : null) || parsedFromUrl?.themeId || null;



  const composedUrl = useMemo(() => {
    // Тема + themeId → всегда собираем актуальное лицо карты, даже если в storage лежит старый PNG с квадратами.
    if (themeKey && validThemeId) return null;
    return isComposedCardUrl(fallbackImageUrl) ? fallbackImageUrl : null;
  }, [fallbackImageUrl, themeKey, validThemeId]);

  const rawArtworkUrl =
    themeKey && validThemeId
      ? null
      : fallbackImageUrl && !composedUrl && !/daily-offer\/v\d+\//i.test(fallbackImageUrl)
        ? fallbackImageUrl
        : null;



  const cacheKey = useMemo(

    () => `${suitNorm}|${rankNorm}|${themeKey ?? ''}|${validThemeId ?? ''}|${themeLabel ?? ''}|v11`,

    [suitNorm, rankNorm, themeKey, validThemeId, themeLabel]

  );



  const [clientUrl, setClientUrl] = useState('');

  const [composedFailed, setComposedFailed] = useState(false);

  const [rawArtworkFailed, setRawArtworkFailed] = useState(false);

  useEffect(() => {
    setComposedFailed(false);
    setRawArtworkFailed(false);
  }, [fallbackImageUrl]);

  useEffect(() => {
    const fastPreview = generateHeroCardFastDataUrl(suitNorm, rankNorm, themeKey ?? undefined);
    setClientUrl(fastPreview);

    if (!themeKey || !validThemeId) return;
    if (isAnimatedNftTheme(themeKey)) return;

    let cancelled = false;

    void generateThemeCardImageDataUrl(suitNorm, rankNorm, themeKey, validThemeId).then((url) => {
      if (!cancelled && url) setClientUrl(url);
    });

    return () => {
      cancelled = true;
    };
  }, [cacheKey, suitNorm, rankNorm, themeKey, validThemeId]);

  /**
   * Составленный сервером PNG уже содержит арт и углы. Он является источником
   * истины для акции дня и купленной NFT; клиентский canvas страхует битый URL.
   */
  if (themeKey && validThemeId && isAnimatedNftTheme(themeKey)) {
    return (
      <UniqueLivingCard
        suit={suitNorm}
        rank={rankNorm}
        theme={themeKey}
        themeId={validThemeId}
        width={width}
        height={height}
        fluid={fluid}
        className={className}
        style={style}
        onClick={onClick}
        alt={alt}
      />
    );
  }

  const imgSrc =
    composedUrl && !composedFailed
      ? composedUrl
      : rawArtworkUrl && !rawArtworkFailed
        ? rawArtworkUrl
        : clientUrl || null;
  const showCornerFallback = ensureReadableCorners && Boolean(rawArtworkUrl && imgSrc === rawArtworkUrl);



  return (

    <div

      className={className}

      onClick={onClick}

      style={{

        position: 'relative',

        containerType: 'inline-size',

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

          onError={() => {
            if (composedUrl && imgSrc === composedUrl) setComposedFailed(true);
            if (rawArtworkUrl && imgSrc === rawArtworkUrl) setRawArtworkFailed(true);
          }}

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

          …

        </div>

      )}
      {showCornerFallback && (
        <div
          aria-hidden
          style={{
            position: 'absolute',
            top: '5%',
            left: '5.5%',
            zIndex: 2,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            color: suitNorm === 'hearts' || suitNorm === 'diamonds' ? '#b42318' : '#141414',
            fontFamily: 'Georgia, "Times New Roman", serif',
            fontWeight: 700,
            lineHeight: 0.92,
            textShadow: '0 0 4px rgba(255,248,240,0.95), 0 1px 0 rgba(255,255,255,0.8)',
            pointerEvents: 'none',
          }}
        >
          <span style={{ fontSize: 'clamp(12px, 11cqw, 22px)' }}>{getRankLabel(rankNorm)}</span>
          <span style={{ fontSize: 'clamp(10px, 8cqw, 16px)' }}>{getSuitSymbol(suitNorm)}</span>
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

function getSuitSymbol(suitNorm: string): string {
  const map: Record<string, string> = {
    clubs: '♣',
    diamonds: '♦',
    hearts: '♥',
    spades: '♠',
  };
  return map[suitNorm] ?? suitNorm.slice(0, 1).toUpperCase();
}


