'use client';

import { motion } from 'framer-motion';
import styles from './CardDealerHero.module.css';

const CARDS = [
  { rot: -38, x: -58, y: 4, delay: 0, suit: '♠', red: false },
  { rot: -18, x: -28, y: -2, delay: 0.07, suit: '♥', red: true },
  { rot: 0, x: 0, y: -6, delay: 0.14, suit: '♦', red: true },
  { rot: 18, x: 28, y: -2, delay: 0.21, suit: '♣', red: false },
  { rot: 38, x: 58, y: 4, delay: 0.28, suit: '♠', red: false },
];

function HandPaths({ uid }: { uid: string }) {
  const glove = `url(#${uid}glove)`;
  const stroke = '#94a3b8';
  return (
    <>
      <path d="M-18 50 L-38 68 L-32 72 L-14 56 Z" fill="#121212" />
      <path d="M-14 48 L-30 62 L-26 66 L-12 52 Z" fill="#1a1a1a" stroke="#262626" strokeWidth="0.4" />

      {/* манжета перчатки */}
      <path d="M-24 48 L16 52 L18 60 L-22 56 Z" fill="#0f172a" />
      <path d="M-20 44 L14 48 L16 52 L-18 48 Z" fill="#1e293b" stroke="#334155" strokeWidth="0.5" />
      <path d="M-18 46 L12 50" stroke="#475569" strokeWidth="0.5" opacity="0.6" />
      <path d="M-16 48 L10 52" stroke="#475569" strokeWidth="0.5" opacity="0.45" />

      <path
        d="M-14 44 C-8 42 4 40 10 36 C13 33 13 29 9 27 C3 25 -6 29 -10 35 C-12 39 -13 42 -14 44 Z"
        fill={glove}
        stroke={stroke}
        strokeWidth="0.4"
      />
      <path
        d="M-10 36 C-4 32 8 28 14 22 C18 16 16 10 10 8 C4 6 -2 10 -6 16 C-10 24 -12 32 -10 36 Z"
        fill={glove}
        stroke={stroke}
        strokeWidth="0.4"
      />
      <path d="M-2 24 C4 20 10 18 14 22" fill={`url(#${uid}gloveShade)`} opacity="0.22" />
      <path
        d="M14 22 C20 20 25 15 23 10 C21 6 17 8 15 12 C13 16 12 19 14 22 Z"
        fill={glove}
        stroke={stroke}
        strokeWidth="0.35"
      />
      <path d="M20 12 C22 10 23 8 22 7" stroke="#e2e8f0" strokeWidth="0.35" fill="none" opacity="0.55" />
      <path
        d="M16 10 C19 2 22 -5 21 -11 C19 -13 17 -9 16 -3 C15 3 14 8 16 10 Z"
        fill={glove}
        stroke={stroke}
        strokeWidth="0.35"
      />
      <path d="M19 -1 C20 -5 21 -9 20 -11" stroke="#cbd5e1" strokeWidth="0.3" fill="none" opacity="0.5" />
      <path
        d="M10 8 C13 -3 16 -12 14 -19 C12 -21 10 -15 9 -7 C8 0 8 5 10 8 Z"
        fill={glove}
        stroke={stroke}
        strokeWidth="0.35"
      />
      <path d="M13 -3 L14 -9" stroke="#cbd5e1" strokeWidth="0.3" opacity="0.5" />
      <path
        d="M4 10 C6 0 8 -8 6 -14 C4 -15 3 -9 2 -3 C1 3 2 8 4 10 Z"
        fill={glove}
        stroke={stroke}
        strokeWidth="0.35"
      />
      <path
        d="M-2 14 C-1 6 1 0 -1 -5 C-3 -6 -4 -1 -4 4 C-4 10 -3 14 -2 14 Z"
        fill={glove}
        stroke={stroke}
        strokeWidth="0.35"
      />
      {/* блики на перчатках */}
      <path d="M6 14 L12 10 L10 18 Z" fill="rgba(255,255,255,0.35)" />
      <path d="M14 18 L20 14 L18 24 Z" fill="rgba(255,255,255,0.28)" />
      <path d="M18 -2 L22 -8 L20 -4 Z" fill="rgba(255,255,255,0.2)" />
    </>
  );
}

function LeftHand({ uid }: { uid: string }) {
  return (
    <g transform="translate(-82, 6) rotate(-4)">
      <HandPaths uid={uid} />
    </g>
  );
}

function RightHand({ uid }: { uid: string }) {
  return (
    <g transform="translate(82, 6) scale(-1, 1) rotate(-4)">
      <HandPaths uid={uid} />
    </g>
  );
}

function Card({
  rot,
  x,
  y,
  delay,
  suit,
  red,
  uid,
}: (typeof CARDS)[0] & { uid: string }) {
  const ink = red ? '#9f1239' : '#0f172a';
  return (
    <motion.g
      animate={{
        rotate: [rot - 5, rot + 7, rot - 5],
        y: [y + 4, y - 8, y + 4],
      }}
      transition={{ duration: 1.8, repeat: Infinity, delay, ease: 'easeInOut' }}
    >
      <g transform={`translate(${x}, ${y}) rotate(${rot})`}>
        <rect x="-20" y="-30" width="40" height="56" rx="3.5" fill="#0c0c0c" />
        <rect x="-18.5" y="-28.5" width="37" height="53" rx="3" fill={`url(#${uid}ivory)`} stroke="#d4af37" strokeWidth="0.9" />
        <rect x="-16" y="-26" width="32" height="48" rx="2" fill={`url(#${uid}paper)`} />
        <text x="-10" y="-14" fontSize="13" fontWeight="700" fill={ink} fontFamily="Georgia, serif">{suit}</text>
        <text x="10" y="22" fontSize="13" fontWeight="700" fill={ink} fontFamily="Georgia, serif" transform="rotate(180)">{suit}</text>
        <path d="M-6 -2 L6 -2 L0 8 Z" fill="none" stroke={ink} strokeWidth="0.6" opacity="0.25" />
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
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.55 }}
      aria-hidden
    >
      <div className={styles.spotlight} />
      <div className={styles.vignette} />

      <motion.svg
        className={styles.svg}
        viewBox="0 0 320 240"
        fill="none"
        animate={{ y: [0, -2, 0] }}
        transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
      >
        <defs>
          <radialGradient id={`${uid}spot`} cx="50%" cy="30%" r="65%">
            <stop offset="0%" stopColor="rgba(251,191,36,0.12)" />
            <stop offset="100%" stopColor="rgba(0,0,0,0)" />
          </radialGradient>
          <linearGradient id={`${uid}coat`} x1="0" y1="0" x2="0" y2="1">
            <stop stopColor="#1c1917" />
            <stop offset="1" stopColor="#030712" />
          </linearGradient>
          <linearGradient id={`${uid}hat`} x1="0" y1="0" x2="0" y2="1">
            <stop stopColor="#3f3f46" />
            <stop offset="0.55" stopColor="#18181b" />
            <stop offset="1" stopColor="#09090b" />
          </linearGradient>
          <linearGradient id={`${uid}brim`} x1="0" y1="0" x2="0" y2="1">
            <stop stopColor="#27272a" />
            <stop offset="1" stopColor="#0a0a0a" />
          </linearGradient>
          <linearGradient id={`${uid}lens`} x1="0" y1="0" x2="1" y2="1">
            <stop stopColor="#000" />
            <stop offset="0.45" stopColor="#0a0a0a" />
            <stop offset="1" stopColor="#171717" />
          </linearGradient>
          <linearGradient id={`${uid}ivory`} x1="0" y1="0" x2="0" y2="1">
            <stop stopColor="#faf8f2" />
            <stop offset="1" stopColor="#e7e2d6" />
          </linearGradient>
          <linearGradient id={`${uid}paper`} x1="0" y1="0" x2="1" y2="1">
            <stop stopColor="#fffef9" />
            <stop offset="1" stopColor="#f5f0e6" />
          </linearGradient>
          <linearGradient id={`${uid}glove`} x1="0.1" y1="0" x2="0.9" y2="1">
            <stop stopColor="#ffffff" />
            <stop offset="0.4" stopColor="#f8fafc" />
            <stop offset="0.75" stopColor="#e2e8f0" />
            <stop offset="1" stopColor="#cbd5e1" />
          </linearGradient>
          <linearGradient id={`${uid}gloveShade`} x1="0" y1="0" x2="1" y2="0">
            <stop stopColor="#94a3b8" stopOpacity="0.2" />
            <stop offset="1" stopColor="#fff" stopOpacity="0" />
          </linearGradient>
          <filter id={`${uid}soft`} x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="6" stdDeviation="6" floodColor="#000" floodOpacity="0.55" />
          </filter>
          <filter id={`${uid}cardGlow`} x="-40%" y="-40%" width="180%" height="180%">
            <feDropShadow dx="0" dy="8" stdDeviation="5" floodColor="#000" floodOpacity="0.65" />
          </filter>
        </defs>

        <rect width="320" height="240" fill={`url(#${uid}spot)`} opacity="0.6" />
        <ellipse cx="160" cy="218" rx="90" ry="14" fill="rgba(0,0,0,0.55)" />

        {/* ── ЗАДНИЙ ПЛАН: силуэт фокусника ── */}
        <g filter={`url(#${uid}soft)`}>
          {/* Плечи / плащ */}
          <path
            d="M72 118 C110 102 210 102 248 118 L258 210 C210 228 110 228 62 210 Z"
            fill={`url(#${uid}coat)`}
          />
          <path d="M128 118 L160 132 L192 118 L188 210 L132 210 Z" fill="#0f0f10" opacity="0.85" />
          <path d="M145 128 L160 140 L175 128" stroke="#3f3f46" strokeWidth="0.8" fill="none" opacity="0.6" />

          {/* Рукава к запястьям */}
          <path d="M72 128 C58 138 50 158 54 178 L68 172 C64 158 70 142 88 136 Z" fill="#141414" />
          <path d="M248 128 C262 138 270 158 266 178 L252 172 C256 158 250 142 232 136 Z" fill="#141414" />
          <path d="M54 178 L68 172 L72 184 L58 190 Z" fill="#0a0a0a" />
          <path d="M266 178 L252 172 L248 184 L262 190 Z" fill="#0a0a0a" />

          {/* Шея в тени */}
          <path d="M148 108 L160 118 L172 108 L168 128 L152 128 Z" fill="#0a0a0a" />

          {/* Голова + шляпа — лицо НЕ видно */}
          <g transform="translate(160, 72) rotate(8)">
            {/* Тень лица (полностью скрыто) */}
            <ellipse cx="0" cy="18" rx="34" ry="38" fill="#050505" />

            {/* Поля шляпы — закрывают верх лица */}
            <ellipse cx="0" cy="2" rx="62" ry="11" fill={`url(#${uid}brim)`} />
            <path d="M-46 2 C-28 -8 28 -8 46 2 L42 8 C0 2 -42 8 -46 2 Z" fill="#0a0a0a" opacity="0.85" />

            {/* Кrown шляпы */}
            <path d="M-30 2 Q0 -42 30 2 Q22 -2 0 -4 Q-22 -2 -30 2" fill={`url(#${uid}hat)`} />
            <path d="M-22 0 Q0 -32 22 0" stroke="#52525b" strokeWidth="0.8" fill="none" opacity="0.5" />
            <ellipse cx="0" cy="-2" rx="20" ry="4" fill="#050505" />

            {/* Очки — единственное «лицо» */}
            <g transform="translate(0, 22)">
              <path d="M-36 -4 L-8 -4 L-8 10 L-36 10 Q-42 4 -36 -4" fill={`url(#${uid}lens)`} stroke="#a1a1aa" strokeWidth="1.2" />
              <path d="M8 -4 L36 -4 Q42 4 36 10 L8 10 Z" fill={`url(#${uid}lens)`} stroke="#a1a1aa" strokeWidth="1.2" />
              <path d="M-8 2 H8" stroke="#71717a" strokeWidth="1.4" />
              <path d="M-44 0 Q-50 2 -54 6" stroke="#71717a" strokeWidth="1.2" fill="none" />
              <path d="M44 0 Q50 2 54 6" stroke="#71717a" strokeWidth="1.2" fill="none" />
              {/* Блики на стеклах */}
              <path d="M-30 -1 L-22 -1 L-26 4 Z" fill="rgba(255,255,255,0.18)" />
              <path d="M14 -1 L22 -1 L18 4 Z" fill="rgba(255,255,255,0.18)" />
              <ellipse cx="-22" cy="4" rx="8" ry="3" fill="rgba(255,255,255,0.04)" />
              <ellipse cx="22" cy="4" rx="8" ry="3" fill="rgba(255,255,255,0.04)" />
            </g>

            {/* Тень от полей на очки */}
            <path d="M-40 8 Q0 18 40 8 L36 14 Q0 24 -36 14 Z" fill="#000" opacity="0.45" />
          </g>
        </g>

        {/* ── ПЕРЕДНИЙ ПЛАН: карты, затем руки поверх (обхват веера) ── */}
        <g transform="translate(160, 168)" filter={`url(#${uid}cardGlow)`}>
          {CARDS.map((c) => (
            <Card key={`${c.suit}-${c.rot}`} {...c} uid={uid} />
          ))}

          <motion.g
            animate={{ rotate: [-2, 1.5, -2], y: [0, -1, 0] }}
            transition={{ duration: 1.7, repeat: Infinity, ease: 'easeInOut' }}
          >
            <LeftHand uid={uid} />
          </motion.g>
          <motion.g
            animate={{ rotate: [2, -1.5, 2], y: [0, -1, 0] }}
            transition={{ duration: 1.7, repeat: Infinity, ease: 'easeInOut', delay: 0.08 }}
          >
            <RightHand uid={uid} />
          </motion.g>
        </g>

        {/* Лёгкая пыль / искры */}
        <motion.circle cx="48" cy="80" r="1.5" fill="#fbbf24" animate={{ opacity: [0.1, 0.7, 0.1] }} transition={{ duration: 2.5, repeat: Infinity }} />
        <motion.circle cx="272" cy="88" r="1.5" fill="#fbbf24" animate={{ opacity: [0.1, 0.6, 0.1] }} transition={{ duration: 2.8, repeat: Infinity, delay: 0.6 }} />
      </motion.svg>
    </motion.div>
  );
}
