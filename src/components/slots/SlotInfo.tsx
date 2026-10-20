'use client';

import { useState } from 'react';
import {
  CURTAIN_MULTIPLIERS,
  HOLD_WIN_GRAND,
  HOLD_WIN_VALUES,
  lineCoinWin,
  triggerSymbol,
  WAYS_DIVISOR,
  wayCoinWin,
  WHEEL_LEVEL_1,
  WHEEL_LEVEL_2,
  type SlotGame,
  type SlotSymbol,
} from '@/lib/slots/games';
import { slotArt, slotHero } from '@/lib/slots/art';
import styles from './SlotInfo.module.css';

type Props = { game: SlotGame; bet: number; gram: boolean; onClose: () => void };

function formatPay(value: number, gram: boolean): string {
  if (gram) return (value / 100).toFixed(2);
  return String(Math.round(value));
}

function payout(game: SlotGame, bet: number, pays: number, symbol: SlotSymbol): number {
  if (symbol.scatter || symbol.orb || symbol.bonusCoin || symbol.mystery) return Math.round(bet * pays);
  if (game.mechanic === 'ways') return wayCoinWin(bet, pays);
  if (game.mechanic === 'scatter-pays' || game.mechanic === 'cluster') return Math.round(bet * pays);
  return lineCoinWin(bet, Math.max(1, game.lines.length), pays);
}

function moneyPlain(value: number, gram: boolean): string {
  if (gram) return (value / 100).toFixed(2);
  const rounded = Math.round(value * 100) / 100;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(2);
}

function mathRule(game: SlotGame, bet: number, gram: boolean): string {
  if (game.mechanic === 'lines' || game.mechanic === 'both-ways') {
    const lines = game.lines.length;
    const lineBet = moneyPlain(bet / lines, gram);
    const side = game.mechanic === 'both-ways'
      ? ' Та же линия считается справа налево отдельно. Если комбинация закрыла все барабаны, линия платит один раз, без второй выплаты.'
      : ' Считается только слева направо.';
    return `${lines} фиксированных линий на поле ${game.reels}×${game.rows}. Ставка на линию = общая ставка / ${lines} = ${lineBet}. Выигрыш линии = коэффициент символа × ставка на линию, округление до целой монеты. Нужно минимум 3 одинаковых.${side} Вайлд заменяет любой символ, кроме скаттера. Линия из одних вайлдов платит как самый дорогой обычный символ. Множители вайлдов на выигрышных клетках перемножаются. Скаттер линию рвёт и платит отдельно от всей ставки: числа в его карточке — это 3, 4 и 5 скаттеров.`;
  }
  if (game.mechanic === 'ways') {
    const ways = game.rows ** game.reels;
    return `Поле ${game.reels}×${game.rows}, до ${ways} путей слева направо: символ на соседних барабанах в любом ряду. Выигрыш = коэффициент × (ставка / ${WAYS_DIVISOR}) × число путей, до целой монеты. Числа в таблице — за один путь. Вайлд увеличивает число путей. Скаттер платит от всей ставки и пути не занимает.`;
  }
  if (game.mechanic === 'scatter-pays') {
    return `Поле ${game.reels}×${game.rows}. Платит 8–9, 10–11 и 12+ одинаковых символов где угодно, от всей ставки. Шар заменяет любой символ и прибавляет свои клетки к счётчику, а выигрыш умножается на сумму шаров, которые в нём участвовали.`;
  }
  return `Поле ${game.reels}×${game.rows}. Платит кластер из 5–7, 8–11 и 12+ одинаковых символов, соединённых сторонами, от всей ставки. Вайлд входит в кластер.`;
}

function payHint(game: SlotGame, symbol: SlotSymbol): string {
  if (symbol.scatter) return game.id === 'green-arrow' ? '3 — залп, 4 — тир. Выплата за 3 / 4 / 5 от всей ставки' : `${game.trigger}+ открывают бонус. Выплата за 3 / 4 / 5 от всей ставки`;
  if (symbol.bonusCoin) return `${game.trigger}+ открывают бонус. По линиям не платит`;
  if (symbol.wild && symbol.multiplier) return `вайлд и множитель x${symbol.multiplier}`;
  if (symbol.wild && game.bonus.kind === 'sticky-reels') return 'вайлд. Штора закрывает весь барабан';
  if (symbol.wild) return 'вайлд: заменяет символы, кроме скаттера';
  if (symbol.orb) return 'вайлд и множитель символов, с которыми сыграл';
  if (symbol.mystery) return 'раскрывается в один общий символ';
  if (game.mechanic === 'scatter-pays') return '8–9 / 10–11 / 12+, от всей ставки';
  if (game.mechanic === 'cluster') return '5–7 / 8–11 / 12+, от всей ставки';
  if (game.mechanic === 'ways') return '3 / 4 / 5 барабана, за 1 путь';
  return '3 / 4 / 5 в линии';
}

function symbolRank(symbol: SlotSymbol): number {
  if (symbol.scatter || symbol.bonusCoin) return 0;
  if (symbol.wild && symbol.multiplier) return 1;
  if (symbol.wild) return 2;
  if (symbol.orb || symbol.mystery) return 3;
  return 4;
}

const MECHANIC: Record<SlotGame['mechanic'], { title: string; text: string }> = {
  lines: { title: 'Линии', text: 'Одинаковые символы слева направо по фиксированным линиям. Скаттер платит от всей ставки, остальные — от ставки на линию.' },
  'both-ways': { title: 'Линии в обе стороны', text: 'Одинаковые символы считаются и слева направо, и справа налево. Одна линия может заплатить дважды.' },
  ways: { title: 'Пути · 1024 ways', text: 'Одинаковые символы на соседних барабанах слева направо, в любом ряду. Чем больше способов собрать символ, тем выше выплата.' },
  'scatter-pays': { title: 'Поле 6×5', text: 'Платит 8 и больше одинаковых символов где угодно. Выигрыш подсвечивается и лопается, сверху падают новые. Шар заменяет любой символ и умножает те, с которыми сыграл.' },
  cluster: { title: 'Кластеры 6×6', text: 'Платит 5 и больше одинаковых символов, соединённых по сторонам. Выигрышный кластер исчезает, сверху падают новые.' },
};

export default function SlotInfo({ game, bet, gram, onClose }: Props) {
  const [page, setPage] = useState(0);
  const pages = 4;
  const mechanic = MECHANIC[game.mechanic];
  const trigger = triggerSymbol(game);
  const wilds = game.symbols.filter((symbol) => symbol.wild && !symbol.multiplier);
  const multipliers = game.symbols.filter((symbol) => symbol.multiplier);
  const extras = game.symbols.filter((symbol) => symbol.orb || symbol.mystery);
  const ordered = [...game.symbols].sort((a, b) => symbolRank(a) - symbolRank(b) || a.pays[2] - b.pays[2]);
  return (
    <div className={styles.back} onClick={onClose}>
      <div className={styles.modal} onClick={(event) => event.stopPropagation()} role="dialog" aria-label="Правила">
        <button type="button" className={styles.close} onClick={onClose} aria-label="Закрыть">×</button>
        {page === 0 && (
          <>
            <h2>Как открыть бонус</h2>
            {trigger ? (
              <div className={styles.roster}>
                <div>
                  <img src={slotArt(game.id, trigger.id)} alt="" />
                  <b>Скаттер</b>
                  <span>{game.id === 'green-arrow' ? 'Яблочко падает только на барабаны 2, 3, 4 и 5, не больше одного на барабан и никогда на первый. 3 яблочка — залп на 15 спинов. 4 яблочка — тир 6×6.' : `${game.trigger}× ${trigger.name} в любом месте открывают «${game.bonus.title}»`}</span>
                </div>
                {wilds.map((symbol) => (
                  <div key={symbol.id}>
                    <img src={slotArt(game.id, symbol.id)} alt="" />
                    <b>WILD</b>
                    <span>{game.bonus.kind === 'sticky-reels' ? `${symbol.name} — вайлд. Штора закрывает весь барабан и показывает множитель` : `${symbol.name} заменяет символы, кроме скаттера`}</span>
                  </div>
                ))}
                {multipliers.map((symbol) => (
                  <div key={symbol.id}>
                    <img src={slotArt(game.id, symbol.id)} alt="" />
                    <b>x{symbol.multiplier}</b>
                    <span>{symbol.bonusOnly ? 'вайлд только в бонусе' : 'вайлд с множителем линии'}</span>
                  </div>
                ))}
                {extras.map((symbol) => (
                  <div key={symbol.id}>
                    <img src={slotArt(game.id, symbol.id)} alt="" />
                    <b>{symbol.orb ? 'ШАР' : 'МИСТИКА'}</b>
                    <span>{symbol.orb ? `${symbol.name} заменяет любой символ и умножает те, с которыми сыграл` : `${symbol.name} раскрывается в один общий символ`}</span>
                  </div>
                ))}
              </div>
            ) : null}
            <p>Потолок раунда — x{game.maxWinMultiplier} ставки.</p>
            <p>{game.bonus.rule}</p>
            <h2>Выплаты</h2>
            <p className={styles.note}>{mathRule(game, bet, gram)} Суммы в карточках — уже в монетах при текущей ставке.</p>
            <div className={styles.symbols}>
              {ordered.map((symbol) => (
                <div key={symbol.id} className={styles.symbol}>
                  <img src={slotArt(game.id, symbol.id)} alt="" />
                  <strong>{symbol.name}</strong>
                  <span>{symbol.bonusOnly ? `только в бонусе. ${payHint(game, symbol)}` : payHint(game, symbol)}</span>
                  <b>
                    {symbol.pays.every((value) => value === 0)
                      ? 'не платит сам'
                      : `${formatPay(payout(game, bet, symbol.pays[0], symbol), gram)} · ${formatPay(payout(game, bet, symbol.pays[1], symbol), gram)} · ${formatPay(payout(game, bet, symbol.pays[2], symbol), gram)}`}
                  </b>
                </div>
              ))}
            </div>
          </>
        )}
        {page === 1 && (
          <>
            <h2>{game.bonus.title}</h2>
            <img className={styles.hero} src={slotArt(game.id, game.symbols.find((symbol) => symbol.scatter)?.id ?? game.symbols.find((symbol) => symbol.bonusCoin)?.id ?? 'scatter')} alt="" />
            <p>Собери {game.trigger}× {game.symbols.find((symbol) => symbol.scatter)?.name ?? game.symbols.find((symbol) => symbol.bonusCoin)?.name} — и начнётся этот бонус.</p>
            <p>{game.bonus.rule}</p>
            {game.bonus.kind === 'sticky-reels' && (
              <div className={styles.curtainCard}>
                <img src={slotHero(game.id)} alt="" />
                <div>
                  <strong>Штора</strong>
                  <span>Закрывает барабан целиком. Ус выходит из золота и показывает множитель. На одной линии множители складываются.</span>
                  <b>{CURTAIN_MULTIPLIERS.map((value) => `x${value}`).join(' · ')}</b>
                </div>
              </div>
            )}
            <p><b>Большой выигрыш.</b> {game.bonus.top}</p>
            <p>{game.mood}</p>
            <p>Потолок одного раунда — <b>x{game.maxWinMultiplier}</b> ставки. Волатильность: {game.volatility}.</p>
            <p>Анте прибавляет 50% к ставке и даёт дополнительные 16.77% шанса, что на поле появится ещё один символ-триггер.</p>
            {game.bonus.kind === 'hold-win' && (
              <div className={styles.buys}>
                {HOLD_WIN_VALUES.filter((entry) => entry.pot).map((entry) => (
                  <div key={entry.pot}>
                    <strong>{entry.pot === 'mini' ? 'Mini' : entry.pot === 'minor' ? 'Minor' : 'Major'}</strong>
                    <span>фиксированный приз</span>
                    <b>x{entry.value}</b>
                  </div>
                ))}
                <div>
                  <strong>Grand</strong>
                  <span>полное поле 15 монет</span>
                  <b>x{HOLD_WIN_GRAND}</b>
                </div>
              </div>
            )}
            {game.bonus.kind === 'wheel' && (
              <>
                <p>Колесо 1: {WHEEL_LEVEL_1.map((segment) => segment.label).join(' · ')}</p>
                <p>Колесо 2: {WHEEL_LEVEL_2.map((segment) => segment.label).join(' · ')}</p>
              </>
            )}
            {game.bonus.kind === 'pick' && (
              <p>Обычный бонус, 3 яблочка: 15 спинов, лучник бросает от 1 до 6 диких. Иногда стрела с множителем x2–x10 остаётся на клетке до конца. Топовый бонус, 4 яблочка: поле 6×6, ровно 6 промахов, третий промах заканчивает тир, множители от x10 до x2500.</p>
            )}
          </>
        )}
        {page === 2 && (
          <>
            <h2>Функции</h2>
            <ul className={styles.list}>
              {game.features.map((item) => <li key={item}>{item}</li>)}
            </ul>
            <div className={styles.buys}>
              <div>
                <strong>Бонус</strong>
                <span>стоит сто текущих ставок</span>
                <b>гарантия десять ставок</b>
              </div>
              <div>
                <strong>Супер-бонус</strong>
                <span>стоит пятьсот текущих ставок</span>
                <b>гарантия пятьдесят ставок</b>
              </div>
            </div>
            <p>{game.bonus.top}</p>
            <p className={styles.note}>Покупка сразу открывает бонус этой игры. После одобрения на Stake Engine математика и механика больше не меняются.</p>
          </>
        )}
        {page === 3 && (
          <>
            <h2>{mechanic.title}{game.mechanic === 'lines' || game.mechanic === 'both-ways' ? ` · ${game.lines.length}` : ''}</h2>
            <p>{mathRule(game, bet, gram)}</p>
            <p className={styles.note}>Верхний ряд схемы — верх поля. Жёлтая клетка входит в линию. Номер линии совпадает с номером в ленте выигрыша.</p>
            {(game.mechanic === 'lines' || game.mechanic === 'both-ways') && game.lines.length > 0 && (
              <div className={styles.lines}>
                {game.lines.map((line, index) => (
                  <div key={index} className={styles.line} title={`Линия ${index + 1}`}>
                    <em>{index + 1}</em>
                    {Array.from({ length: game.reels }, (_, reel) => (
                      <span key={reel}>
                        {Array.from({ length: game.rows }, (_, row) => (
                          <i key={row} className={line[reel] === row ? styles.on : ''} />
                        ))}
                      </span>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </>
        )}
        <div className={styles.nav}>
          <button type="button" onClick={() => setPage((value) => (value + pages - 1) % pages)} aria-label="Назад">‹</button>
          <span>{page + 1} / {pages}</span>
          <button type="button" onClick={() => setPage((value) => (value + 1) % pages)} aria-label="Дальше">›</button>
        </div>
      </div>
    </div>
  );
}
