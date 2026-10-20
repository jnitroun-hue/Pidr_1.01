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
  moneyLabel: (value: number) => string;
  auto: boolean;
  onDone: (opened: number[]) => void;
};

export default function PickBonus({ heroSrc, gameId, cells, columns, rows, missLimit, moneyLabel, auto, onDone }: Props) {
  const [opened, setOpened] = useState<number[]>([]);
  const [shot, setShot] = useState<number | null>(null);
  const misses = opened.reduce((sum, index) => sum + (cells[index]?.kind === 'miss' ? 1 : 0), 0);
  const finished = misses >= missLimit;
  const collected = opened.reduce((sum, index) => sum + (cells[index]?.amount ?? 0), 0);

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

  useEffect(() => {
    if (finished && auto) {
      const timer = window.setTimeout(() => onDone(opened), 1200);
      return () => window.clearTimeout(timer);
    }
  }, [finished, auto, opened, onDone]);

  return (
    <div className={styles.back}>
      <div className={styles.panel}>
        <p className={styles.head}>Тир · промах {misses} из {missLimit}</p>
        <div className={styles.layout}>
          {heroSrc ? (
            <img key={opened.length} className={`${styles.archer} ${shot != null ? styles.shoot : styles.ready}`} src={heroSrc} alt="" draggable={false} />
          ) : null}
          <div className={styles.grid} style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}>
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
                    reveal.kind === 'miss' ? <span>мимо</span> : <strong>x{reveal.value}</strong>
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
            {auto ? 'Лучник сам выбирает яблоки' : `Поле ${columns}×${rows}. Нажмите любое яблоко. Шесть мимо спрятаны на поле, третье заканчивает тир.`}
          </span>
        )}
      </div>
    </div>
  );
}
