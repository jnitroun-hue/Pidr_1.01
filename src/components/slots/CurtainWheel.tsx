'use client';

import { useEffect, useState } from 'react';
import { CURTAIN_WHEEL } from '@/lib/slots/games';
import styles from './CurtainWheel.module.css';

type Props = {
  heroSrc: string;
  index: number;
  auto: boolean;
  onDone: () => void;
};

const SEGMENT = 360 / CURTAIN_WHEEL.length;

export default function CurtainWheel({ heroSrc, index, auto, onDone }: Props) {
  const [angle, setAngle] = useState(0);
  const [landed, setLanded] = useState(false);
  const face = CURTAIN_WHEEL[index] ?? CURTAIN_WHEEL[0];

  function launch() {
    if (landed) return;
    setAngle(360 * 6 - index * SEGMENT);
    window.setTimeout(() => setLanded(true), 4200);
  }

  useEffect(() => {
    if (!auto) return;
    const timer = window.setTimeout(launch, 500);
    return () => window.clearTimeout(timer);
  }, [auto]);

  useEffect(() => {
    if (landed && auto) {
      const timer = window.setTimeout(onDone, 1400);
      return () => window.clearTimeout(timer);
    }
  }, [landed, auto, onDone]);

  return (
    <div className={styles.back}>
      {heroSrc ? <img className={styles.hero} src={heroSrc} alt="" draggable={false} /> : null}
      <div className={styles.panel}>
        <p>Колесо бонуса</p>
        <div className={styles.stage}>
          <i className={styles.pointer} />
          <div className={styles.disc} style={{ transform: `rotate(${angle}deg)` }}>
            {CURTAIN_WHEEL.map((item, itemIndex) => (
              <span key={item.label} style={{ transform: `rotate(${itemIndex * SEGMENT}deg) translateY(-118px)` }}>{item.label}</span>
            ))}
          </div>
        </div>
        {landed ? (
          <>
            <strong>{face.spins} спинов · шторы от x{face.min}</strong>
            {!auto ? <button type="button" onClick={onDone}>Крутить</button> : null}
          </>
        ) : (
          <button type="button" onClick={launch}>Запустить</button>
        )}
      </div>
    </div>
  );
}
