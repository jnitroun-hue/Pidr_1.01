'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const SCENES = [
  {
    id: 'deal',
    badge: 'СТАРТ',
    title: 'Раздача',
    text: 'Каждому: 2 закрытых пенька + 1 открытая карта. Пеньки ждут финал.',
    tip: 'Пеньки лежат рубашкой вверх',
  },
  {
    id: 'stage1',
    badge: 'СТАДИЯ 1',
    title: 'Бей ровно +1',
    text: 'Клади карту на соперника, если она старше ровно на 1. Масти не важны.',
    tip: '7 → 8 → 9 … без учёта масти',
  },
  {
    id: 'stage2',
    badge: 'СТАДИЯ 2',
    title: 'Козырь и «Одна карта!»',
    text: 'Козырь бьёт некозырь. Пики — только пиками. Объявляй «Одна карта!»',
    tip: 'Забыл объявить — получишь штраф',
  },
  {
    id: 'stage3',
    badge: 'СТАДИЯ 3',
    title: 'Открытие пеньков',
    text: 'Колода пуста и рука пуста — переворачиваешь 2 пенька и доигрываешь.',
    tip: 'Кто избавился от всех карт — не проиграл',
  },
] as const;

const SCENE_MS = 4200;

export default function RulesMiniTutorial() {
  const [scene, setScene] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!playing) return;
    const started = Date.now();
    const tick = setInterval(() => {
      const elapsed = Date.now() - started;
      setProgress(Math.min(1, elapsed / SCENE_MS));
      if (elapsed >= SCENE_MS) {
        setScene((prev) => (prev + 1) % SCENES.length);
        setProgress(0);
      }
    }, 40);
    return () => clearInterval(tick);
  }, [playing, scene]);

  const current = SCENES[scene];

  return (
    <section
      aria-label="Анимационное обучение правилам"
      style={{
        marginTop: 28,
        marginBottom: 8,
        borderRadius: 20,
        overflow: 'hidden',
        border: '1px solid rgba(212, 175, 55, 0.28)',
        background:
          'linear-gradient(165deg, rgba(15,23,42,0.98) 0%, rgba(30,27,75,0.95) 45%, rgba(2,6,23,1) 100%)',
        boxShadow: '0 20px 48px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.04)',
      }}
    >
      <header style={{ padding: '14px 16px 10px', display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'flex-start' }}>
        <div>
          <div style={{ color: '#fde68a', fontSize: 11, fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase' }}>
            Анимационное обучение
          </div>
          <h2 style={{ color: '#f8fafc', fontSize: 18, fontWeight: 800, margin: '4px 0 0', lineHeight: 1.2 }}>
            Как играть в P.I.D.R.
          </h2>
        </div>
        <button
          type="button"
          onClick={() => setPlaying((p) => !p)}
          style={{
            border: '1px solid rgba(148,163,184,0.35)',
            background: 'rgba(15,23,42,0.7)',
            color: '#e2e8f0',
            borderRadius: 999,
            padding: '7px 12px',
            fontSize: 12,
            fontWeight: 700,
            cursor: 'pointer',
            flexShrink: 0,
          }}
        >
          {playing ? '⏸ Пауза' : '▶ Смотреть'}
        </button>
      </header>

      {/* Кино-сцена: стол */}
      <div style={{ padding: '0 12px 12px' }}>
        <div
          style={{
            position: 'relative',
            height: 280,
            borderRadius: 16,
            overflow: 'hidden',
            background:
              'radial-gradient(ellipse 90% 70% at 50% 55%, #15803d 0%, #14532d 42%, #052e16 78%, #020617 100%)',
            border: '2px solid rgba(212,175,55,0.4)',
            boxShadow: 'inset 0 0 60px rgba(0,0,0,0.35)',
          }}
        >
          {/* Декор стола */}
          <div style={{
            position: 'absolute',
            inset: 18,
            borderRadius: 12,
            border: '1px solid rgba(253,224,71,0.12)',
            pointerEvents: 'none',
          }} />

          {/* Игроки вокруг */}
          <Seat top={10} left="50%" transform="translateX(-50%)" letter="A" active={scene === 1} />
          <Seat top={90} left={12} letter="P" active={scene === 2} />
          <Seat top={90} right={12} letter="B" active={scene === 0} />
          <Seat bottom={14} left="50%" transform="translateX(-50%)" letter="G" you active={scene >= 0} />

          {/* Бейдж стадии */}
          <motion.div
            key={current.badge}
            initial={{ opacity: 0, y: -8, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            style={{
              position: 'absolute',
              top: 12,
              left: 12,
              zIndex: 5,
              background: 'linear-gradient(135deg, rgba(79,70,229,0.95), rgba(124,58,237,0.95))',
              color: '#fff',
              fontSize: 11,
              fontWeight: 800,
              letterSpacing: '0.06em',
              padding: '5px 10px',
              borderRadius: 999,
              boxShadow: '0 6px 16px rgba(79,70,229,0.45)',
            }}
          >
            {current.badge}
          </motion.div>

          {/* Центральная анимация */}
          <div style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 3,
            paddingBottom: 28,
          }}>
            <AnimatePresence mode="wait">
              <motion.div
                key={current.id}
                initial={{ opacity: 0, scale: 0.92 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.04 }}
                transition={{ duration: 0.4 }}
              >
                <DemoScene sceneId={current.id} />
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Подсказка снизу сцены */}
          <AnimatePresence mode="wait">
            <motion.div
              key={current.tip}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              style={{
                position: 'absolute',
                left: 12,
                right: 12,
                bottom: 10,
                zIndex: 4,
                textAlign: 'center',
                color: '#fef9c3',
                fontSize: 11,
                fontWeight: 700,
                textShadow: '0 2px 8px rgba(0,0,0,0.7)',
              }}
            >
              {current.tip}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Текст сцены */}
        <AnimatePresence mode="wait">
          <motion.div
            key={current.id + '-copy'}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            style={{ marginTop: 12, textAlign: 'center', padding: '0 4px' }}
          >
            <div style={{ color: '#fde68a', fontWeight: 800, fontSize: 16 }}>{current.title}</div>
            <div style={{ color: '#cbd5e1', fontSize: 13, lineHeight: 1.5, marginTop: 4 }}>
              {current.text}
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Прогресс + точки */}
        <div style={{
          marginTop: 12,
          height: 3,
          borderRadius: 999,
          background: 'rgba(148,163,184,0.2)',
          overflow: 'hidden',
        }}>
          <div style={{
            height: '100%',
            width: `${progress * 100}%`,
            background: 'linear-gradient(90deg, #818cf8, #fbbf24)',
            transition: playing ? 'none' : 'width 0.2s',
          }} />
        </div>

        <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
          {SCENES.map((s, i) => (
            <button
              key={s.id}
              type="button"
              onClick={() => {
                setScene(i);
                setProgress(0);
              }}
              style={{
                border: i === scene ? '1px solid rgba(251,191,36,0.55)' : '1px solid rgba(148,163,184,0.2)',
                background: i === scene ? 'rgba(251,191,36,0.15)' : 'rgba(15,23,42,0.55)',
                color: i === scene ? '#fde68a' : '#94a3b8',
                borderRadius: 999,
                padding: '6px 10px',
                fontSize: 11,
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              {i + 1}. {s.title}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}

function Seat({
  letter,
  you,
  active,
  top,
  bottom,
  left,
  right,
  transform,
}: {
  letter: string;
  you?: boolean;
  active?: boolean;
  top?: number;
  bottom?: number;
  left?: number | string;
  right?: number;
  transform?: string;
}) {
  return (
    <motion.div
      animate={active ? { scale: [1, 1.08, 1], boxShadow: ['0 0 0 rgba(34,197,94,0)', '0 0 18px rgba(34,197,94,0.55)', '0 0 0 rgba(34,197,94,0)'] } : { scale: 1 }}
      transition={{ duration: 1.4, repeat: active ? Infinity : 0 }}
      style={{
        position: 'absolute',
        top,
        bottom,
        left,
        right,
        transform,
        width: 34,
        height: 34,
        borderRadius: '50%',
        background: you
          ? 'linear-gradient(145deg, #22c55e, #15803d)'
          : 'linear-gradient(145deg, #475569, #1e293b)',
        border: active ? '2px solid #4ade80' : '2px solid rgba(255,255,255,0.2)',
        color: '#fff',
        fontWeight: 800,
        fontSize: 13,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 2,
      }}
    >
      {letter}
    </motion.div>
  );
}

function MiniCard({
  label,
  faceDown,
  accent,
  size = 'md',
}: {
  label?: string;
  faceDown?: boolean;
  accent?: string;
  size?: 'sm' | 'md' | 'lg';
}) {
  const dims = size === 'lg' ? { w: 54, h: 76, fs: 16 } : size === 'sm' ? { w: 36, h: 52, fs: 11 } : { w: 46, h: 66, fs: 14 };
  return (
    <div
      style={{
        width: dims.w,
        height: dims.h,
        borderRadius: 8,
        background: faceDown
          ? 'repeating-linear-gradient(45deg, #1e293b 0 6px, #334155 6px 12px)'
          : 'linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)',
        border: `2px solid ${accent || (faceDown ? '#94a3b8' : '#e2e8f0')}`,
        boxShadow: '0 10px 22px rgba(0,0,0,0.35)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-start',
        justifyContent: 'flex-start',
        color: faceDown ? '#cbd5e1' : label?.includes('♥') || label?.includes('♦') ? '#dc2626' : '#0f172a',
        fontWeight: 800,
        fontSize: dims.fs,
        padding: faceDown ? 0 : '4px 5px',
        overflow: 'hidden',
      }}
    >
      {faceDown ? (
        <div style={{ margin: 'auto', fontSize: 16, opacity: 0.7 }}>◆</div>
      ) : (
        <>
          <div style={{ lineHeight: 1 }}>{label}</div>
          <div style={{ margin: 'auto', fontSize: dims.fs + 6, opacity: 0.85 }}>
            {label?.slice(-1)}
          </div>
        </>
      )}
    </div>
  );
}

function DemoScene({ sceneId }: { sceneId: (typeof SCENES)[number]['id'] }) {
  if (sceneId === 'deal') {
    return (
      <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end' }}>
        <motion.div
          initial={{ y: -40, opacity: 0, rotate: -12 }}
          animate={{ y: 0, opacity: 1, rotate: -6 }}
          transition={{ type: 'spring', stiffness: 220, damping: 16 }}
        >
          <MiniCard faceDown />
        </motion.div>
        <motion.div
          initial={{ y: -40, opacity: 0, rotate: 8 }}
          animate={{ y: 0, opacity: 1, rotate: 6 }}
          transition={{ type: 'spring', stiffness: 220, damping: 16, delay: 0.15 }}
        >
          <MiniCard faceDown />
        </motion.div>
        <motion.div
          initial={{ y: -50, opacity: 0, scale: 0.8 }}
          animate={{ y: [0, -8, 0], opacity: 1, scale: 1 }}
          transition={{
            y: { repeat: Infinity, duration: 1.5 },
            opacity: { duration: 0.3, delay: 0.3 },
            scale: { type: 'spring', delay: 0.3 },
          }}
        >
          <MiniCard label="9♠" accent="#22c55e" size="lg" />
        </motion.div>
      </div>
    );
  }

  if (sceneId === 'stage1') {
    return (
      <div style={{ position: 'relative', width: 200, height: 90, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ color: '#86efac', fontSize: 10, fontWeight: 700, marginBottom: 4 }}>Ты</div>
          <MiniCard label="8♣" accent="#38bdf8" />
        </div>
        <motion.div
          animate={{ x: [0, 70], y: [0, -18, 0], rotate: [0, -8, 0], opacity: [1, 1, 0] }}
          transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
          style={{ position: 'absolute', left: 48, zIndex: 2 }}
        >
          <MiniCard label="8♣" accent="#38bdf8" size="sm" />
        </motion.div>
        <motion.div
          animate={{ scale: [1, 1, 1.06, 1] }}
          transition={{ repeat: Infinity, duration: 2 }}
          style={{ textAlign: 'center' }}
        >
          <div style={{ color: '#fca5a5', fontSize: 10, fontWeight: 700, marginBottom: 4 }}>Соперник</div>
          <div style={{ display: 'flex' }}>
            <div style={{ marginRight: -18, zIndex: 0 }}><MiniCard label="6♦" size="sm" /></div>
            <div style={{ zIndex: 1 }}><MiniCard label="7♥" accent="#fbbf24" /></div>
          </div>
        </motion.div>
      </div>
    );
  }

  if (sceneId === 'stage2') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
        <div style={{
          background: 'rgba(251,191,36,0.18)',
          border: '1px solid rgba(251,191,36,0.45)',
          color: '#fde68a',
          borderRadius: 999,
          padding: '4px 10px',
          fontSize: 11,
          fontWeight: 800,
        }}>
          Козырь ♦
        </div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <MiniCard label="9♠" />
          <motion.div
            animate={{ scale: [1, 1.12, 1], rotate: [0, -4, 0] }}
            transition={{ repeat: Infinity, duration: 1.3 }}
          >
            <MiniCard label="A♦" accent="#fbbf24" size="lg" />
          </motion.div>
          <motion.div
            animate={{ opacity: [0.4, 1, 0.4], y: [0, -4, 0] }}
            transition={{ repeat: Infinity, duration: 1.2 }}
            style={{
              background: 'rgba(34,197,94,0.2)',
              border: '1px solid rgba(34,197,94,0.5)',
              color: '#86efac',
              borderRadius: 10,
              padding: '8px 10px',
              fontSize: 11,
              fontWeight: 800,
              maxWidth: 72,
              textAlign: 'center',
              lineHeight: 1.25,
            }}
          >
            Одна карта!
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
      {[
        { label: 'K♣', delay: 0 },
        { label: '3♥', delay: 0.25 },
      ].map((card) => (
        <motion.div
          key={card.label}
          style={{ perspective: 600 }}
        >
          <motion.div
            animate={{ rotateY: [0, 0, 180, 180] }}
            transition={{ repeat: Infinity, duration: 2.8, delay: card.delay, times: [0, 0.25, 0.5, 1] }}
            style={{ transformStyle: 'preserve-3d', position: 'relative', width: 46, height: 66 }}
          >
            <div style={{ position: 'absolute', inset: 0, backfaceVisibility: 'hidden' }}>
              <MiniCard faceDown />
            </div>
            <div style={{
              position: 'absolute',
              inset: 0,
              backfaceVisibility: 'hidden',
              transform: 'rotateY(180deg)',
            }}>
              <MiniCard label={card.label} accent="#a78bfa" />
            </div>
          </motion.div>
        </motion.div>
      ))}
      <motion.div
        animate={{ opacity: [0, 1, 1, 0], scale: [0.9, 1, 1, 0.95] }}
        transition={{ repeat: Infinity, duration: 2.8 }}
        style={{ color: '#c4b5fd', fontWeight: 800, fontSize: 12 }}
      >
        Пеньки!
      </motion.div>
    </div>
  );
}
