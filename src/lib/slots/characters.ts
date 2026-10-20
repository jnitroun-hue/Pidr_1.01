import { randomInt } from './rng';
import type { SlotGame } from './games';

export type SlotEvent = {
  actor: 'archer' | 'fairy' | 'dragon' | 'queen' | 'ronin';
  title: string;
  cells: { reel: number; row: number }[];
  multiplier?: number;
};

function wildId(game: SlotGame): string {
  return game.symbols.find((symbol) => symbol.wild && !symbol.multiplier)?.id ?? 'wild';
}

/**
 * Персонаж вмешивается в поле до подсчёта базового спина.
 * Фея (кластеры) и королева (заморозка) живут в движке, потому что им нужны каскады и респин.
 */
export function applyCharacter(game: SlotGame, grid: string[][]): { grid: string[][]; events: SlotEvent[] } {
  const next = grid.map((reel) => [...reel]);
  const events: SlotEvent[] = [];

  if (game.id === 'blade-ronin' && randomInt(100) < 9) {
    const row = randomInt(game.rows);
    const wild = wildId(game);
    const cells = Array.from({ length: game.reels }, (_, reel) => ({ reel, row }));
    cells.forEach((spot) => {
      next[spot.reel][spot.row] = wild;
    });
    events.push({ actor: 'ronin', title: 'Рассечение', cells });
  }

  return { grid: next, events };
}
