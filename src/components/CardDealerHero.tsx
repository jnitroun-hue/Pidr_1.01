'use client';

import { motion } from 'framer-motion';
import styles from './CardDealerHero.module.css';

const CARDS = [
  { rot: -34, x: -52, y: 18, suit: '♠', color: '#0f172a', face: '#f8fafc', delay: 0 },
  { rot: -16, x: -26, y: 8, suit: '♥', color: '#dc2626', face: '#fff1f2', delay: 0.08 },
  { rot: 0, x: 0, y: 0, suit: '♦', color: '#dc2626', face: '#fff7ed', delay: 0.16 },
  { rot: 16, x: 26, y: 8, suit: '♣', color: '#0f172a', face: '#f0fdf4', delay: 0.24 },
  { rot: 34, x: 52, y: 18, suit: '★', color: '#b45309', face: '#fffbeb', delay: 0.32 },
];

function PlayingCard({
  rot,
  x,
  y,
  suit,
  color,
  face,
  delay,
}: (typeof CARDS)[0]) {
  return (
    <motion.g
      animate={{
        rotate: [rot - 6, rot + 8, rot - 6],
        x: [x - 3, x + 5, x - 3],
        y: [y + 6, y - 10, y + 6],
      }}
      transition={{ duration: 1.5, repeat: Infinity, delay, ease: 'easeInOut' }}
    >
      <g transform={`translate(${x}, ${y}) rotate(${rot})`}>
        <rect x="-18" y="-28" width="36" height="50" rx="4" fill="#1e293b" />
        <rect x="-16" y="-26" width="32" height="46" rx="3" fill="url(#cardBack)" stroke="#fbbf24" strokeWidth="1.2" />
        <rect x="-14" y="-24" width="28" height="42" rx="2.5" fill={face} stroke="#cbd5e1" strokeWidth="0.8" />
        <text x="-8" y="-12" fontSize="11" fontWeight="800" fill={color}>{suit}</text>
        <text x="8" y="20" fontSize="11" fontWeight="800" fill={color} transform="rotate(180)">{suit}</text>
        <circle cx="0" cy="2" r="7" fill="none" stroke={color} strokeWidth="0.8" opacity="0.35" />
      </g>
    </motion.g>
  );
}

interface CardDealerHeroProps {
  size?: 'default' | 'compact';
}

export default function CardDealerHero({ size = 'default' }: CardDealerHeroProps) {
  const uid = size === 'compact' ? 'c' : 'd';

  return (
    <motion.div
      className={`${styles.wrapper} ${size === 'compact' ? styles.wrapperCompact : ''}`}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      aria-hidden
    >
      <div className={styles.glow} />

      <motion.svg
        className={styles.svg}
        viewBox="0 0 300 220"
        fill="none"
        animate={{ y: [0, -3, 0] }}
        transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
      >
        <defs>
          <linearGradient id={`${uid}vest`} x1="0" y1="0" x2="0" y2="1">
            <stop stopColor="#1e293b" />
            <stop offset="1" stopColor="#020617" />
          </linearGradient>
          <linearGradient id={`${uid}hat`} x1="0" y1="0" x2="0" y2="1">
            <stop stopColor="#44403c" />
            <stop offset="1" stopColor="#1c1917" />
          </linearGradient>
          <linearGradient id={`${uid}skin`} x1="0" y1="0" x2="0" y2="1">
            <stop stopColor="#c4a882" />
            <stop offset="1" stopColor="#8b6914" />
          </linearGradient>
          <linearGradient id="cardBack" x1="0" y1="0" x2="1" y2="1">
            <stop stopColor="#1e3a8a" />
            <stop offset="1" stopColor="#312e81" />
          </linearGradient>
          <linearGradient id={`${uid}lens`} x1="0" y1="0" x2="1" y2="1">
            <stop stopColor="#0a0a0a" />
            <stop offset="0.5" stopColor="#111827" />
            <stop offset="1" stopColor="#000" />
          </linearGradient>
          <filter id={`${uid}cardShadow`} x="-50%" y="-50%" width="200%" height="200%">
            <feDropShadow dx="0" dy="4" stdDeviation="4" floodColor="#000" floodOpacity="0.45" />
          </filter>
        </defs>

        <ellipse cx="150" cy="198" rx="78" ry="12" fill="rgba(0,0,0,0.4)" />

        {/* Плечи / жилет */}
        <path d="M95 128 Q150 118 205 128 L212 196 Q150 208 88 196 Z" fill={`url(#${uid}vest)`} />
        <path d="M130 128 L150 142 L170 128 L166 196 L134 196 Z" fill="#334155" opacity="0.9" />
        <path d="M138 136 L150 148 L162 136" stroke="#64748b" strokeWidth="1" fill="none" />

        {/* Рукава (за картами) */}
        <ellipse cx="78" cy="148" rx="14" ry="22" fill={`url(#${uid}skin)`} opacity="0.85" />
        <ellipse cx="222" cy="148" rx="14" ry="22" fill={`url(#${uid}skin)`} opacity="0.85" />

        {/* Карты — ПЕРЕД телом */}
        <g transform="translate(150, 138)" filter={`url(#${uid}cardShadow)`}>
          {CARDS.map((c) => (
            <PlayingCard key={c.suit + c.rot} {...c} />
          ))}
        </g>

        {/* Кисти поверх карт */}
        <motion.g
          animate={{ rotate: [-4, 3, -4] }}
          transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
          style={{ originX: '72px', originY: '148px' }}
        >
          <ellipse cx="68" cy="152" rx="12" ry="16" fill={`url(#${uid}skin)`} />
        </motion.g>
        <motion.g
          animate={{ rotate: [4, -3, 4] }}
          transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut', delay: 0.12 }}
          style={{ originX: '228px', originY: '148px' }}
        >
          <ellipse cx="232" cy="152" rx="12" ry="16" fill={`url(#${uid}skin)`} />
        </motion.g>

        {/* Шея */}
        <rect x="138" y="108" width="24" height="22" rx="6" fill={`url(#${uid}skin)`} />

        {/* Голова — опущена вниз */}
        <g transform="translate(150, 98) rotate(14)">
          <ellipse cx="0" cy="0" rx="36" ry="40" fill={`url(#${uid}skin)`} />
          {/* Ковбойская шляпа */}
          <ellipse cx="0" cy="-34" rx="48" ry="9" fill="#292524" />
          <path d="M-38 -34 Q0 -68 38 -34 Q28 -38 0 -40 Q-28 -38 -38 -34" fill={`url(#${uid}hat)`} />
          <ellipse cx="0" cy="-36" rx="26" ry="5" fill="#0c0a09" />
          {/* Тёмные очки */}
          <path d="M-32 -6 Q-18 -14 -4 -6 L-4 4 Q-18 8 -32 2 Z" fill={`url(#${uid}lens)`} stroke="#000" strokeWidth="1.5" />
          <path d="M4 -6 Q18 -14 32 -6 L32 2 Q18 8 4 4 Z" fill={`url(#${uid}lens)`} stroke="#000" strokeWidth="1.5" />
          <path d="M-4 0 H4" stroke="#171717" strokeWidth="2" />
          <path d="M-38 -4 Q-44 -2 -48 2" stroke="#171717" strokeWidth="2" fill="none" />
          <path d="M38 -4 Q44 -2 48 2" stroke="#171717" strokeWidth="2" fill="none" />
          <ellipse cx="-18" cy="-8" rx="5" ry="2" fill="rgba(255,255,255,0.12)" />
          <ellipse cx="18" cy="-8" rx="5" ry="2" fill="rgba(255,255,255,0.12)" />
          {/* Рот — спокойный */}
          <path d="M-10 14 Q0 18 10 14" stroke="#57534e" strokeWidth="1.5" fill="none" strokeLinecap="round" />
        </g>

        {/* Искры */}
        <motion.circle cx="60" cy="90" r="2" fill="#fbbf24" animate={{ opacity: [0.2, 1, 0.2] }} transition={{ duration: 2, repeat: Infinity }} />
        <motion.circle cx="240" cy="100" r="2" fill="#38bdf8" animate={{ opacity: [0.2, 1, 0.2] }} transition={{ duration: 2.2, repeat: Infinity, delay: 0.5 }} />
      </motion.svg>
    </motion.div>
  );
}
