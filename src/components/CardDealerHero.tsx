'use client';

import Image from 'next/image';
import { motion } from 'framer-motion';
import styles from './CardDealerHero.module.css';

const HERO_IMAGE = '/img/vk-app-icon-512.png';

interface CardDealerHeroProps {
  size?: 'default' | 'compact';
}

export default function CardDealerHero({ size = 'default' }: CardDealerHeroProps) {
  const compact = size === 'compact';

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
          src={HERO_IMAGE}
          alt="P.I.D.R. — карточная игра"
          fill
          priority
          sizes="(max-width: 480px) 92vw, 420px"
          className={styles.heroImage}
        />
        <div className={styles.vignetteBottom} />
      </div>
      <div className={styles.frameRing} />
    </motion.div>
  );
}
