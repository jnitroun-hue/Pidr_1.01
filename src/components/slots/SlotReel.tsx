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

function multiplierOf(id: string): number | null {
  const match = /^m(\d+)$/.exec(id);
  return match ? Number(match[1]) : null;
}

export default function SlotReel({ gameId, reelIndex, rows, symbolIds, landed, rolling, speed, bonus, highlight }: Props) {
  const [phase, setPhase] = useState<'idle' | 'clear' | 'ready' | 'go'>('idle');
  const plan = reelPlan(speed, reelIndex, bonus);
  const filler = useMemo(() => {
    const count = 18;
    return Array.from({ length: count }, (_, index) => symbolIds[(index * 5 + reelIndex * 3 + 1) % symbolIds.length]);
  }, [symbolIds, reelIndex, rolling]);
  const spinning = phase === 'ready' || phase === 'go';
  // Landed sits at the top. The spin starts further down the strip and moves
  // the strip downward, so symbols fall into the window instead of leaving it.
  const strip = spinning ? [...landed, ...filler] : landed;
  const startShift = filler.length;

  useEffect(() => {
    if (!rolling) {
      setPhase('idle');
      return;
    }
    setPhase('clear');
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
      {phase === 'clear' ? (
        Array.from({ length: rows }, (_, index) => <div key={index} className={`${styles.cell} ${styles.cellClear}`} />)
      ) : (
        <div
          className={styles.reelStrip}
          style={{
            transform: phase === 'ready' ? `translateY(calc(${startShift} * var(--cell) * -1))` : 'translateY(0)',
            transition: phase === 'go' ? `transform ${plan.duration}ms cubic-bezier(0.08, 0.65, 0.18, 1)` : 'none',
          }}
        >
          {strip.map((id, index) => {
            const hot = phase === 'idle' && index < rows && highlight[index];
            const multiplier = multiplierOf(id);
            return (
              <div key={`${reelIndex}-${index}-${id}`} className={`${styles.cell} ${hot ? styles.hot : ''} ${id === 'scatter' ? SCATTER_FX[gameId] ?? '' : ''}`}>
                <img src={slotArt(gameId, id)} alt="" draggable={false} />
                {multiplier ? <b className={styles.multBadge}>x{multiplier}</b> : null}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
