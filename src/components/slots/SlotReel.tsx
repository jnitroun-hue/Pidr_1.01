'use client';

import { useEffect, useMemo, useState } from 'react';
import { slotArt } from '@/lib/slots/art';
import { reelMotion, type ReelSpeed } from '@/lib/slots/speed';
import styles from '@/app/slots/Slots.module.css';

type Props = {
  gameId: string;
  reelIndex: number;
  rows: number;
  symbolIds: string[];
  landed: string[];
  rolling: boolean;
  speed: ReelSpeed;
};

export default function SlotReel({ gameId, reelIndex, rows, symbolIds, landed, rolling, speed }: Props) {
  const [roll, setRoll] = useState(false);
  const filler = useMemo(() => {
    const count = 14;
    return Array.from({ length: count }, (_, index) => symbolIds[(index * 2 + reelIndex * 3) % symbolIds.length]);
  }, [symbolIds, reelIndex, rolling]);
  const strip = rolling ? [...filler, ...landed] : landed;

  useEffect(() => {
    if (!rolling) {
      setRoll(false);
      return;
    }
    setRoll(false);
    const frame = requestAnimationFrame(() => {
      requestAnimationFrame(() => setRoll(true));
    });
    return () => cancelAnimationFrame(frame);
  }, [rolling, landed.join('|')]);

  return (
    <div className={styles.reelWindow} style={{ ['--rows' as string]: rows }}>
      <div
        className={styles.reelStrip}
        style={{
          transform: roll ? `translateY(calc(${filler.length} * -1 * var(--cell)))` : 'translateY(0)',
          transition: roll ? `transform ${reelMotion(speed, reelIndex)}ms cubic-bezier(0.15, 0.75, 0.12, 1)` : 'none',
        }}
      >
        {strip.map((id, index) => (
          <div key={`${reelIndex}-${index}-${id}`} className={styles.cell}>
            <img src={slotArt(gameId, id)} alt="" draggable={false} />
          </div>
        ))}
      </div>
    </div>
  );
}
