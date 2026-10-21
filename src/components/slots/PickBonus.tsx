'use client';

import { useEffect, useState } from 'react';
import { slotArt } from '@/lib/slots/art';
import styles from './PickBonus.module.css';

type Cell = { kind: 'mult' | 'miss'; value: number; amount: number };

type Props = {
  heroSrc: string;
  gameId: string;
  cells: Cell[];
  columns: number;
  rows: number;
  missLimit: number;
  bet: number;
  moneyLabel: (value: number) => string;
  auto: boolean;
  onProgress?: (total: number) => void;
  onDone: (opened: number[]) => void;
};

export default function PickBonus({ heroSrc, gameId, cells, columns, rows, missLimit, bet, moneyLabel, auto, onProgress, onDone }: Props) {
  const [opened, setOpened] = useState<number[]>([]);
  const [shot, setShot] = useState<number | null>(null);
  const misses = opened.reduce((sum, index) => sum + (cells[index]?.kind === 'miss' ? 1 : 0), 0);
  const finished = misses >= missLimit;
  const prizeOf = (index: number) => {
    const cell = cells[index];
    if (!cell || cell.kind === 'miss') return 0;
    return Math.round(cell.value * bet);
  };
  const collected = opened.reduce((sum, index) => sum + prizeOf(index), 0);

  function open(index: number) {
    if (finished || opened.includes(index) || shot != null) return;
    setShot(index);
    window.setTimeout(() => {
      setOpened((list) => (list.includes(index) ? list : [...list, index]));
      setShot(null);
    }, 280);
  }

  useEffect(() => {
    if (!auto || finished || shot != null) return;
    const free = cells.map((_, index) => index).filter((index) => !opened.includes(index));
    if (!free.length) return;
    const timer = window.setTimeout(() => open(free[Math.floor(Math.random() * free.length)]), 700);
    return () => window.clearTimeout(timer);
  }, [auto, opened, finished, shot, cells]);

  useEffect(() => { onProgress?.(collected); }, [collected, onProgress]);

  useEffect(() => {
    if (finished && auto) {
      const timer = window.setTimeout(() => onDone(opened), 1200);
      return () => window.clearTimeout(timer);
    }
  }, [finished, auto, opened, onDone]);

  return (
    <div className={styles.back}>
      <div className={styles.panel}>
        <p className={styles.head}>Тир · промах {misses} из {missLimit} · яблоко = множитель × {moneyLabel(bet)}</p>
        <div className={styles.layout}>
          {heroSrc ? (
            <img key={opened.length} className={`${styles.archer} ${shot != null ? styles.shoot : styles.ready}`} src={heroSrc} alt="" draggable={false} />
          ) : null}
          <div className={styles.grid} style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`, gridTemplateRows: `repeat(${rows}, minmax(0, 1fr))` }}>
            {cells.map((cell, index) => {
              const reveal = opened.includes(index) ? cell : null;
              return (
                <button
                  key={index}
                  type="button"
                  className={`${styles.target} ${reveal ? (reveal.kind === 'miss' ? styles.miss : styles.hit) : ''} ${shot === index ? styles.shot : ''} ${finished && !reveal ? styles.dim : ''}`}
                  disabled={finished || Boolean(reveal) || shot != null}
                  onClick={() => open(index)}
                >
                  {reveal ? (
                    reveal.kind === 'miss' ? <span>мимо</span> : <strong>x{reveal.value}<small>{moneyLabel(reveal.value * bet)}</small></strong>
                  ) : (
                    <img src={slotArt(gameId, 'target')} alt="" draggable={false} />
                  )}
                </button>
              );
            })}
          </div>
        </div>
        <div className={styles.sum}>
          <span>Собрано</span>
          <strong>{moneyLabel(collected)}</strong>
        </div>
        {finished && !auto ? (
          <button type="button" className={styles.go} onClick={() => onDone(opened)}>Забрать</button>
        ) : (
          <span className={styles.hint}>
            {auto ? 'Лучник сам выбирает яблоки' : `Поле ${columns}×${rows}. Счёт с нуля: x2 при этой ставке — ${moneyLabel(bet * 2)}. Третий промах заканчивает тир.`}
          </span>
        )}
      </div>
    </div>
  );
}
