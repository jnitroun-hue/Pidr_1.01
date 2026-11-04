'use client';

import { useEffect, useState } from 'react';
import { CURTAIN_WHEEL } from '@/lib/slots/games';
import { cabinetCopy, useSlotLocale } from '@/lib/slots/locale';
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
  const { lang, social } = useSlotLocale();
  const copy = cabinetCopy(lang, social);
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
        <p>{copy.wheelTitle}</p>
        <div className={styles.wheelBox}>
          <i className={styles.pointer} />
          <div className={`${styles.wheel} ${angle ? styles.spinning : ''}`} style={{ transform: `rotate(${angle}deg)` }}>
            {CURTAIN_WHEEL.map((item, itemIndex) => (
              <span
                key={item.label}
                className={landed && itemIndex === index ? styles.landedLabel : ''}
                style={{ transform: `rotate(${itemIndex * SEGMENT + SEGMENT / 2}deg) translateY(calc(var(--wheel) * -0.34))` }}
              >{item.label}</span>
            ))}
          </div>
          <b className={styles.hub} />
        </div>
        {landed ? (
          <>
            <strong>{face.spins} · x{face.min}</strong>
            {!auto ? <button type="button" onClick={onDone}>{copy.spin}</button> : null}
          </>
        ) : (
          <button type="button" onClick={launch}>{copy.launch}</button>
        )}
      </div>
    </div>
  );
}
