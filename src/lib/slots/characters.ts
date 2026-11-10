import { randomInt } from './rng';
import type { SlotGame } from './games';

export type SlotEvent = {
  actor: 'archer' | 'fairy' | 'dragon' | 'queen' | 'dj';
  title: string;
  cells: { reel: number; row: number }[];
  multiplier?: number;
};

/** Фигура дропа: ровно пять клеток на поле 5×5. */
export function dropFigure(reels: number, rows: number): { reel: number; row: number }[] {
  const kind = randomInt(5);
  if (kind === 0) {
    const row = randomInt(rows);
    return Array.from({ length: reels }, (_, reel) => ({ reel, row }));
  }
  if (kind === 1) {
    const reel = randomInt(reels);
    return Array.from({ length: rows }, (_, row) => ({ reel, row }));
  }
  if (kind === 2) {
    const reel = 1 + randomInt(Math.max(1, reels - 2));
    const row = 1 + randomInt(Math.max(1, rows - 2));
    return [
      { reel, row },
      { reel: reel - 1, row },
      { reel: reel + 1, row },
      { reel, row: row - 1 },
      { reel, row: row + 1 },
    ];
  }
  const span = Math.min(reels, rows);
  const down = kind === 3;
  return Array.from({ length: span }, (_, index) => ({
    reel: index,
    row: down ? index : rows - 1 - index,
  }));
}

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

  if (game.id === 'mad-dj' && randomInt(100) < 9) {
    const wild = wildId(game);
    const cells = dropFigure(game.reels, game.rows);
    cells.forEach((spot) => {
      next[spot.reel][spot.row] = wild;
    });
    events.push({ actor: 'dj', title: 'Дроп', cells });
  }

  return { grid: next, events };
}
