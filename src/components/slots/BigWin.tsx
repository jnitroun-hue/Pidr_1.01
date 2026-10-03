'use client';

import { useEffect, useState } from 'react';
import styles from './BigWin.module.css';

type Props = {
  multiple: number;
  amountLabel: string;
  onClose: () => void;
};

function tierOf(multiple: number): 'great' | 'mega' | 'ultra' {
  if (multiple >= 100) return 'ultra';
  if (multiple >= 50) return 'mega';
  return 'great';
}

const TITLE = { great: 'КРУПНЫЙ ВЫИГРЫШ', mega: 'МЕГА ВЫИГРЫШ', ultra: 'ЭПИЧЕСКИЙ ВЫИГРЫШ' };

export default function BigWin({ multiple, amountLabel, onClose }: Props) {
  const tier = tierOf(multiple);
  const [shown, setShown] = useState(0);
  const target = Math.round(multiple);

  useEffect(() => {
    let frame = 0;
    const start = performance.now();
    const duration = tier === 'ultra' ? 1600 : tier === 'mega' ? 1200 : 800;
    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / duration);
      const eased = 1 - (1 - progress) ** 3;
      setShown(Math.round(target * eased));
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, tier]);

  return (
    <div className={`${styles.overlay} ${styles[tier]}`} role="dialog" aria-label={TITLE[tier]}>
      <div className={styles.rays} />
      <div className={styles.shock} />
      <div className={styles.coins} aria-hidden>
        {Array.from({ length: tier === 'ultra' ? 18 : tier === 'mega' ? 12 : 8 }, (_, index) => (
          <i key={index} style={{ ['--i' as string]: index }} />
        ))}
      </div>
      <div className={styles.card}>
        <p>{TITLE[tier]}</p>
        <strong>x{shown}</strong>
        <span>{amountLabel}</span>
        <button type="button" onClick={onClose}>Забрать</button>
      </div>
    </div>
  );
}
