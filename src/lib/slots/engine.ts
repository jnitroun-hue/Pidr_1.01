import { pickWeighted, randomInt } from './rng';
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
  scatterCount: number;
};

export type BonusPlay = {
  title: string;
  rule: string;
  scatterCount: number;
  spins: SpinResult[];
  totalWin: number;
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

const FREE_SPINS = 10;

function wildId(game: SlotGame): string {
  return game.symbols.find((symbol) => symbol.wild)?.id ?? 'wild';
}

function drawGrid(game: SlotGame, bag: SlotSymbol[]): string[][] {
  const grid: string[][] = [];
  for (let reel = 0; reel < game.reels; reel += 1) {
    const column: string[] = [];
    for (let row = 0; row < game.rows; row += 1) {
      column.push(pickWeighted(bag).id);
    }
    grid.push(column);
  }
  return grid;
}

function applyBonusGrid(game: SlotGame, grid: string[][], index: number): string[][] {
  const next = grid.map((reel) => [...reel]);
  const wild = wildId(game);
  if (game.bonus.kind === 'wild-reel') {
    const reel = randomInt(game.reels);
    for (let row = 0; row < game.rows; row += 1) next[reel][row] = wild;
  }
  if (game.bonus.kind === 'tide') {
    for (let reel = 0; reel < game.reels; reel += 1) {
      next[reel][randomInt(game.rows)] = wild;
    }
  }
  if (game.bonus.kind === 'rising') {
    void index;
  }
  return next;
}

function bonusBag(game: SlotGame): SlotSymbol[] {
  if (game.bonus.kind !== 'premium-only') return game.symbols;
  const low = new Set(['leaf', 'acorn']);
  const bag = game.symbols.filter((symbol) => !low.has(symbol.id));
  return bag.length ? bag : game.symbols;
}

function bonusMultiplier(game: SlotGame, index: number, natural: number, free: boolean): number {
  if (!free) return natural;
  if (game.bonus.kind === 'rising') return Math.ceil((index + 1) / 2);
  if (game.bonus.kind === 'siren') return Math.max(2, natural);
  return natural;
}

export function spinSlot(game: SlotGame, totalBet: number): SpinResult & { bonus: BonusPlay | null } {
  const grid = drawGrid(game, game.symbols);
  const played = evaluateGrid(game, grid, totalBet, true, 0);
  const bonus = played.scatterCount >= 3 ? playBonus(game, totalBet, played.scatterCount) : null;
  const cap = totalBet * game.maxWinMultiplier;
  let totalWin = played.totalWin + (bonus?.totalWin ?? 0);
  let capped = played.capped;
  if (totalWin > cap) {
    capped = true;
    if (bonus) bonus.totalWin = Math.max(0, cap - played.totalWin);
    totalWin = cap;
  }
  return { ...played, totalWin, capped, bonus };
}

function playBonus(game: SlotGame, totalBet: number, scatterCount: number): BonusPlay {
  const bag = bonusBag(game);
  const spins: SpinResult[] = [];
  for (let index = 0; index < FREE_SPINS; index += 1) {
    const grid = applyBonusGrid(game, drawGrid(game, bag), index);
    spins.push(evaluateGrid(game, grid, totalBet, false, index));
  }
  return {
    title: game.bonus.title,
    rule: game.bonus.rule,
    scatterCount,
    spins,
    totalWin: spins.reduce((sum, spin) => sum + spin.totalWin, 0),
  };
}

function evaluateGrid(game: SlotGame, grid: string[][], totalBet: number, payScatter: boolean, freeIndex: number): SpinResult {
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
  const scatterCount = scatter ? grid.flat().filter((id) => id === scatter.id).length : 0;
  if (scatter && payScatter && scatterCount >= 3) {
    const multiplier = payForCount(scatter, scatterCount);
    if (multiplier > 0) {
      wins.push({
        kind: 'scatter',
        symbolId: scatter.id,
        symbolName: scatter.name,
        count: scatterCount,
        amount: roundMoney(totalBet * multiplier),
      });
    }
  }

  const base = wins.reduce((sum, win) => sum + win.amount, 0);
  const natural = base > 0 ? pickWeighted(game.multipliers).value : 1;
  const multiplier = base > 0 ? bonusMultiplier(game, freeIndex, natural, !payScatter) : 1;
  const totalWin = roundMoney(base * multiplier);

  return { grid, wins, multiplier, totalWin, capped: false, scatterCount };
}

function roundMoney(value: number): number {
  return Math.max(0, Math.round(value));
}

export function formatGramUnits(units: number): string {
  return (units / 100).toFixed(2);
}
