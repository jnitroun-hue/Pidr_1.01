'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { MousePointer2 } from 'lucide-react';
import styles from './TutorialActionDemo.module.css';

export type TutorialDemoKind =
  | 'overview'
  | 'deal'
  | 'firstTurn'
  | 'plusOne'
  | 'draw'
  | 'botPlace'
  | 'turnCycle'
  | 'trump'
  | 'playToTable'
  | 'takeCard'
  | 'oneCard'
  | 'penki';

type Props = {
  kind?: TutorialDemoKind;
};

const card = (rank: string, suit: string, className = '') => (
  <div className={`${styles.card} ${styles[suit]} ${className}`}>
    <b>{rank}</b><span>{suit === 'red' ? '♥' : '♠'}</span>
  </div>
);

export default function TutorialActionDemo({ kind = 'overview' }: Props) {
  const reduceMotion = useReducedMotion();
  const transition = reduceMotion
    ? { duration: 0 }
    : { duration: 3.2, repeat: Infinity, repeatDelay: 0.45, ease: 'easeInOut' as const };

  return (
    <div className={styles.stage} aria-label="Анимационный пример">
      <div className={styles.table}>
        {(kind === 'overview' || kind === 'firstTurn') && (
          <>
            <Seat label="Вы" active />
            <Seat label="Бот" side="left" />
            <Seat label="Бот" side="right" />
            <motion.div className={styles.turnRing} animate={reduceMotion ? {} : { rotate: 360 }} transition={{ duration: 5, repeat: Infinity, ease: 'linear' }} />
          </>
        )}

        {kind === 'deal' && (
          <>
            <div className={styles.deck} />
            {[0, 1, 2].map((index) => (
              <motion.div
                key={index}
                className={styles.dealt}
                initial={{ x: 0, y: 0, rotate: 0 }}
                animate={reduceMotion ? { x: (index - 1) * 34, y: 64 } : {
                  x: [0, (index - 1) * 34],
                  y: [0, 64],
                  rotate: [0, (index - 1) * 5],
                }}
                transition={{ ...transition, delay: index * 0.18 }}
              />
            ))}
            <span className={styles.caption}>2 закрытые · 1 открытая</span>
          </>
        )}

        {(kind === 'plusOne' || kind === 'botPlace') && (
          <>
            <div className={styles.targetCard}>{card('6', 'black')}</div>
            <motion.div
              className={styles.movingCard}
              initial={{ x: kind === 'botPlace' ? 82 : -82, y: 54, scale: 0.9 }}
              animate={reduceMotion ? { x: 0, y: 0 } : { x: [kind === 'botPlace' ? 82 : -82, 0], y: [54, 0], scale: [0.9, 1.06, 1] }}
              transition={transition}
            >
              {card('7', 'red')}
            </motion.div>
            <motion.div className={styles.success} animate={reduceMotion ? {} : { scale: [0.8, 1.12, 1], opacity: [0, 1, 0] }} transition={transition}>+1</motion.div>
          </>
        )}

        {kind === 'draw' && (
          <>
            <div className={styles.deck} />
            <motion.div className={styles.movingCard} animate={reduceMotion ? { x: 76 } : { x: [0, 76, 76], rotate: [0, 7, 7] }} transition={transition}>
              {card('Q', 'red')}
            </motion.div>
            <motion.div className={styles.pointer} animate={reduceMotion ? {} : { scale: [1, 0.82, 1], y: [0, 4, 0] }} transition={transition}><MousePointer2 /></motion.div>
            <span className={styles.caption}>Нет хода — нажмите колоду</span>
          </>
        )}

        {kind === 'turnCycle' && (
          <>
            <Seat label="1" active />
            <Seat label="2" side="right" />
            <Seat label="3" side="left" />
            <motion.div className={styles.cycleArrow} animate={reduceMotion ? {} : { rotate: 360 }} transition={{ duration: 2.7, repeat: Infinity, ease: 'linear' }}>↻</motion.div>
          </>
        )}

        {kind === 'trump' && (
          <>
            <div className={styles.trumpBadge}>КОЗЫРЬ ♥</div>
            <div className={styles.targetCard}>{card('10', 'black')}</div>
            <motion.div className={styles.movingCard} animate={reduceMotion ? { x: 0, y: 0 } : { x: [-78, 0], y: [50, 0] }} transition={transition}>{card('3', 'red')}</motion.div>
            <span className={styles.caption}>Козырь бьёт некозырную карту</span>
          </>
        )}

        {kind === 'playToTable' && (
          <>
            <div className={styles.tableDrop}>ПОЛЕ ХОДА</div>
            <motion.div className={styles.movingCard} animate={reduceMotion ? { y: 0 } : { y: [75, 0], scale: [0.86, 1] }} transition={transition}>{card('K', 'red')}</motion.div>
            <motion.div className={styles.pointer} animate={reduceMotion ? {} : { y: [58, -3], opacity: [1, 1, 0] }} transition={transition}><MousePointer2 /></motion.div>
          </>
        )}

        {kind === 'takeCard' && (
          <>
            <div className={styles.stack}>{card('5', 'black')}{card('9', 'red')}</div>
            <motion.div className={styles.takeMoving} animate={reduceMotion ? { x: -88, y: 55 } : { x: [0, -88], y: [0, 55] }} transition={transition}>{card('5', 'black')}</motion.div>
            <span className={styles.caption}>Берётся нижняя карта стола</span>
          </>
        )}

        {kind === 'oneCard' && (
          <>
            <div className={styles.singleCard}>{card('A', 'red')}</div>
            <motion.button className={styles.demoButton} animate={reduceMotion ? {} : { boxShadow: ['0 0 0 #22c55e00', '0 0 25px #22c55e', '0 0 0 #22c55e00'] }} transition={transition}>ОДНА КАРТА!</motion.button>
            <motion.div className={styles.pointer} animate={reduceMotion ? {} : { x: [38, 22, 38], y: [46, 30, 46] }} transition={transition}><MousePointer2 /></motion.div>
          </>
        )}

        {kind === 'penki' && (
          <>
            {[0, 1].map((index) => (
              <motion.div
                key={index}
                className={styles.penkiCard}
                style={{ left: `calc(50% ${index ? '+' : '-'} 34px)` }}
                animate={reduceMotion ? {} : { rotateY: [0, 0, 180, 180], scale: [1, 1.05, 1.05, 1] }}
                transition={{ ...transition, delay: index * 0.25 }}
              >
                <div className={styles.cardBack} />
                <div className={styles.cardFront}>{card(index ? 'J' : '4', index ? 'red' : 'black')}</div>
              </motion.div>
            ))}
            <span className={styles.caption}>Рука пуста — пеньки открываются</span>
          </>
        )}
      </div>
    </div>
  );
}

function Seat({ label, side }: { label: string; active?: boolean; side?: 'left' | 'right' }) {
  return <div className={`${styles.seat} ${side ? styles[side] : styles.bottom}`}>{label}</div>;
}
