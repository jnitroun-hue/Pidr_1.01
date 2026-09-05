'use client';

import { useEffect, useState } from 'react';
import { AnimatePresence, motion, MotionConfig, useReducedMotion } from 'framer-motion';
import { ChevronLeft, ChevronRight, Pause, Play } from 'lucide-react';
import styles from './RulesMiniTutorial.module.css';

const SCENE_MS = 5600;

const SCENES = [
  {
    id: 'goal',
    badge: 'ЦЕЛЬ',
    title: 'Не останьтесь последним',
    text: 'Избавьтесь от обычных карт и двух пеньков. Игроки без карт выходят, а последний участник с картами проигрывает.',
    tip: 'Побеждает порядок выхода; партия заканчивается, когда остаётся один игрок.',
  },
  {
    id: 'deal',
    badge: 'РАЗДАЧА',
    title: 'Две закрытые, одна открытая',
    text: 'Каждый начинает с двух закрытых пеньков и одной открытой карты. Первым ходит игрок с самой старшей открытой картой.',
    tip: 'Пеньки пока нельзя смотреть или использовать.',
  },
  {
    id: 'plus-one',
    badge: 'СТАДИЯ 1',
    title: 'Только ровно +1',
    text: 'Кладите верхнюю карту на карту соперника, если ваша старше ровно на один ранг. Масть не важна: 8 бьёт 7, но не 6.',
    tip: 'После туза цикл продолжает двойка: 2 кладётся на A.',
  },
  {
    id: 'deck',
    badge: 'КОЛОДА',
    title: 'Нет хода — откройте карту',
    text: 'Карта из колоды тоже проверяется по правилу +1. Сыграйте её на соперника или на себя; если нельзя — оставьте себе и передайте ход.',
    tip: 'Когда колода опустеет, игра автоматически перейдёт к стадии 2.',
  },
  {
    id: 'trump',
    badge: 'СТАДИЯ 2',
    title: 'Масть, ранг и козырь',
    text: 'На столе старшая карта той же масти бьёт младшую. Козырь бьёт некозырную карту, но козырь можно перебить только старшим козырем.',
    tip: 'Козырь — масть последней непиковой карты, открытой из колоды.',
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
    text: 'Если верхнюю карту стопки нечем побить, нажмите «Взять». Вы получите одну нижнюю карту; остальная стопка останется на столе.',
    tip: 'Не всю стопку: только самую раннюю карту внизу.',
  },
  {
    id: 'one-card',
    badge: 'ШТРАФ',
    title: 'Объявите «Одна карта!»',
    text: 'Когда на стадиях 2 или 3 остаётся одна карта, объявите это. После вопроса «Сколько карт?» забывший получает по карте от каждого игрока.',
    tip: 'Своевременное объявление полностью защищает от штрафа.',
  },
  {
    id: 'penki',
    badge: 'ФИНАЛ',
    title: 'Откройте пеньки',
    text: 'После опустошения обычной руки пеньки открываются. Разыграйте их по правилам стадии 2 и выйдите до того, как останетесь последним.',
    tip: 'Масти, козырь, пики и «Одна карта!» продолжают действовать.',
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

function Card({ label, down = false }: { label?: string; down?: boolean }) {
  const red = label?.includes('♥') || label?.includes('♦');
  return (
    <div className={`${styles.card} ${down ? styles.faceDown : ''} ${red ? styles.red : ''}`}>
      {down ? '◆' : label}
    </div>
  );
}

function SceneVisual({ id, moving }: { id: SceneId; moving: boolean }) {
  const repeat = moving ? Infinity : 0;
  const stillTransition = moving ? undefined : { duration: 0 };

  if (id === 'goal') {
    return (
      <div className={styles.cards}>
        <motion.div
          animate={moving ? { y: [0, -10, 0], scale: [1, 1.06, 1] } : { y: 0, scale: 1 }}
          transition={stillTransition ?? { duration: 1.8, repeat }}
        >
          <Card label="✓" />
        </motion.div>
        <span className={styles.arrow}>→</span>
        <motion.div
          animate={moving ? { opacity: [0.45, 1, 0.45] } : { opacity: 1 }}
          transition={stillTransition ?? { duration: 1.8, repeat }}
          className={styles.callout}
        >
          Последний<br />проигрывает
        </motion.div>
      </div>
    );
  }

  if (id === 'deal') {
    return (
      <div className={styles.cards}>
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
          <Card label="K♥" />
        </motion.div>
      </div>
    );
  }

  if (id === 'plus-one') {
    return (
      <div className={styles.cards}>
        <Card label="7♣" />
        <motion.span
          className={styles.arrow}
          animate={moving ? { x: [-7, 7, -7], opacity: [0.6, 1, 0.6] } : { x: 0, opacity: 1 }}
          transition={stillTransition ?? { duration: 1.4, repeat }}
        >
          ←
        </motion.span>
        <motion.div
          animate={moving ? { rotate: [0, -5, 0], scale: [1, 1.08, 1] } : { rotate: 0, scale: 1 }}
          transition={stillTransition ?? { duration: 1.4, repeat }}
        >
          <Card label="8♦" />
        </motion.div>
      </div>
    );
  }

  if (id === 'deck') {
    return (
      <div className={styles.cards}>
        <Card down />
        <motion.div
          animate={moving ? { x: [0, 65, 65], rotateY: [0, 0, 180] } : { x: 40, rotateY: 180 }}
          transition={stillTransition ?? { duration: 2.3, repeat, repeatDelay: 0.35 }}
          style={{ transformStyle: 'preserve-3d' }}
        >
          <Card label="Q♣" />
        </motion.div>
      </div>
    );
  }

  if (id === 'trump') {
    return (
      <div className={styles.cards}>
        <Card label="K♣" />
        <motion.div
          animate={moving ? { y: [0, -12, 0], rotate: [0, -6, 0] } : { y: 0, rotate: 0 }}
          transition={stillTransition ?? { duration: 1.6, repeat }}
        >
          <Card label="6♦" />
        </motion.div>
        <div className={styles.callout}>Козырь ♦</div>
      </div>
    );
  }

  if (id === 'spades') {
    return (
      <div className={styles.cards}>
        <Card label="9♠" />
        <motion.span
          className={styles.arrow}
          animate={moving ? { scale: [1, 1.25, 1] } : { scale: 1 }}
          transition={stillTransition ?? { duration: 1.2, repeat }}
        >
          ✓
        </motion.span>
        <Card label="J♠" />
        <div className={styles.callout}>♦ ✕</div>
      </div>
    );
  }

  if (id === 'take') {
    return (
      <div className={styles.cards}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 34px)' }}>
          {['4♥', '9♣', 'Q♦'].map((label, index) => (
            <motion.div
              key={label}
              animate={index === 0 && moving ? { x: [0, -45, -45], y: [0, 18, 18], opacity: [1, 1, 0] } : undefined}
              transition={index === 0 ? (stillTransition ?? { duration: 1.8, repeat, repeatDelay: 0.4 }) : undefined}
            >
              <Card label={label} />
            </motion.div>
          ))}
        </div>
        <div className={styles.callout}>Взять<br />нижнюю</div>
      </div>
    );
  }

  if (id === 'one-card') {
    return (
      <div className={styles.cards}>
        <Card label="A♥" />
        <motion.div
          className={styles.callout}
          animate={moving ? { scale: [0.96, 1.06, 0.96], boxShadow: ['0 0 0 rgba(255,255,255,0)', '0 0 22px rgba(255,255,255,.32)', '0 0 0 rgba(255,255,255,0)'] } : { scale: 1 }}
          transition={stillTransition ?? { duration: 1.5, repeat }}
        >
          Одна карта!
        </motion.div>
      </div>
    );
  }

  return (
    <div className={styles.cards}>
      {[0, 1].map((index) => (
        <motion.div
          key={index}
          animate={moving ? { rotateY: [0, 0, 180, 180] } : { rotateY: 180 }}
          transition={stillTransition ?? { duration: 2.6, repeat, delay: index * 0.18, times: [0, 0.25, 0.55, 1] }}
          style={{ transformStyle: 'preserve-3d' }}
        >
          <Card label={index ? '3♥' : 'K♣'} />
        </motion.div>
      ))}
      <div className={styles.callout}>Пеньки<br />открыты</div>
    </div>
  );
}
