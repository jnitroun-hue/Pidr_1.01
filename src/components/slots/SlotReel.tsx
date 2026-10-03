'use client';

import { useEffect, useMemo, useState } from 'react';
import { slotArt } from '@/lib/slots/art';
import { reelPlan, type ReelSpeed } from '@/lib/slots/speed';
import styles from '@/app/slots/Slots.module.css';

const SCATTER_FX: Record<string, string> = {
  'golden-must': styles.fxShimmer,
  'hex-vault': styles.fxFire,
  'oak-fortune': styles.fxFlicker,
  'neon-river': styles.fxSpin,
  'limitless-city': styles.fxShake,
  'green-arrow': styles.fxPulse,
  'fairy-glade': styles.fxSpark,
  'ash-dragon': styles.fxFlame,
  'frost-queen': styles.fxIce,
  'blade-ronin': styles.fxTwist,
};

type Props = {
  gameId: string;
  reelIndex: number;
  rows: number;
  symbolIds: string[];
  landed: string[];
  rolling: boolean;
  speed: ReelSpeed;
  bonus: boolean;
  highlight: boolean[];
};

export default function SlotReel({ gameId, reelIndex, rows, symbolIds, landed, rolling, speed, bonus, highlight }: Props) {
  const [phase, setPhase] = useState<'idle' | 'ready' | 'go'>('idle');
  const plan = reelPlan(speed, reelIndex, bonus);
  const filler = useMemo(() => {
    const count = 16;
    return Array.from({ length: count }, (_, index) => symbolIds[(index * 3 + reelIndex * 2) % symbolIds.length]);
  }, [symbolIds, reelIndex, rolling]);
  const spinning = phase !== 'idle';
  const strip = spinning ? [...filler, ...landed] : landed;

  useEffect(() => {
    if (!rolling) {
      setPhase('idle');
      return;
    }
    setPhase('idle');
    let frame = 0;
    const timer = window.setTimeout(() => {
      setPhase('ready');
      frame = requestAnimationFrame(() => {
        frame = requestAnimationFrame(() => setPhase('go'));
      });
    }, plan.delay);
    return () => {
      window.clearTimeout(timer);
      cancelAnimationFrame(frame);
    };
  }, [rolling, landed.join('|'), plan.delay]);

  return (
    <div className={styles.reelWindow} style={{ ['--rows' as string]: rows }}>
      <div
        className={styles.reelStrip}
        style={{
          transform: phase === 'go' ? `translateY(calc(${filler.length} * var(--cell)))` : 'translateY(0)',
          transition: phase === 'go' ? `transform ${plan.duration}ms cubic-bezier(0.12, 0.72, 0.14, 1)` : 'none',
        }}
      >
        {strip.map((id, index) => {
          const row = index - (spinning ? filler.length : 0);
          const hot = !rolling && row >= 0 && highlight[row];
          return (
            <div key={`${reelIndex}-${index}-${id}`} className={`${styles.cell} ${hot ? styles.hot : ''} ${id === 'scatter' ? SCATTER_FX[gameId] ?? '' : ''}`}>
              <img src={slotArt(gameId, id)} alt="" draggable={false} />
            </div>
          );
        })}
      </div>
    </div>
  );
}
