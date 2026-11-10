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
import { bonusRule, bonusTitle, bonusTop, featureLines, gameMood, symbolLabel, volatilityLabel } from '@/lib/slots/i18n';
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
  if (game.id === 'mad-dj') {
    return 'Поле 5×5. Кластер из 5–7, 8–11 и 12+ одинаковых символов, соединённых сторонами, платит от всей ставки. Дикий входит в кластер. Бомба, стрелки Ways и Nudge сами не платят: бомба красит соседей и становится дикой, стрелка режет свою строку, Nudge умножает кластер на своём барабане.';
  }
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
  if (game.id === 'mad-dj') {
    return 'A 5×5 board. A cluster of 5–7, 8–11 and 12+ matching symbols connected by sides pays from the whole stake. Wild joins the cluster. The bomb, Ways arrows and Nudge do not pay on their own: the bomb paints its neighbours and becomes wild, an arrow cuts its row, and Nudge multiplies a cluster on its reel.';
  }
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
    if (symbol.bomb) return 'Blows up every cell one step away. Those cells become one symbol, and the bomb becomes wild';
    if (symbol.way === 'left') return 'Cuts ordinary symbols on its row, to the left, then becomes wild';
    if (symbol.way === 'right') return 'Cuts ordinary symbols on its row, to the right, then becomes wild';
    if (symbol.nudge) return 'Opens a record on its reel. The DJ stops it on x2, x3, x5, x8 or x10';
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
  if (symbol.bomb) return 'Взрывает клетки в радиусе одной. Они становятся одним символом, бомба — дикой';
  if (symbol.way === 'left') return 'Режет обычные символы своей строки влево и сама становится дикой';
  if (symbol.way === 'right') return 'Режет обычные символы своей строки вправо и сама становится дикой';
  if (symbol.nudge) return 'Открывает пластинку на своём барабане. Диджей останавливает x2, x3, x5, x8 или x10';
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

const MECHANIC_EN: Record<SlotGame['mechanic'], { title: string; text: string }> = {
  lines: { title: 'Lines', text: 'Matching symbols left to right on fixed lines. Scatter pays from the total play. Everything else pays from the line bet.' },
  'both-ways': { title: 'Lines both ways', text: 'Matching symbols count left to right and right to left. One line can pay twice.' },
  ways: { title: 'Ways · 1024 ways', text: 'Matching symbols on neighbouring reels, left to right, on any row. More ways mean a bigger win.' },
  'scatter-pays': { title: 'Board 6×5', text: 'Pays 8 or more matching symbols anywhere. The win lights up and breaks, and new symbols fall. The orb stands in and multiplies the symbols it hits.' },
  cluster: { title: 'Clusters 6×6', text: 'Pays 5 or more matching symbols connected by sides. The winning cluster disappears and new symbols fall.' },
};

export default function SlotInfo({ game, bet, gram, onClose }: Props) {
  const { lang } = useSlotLocale();
  const en = lang === 'en';
  const [page, setPage] = useState(0);
  const pages = 4;
  const mechanic = game.id === 'mad-dj'
    ? (en
      ? { title: 'Clusters 5×5', text: 'Five or more matching symbols connected by sides pay from the whole stake, then burst. New symbols fall in. A bomb, a Ways arrow and Nudge play before the count.' }
      : { title: 'Кластеры 5×5', text: 'Пять и больше одинаковых символов, соединённых сторонами, платят от всей ставки и лопаются. Сверху падают новые. Бомба, стрелка Ways и Nudge срабатывают до подсчёта.' })
    : (en ? MECHANIC_EN : MECHANIC)[game.mechanic];
  const nameOf = (symbol: SlotSymbol) => symbolLabel(game, symbol, lang);
  const trigger = triggerSymbol(game);
  const wilds = game.symbols.filter((symbol) => symbol.wild && !symbol.multiplier);
  const multipliers = game.symbols.filter((symbol) => symbol.multiplier);
  const extras = game.symbols.filter((symbol) => symbol.orb || symbol.mystery);
  const ordered = [...game.symbols].sort((a, b) => symbolRank(a) - symbolRank(b) || a.pays[2] - b.pays[2]);
  return (
    <div className={styles.back} onClick={onClose}>
      <div className={`${styles.modal} ${game.id === 'mad-dj' ? styles.dj : ''}`} onClick={(event) => event.stopPropagation()} role="dialog" aria-label={en ? 'Rules' : 'Правила'}>
        <button type="button" className={styles.close} onClick={onClose} aria-label={en ? 'Close' : 'Закрыть'}>×</button>
        {page === 0 && (
          <>
            <h2>{en ? 'How the feature starts' : 'Как открыть бонус'}</h2>
            {trigger ? (
              <div className={styles.roster}>
                <div>
                  <img src={slotArt(game.id, trigger.id)} alt="" />
                  <b>{en ? 'SCATTER' : 'Скаттер'}</b>
                  <span>{game.id === 'green-arrow'
                    ? (en ? 'The apple lands only on reels 2, 3, 4 and 5, one per reel, never on the first. 3 apples start the volley for 15 spins. 4 apples start the 6×6 range.' : 'Яблочко падает только на барабаны 2, 3, 4 и 5, не больше одного на барабан и никогда на первый. 3 яблочка — залп на 15 спинов. 4 яблочка — тир 6×6.')
                    : (en ? `${game.trigger}× ${nameOf(trigger)} anywhere starts “${bonusTitle(game, lang)}”` : `${game.trigger}× ${trigger.name} в любом месте открывают «${game.bonus.title}»`)}</span>
                </div>
                {wilds.map((symbol) => (
                  <div key={symbol.id}>
                    <img src={slotArt(game.id, symbol.id)} alt="" />
                    <b>WILD</b>
                    <span>{game.bonus.kind === 'sticky-reels'
                      ? (en ? `${nameOf(symbol)} is wild. A curtain covers the whole reel and shows a multiplier` : `${symbol.name} — вайлд. Штора закрывает весь барабан и показывает множитель`)
                      : (en ? `${nameOf(symbol)} stands in for every symbol except scatter` : `${symbol.name} заменяет символы, кроме скаттера`)}</span>
                  </div>
                ))}
                {multipliers.map((symbol) => (
                  <div key={symbol.id}>
                    <img src={slotArt(game.id, symbol.id)} alt="" />
                    <b>x{symbol.multiplier}</b>
                    <span>{symbol.bonusOnly ? (en ? 'wild in the feature only' : 'вайлд только в бонусе') : (en ? 'wild with a line multiplier' : 'вайлд с множителем линии')}</span>
                  </div>
                ))}
                {extras.map((symbol) => (
                  <div key={symbol.id}>
                    <img src={slotArt(game.id, symbol.id)} alt="" />
                    <b>{symbol.orb ? (en ? 'ORB' : 'ШАР') : (en ? 'MYSTERY' : 'МИСТИКА')}</b>
                    <span>{symbol.orb
                      ? (en ? `${nameOf(symbol)} stands in for any symbol and multiplies the ones it hits` : `${symbol.name} заменяет любой символ и умножает те, с которыми сыграл`)
                      : (en ? `${nameOf(symbol)} opens into one shared symbol` : `${symbol.name} раскрывается в один общий символ`)}</span>
                  </div>
                ))}
              </div>
            ) : null}
            <p>{en ? `Round cap is x${game.maxWinMultiplier} of the play.` : `Потолок раунда — x${game.maxWinMultiplier} ставки.`}</p>
            <p>{en ? bonusRule(game, 'en') : game.bonus.rule}</p>
            <h2>{en ? 'Pays' : 'Выплаты'}</h2>
            <p className={styles.note}>{(en ? mathRuleEn : mathRule)(game, bet, gram)} {en ? 'Card amounts are already in coins at the current play size.' : 'Суммы в карточках — уже в монетах при текущей ставке.'}</p>
            <div className={styles.symbols}>
              {ordered.map((symbol) => (
                <div key={symbol.id} className={styles.symbol}>
                  <span className={styles.thumb}>
                    <img src={slotArt(game.id, symbol.id)} alt="" />
                    {symbol.way ? <em>WAYS</em> : null}
                  </span>
                  <strong>{nameOf(symbol)}</strong>
                  <span>{symbol.bonusOnly ? `${en ? 'feature only. ' : 'только в бонусе. '}${payHint(game, symbol, en)}` : payHint(game, symbol, en)}</span>
                  <b>
                    {symbol.pays.every((value) => value === 0)
                      ? (en ? 'does not pay by itself' : 'не платит сам')
                      : `${formatPay(payout(game, bet, symbol.pays[0], symbol), gram)} · ${formatPay(payout(game, bet, symbol.pays[1], symbol), gram)} · ${formatPay(payout(game, bet, symbol.pays[2], symbol), gram)}`}
                  </b>
                </div>
              ))}
            </div>
          </>
        )}
        {page === 1 && (
          <>
            <h2>{bonusTitle(game, lang)}</h2>
            <img className={styles.hero} src={slotArt(game.id, game.symbols.find((symbol) => symbol.scatter)?.id ?? game.symbols.find((symbol) => symbol.bonusCoin)?.id ?? 'scatter')} alt="" />
            <p>{en
              ? `Land ${game.trigger}× ${trigger ? nameOf(trigger) : bonusTitle(game, lang)} and this feature starts.`
              : `Собери ${game.trigger}× ${trigger?.name ?? ''} — и начнётся этот бонус.`}</p>
            <p>{bonusRule(game, lang)}</p>
            {game.bonus.kind === 'sticky-reels' && (
              <div className={styles.curtainCard}>
                <img src={slotHero(game.id)} alt="" />
                <div>
                  <strong>{en ? 'Curtain' : 'Штора'}</strong>
                  <span>{en ? 'Covers a whole reel. The Mustache steps out of the gold and shows a multiplier. On one line the multipliers add.' : 'Закрывает барабан целиком. Ус выходит из золота и показывает множитель. На одной линии множители складываются.'}</span>
                  <b>{CURTAIN_MULTIPLIERS.map((value) => `x${value}`).join(' · ')}</b>
                </div>
              </div>
            )}
            <p><b>{en ? 'Super feature.' : 'Большой выигрыш.'}</b> {bonusTop(game, lang)}</p>
            <p>{gameMood(game, lang)}</p>
            <p>{en ? <>Round cap is <b>x{game.maxWinMultiplier}</b> of the stake. Volatility: {volatilityLabel(game, lang)}.</> : <>Потолок одного раунда — <b>x{game.maxWinMultiplier}</b> ставки. Волатильность: {game.volatility}.</>}</p>
            <p>{en ? 'Ante adds 50% to the stake and gives an extra 16.77% chance that one more trigger symbol lands.' : 'Анте прибавляет 50% к ставке и даёт дополнительные 16.77% шанса, что на поле появится ещё один символ-триггер.'}</p>
            {game.bonus.kind === 'hold-win' && (
              <div className={styles.buys}>
                {HOLD_WIN_VALUES.filter((entry) => entry.pot).map((entry) => (
                  <div key={entry.pot}>
                    <strong>{entry.pot === 'mini' ? 'Mini' : entry.pot === 'minor' ? 'Minor' : 'Major'}</strong>
                    <span>{en ? 'fixed prize' : 'фиксированный приз'}</span>
                    <b>x{entry.value}</b>
                  </div>
                ))}
                <div>
                  <strong>Grand</strong>
                  <span>{en ? 'full board of 15 coins' : 'полное поле 15 монет'}</span>
                  <b>x{HOLD_WIN_GRAND}</b>
                </div>
              </div>
            )}
            {game.bonus.kind === 'wheel' && (
              <>
                <p>{en ? 'Wheel 1' : 'Колесо 1'}: {WHEEL_LEVEL_1.map((segment) => segment.label).join(' · ')}</p>
                <p>{en ? 'Wheel 2' : 'Колесо 2'}: {WHEEL_LEVEL_2.map((segment) => segment.label).join(' · ')}</p>
              </>
            )}
            {game.bonus.kind === 'pick' && (
              <p>{en ? 'Regular feature, 3 apples: 15 spins, the archer throws 1 to 6 wilds. A multiplier arrow from x2 to x10 can stay until the end. Top feature, 4 apples: a 6×6 field, exactly 6 misses, the third miss ends the range, multipliers from x10 to x2500.' : 'Обычный бонус, 3 яблочка: 15 спинов, лучник бросает от 1 до 6 диких. Иногда стрела с множителем x2–x10 остаётся на клетке до конца. Топовый бонус, 4 яблочка: поле 6×6, ровно 6 промахов, третий промах заканчивает тир, множители от x10 до x2500.'}</p>
            )}
          </>
        )}
        {page === 2 && (
          <>
            <h2>{en ? 'Features' : 'Функции'}</h2>
            <ul className={styles.list}>
              {featureLines(game, lang).map((item) => <li key={item}>{item}</li>)}
            </ul>
            <div className={styles.buys}>
              <div>
                <strong>{en ? 'Feature' : 'Бонус'}</strong>
                <span>{en ? 'costs one hundred stakes' : 'стоит сто текущих ставок'}</span>
                <b>{en ? 'floor of ten stakes' : 'гарантия десять ставок'}</b>
              </div>
              <div>
                <strong>{en ? 'Super feature' : 'Супер-бонус'}</strong>
                <span>{en ? 'costs five hundred stakes' : 'стоит пятьсот текущих ставок'}</span>
                <b>{en ? 'floor of fifty stakes' : 'гарантия пятьдесят ставок'}</b>
              </div>
            </div>
            <p>{bonusTop(game, lang)}</p>
            <p className={styles.note}>
              {game.id === 'mad-dj'
                ? (en
                  ? `Ante is 1.5× the stake. The feature costs 100×, the super feature 500×. One round stops at x${game.maxWinMultiplier}.`
                  : `Анте — 1.5 ставки. Бонус стоит 100 ставок, супер-бонус — 500. Раунд останавливается на x${game.maxWinMultiplier}.`)
                : (en
                  ? `A paid round is drawn on the server. The stake leaves the balance when the round starts, and the win is credited after the reels finish. Demo stays in the browser. Ante costs 1.5×, bonus buy 100×, super buy 500×. The cap is x${game.maxWinMultiplier}. Stake needs a separate book and lookup table for base, ante, buy and super buy, each inside the published RTP band.`
                  : `Платный раунд считается на сервере. Ставка списывается в момент пуска, выигрыш зачисляется после ролика. Демо остаётся в браузере. Анте стоит 1.5 ставки, покупка бонуса — 100, супер-покупка — 500. Потолок раунда — x${game.maxWinMultiplier}. Для Stake у базы, анте, покупки и супер-покупки отдельные книга и таблица весов, и каждый режим должен попасть в заявленную полосу RTP.`)}
            </p>
          </>
        )}
        {page === 3 && (
          <>
            <h2>{mechanic.title}{game.mechanic === 'lines' || game.mechanic === 'both-ways' ? ` · ${game.lines.length}` : ''}</h2>
            <p>{(en ? mathRuleEn : mathRule)(game, bet, gram)}</p>
            {(game.mechanic === 'lines' || game.mechanic === 'both-ways') ? (
              <p className={styles.note}>{en ? 'The top row of the diagram is the top of the board. A gold cell is on the line. The line number matches the win ribbon.' : 'Верхний ряд схемы — верх поля. Жёлтая клетка входит в линию. Номер линии совпадает с номером в ленте выигрыша.'}</p>
            ) : null}
            {(game.mechanic === 'lines' || game.mechanic === 'both-ways') && game.lines.length > 0 && (
              <div className={styles.lines}>
                {game.lines.map((line, index) => (
                  <div key={index} className={styles.line} title={en ? `Line ${index + 1}` : `Линия ${index + 1}`}>
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
          <button type="button" onClick={() => setPage((value) => (value + pages - 1) % pages)} aria-label={en ? 'Back' : 'Назад'}>‹</button>
          <span>{page + 1} / {pages}</span>
          <button type="button" onClick={() => setPage((value) => (value + 1) % pages)} aria-label={en ? 'Next' : 'Дальше'}>›</button>
        </div>
      </div>
    </div>
  );
}
