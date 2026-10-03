'use client';

import { useState } from 'react';
import type { SlotGame } from '@/lib/slots/games';
import { slotArt } from '@/lib/slots/art';
import styles from './SlotInfo.module.css';

const FEATURE: Record<string, string> = {
  'golden-must': 'В бонусе один случайный барабан целиком становится диким. В топовой покупке дикими становятся два барабана.',
  'hex-vault': 'Множитель бесплатных спинов растёт до x5. Топовая покупка усиливает каждый выигрышный спин ещё вдвое.',
  'oak-fortune': 'Дикий символ раскрывается на весь барабан. В бонусе с поля уходят младшие символы.',
  'neon-river': 'Выигрыш считается путями слева направо. В бонусе на каждом барабане есть дикий символ.',
  'limitless-city': 'На выигрыш может выпасть множитель до x50. В бонусе он не ниже x2.',
  'green-arrow': 'Лучник иногда ставит 1 или 2 скаттера. В бонусе каждый спин получает дикую стрелу, в топе — две.',
  'fairy-glade': 'Фея меняет до трёх слабых символов. В бонусе все цветы становятся дикими, в топе ещё и роса.',
  'ash-dragon': 'Дракон умножает уже собранный выигрыш. В бонусе каждый спин идёт с x3, в топе выигрыш ещё удваивается.',
  'frost-queen': 'Королева замораживает один барабан. В бонусе средний барабан все 10 спинов дикий, в топе ещё и первый.',
  'blade-ronin': 'Ронин рубит один горизонтальный ряд. В топ-бонусе за спин рубятся два ряда.',
};

type Props = { game: SlotGame; bet: number; gram: boolean; onClose: () => void };

function payout(game: SlotGame, bet: number, pays: number, scatter: boolean): number {
  if (scatter) return Math.round(bet * pays);
  if (game.mode === 'ways') return Math.round((bet / 165) * pays);
  return Math.round((bet / Math.max(1, game.lines.length)) * pays);
}

function formatPay(value: number, gram: boolean): string {
  return gram ? (value / 100).toFixed(2) : String(value);
}

export default function SlotInfo({ game, bet, gram, onClose }: Props) {
  const [page, setPage] = useState(0);
  const pages = 4;
  return (
    <div className={styles.back} onClick={onClose}>
      <div className={styles.modal} onClick={(event) => event.stopPropagation()} role="dialog" aria-label="Правила">
        <button type="button" className={styles.close} onClick={onClose} aria-label="Закрыть">×</button>
        {page === 0 && (
          <>
            <h2>Выплаты</h2>
            <p className={styles.note}>Суммы считаются от текущей ставки: 3, 4 и 5 одинаковых. Скаттер платит от всей ставки, остальные символы — от ставки на линию. WILD заменяет любой символ, кроме скаттера.</p>
            <div className={styles.symbols}>
              {game.symbols.map((symbol) => (
                <div key={symbol.id} className={styles.symbol}>
                  <img src={slotArt(game.id, symbol.id)} alt="" />
                  <strong>{symbol.name}</strong>
                  <span>{symbol.scatter ? 'везде' : symbol.wild ? 'заменяет' : '3 / 4 / 5'}</span>
                  <b>
                    {formatPay(payout(game, bet, symbol.pays[0], Boolean(symbol.scatter)), gram)}
                    {' · '}
                    {formatPay(payout(game, bet, symbol.pays[1], Boolean(symbol.scatter)), gram)}
                    {' · '}
                    {formatPay(payout(game, bet, symbol.pays[2], Boolean(symbol.scatter)), gram)}
                  </b>
                </div>
              ))}
            </div>
          </>
        )}
        {page === 1 && (
          <>
            <h2>Бонусная игра</h2>
            <img className={styles.hero} src={slotArt(game.id, 'scatter')} alt="" />
            <p>3, 4 или 5 скаттеров в любом месте запускают <b>{game.bonus.title}</b>: 10 бесплатных спинов. Повторно из них бонус не открывается.</p>
            <p>{game.bonus.rule}</p>
            <p>Потолок одного спина вместе с бонусом — <b>x{game.maxWinMultiplier}</b> ставки. Волатильность: {game.volatility}.</p>
            <p>Анте прибавляет 50% к ставке и даёт дополнительные 16.77% шанса, что на поле появится ещё один скаттер.</p>
          </>
        )}
        {page === 2 && (
          <>
            <h2>Функции</h2>
            <p>{FEATURE[game.id] ?? game.mood}</p>
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
            <p className={styles.note}>Покупка сразу открывает 10 спинов. Топ-бонус сильнее обычного: больше диких символов и выше множитель.</p>
          </>
        )}
        {page === 3 && (
          <>
            <h2>{game.mode === 'ways' ? 'Пути' : `Линии · ${game.lines.length}`}</h2>
            {game.mode === 'ways' ? (
              <p>Одинаковые символы на соседних барабанах слева направо. Чем больше способов собрать символ, тем выше выплата.</p>
            ) : (
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
