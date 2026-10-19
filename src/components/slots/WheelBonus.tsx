'use client';

import { useEffect, useRef, useState } from 'react';
import { WHEEL_LEVEL_1, WHEEL_LEVEL_2 } from '@/lib/slots/games';
import type { WheelStop } from '@/lib/slots/engine';
import styles from './WheelBonus.module.css';

type Props = {
  stops: WheelStop[];
  /** Сколько платит кэш-сектор с учётом усиления топ-покупки. */
  boost: number;
  cash: number;
  moneyLabel: (value: number) => string;
  auto: boolean;
  onDone: () => void;
};

const SEGMENT = 360 / 12;

export default function WheelBonus({ stops, boost, cash, moneyLabel, auto, onDone }: Props) {
  const [stage, setStage] = useState(0);
  const [turn, setTurn] = useState(0);
  const [angle, setAngle] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [settled, setSettled] = useState(false);
  const [finished, setFinished] = useState(false);
  const started = useRef(false);

  const stop = stops[Math.min(stage, stops.length - 1)];
  const segments = stop.level === 1 ? WHEEL_LEVEL_1 : WHEEL_LEVEL_2;
  const result = segments[stop.index];

  function launch() {
    if (spinning || settled) return;
    setSpinning(true);
    const target = (turn + 1) * 360 * 5 - (stop.index * SEGMENT + SEGMENT / 2);
    setTurn((value) => value + 1);
    setAngle(target);
    window.setTimeout(() => {
      setSpinning(false);
      setSettled(true);
    }, 3600);
  }

  useEffect(() => {
    if (!auto || started.current) return;
    started.current = true;
    const timer = window.setTimeout(launch, 600);
    return () => window.clearTimeout(timer);
  }, [auto]);

  useEffect(() => {
    if (!settled) return;
    if (result.kind === 'level' && stage < stops.length - 1) {
      const timer = window.setTimeout(() => {
        setStage((value) => value + 1);
        setSettled(false);
        setAngle(0);
        setTurn(0);
        if (auto) window.setTimeout(launch, 700);
      }, 1300);
      return () => window.clearTimeout(timer);
    }
    const timer = window.setTimeout(() => setFinished(true), 900);
    return () => window.clearTimeout(timer);
  }, [settled]);

  useEffect(() => {
    if (finished && auto) {
      const timer = window.setTimeout(onDone, 1200);
      return () => window.clearTimeout(timer);
    }
  }, [finished, auto]);

  return (
    <div className={styles.back}>
      <div className={styles.panel}>
        <p className={styles.level}>Колесо · уровень {stop.level}{boost > 1 ? ` · сектора ×${boost}` : ''}</p>
        <div className={styles.wheelBox}>
          <i className={styles.pointer} />
          <div
            className={`${styles.wheel} ${spinning ? styles.spinning : ''}`}
            style={{ transform: `rotate(${angle}deg)`, transition: spinning ? 'transform 3.5s cubic-bezier(0.12, 0.82, 0.08, 1)' : 'none' }}
          >
            {segments.map((segment, index) => (
              <span
                key={`${stop.level}-${index}`}
                className={`${styles.label} ${segment.kind === 'level' ? styles.labelLevel : segment.kind === 'spins' ? styles.labelSpins : ''} ${settled && index === stop.index ? styles.labelWin : ''}`}
                style={{ transform: `rotate(${index * SEGMENT + SEGMENT / 2}deg) translateY(calc(var(--wheel) * -0.37))` }}
              >
                {segment.label}
              </span>
            ))}
          </div>
          <div className={styles.hub} />
        </div>
        <div className={styles.result}>
          {settled ? (
            result.kind === 'cash' ? (
              <>
                <strong>{moneyLabel(cash)}</strong>
                <span>Сектор {result.label}{boost > 1 ? ` × ${boost}` : ''}</span>
              </>
            ) : result.kind === 'spins' ? (
              <>
                <strong>{result.spins} спинов · x{result.value * boost}</strong>
                <span>Бесплатные спины с фиксированным множителем</span>
              </>
            ) : (
              <>
                <strong>LEVEL UP</strong>
                <span>Колесо второго уровня</span>
              </>
            )
          ) : (
            <span>{spinning ? 'Колесо крутится…' : 'Нажмите, чтобы крутить колесо'}</span>
          )}
        </div>
        {!settled && !auto ? (
          <button type="button" className={styles.go} disabled={spinning} onClick={launch}>Крутить колесо</button>
        ) : null}
        {finished && !auto ? (
          <button type="button" className={styles.go} onClick={onDone}>{result.kind === 'spins' ? 'К спинам' : 'Забрать'}</button>
        ) : null}
      </div>
    </div>
  );
}
