'use client';

import { motion } from 'framer-motion';
import styles from './CardDealerHero.module.css';

const CARDS = [
  { rot: -36, x: -56, y: 6, delay: 0, suit: '♠', red: false },
  { rot: -17, x: -27, y: 0, delay: 0.06, suit: '♥', red: true },
  { rot: 0, x: 0, y: -4, delay: 0.12, suit: '♦', red: true },
  { rot: 17, x: 27, y: 0, delay: 0.18, suit: '♣', red: false },
  { rot: 36, x: 56, y: 6, delay: 0.24, suit: '♠', red: false },
];

function Card3D({
  rot,
  x,
  y,
  delay,
  suit,
  red,
  uid,
}: (typeof CARDS)[0] & { uid: string }) {
  const ink = red ? '#be123c' : '#0f172a';
  const inkDark = red ? '#881337' : '#020617';

  return (
    <motion.g
      animate={{
        rotate: [rot - 4, rot + 5, rot - 4],
        y: [y + 3, y - 6, y + 3],
      }}
      transition={{ duration: 2.1, repeat: Infinity, delay, ease: 'easeInOut' }}
    >
      <g transform={`translate(${x}, ${y}) rotate(${rot})`}>
        {/* тень под картой */}
        <ellipse cx="2" cy="32" rx="18" ry="5" fill="rgba(0,0,0,0.45)" />

        {/* торец (толщина) */}
        <path
          d="M18 -28 L22 -26 L22 26 L18 24 Z"
          fill={`url(#${uid}cardEdge)`}
        />
        <path d="M18 24 L22 26 L22 28 L18 26 Z" fill="#1a1208" opacity="0.9" />

        {/* задняя грань */}
        <rect x="-19" y="-29" width="38" height="55" rx="3" fill="#0a0a0a" transform="translate(-1, 1)" />

        {/* лицевая сторона */}
        <rect x="-18" y="-28" width="36" height="54" rx="3.2" fill={`url(#${uid}cardFace)`} />
        <rect
          x="-18"
          y="-28"
          width="36"
          height="54"
          rx="3.2"
          fill="none"
          stroke={`url(#${uid}cardRim)`}
          strokeWidth="1.1"
        />

        {/* блик */}
        <path
          d="M-16 -26 L-4 -26 L-14 -8 Z"
          fill="rgba(255,255,255,0.22)"
          opacity="0.85"
        />

        {/* масть */}
        <text x="-9" y="-12" fontSize="12" fontWeight="700" fill={ink} fontFamily="Georgia, serif">
          {suit}
        </text>
        <text
          x="9"
          y="20"
          fontSize="12"
          fontWeight="700"
          fill={inkDark}
          fontFamily="Georgia, serif"
          transform="rotate(180)"
        >
          {suit}
        </text>
        <circle cx="0" cy="2" r="5" fill="none" stroke={ink} strokeWidth="0.5" opacity="0.2" />
      </g>
    </motion.g>
  );
}

function GlovedHand({ uid, mirror }: { uid: string; mirror?: boolean }) {
  const g = `url(#${uid}gloveVol)`;
  const sx = mirror ? -1 : 1;
  const tx = mirror ? 84 : -84;

  return (
    <g transform={`translate(${tx}, 8) scale(${sx}, 1) rotate(-3)`}>
      {/* предплечье в рукаве */}
      <path d="M-16 52 L-34 70 L-28 74 L-12 58 Z" fill="#0a0a0a" />
      <path d="M-12 48 L-28 64 L-24 68 L-10 54 Z" fill="#151515" />

      {/* манжета */}
      <path d="M-22 50 L14 54 L16 58 L-20 54 Z" fill="#0f172a" />
      <path d="M-18 46 L12 50 L14 54 L-16 50 Z" fill="#1e293b" stroke="#334155" strokeWidth="0.35" />

      {/* ладонь — объём */}
      <path
        d="M-12 46 C-4 42 8 38 16 30 C20 24 18 16 12 12 C6 8 0 12 -4 18 C-8 28 -10 38 -12 46 Z"
        fill={g}
      />
      <path
        d="M-8 38 C0 34 10 28 14 22 C16 18 14 14 10 12 C6 10 2 14 0 18"
        fill="rgba(0,0,0,0.12)"
      />

      {/* большой палец */}
      <path
        d="M14 24 C20 22 24 16 22 11 C20 7 16 9 14 14 C12 18 12 21 14 24 Z"
        fill={g}
      />

      {/* пальцы */}
      <path d="M16 12 C19 4 22 -4 20 -12 C18 -14 16 -10 15 -4 C14 2 14 8 16 12 Z" fill={g} />
      <path d="M10 10 C13 0 15 -10 13 -18 C11 -20 9 -14 8 -6 C7 0 8 6 10 10 Z" fill={g} />
      <path d="M4 12 C6 2 8 -6 6 -12 C4 -13 3 -8 2 -2 C1 4 2 10 4 12 Z" fill={g} />
      <path d="M-2 16 C0 8 2 2 0 -4 C-2 -5 -3 0 -3 6 C-3 12 -2 16 -2 16 Z" fill={g} />

      {/* блики перчатки */}
      <path d="M4 16 L10 12 L8 22 Z" fill="rgba(255,255,255,0.45)" />
      <path d="M12 20 L18 16 L16 26 Z" fill="rgba(255,255,255,0.32)" />
      <path d="M14 2 L18 -6 L16 -2 Z" fill="rgba(255,255,255,0.25)" />
    </g>
  );
}

function DealerSilhouette({ uid }: { uid: string }) {
  return (
    <g filter={`url(#${uid}figDepth)`}>
      {/* стол / поверхность */}
      <ellipse cx="160" cy="222" rx="105" ry="16" fill="rgba(0,0,0,0.5)" />
      <ellipse cx="160" cy="218" rx="88" ry="10" fill="rgba(40,30,20,0.35)" />

      {/* плащ — объём: тёмный слой + подсветка */}
      <path
        d="M68 122 C108 104 212 104 252 122 L262 212 C210 232 110 232 58 212 Z"
        fill={`url(#${uid}coatDeep)`}
      />
      <path
        d="M88 128 C120 118 200 118 232 128 L240 200 C200 214 120 214 80 200 Z"
        fill={`url(#${uid}coatMid)`}
        opacity="0.85"
      />
      {/* лацкан слева (свет) */}
      <path d="M128 122 L148 138 L138 208 L118 198 Z" fill="rgba(255,255,255,0.04)" />
      {/* лацкан справа (тень) */}
      <path d="M192 122 L172 138 L182 208 L202 198 Z" fill="rgba(0,0,0,0.35)" />
      <path d="M142 132 L160 148 L178 132" stroke="rgba(255,255,255,0.08)" strokeWidth="0.8" fill="none" />

      {/* рукава */}
      <path d="M68 132 C52 142 46 162 50 178 L64 172 C60 158 66 144 84 138 Z" fill="#0c0c0c" />
      <path d="M252 132 C268 142 274 162 270 178 L256 172 C260 158 254 144 236 138 Z" fill="#0c0c0c" />
      <path d="M50 178 L64 172 L68 186 L54 192 Z" fill="#050505" />
      <path d="M270 178 L256 172 L252 186 L266 192 Z" fill="#050505" />

      {/* шея */}
      <path d="M146 110 L160 122 L174 110 L170 130 L150 130 Z" fill="#030303" />

      {/* голова + шляпа */}
      <g transform="translate(160, 74) rotate(6)">
        {/* голова в тени */}
        <ellipse cx="0" cy="20" rx="32" ry="36" fill="#020202" />

        {/* поля шляпы — двойной слой для объёма */}
        <ellipse cx="0" cy="4" rx="64" ry="12" fill={`url(#${uid}brimVol)`} />
        <ellipse cx="-8" cy="2" rx="48" ry="8" fill="rgba(255,255,255,0.06)" />
        <path d="M-48 4 C-24 -6 24 -6 48 4 L44 10 C0 4 -44 10 -48 4 Z" fill="rgba(0,0,0,0.55)" />

        {/* crown */}
        <path d="M-32 4 Q0 -48 32 4 Q24 0 0 -2 Q-24 0 -32 4" fill={`url(#${uid}hatVol)`} />
        <path d="M-20 2 Q0 -36 20 2" stroke="rgba(255,255,255,0.12)" strokeWidth="1" fill="none" />
        <ellipse cx="0" cy="0" rx="22" ry="5" fill="#080808" />
        {/* лента */}
        <rect x="-24" y="-2" width="48" height="5" rx="1" fill="#1a1a1a" opacity="0.9" />

        {/* очки — металл + стекло */}
        <g transform="translate(0, 24)">
          <path
            d="M-38 -5 L-8 -5 L-8 11 L-38 11 Q-44 4 -38 -5"
            fill={`url(#${uid}glass)`}
            stroke={`url(#${uid}frameMetal)`}
            strokeWidth="1.4"
          />
          <path
            d="M8 -5 L38 -5 Q44 4 38 11 L8 11 Z"
            fill={`url(#${uid}glass)`}
            stroke={`url(#${uid}frameMetal)`}
            strokeWidth="1.4"
          />
          <path d="M-8 1 H8" stroke="#71717a" strokeWidth="1.5" />
          <path d="M-46 -1 Q-52 2 -56 7" stroke="#52525b" strokeWidth="1.2" fill="none" />
          <path d="M46 -1 Q52 2 56 7" stroke="#52525b" strokeWidth="1.2" fill="none" />
          <path d="M-32 0 L-24 0 L-28 5 Z" fill="rgba(255,255,255,0.25)" />
          <path d="M16 0 L24 0 L20 5 Z" fill="rgba(255,255,255,0.25)" />
        </g>

        <path d="M-42 10 Q0 22 42 10 L38 16 Q0 28 -38 16 Z" fill="#000" opacity="0.5" />
      </g>
    </g>
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
      transition={{ duration: 0.6 }}
      aria-hidden
    >
      <div className={styles.spotlight} />
      <div className={styles.vignette} />
      <div className={styles.scene3d}>
        <motion.div
          className={styles.figureTilt}
          initial={{ rotateX: 8, rotateY: -3 }}
          animate={{ rotateX: [7, 9, 7], rotateY: [-4, -2, -4] }}
          transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
          style={{ transformPerspective: 720 }}
        >
          <motion.svg
            className={styles.svg}
            viewBox="0 0 320 260"
            fill="none"
            animate={{ y: [0, -3, 0] }}
            transition={{ duration: 5.5, repeat: Infinity, ease: 'easeInOut' }}
          >
            <defs>
              <radialGradient id={`${uid}ambLight`} cx="42%" cy="18%" r="70%">
                <stop offset="0%" stopColor="rgba(255,220,160,0.18)" />
                <stop offset="45%" stopColor="rgba(251,191,36,0.08)" />
                <stop offset="100%" stopColor="rgba(0,0,0,0)" />
              </radialGradient>

              <linearGradient id={`${uid}coatDeep`} x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#2a2520" />
                <stop offset="50%" stopColor="#12100e" />
                <stop offset="100%" stopColor="#030303" />
              </linearGradient>
              <linearGradient id={`${uid}coatMid`} x1="20%" y1="0%" x2="80%" y2="100%">
                <stop offset="0%" stopColor="#3d3832" />
                <stop offset="100%" stopColor="#0a0908" />
              </linearGradient>

              <linearGradient id={`${uid}hatVol`} x1="30%" y1="0%" x2="70%" y2="100%">
                <stop offset="0%" stopColor="#52525b" />
                <stop offset="40%" stopColor="#27272a" />
                <stop offset="100%" stopColor="#09090b" />
              </linearGradient>
              <linearGradient id={`${uid}brimVol`} x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#3f3f46" />
                <stop offset="100%" stopColor="#0a0a0a" />
              </linearGradient>

              <linearGradient id={`${uid}glass`} x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#111" />
                <stop offset="40%" stopColor="#000" />
                <stop offset="100%" stopColor="#1a1a1a" />
              </linearGradient>
              <linearGradient id={`${uid}frameMetal`} x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#d4d4d8" />
                <stop offset="100%" stopColor="#71717a" />
              </linearGradient>

              <linearGradient id={`${uid}cardFace`} x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#fffef8" />
                <stop offset="55%" stopColor="#f3ece0" />
                <stop offset="100%" stopColor="#ddd4c4" />
              </linearGradient>
              <linearGradient id={`${uid}cardRim`} x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#f5e6b8" />
                <stop offset="100%" stopColor="#b8860b" />
              </linearGradient>
              <linearGradient id={`${uid}cardEdge`} x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#f0e6d0" />
                <stop offset="100%" stopColor="#8b7355" />
              </linearGradient>

              <linearGradient id={`${uid}gloveVol`} x1="15%" y1="5%" x2="85%" y2="95%">
                <stop offset="0%" stopColor="#ffffff" />
                <stop offset="35%" stopColor="#f1f5f9" />
                <stop offset="70%" stopColor="#cbd5e1" />
                <stop offset="100%" stopColor="#94a3b8" />
              </linearGradient>

              <filter id={`${uid}figDepth`} x="-25%" y="-25%" width="150%" height="150%">
                <feDropShadow dx="0" dy="10" stdDeviation="8" floodColor="#000" floodOpacity="0.65" />
                <feDropShadow dx="-4" dy="2" stdDeviation="3" floodColor="#000" floodOpacity="0.35" />
              </filter>
              <filter id={`${uid}cardDepth`} x="-50%" y="-50%" width="200%" height="200%">
                <feDropShadow dx="2" dy="6" stdDeviation="4" floodColor="#000" floodOpacity="0.55" />
                <feDropShadow dx="0" dy="12" stdDeviation="8" floodColor="#000" floodOpacity="0.35" />
              </filter>
            </defs>

            <rect width="320" height="260" fill={`url(#${uid}ambLight)`} />

            <DealerSilhouette uid={uid} />

            {/* карты + руки — передний план */}
            <g transform="translate(160, 172)" filter={`url(#${uid}cardDepth)`}>
              {CARDS.map((c) => (
                <Card3D key={`${c.suit}-${c.rot}`} {...c} uid={uid} />
              ))}

              <motion.g
                animate={{ rotate: [-1.5, 1, -1.5], y: [0, -1.5, 0] }}
                transition={{ duration: 1.9, repeat: Infinity, ease: 'easeInOut' }}
              >
                <GlovedHand uid={uid} />
              </motion.g>
              <motion.g
                animate={{ rotate: [1.5, -1, 1.5], y: [0, -1.5, 0] }}
                transition={{ duration: 1.9, repeat: Infinity, ease: 'easeInOut', delay: 0.07 }}
              >
                <GlovedHand uid={uid} mirror />
              </motion.g>
            </g>

            {/* искры */}
            {[48, 272, 120, 200].map((cx, i) => (
              <motion.circle
                key={cx}
                cx={cx}
                cy={78 + i * 8}
                r={1.2}
                fill="#fcd34d"
                animate={{ opacity: [0.05, 0.65, 0.05], scale: [0.8, 1.2, 0.8] }}
                transition={{ duration: 2.2 + i * 0.3, repeat: Infinity, delay: i * 0.4 }}
              />
            ))}
          </motion.svg>
        </motion.div>
      </div>
    </motion.div>
  );
}
