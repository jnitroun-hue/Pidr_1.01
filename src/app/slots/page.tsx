'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { SLOT_GAMES, type SlotGame } from '@/lib/slots/games';
import { slotHero, slotPoster } from '@/lib/slots/art';
import styles from './Slots.module.css';

const MODES = [
  { id: 'demo', label: 'Демо', hint: 'Игра без списания' },
  { id: 'coins', label: 'Монеты', hint: 'Списание монет' },
  { id: 'gram', label: 'GRAM', hint: 'Списание GRAM' },
] as const;

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
        {SLOT_GAMES.map((game) => (
          <button key={game.id} type="button" className={styles.card} onClick={() => setPicked(game)}>
            <img className={styles.cardBg} src={slotPoster(game.id)} alt="" />
            <img className={styles.cardHero} src={slotHero(game.id)} alt="" />
            <em>x{game.maxWinMultiplier}</em>
            <span className={styles.cardFoot}>
              <strong>{game.title}</strong>
              <small>{game.bonus.title}</small>
            </span>
          </button>
        ))}
      </div>
      {picked && (
        <div className={styles.modePick} onClick={() => setPicked(null)}>
          <div className={styles.modeCard} onClick={(event) => event.stopPropagation()} role="dialog" aria-label="Выбор валюты">
            <img src={slotHero(picked.id)} alt="" />
            <p>{picked.title}</p>
            <strong>Во что играем?</strong>
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
