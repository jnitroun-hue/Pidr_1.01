import { pickWeighted, randomInt } from './rng';
import {
  HOLD_WIN_GRAND,
  HOLD_WIN_VALUES,
  ORB_VALUES,
  PICK_BAG,
  PICK_MISSES,
  PICK_TARGETS,
  WAYS_DIVISOR,
  WHEEL_LEVEL_1,
  WHEEL_LEVEL_2,
  triggerSymbol,
  type BonusKind,
  type SlotGame,
  type SlotSymbol,
} from './games';
import { applyCharacter, dragonGift, type SlotEvent } from './characters';

export type Cell = { reel: number; row: number };

export type SpinWin = {
  kind: 'line' | 'ways' | 'scatter' | 'scatter-pays' | 'cluster' | 'coin' | 'grand' | 'wheel' | 'pick';
  symbolId: string;
  symbolName: string;
  count: number;
  lineIndex?: number;
  direction?: 'ltr' | 'rtl';
  ways?: number;
  cells: Cell[];
  amount: number;
};

export type MarkKind = 'wild' | 'mult' | 'mystery' | 'colossal' | 'burn' | 'slash' | 'sticky' | 'coin' | 'orb' | 'frozen';
export type Mark = Cell & { kind: MarkKind };

/** Одно состояние поля, которое игрок видит. */
export type Board = {
  grid: string[][];
  wins: SpinWin[];
  /** Множитель, применённый к выигрышу этой доски. */
  multiplier: number;
  /** Выигрыш доски после множителя. */
  win: number;
  /** Номиналы монет или шаров в множителях ставки. */
  values?: (number | null)[][];
  locked?: boolean[][];
  marks?: Mark[];
  label?: string;
  /** Клетки, которые исчезли перед этой доской (каскад). */
  removed?: Cell[];
};

export type SpinStep = { boards: Board[]; totalWin: number; label?: string };

export type SpinResult = {
  /** Первое поле спина. */
  grid: string[][];
  /** Все состояния поля базового спина: каскады, респин, раскрытие мистики. */
  boards: Board[];
  wins: SpinWin[];
  multiplier: number;
  /** Выигрыш базового спина без бонуса. */
  totalWin: number;
  capped: boolean;
  scatterCount: number;
  events: SlotEvent[];
};

export type Tier = 'natural' | 'regular' | 'top';
export type WheelStop = { level: 1 | 2; index: number };

export type BonusPlay = {
  kind: BonusKind;
  title: string;
  rule: string;
  scatterCount: number;
  tier: Tier;
  spins: SpinStep[];
  wheel?: { stops: WheelStop[]; cash: number; freeSpins: number; freeMultiplier: number };
  pick?: { reveals: { kind: 'mult' | 'miss'; value: number; amount: number }[] };
  pots?: { name: string; value: number; amount: number }[];
  /** Сколько добавил пол покупки. */
  floorAdded: number;
  totalWin: number;
};

export type RoundResult = SpinResult & { bonus: BonusPlay | null };

type Tile = { id: string; value: number | null };
type Tiles = Tile[][];

/* ------------------------------------------------------------------ */
/* Символы                                                            */
/* ------------------------------------------------------------------ */

function symbolById(game: SlotGame, id: string): SlotSymbol {
  const found = game.symbols.find((symbol) => symbol.id === id);
  if (!found) throw new Error(`Unknown symbol ${id}`);
  return found;
}

function isWild(game: SlotGame, id: string): boolean {
  return Boolean(game.symbols.find((symbol) => symbol.id === id)?.wild);
}

function isSpecial(game: SlotGame, id: string): boolean {
  const symbol = symbolById(game, id);
  return Boolean(symbol.scatter || symbol.bonusCoin || symbol.orb || symbol.mystery);
}

function regularSymbols(game: SlotGame): SlotSymbol[] {
  return game.symbols.filter((symbol) => !symbol.wild && !isSpecial(game, symbol.id));
}

/** Мешок базовой игры: без символов, которые живут только в бонусе. */
function baseBag(game: SlotGame): SlotSymbol[] {
  return game.symbols.filter((symbol) => !symbol.bonusOnly);
}

function wildId(game: SlotGame): string {
  return game.symbols.find((symbol) => symbol.wild && !symbol.multiplier)?.id ?? game.symbols.find((symbol) => symbol.wild)?.id ?? 'wild';
}

function payForCount(symbol: SlotSymbol, count: number): number {
  if (count < 3) return 0;
  return symbol.pays[Math.min(count, 5) - 3] ?? 0;
}

function mostExpensive(game: SlotGame): SlotSymbol {
  return regularSymbols(game).reduce((best, symbol) => (
    symbol.pays[2] > best.pays[2] || (symbol.pays[2] === best.pays[2] && symbol.pays[1] > best.pays[1]) ? symbol : best
  ));
}

function roundMoney(value: number): number {
  return Math.max(0, Math.round(value));
}

/* ------------------------------------------------------------------ */
/* Поле                                                               */
/* ------------------------------------------------------------------ */

function newTile(game: SlotGame, id: string): Tile {
  const symbol = symbolById(game, id);
  if (symbol.bonusCoin) return { id, value: pickWeighted(HOLD_WIN_VALUES).value };
  if (symbol.orb) return { id, value: pickWeighted(ORB_VALUES).value };
  return { id, value: null };
}

function drawTiles(game: SlotGame, bag: SlotSymbol[]): Tiles {
  const tiles: Tiles = [];
  for (let reel = 0; reel < game.reels; reel += 1) {
    const column: Tile[] = [];
    for (let row = 0; row < game.rows; row += 1) column.push(newTile(game, pickWeighted(bag).id));
    tiles.push(column);
  }
  return tiles;
}

function tilesFromGrid(game: SlotGame, grid: string[][]): Tiles {
  return grid.map((reel) => reel.map((id) => newTile(game, id)));
}

function tilesFromBoard(game: SlotGame, item: Board): Tiles {
  return item.grid.map((reel, reelIndex) => reel.map((id, row) => {
    const value = item.values?.[reelIndex]?.[row] ?? null;
    return value != null ? { id, value } : newTile(game, id);
  }));
}

function gridOf(tiles: Tiles): string[][] {
  return tiles.map((reel) => reel.map((tile) => tile.id));
}

function valuesOf(tiles: Tiles): (number | null)[][] | undefined {
  const any = tiles.some((reel) => reel.some((tile) => tile.value != null));
  return any ? tiles.map((reel) => reel.map((tile) => tile.value)) : undefined;
}

function cloneTiles(tiles: Tiles): Tiles {
  return tiles.map((reel) => reel.map((tile) => ({ ...tile })));
}

function countId(tiles: Tiles, id: string): Cell[] {
  const cells: Cell[] = [];
  tiles.forEach((reel, reelIndex) => reel.forEach((tile, row) => {
    if (tile.id === id) cells.push({ reel: reelIndex, row });
  }));
  return cells;
}

function freeCells(tiles: Tiles, avoid: (id: string) => boolean): Cell[] {
  const cells: Cell[] = [];
  tiles.forEach((reel, reelIndex) => reel.forEach((tile, row) => {
    if (!avoid(tile.id)) cells.push({ reel: reelIndex, row });
  }));
  return cells;
}

function stamp(game: SlotGame, tiles: Tiles, cell: Cell, id: string): void {
  tiles[cell.reel][cell.row] = newTile(game, id);
}

/** Анте: 16.77% на один дополнительный символ-триггер. */
function anteTrigger(game: SlotGame, tiles: Tiles): Tiles {
  if (randomInt(10000) >= 1677) return tiles;
  const trigger = triggerSymbol(game);
  if (!trigger) return tiles;
  const spots = freeCells(tiles, (id) => id === trigger.id);
  if (!spots.length) return tiles;
  const next = cloneTiles(tiles);
  stamp(game, next, spots[randomInt(spots.length)], trigger.id);
  return next;
}

/* ------------------------------------------------------------------ */
/* Подсчёт                                                            */
/* ------------------------------------------------------------------ */

function walkLine(game: SlotGame, ids: string[]): { count: number; concrete: string | null } {
  let count = 0;
  let concrete: string | null = null;
  for (const id of ids) {
    if (isSpecial(game, id)) break;
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
  return { count, concrete };
}

function evalLines(game: SlotGame, grid: string[][], bet: number, bothWays: boolean): SpinWin[] {
  const wins: SpinWin[] = [];
  const lineBet = bet / game.lines.length;
  game.lines.forEach((line, lineIndex) => {
    const cells: Cell[] = line.map((row, reel) => ({ reel, row }));
    const ids = cells.map((cell) => grid[cell.reel][cell.row]);
    const directions: Array<{ dir: 'ltr' | 'rtl'; cells: Cell[]; ids: string[] }> = [{ dir: 'ltr', cells, ids }];
    if (bothWays) directions.push({ dir: 'rtl', cells: [...cells].reverse(), ids: [...ids].reverse() });
    let fullLine = false;
    for (const pass of directions) {
      if (fullLine) break;
      const { count, concrete } = walkLine(game, pass.ids);
      if (count < 3) continue;
      if (count === game.reels) fullLine = true;
      const target = concrete ? symbolById(game, concrete) : mostExpensive(game);
      const pay = payForCount(target, count);
      if (pay <= 0) continue;
      const used = pass.cells.slice(0, count);
      const factor = used.reduce((product, cell) => product * (symbolById(game, grid[cell.reel][cell.row]).multiplier ?? 1), 1);
      wins.push({
        kind: 'line',
        symbolId: target.id,
        symbolName: target.name,
        count,
        lineIndex,
        direction: pass.dir,
        cells: used,
        amount: roundMoney(lineBet * pay * factor),
      });
    }
  });
  return wins;
}

function evalWays(game: SlotGame, grid: string[][], bet: number): SpinWin[] {
  const wins: SpinWin[] = [];
  const wayBet = bet / WAYS_DIVISOR;
  const premium = mostExpensive(game);
  const factorOnReels = (reels: number, cells: Cell[]) =>
    cells.filter((cell) => cell.reel < reels).reduce((product, cell) => product * (symbolById(game, grid[cell.reel][cell.row]).multiplier ?? 1), 1);

  for (const symbol of regularSymbols(game)) {
    const counts: number[] = [];
    const cells: Cell[] = [];
    let pureWild = true;
    for (let reel = 0; reel < game.reels; reel += 1) {
      let hits = 0;
      grid[reel].forEach((id, row) => {
        if (id === symbol.id) {
          hits += 1;
          pureWild = false;
          cells.push({ reel, row });
        } else if (isWild(game, id)) {
          hits += 1;
          cells.push({ reel, row });
        }
      });
      if (hits === 0) break;
      counts.push(hits);
    }
    if (pureWild) continue;
    const count = counts.length;
    const pay = payForCount(symbol, count);
    if (pay <= 0) continue;
    const ways = counts.reduce((product, value) => product * value, 1);
    const used = cells.filter((cell) => cell.reel < count);
    wins.push({
      kind: 'ways',
      symbolId: symbol.id,
      symbolName: symbol.name,
      count,
      ways,
      cells: used,
      amount: roundMoney(wayBet * pay * ways * factorOnReels(count, used)),
    });
  }

  const wildCounts: number[] = [];
  const wildCells: Cell[] = [];
  for (let reel = 0; reel < game.reels; reel += 1) {
    const wilds = grid[reel].filter((id) => isWild(game, id)).length;
    const other = grid[reel].filter((id) => !isWild(game, id) && !isSpecial(game, id)).length;
    if (wilds === 0 || other > 0) break;
    grid[reel].forEach((id, row) => { if (isWild(game, id)) wildCells.push({ reel, row }); });
    wildCounts.push(wilds);
  }
  const wildPay = payForCount(premium, wildCounts.length);
  if (wildPay > 0) {
    const ways = wildCounts.reduce((product, value) => product * value, 1);
    wins.push({
      kind: 'ways',
      symbolId: premium.id,
      symbolName: premium.name,
      count: wildCounts.length,
      ways,
      cells: wildCells,
      amount: roundMoney(wayBet * wildPay * ways * factorOnReels(wildCounts.length, wildCells)),
    });
  }
  return wins;
}

function evalScatterPays(game: SlotGame, tiles: Tiles, bet: number): SpinWin[] {
  const wins: SpinWin[] = [];
  for (const symbol of regularSymbols(game)) {
    const cells = countId(tiles, symbol.id);
    if (cells.length < 8) continue;
    const tier = cells.length >= 12 ? 2 : cells.length >= 10 ? 1 : 0;
    wins.push({
      kind: 'scatter-pays',
      symbolId: symbol.id,
      symbolName: symbol.name,
      count: cells.length,
      cells,
      amount: roundMoney(bet * symbol.pays[tier]),
    });
  }
  return wins;
}

function evalCluster(game: SlotGame, tiles: Tiles, bet: number): SpinWin[] {
  const wins: SpinWin[] = [];
  for (const symbol of regularSymbols(game)) {
    const seen = new Set<string>();
    tiles.forEach((reel, reelIndex) => reel.forEach((tile, row) => {
      const key = `${reelIndex}:${row}`;
      if (tile.id !== symbol.id || seen.has(key)) return;
      const cluster: Cell[] = [];
      const queue: Cell[] = [{ reel: reelIndex, row }];
      seen.add(key);
      while (queue.length) {
        const cell = queue.pop()!;
        cluster.push(cell);
        const neighbours: Cell[] = [
          { reel: cell.reel - 1, row: cell.row },
          { reel: cell.reel + 1, row: cell.row },
          { reel: cell.reel, row: cell.row - 1 },
          { reel: cell.reel, row: cell.row + 1 },
        ];
        for (const next of neighbours) {
          if (next.reel < 0 || next.reel >= game.reels || next.row < 0 || next.row >= game.rows) continue;
          const nextKey = `${next.reel}:${next.row}`;
          if (seen.has(nextKey)) continue;
          const id = tiles[next.reel][next.row].id;
          if (id === symbol.id || isWild(game, id)) {
            seen.add(nextKey);
            queue.push(next);
          }
        }
      }
      if (cluster.length < 5) return;
      const tier = cluster.length >= 12 ? 2 : cluster.length >= 8 ? 1 : 0;
      wins.push({
        kind: 'cluster',
        symbolId: symbol.id,
        symbolName: symbol.name,
        count: cluster.length,
        cells: cluster,
        amount: roundMoney(bet * symbol.pays[tier]),
      });
    }));
  }
  return wins;
}

function evalScatterWin(game: SlotGame, tiles: Tiles, bet: number): SpinWin | null {
  const scatter = game.symbols.find((symbol) => symbol.scatter);
  if (!scatter) return null;
  const cells = countId(tiles, scatter.id);
  if (cells.length < game.trigger) return null;
  const pay = scatter.pays[Math.min(2, cells.length - game.trigger)] ?? 0;
  if (pay <= 0) return null;
  return { kind: 'scatter', symbolId: scatter.id, symbolName: scatter.name, count: cells.length, cells, amount: roundMoney(bet * pay) };
}

function evalBoard(game: SlotGame, tiles: Tiles, bet: number): SpinWin[] {
  const grid = gridOf(tiles);
  if (game.mechanic === 'ways') return evalWays(game, grid, bet);
  if (game.mechanic === 'scatter-pays') return evalScatterPays(game, tiles, bet);
  if (game.mechanic === 'cluster') return evalCluster(game, tiles, bet);
  return evalLines(game, grid, bet, game.mechanic === 'both-ways');
}

function sumWins(wins: SpinWin[]): number {
  return wins.reduce((sum, win) => sum + win.amount, 0);
}

function board(tiles: Tiles, wins: SpinWin[], multiplier: number, extra: Partial<Board> = {}): Board {
  const raw = sumWins(wins);
  return {
    grid: gridOf(tiles),
    values: valuesOf(tiles),
    wins,
    multiplier,
    win: roundMoney(raw * multiplier),
    ...extra,
  };
}

/* ------------------------------------------------------------------ */
/* Каскады                                                            */
/* ------------------------------------------------------------------ */

function tumble(game: SlotGame, tiles: Tiles, remove: Cell[], bag: SlotSymbol[], orbScale = 1): Tiles {
  const gone = new Set(remove.map((cell) => `${cell.reel}:${cell.row}`));
  return tiles.map((reel, reelIndex) => {
    const kept = reel.filter((_, row) => !gone.has(`${reelIndex}:${row}`));
    const fresh: Tile[] = [];
    while (fresh.length + kept.length < game.rows) fresh.push(scaleOrb(game, newTile(game, pickWeighted(bag).id), orbScale));
    return [...fresh, ...kept];
  });
}

/** Усиленные шары (топ-покупка): значение шара умножается. */
function scaleOrb(game: SlotGame, tile: Tile, scale: number): Tile {
  if (scale === 1 || tile.value == null || !symbolById(game, tile.id).orb) return tile;
  return { id: tile.id, value: tile.value * scale };
}

function uniqueCells(cells: Cell[]): Cell[] {
  const seen = new Set<string>();
  return cells.filter((cell) => {
    const key = `${cell.reel}:${cell.row}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function orbSum(tiles: Tiles): number {
  return tiles.flat().reduce((sum, tile) => sum + (tile.value ?? 0), 0);
}

type CascadeOptions = {
  bag: SlotSymbol[];
  /** Общий множитель бонуса: передаётся по ссылке и растёт на step за каскад. */
  carry?: { multiplier: number; step?: number };
  /** Фея добавляет дикие после первой доски без выигрыша. */
  fairy?: 'never' | 'chance' | 'always';
  /** Сколько шаров гарантировать на первой доске. */
  forceOrb?: number;
  /** Множитель значений шаров (усиленные шары топ-покупки). */
  orbScale?: number;
  events?: SlotEvent[];
};

/** Последовательность досок до тех пор, пока выигрыши не закончатся. */
function cascade(game: SlotGame, start: Tiles, bet: number, options: CascadeOptions): Board[] {
  const boards: Board[] = [];
  let tiles = cloneTiles(start);
  const orbScale = options.orbScale ?? 1;
  if (options.forceOrb && game.mechanic === 'scatter-pays') {
    const spots = freeCells(tiles, (id) => isSpecial(game, id));
    for (let need = options.forceOrb - countId(tiles, 'orb').length; need > 0 && spots.length; need -= 1) {
      stamp(game, tiles, spots.splice(randomInt(spots.length), 1)[0], 'orb');
    }
  }
  if (orbScale !== 1) tiles = tiles.map((reel) => reel.map((tile) => scaleOrb(game, tile, orbScale)));
  let fairyUsed = false;
  let removed: Cell[] | undefined;
  let rawTotal = 0;

  for (let guard = 0; guard < 40; guard += 1) {
    const wins = evalBoard(game, tiles, bet);
    if (!wins.length) {
      const wantFairy = game.mechanic === 'cluster' && !fairyUsed
        && (options.fairy === 'always' || (options.fairy === 'chance' && randomInt(100) < 22));
      if (wantFairy) {
        fairyUsed = true;
        const spots = freeCells(tiles, (id) => isSpecial(game, id) || isWild(game, id));
        const count = Math.min(spots.length, 2 + randomInt(3));
        const marks: Mark[] = [];
        const wild = wildId(game);
        for (let step = 0; step < count; step += 1) {
          const index = randomInt(spots.length);
          const cell = spots.splice(index, 1)[0];
          stamp(game, tiles, cell, wild);
          marks.push({ ...cell, kind: 'wild' });
        }
        boards.push(board(tiles, [], 1, { marks, label: 'Фея добавляет дикие', removed }));
        options.events?.push({ actor: 'fairy', title: 'Хоровод', cells: marks });
        removed = undefined;
        continue;
      }
      if (!boards.length) boards.push(board(tiles, [], 1));
      else boards.push(board(tiles, [], 1, { removed, label: 'Каскад окончен' }));
      break;
    }
    const multiplier = game.mechanic === 'cluster' && options.carry ? options.carry.multiplier : 1;
    const current = board(tiles, wins, multiplier, { removed });
    boards.push(current);
    rawTotal += sumWins(wins);
    if (game.mechanic === 'cluster' && options.carry) options.carry.multiplier += options.carry.step ?? 1;
    const cells = uniqueCells(wins.flatMap((win) => win.cells));
    tiles = tumble(game, tiles, cells, options.bag, orbScale);
    removed = cells;
  }

  if (game.mechanic === 'scatter-pays' && rawTotal > 0) {
    const last = boards[boards.length - 1];
    const orbs = orbSum(tiles);
    let multiplier = 1;
    if (options.carry) {
      if (orbs > 0) options.carry.multiplier += orbs;
      multiplier = Math.max(1, options.carry.multiplier);
    } else if (orbs > 0) {
      multiplier = orbs;
    }
    if (multiplier > 1) {
      const marks: Mark[] = countId(tiles, 'orb').map((cell) => ({ ...cell, kind: 'orb' as const }));
      boards.push({
        ...last,
        wins: [],
        marks,
        multiplier,
        win: roundMoney(rawTotal * multiplier) - rawTotal,
        label: options.carry ? `Общий множитель x${multiplier}` : `Шары x${multiplier}`,
        removed: undefined,
      });
    }
  }
  return boards;
}

/* ------------------------------------------------------------------ */
/* Базовый спин                                                       */
/* ------------------------------------------------------------------ */

function baseBoards(game: SlotGame, tiles: Tiles, bet: number, events: SlotEvent[]): Board[] {
  if (game.mechanic === 'scatter-pays') return cascade(game, tiles, bet, { bag: baseBag(game) });
  if (game.mechanic === 'cluster') return cascade(game, tiles, bet, { bag: baseBag(game), fairy: 'chance', events });

  if (game.bonus.kind === 'mystery') return revealMystery(game, tiles, bet, 'base', 0);

  if (game.bonus.kind === 'colossal') {
    const frozen = freezeReel(game, tiles);
    if (frozen != null) {
      const marks: Mark[] = Array.from({ length: game.rows }, (_, row) => ({ reel: frozen, row, kind: 'frozen' as const }));
      const lockedGrid = tiles.map((_, reel) => Array.from({ length: game.rows }, () => reel === frozen));
      const first = board(tiles, [], 1, { marks, label: 'Заморозка и респин' });
      events.push({ actor: 'queen', title: 'Заморозка', cells: marks });
      const respun = drawTiles(game, baseBag(game));
      respun[frozen] = cloneTiles(tiles)[frozen];
      const second = board(respun, evalBoard(game, respun, bet), 1, { marks, locked: lockedGrid });
      return [first, second];
    }
  }

  return [board(tiles, evalBoard(game, tiles, bet), 1)];
}

/** Колонка целиком из одного старшего символа или ход королевы: держим барабан. */
function freezeReel(game: SlotGame, tiles: Tiles): number | null {
  const premium = new Set(['wolf', 'ice-crown', 'wild']);
  for (let reel = 0; reel < game.reels; reel += 1) {
    const ids = tiles[reel].map((tile) => tile.id);
    if (premium.has(ids[0]) && ids.every((id) => id === ids[0])) return reel;
  }
  if (randomInt(100) < 6) {
    const reel = randomInt(game.reels);
    const id = ['crystal', 'wolf', 'ice-crown'][randomInt(3)];
    for (let row = 0; row < game.rows; row += 1) tiles[reel][row] = { id, value: null };
    return reel;
  }
  return null;
}

function revealMystery(game: SlotGame, tiles: Tiles, bet: number, mode: 'base' | 'free' | 'top', extra: number): Board[] {
  const next = cloneTiles(tiles);
  if (extra > 0) {
    const spots = freeCells(next, (id) => isSpecial(game, id) || isWild(game, id));
    for (let step = 0; step < extra && spots.length; step += 1) {
      const cell = spots.splice(randomInt(spots.length), 1)[0];
      stamp(game, next, cell, 'mystery');
    }
  }
  const cells = countId(next, 'mystery');
  if (!cells.length) return [board(next, evalBoard(game, next, bet), 1)];
  const pool = mode === 'base'
    ? regularSymbols(game).map((symbol) => ({ id: symbol.id, weight: symbol.weight }))
    : mode === 'free'
      ? [{ id: 'pearl', weight: 10 }, { id: 'wave', weight: 6 }, { id: wildId(game), weight: 3.5 }]
      : [{ id: 'wave', weight: 7 }, { id: wildId(game), weight: 5 }];
  const target = pickWeighted(pool).id;
  const multiplier = mode === 'base' ? 1 : mode === 'free' ? Math.max(1, cells.length) : Math.max(2, Math.ceil(cells.length / 3));
  const marks: Mark[] = cells.map((cell) => ({ ...cell, kind: 'mystery' as const }));
  const first = board(next, [], 1, { marks, label: `Мистика: ${cells.length}` });
  const revealed = cloneTiles(next);
  cells.forEach((cell) => { revealed[cell.reel][cell.row] = { id: target, value: null }; });
  const second = board(revealed, evalBoard(game, revealed, bet), multiplier, { marks, label: `Мистика → ${symbolById(game, target).name}${multiplier > 1 ? ` · x${multiplier}` : ''}` });
  return [first, second];
}

function countTrigger(game: SlotGame, boards: Board[]): { count: number; cells: Cell[] } {
  const trigger = triggerSymbol(game);
  if (!trigger) return { count: 0, cells: [] };
  const last = boards[boards.length - 1];
  const cells: Cell[] = [];
  last.grid.forEach((reel, reelIndex) => reel.forEach((id, row) => { if (id === trigger.id) cells.push({ reel: reelIndex, row }); }));
  return { count: cells.length, cells };
}

export function spinSlot(game: SlotGame, totalBet: number, ante = false): RoundResult {
  const events: SlotEvent[] = [];
  const drawn = drawTiles(game, baseBag(game));
  const acted = applyCharacter(game, gridOf(drawn));
  events.push(...acted.events);
  let tiles = acted.grid.map((reel, reelIndex) => reel.map((id, row) => (id === drawn[reelIndex][row].id ? drawn[reelIndex][row] : newTile(game, id))));
  if (ante) tiles = anteTrigger(game, tiles);

  const boards = baseBoards(game, tiles, totalBet, events);
  const trigger = countTrigger(game, boards);
  const scatterWin = game.symbols.some((symbol) => symbol.scatter) ? evalScatterWin(game, tilesFromGrid(game, boards[boards.length - 1].grid), totalBet) : null;
  if (scatterWin) {
    const last = boards[boards.length - 1];
    last.wins = [...last.wins, scatterWin];
    last.win += scatterWin.amount;
  }

  let baseWin = boards.reduce((sum, item) => sum + item.win, 0);
  let multiplier = 1;
  if (baseWin > 0) {
    multiplier = pickWeighted(game.multipliers).value;
    const gift = dragonGift(game, baseWin);
    if (gift?.multiplier) {
      multiplier = Math.max(multiplier, gift.multiplier);
      events.push(gift);
    }
    if (multiplier > 1) {
      const last = boards[boards.length - 1];
      last.multiplier = multiplier;
      last.label = `Множитель x${multiplier}`;
      last.win = roundMoney(last.win + baseWin * (multiplier - 1));
      baseWin = roundMoney(baseWin * multiplier);
    }
  }

  const bonus = trigger.count >= game.trigger ? playBonus(game, totalBet, 'natural', trigger.count, tilesFromBoard(game, boards[boards.length - 1])) : null;
  const cap = totalBet * game.maxWinMultiplier;
  let totalWin = baseWin + (bonus?.totalWin ?? 0);
  let capped = false;
  if (totalWin > cap) {
    capped = true;
    if (bonus) bonus.totalWin = Math.max(0, cap - baseWin);
    totalWin = cap;
  }

  return {
    grid: boards[0].grid,
    boards,
    wins: boards.flatMap((item) => item.wins),
    multiplier,
    totalWin,
    capped,
    scatterCount: trigger.count,
    events,
    bonus,
  };
}

/* ------------------------------------------------------------------ */
/* Бонусы                                                             */
/* ------------------------------------------------------------------ */

function freeSpinStep(boards: Board[], label?: string): SpinStep {
  return { boards, totalWin: boards.reduce((sum, item) => sum + item.win, 0), label };
}

function stampRandom(game: SlotGame, tiles: Tiles, id: string, marks: Mark[], kind: MarkKind, avoid?: (cellId: string) => boolean): void {
  const spots = freeCells(tiles, avoid ?? ((cellId) => isSpecial(game, cellId) || isWild(game, cellId)));
  if (!spots.length) return;
  const cell = spots[randomInt(spots.length)];
  stamp(game, tiles, cell, id);
  marks.push({ ...cell, kind });
}

function bonusStickyReels(game: SlotGame, bet: number, tier: Tier): SpinStep[] {
  const steps: SpinStep[] = [];
  const locked = new Set<number>();
  const limit = tier === 'top' ? 3 : 2;
  const chance = tier === 'top' ? 30 : 30;
  if (tier === 'top') locked.add(randomInt(game.reels));
  const wild = wildId(game);
  for (let index = 0; index < game.freeSpins; index += 1) {
    if (locked.size < limit && randomInt(100) < chance) {
      const open = Array.from({ length: game.reels }, (_, reel) => reel).filter((reel) => !locked.has(reel));
      locked.add(open[randomInt(open.length)]);
    }
    const tiles = drawTiles(game, baseBag(game));
    const marks: Mark[] = [];
    locked.forEach((reel) => {
      for (let row = 0; row < game.rows; row += 1) {
        tiles[reel][row] = { id: wild, value: null };
        marks.push({ reel, row, kind: 'sticky' });
      }
    });
    const lockedGrid = tiles.map((_, reel) => Array.from({ length: game.rows }, () => locked.has(reel)));
    const multiplier = Math.max(1, locked.size);
    steps.push(freeSpinStep([board(tiles, evalBoard(game, tiles, bet), multiplier, { marks, locked: lockedGrid, label: locked.size ? `Липких барабанов: ${locked.size} · x${multiplier}` : 'Барабаны свободны' })]));
  }
  return steps;
}

function bonusHoldWin(game: SlotGame, bet: number, tier: Tier, start: Tiles): { spins: SpinStep[]; pots: BonusPlay['pots'] } {
  const total = game.reels * game.rows;
  const filler = regularSymbols(game).filter((symbol) => symbol.pays[2] <= 50);
  const minValue = tier === 'top' ? 2 : 1;
  const boost = tier === 'top' ? 5 : 1;
  const chance = tier === 'top' ? 14 : 9.25;
  const held: Tiles = cloneTiles(start);
  const lockedGrid = () => held.map((reel) => reel.map((tile) => tile.id === 'coin'));
  const coins = () => countId(held, 'coin').length;
  const boards: Board[] = [];
  let respins = 3;

  const show = (marks: Mark[], label: string, winCells: Cell[] = []) => {
    const wins: SpinWin[] = winCells.map((cell) => ({
      kind: 'coin' as const,
      symbolId: 'coin',
      symbolName: 'Монета',
      count: 1,
      cells: [cell],
      amount: roundMoney((held[cell.reel][cell.row].value ?? 0) * bet),
    }));
    boards.push({ grid: gridOf(held), values: valuesOf(held), locked: lockedGrid(), marks, wins, multiplier: 1, win: sumWins(wins), label });
  };

  show(countId(held, 'coin').map((cell) => ({ ...cell, kind: 'coin' as const })), `Монет: ${coins()} · респинов: ${respins}`);

  while (respins > 0 && coins() < total) {
    const marks: Mark[] = [];
    held.forEach((reel, reelIndex) => reel.forEach((tile, row) => {
      if (tile.id === 'coin') return;
      if (randomInt(100) < chance) {
        let value = pickWeighted(HOLD_WIN_VALUES).value * boost;
        if (value < minValue) value = minValue;
        held[reelIndex][row] = { id: 'coin', value };
        marks.push({ reel: reelIndex, row, kind: 'coin' });
      } else {
        held[reelIndex][row] = { id: pickWeighted(filler).id, value: null };
      }
    }));
    respins = marks.length ? 3 : respins - 1;
    show(marks, marks.length ? `Новых монет: ${marks.length} · респинов: 3` : `Респинов: ${respins}`);
  }

  const coinCells = countId(held, 'coin');
  const last = boards[boards.length - 1];
  last.wins = coinCells.map((cell) => ({
    kind: 'coin' as const,
    symbolId: 'coin',
    symbolName: 'Монета',
    count: 1,
    cells: [cell],
    amount: roundMoney((held[cell.reel][cell.row].value ?? 0) * bet),
  }));
  if (coinCells.length === total) {
    last.wins.push({ kind: 'grand', symbolId: 'coin', symbolName: 'Гранд', count: total, cells: coinCells, amount: roundMoney(HOLD_WIN_GRAND * bet) });
  }
  last.win = sumWins(last.wins);
  last.label = coinCells.length === total ? `Полное поле · гранд x${HOLD_WIN_GRAND}` : 'Сбор монет';

  const pots = HOLD_WIN_VALUES.filter((entry) => entry.pot).map((entry) => ({
    name: entry.pot === 'mini' ? 'Mini' : entry.pot === 'minor' ? 'Minor' : 'Major',
    value: entry.value,
    amount: roundMoney(entry.value * bet),
  }));
  return { spins: [{ boards, totalWin: last.win, label: 'Hold & Win' }], pots };
}

function holdWinStart(game: SlotGame, coins: number, boost: number): Tiles {
  const tiles = drawTiles(game, regularSymbols(game));
  const spots = freeCells(tiles, () => false);
  for (let step = 0; step < coins && spots.length; step += 1) {
    const cell = spots.splice(randomInt(spots.length), 1)[0];
    stamp(game, tiles, cell, 'coin');
    const tile = tiles[cell.reel][cell.row];
    tile.value = Math.max(boost, (tile.value ?? 1) * boost);
  }
  return tiles;
}

/** Мешок бонуса с усиленным весом одного символа. */
function boostedBag(game: SlotGame, id: string, factor: number): SlotSymbol[] {
  return game.symbols.map((symbol) => (symbol.id === id ? { ...symbol, weight: symbol.weight * factor } : symbol));
}

function bonusTumbleMult(game: SlotGame, bet: number, tier: Tier): SpinStep[] {
  const steps: SpinStep[] = [];
  const carry = { multiplier: 0 };
  // В бонусе лес «богатеет»: два самых дешёвых символа выпадают реже, шаров больше.
  const cheap = regularSymbols(game).sort((a, b) => a.pays[2] - b.pays[2]).slice(0, 2).map((symbol) => symbol.id);
  const bag = boostedBag(game, 'orb', tier === 'top' ? 3 : 2.3)
    .map((symbol) => (cheap.includes(symbol.id) ? { ...symbol, weight: tier === 'top' ? 4.5 : 7 } : symbol));
  for (let index = 0; index < game.freeSpins; index += 1) {
    const tiles = drawTiles(game, bag);
    const boards = cascade(game, tiles, bet, { bag, carry, forceOrb: tier === 'top' ? 1 : 0, orbScale: tier === 'top' ? 2 : 1 });
    steps.push(freeSpinStep(boards, carry.multiplier > 0 ? `Общий множитель x${carry.multiplier}` : undefined));
  }
  return steps;
}

function bonusMystery(game: SlotGame, bet: number, tier: Tier): SpinStep[] {
  const steps: SpinStep[] = [];
  const bag = boostedBag(game, 'mystery', 6.5);
  for (let index = 0; index < game.freeSpins; index += 1) {
    const tiles = drawTiles(game, bag);
    steps.push(freeSpinStep(revealMystery(game, tiles, bet, tier === 'top' ? 'top' : 'free', tier === 'top' ? 4 : 0)));
  }
  return steps;
}

function bonusWheel(game: SlotGame, bet: number, tier: Tier): { spins: SpinStep[]; wheel: NonNullable<BonusPlay['wheel']> } {
  let level: 1 | 2 = tier === 'top' ? 2 : 1;
  const stops: WheelStop[] = [];
  let cash = 0;
  let freeSpins = 0;
  let freeMultiplier = 1;
  for (let guard = 0; guard < 3; guard += 1) {
    const segments = level === 1 ? WHEEL_LEVEL_1 : WHEEL_LEVEL_2;
    const index = randomInt(segments.length);
    stops.push({ level, index });
    const segment = segments[index];
    const boost = tier === 'top' ? 2.25 : 1;
    if (segment.kind === 'cash') {
      cash = roundMoney(segment.value * bet * boost);
      break;
    }
    if (segment.kind === 'spins') {
      freeSpins = segment.spins ?? 8;
      freeMultiplier = segment.value * boost;
      break;
    }
    level = 2;
  }
  const spins: SpinStep[] = [];
  for (let index = 0; index < freeSpins; index += 1) {
    const tiles = drawTiles(game, game.symbols);
    const wins = evalBoard(game, tiles, bet);
    spins.push(freeSpinStep([board(tiles, wins, freeMultiplier, { label: `Множитель x${freeMultiplier}` })]));
  }
  return { spins, wheel: { stops, cash, freeSpins, freeMultiplier } };
}

function bonusPick(bet: number, tier: Tier): NonNullable<BonusPlay['pick']> {
  const bag = PICK_BAG.map((token) => (
    token.kind === 'miss'
      ? { ...token, weight: tier === 'top' ? token.weight / 3 : token.weight }
      : { ...token, value: tier === 'top' ? token.value * 3.4 : token.value }
  ));
  const reveals: NonNullable<BonusPlay['pick']>['reveals'] = [];
  let misses = 0;
  while (reveals.length < PICK_TARGETS && misses < PICK_MISSES) {
    const token = pickWeighted(bag);
    if (token.kind === 'miss') misses += 1;
    reveals.push({ kind: token.kind, value: token.value, amount: roundMoney(token.value * bet) });
  }
  return { reveals };
}

function bonusClusterFs(game: SlotGame, bet: number, tier: Tier): SpinStep[] {
  const steps: SpinStep[] = [];
  const carry = { multiplier: tier === 'top' ? 8 : 1, step: tier === 'top' ? 5 : 1 };
  for (let index = 0; index < game.freeSpins; index += 1) {
    const tiles = drawTiles(game, game.symbols);
    const boards = cascade(game, tiles, bet, { bag: game.symbols, carry, fairy: 'always' });
    steps.push(freeSpinStep(boards, `Множитель x${carry.multiplier}`));
  }
  return steps;
}

function bonusBurn(game: SlotGame, bet: number, tier: Tier): SpinStep[] {
  const steps: SpinStep[] = [];
  const order = regularSymbols(game).sort((a, b) => a.pays[2] - b.pays[2]).map((symbol) => symbol.id);
  const burned = new Set<string>(tier === 'top' ? [order[0]] : []);
  const maxBurn = 1;
  const cap = tier === 'top' ? 12 : 10;
  let multiplier = tier === 'top' ? 3 : 2;
  const multWilds = game.symbols.filter((symbol) => symbol.multiplier).map((symbol) => symbol.id);
  for (let index = 0; index < game.freeSpins; index += 1) {
    const bag = baseBag(game).filter((symbol) => !burned.has(symbol.id));
    const tiles = drawTiles(game, bag);
    const marks: Mark[] = [];
    if (tier === 'top' && multWilds.length && index % 5 === 4) stampRandom(game, tiles, multWilds[randomInt(multWilds.length)], marks, 'mult');
    const wins = evalBoard(game, tiles, bet);
    const current = board(tiles, wins, multiplier, { marks, label: `Множитель x${multiplier}` });
    if (sumWins(wins) > 0) {
      if (burned.size < maxBurn) {
        const next = order.find((id) => !burned.has(id));
        if (next) {
          burned.add(next);
          current.label = `Сожжён «${symbolById(game, next).name}» · множитель x${multiplier}`;
          tiles.forEach((reel, reelIndex) => reel.forEach((tile, row) => { if (tile.id === next) current.marks?.push({ reel: reelIndex, row, kind: 'burn' }); }));
        }
      }
      multiplier = Math.min(cap, multiplier + 1);
    }
    steps.push(freeSpinStep([current]));
  }
  return steps;
}

function bonusColossal(game: SlotGame, bet: number, tier: Tier): SpinStep[] {
  const steps: SpinStep[] = [];
  const wild = wildId(game);
  const total = game.freeSpins + (tier === 'top' ? 2 : 0);
  for (let index = 0; index < total; index += 1) {
    const tiles = drawTiles(game, game.symbols);
    const id = tier === 'top' ? wild : pickWeighted([{ id: 'wolf', weight: 3 }, { id: 'ice-crown', weight: 4 }, { id: wild, weight: 4 }]).id;
    const start = randomInt(game.reels - 2);
    const marks: Mark[] = [];
    for (let reel = start; reel < start + 3; reel += 1) {
      for (let row = 0; row < game.rows; row += 1) {
        tiles[reel][row] = { id, value: null };
        marks.push({ reel, row, kind: 'colossal' });
      }
    }
    steps.push(freeSpinStep([board(tiles, evalBoard(game, tiles, bet), tier === 'top' ? 3 : 1, { marks, label: `Колосс: ${symbolById(game, id).name}${tier === 'top' ? ' · x3' : ''}` })]));
  }
  return steps;
}

/** Удар ронина: дикие на трёх соседних барабанах одного ряда. */
function bonusSlash(game: SlotGame, bet: number, tier: Tier): SpinStep[] {
  const steps: SpinStep[] = [];
  const wild = wildId(game);
  let multiplier = tier === 'top' ? 6 : 2;
  const cuts = tier === 'top' ? 2 : 1;
  const step = tier === 'top' ? 4 : 2;
  const cap = tier === 'top' ? 20 : 10;
  for (let index = 0; index < game.freeSpins; index += 1) {
    const tiles = drawTiles(game, game.symbols);
    const marks: Mark[] = [];
    for (let cut = 0; cut < cuts; cut += 1) {
      const row = (index + cut) % game.rows;
      const start = randomInt(game.reels - 2);
      for (let reel = start; reel < start + 3; reel += 1) {
        tiles[reel][row] = { id: wild, value: null };
        marks.push({ reel, row, kind: 'slash' });
      }
    }
    const wins = evalBoard(game, tiles, bet);
    steps.push(freeSpinStep([board(tiles, wins, multiplier, { marks, label: `Удар · множитель x${multiplier}` })]));
    multiplier = Math.min(cap, multiplier + step);
  }
  return steps;
}

function playBonus(game: SlotGame, bet: number, tier: Tier, scatterCount: number, lastTiles: Tiles): BonusPlay {
  const kind = game.bonus.kind;
  const play: BonusPlay = {
    kind,
    title: tier === 'top' ? `${game.bonus.title} · топ` : game.bonus.title,
    rule: game.bonus.rule,
    scatterCount,
    tier,
    spins: [],
    floorAdded: 0,
    totalWin: 0,
  };

  if (kind === 'sticky-reels') play.spins = bonusStickyReels(game, bet, tier);
  if (kind === 'hold-win') {
    const start = tier === 'natural' ? lastTiles : holdWinStart(game, tier === 'top' ? 9 : 6, tier === 'top' ? 5 : 1);
    const result = bonusHoldWin(game, bet, tier, start);
    play.spins = result.spins;
    play.pots = result.pots;
  }
  if (kind === 'tumble-mult') play.spins = bonusTumbleMult(game, bet, tier);
  if (kind === 'mystery') play.spins = bonusMystery(game, bet, tier);
  if (kind === 'wheel') {
    const result = bonusWheel(game, bet, tier);
    play.spins = result.spins;
    play.wheel = result.wheel;
  }
  if (kind === 'pick') play.pick = bonusPick(bet, tier);
  if (kind === 'cluster-fs') play.spins = bonusClusterFs(game, bet, tier);
  if (kind === 'burn') play.spins = bonusBurn(game, bet, tier);
  if (kind === 'colossal') play.spins = bonusColossal(game, bet, tier);
  if (kind === 'slash') play.spins = bonusSlash(game, bet, tier);

  let total = play.spins.reduce((sum, step) => sum + step.totalWin, 0)
    + (play.wheel?.cash ?? 0)
    + (play.pick?.reveals.reduce((sum, reveal) => sum + reveal.amount, 0) ?? 0);

  const floor = tier === 'top' ? bet * 50 : tier === 'regular' ? bet * 10 : 0;
  if (floor > total) {
    play.floorAdded = floor - total;
    const lastStep = play.spins[play.spins.length - 1];
    if (lastStep) {
      const lastBoard = lastStep.boards[lastStep.boards.length - 1];
      lastBoard.win += play.floorAdded;
      lastStep.totalWin += play.floorAdded;
    } else if (play.wheel) {
      play.wheel.cash += play.floorAdded;
    } else if (play.pick) {
      const last = play.pick.reveals[play.pick.reveals.length - 1];
      if (last) last.amount += play.floorAdded;
    }
    total = floor;
  }
  play.totalWin = roundMoney(total);
  return play;
}

export function buyBonus(game: SlotGame, totalBet: number, tier: 'regular' | 'top'): RoundResult & { bonus: BonusPlay } {
  const tiles = drawTiles(game, game.symbols);
  const bonus = playBonus(game, totalBet, tier, game.trigger, tiles);
  const cap = totalBet * game.maxWinMultiplier;
  let totalWin = bonus.totalWin;
  let capped = false;
  if (totalWin > cap) {
    capped = true;
    bonus.totalWin = cap;
    totalWin = cap;
  }
  const grid = bonus.spins[0]?.boards[0]?.grid ?? gridOf(tiles);
  const first: Board = { grid, wins: [], multiplier: 1, win: 0 };
  return {
    grid,
    boards: [first],
    wins: [],
    multiplier: 1,
    totalWin,
    capped,
    scatterCount: bonus.scatterCount,
    events: [],
    bonus,
  };
}

export function formatGramUnits(units: number): string {
  return (units / 100).toFixed(2);
}
