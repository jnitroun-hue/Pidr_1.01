import { pickWeighted, randomInt } from './rng';
import type { SlotGame, SlotSymbol } from './games';
import { applyCharacter, dragonGift, type SlotEvent } from './characters';

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
  events: SlotEvent[];
};

export type BonusPlay = {
  title: string;
  rule: string;
  scatterCount: number;
  spins: SpinResult[];
  totalWin: number;
  tier: 'natural' | 'regular' | 'top';
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

function isScatter(game: SlotGame, id: string): boolean {
  return Boolean(symbolById(game, id).scatter);
}

function factorOnReels(game: SlotGame, grid: string[][], reels: number): number {
  let factor = 1;
  for (let reel = 0; reel < reels; reel += 1) {
    for (const id of grid[reel]) factor *= symbolById(game, id).multiplier ?? 1;
  }
  return factor;
}

function mostExpensive(game: SlotGame): SlotSymbol {
  return game.symbols
    .filter((symbol) => !symbol.scatter && !symbol.multiplier)
    .reduce((best, symbol) => (
      symbol.pays[2] > best.pays[2]
      || (symbol.pays[2] === best.pays[2] && symbol.pays[1] > best.pays[1])
        ? symbol
        : best
    ));
}

const FREE_SPINS = 10;

function wildId(game: SlotGame): string {
  return game.symbols.find((symbol) => symbol.wild)?.id ?? 'wild';
}

function anteScatter(game: SlotGame, grid: string[][]): string[][] {
  if (randomInt(10000) >= 1677) return grid;
  const scatter = game.symbols.find((symbol) => symbol.scatter);
  if (!scatter) return grid;
  const spots: Array<[number, number]> = [];
  grid.forEach((reel, reelIndex) => {
    reel.forEach((id, row) => {
      if (id !== scatter.id) spots.push([reelIndex, row]);
    });
  });
  if (!spots.length) return grid;
  const [reel, row] = spots[randomInt(spots.length)];
  const next = grid.map((column) => [...column]);
  next[reel][row] = scatter.id;
  return next;
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

function applyBonusGrid(game: SlotGame, grid: string[][], index: number, tier: 'natural' | 'regular' | 'top' = 'natural'): string[][] {
  const next = grid.map((reel) => [...reel]);
  const wild = wildId(game);
  const top = tier === 'top';
  if (game.bonus.kind === 'wild-reel') {
    const reel = randomInt(game.reels);
    for (let row = 0; row < game.rows; row += 1) next[reel][row] = wild;
    if (top) {
      const extra = (reel + 2) % game.reels;
      for (let row = 0; row < game.rows; row += 1) next[extra][row] = wild;
    }
  }
  if (game.bonus.kind === 'tide') {
    for (let reel = 0; reel < game.reels; reel += 1) {
      next[reel][randomInt(game.rows)] = wild;
      if (top) next[reel][(randomInt(game.rows) + 1) % game.rows] = wild;
    }
  }
  if (game.bonus.kind === 'arrow') {
    next[randomInt(game.reels)][randomInt(game.rows)] = wild;
    if (top) next[randomInt(game.reels)][randomInt(game.rows)] = wild;
  }
  if (game.bonus.kind === 'pollen') {
    for (let reel = 0; reel < game.reels; reel += 1) {
      for (let row = 0; row < game.rows; row += 1) {
        if (next[reel][row] === 'bloom' || (top && next[reel][row] === 'dew')) next[reel][row] = wild;
      }
    }
  }
  if (game.bonus.kind === 'breath') {
    next[randomInt(game.reels)][randomInt(game.rows)] = 'horn';
  }
  if (game.bonus.kind === 'throne') {
    const middle = Math.floor(game.reels / 2);
    for (let row = 0; row < game.rows; row += 1) next[middle][row] = wild;
    if (top) {
      for (let row = 0; row < game.rows; row += 1) next[0][row] = wild;
    }
  }
  if (game.bonus.kind === 'slash') {
    const row = index % game.rows;
    for (let reel = 0; reel < game.reels; reel += 1) next[reel][row] = wild;
    if (top) {
      const extra = (row + 1) % game.rows;
      for (let reel = 0; reel < game.reels; reel += 1) next[reel][extra] = wild;
    }
  }
  const multipliers = game.symbols.filter((symbol) => symbol.multiplier);
  if (tier === 'top') {
    const drops = multipliers.length ? 3 : 2;
    for (let step = 0; step < drops; step += 1) {
      const id = multipliers.length ? multipliers[randomInt(multipliers.length)].id : wild;
      next[randomInt(game.reels)][randomInt(game.rows)] = id;
    }
  } else if (tier === 'regular') {
    next[randomInt(game.reels)][randomInt(game.rows)] = wild;
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
  if (game.bonus.kind === 'breath') return Math.max(3, natural);
  return natural;
}

function expandOakWilds(game: SlotGame, grid: string[][]): string[][] {
  if (game.id !== 'oak-fortune') return grid;
  const wild = wildId(game);
  return grid.map((reel) => (reel.includes(wild) ? reel.map(() => wild) : reel));
}

export function spinSlot(game: SlotGame, totalBet: number, ante = false): SpinResult & { bonus: BonusPlay | null } {
  const acted = applyCharacter(game, drawGrid(game, game.symbols));
  const drawn = expandOakWilds(game, acted.grid);
  const grid = ante ? anteScatter(game, drawn) : drawn;
  const played = evaluateGrid(game, grid, totalBet, true, 0);
  const gift = dragonGift(game, played.totalWin);
  if (gift?.multiplier) {
    played.totalWin = roundMoney(played.totalWin * gift.multiplier);
    played.multiplier = gift.multiplier;
    played.events = [...acted.events, gift];
  } else {
    played.events = acted.events;
  }
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

function playBonus(game: SlotGame, totalBet: number, scatterCount: number, tier: 'natural' | 'regular' | 'top' = 'natural'): BonusPlay {
  const bag = bonusBag(game);
  const spins: SpinResult[] = [];
  for (let index = 0; index < FREE_SPINS; index += 1) {
    const grid = expandOakWilds(game, applyBonusGrid(game, drawGrid(game, bag), index, tier));
    const spin = evaluateGrid(game, grid, totalBet, false, index);
    if (tier === 'top' && spin.totalWin > 0) {
      spin.multiplier = Math.max(spin.multiplier, 2);
      spin.totalWin = roundMoney(spin.totalWin * 2);
    }
    spins.push(spin);
  }
  let totalWin = spins.reduce((sum, spin) => sum + spin.totalWin, 0);
  const floor = tier === 'top' ? totalBet * 50 : tier === 'regular' ? totalBet * 10 : 0;
  if (floor > totalWin && spins.length) {
    const extra = floor - totalWin;
    spins[spins.length - 1].totalWin += extra;
    totalWin = floor;
  }
  return {
    title: tier === 'top' ? `${game.bonus.title} · топ` : game.bonus.title,
    rule: game.bonus.rule,
    scatterCount,
    spins,
    totalWin,
    tier,
  };
}

export function buyBonus(game: SlotGame, totalBet: number, tier: 'regular' | 'top'): SpinResult & { bonus: BonusPlay } {
  const bonus = playBonus(game, totalBet, tier === 'top' ? 5 : 3, tier);
  const cap = totalBet * game.maxWinMultiplier;
  let totalWin = bonus.totalWin;
  let capped = false;
  if (totalWin > cap) {
    capped = true;
    bonus.totalWin = cap;
    totalWin = cap;
  }
  return {
    grid: bonus.spins[0]?.grid ?? drawGrid(game, game.symbols),
    wins: [],
    multiplier: 1,
    totalWin,
    capped,
    scatterCount: bonus.scatterCount,
    events: [],
    bonus,
  };
}

function evaluateGrid(game: SlotGame, grid: string[][], totalBet: number, payScatter: boolean, freeIndex: number): SpinResult {
  const wins: SpinWin[] = [];
  if (game.mode === 'lines') {
    const lineBet = totalBet / game.lines.length;
    game.lines.forEach((line, lineIndex) => {
      const cells = line.map((row, reel) => grid[reel][row]);
      let count = 0;
      let concrete: string | null = null;
      for (const id of cells) {
        if (isScatter(game, id)) break;
        if (isWild(game, id)) {
          count += 1;
          continue;
        }
        if (concrete === null || concrete === id) {
          concrete = id;
          count += 1;
          continue;
        }
        break;
      }
      if (count < 3) return;
      const target = concrete ? symbolById(game, concrete) : mostExpensive(game);
      const multiplier = payForCount(target, count);
      if (multiplier <= 0) return;
      const factor = cells.slice(0, count).reduce((product, id) => product * (symbolById(game, id).multiplier ?? 1), 1);
      wins.push({
        kind: 'line',
        symbolId: target.id,
        symbolName: target.name,
        count,
        lineIndex,
        amount: roundMoney(lineBet * multiplier * factor),
      });
    });
  } else {
    const wayBet = totalBet / 165;
    const premium = mostExpensive(game);
    for (const symbol of payingSymbols(game)) {
      if (symbol.wild) continue;
      const counts: number[] = [];
      let pureWild = true;
      for (let reel = 0; reel < game.reels; reel += 1) {
        let native = 0;
        let wilds = 0;
        for (const id of grid[reel]) {
          if (id === symbol.id) native += 1;
          else if (isWild(game, id)) wilds += 1;
        }
        if (native + wilds === 0) break;
        if (native > 0) pureWild = false;
        counts.push(native + wilds);
      }
      if (pureWild) continue;
      const count = counts.length;
      const multiplier = payForCount(symbol, count);
      if (multiplier <= 0) continue;
      const ways = counts.reduce((product, value) => product * value, 1);
      const factor = factorOnReels(game, grid, count);
      wins.push({
        kind: 'ways',
        symbolId: symbol.id,
        symbolName: symbol.name,
        count,
        ways,
        amount: roundMoney(wayBet * multiplier * ways * factor),
      });
    }
    const wildCounts: number[] = [];
    for (let reel = 0; reel < game.reels; reel += 1) {
      const wilds = grid[reel].filter((id) => isWild(game, id)).length;
      const other = grid[reel].filter((id) => !isWild(game, id) && !isScatter(game, id)).length;
      if (wilds === 0 || other > 0) break;
      wildCounts.push(wilds);
    }
    const wildPay = payForCount(premium, wildCounts.length);
    if (wildPay > 0) {
      const ways = wildCounts.reduce((product, value) => product * value, 1);
      const factor = factorOnReels(game, grid, wildCounts.length);
      wins.push({
        kind: 'ways',
        symbolId: premium.id,
        symbolName: premium.name,
        count: wildCounts.length,
        ways,
        amount: roundMoney(wayBet * wildPay * ways * factor),
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

  return { grid, wins, multiplier, totalWin, capped: false, scatterCount, events: [] };
}

function roundMoney(value: number): number {
  return Math.max(0, Math.round(value));
}

export function formatGramUnits(units: number): string {
  return (units / 100).toFixed(2);
}
