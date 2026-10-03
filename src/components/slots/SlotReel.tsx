'use client';

import { useEffect, useMemo, useState } from 'react';
import { slotArt } from '@/lib/slots/art';
import styles from '@/app/slots/Slots.module.css';

type Props = {
  gameId: string;
  reelIndex: number;
  rows: number;
  symbolIds: string[];
  landed: string[];
  rolling: boolean;
};

export default function SlotReel({ gameId, reelIndex, rows, symbolIds, landed, rolling }: Props) {
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
          transition: roll ? `transform ${900 + reelIndex * 180}ms cubic-bezier(0.12, 0.7, 0.16, 1)` : 'none',
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
