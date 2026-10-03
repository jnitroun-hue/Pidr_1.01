'use client';

import { useRouter } from 'next/navigation';
import { SLOT_GAMES } from '@/lib/slots/games';
import { slotPoster } from '@/lib/slots/art';
import styles from './Slots.module.css';

export default function SlotsLobbyPage() {
  const router = useRouter();
  return (
    <main className={styles.page}>
      <div className={styles.top}>
        <button type="button" className={styles.back} onClick={() => router.push('/profile')}>
          ← Профиль
        </button>
      </div>
      <div className={styles.head}>
        <h1 className={styles.title}>Слоты</h1>
        <p className={styles.lead}>Пять автоматов. Демо, монеты или GRAM — жребий один и тот же.</p>
      </div>
      <div className={styles.grid}>
        {SLOT_GAMES.map((game) => (
          <button
            key={game.id}
            type="button"
            className={styles.card}
            onClick={() => router.push(`/slots/play?game=${game.id}`)}
          >
            <img src={slotPoster(game.id)} alt="" />
            <span className={styles.cardFoot}>
              <strong>{game.title}</strong>
              <span>{game.bonus.title} · 10 спинов</span>
            </span>
          </button>
        ))}
      </div>
    </main>
  );
}
