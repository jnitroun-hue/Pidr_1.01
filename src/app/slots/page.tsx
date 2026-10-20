'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { SLOT_GAMES, type SlotGame } from '@/lib/slots/games';
import { slotArt, slotHero, slotPoster } from '@/lib/slots/art';
import styles from './Slots.module.css';

const MODES = [
  { id: 'demo', label: 'Демо', hint: 'Игра без списания' },
  { id: 'coins', label: 'Монеты', hint: 'Списание монет' },
  { id: 'gram', label: 'GRAM', hint: 'Списание GRAM' },
] as const;

function catchSymbol(game: SlotGame): string {
  const symbol = game.symbols.find((item) => item.scatter) ?? game.symbols.find((item) => item.bonusCoin);
  if (!symbol) return game.bonus.title;
  return `${game.trigger}× ${symbol.name}`;
}

function showcase(game: SlotGame) {
  const trigger = game.symbols.find((item) => item.scatter) ?? game.symbols.find((item) => item.bonusCoin);
  const wild = game.symbols.find((item) => item.wild && !item.multiplier) ?? game.symbols.find((item) => item.wild);
  const face = [...game.symbols].filter((item) => item.pays[2] > 0 && !item.scatter && !item.wild && !item.bonusCoin).sort((a, b) => b.pays[2] - a.pays[2])[0];
  return [trigger, wild, face].filter((item): item is NonNullable<typeof item> => Boolean(item)).filter((item, index, list) => list.findIndex((other) => other.id === item.id) === index).slice(0, 3);
}

export default function SlotsLobbyPage() {
  const router = useRouter();
  const [picked, setPicked] = useState<SlotGame | null>(null);
  return (
    <main className={styles.lobby}>
      <header className={styles.lobbyBar}>
        <button type="button" className={styles.hudBack} onClick={() => router.push('/profile')}>
          ←
        </button>
        <div className={styles.lobbyHead}>
          <span>The Must</span>
          <h1>Слоты</h1>
        </div>
      </header>
      <div className={styles.floor}>
        {SLOT_GAMES.map((game, index) => (
          <button
            key={game.id}
            type="button"
            className={index === 0 ? `${styles.poster} ${styles.posterLead}` : styles.poster}
            style={{ ['--accent' as string]: game.accent, ['--felt' as string]: game.felt }}
            onClick={() => setPicked(game)}
          >
            <span className={styles.posterCopy}>
              <em>до x{game.maxWinMultiplier}</em>
              <strong>{game.title}</strong>
              <b>{game.bonus.title}</b>
              <small>{catchSymbol(game)}</small>
              <span className={styles.posterSyms}>
                {showcase(game).map((symbol) => (
                  <img key={symbol.id} src={slotArt(game.id, symbol.id)} alt={symbol.name} />
                ))}
              </span>
              <i>Играть</i>
            </span>
            <span className={styles.posterArt}>
              <img src={slotPoster(game.id)} alt="" />
              <img className={styles.posterHero} src={slotHero(game.id)} alt="" />
            </span>
          </button>
        ))}
      </div>
      {picked && (
        <div className={styles.modePick} onClick={() => setPicked(null)}>
          <div
            className={styles.modeCard}
            style={{ ['--accent' as string]: picked.accent, ['--felt' as string]: picked.felt }}
            onClick={(event) => event.stopPropagation()}
            role="dialog"
            aria-label="Выбор валюты"
          >
            <img src={slotHero(picked.id)} alt="" />
            <p>{picked.title}</p>
            <strong>{catchSymbol(picked)} открывают «{picked.bonus.title}»</strong>
            <span className={styles.modeMood}>{picked.mood}</span>
            <div className={styles.modeList}>
              {MODES.map((mode) => (
                <button
                  key={mode.id}
                  type="button"
                  onClick={() => router.push(`/slots/play?game=${picked.id}&mode=${mode.id}`)}
                >
                  <b>{mode.label}</b>
                  <small>{mode.hint}</small>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
