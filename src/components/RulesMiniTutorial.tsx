'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { AnimatePresence, motion, MotionConfig, useReducedMotion } from 'framer-motion';
import { ChevronLeft, ChevronRight, Pause, Play } from 'lucide-react';
import styles from './RulesMiniTutorial.module.css';

const SCENE_MS = 5600;

const SCENES = [
  {
    id: 'goal',
    badge: 'ЦЕЛЬ',
    title: 'Не останьтесь последним',
    text: 'Сбросьте руку и оба пенька. Кто остался с картами один — проиграл.',
    tip: 'Выходят по очереди. Партия кончается, когда за столом один.',
  },
  {
    id: 'deal',
    badge: 'РАЗДАЧА',
    title: 'Две закрытые, одна открытая',
    text: 'Каждому: 1 открытая карта и 2 закрытых пенька. Первым ходит тот, у кого открытая карта старше.',
    tip: 'Пеньки нельзя смотреть до финала.',
  },
  {
    id: 'plus-one',
    badge: 'СТАДИЯ 1',
    title: 'Только ровно +1',
    text: 'Кладите карту только если она старше ровно на один ранг. Масть не важна: 8 на 7 можно, 9 на 7 — нет.',
    tip: 'После туза цикл начинается заново: 2 кладётся на A.',
  },
  {
    id: 'deck',
    badge: 'КОЛОДА',
    title: 'Нет хода — откройте карту',
    text: 'Если своей картой ход не сделать, откройте колоду. Подходит — сыграйте. Нет — карта остаётся вам, ход дальше.',
    tip: 'Колода кончилась — сразу стадия 2.',
  },
  {
    id: 'trump',
    badge: 'СТАДИЯ 2',
    title: 'Масть, ранг и козырь',
    text: 'Старшая карта той же масти бьёт младшую. Козырь бьёт чужую масть, а сам козырь бьётся только старшим козырем.',
    tip: 'Козырь — масть последней непиковой карты из колоды.',
  },
  {
    id: 'spades',
    badge: 'ОСОБОЕ ПРАВИЛО',
    title: 'Пики — только пиками',
    text: 'Никакой козырь другой масти не бьёт пику. Положить на пику можно только более старшую пику.',
    tip: 'Пиковая масть никогда не назначается козырем.',
  },
  {
    id: 'take',
    badge: 'СТОЛ',
    title: 'Берите нижнюю карту',
    text: 'Верхнюю нечем побить — жмите «Взять». В руку уходит только нижняя карта стопки, остальное остаётся на столе.',
    tip: 'Не всю стопку. Только самую раннюю карту снизу.',
  },
  {
    id: 'one-card',
    badge: 'ШТРАФ',
    title: 'Объявите «Одна карта!»',
    text: 'Осталась одна карта — сразу скажите «Одна карта!». Если кто-то раньше спросит «Сколько карт?», вы берёте по карте от каждого.',
    tip: 'Успели объявить — штрафа нет.',
  },
  {
    id: 'penki',
    badge: 'ФИНАЛ',
    title: 'Откройте пеньки',
    text: 'Рука пустая — пеньки открываются. Их играют по правилам стадии 2, пока не выйдете.',
    tip: 'Козырь, пики и «Одна карта!» всё ещё работают.',
  },
] as const;

type SceneId = (typeof SCENES)[number]['id'];

export default function RulesMiniTutorial() {
  const reduceMotion = useReducedMotion();
  const [scene, setScene] = useState(0);
  const [playing, setPlaying] = useState(!reduceMotion);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!playing || reduceMotion) return;

    const timer = window.setInterval(() => {
      setProgress((current) => {
        const next = current + 50 / SCENE_MS;
        if (next < 1) return next;
        setScene((index) => (index + 1) % SCENES.length);
        return 0;
      });
    }, 50);

    return () => window.clearInterval(timer);
  }, [playing, reduceMotion]);

  const goTo = (next: number) => {
    setScene((next + SCENES.length) % SCENES.length);
    setProgress(0);
  };

  const current = SCENES[scene];
  const motionActive = playing && !reduceMotion;

  return (
    <MotionConfig reducedMotion="user">
      <section className={styles.tutorial} aria-labelledby="mini-tutorial-title">
        <header className={styles.header}>
          <div>
            <p className={styles.eyebrow}>Интерактивное обучение</p>
            <h2 className={styles.heading} id="mini-tutorial-title">Партия за 9 шагов</h2>
          </div>
          <button
            type="button"
            className={styles.pauseButton}
            onClick={() => setPlaying((value) => !value)}
            aria-pressed={!playing}
          >
            {playing ? <Pause size={14} aria-hidden="true" /> : <Play size={14} aria-hidden="true" />}
            {' '}
            {playing ? 'Пауза' : 'Продолжить'}
          </button>
        </header>

        <div className={styles.viewport} aria-live="polite">
          <AnimatePresence mode="wait" initial={false}>
            <motion.article
              key={current.id}
              className={styles.scene}
              initial={reduceMotion ? false : { opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={reduceMotion ? { opacity: 0 } : { opacity: 0, x: -20 }}
              transition={{ duration: reduceMotion ? 0 : 0.3 }}
            >
              <div className={styles.visual} aria-hidden="true">
                <SceneVisual id={current.id} moving={motionActive} />
              </div>
              <div className={styles.copy}>
                <span className={styles.badge}>{current.badge}</span>
                <h3 className={styles.sceneTitle}>{current.title}</h3>
                <p className={styles.sceneText}>{current.text}</p>
                <p className={styles.tip}>{current.tip}</p>
              </div>
            </motion.article>
          </AnimatePresence>
        </div>

        <div className={styles.controls}>
          <div
            className={styles.progressTrack}
            role="progressbar"
            aria-label="Время до следующего шага"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(progress * 100)}
          >
            <div
              className={styles.progressBar}
              style={{ transform: `scaleX(${progress})` }}
            />
          </div>

          <div className={styles.navigation}>
            <button
              type="button"
              className={styles.navButton}
              onClick={() => goTo(scene - 1)}
              aria-label="Предыдущий шаг"
            >
              <ChevronLeft size={20} />
            </button>
            <div className={styles.steps} aria-label="Выбрать шаг">
              {SCENES.map((item, index) => (
                <button
                  type="button"
                  key={item.id}
                  className={`${styles.stepButton} ${index === scene ? styles.activeStep : ''}`}
                  onClick={() => goTo(index)}
                  aria-label={`${index + 1}. ${item.title}`}
                  aria-current={index === scene ? 'step' : undefined}
                >
                  {index + 1}
                </button>
              ))}
            </div>
            <button
              type="button"
              className={styles.navButton}
              onClick={() => goTo(scene + 1)}
              aria-label="Следующий шаг"
            >
              <ChevronRight size={20} />
            </button>
          </div>
          <p className={styles.counter}>Шаг {scene + 1} из {SCENES.length} · {playing ? 'автопереход включён' : 'на паузе'}</p>
        </div>
      </section>
    </MotionConfig>
  );
}

function Card({ rank, suit, down = false }: { rank?: string; suit?: string; down?: boolean }) {
  const red = suit === '♥' || suit === '♦';
  return (
    <div className={`${styles.card} ${down ? styles.faceDown : ''} ${red ? styles.red : ''}`}>
      {down ? '◆' : (
        <>
          <span className={styles.corner}>{rank}{suit}</span>
          <span className={styles.pip}>{suit}</span>
        </>
      )}
    </div>
  );
}

function Stage({ caption, children }: { caption: string; children: ReactNode }) {
  return (
    <div className={styles.stage}>
      <div className={styles.cards}>{children}</div>
      <div className={styles.caption}>{caption}</div>
    </div>
  );
}

function SceneVisual({ id, moving }: { id: SceneId; moving: boolean }) {
  const repeat = moving ? Infinity : 0;
  const stillTransition = moving ? undefined : { duration: 0 };

  if (id === 'goal') {
    return (
      <Stage caption="Двое вышли — последний проиграл">
        <motion.div animate={moving ? { y: [0, -16, -16], opacity: [1, 1, 0.35] } : { y: -8, opacity: 0.45 }} transition={stillTransition ?? { duration: 1.8, repeat }}>
          <Card rank="✓" suit="" />
        </motion.div>
        <motion.div animate={moving ? { y: [0, -16, -16], opacity: [1, 1, 0.35] } : { y: -8, opacity: 0.45 }} transition={stillTransition ?? { duration: 1.8, repeat, delay: 0.15 }}>
          <Card rank="✓" suit="" />
        </motion.div>
        <motion.div animate={moving ? { scale: [1, 1.08, 1] } : { scale: 1 }} transition={stillTransition ?? { duration: 1.2, repeat }} className={styles.callout}>
          ещё с картами
        </motion.div>
      </Stage>
    );
  }

  if (id === 'deal') {
    return (
      <Stage caption="2 пенька закрыты, 1 карта открыта">
        {[0, 1].map((index) => (
          <motion.div
            key={index}
            initial={moving ? { y: -35, opacity: 0 } : false}
            animate={{ y: 0, opacity: 1, rotate: index ? 5 : -5 }}
            transition={{ duration: moving ? 0.35 : 0, delay: moving ? index * 0.12 : 0 }}
          >
            <Card down />
          </motion.div>
        ))}
        <motion.div
          animate={moving ? { y: [0, -8, 0] } : { y: 0 }}
          transition={stillTransition ?? { duration: 1.5, repeat }}
        >
          <Card rank="K" suit="♥" />
        </motion.div>
      </Stage>
    );
  }

  if (id === 'plus-one') {
    return (
      <Stage caption="8 на 7 — ровно +1. 9 на 7 нельзя">
        <Card rank="7" suit="♣" />
        <motion.span className={styles.arrow} animate={moving ? { x: [-6, 6, -6] } : { x: 0 }} transition={stillTransition ?? { duration: 1.2, repeat }}>+1</motion.span>
        <motion.div animate={moving ? { y: [18, 0, 0], scale: [0.9, 1.06, 1] } : { y: 0, scale: 1 }} transition={stillTransition ?? { duration: 1.4, repeat }}>
          <Card rank="8" suit="♦" />
        </motion.div>
        <motion.div className={styles.callout} animate={moving ? { opacity: [0.4, 1, 0.4], x: [0, 8, 0] } : { opacity: 1 }} transition={stillTransition ?? { duration: 1.4, repeat }}>
          9 ✕
        </motion.div>
      </Stage>
    );
  }

  if (id === 'deck') {
    return (
      <Stage caption="Нет хода — открой карту из колоды">
        <Card down />
        <motion.div
          animate={moving ? { x: [0, 28, 28], rotate: [0, 0, -8] } : { x: 24 }}
          transition={stillTransition ?? { duration: 2, repeat, repeatDelay: 0.3 }}
        >
          <Card rank="Q" suit="♣" />
        </motion.div>
      </Stage>
    );
  }

  if (id === 'trump') {
    return (
      <Stage caption="Козырь ♦ бьёт любую некозырную">
        <Card rank="K" suit="♣" />
        <motion.div animate={moving ? { y: [16, 0, 0], rotate: [8, -4, 0] } : { y: 0 }} transition={stillTransition ?? { duration: 1.5, repeat }}>
          <Card rank="6" suit="♦" />
        </motion.div>
        <div className={styles.callout}>козырь</div>
      </Stage>
    );
  }

  if (id === 'spades') {
    return (
      <Stage caption="На пику только старшая пика">
        <Card rank="9" suit="♠" />
        <motion.div animate={moving ? { y: [14, 0, 0] } : { y: 0 }} transition={stillTransition ?? { duration: 1.3, repeat }}>
          <Card rank="J" suit="♠" />
        </motion.div>
        <motion.div className={styles.callout} animate={moving ? { x: [0, 14, 0], opacity: [1, 0.35, 1] } : { opacity: 1 }} transition={stillTransition ?? { duration: 1.3, repeat }}>
          ♦ не бьёт
        </motion.div>
      </Stage>
    );
  }

  if (id === 'take') {
    const pile = [
      { rank: '4', suit: '♥' },
      { rank: '9', suit: '♣' },
      { rank: 'Q', suit: '♦' },
    ];
    return (
      <Stage caption="Берёте только самую нижнюю">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 28px)' }}>
          {pile.map((card, index) => (
            <motion.div
              key={card.rank + card.suit}
              animate={index === 0 && moving ? { x: [0, -36, -36], y: [0, 16, 16], opacity: [1, 1, 0.2] } : undefined}
              transition={index === 0 ? (stillTransition ?? { duration: 1.8, repeat, repeatDelay: 0.35 }) : undefined}
            >
              <Card rank={card.rank} suit={card.suit} />
            </motion.div>
          ))}
        </div>
      </Stage>
    );
  }

  if (id === 'one-card') {
    return (
      <Stage caption="Скажи «Одна карта!», пока не спросили">
        <Card rank="A" suit="♥" />
        <motion.div
          className={styles.callout}
          animate={moving ? { scale: [0.92, 1.08, 0.92] } : { scale: 1 }}
          transition={stillTransition ?? { duration: 1.3, repeat }}
        >
          Одна карта!
        </motion.div>
      </Stage>
    );
  }

  return (
    <Stage caption="Пеньки открываются и играются как обычно">
      <motion.div animate={moving ? { rotateY: [180, 180, 0] } : { rotateY: 0 }} transition={stillTransition ?? { duration: 1.6, repeat }} style={{ transformStyle: 'preserve-3d' }}>
        <Card rank="K" suit="♣" />
      </motion.div>
      <motion.div animate={moving ? { rotateY: [180, 180, 0] } : { rotateY: 0 }} transition={stillTransition ?? { duration: 1.6, delay: 0.2, repeat }} style={{ transformStyle: 'preserve-3d' }}>
        <Card rank="3" suit="♥" />
      </motion.div>
    </Stage>
  );
}
