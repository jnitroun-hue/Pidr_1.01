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
import { useSlotLocale } from '@/lib/slots/locale';
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

function mathRuleEn(game: SlotGame, bet: number, gram: boolean): string {
  if (game.mechanic === 'lines' || game.mechanic === 'both-ways') {
    const lines = game.lines.length;
    const lineBet = moneyPlain(bet / lines, gram);
    const side = game.mechanic === 'both-ways'
      ? ' The same line also pays right to left. A line that fills every reel pays once.'
      : ' Lines pay left to right only.';
    return `${lines} fixed lines on a ${game.reels}×${game.rows} board. Line bet = total play / ${lines} = ${lineBet}. A line win is the symbol coefficient times the line bet, rounded to a whole coin. Minimum 3 of a kind.${side} Wild stands in for every symbol except scatter. A wild-only line pays the richest regular symbol. Wild multipliers multiply. Scatter breaks the line and pays from the total play: the card shows 3, 4 and 5 scatters.`;
  }
  if (game.mechanic === 'ways') {
    const ways = game.rows ** game.reels;
    return `${game.reels}×${game.rows}, up to ${ways} ways left to right. Win = coefficient × (play / ${WAYS_DIVISOR}) × ways, rounded to a whole coin. The table is for one way. Scatter pays from the total play and does not take a way.`;
  }
  if (game.mechanic === 'scatter-pays') {
    return `${game.reels}×${game.rows}. Pays 8–9, 10–11 and 12+ matching symbols anywhere, from the total play. The orb stands in and adds its cells, and the win is multiplied by the orbs in it.`;
  }
  return `${game.reels}×${game.rows}. A cluster of 5–7, 8–11 and 12+ matching symbols connected by sides pays from the total play. Wild joins the cluster.`;
}

function payHint(game: SlotGame, symbol: SlotSymbol, en: boolean): string {
  if (en) {
    if (symbol.scatter) return game.id === 'green-arrow' ? '3 starts the volley, 4 starts the range. Pays for 3 / 4 / 5 from the total play' : `${game.trigger}+ starts the feature. Pays for 3 / 4 / 5 from the total play`;
    if (symbol.bonusCoin) return `${game.trigger}+ starts the feature. Does not pay on lines`;
    if (symbol.wild && symbol.multiplier) return `wild and multiplier x${symbol.multiplier}`;
    if (symbol.wild && game.bonus.kind === 'sticky-reels') return 'wild. A curtain covers the whole reel';
    if (symbol.wild) return 'wild: stands in for every symbol except scatter';
    if (symbol.orb) return 'wild and a multiplier for the symbols it hits';
    if (symbol.mystery) return 'opens into one shared symbol';
    if (game.mechanic === 'scatter-pays') return '8–9 / 10–11 / 12+, from the total play';
    if (game.mechanic === 'cluster') return '5–7 / 8–11 / 12+, from the total play';
    if (game.mechanic === 'ways') return '3 / 4 / 5 reels, per way';
    return '3 / 4 / 5 on a line';
  }
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
  const { lang } = useSlotLocale();
  const en = lang === 'en';
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
      <div className={styles.modal} onClick={(event) => event.stopPropagation()} role="dialog" aria-label={en ? 'Rules' : 'Правила'}>
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
            <p>{en ? `Round cap is x${game.maxWinMultiplier} of the play.` : `Потолок раунда — x${game.maxWinMultiplier} ставки.`}</p>
            <p>{en ? (game.bonus.kind === 'sticky-reels' ? 'The wheel, the free spins and every curtain are dealt before the reels play them.' : game.bonus.kind === 'pick' ? 'The field is dealt with the spin. The apple you tap is the one that opens.' : 'The feature is dealt with the spin. The reels play that result.') : game.bonus.rule}</p>
            <h2>{en ? 'Pays' : 'Выплаты'}</h2>
            <p className={styles.note}>{(en ? mathRuleEn : mathRule)(game, bet, gram)} {en ? 'Card amounts are already in coins at the current play size.' : 'Суммы в карточках — уже в монетах при текущей ставке.'}</p>
            <div className={styles.symbols}>
              {ordered.map((symbol) => (
                <div key={symbol.id} className={styles.symbol}>
                  <img src={slotArt(game.id, symbol.id)} alt="" />
                  <strong>{en ? symbol.id : symbol.name}</strong>
                  <span>{symbol.bonusOnly ? `${en ? 'feature only. ' : 'только в бонусе. '}${payHint(game, symbol, en)}` : payHint(game, symbol, en)}</span>
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
            <p>{en ? `Land ${game.trigger}× ${game.symbols.find((symbol) => symbol.scatter)?.name ?? game.symbols.find((symbol) => symbol.bonusCoin)?.name} to start the feature.` : `Собери ${game.trigger}× ${game.symbols.find((symbol) => symbol.scatter)?.name ?? game.symbols.find((symbol) => symbol.bonusCoin)?.name} — и начнётся этот бонус.`}</p>
            <p>{en ? (game.id === 'golden-must' ? '3 scatters start the regular feature, 4 start the top feature, 5 starts Hot Mod with two curtains. The wheel sets the spins and the minimum curtain before anything spins.' : game.bonus.kind === 'pick' ? 'The field is dealt with the spin. The apple you tap is the one that opens.' : 'The feature is dealt with the spin. The reels play that result.') : game.bonus.rule}</p>
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
            <p className={styles.note}>
              {en
                ? `A paid round is drawn on the server. The stake leaves the balance when the round starts, and the win is credited after the reels finish. Demo stays in the browser. Ante costs 1.5×, bonus buy 100×, super buy 500×. The cap is x${game.maxWinMultiplier}. Stake needs a separate book and lookup table for base, ante, buy and super buy, each inside the published RTP band.`
                : `Платный раунд считается на сервере. Ставка списывается в момент пуска, выигрыш зачисляется после ролика. Демо остаётся в браузере. Анте стоит 1.5 ставки, покупка бонуса — 100, супер-покупка — 500. Потолок раунда — x${game.maxWinMultiplier}. Для Stake у базы, анте, покупки и супер-покупки отдельные книга и таблица весов, и каждый режим должен попасть в заявленную полосу RTP.`}
            </p>
          </>
        )}
        {page === 3 && (
          <>
            <h2>{mechanic.title}{game.mechanic === 'lines' || game.mechanic === 'both-ways' ? ` · ${game.lines.length}` : ''}</h2>
            <p>{(en ? mathRuleEn : mathRule)(game, bet, gram)}</p>
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
