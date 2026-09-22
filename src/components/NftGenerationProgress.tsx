'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Sparkles } from 'lucide-react';
import styles from './NftGenerationProgress.module.css';

type Props = {
  open: boolean;
  themeName: string;
  status: string;
  /** Уже достигнутый процент. */
  floor: number;
  /** Потолок, к которому шкала мягко доезжает, пока шаг ещё идёт. */
  cap: number;
  completed: number;
  total: number;
};

export default function NftGenerationProgress({
  open,
  themeName,
  status,
  floor,
  cap,
  completed,
  total,
}: Props) {
  const [shown, setShown] = useState(0);

  useEffect(() => {
    if (!open) {
      setShown(0);
      return;
    }

    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const target = cap >= 100 || floor >= 100 ? 100 : cap;
    if (reduce) {
      setShown(target);
      return;
    }

    setShown((current) => (target >= 100 ? 100 : Math.max(current, floor)));
    if (target >= 100) return;

    const timer = window.setInterval(() => {
      setShown((current) => {
        if (current >= target) return current;
        const gap = target - current;
        const step = gap > 24 ? 2.2 : gap > 10 ? 1.1 : 0.35;
        return Math.min(target, Math.round((current + step) * 10) / 10);
      });
    }, 160);

    return () => window.clearInterval(timer);
  }, [open, floor, cap]);

  if (!open || typeof document === 'undefined') return null;

  const percent = Math.max(0, Math.min(100, Math.round(shown)));
  const title = total === 52 ? 'Создаём колоду' : total > 1 ? 'Создаём карты' : 'Создаём карту';

  return createPortal(
    <div className={styles.backdrop} role="presentation">
      <section
        className={styles.dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby="nft-gen-title"
        aria-busy="true"
      >
        <div className={styles.icon} aria-hidden>
          <Sparkles size={18} />
        </div>
        <h2 id="nft-gen-title">{title}</h2>
        {themeName ? <p className={styles.theme}>{themeName}</p> : null}
        <p className={styles.percent} aria-live="polite">
          {percent}
          <span>%</span>
        </p>
        <div
          className={styles.track}
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={percent}
          aria-label={title}
        >
          <div className={styles.fill} style={{ width: `${percent}%` }} />
        </div>
        <p className={styles.status}>{status || 'Подготовка…'}</p>
        {total > 1 ? (
          <p className={styles.count}>
            {Math.min(completed, total)} из {total}
          </p>
        ) : null}
        <p className={styles.hint}>Не закрывайте экран, пока карта не сохранится.</p>
      </section>
    </div>,
    document.body,
  );
}
