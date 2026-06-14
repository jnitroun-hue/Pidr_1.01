'use client';

import { motion } from 'framer-motion';
import styles from './CardDealerHero.module.css';

const CARDS = [
  { rot: -32, ty: 0, z: 1, suit: '♠', red: false, delay: 0 },
  { rot: -16, ty: -4, z: 2, suit: '♥', red: true, delay: 0.08 },
  { rot: 0, ty: -8, z: 3, suit: '♦', red: true, delay: 0.16 },
  { rot: 16, ty: -4, z: 2, suit: '♣', red: false, delay: 0.24 },
  { rot: 32, ty: 0, z: 1, suit: '♠', red: false, delay: 0.32 },
] as const;

const PARTICLES = [
  { left: '12%', top: '18%', delay: 0 },
  { left: '88%', top: '22%', delay: 0.6 },
  { left: '28%', top: '12%', delay: 1.1 },
  { left: '72%', top: '14%', delay: 1.7 },
];

function PlayingCard({
  rot,
  ty,
  z,
  suit,
  red,
  delay,
}: (typeof CARDS)[number]) {
  const colorClass = red ? styles.red : styles.black;

  return (
    <motion.div
      className={styles.card}
      style={{ zIndex: z }}
      initial={false}
      animate={{
        rotateZ: [rot - 2, rot + 2.5, rot - 2],
        y: [ty, ty - 5, ty],
      }}
      transition={{
        duration: 2.4,
        repeat: Infinity,
        delay,
        ease: 'easeInOut',
      }}
    >
      <div
        className={styles.cardInner}
        style={{
          transform: `rotateX(12deg) rotateY(${rot * 0.35}deg) translateZ(${z * 2}px)`,
        }}
      >
        <div className={styles.cardEdge} aria-hidden />
        <span className={`${styles.suitTop} ${colorClass}`}>{suit}</span>
        <span className={`${styles.suitCenter} ${colorClass}`}>{suit}</span>
        <span className={`${styles.suitBottom} ${colorClass}`}>{suit}</span>
      </div>
      <div className={styles.cardShadow} aria-hidden />
    </motion.div>
  );
}

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
      transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
      aria-hidden
    >
      <div className={styles.felt} />
      <div className={styles.feltEdge} />

      <div className={styles.stage}>
        {/* Dealer — face fully hidden under hat brim + dark glasses */}
        <div className={styles.dealerWrap}>
          <motion.div
            className={styles.dealer}
            animate={{ y: [0, -2, 0] }}
            transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
          >
            <div className={styles.coat} />
            <div className={styles.lapelLeft} />
            <div className={styles.lapelRight} />
            <div className={styles.shirtV} />
            <div className={styles.bowTie} />
            <div className={styles.neck} />
            <div className={styles.headShadow} />
            <div className={styles.hatCrown} />
            <div className={styles.hatBand} />
            <div className={styles.hatBrim} />
            <div className={styles.glasses}>
              <div className={styles.lens} />
              <span className={styles.bridge} />
              <div className={styles.lens} />
            </div>
          </motion.div>
        </div>

        {/* Card fan — in front of torso, below face */}
        <div className={styles.cardScene}>
          {CARDS.map((card) => (
            <PlayingCard key={`${card.suit}-${card.rot}`} {...card} />
          ))}
        </div>

        {/* Gloved hands cupping the fan from below */}
        <div className={styles.hands}>
          <motion.div
            className={`${styles.glove} ${styles.gloveLeft}`}
            animate={{ y: [0, -2, 0], rotate: [-18, -16, -18] }}
            transition={{ duration: 2.1, repeat: Infinity, ease: 'easeInOut' }}
          >
            <div className={styles.gloveCuff} />
          </motion.div>
          <motion.div
            className={`${styles.glove} ${styles.gloveRight}`}
            animate={{ y: [0, -2, 0], rotate: [18, 16, 18] }}
            transition={{ duration: 2.1, repeat: Infinity, ease: 'easeInOut', delay: 0.1 }}
          >
            <div className={styles.gloveCuff} />
          </motion.div>
        </div>
      </div>

      <div className={styles.spotlight} />
      <div className={styles.vignette} />

      {PARTICLES.map((p, i) => (
        <motion.span
          key={i}
          className={styles.particle}
          style={{ left: p.left, top: p.top }}
          animate={{ opacity: [0.15, 0.9, 0.15], scale: [0.7, 1.15, 0.7] }}
          transition={{
            duration: 2.5,
            repeat: Infinity,
            delay: p.delay,
            ease: 'easeInOut',
          }}
        />
      ))}
    </motion.div>
  );
}
