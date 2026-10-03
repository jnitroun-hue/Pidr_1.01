'use client';

import { useRouter } from 'next/navigation';
import { SLOT_GAMES } from '@/lib/slots/games';
import { slotHero, slotPoster } from '@/lib/slots/art';
import styles from './Slots.module.css';

const MODES = [
  { id: 'demo', label: 'Демо' },
  { id: 'coins', label: 'Монеты' },
  { id: 'gram', label: 'GRAM' },
] as const;

export default function SlotsLobbyPage() {
  const router = useRouter();
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
          <article key={game.id} className={styles.card}>
            <img className={styles.cardBg} src={slotPoster(game.id)} alt="" />
            <img className={styles.cardHero} src={slotHero(game.id)} alt="" />
            <em>x{game.maxWinMultiplier}</em>
            <span className={styles.cardFoot}>
              <strong>{game.title}</strong>
              <small>{game.bonus.title}</small>
              <span className={styles.cardModes}>
                {MODES.map((mode) => (
                  <button
                    key={mode.id}
                    type="button"
                    onClick={() => router.push(`/slots/play?game=${game.id}&mode=${mode.id}`)}
                  >
                    {mode.label}
                  </button>
                ))}
              </span>
            </span>
          </article>
        ))}
      </div>
    </main>
  );
}
