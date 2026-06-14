'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { motion } from 'framer-motion';
import {
  generateThemeCardImageDataUrl,
  pickRandomHeroCardSpec,
} from '@/lib/nft/generate-theme-card-client';
import styles from './CardDealerHero.module.css';

const FLOATING_CARDS = [
  { id: 'c1', x: '8%', y: '18%', rot: -22, delay: 0, duration: 5.2, scale: 0.72 },
  { id: 'c2', x: '78%', y: '12%', rot: 18, delay: 0.6, duration: 6.1, scale: 0.68 },
  { id: 'c3', x: '84%', y: '52%', rot: 32, delay: 1.1, duration: 5.8, scale: 0.76 },
  { id: 'c4', x: '6%', y: '58%', rot: -14, delay: 0.3, duration: 6.4, scale: 0.7 },
  { id: 'c5', x: '42%', y: '6%', rot: 6, delay: 1.8, duration: 7, scale: 0.62 },
] as const;

interface CardDealerHeroProps {
  size?: 'default' | 'compact';
}

export default function CardDealerHero({ size = 'default' }: CardDealerHeroProps) {
  const compact = size === 'compact';
  const [cardFaces, setCardFaces] = useState<Record<string, string>>({});

  useEffect(() => {
    let cancelled = false;

    const loadFaces = async () => {
      const entries = await Promise.all(
        FLOATING_CARDS.map(async (card) => {
          const spec = pickRandomHeroCardSpec();
          const dataUrl = await generateThemeCardImageDataUrl(
            spec.suit,
            spec.rank,
            spec.theme,
            spec.themeId
          );
          return [card.id, dataUrl] as const;
        })
      );

      if (cancelled) return;
      setCardFaces(Object.fromEntries(entries.filter(([, src]) => Boolean(src))));
    };

    void loadFaces();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <motion.div
      className={`${styles.hero} ${compact ? styles.heroCompact : ''}`}
      initial={{ opacity: 0, y: 16, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      aria-hidden
    >
      <div className={styles.mediaWrap}>
        <Image
          src="/img/hero/dealer-hero-banner.png"
          alt=""
          fill
          priority
          sizes="(max-width: 480px) 92vw, 420px"
          className={styles.heroImage}
        />
        <div className={styles.vignetteTop} />
        <div className={styles.vignetteBottom} />
        <div className={styles.colorGrade} />
      </div>

      {FLOATING_CARDS.map((card) => (
        <motion.div
          key={card.id}
          className={styles.floatingCard}
          style={{
            left: card.x,
            top: card.y,
            ['--card-rot' as string]: `${card.rot}deg`,
            ['--card-scale' as string]: String(card.scale),
          }}
          animate={{ y: [0, -10, 0, 8, 0], rotate: [card.rot, card.rot + 4, card.rot - 3, card.rot] }}
          transition={{
            duration: card.duration,
            delay: card.delay,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        >
          {cardFaces[card.id] ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={cardFaces[card.id]}
              alt=""
              width={56}
              height={84}
              className={styles.cardFaceImg}
              draggable={false}
            />
          ) : (
            <div className={styles.cardFacePlaceholder} aria-hidden />
          )}
        </motion.div>
      ))}

      <div className={styles.chipAccent} aria-hidden />
      <div className={styles.frameRing} />
      <div className={styles.shineSweep} />
    </motion.div>
  );
}
