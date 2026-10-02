import { pickWeighted } from './rng';
import type { SlotGame, SlotSymbol } from './games';

export type SpinWin = {
  kind: 'line' | 'ways' | 'scatter';
  symbolId: string;
  symbolName: string;
  count: number;
  lineIndex?: number;
  ways?: number;
  amount: number;
};

export type SpinResult = {
  grid: string[][];
  wins: SpinWin[];
  multiplier: number;
  totalWin: number;
  capped: boolean;
};

function payingSymbols(game: SlotGame): SlotSymbol[] {
  return game.symbols.filter((symbol) => !symbol.scatter);
}

function isWild(game: SlotGame, id: string): boolean {
  return Boolean(game.symbols.find((symbol) => symbol.id === id)?.wild);
}

function symbolById(game: SlotGame, id: string): SlotSymbol {
  const found = game.symbols.find((symbol) => symbol.id === id);
  if (!found) throw new Error(`Unknown symbol ${id}`);
  return found;
}

function payForCount(symbol: SlotSymbol, count: number): number {
  if (count < 3) return 0;
  return symbol.pays[Math.min(count, 5) - 3] ?? 0;
}

export function spinSlot(game: SlotGame, totalBet: number): SpinResult {
  const grid: string[][] = [];
  for (let reel = 0; reel < game.reels; reel += 1) {
    const column: string[] = [];
    for (let row = 0; row < game.rows; row += 1) {
      column.push(pickWeighted(game.symbols).id);
    }
    grid.push(column);
  }

  const wins: SpinWin[] = [];
  if (game.mode === 'lines') {
    const lineBet = totalBet / game.lines.length;
    game.lines.forEach((line, lineIndex) => {
      const cells = line.map((row, reel) => grid[reel][row]);
      const first = cells.find((id) => !isWild(game, id) && !symbolById(game, id).scatter);
      const target = first ?? cells[0];
      if (symbolById(game, target).scatter) return;
      let count = 0;
      for (const id of cells) {
        if (id === target || isWild(game, id)) count += 1;
        else break;
      }
      const multiplier = payForCount(symbolById(game, target), count);
      if (multiplier <= 0) return;
      wins.push({
        kind: 'line',
        symbolId: target,
        symbolName: symbolById(game, target).name,
        count,
        lineIndex,
        amount: roundMoney(lineBet * multiplier),
      });
    });
  } else {
    const wayBet = totalBet / 165;
    for (const symbol of payingSymbols(game)) {
      const counts: number[] = [];
      for (let reel = 0; reel < game.reels; reel += 1) {
        const hits = grid[reel].filter((id) => id === symbol.id || isWild(game, id)).length;
        if (hits === 0) break;
        counts.push(hits);
      }
      const count = counts.length;
      const multiplier = payForCount(symbol, count);
      if (multiplier <= 0) continue;
      const ways = counts.reduce((product, value) => product * value, 1);
      wins.push({
        kind: 'ways',
        symbolId: symbol.id,
        symbolName: symbol.name,
        count,
        ways,
        amount: roundMoney(wayBet * multiplier * ways),
      });
    }
  }

  const scatter = game.symbols.find((symbol) => symbol.scatter);
  if (scatter) {
    const count = grid.flat().filter((id) => id === scatter.id).length;
    const multiplier = payForCount(scatter, count);
    if (multiplier > 0) {
      wins.push({
        kind: 'scatter',
        symbolId: scatter.id,
        symbolName: scatter.name,
        count,
        amount: roundMoney(totalBet * multiplier),
      });
    }
  }

  const base = wins.reduce((sum, win) => sum + win.amount, 0);
  const multiplier = base > 0 ? pickWeighted(game.multipliers).value : 1;
  let totalWin = roundMoney(base * multiplier);
  const cap = totalBet * game.maxWinMultiplier;
  const capped = totalWin > cap;
  if (capped) totalWin = cap;

  return { grid, wins, multiplier, totalWin, capped };
}

function roundMoney(value: number): number {
  return Math.max(0, Math.round(value));
}

export function formatGramUnits(units: number): string {
  return (units / 100).toFixed(2);
}
