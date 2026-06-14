'use client';

import { motion } from 'framer-motion';
import styles from './CardDealerHero.module.css';

type Suit = 'spades' | 'hearts' | 'diamonds' | 'clubs';

interface OrbitCard {
  rank: string;
  suit: Suit;
  radius: number;
  duration: number;
  delay: number;
  orbitClass: string;
  counterClass: string;
}

const ORBIT_CARDS: OrbitCard[] = [
  { rank: 'A', suit: 'spades', radius: 78, duration: 11, delay: 0, orbitClass: 'orbit1', counterClass: 'counter1' },
  { rank: 'K', suit: 'hearts', radius: 98, duration: 15, delay: -2.5, orbitClass: 'orbit2', counterClass: 'counter2' },
  { rank: 'Q', suit: 'diamonds', radius: 68, duration: 9, delay: -5, orbitClass: 'orbit3', counterClass: 'counter3' },
  { rank: 'J', suit: 'clubs', radius: 108, duration: 17, delay: -7, orbitClass: 'orbit4', counterClass: 'counter4' },
  { rank: '10', suit: 'spades', radius: 88, duration: 13, delay: -10, orbitClass: 'orbit5', counterClass: 'counter5' },
];

const SUIT_GLYPH: Record<Suit, string> = {
  spades: '♠',
  hearts: '♥',
  diamonds: '♦',
  clubs: '♣',
};

const RED_SUITS = new Set<Suit>(['hearts', 'diamonds']);

function MiniCard({ rank, suit }: { rank: string; suit: Suit }) {
  const red = RED_SUITS.has(suit);
  const fill = red ? '#b91c1c' : '#0f172a';
  const glyph = SUIT_GLYPH[suit];
  const isAce = rank === 'A';
  const w = 40;
  const h = 58;

  return (
    <g filter={isAce ? 'url(#aceGlow)' : 'url(#cardShadow)'} transform={`translate(${-w / 2} ${-h / 2})`}>
      <rect x={0} y={0} width={w} height={h} rx={5} className={styles.cardBody} />
      <rect x={3} y={3} width={w - 6} height={h - 6} rx={3} className={styles.cardInnerLine} />
      <text x={6} y={14} className={styles.cardRankSm} fill={fill}>
        {rank}
      </text>
      <text x={6} y={24} className={styles.cardSuitXs} fill={fill}>
        {glyph}
      </text>
      <text x={w / 2} y={h / 2 + 4} textAnchor="middle" className={styles.cardSuitMd} fill={fill}>
        {glyph}
      </text>
    </g>
  );
}

function OrbitCardNode({ card }: { card: OrbitCard }) {
  const orbitCls = styles[card.orbitClass as keyof typeof styles] as string;
  const counterCls = styles[card.counterClass as keyof typeof styles] as string;

  return (
    <g
      className={orbitCls}
      style={{ animationDuration: `${card.duration}s`, animationDelay: `${card.delay}s` }}
    >
      <g transform={`translate(${card.radius} 0)`}>
        <g
          className={counterCls}
          style={{ animationDuration: `${card.duration}s`, animationDelay: `${card.delay}s` }}
        >
          <MiniCard rank={card.rank} suit={card.suit} />
        </g>
      </g>
    </g>
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
      initial={{ opacity: 0, y: 14, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
      aria-hidden
    >
      <svg
        className={styles.canvas}
        viewBox="0 0 400 300"
        xmlns="http://www.w3.org/2000/svg"
        role="img"
        aria-label="Карточный дилер"
      >
        <defs>
          <linearGradient id="bgGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#141b2d" />
            <stop offset="55%" stopColor="#0a0f18" />
            <stop offset="100%" stopColor="#040608" />
          </linearGradient>
          <radialGradient id="spotlight" cx="50%" cy="0%" r="70%">
            <stop offset="0%" stopColor="#ffd68a" stopOpacity="0.32" />
            <stop offset="45%" stopColor="#fbbf24" stopOpacity="0.07" />
            <stop offset="100%" stopColor="#000" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="feltGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#145a45" />
            <stop offset="100%" stopColor="#0a3228" />
          </linearGradient>
          <linearGradient id="tuxGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#2a2a2e" />
            <stop offset="40%" stopColor="#121214" />
            <stop offset="100%" stopColor="#050505" />
          </linearGradient>
          <linearGradient id="cowboyHatGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#3f3f46" />
            <stop offset="35%" stopColor="#18181b" />
            <stop offset="100%" stopColor="#030303" />
          </linearGradient>
          <linearGradient id="cardFaceGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#fffef8" />
            <stop offset="100%" stopColor="#ebe3d0" />
          </linearGradient>
          <linearGradient id="lensGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#1a1a1a" />
            <stop offset="100%" stopColor="#000000" />
          </linearGradient>
          <linearGradient id="synapseGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#6366f1" stopOpacity="0" />
            <stop offset="50%" stopColor="#a78bfa" stopOpacity="0.7" />
            <stop offset="100%" stopColor="#6366f1" stopOpacity="0" />
          </linearGradient>
          <filter id="softShadow" x="-30%" y="-30%" width="160%" height="160%">
            <feDropShadow dx="0" dy="8" stdDeviation="8" floodColor="#000" floodOpacity="0.55" />
          </filter>
          <filter id="aceGlow" x="-80%" y="-80%" width="260%" height="260%">
            <feDropShadow dx="0" dy="0" stdDeviation="4" floodColor="#fbbf24" floodOpacity="0.55" />
            <feDropShadow dx="0" dy="5" stdDeviation="4" floodColor="#000" floodOpacity="0.35" />
          </filter>
          <filter id="cardShadow" x="-50%" y="-20%" width="200%" height="200%">
            <feDropShadow dx="0" dy="4" stdDeviation="3" floodColor="#000" floodOpacity="0.4" />
          </filter>
          <filter id="nodeGlow" x="-100%" y="-100%" width="300%" height="300%">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <radialGradient id="vignetteRadial" cx="50%" cy="42%" r="68%">
            <stop offset="35%" stopColor="#000" stopOpacity="0" />
            <stop offset="100%" stopColor="#000" stopOpacity="0.5" />
          </radialGradient>
        </defs>

        <rect width="400" height="300" fill="url(#bgGrad)" />
        <rect width="400" height="300" fill="url(#spotlight)" />

        {/* Neural orbit rings */}
        <g className={styles.neuralNet} opacity="0.55">
          <ellipse cx="200" cy="128" rx="72" ry="42" fill="none" stroke="#6366f1" strokeWidth="0.8" opacity="0.35" />
          <ellipse cx="200" cy="128" rx="98" ry="58" fill="none" stroke="#818cf8" strokeWidth="0.6" opacity="0.28" />
          <ellipse cx="200" cy="128" rx="112" ry="68" fill="none" stroke="#a78bfa" strokeWidth="0.5" opacity="0.2" />
          <path
            d="M108 128 Q200 68 292 128"
            fill="none"
            stroke="url(#synapseGrad)"
            strokeWidth="1"
            className={styles.synapseLine}
          />
          <path
            d="M118 148 Q200 188 282 118"
            fill="none"
            stroke="url(#synapseGrad)"
            strokeWidth="0.8"
            className={styles.synapseLine}
            style={{ animationDelay: '1.2s' }}
          />
          <path
            d="M130 108 Q200 148 270 138"
            fill="none"
            stroke="#38bdf8"
            strokeWidth="0.6"
            opacity="0.35"
            className={styles.synapseLine}
            style={{ animationDelay: '2.4s' }}
          />
          <circle cx="108" cy="128" r="3" fill="#818cf8" className={styles.nodePulse} filter="url(#nodeGlow)" />
          <circle cx="292" cy="128" r="3" fill="#818cf8" className={styles.nodePulse} style={{ animationDelay: '0.8s' }} filter="url(#nodeGlow)" />
          <circle cx="200" cy="68" r="2.5" fill="#fbbf24" className={styles.nodePulse} style={{ animationDelay: '1.6s' }} />
          <circle cx="200" cy="188" r="2.5" fill="#6366f1" className={styles.nodePulse} style={{ animationDelay: '2.2s' }} />
        </g>

        {/* Dealer — torso goes under table */}
        <g className={styles.dealerFloat} filter="url(#softShadow)">
          <path
            d="M82 112 Q200 86 318 112 L338 268 Q200 278 62 268 Z"
            fill="url(#tuxGrad)"
          />
          <path
            d="M124 112 Q200 102 276 112 L262 228 Q200 238 138 228 Z"
            fill="#18181b"
            opacity="0.88"
          />
          <path d="M164 112 L200 142 L236 112 L200 102 Z" fill="#f8fafc" />
          <path d="M182 122 L200 132 L218 122 L200 116 Z" fill="#0a0a0a" />
          <rect x="188" y="102" width="24" height="16" rx="4" fill="#050505" />

          {/* Black cowboy hat */}
          <ellipse cx="200" cy="86" rx="102" ry="16" fill="#050505" />
          <ellipse cx="200" cy="88" rx="96" ry="11" fill="#0a0a0a" opacity="0.85" />
          <path
            d="M148 86 C152 28 178 18 200 14 C222 18 248 28 252 86 C248 80 224 74 200 74 C176 74 152 80 148 86 Z"
            fill="url(#cowboyHatGrad)"
          />
          <path
            d="M200 18 C200 18 188 42 186 78 C194 76 206 76 214 78 C212 42 200 18 200 18 Z"
            fill="#27272a"
            opacity="0.55"
          />
          <path
            d="M168 52 Q200 44 232 52"
            fill="none"
            stroke="rgba(255,255,255,0.07)"
            strokeWidth="2"
          />
          <ellipse cx="200" cy="84" rx="54" ry="5" fill="#18181b" opacity="0.6" />

          {/* Glasses */}
          <g>
            <rect x="160" y="106" width="28" height="14" rx="3" fill="url(#lensGrad)" stroke="#52525b" strokeWidth="1.5" />
            <rect x="212" y="106" width="28" height="14" rx="3" fill="url(#lensGrad)" stroke="#52525b" strokeWidth="1.5" />
            <path d="M188 113 H212" stroke="#52525b" strokeWidth="2" />
            <path d="M164 110 L172 108" stroke="rgba(255,255,255,0.22)" strokeWidth="1.5" strokeLinecap="round" />
            <path d="M216 110 L224 108" stroke="rgba(255,255,255,0.22)" strokeWidth="1.5" strokeLinecap="round" />
          </g>

          <path d="M124 124 L144 248 L164 228 L154 124 Z" fill="rgba(255,255,255,0.04)" />
          <path d="M276 124 L256 248 L236 228 L246 124 Z" fill="rgba(255,255,255,0.04)" />
        </g>

        {/* Orbiting cards — around dealer */}
        <g transform="translate(200 128)">
          {ORBIT_CARDS.map((card) => (
            <OrbitCardNode key={`${card.rank}-${card.suit}-${card.radius}`} card={card} />
          ))}
        </g>

        {/* Table — covers hands / lower body */}
        <path
          d="M0 238 Q200 208 400 238 L400 300 L0 300 Z"
          fill="url(#feltGrad)"
        />
        <path
          d="M0 238 Q200 208 400 238"
          fill="none"
          stroke="#d4af37"
          strokeWidth="2.5"
          opacity="0.4"
        />
        <path
          d="M20 242 Q200 228 380 242"
          fill="none"
          stroke="rgba(255,255,255,0.06)"
          strokeWidth="1"
        />

        <rect width="400" height="300" className={styles.vignetteOverlay} />

        <circle className={styles.sparkle} cx="48" cy="44" r="2" />
        <circle className={styles.sparkle} cx="352" cy="58" r="1.5" style={{ animationDelay: '0.8s' }} />
        <circle className={styles.sparkle} cx="310" cy="32" r="2" style={{ animationDelay: '1.4s' }} />
        <circle className={styles.sparkle} cx="88" cy="68" r="1.5" style={{ animationDelay: '2s' }} />
      </svg>

      <div className={styles.frameGlow} />
    </motion.div>
  );
}
