'use client';

import { slotHero } from '@/lib/slots/art';
import type { SlotEvent } from '@/lib/slots/characters';
import styles from './CharacterCast.module.css';

const ACTOR_GAME: Record<SlotEvent['actor'], string> = {
  archer: 'green-arrow',
  fairy: 'fairy-glade',
  dragon: 'ash-dragon',
  queen: 'frost-queen',
  ronin: 'blade-ronin',
};

export default function CharacterCast({ event }: { event: SlotEvent }) {
  const src = slotHero(ACTOR_GAME[event.actor]);
  return (
    <div className={`${styles.cast} ${styles[event.actor]}`}>
      {src ? <img src={src} alt="" /> : null}
      <div>
        <strong>{event.title}</strong>
        {event.multiplier ? <span>x{event.multiplier}</span> : <span>символы меняются</span>}
      </div>
    </div>
  );
}
