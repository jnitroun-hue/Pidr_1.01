'use client';

import { useEffect, useState } from 'react';
import styles from './PickBonus.module.css';

type Cell = { kind: 'mult' | 'miss'; value: number; amount: number };

type Props = {
  heroSrc: string;
  gameId: string;
  reveals: Cell[];
  cells?: Cell[];
  columns?: number;
  rows?: number;
  path?: number[];
  missLimit?: number;
  total: number;
  floorAdded: number;
  moneyLabel: (value: number) => string;
  auto: boolean;
  onDone: () => void;
};

export default function PickBonus({ heroSrc, gameId, reveals, cells, columns, rows, path, missLimit, total, floorAdded, moneyLabel, auto, onDone }: Props) {
  const board = cells && path && columns && rows ? cells : null;
  const shots = board ? path! : reveals.map((_, index) => index);
  const limit = missLimit ?? 3;
  const [step, setStep] = useState(0);
  const opened = shots.slice(0, step);
  const finished = step >= shots.length;
  const misses = opened.reduce((sum, index) => sum + ((board ? board[index] : reveals[index]).kind === 'miss' ? 1 : 0), 0);
  const nextIndex = shots[step];

  function shoot() {
    if (finished) return;
    setStep((value) => value + 1);
  }

  useEffect(() => {
    if (!auto || finished) return;
    const timer = window.setTimeout(shoot, 700);
    return () => window.clearTimeout(timer);
  }, [auto, step, finished]);

  useEffect(() => {
    if (finished && auto) {
      const timer = window.setTimeout(onDone, 1400);
      return () => window.clearTimeout(timer);
    }
  }, [finished, auto, onDone]);

  const width = columns ?? 4;
  const height = rows ?? Math.ceil((board ? board.length : 12) / width);
  const count = board ? board.length : 12;

  return (
    <div className={styles.back}>
      <div className={styles.panel} data-game={gameId}>
        <p className={styles.head}>Тир · промахов {misses}/{limit}</p>
        <div className={styles.layout}>
          {heroSrc ? (
            <img key={step} className={`${styles.archer} ${step ? styles.shoot : styles.ready}`} src={heroSrc} alt="" draggable={false} />
          ) : null}
          <div className={styles.grid} style={{ gridTemplateColumns: `repeat(${width}, minmax(0, 1fr))` }}>
            {Array.from({ length: count }, (_, index) => {
              const order = opened.indexOf(index);
              const reveal = order >= 0 ? (board ? board[index] : reveals[order]) : null;
              const aimed = index === nextIndex && !finished;
              return (
                <button
                  key={index}
                  type="button"
                  className={`${styles.target} ${reveal ? (reveal.kind === 'miss' ? styles.miss : styles.hit) : ''} ${aimed ? styles.aim : ''} ${finished && !reveal ? styles.dim : ''}`}
                  disabled={finished || Boolean(reveal)}
                  onClick={shoot}
                >
                  {reveal ? (
                    reveal.kind === 'miss' ? <span>мимо</span> : <strong>x{reveal.value}</strong>
                  ) : (
                    <i className={aimed ? styles.bolt : ''} />
                  )}
                </button>
              );
            })}
          </div>
        </div>
        <div className={styles.sum}>
          <span>Собрано</span>
          <strong>{moneyLabel(finished ? total : opened.reduce((sum, index) => sum + (board ? board[index] : reveals[opened.indexOf(index)]).amount, 0))}</strong>
          {finished && floorAdded > 0 ? <small>Гарантия покупки добавила {moneyLabel(floorAdded)}</small> : null}
        </div>
        {finished && !auto ? (
          <button type="button" className={styles.go} onClick={onDone}>Забрать</button>
        ) : (
          <span className={styles.hint}>{auto ? 'Лучник стреляет сам' : `Поле ${width}×${height}. Нажмите мишень: стрела летит в подсвеченную. Промахов на поле шесть, третий заканчивает тир.`}</span>
        )}
      </div>
    </div>
  );
}
