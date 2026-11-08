'use client';

import { useEffect, useRef, useState } from 'react';
import { slotHero } from '@/lib/slots/art';
import { CURTAIN_WHEEL } from '@/lib/slots/games';
import { useSlotLocale } from '@/lib/slots/locale';
import { playMustWheel, unlockMustSound } from '@/lib/slots/mustSound';
import styles from './CurtainWheel.module.css';

type Props = {
  index: number;
  auto: boolean;
  onDone: () => void;
};

type Phase = 'idle' | 'drop' | 'caught';

export default function CurtainWheel({ index, auto, onDone }: Props) {
  const [phase, setPhase] = useState<Phase>('idle');
  const started = useRef(false);
  const { lang } = useSlotLocale();
  const en = lang === 'en';
  const safe = ((index % CURTAIN_WHEEL.length) + CURTAIN_WHEEL.length) % CURTAIN_WHEEL.length;
  const won = CURTAIN_WHEEL[safe];
  const live = phase !== 'idle';

  function launch() {
    if (started.current) return;
    started.current = true;
    void unlockMustSound().then(() => playMustWheel());
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) {
      setPhase('caught');
      return;
    }
    setPhase('drop');
  }

  useEffect(() => {
    if (!auto) return;
    const timer = window.setTimeout(launch, 700);
    return () => window.clearTimeout(timer);
  }, [auto]);

  useEffect(() => {
    if (phase !== 'drop') return;
    const timer = window.setTimeout(() => setPhase('caught'), 1500);
    return () => window.clearTimeout(timer);
  }, [phase]);

  useEffect(() => {
    if (phase === 'caught' && auto) {
      const timer = window.setTimeout(onDone, 1600);
      return () => window.clearTimeout(timer);
    }
  }, [phase, auto, onDone]);

  return (
    <div className={`${styles.back} ${phase === 'drop' ? styles.backDrop : ''} ${phase === 'caught' ? styles.backCaught : ''}`}>
      <div className={styles.wash} />
      <div className={styles.scene}>
        <p>{en ? 'One rope' : 'Одна верёвка'}</p>
        <span className={styles.kicker}>
          {en ? 'The ace cuts the fringe. One rope stays on the hat.' : 'Туз срезает бахрому. На шляпе остаётся одна.'}
        </span>
        <div className={styles.stage}>
          <img className={styles.cloth} src="/img/slots/ui/stage-cloth.jpg" alt="" draggable={false} />
          <i className={styles.flash} />
          {CURTAIN_WHEEL.map((contract, contractIndex) => {
            const kept = live && contractIndex === safe;
            const lost = live && contractIndex !== safe;
            return (
              <div
                key={contract.label}
                className={`${styles.rope} ${kept ? styles.kept : ''} ${lost ? styles.lost : ''} ${contractIndex === CURTAIN_WHEEL.length - 1 ? styles.rare : ''}`}
                style={{
                  ['--slot' as string]: contractIndex % 5,
                  ['--row' as string]: contractIndex < 5 ? 0 : 1,
                  ['--i' as string]: contractIndex,
                }}
              >
                <div className={styles.swing}>
                  <i className={styles.cord} />
                  <div className={styles.medal}>
                    <img
                      src={`/img/slots/ui/medals/${contract.spins}-${contract.min}.jpg`}
                      alt={en ? `${contract.spins} spins, x${contract.min}` : `${contract.spins} спинов, x${contract.min}`}
                      draggable={false}
                    />
                  </div>
                </div>
              </div>
            );
          })}
          <div className={`${styles.heroWrap} ${phase === 'drop' ? styles.heroThrow : ''} ${phase === 'caught' ? styles.heroCatch : ''}`}>
            <img
              key={phase}
              className={styles.hero}
              src={phase === 'drop' ? '/img/slots/hero-must-throw.png?v=2' : phase === 'caught' ? '/img/slots/hero-must-catch.png?v=2' : slotHero('golden-must')}
              alt=""
              draggable={false}
            />
            <img className={styles.ace} src="/img/slots/mult/card-ace.png" alt="" draggable={false} />
          </div>
          <i className={styles.dust} />
          {phase === 'caught' ? (
            <strong className={styles.result} aria-live="polite">
              {won.spins} {en ? 'spins' : 'спинов'} · {en ? 'curtains from' : 'шторы от'} x{won.min}
            </strong>
          ) : null}
        </div>
        <button type="button" disabled={phase === 'drop'} onClick={phase === 'caught' ? onDone : launch}>
          {phase === 'caught' ? (en ? 'To the spins' : 'К спинам') : phase === 'drop' ? (en ? 'Falling' : 'Летит') : (en ? 'Throw' : 'Бросить')}
        </button>
      </div>
    </div>
  );
}
