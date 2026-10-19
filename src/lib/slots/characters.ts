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

function emptyCell(grid: string[][], avoid: string): { reel: number; row: number } | null {
  const spots: { reel: number; row: number }[] = [];
  grid.forEach((reel, reelIndex) => {
    reel.forEach((id, row) => {
      if (id !== avoid) spots.push({ reel: reelIndex, row });
    });
  });
  if (!spots.length) return null;
  return spots[randomInt(spots.length)];
}

/**
 * Персонаж вмешивается в поле до подсчёта базового спина.
 * Фея (кластеры) и королева (заморозка) живут в движке, потому что им нужны каскады и респин.
 */
export function applyCharacter(game: SlotGame, grid: string[][]): { grid: string[][]; events: SlotEvent[] } {
  const next = grid.map((reel) => [...reel]);
  const events: SlotEvent[] = [];

  if (game.id === 'green-arrow') {
    const roll = randomInt(100);
    const shots = roll < 1 ? 2 : roll < 4 ? 1 : 0;
    const cells: { reel: number; row: number }[] = [];
    for (let i = 0; i < shots; i += 1) {
      const spot = emptyCell(next, 'scatter');
      if (!spot) break;
      next[spot.reel][spot.row] = 'scatter';
      cells.push(spot);
    }
    if (cells.length) events.push({ actor: 'archer', title: cells.length === 2 ? 'Две стрелы' : 'Выстрел', cells });
  }

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

export function dragonGift(game: SlotGame, win: number): SlotEvent | null {
  if (game.id !== 'ash-dragon' || win <= 0 || randomInt(100) >= 30) return null;
  const table = [2, 2, 2, 3, 3, 5];
  const multiplier = table[randomInt(table.length)];
  return { actor: 'dragon', title: `Дыхание x${multiplier}`, cells: [], multiplier };
}
