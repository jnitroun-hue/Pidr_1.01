'use client';

import { useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { ArrowLeft, ChevronDown } from 'lucide-react';
import RulesMiniTutorial from '@/components/RulesMiniTutorial';
import styles from './RulesPage.module.css';

const RULES = [
  {
    title: 'Цель и окончание игры',
    summary: 'Избавляйтесь от карт — последнему не повезёт',
    content: [
      'Ваша задача — избавиться от всех карт, включая два закрытых пенька.',
      'Игрок без карт выходит из розыгрыша и занимает очередное безопасное место.',
      'Партия продолжается, пока с картами не останется один игрок. Именно он проигрывает.',
    ],
  },
  {
    title: 'Раздача и первый ход',
    summary: '2 закрытых пенька, 1 открытая карта',
    content: [
      'Каждый получает две закрытые карты-пенька и одну открытую карту. Остальные карты образуют колоду.',
      'Пеньки нельзя смотреть или разыгрывать, пока не опустеет ваша обычная рука после завершения колоды.',
      'Первым ходит владелец самой старшей открытой карты. При равенстве игра выбирает первого среди равных по порядку игроков.',
    ],
  },
  {
    title: 'Стадия 1: правило ровно +1',
    summary: 'Масть не важна, разница должна быть точной',
    content: [
      'Ходите своей верхней открытой картой на открытую карту соперника, только если ваша карта старше ровно на один ранг.',
      'Примеры: 7 кладётся на 6, дама — на валета. Карта на два и более ранга старше не подходит.',
      'Масти на первой стадии не учитываются. Особый переход рангов: двойка кладётся только на туза.',
      'После успешного перекладывания игра снова проверяет вашу верхнюю карту: если есть подходящая цель, вы продолжаете ход.',
    ],
  },
  {
    title: 'Колода и завершение стадии 1',
    summary: 'Нет хода — откройте верхнюю карту колоды',
    content: [
      'Если верхнюю карту нельзя положить ни на одного соперника, откройте карту из колоды.',
      'Открытая карта колоды также играет по правилу ровно +1: её можно положить на подходящего соперника или на свою верхнюю карту.',
      'Если вариантов нет, карта остаётся у вас сверху, и ход переходит дальше.',
      'Когда разыграна последняя карта колоды, начинается стадия 2. Первый ход в ней получает игрок, последним взявший карту из колоды.',
    ],
  },
  {
    title: 'Стадия 2: стол и козырь',
    summary: 'Старшая масть, козырь и особые пики',
    content: [
      'Карты теперь кладутся в общую стопку в центре стола. Следующая карта должна побить верхнюю карту стопки.',
      'Карта той же масти бьёт только карту меньшего ранга. Козырь бьёт любую некозырную карту, кроме пики.',
      'Козырный ранг тоже имеет значение: козырь можно побить только более старшим козырем той же масти.',
      'Козырь определяется последней открытой картой, взятой из колоды. Пики никогда не бывают козырем: если последняя карта — пика, используется предыдущая непиковая карта.',
      'Пику можно побить только более старшей пикой. Козырь другой масти пику не бьёт.',
    ],
  },
  {
    title: 'Если нечем побить',
    summary: 'Берётся одна нижняя карта, не вся стопка',
    content: [
      'Если подходящей карты нет, нажмите «Взять».',
      'Вы забираете только нижнюю — самую раннюю — карту центральной стопки.',
      'Остальные карты остаются на столе. Если после взятия стопка опустела, начинается новый круг с пустого стола.',
    ],
  },
  {
    title: '«Одна карта!» и штраф',
    summary: 'Объявите вовремя, иначе вас могут проверить',
    content: [
      'На стадиях 2 и 3, как только у вас остаётся ровно одна активная карта, нажмите «Одна карта!».',
      'Любой игрок может нажать «Сколько карт?». Если кто-то с одной картой не объявил её, запускается штраф.',
      'Каждый участник передаёт оштрафованному по одной своей карте. При нескольких забывших штраф применяется ко всем обнаруженным игрокам.',
      'Если объявление сделано вовремя или у проверяемого не одна карта, штрафа нет.',
    ],
  },
  {
    title: 'Пеньки и финальная стадия',
    summary: 'Обычная рука пуста — откройте две последние карты',
    content: [
      'Когда колода уже закончилась и ваша обычная рука становится пустой, два пенька открываются и переходят в активную руку.',
      'Пеньки разыгрываются по тем же правилам, что и стадия 2: масть, старший ранг, козырь и ограничение для пик сохраняются.',
      'Правило «Одна карта!» продолжает действовать. Избавившись и от пеньков, вы выходите из игры.',
      'Последний оставшийся игрок с картами становится проигравшим.',
    ],
  },
] as const;

export default function RulesPage() {
  const router = useRouter();
  const reduceMotion = useReducedMotion();
  const [expandedSection, setExpandedSection] = useState<number | null>(0);

  return (
    <main className={styles.page}>
      <motion.button
        type="button"
        className={styles.backButton}
        initial={reduceMotion ? false : { x: -20, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        whileHover={reduceMotion ? undefined : { scale: 1.04 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => router.back()}
        aria-label="Вернуться назад"
      >
        <ArrowLeft size={20} />
        Назад
      </motion.button>

      <div className={styles.container}>
        <motion.header
          className={styles.hero}
          initial={reduceMotion ? false : { y: -18, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
        >
          <p className={styles.eyebrow}>Полное руководство</p>
          <h1 className={styles.title}>Как играть в P.I.D.R.</h1>
          <p className={styles.subtitle}>
            Три стадии, одна общая цель: избавьтесь от всех карт раньше соперников.
            Ниже — правила в том же порядке, в котором вы встретите их за столом.
          </p>
          <div className={styles.quickFacts} aria-label="Коротко об игре">
            <div className={styles.quickFact}>2 закрытых пенька</div>
            <div className={styles.quickFact}>Ровно +1 на старте</div>
            <div className={styles.quickFact}>Последний проигрывает</div>
          </div>
        </motion.header>

        <div className={styles.sectionHeading}>
          <h2>Правила по шагам</h2>
          <p>Откройте раздел, чтобы проверить конкретную ситуацию.</p>
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

        <RulesMiniTutorial />

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
