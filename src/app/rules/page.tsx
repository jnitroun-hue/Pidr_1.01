'use client';

import { useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { ChevronDown } from 'lucide-react';
import RulesMiniTutorial from '@/components/RulesMiniTutorial';
import styles from './RulesPage.module.css';

const RULES = [
  {
    title: 'Зачем садиться за стол',
    summary: 'Сбросить все карты раньше других',
    content: [
      'Побеждает не тот, кто набрал очки. Побеждает тот, кто первым избавился от всех карт.',
      'Кто вышел — в безопасности. Партия идёт, пока с картами не останется один человек. Он и проигрывает.',
    ],
  },
  {
    title: 'Что лежит перед вами',
    summary: '1 открытая карта и 2 закрытых пенька',
    content: [
      'В начале у каждого одна открытая карта и две закрытые. Закрытые называются пеньками.',
      'Пеньки нельзя смотреть и нельзя ими ходить до третьей стадии.',
      'Остальные карты — колода в центре. Первый ход у игрока с самой старшей открытой картой. Если старшие равны, ходит тот, кто сидит раньше по кругу.',
    ],
  },
  {
    title: 'Стадия 1. Ровно на единицу старше',
    summary: 'Масть пока не важна',
    content: [
      'Ходите верхней открытой картой на карту соперника, только если ваша старше ровно на один ранг.',
      '7 кладётся на 6. Дама — на валета. Восьмёрка на шестёрку не идёт: разница должна быть ровно один.',
      'Масти на этой стадии не смотрим. Единственный особый переход: двойка кладётся на туза.',
      'Положили карту и сверху снова есть подходящая — ходите ещё, не отдавая ход.',
    ],
  },
  {
    title: 'Если ходить нечем',
    summary: 'Откройте карту из колоды',
    content: [
      'Нет карты ровно на единицу старше — берите верх колоды.',
      'Открытую карту можно положить на соперника или на свою верхнюю, если она подходит по тому же правилу.',
      'Не подошла никуда — она остаётся у вас сверху, ход переходит дальше.',
      'Колода кончилась — начинается стадия 2. Первый ход в ней у того, кто взял последнюю карту колоды.',
    ],
  },
  {
    title: 'Стадия 2. Общая стопка и козырь',
    summary: 'Теперь нужна масть',
    content: [
      'Карты кладут в одну стопку посередине. Следующая должна побить верхнюю.',
      'Та же масть бьёт только младшую. Козырь бьёт любую чужую масть, кроме пик.',
      'Козырь бьётся только более старшим козырем той же масти.',
      'Козырь — масть последней карты, взятой из колоды. Если это пика, козырь берётся с предыдущей непиковой карты. Пики козырем не бывают.',
      'На пику можно положить только старшую пику. Козырь другой масти пику не берёт.',
    ],
  },
  {
    title: 'Кнопка «Взять»',
    summary: 'Одна нижняя карта, не вся стопка',
    content: [
      'Нечем побить верхнюю — нажмите «Взять».',
      'Вы забираете только самую нижнюю, самую раннюю карту стопки. Остальные остаются на столе.',
      'Если после этого стопка опустела, круг начинается с пустого стола.',
    ],
  },
  {
    title: '«Одна карта!»',
    summary: 'Штраф только после вопроса',
    content: [
      'На второй и третьей стадии, как только осталась одна активная карта, нажмите «Одна карта!».',
      'Забыли — штрафа ещё нет. Он включается, только если кто-то за столом успел первым спросить «Сколько карт?».',
      'Тогда вы получаете по одной карте от каждого другого игрока. Если вы уже объявили или карт не одна, штрафа нет.',
    ],
  },
  {
    title: 'Стадия 3. Пеньки',
    summary: 'Две последние карты открываются',
    content: [
      'Колода уже пуста, и обычная рука тоже пуста — два пенька открываются и становятся обычными картами.',
      'Ими ходят по правилам стадии 2: масть, старшинство, козырь и запрет бить пику чужим козырем.',
      '«Одна карта!» по-прежнему нужно объявлять. Сбросили и пеньки — вы вышли. Последний, у кого остались карты, проиграл.',
    ],
  },
] as const;

export default function RulesPage() {
  const router = useRouter();
  const reduceMotion = useReducedMotion();
  const [expandedSection, setExpandedSection] = useState<number | null>(0);

  return (
    <main className={styles.page}>
      <div className={styles.container}>
        <RulesMiniTutorial />

        <motion.header
          className={styles.hero}
          initial={reduceMotion ? false : { y: -18, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
        >
          <p className={styles.eyebrow}>Полное руководство</p>
          <h1 className={styles.title}>Как проходит партия</h1>
          <p className={styles.subtitle}>
            Сначала сбросьте карты по правилу «ровно +1». Потом бейте общую стопку козырем. В конце откройте два пенька. Кто остался с картами последним — проиграл.
          </p>
        </motion.header>

        <div className={styles.sectionHeading}>
          <h2>Разберите стол по шагам</h2>
          <p>Откройте пункт, если в партии застряли на конкретной ситуации.</p>
        </div>

        <section className={styles.rules} aria-label="Подробные правила">
          {RULES.map((rule, index) => {
            const expanded = expandedSection === index;
            const panelId = `rule-panel-${index}`;

            return (
              <motion.article
                key={rule.title}
                className={styles.ruleCard}
                initial={reduceMotion ? false : { y: 14, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: reduceMotion ? 0 : index * 0.045 }}
              >
                <button
                  type="button"
                  className={styles.ruleButton}
                  aria-expanded={expanded}
                  aria-controls={panelId}
                  onClick={() => setExpandedSection(expanded ? null : index)}
                >
                  <span className={styles.ruleNumber}>{index + 1}</span>
                  <span className={styles.ruleTitle}>
                    {rule.title}
                    <span className={styles.ruleSummary}>{rule.summary}</span>
                  </span>
                  <motion.span
                    className={styles.chevron}
                    animate={{ rotate: expanded ? 180 : 0 }}
                    transition={{ duration: reduceMotion ? 0 : 0.22 }}
                    aria-hidden="true"
                  >
                    <ChevronDown size={24} />
                  </motion.span>
                </button>

                <AnimatePresence initial={false}>
                  {expanded && (
                    <motion.div
                      id={panelId}
                      className={styles.ruleBody}
                      initial={reduceMotion ? { opacity: 0 } : { height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={reduceMotion ? { opacity: 0 } : { height: 0, opacity: 0 }}
                      transition={{ duration: reduceMotion ? 0 : 0.24 }}
                    >
                      <div className={styles.ruleContent}>
                        <ul>
                          {rule.content.map((item) => (
                            <li key={item}>{item}</li>
                          ))}
                        </ul>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.article>
            );
          })}
        </section>

        <motion.button
          type="button"
          className={styles.playButton}
          initial={reduceMotion ? false : { y: 15, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          whileHover={reduceMotion ? undefined : { scale: 1.015 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => router.push('/')}
        >
          Начать играть
        </motion.button>
      </div>
    </main>
  );
}
