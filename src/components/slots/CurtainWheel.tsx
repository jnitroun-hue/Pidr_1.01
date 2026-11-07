'use client';

import { useEffect, useRef, useState } from 'react';
import { CURTAIN_WHEEL } from '@/lib/slots/games';
import { cabinetCopy, useSlotLocale } from '@/lib/slots/locale';
import { playMustWheel, unlockMustSound } from '@/lib/slots/mustSound';
import styles from './CurtainWheel.module.css';

type Props = {
  index: number;
  auto: boolean;
  onDone: () => void;
};

const SEGMENT = 360 / CURTAIN_WHEEL.length;

export default function CurtainWheel({ index, auto, onDone }: Props) {
  const [angle, setAngle] = useState(0);
  const [landed, setLanded] = useState(false);
  const started = useRef(false);
  const { lang, social } = useSlotLocale();
  const copy = cabinetCopy(lang, social);
  const face = CURTAIN_WHEEL[index] ?? CURTAIN_WHEEL[0];

  function launch() {
    if (started.current) return;
    started.current = true;
    void unlockMustSound().then(() => playMustWheel());
    setAngle(360 * 6 - index * SEGMENT);
    window.setTimeout(() => setLanded(true), 4300);
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
      <div className={styles.panel}>
        <p>{copy.wheelTitle}</p>
        <div className={styles.bezel}>
          <i className={styles.pointer} />
          <div className={`${styles.wheel} ${angle ? styles.spinning : ''}`} style={{ transform: `rotate(${angle}deg)` }}>
            {CURTAIN_WHEEL.map((sector, sectorIndex) => (
              <span
                key={sector.label}
                className={`${styles.mark} ${sectorIndex % 2 ? styles.onDark : styles.onGold} ${landed && sectorIndex === index ? styles.hit : ''}`}
                style={{ transform: `rotate(${sectorIndex * SEGMENT}deg) translateY(calc(var(--wheel) * -0.31))` }}
              >
                <b>{sector.spins}</b>
                <small>x{sector.min}</small>
              </span>
            ))}
          </div>
        </div>
        {landed ? <strong>{face.spins} · x{face.min}</strong> : null}
        <button type="button" onClick={landed ? onDone : launch}>{landed ? copy.spin : copy.launch}</button>
      </div>
    </div>
  );
}
