'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { SLOT_GAMES, triggerSymbol, type SlotGame } from '@/lib/slots/games';
import { slotPoster } from '@/lib/slots/art';
import { bonusTitle, gameMood, gameTitle, symbolLabel } from '@/lib/slots/i18n';
import { useSlotLocale } from '@/lib/slots/locale';
import styles from './Slots.module.css';

const MODES = [
  { id: 'demo', label: 'Демо', en: 'Demo', hint: 'Игра без списания', hintEn: 'Play without a charge' },
  { id: 'coins', label: 'Монеты', en: 'Coins', hint: 'Списание монет', hintEn: 'Coins are charged' },
  { id: 'gram', label: 'GRAM', en: 'GRAM', hint: 'Списание GRAM', hintEn: 'GRAM is charged' },
] as const;

function catchSymbol(game: SlotGame, lang: 'ru' | 'en'): string {
  const symbol = triggerSymbol(game);
  if (!symbol) return bonusTitle(game, lang);
  return `${game.trigger}× ${symbolLabel(game, symbol, lang)}`;
}

export default function SlotsLobbyPage() {
  const router = useRouter();
  const { lang } = useSlotLocale();
  const en = lang === 'en';
  const [picked, setPicked] = useState<SlotGame | null>(null);
  return (
    <main className={styles.lobby}>
      <header className={styles.lobbyBar}>
        <button type="button" className={styles.hudBack} onClick={() => router.push('/profile')}>
          ←
        </button>
        <div className={styles.lobbyHead}>
          <span>The Must</span>
          <h1>{en ? 'Slots' : 'Слоты'}</h1>
        </div>
      </header>
      <div className={styles.floor}>
        {SLOT_GAMES.map((game) => (
          <button
            key={game.id}
            type="button"
            className={styles.poster}
            onClick={() => setPicked(game)}
          >
            <span className={styles.posterArt}>
              <img src={slotPoster(game.id)} alt="" />
            </span>
            <em>x{game.maxWinMultiplier}</em>
            <span className={styles.posterCopy}>
              <strong>{gameTitle(game, lang)}</strong>
              <small>{bonusTitle(game, lang)}</small>
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
            aria-label={en ? 'Choose currency' : 'Выбор валюты'}
          >
            <img src={slotPoster(picked.id)} alt="" />
            <p>{gameTitle(picked, lang)}</p>
            <strong>{en ? `${catchSymbol(picked, lang)} starts “${bonusTitle(picked, lang)}”` : `${catchSymbol(picked, lang)} открывают «${bonusTitle(picked, lang)}»`}</strong>
            <span className={styles.modeMood}>{gameMood(picked, lang)}</span>
            <div className={styles.modeList}>
              {MODES.map((mode) => (
                <button
                  key={mode.id}
                  type="button"
                  onClick={() => router.push(`/slots/play?game=${picked.id}&mode=${mode.id}`)}
                >
                  <b>{en ? mode.en : mode.label}</b>
                  <small>{en ? mode.hintEn : mode.hint}</small>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
