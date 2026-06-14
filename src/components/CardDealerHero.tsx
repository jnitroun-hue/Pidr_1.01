'use client';

import { motion } from 'framer-motion';
import styles from './CardDealerHero.module.css';

type Suit = 'spades' | 'hearts' | 'diamonds' | 'clubs';

interface FanCard {
  rank: string;
  suit: Suit;
  angle: number;
  lift: number;
}

const FAN: FanCard[] = [
  { rank: '10', suit: 'clubs', angle: -34, lift: 0 },
  { rank: 'J', suit: 'diamonds', angle: -17, lift: 4 },
  { rank: 'A', suit: 'spades', angle: 0, lift: 8 },
  { rank: 'Q', suit: 'hearts', angle: 17, lift: 4 },
  { rank: 'K', suit: 'clubs', angle: 34, lift: 0 },
];

const SUIT_GLYPH: Record<Suit, string> = {
  spades: '♠',
  hearts: '♥',
  diamonds: '♦',
  clubs: '♣',
};

const RED_SUITS = new Set<Suit>(['hearts', 'diamonds']);

function CardFace({ rank, suit, x, y, angle, lift }: FanCard & { x: number; y: number }) {
  const red = RED_SUITS.has(suit);
  const fill = red ? '#b91c1c' : '#0f172a';
  const glyph = SUIT_GLYPH[suit];
  const isAce = rank === 'A';

  return (
    <g transform={`translate(${x} ${y - lift}) rotate(${angle})`} filter={isAce ? 'url(#aceGlow)' : undefined}>
      <rect
        x={-27}
        y={-78}
        width={54}
        height={78}
        rx={6}
        ry={6}
        className={styles.cardBody}
      />
      <rect x={-24} y={-75} width={48} height={72} rx={4} className={styles.cardInnerLine} />
      <text x={-20} y={-58} className={styles.cardRank} fill={fill}>
        {rank}
      </text>
      <text x={-20} y={-46} className={styles.cardSuitSm} fill={fill}>
        {glyph}
      </text>
      <text x={0} y={-18} textAnchor="middle" className={styles.cardSuitLg} fill={fill}>
        {glyph}
      </text>
      <g transform="rotate(180)">
        <text x={-20} y={58} className={styles.cardRank} fill={fill}>
          {rank}
        </text>
        <text x={-20} y={46} className={styles.cardSuitSm} fill={fill}>
          {glyph}
        </text>
      </g>
      <ellipse cx={0} cy={6} rx={22} ry={5} className={styles.cardDropShadow} />
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
            <stop offset="0%" stopColor="#ffd68a" stopOpacity="0.35" />
            <stop offset="45%" stopColor="#fbbf24" stopOpacity="0.08" />
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
          <linearGradient id="hatGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#52525b" />
            <stop offset="50%" stopColor="#27272a" />
            <stop offset="100%" stopColor="#09090b" />
          </linearGradient>
          <linearGradient id="gloveGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="55%" stopColor="#e2e8f0" />
            <stop offset="100%" stopColor="#94a3b8" />
          </linearGradient>
          <linearGradient id="cardFaceGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#fffef8" />
            <stop offset="100%" stopColor="#ebe3d0" />
          </linearGradient>
          <linearGradient id="lensGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#1a1a1a" />
            <stop offset="100%" stopColor="#000000" />
          </linearGradient>
          <filter id="softShadow" x="-30%" y="-30%" width="160%" height="160%">
            <feDropShadow dx="0" dy="8" stdDeviation="8" floodColor="#000" floodOpacity="0.55" />
          </filter>
          <filter id="aceGlow" x="-80%" y="-80%" width="260%" height="260%">
            <feDropShadow dx="0" dy="0" stdDeviation="4" floodColor="#fbbf24" floodOpacity="0.55" />
            <feDropShadow dx="0" dy="6" stdDeviation="5" floodColor="#000" floodOpacity="0.4" />
          </filter>
          <filter id="cardShadow" x="-50%" y="-20%" width="200%" height="200%">
            <feDropShadow dx="0" dy="6" stdDeviation="4" floodColor="#000" floodOpacity="0.45" />
          </filter>
          <radialGradient id="vignetteRadial" cx="50%" cy="42%" r="68%">
            <stop offset="35%" stopColor="#000" stopOpacity="0" />
            <stop offset="100%" stopColor="#000" stopOpacity="0.5" />
          </radialGradient>
        </defs>

        {/* Background */}
        <rect width="400" height="300" fill="url(#bgGrad)" />
        <rect width="400" height="300" fill="url(#spotlight)" />

        {/* Table felt */}
        <path
          d="M0 248 Q200 218 400 248 L400 300 L0 300 Z"
          fill="url(#feltGrad)"
          opacity="0.95"
        />
        <path
          d="M24 244 Q200 228 376 244"
          fill="none"
          stroke="#d4af37"
          strokeWidth="2"
          opacity="0.35"
        />

        {/* Dealer torso */}
        <g className={styles.dealerFloat} filter="url(#softShadow)">
          <path
            d="M88 118 Q200 92 312 118 L330 248 Q200 268 70 248 Z"
            fill="url(#tuxGrad)"
          />
          <path
            d="M128 118 Q200 108 272 118 L258 210 Q200 220 142 210 Z"
            fill="#18181b"
            opacity="0.85"
          />
          <path
            d="M168 118 L200 148 L232 118 L200 108 Z"
            fill="#f8fafc"
          />
          <path
            d="M182 128 L200 138 L218 128 L200 122 Z"
            fill="#0a0a0a"
          />
          <rect x="188" y="108" width="24" height="18" rx="4" fill="#050505" />

          {/* Hat */}
          <ellipse cx="200" cy="98" rx="78" ry="14" fill="#18181b" />
          <path
            d="M148 98 Q200 52 252 98 Q200 88 148 98"
            fill="url(#hatGrad)"
          />
          <rect x="148" y="94" width="104" height="8" rx="2" fill="#3f3f46" />

          {/* Glasses — only visible face detail */}
          <g>
            <rect x="162" y="112" width="30" height="16" rx="3" fill="url(#lensGrad)" stroke="#71717a" strokeWidth="1.5" />
            <rect x="208" y="112" width="30" height="16" rx="3" fill="url(#lensGrad)" stroke="#71717a" strokeWidth="1.5" />
            <path d="M192 120 H208" stroke="#71717a" strokeWidth="2" />
            <path d="M166 116 L174 114" stroke="rgba(255,255,255,0.25)" strokeWidth="2" strokeLinecap="round" />
            <path d="M212 116 L220 114" stroke="rgba(255,255,255,0.25)" strokeWidth="2" strokeLinecap="round" />
          </g>

          {/* Lapels highlight */}
          <path d="M128 130 L148 230 L168 210 L158 130 Z" fill="rgba(255,255,255,0.04)" />
          <path d="M272 130 L252 230 L232 210 L242 130 Z" fill="rgba(255,255,255,0.04)" />
        </g>

        {/* Card fan */}
        <g className={styles.cardFan} filter="url(#cardShadow)">
          {FAN.map((card) => (
            <CardFace key={`${card.rank}-${card.suit}`} {...card} x={200} y={218} />
          ))}
        </g>

        {/* Gloved hands — поверх веера */}
        <g className={styles.handsFloat}>
          <path
            d="M114 226 C102 208 112 192 132 188 C142 186 152 192 156 200
               C158 194 166 188 176 190 C184 192 188 200 186 210
               C182 222 168 230 148 232 C128 234 116 232 114 226 Z"
            fill="url(#gloveGrad)"
            stroke="#94a3b8"
            strokeWidth="0.8"
          />
          <path
            d="M286 226 C298 208 288 192 268 188 C258 186 248 192 244 200
               C242 194 234 188 224 190 C216 192 212 200 214 210
               C218 222 232 230 252 232 C272 234 284 232 286 226 Z"
            fill="url(#gloveGrad)"
            stroke="#94a3b8"
            strokeWidth="0.8"
          />
          <path d="M128 194 Q132 204 130 214" stroke="#64748b" strokeWidth="0.8" fill="none" opacity="0.45" />
          <path d="M142 192 Q146 202 144 212" stroke="#64748b" strokeWidth="0.8" fill="none" opacity="0.45" />
          <path d="M154 194 Q150 204 152 212" stroke="#64748b" strokeWidth="0.8" fill="none" opacity="0.45" />
          <path d="M272 194 Q268 204 270 214" stroke="#64748b" strokeWidth="0.8" fill="none" opacity="0.45" />
          <path d="M258 192 Q254 202 256 212" stroke="#64748b" strokeWidth="0.8" fill="none" opacity="0.45" />
          <path d="M246 194 Q250 204 248 212" stroke="#64748b" strokeWidth="0.8" fill="none" opacity="0.45" />
          <rect x="122" y="230" width="40" height="9" rx="2" fill="#1e293b" />
          <rect x="238" y="230" width="40" height="9" rx="2" fill="#1e293b" />
        </g>

        {/* Vignette + sparkles */}
        <rect width="400" height="300" fill="url(#spotlight)" opacity="0" />
        <ellipse cx="200" cy="150" rx="190" ry="130" fill="none" stroke="transparent" />
        <rect width="400" height="300" className={styles.vignetteOverlay} />

        <circle className={styles.sparkle} cx="52" cy="48" r="2" />
        <circle className={styles.sparkle} cx="348" cy="62" r="1.5" style={{ animationDelay: '0.8s' }} />
        <circle className={styles.sparkle} cx="320" cy="36" r="2" style={{ animationDelay: '1.4s' }} />
        <circle className={styles.sparkle} cx="80" cy="72" r="1.5" style={{ animationDelay: '2s' }} />
      </svg>

      <div className={styles.frameGlow} />
    </motion.div>
  );
}
