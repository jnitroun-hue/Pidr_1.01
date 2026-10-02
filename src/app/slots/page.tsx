'use client';

import { useRouter } from 'next/navigation';
import { SLOT_GAMES } from '@/lib/slots/games';
import { themedPageShellStyle } from '@/lib/ui/menu-theme-client';
import styles from './Slots.module.css';

export default function SlotsLobbyPage() {
  const router = useRouter();
  return (
    <main className={styles.page} style={themedPageShellStyle()}>
      <div className={styles.top}>
        <button type="button" className={styles.back} onClick={() => router.push('/profile')}>
          ← Профиль
        </button>
      </div>
      <h1 className={styles.title}>Слоты</h1>
      <p className={styles.lead}>
        Пять своих автоматов. Демо не трогает баланс. Монеты и GRAM считаются на сервере одним и тем же честным жребием.
      </p>
      <div className={styles.grid}>
        {SLOT_GAMES.map((game) => (
          <button
            key={game.id}
            type="button"
            className={styles.card}
            style={{ background: `linear-gradient(160deg, ${game.accent}, ${game.felt})` }}
            onClick={() => router.push(`/slots/play?game=${game.id}`)}
          >
            <strong>{game.title}</strong>
            <small>{game.mood}</small>
            <span className={styles.meta}>Риск: {game.volatility}</span>
          </button>
        ))}
      </div>
    </main>
  );
}
