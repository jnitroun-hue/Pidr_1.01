'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeft, Pause, Play, Sparkles } from 'lucide-react';
import styles from './EarnNft.module.css';

const SCENE_MS = 4300;

const SCENES = [
  {
    id: 'generate',
    short: 'Генерация',
    title: 'Создайте уникальную карту',
    text: 'Откройте NFT-коллекцию, выберите доступную тему и запустите генерацию. Ранг, масть и оформление сохраняются у карты.',
    tip: 'Проверяйте стоимость генерации и итоговый дизайн до выставления.',
  },
  {
    id: 'listing',
    short: 'Настройка',
    title: 'Укажите цену и реквизиты',
    text: 'Нажмите «Продать», выберите монеты, рубли или криптовалюту. Для крипты выберите сеть и укажите кошелёк получения.',
    tip: 'Адрес кошелька не показывается в публичной карточке магазина.',
  },
  {
    id: 'market',
    short: 'Магазин',
    title: 'Лот появляется на площадке',
    text: 'Игроки видят дизайн карты, ранг, масть, продавца и цену. Платёжные реквизиты остаются скрыты до шага оплаты.',
    tip: 'Чёткая цена и привлекательная тема повышают шанс продажи.',
  },
  {
    id: 'paid',
    short: 'Доход',
    title: 'Покупатель оплачивает NFT',
    text: 'После подтверждения сделки карта переходит покупателю, а вы получаете оплату выбранным способом.',
    tip: 'Доход не гарантирован: карта должна найти покупателя.',
  },
] as const;

function SceneVisual({ id }: { id: (typeof SCENES)[number]['id'] }) {
  if (id === 'generate') {
    return (
      <motion.div
        className={styles.card}
        initial={{ opacity: 0, rotateY: -90, scale: 0.8 }}
        animate={{ opacity: 1, rotateY: 0, scale: 1 }}
        transition={{ duration: 0.75, type: 'spring' }}
      >
        <div className={styles.cardCorner}>A<br />♦</div>
        <motion.div
          className={styles.cardArt}
          animate={{ filter: ['hue-rotate(0deg)', 'hue-rotate(38deg)', 'hue-rotate(0deg)'] }}
          transition={{ duration: 3, repeat: Infinity }}
        >
          <Sparkles size={48} />
        </motion.div>
        {[
          { style: { top: '-14%', left: '-18%' }, delay: 0 },
          { style: { top: '8%', right: '-22%' }, delay: 0.4 },
          { style: { bottom: '0%', left: '-24%' }, delay: 0.8 },
        ].map((spark, index) => (
          <motion.span
            key={index}
            className={styles.spark}
            style={spark.style}
            animate={{ scale: [0.4, 1.25, 0.4], opacity: [0.25, 1, 0.25], rotate: [0, 35, 0] }}
            transition={{ duration: 1.8, repeat: Infinity, delay: spark.delay }}
          >
            ✦
          </motion.span>
        ))}
      </motion.div>
    );
  }

  if (id === 'listing') {
    return (
      <motion.div
        className={styles.formMock}
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <strong>Продать NFT</strong>
        <motion.div className={styles.fieldMock} initial={{ width: 0 }} animate={{ width: '100%' }} />
        <div className={styles.networkRow}>
          <motion.div className={styles.network} animate={{ boxShadow: ['0 0 0 rgba(14,165,233,0)', '0 0 22px rgba(14,165,233,.35)', '0 0 0 rgba(14,165,233,0)'] }} transition={{ repeat: Infinity, duration: 2 }}>
            TON
          </motion.div>
          <div className={styles.network}>SOL</div>
        </div>
        <motion.div className={styles.fieldMock} initial={{ width: 0 }} animate={{ width: '100%' }} transition={{ delay: 0.35 }} />
        <motion.div className={styles.ctaMock} whileInView={{ scale: [1, 1.035, 1] }} transition={{ repeat: Infinity, duration: 1.8 }}>
          Выставить на продажу
        </motion.div>
      </motion.div>
    );
  }

  if (id === 'market') {
    return (
      <motion.div
        className={styles.marketMock}
        initial={{ opacity: 0, scale: 0.82 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: 'spring', stiffness: 160 }}
      >
        <motion.div className={styles.miniCard} animate={{ y: [0, -5, 0] }} transition={{ repeat: Infinity, duration: 2.4 }}>
          A♦
        </motion.div>
        <div>
          <strong>Редкая NFT-карта</strong>
          <div className={styles.price}>0.55 GRAM</div>
          <div className={styles.buyMock}>Купить</div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      className={styles.paymentMock}
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
    >
      <motion.div
        className={styles.coin}
        animate={{ y: [0, -12, 0], rotateY: [0, 180, 360] }}
        transition={{ duration: 2.6, repeat: Infinity }}
      >
        ₲
      </motion.div>
      <motion.h3 initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.35 }}>
        Оплата подтверждена
      </motion.h3>
      <motion.div
        className={styles.ctaMock}
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ delay: 0.55 }}
      >
        NFT передана покупателю
      </motion.div>
    </motion.div>
  );
}

export default function EarnNftPage() {
  const router = useRouter();
  const [scene, setScene] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!playing) return;
    const startedAt = Date.now() - progress * SCENE_MS;
    const timer = window.setInterval(() => {
      const nextProgress = (Date.now() - startedAt) / SCENE_MS;
      if (nextProgress >= 1) {
        setScene((current) => (current + 1) % SCENES.length);
        setProgress(0);
        return;
      }
      setProgress(nextProgress);
    }, 50);
    return () => window.clearInterval(timer);
  }, [playing, scene]);

  const current = SCENES[scene];

  const selectScene = (index: number) => {
    setScene(index);
    setProgress(0);
  };

  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <button type="button" className={styles.back} onClick={() => router.back()}>
          <ArrowLeft size={16} style={{ verticalAlign: 'middle', marginRight: 7 }} />
          Назад
        </button>

        <header className={styles.hero}>
          <div className={styles.eyebrow}>NFT • СОЗДАНИЕ • ТОРГОВЛЯ</div>
          <h1 className={styles.title}>Как зарабатывать на NFT-картах</h1>
          <p className={styles.lead}>
            Создавайте игровые карты, выставляйте их на торговой площадке и получайте оплату,
            когда другой игрок покупает ваш лот.
          </p>
        </header>

        <section className={styles.tutorial} aria-label="Анимационный туториал заработка на NFT">
          <div className={styles.tutorialHead}>
            <div className={styles.tutorialLabel}>▶ Мини-видео: путь NFT от генерации до продажи</div>
            <button type="button" className={styles.play} onClick={() => setPlaying((value) => !value)}>
              {playing ? <Pause size={15} /> : <Play size={15} />}
              {playing ? 'Пауза' : 'Продолжить'}
            </button>
          </div>

          <div className={styles.stage}>
            <div className={styles.visual}>
              <AnimatePresence mode="wait">
                <motion.div
                  key={current.id}
                  initial={{ opacity: 0, x: -22 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 22 }}
                  transition={{ duration: 0.35 }}
                >
                  <SceneVisual id={current.id} />
                </motion.div>
              </AnimatePresence>
            </div>

            <AnimatePresence mode="wait">
              <motion.div
                key={`${current.id}-copy`}
                className={styles.copy}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
              >
                <div className={styles.sceneNumber}>
                  ШАГ {scene + 1} ИЗ {SCENES.length}
                </div>
                <h2 className={styles.sceneTitle}>{current.title}</h2>
                <p className={styles.sceneText}>{current.text}</p>
                <div className={styles.tip}>💡 {current.tip}</div>
              </motion.div>
            </AnimatePresence>
          </div>

          <div className={styles.progress}>
            <div className={styles.progressFill} style={{ transform: `scaleX(${progress})` }} />
          </div>

          <div className={styles.sceneNav}>
            {SCENES.map((item, index) => (
              <button
                key={item.id}
                type="button"
                className={`${styles.sceneBtn} ${scene === index ? styles.sceneBtnActive : ''}`}
                onClick={() => selectScene(index)}
              >
                {index + 1}. {item.short}
              </button>
            ))}
          </div>
        </section>

        <section className={styles.steps} aria-label="Основные правила заработка">
          <article className={styles.step}>
            <div className={styles.stepIcon}>🎨</div>
            <h3>Создавайте ценные карты</h3>
            <p>Редкость, тема и внешний вид влияют на интерес покупателей. Каждая генерация не гарантирует прибыль.</p>
          </article>
          <article className={styles.step}>
            <div className={styles.stepIcon}>🏷️</div>
            <h3>Выбирайте способ оплаты</h3>
            <p>Можно назначить цену в игровых монетах, рублях, GRAM или SOL и указать реквизиты выбранной сети.</p>
          </article>
          <article className={styles.step}>
            <div className={styles.stepIcon}>🛡️</div>
            <h3>Проверяйте реквизиты</h3>
            <p>Кошелёк хранится приватно и открывается покупателю только на этапе оплаты. Ошибочный адрес нельзя отменить в сети.</p>
          </article>
        </section>

        <div className={styles.actions}>
          <button type="button" className={styles.primary} onClick={() => router.push('/nft-collection')}>
            Создать NFT-карту
          </button>
          <button type="button" className={styles.secondary} onClick={() => router.push('/shop')}>
            Открыть торговую площадку
          </button>
        </div>

        <p className={styles.note}>
          Важно: заработок зависит от спроса и фактической покупки карты другим игроком.
          Перед криптосделкой всегда проверяйте выбранную сеть и адрес кошелька.
        </p>
      </div>
    </main>
  );
}
