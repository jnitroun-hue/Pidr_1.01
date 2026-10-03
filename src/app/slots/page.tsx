'use client';

import { useRouter } from 'next/navigation';
import { SLOT_GAMES } from '@/lib/slots/games';
import { slotPoster } from '@/lib/slots/art';
import styles from './Slots.module.css';

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
          <button
            key={game.id}
            type="button"
            className={styles.card}
            onClick={() => router.push(`/slots/play?game=${game.id}`)}
          >
            <img src={slotPoster(game.id)} alt="" />
            <em>x{game.maxWinMultiplier}</em>
            <span className={styles.cardFoot}>
              <strong>{game.title}</strong>
              <span>{game.bonus.title}</span>
            </span>
          </button>
        ))}
      </div>
    </main>
  );
}
