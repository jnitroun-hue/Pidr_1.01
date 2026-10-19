'use client';

import { useState } from 'react';
import {
  HOLD_WIN_GRAND,
  HOLD_WIN_VALUES,
  PICK_BAG,
  PICK_MISSES,
  PICK_TARGETS,
  WAYS_DIVISOR,
  WHEEL_LEVEL_1,
  WHEEL_LEVEL_2,
  type SlotGame,
  type SlotSymbol,
} from '@/lib/slots/games';
import { slotArt } from '@/lib/slots/art';
import styles from './SlotInfo.module.css';

type Props = { game: SlotGame; bet: number; gram: boolean; onClose: () => void };

function formatPay(value: number, gram: boolean): string {
  if (gram) return (value / 100).toFixed(2);
  return String(Math.round(value));
}

function payout(game: SlotGame, bet: number, pays: number, symbol: SlotSymbol): number {
  if (symbol.scatter || symbol.orb || symbol.bonusCoin || symbol.mystery) return Math.round(bet * pays);
  if (game.mechanic === 'ways') return Math.round((bet / WAYS_DIVISOR) * pays);
  if (game.mechanic === 'scatter-pays' || game.mechanic === 'cluster') return Math.round(bet * pays);
  return Math.round((bet / Math.max(1, game.lines.length)) * pays);
}

function payHint(game: SlotGame, symbol: SlotSymbol): string {
  if (symbol.scatter) return `${game.trigger}+ запускают бонус`;
  if (symbol.wild && symbol.multiplier) return `дикий x${symbol.multiplier}`;
  if (symbol.wild) return 'заменяет';
  if (symbol.bonusCoin) return 'монета Hold & Win';
  if (symbol.orb) return 'шар-множитель';
  if (symbol.mystery) return 'раскрывается в общий символ';
  if (game.mechanic === 'scatter-pays') return '8–9 / 10–11 / 12+';
  if (game.mechanic === 'cluster') return '5–7 / 8–11 / 12+';
  return '3 / 4 / 5';
}

const MECHANIC: Record<SlotGame['mechanic'], { title: string; text: string }> = {
  lines: { title: 'Линии', text: 'Одинаковые символы слева направо по фиксированным линиям. Скаттер платит от всей ставки, остальные — от ставки на линию.' },
  'both-ways': { title: 'Линии в обе стороны', text: 'Одинаковые символы считаются и слева направо, и справа налево. Одна линия может заплатить дважды.' },
  ways: { title: 'Пути · 1024 ways', text: 'Одинаковые символы на соседних барабанах слева направо, в любом ряду. Чем больше способов собрать символ, тем выше выплата.' },
  'scatter-pays': { title: 'Scatter pays 6×5', text: 'Платит 8 и больше одинаковых символов где угодно на поле. Выигрыш лопается, сверху падают новые. Шары умножают каскад.' },
  cluster: { title: 'Кластеры 6×6', text: 'Платит 5 и больше одинаковых символов, соединённых по сторонам. Выигрышный кластер исчезает, сверху падают новые.' },
};

export default function SlotInfo({ game, bet, gram, onClose }: Props) {
  const [page, setPage] = useState(0);
  const pages = 4;
  const mechanic = MECHANIC[game.mechanic];
  return (
    <div className={styles.back} onClick={onClose}>
      <div className={styles.modal} onClick={(event) => event.stopPropagation()} role="dialog" aria-label="Правила">
        <button type="button" className={styles.close} onClick={onClose} aria-label="Закрыть">×</button>
        {page === 0 && (
          <>
            <h2>Выплаты</h2>
            <p className={styles.note}>{mechanic.text} WILD заменяет любой символ, кроме скаттера, монеты, шара и мистики. Суммы считаются от текущей ставки.</p>
            <div className={styles.symbols}>
              {game.symbols.filter((symbol) => !symbol.bonusOnly).map((symbol) => (
                <div key={symbol.id} className={styles.symbol}>
                  <img src={slotArt(game.id, symbol.id)} alt="" />
                  <strong>{symbol.name}</strong>
                  <span>{payHint(game, symbol)}</span>
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
            <p>{game.bonus.rule}</p>
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
              <p>На поле {PICK_TARGETS} мишеней. Третий промах заканчивает тир. Множители: {PICK_BAG.filter((token) => token.kind === 'mult').map((token) => `x${token.value}`).join(', ')}. Промахов максимум {PICK_MISSES}.</p>
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
                <span>цена x100 ставки</span>
                <b>не меньше x10</b>
              </div>
              <div>
                <strong>Топ-бонус</strong>
                <span>цена x500 ставки</span>
                <b>не меньше x50</b>
              </div>
            </div>
            <p>{game.bonus.top}</p>
            <p className={styles.note}>Покупка сразу открывает бонус этой игры. После одобрения на Stake Engine математика и механика больше не меняются.</p>
          </>
        )}
        {page === 3 && (
          <>
            <h2>{mechanic.title}{game.mechanic === 'lines' || game.mechanic === 'both-ways' ? ` · ${game.lines.length}` : ''}</h2>
            <p>{mechanic.text}</p>
            {(game.mechanic === 'lines' || game.mechanic === 'both-ways') && game.lines.length > 0 && (
              <div className={styles.lines}>
                {game.lines.map((line, index) => (
                  <div key={index} className={styles.line} title={`Линия ${index + 1}`}>
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
