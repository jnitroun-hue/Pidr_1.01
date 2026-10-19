'use client';

import { useEffect, useState } from 'react';
import { PICK_MISSES, PICK_TARGETS } from '@/lib/slots/games';
import { slotArt } from '@/lib/slots/art';
import styles from './PickBonus.module.css';

type Reveal = { kind: 'mult' | 'miss'; value: number; amount: number };

type Props = {
  gameId: string;
  reveals: Reveal[];
  total: number;
  floorAdded: number;
  moneyLabel: (value: number) => string;
  auto: boolean;
  onDone: () => void;
};

export default function PickBonus({ gameId, reveals, total, floorAdded, moneyLabel, auto, onDone }: Props) {
  const [opened, setOpened] = useState<number[]>([]);
  const finished = opened.length >= reveals.length;
  const misses = opened.reduce((sum, _, index) => sum + (reveals[index].kind === 'miss' ? 1 : 0), 0);
  const collected = opened.reduce((sum, _, index) => sum + reveals[index].amount, 0);

  function open(target: number) {
    if (finished || opened.includes(target)) return;
    setOpened((value) => [...value, target]);
  }

  useEffect(() => {
    if (!auto || finished) return;
    const timer = window.setTimeout(() => {
      const free = Array.from({ length: PICK_TARGETS }, (_, index) => index).filter((index) => !opened.includes(index));
      open(free[Math.floor(Math.random() * free.length)]);
    }, 650);
    return () => window.clearTimeout(timer);
  }, [auto, opened, finished]);

  useEffect(() => {
    if (finished && auto) {
      const timer = window.setTimeout(onDone, 1400);
      return () => window.clearTimeout(timer);
    }
  }, [finished, auto]);

  return (
    <div className={styles.back}>
      <div className={styles.panel}>
        <p className={styles.head}>Тир · промахов {misses}/{PICK_MISSES}</p>
        <div className={styles.grid}>
          {Array.from({ length: PICK_TARGETS }, (_, index) => {
            const order = opened.indexOf(index);
            const reveal = order >= 0 ? reveals[order] : null;
            return (
              <button
                key={index}
                type="button"
                className={`${styles.target} ${reveal ? (reveal.kind === 'miss' ? styles.miss : styles.hit) : ''} ${finished && !reveal ? styles.dim : ''}`}
                disabled={finished || Boolean(reveal) || auto}
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
        <div className={styles.sum}>
          <span>Собрано</span>
          <strong>{moneyLabel(finished ? total : collected)}</strong>
          {finished && floorAdded > 0 ? <small>Гарантия покупки добавила {moneyLabel(floorAdded)}</small> : null}
        </div>
        {finished && !auto ? (
          <button type="button" className={styles.go} onClick={onDone}>Забрать</button>
        ) : (
          <span className={styles.hint}>{auto ? 'Автоигра стреляет сама' : 'Выбирайте мишени. Третий промах заканчивает тир.'}</span>
        )}
      </div>
    </div>
  );
}
