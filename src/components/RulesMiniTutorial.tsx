'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const SCENES = [
  {
    id: 'deal',
    title: 'Раздача',
    text: '2 пенька закрыты + 1 открытая карта. Пеньки ждут 3-ю стадию.',
  },
  {
    id: 'stage1',
    title: 'Стадия 1',
    text: 'Клади карту на соперника, если она старше ровно на 1. Масти не важны.',
  },
  {
    id: 'stage2',
    title: 'Стадия 2',
    text: 'Козырь бьёт некозырь. Пики бьются только пиками. Объявляй «Одна карта!»',
  },
  {
    id: 'stage3',
    title: 'Пеньки',
    text: 'Когда рука пуста и колода кончилась — открываешь 2 пенька и доигрываешь.',
  },
] as const;

type Props = {
  videoSrc?: string;
};

export default function RulesMiniTutorial({ videoSrc = '/videos/pidr-rules-tutorial.mp4' }: Props) {
  const [scene, setScene] = useState(0);
  const [videoOk, setVideoOk] = useState(true);

  useEffect(() => {
    const timer = setInterval(() => {
      setScene((prev) => (prev + 1) % SCENES.length);
    }, 3200);
    return () => clearInterval(timer);
  }, []);

  const current = SCENES[scene];

  return (
    <div
      style={{
        marginTop: '28px',
        marginBottom: '8px',
        borderRadius: '18px',
        overflow: 'hidden',
        border: '1px solid rgba(129, 140, 248, 0.35)',
        background:
          'radial-gradient(120% 100% at 10% 0%, rgba(99,102,241,0.28) 0%, rgba(15,23,42,0.95) 45%, rgba(2,6,23,0.98) 100%)',
        boxShadow: '0 16px 40px rgba(0,0,0,0.35)',
      }}
    >
      <div style={{ padding: '14px 16px 8px', display: 'flex', justifyContent: 'space-between', gap: 8 }}>
        <div>
          <div style={{ color: '#c7d2fe', fontSize: 12, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            Мини-обучение
          </div>
          <div style={{ color: '#f8fafc', fontSize: 16, fontWeight: 800, marginTop: 2 }}>
            Как играть в P.I.D.R. за 30 секунд
          </div>
        </div>
        <div style={{
          alignSelf: 'flex-start',
          background: 'rgba(34,197,94,0.15)',
          border: '1px solid rgba(34,197,94,0.35)',
          color: '#86efac',
          borderRadius: 999,
          padding: '4px 10px',
          fontSize: 11,
          fontWeight: 700,
        }}>
          LIVE DEMO
        </div>
      </div>

      {videoOk && (
        <div style={{ padding: '0 12px 10px' }}>
          <video
            key={videoSrc}
            src={videoSrc}
            controls
            playsInline
            muted
            loop
            autoPlay
            poster=""
            onError={() => setVideoOk(false)}
            style={{
              width: '100%',
              maxHeight: 220,
              borderRadius: 14,
              background: '#020617',
              border: '1px solid rgba(148,163,184,0.2)',
              display: 'block',
            }}
          />
        </div>
      )}

      <div style={{ padding: '4px 12px 14px' }}>
        <div
          style={{
            position: 'relative',
            height: 168,
            borderRadius: 14,
            background:
              'linear-gradient(180deg, #14532d 0%, #166534 40%, #052e16 100%)',
            border: '2px solid rgba(212,175,55,0.35)',
            overflow: 'hidden',
          }}
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={current.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.35 }}
              style={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 12,
                padding: 16,
              }}
            >
              <DemoScene sceneId={current.id} />
              <div style={{ textAlign: 'center' }}>
                <div style={{ color: '#fef3c7', fontWeight: 800, fontSize: 15 }}>{current.title}</div>
                <div style={{ color: '#e2e8f0', fontSize: 12, lineHeight: 1.45, marginTop: 4, maxWidth: 280 }}>
                  {current.text}
                </div>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginTop: 10 }}>
          {SCENES.map((s, i) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setScene(i)}
              aria-label={s.title}
              style={{
                width: i === scene ? 18 : 8,
                height: 8,
                borderRadius: 999,
                border: 'none',
                cursor: 'pointer',
                background: i === scene ? '#818cf8' : 'rgba(148,163,184,0.35)',
                transition: 'all 0.2s ease',
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function MiniCard({
  label,
  faceDown,
  accent,
}: {
  label?: string;
  faceDown?: boolean;
  accent?: string;
}) {
  return (
    <div
      style={{
        width: 42,
        height: 60,
        borderRadius: 6,
        background: faceDown
          ? 'linear-gradient(145deg, #1e293b 0%, #334155 100%)'
          : '#fff',
        border: `1.5px solid ${accent || (faceDown ? '#64748b' : '#cbd5e1')}`,
        boxShadow: '0 6px 14px rgba(0,0,0,0.25)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: faceDown ? '#94a3b8' : '#0f172a',
        fontWeight: 800,
        fontSize: faceDown ? 10 : 14,
      }}
    >
      {faceDown ? '🂠' : label}
    </div>
  );
}

function DemoScene({ sceneId }: { sceneId: (typeof SCENES)[number]['id'] }) {
  if (sceneId === 'deal') {
    return (
      <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
        <MiniCard faceDown />
        <MiniCard faceDown />
        <motion.div animate={{ y: [0, -8, 0] }} transition={{ repeat: Infinity, duration: 1.4 }}>
          <MiniCard label="9♠" accent="#22c55e" />
        </motion.div>
      </div>
    );
  }

  if (sceneId === 'stage1') {
    return (
      <div style={{ display: 'flex', gap: 18, alignItems: 'center' }}>
        <MiniCard label="7♦" />
        <motion.div
          animate={{ x: [0, 28, 28], y: [0, -10, 0], opacity: [1, 1, 0.2] }}
          transition={{ repeat: Infinity, duration: 1.8 }}
        >
          <MiniCard label="8♣" accent="#38bdf8" />
        </motion.div>
        <MiniCard label="7♥" />
      </div>
    );
  }

  if (sceneId === 'stage2') {
    return (
      <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
        <MiniCard label="9♠" />
        <motion.div animate={{ scale: [1, 1.08, 1] }} transition={{ repeat: Infinity, duration: 1.2 }}>
          <MiniCard label="A♦" accent="#fbbf24" />
        </motion.div>
        <div style={{
          background: 'rgba(34,197,94,0.2)',
          border: '1px solid rgba(34,197,94,0.45)',
          color: '#86efac',
          borderRadius: 8,
          padding: '6px 8px',
          fontSize: 11,
          fontWeight: 800,
        }}>
          Одна карта!
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
      <motion.div
        initial={{ rotateY: 0 }}
        animate={{ rotateY: [0, 180, 180] }}
        transition={{ repeat: Infinity, duration: 2.4 }}
        style={{ transformStyle: 'preserve-3d' }}
      >
        <MiniCard label="K♣" accent="#a78bfa" />
      </motion.div>
      <motion.div
        initial={{ rotateY: 0 }}
        animate={{ rotateY: [0, 180, 180] }}
        transition={{ repeat: Infinity, duration: 2.4, delay: 0.2 }}
      >
        <MiniCard label="3♥" accent="#a78bfa" />
      </motion.div>
    </div>
  );
}
