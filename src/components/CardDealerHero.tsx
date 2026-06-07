'use client';

import { motion } from 'framer-motion';
import styles from './CardDealerHero.module.css';

const CARD_FAN = [
  { rotate: -28, x: -38, y: 8, delay: 0 },
  { rotate: -12, x: -18, y: 2, delay: 0.05 },
  { rotate: 0, x: 0, y: -2, delay: 0.1 },
  { rotate: 12, x: 18, y: 2, delay: 0.15 },
  { rotate: 28, x: 38, y: 8, delay: 0.2 },
];

export default function CardDealerHero() {
  return (
    <motion.div
      className={styles.wrapper}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: 'easeOut' }}
      aria-hidden
    >
      <div className={styles.glow} />

      {[
        { top: '8%', left: '12%', d: 0 },
        { top: '18%', right: '8%', d: 0.4 },
        { bottom: '28%', left: '6%', d: 0.8 },
        { bottom: '22%', right: '14%', d: 1.2 },
      ].map((s, i) => (
        <motion.span
          key={i}
          className={styles.sparkle}
          style={{ top: s.top, left: s.left, right: s.right, bottom: s.bottom }}
          animate={{ opacity: [0.3, 1, 0.3], scale: [0.8, 1.15, 0.8], rotate: [0, 180, 360] }}
          transition={{ duration: 2.8, repeat: Infinity, delay: s.d, ease: 'easeInOut' }}
        >
          ✦
        </motion.span>
      ))}

      <motion.svg
        className={styles.svg}
        viewBox="0 0 280 200"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        animate={{ y: [0, -4, 0] }}
        transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut' }}
      >
        {/* Плащ / плечи */}
        <ellipse cx="140" cy="178" rx="72" ry="14" fill="rgba(0,0,0,0.35)" />

        {/* Тело — жилет картёжника */}
        <path
          d="M88 118 Q140 108 192 118 L200 188 Q140 198 80 188 Z"
          fill="url(#vestGrad)"
        />
        <path d="M140 118 L140 188" stroke="rgba(0,0,0,0.25)" strokeWidth="1.5" />
        {/* Рубашка */}
        <path d="M118 118 L140 132 L162 118 L158 188 L122 188 Z" fill="#e2e8f0" />
        {/* Бабочка */}
        <path d="M128 128 Q140 138 152 128 Q140 134 128 128" fill="#dc2626" />
        <circle cx="140" cy="131" r="3" fill="#991b1b" />

        {/* Левая рука */}
        <motion.g
          animate={{ rotate: [-6, 4, -6] }}
          transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
          style={{ originX: '78px', originY: '130px' }}
        >
          <ellipse cx="72" cy="138" rx="16" ry="20" fill="#d4a574" />
          <path d="M58 128 Q48 120 52 108" stroke="#d4a574" strokeWidth="10" strokeLinecap="round" fill="none" />
        </motion.g>

        {/* Правая рука */}
        <motion.g
          animate={{ rotate: [6, -4, 6] }}
          transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut', delay: 0.15 }}
          style={{ originX: '202px', originY: '130px' }}
        >
          <ellipse cx="208" cy="138" rx="16" ry="20" fill="#d4a574" />
          <path d="M222 128 Q232 120 228 108" stroke="#d4a574" strokeWidth="10" strokeLinecap="round" fill="none" />
        </motion.g>

        {/* Колода в руках — анимированный веер */}
        <g transform="translate(140, 118)">
          {CARD_FAN.map((c, i) => (
            <motion.g
              key={i}
              animate={{
                rotate: [c.rotate - 8, c.rotate + 12, c.rotate - 8],
                x: [c.x - 4, c.x + 6, c.x - 4],
                y: [c.y + 4, c.y - 8, c.y + 4],
              }}
              transition={{
                duration: 1.4,
                repeat: Infinity,
                delay: c.delay,
                ease: 'easeInOut',
              }}
            >
              <rect
                x={-14}
                y={-22}
                width="28"
                height="38"
                rx="3"
                fill={i % 2 === 0 ? '#fef3c7' : '#fff'}
                stroke="#1e293b"
                strokeWidth="1.5"
                transform={`rotate(${c.rotate})`}
              />
              <text
                x="0"
                y="-4"
                textAnchor="middle"
                fontSize="11"
                fill={i % 2 === 0 ? '#dc2626' : '#1e293b'}
                transform={`rotate(${c.rotate})`}
              >
                {['♠', '♥', '♦', '♣', '★'][i]}
              </text>
            </motion.g>
          ))}
        </g>

        {/* Голова */}
        <ellipse cx="140" cy="88" rx="38" ry="42" fill="#e8b88a" />

        {/* Усы */}
        <path
          d="M118 98 Q128 104 140 100 Q152 104 162 98 Q152 108 140 106 Q128 108 118 98"
          fill="#3f2e1e"
        />

        {/* Улыбка */}
        <path d="M128 108 Q140 116 152 108" stroke="#7c4a2a" strokeWidth="2" fill="none" strokeLinecap="round" />

        {/* Очки */}
        <circle cx="122" cy="82" r="14" fill="none" stroke="#1e293b" strokeWidth="3" />
        <circle cx="158" cy="82" r="14" fill="none" stroke="#1e293b" strokeWidth="3" />
        <path d="M136 82 H144" stroke="#1e293b" strokeWidth="2.5" />
        <path d="M108 80 Q100 78 94 82" stroke="#1e293b" strokeWidth="2" fill="none" />
        <path d="M172 80 Q180 78 186 82" stroke="#1e293b" strokeWidth="2" fill="none" />
        {/* Блики на стёклах */}
        <ellipse cx="118" cy="78" rx="4" ry="2.5" fill="rgba(255,255,255,0.45)" />
        <ellipse cx="154" cy="78" rx="4" ry="2.5" fill="rgba(255,255,255,0.45)" />

        {/* Ковбойская шляпа */}
        <ellipse cx="140" cy="58" rx="52" ry="10" fill="#3d2914" />
        <path
          d="M108 58 Q140 18 172 58 Q160 52 140 50 Q120 52 108 58"
          fill="url(#hatGrad)"
        />
        <path d="M118 58 Q140 42 162 58" stroke="#5c3d1e" strokeWidth="2" fill="none" />
        <ellipse cx="140" cy="56" rx="28" ry="6" fill="#2a1a0a" />

        {/* Магический след от карт */}
        <motion.path
          d="M90 100 Q140 70 190 100"
          stroke="url(#magicLine)"
          strokeWidth="2"
          fill="none"
          strokeLinecap="round"
          strokeDasharray="6 8"
          animate={{ strokeDashoffset: [0, -28] }}
          transition={{ duration: 1.2, repeat: Infinity, ease: 'linear' }}
        />

        <defs>
          <linearGradient id="vestGrad" x1="88" y1="118" x2="192" y2="188" gradientUnits="userSpaceOnUse">
            <stop stopColor="#1e3a5f" />
            <stop offset="1" stopColor="#0f172a" />
          </linearGradient>
          <linearGradient id="hatGrad" x1="108" y1="18" x2="172" y2="58" gradientUnits="userSpaceOnUse">
            <stop stopColor="#6b4423" />
            <stop offset="1" stopColor="#3d2914" />
          </linearGradient>
          <linearGradient id="magicLine" x1="90" y1="100" x2="190" y2="100" gradientUnits="userSpaceOnUse">
            <stop stopColor="transparent" />
            <stop offset="0.5" stopColor="#fbbf24" />
            <stop offset="1" stopColor="transparent" />
          </linearGradient>
        </defs>
      </motion.svg>
    </motion.div>
  );
}
