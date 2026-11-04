'use client';

import { useEffect, useState } from 'react';
import { cabinetCopy, useSlotLocale } from '@/lib/slots/locale';
import styles from './BigWin.module.css';

type Tier = 'nice' | 'mega' | 'sensational' | 'max';

type Props = {
  multiple: number;
  amountLabel: string;
  capped?: boolean;
  onClose: () => void;
};

function tierOf(multiple: number, capped: boolean): Tier {
  if (capped) return 'max';
  if (multiple >= 100) return 'sensational';
  if (multiple >= 50) return 'mega';
  return 'nice';
}

const TITLE: Record<Tier, 'big' | 'mega' | 'epic' | 'maxWin'> = {
  nice: 'big',
  mega: 'mega',
  sensational: 'epic',
  max: 'maxWin',
};

const ART: Record<Tier, string> = {
  nice: '/img/slots/win-big.jpg',
  mega: '/img/slots/win-mega.jpg',
  sensational: '/img/slots/win-epic.jpg',
  max: '/img/slots/win-max.jpg',
};

export default function BigWin({ multiple, amountLabel, capped = false, onClose }: Props) {
  const { lang, social } = useSlotLocale();
  const copy = cabinetCopy(lang, social);
  const tier = tierOf(multiple, capped);
  const title = copy[TITLE[tier]];
  const [shown, setShown] = useState(0);
  const target = Math.max(1, Math.round(multiple));

  useEffect(() => {
    let frame = 0;
    const start = performance.now();
    const duration = tier === 'max' ? 2400 : tier === 'sensational' ? 1700 : tier === 'mega' ? 1300 : 900;
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
    <div
      className={`${styles.overlay} ${styles[tier]}`}
      style={{ backgroundImage: `url(${ART[tier]})` }}
      role="dialog"
      aria-label={title}
    >
      <div className={styles.ring} />
      <div className={styles.card}>
        <p>{title}</p>
        <strong>x{shown}</strong>
        <b>{amountLabel}</b>
        <button type="button" onClick={onClose}>{copy.collect}</button>
      </div>
    </div>
  );
}
