import { pickWeighted, randomInt } from './rng';
import {
  CURTAIN_WHEEL,
  HOLD_WIN_GRAND,
  HOLD_WIN_VALUES,
  ORB_VALUES,
  lineCoinWin,
  wayCoinWin,
  WHEEL_LEVEL_1,
  WHEEL_LEVEL_2,
  triggerSymbol,
  type BonusKind,
  type SlotGame,
  type SlotSymbol,
} from './games';
import { applyCharacter, type SlotEvent } from './characters';

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
  /** Множитель шторы на каждом барабане. null — барабан открыт. */
  curtains?: (number | null)[];
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
  pick?: {
    reveals: { kind: 'mult' | 'miss'; value: number; amount: number }[];
    cells?: { kind: 'mult' | 'miss'; value: number; amount: number }[];
    columns?: number;
    rows?: number;
    path?: number[];
    missLimit?: number;
  };
  pots?: { name: string; value: number; amount: number }[];
  /** Колесо уса: спины и минимальный множитель шторы. Индекс — сектор на колесе. */
  curtainWheel?: { index: number; spins: number; min: number; label: string };
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

function scatterSpotOk(game: SlotGame, reel: number, column: Tile[]): boolean {
  if (game.id !== 'green-arrow') return true;
  if (reel === 0) return false;
  return !column.some((tile) => tile.id === 'scatter');
}

function drawTiles(game: SlotGame, bag: SlotSymbol[]): Tiles {
  const tiles: Tiles = [];
  const trigger = triggerSymbol(game);
  for (let reel = 0; reel < game.reels; reel += 1) {
    const column: Tile[] = [];
    for (let row = 0; row < game.rows; row += 1) {
      let tile = newTile(game, pickWeighted(bag).id);
      if (trigger && tile.id === trigger.id && !scatterSpotOk(game, reel, column)) {
        const plain = bag.filter((symbol) => symbol.id !== trigger.id);
        tile = newTile(game, pickWeighted(plain.length ? plain : bag).id);
      }
      column.push(tile);
    }
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
  let spots = freeCells(tiles, (id) => id === trigger.id);
  if (game.id === 'green-arrow') {
    const taken = new Set(countId(tiles, trigger.id).map((cell) => cell.reel));
    spots = spots.filter((cell) => cell.reel > 0 && !taken.has(cell.reel));
  }
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

function lineFactor(game: SlotGame, tiles: Tiles, cells: Cell[]): number {
  if (game.bonus.kind === 'sticky-reels') {
    let curtain = 0;
    const seen = new Set<number>();
    for (const cell of cells) {
      const tile = tiles[cell.reel][cell.row];
      const symbol = symbolById(game, tile.id);
      if (symbol.wild && tile.value != null && tile.value > 1 && !seen.has(cell.reel)) {
        seen.add(cell.reel);
        curtain += tile.value;
      }
    }
    return curtain > 0 ? Math.min(10, curtain) : 1;
  }
  let product = 1;
  for (const cell of cells) {
    const tile = tiles[cell.reel][cell.row];
    const symbol = symbolById(game, tile.id);
    product *= symbol.multiplier ?? 1;
    if (symbol.wild && tile.value != null && tile.value > 1) product *= tile.value;
  }
  return product;
}

function evalLines(game: SlotGame, tiles: Tiles, bet: number, bothWays: boolean): SpinWin[] {
  const wins: SpinWin[] = [];
  const grid = gridOf(tiles);
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
      const factor = lineFactor(game, tiles, used);
      wins.push({
        kind: 'line',
        symbolId: target.id,
        symbolName: target.name,
        count,
        lineIndex,
        direction: pass.dir,
        cells: used,
        amount: lineCoinWin(bet, game.lines.length, pay, factor),
      });
    }
  });
  return wins;
}

function evalWays(game: SlotGame, grid: string[][], bet: number): SpinWin[] {
  const wins: SpinWin[] = [];
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
      amount: wayCoinWin(bet, pay, ways, factorOnReels(count, used)),
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
      amount: wayCoinWin(bet, wildPay, ways, factorOnReels(wildCounts.length, wildCells)),
    });
  }
  return wins;
}

function evalScatterPays(game: SlotGame, tiles: Tiles, bet: number): SpinWin[] {
  const orbs = countId(tiles, 'orb');
  const orbFactor = orbs.reduce((sum, cell) => sum + (tiles[cell.reel][cell.row].value ?? 1), 0);
  const wins: SpinWin[] = [];
  for (const symbol of regularSymbols(game)) {
    const own = countId(tiles, symbol.id);
    const cells = orbs.length ? [...own, ...orbs] : own;
    if (cells.length < 8) continue;
    const tier = cells.length >= 12 ? 2 : cells.length >= 10 ? 1 : 0;
    wins.push({
      kind: 'scatter-pays',
      symbolId: symbol.id,
      symbolName: symbol.name,
      count: cells.length,
      cells,
      amount: roundMoney(bet * symbol.pays[tier] * (orbs.length ? Math.max(1, orbFactor) : 1)),
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
  return evalLines(game, tiles, bet, game.mechanic === 'both-ways');
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
    const orbs = countId(tiles, 'orb');
    const orbFactor = orbs.reduce((sum, cell) => sum + (tiles[cell.reel][cell.row].value ?? 1), 0);
    const usedOrb = orbs.length > 0 && wins.some((win) => win.cells.some((cell) => tiles[cell.reel][cell.row].id === 'orb'));
    const orbMarks: Mark[] = usedOrb ? orbs.map((cell) => ({ ...cell, kind: 'orb' as const })) : [];
    const current = board(tiles, wins, multiplier, {
      removed,
      marks: orbMarks.length ? orbMarks : undefined,
      label: usedOrb ? `Шар x${orbFactor} заменил символы` : undefined,
    });
    boards.push(current);
    rawTotal += sumWins(wins);
    if (game.mechanic === 'cluster' && options.carry) options.carry.multiplier += options.carry.step ?? 1;
    const cells = uniqueCells(wins.flatMap((win) => win.cells));
    tiles = tumble(game, tiles, cells, options.bag, orbScale);
    removed = cells;
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

  if (game.bonus.kind === 'sticky-reels') return [curtainSpin(game, tiles, bet, 'base')];

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
    if (game.id === 'ash-dragon' && randomInt(100) < 30) {
      const breathed = breatheWild(game, boards[boards.length - 1], totalBet);
      if (breathed) {
        boards[boards.length - 1] = breathed.board;
        events.push(breathed.event);
        baseWin = boards.reduce((sum, item) => sum + item.win, 0);
      }
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

const CURTAIN_MULT_BASE = [
  { value: 2, weight: 82 },
  { value: 3, weight: 16 },
  { value: 5, weight: 2 },
];

const CURTAIN_MULT_BONUS = [
  { value: 2, weight: 58 },
  { value: 3, weight: 24 },
  { value: 5, weight: 11 },
  { value: 8, weight: 4.5 },
  { value: 10, weight: 1.8 },
  { value: 15, weight: 0.5 },
  { value: 25, weight: 0.15 },
  { value: 50, weight: 0.04 },
  { value: 100, weight: 0.01 },
];

const CURTAIN_COUNT = [
  { value: 0, weight: 97.2 },
  { value: 1, weight: 2.4 },
  { value: 2, weight: 0.32 },
  { value: 3, weight: 0.06 },
  { value: 4, weight: 0.015 },
  { value: 5, weight: 0.005 },
];

function pickCurtainMult(tier: 'base' | 'bonus' | 'top'): number {
  if (tier === 'base') return pickWeighted(CURTAIN_MULT_BASE).value;
  if (tier === 'bonus') return pickWeighted(CURTAIN_MULT_BONUS).value;
  return pickWeighted(CURTAIN_MULT_BONUS.map((item) => (
    { ...item, weight: item.value >= 10 ? item.weight * 1.8 : item.weight }
  ))).value;
}

function curtainLabel(curtains: { reel: number; mult: number }[]): string | undefined {
  if (!curtains.length) return undefined;
  const list = [...curtains].sort((a, b) => a.reel - b.reel).map((item) => `x${item.mult}`).join(' · ');
  return curtains.length === 1 ? `Штора ${list}` : `Шторы ${list}`;
}

function scatterReels(game: SlotGame, tiles: Tiles): Set<number> {
  const scatter = triggerSymbol(game)?.id;
  const taken = new Set<number>();
  if (!scatter) return taken;
  tiles.forEach((reel, index) => {
    if (reel.some((tile) => tile.id === scatter)) taken.add(index);
  });
  return taken;
}

function placeCurtain(game: SlotGame, tiles: Tiles, reel: number, mult: number): void {
  const wild = wildId(game);
  for (let row = 0; row < game.rows; row += 1) tiles[reel][row] = { id: wild, value: mult };
}

function paintCurtains(game: SlotGame, tiles: Tiles, bet: number, curtains: { reel: number; mult: number }[], fresh: Set<number>, stick: boolean): Board {
  const row: (number | null)[] = Array.from({ length: game.reels }, () => null);
  const marks: Mark[] = [];
  const locked = stick
    ? tiles.map(() => Array.from({ length: game.rows }, () => false))
    : undefined;
  curtains.forEach((curtain) => {
    placeCurtain(game, tiles, curtain.reel, curtain.mult);
    row[curtain.reel] = curtain.mult;
    if (locked) locked[curtain.reel] = locked[curtain.reel].map(() => true);
    if (fresh.has(curtain.reel)) {
      for (let line = 0; line < game.rows; line += 1) marks.push({ reel: curtain.reel, row: line, kind: 'sticky' });
    }
  });
  return board(tiles, evalBoard(game, tiles, bet), 1, {
    marks,
    locked,
    curtains: row,
    label: curtainLabel(curtains),
  });
}

function curtainSpin(game: SlotGame, tiles: Tiles, bet: number, tier: 'base' | 'top'): Board {
  const count = pickWeighted(CURTAIN_COUNT).value;
  const blocked = scatterReels(game, tiles);
  const open = Array.from({ length: game.reels }, (_, reel) => reel).filter((reel) => !blocked.has(reel));
  const curtains: { reel: number; mult: number }[] = [];
  for (let step = 0; step < count && open.length; step += 1) {
    const reel = open.splice(randomInt(open.length), 1)[0];
    curtains.push({ reel, mult: pickCurtainMult(tier) });
  }
  return paintCurtains(game, tiles, bet, curtains, new Set(curtains.map((item) => item.reel)), false);
}

function curtainAtLeast(rolled: number, min: number): number {
  return rolled < min ? min : rolled;
}

function bonusStickyReels(game: SlotGame, bet: number, heat: 'regular' | 'top' | 'hot', wheel: { spins: number; min: number }): SpinStep[] {
  const steps: SpinStep[] = [];
  const stuck: { reel: number; mult: number }[] = [];
  const chance = heat === 'hot' ? 22 : heat === 'top' ? 18 : 16;
  const multTier = heat === 'regular' ? 'bonus' : 'top';
  const open = Array.from({ length: game.reels }, (_, reel) => reel);
  const starters = heat === 'hot' ? 2 : heat === 'top' ? 1 : 0;
  for (let step = 0; step < starters && open.length; step += 1) {
    const reel = open.splice(randomInt(open.length), 1)[0];
    stuck.push({ reel, mult: curtainAtLeast(pickCurtainMult(multTier), wheel.min) });
  }
  for (let index = 0; index < wheel.spins; index += 1) {
    const fresh = new Set<number>();
    const tiles = drawTiles(game, baseBag(game));
    const taken = new Set(stuck.map((item) => item.reel));
    if (stuck.length < game.reels && randomInt(100) < chance) {
      const blocked = scatterReels(game, tiles);
      const open = Array.from({ length: game.reels }, (_, reel) => reel).filter((reel) => !taken.has(reel) && !blocked.has(reel));
      if (open.length) {
        const reel = open[randomInt(open.length)];
        stuck.push({ reel, mult: curtainAtLeast(pickCurtainMult(multTier), wheel.min) });
        fresh.add(reel);
      }
    }
    if (index === 0) stuck.forEach((item) => fresh.add(item.reel));
    steps.push(freeSpinStep([paintCurtains(game, tiles, bet, stuck, fresh, true)]));
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

function breatheWild(game: SlotGame, item: Board, bet: number): { board: Board; event: SlotEvent } | null {
  const tiles = tilesFromBoard(game, item);
  const involved = item.wins.flatMap((win) => win.cells).filter((cell) => isWild(game, tiles[cell.reel]?.[cell.row]?.id));
  const spots = involved.length ? involved : [];
  if (!spots.length) return null;
  const cell = spots[randomInt(spots.length)];
  const table = [2, 2, 2, 3, 3, 5];
  const value = table[randomInt(table.length)];
  tiles[cell.reel][cell.row] = { ...tiles[cell.reel][cell.row], value };
  const kept = item.wins.filter((win) => win.kind === 'scatter' || win.kind === 'coin' || win.kind === 'grand');
  const wins = [...evalBoard(game, tiles, bet), ...kept];
  const marks: Mark[] = [...(item.marks ?? []), { ...cell, kind: 'mult' }];
  return {
    board: board(tiles, wins, item.multiplier, { marks, label: `Дыхание x${value}`, curtains: item.curtains, locked: item.locked, removed: item.removed }),
    event: { actor: 'dragon', title: `Дыхание x${value}`, cells: [cell], multiplier: value },
  };
}

const VOLLEY_COUNT = [
  { value: 1, weight: 34 },
  { value: 2, weight: 28 },
  { value: 3, weight: 18 },
  { value: 4, weight: 10 },
  { value: 5, weight: 6 },
  { value: 6, weight: 4 },
];
const VOLLEY_MULT = [
  { value: 2, weight: 46 },
  { value: 3, weight: 28 },
  { value: 5, weight: 16 },
  { value: 8, weight: 7 },
  { value: 10, weight: 3 },
];
const ARCHER_MULT = [
  { value: 10, weight: 28 },
  { value: 15, weight: 22 },
  { value: 20, weight: 16 },
  { value: 25, weight: 12 },
  { value: 40, weight: 8 },
  { value: 50, weight: 6 },
  { value: 75, weight: 4 },
  { value: 100, weight: 2.5 },
  { value: 150, weight: 1.2 },
  { value: 250, weight: 0.6 },
  { value: 500, weight: 0.25 },
  { value: 1000, weight: 0.08 },
  { value: 2500, weight: 0.02 },
];

function bonusVolley(game: SlotGame, bet: number): SpinStep[] {
  const steps: SpinStep[] = [];
  const bag = game.symbols.filter((symbol) => !symbol.scatter && !symbol.bonusOnly);
  const wild = wildId(game);
  const stuck: { reel: number; row: number; value: number }[] = [];
  for (let index = 0; index < 15; index += 1) {
    const tiles = drawTiles(game, bag);
    stuck.forEach((pin) => { tiles[pin.reel][pin.row] = { id: wild, value: pin.value }; });
    const blocked = new Set(stuck.map((pin) => `${pin.reel}:${pin.row}`));
    const spots = freeCells(tiles, () => false).filter((cell) => !blocked.has(`${cell.reel}:${cell.row}`));
    const marks: Mark[] = stuck.map((pin) => ({ reel: pin.reel, row: pin.row, kind: 'mult' as const }));
    const shots = Math.min(pickWeighted(VOLLEY_COUNT).value, spots.length);
    for (let shot = 0; shot < shots; shot += 1) {
      const cell = spots.splice(randomInt(spots.length), 1)[0];
      tiles[cell.reel][cell.row] = { id: wild, value: null };
      marks.push({ ...cell, kind: 'wild' });
    }
    let fresh = 0;
    if (stuck.length < 4 && spots.length && randomInt(100) < 18) {
      const cell = spots.splice(randomInt(spots.length), 1)[0];
      fresh = pickWeighted(VOLLEY_MULT).value;
      tiles[cell.reel][cell.row] = { id: wild, value: fresh };
      stuck.push({ ...cell, value: fresh });
      marks.push({ ...cell, kind: 'mult' });
    }
    const wins = evalBoard(game, tiles, bet);
    const label = fresh ? `Стрела x${fresh} остаётся` : `Лучник: ${shots} диких`;
    steps.push(freeSpinStep([board(tiles, wins, 1, { marks, label })]));
  }
  return steps;
}

function bonusArcherPick(bet: number): NonNullable<BonusPlay['pick']> {
  const cells: { kind: 'mult' | 'miss'; value: number; amount: number }[] = Array.from({ length: 6 }, () => ({ kind: 'miss' as const, value: 0, amount: 0 }));
  while (cells.length < 36) {
    const value = pickWeighted(ARCHER_MULT).value;
    cells.push({ kind: 'mult', value, amount: roundMoney(value * bet) });
  }
  for (let index = cells.length - 1; index > 0; index -= 1) {
    const swap = randomInt(index + 1);
    [cells[index], cells[swap]] = [cells[swap], cells[index]];
  }
  return { reveals: [], cells, columns: 6, rows: 6, missLimit: 3 };
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
    const winsBefore = evalBoard(game, tiles, bet);
    let wins = winsBefore;
    let currentLabel: string | undefined;
    if (sumWins(winsBefore) > 0 && randomInt(100) < 55) {
      const involved = winsBefore.flatMap((win) => win.cells).filter((cell) => isWild(game, tiles[cell.reel][cell.row].id));
      if (involved.length) {
        const cell = involved[randomInt(involved.length)];
        const table = [2, 2, 3, 3, 5];
        const value = table[randomInt(table.length)];
        tiles[cell.reel][cell.row] = { ...tiles[cell.reel][cell.row], value };
        marks.push({ ...cell, kind: 'mult' });
        wins = evalBoard(game, tiles, bet);
        currentLabel = `Дыхание x${value}`;
      }
    }
    const current = board(tiles, wins, multiplier, { marks, label: currentLabel ?? `Множитель x${multiplier}` });
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

  if (kind === 'sticky-reels') {
    const heat = scatterCount >= 5 ? 'hot' : scatterCount >= 4 || tier === 'top' ? 'top' : 'regular';
    const face = pickWeighted(CURTAIN_WHEEL);
    const index = Math.max(0, CURTAIN_WHEEL.indexOf(face));
    play.curtainWheel = { index, spins: face.spins, min: face.min, label: face.label };
    play.title = heat === 'hot' ? 'Hot Mod' : game.bonus.title;
    play.rule = heat === 'hot'
      ? 'Пять скаттеров. Колесо уже выбрало спины и минимум шторы. На поле сразу две шторы.'
      : heat === 'top'
        ? 'Четыре скаттера. Колесо выбирает спины и минимум шторы. На старте одна штора.'
        : 'Три скаттера. Колесо выбирает спины и минимальный множитель. Штора может не выпасть на первом спине.';
    play.spins = bonusStickyReels(game, bet, heat, play.curtainWheel);
  }
  if (kind === 'hold-win') {
    const seeded = countId(lastTiles, 'coin').length >= game.trigger;
    const start = seeded || tier === 'natural' ? lastTiles : holdWinStart(game, tier === 'top' ? 9 : 6, tier === 'top' ? 5 : 1);
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
  if (game.id === 'green-arrow') {
    const topShot = tier === 'top' || scatterCount >= 4;
    if (topShot) {
      play.title = 'Тир';
      play.rule = 'Поле 6×6, шесть клеток мимо. Третий промах заканчивает тир. Множители от x10 до x2500.';
      play.pick = bonusArcherPick(bet);
    } else {
      play.title = 'Залп';
      play.rule = '15 спинов. Лучник бросает от 1 до 6 диких. Стрела с множителем остаётся до конца бонуса.';
      play.spins = bonusVolley(game, bet);
    }
  }
  if (kind === 'cluster-fs') play.spins = bonusClusterFs(game, bet, tier);
  if (kind === 'burn') play.spins = bonusBurn(game, bet, tier);
  if (kind === 'colossal') play.spins = bonusColossal(game, bet, tier);
  if (kind === 'slash') play.spins = bonusSlash(game, bet, tier);

  const interactive = Boolean(play.pick?.cells?.length);
  let total = play.spins.reduce((sum, step) => sum + step.totalWin, 0)
    + (play.wheel?.cash ?? 0)
    + (interactive ? 0 : (play.pick?.reveals.reduce((sum, reveal) => sum + reveal.amount, 0) ?? 0));

  const floor = tier === 'top' ? bet * 50 : tier === 'regular' ? bet * 10 : 0;
  if (!interactive && floor > total) {
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

function placeExactTrigger(game: SlotGame, count: number): Tiles {
  const trigger = triggerSymbol(game);
  const tiles = drawTiles(game, game.symbols);
  if (!trigger || count <= 0) return tiles;
  const fallback = regularSymbols(game)[0];
  if (!fallback) return tiles;
  tiles.forEach((reel) => {
    reel.forEach((tile, row) => {
      if (tile.id === trigger.id) reel[row] = newTile(game, fallback.id);
    });
  });
  let order = Array.from({ length: game.reels }, (_, index) => index);
  if (game.id === 'green-arrow') order = order.filter((reel) => reel > 0);
  for (let index = order.length - 1; index > 0; index -= 1) {
    const swap = randomInt(index + 1);
    [order[index], order[swap]] = [order[swap], order[index]];
  }
  let placed = 0;
  for (const reel of order) {
    if (placed >= count) break;
    stamp(game, tiles, { reel, row: randomInt(game.rows) }, trigger.id);
    placed += 1;
  }
  while (placed < count) {
    let spots = freeCells(tiles, (id) => id === trigger.id);
    if (game.id === 'green-arrow') {
      const taken = new Set(countId(tiles, trigger.id).map((cell) => cell.reel));
      spots = spots.filter((cell) => cell.reel > 0 && !taken.has(cell.reel));
    }
    if (!spots.length) break;
    stamp(game, tiles, spots[randomInt(spots.length)], trigger.id);
    placed += 1;
  }
  return tiles;
}

export function buyBonus(game: SlotGame, totalBet: number, tier: 'regular' | 'top'): RoundResult & { bonus: BonusPlay } {
  const need = tier === 'top' && (game.id === 'green-arrow' || game.id === 'golden-must') ? 4 : game.trigger;
  const tiles = placeExactTrigger(game, need);
  const wins = [...evalBoard(game, tiles, totalBet)];
  const scatterWin = evalScatterWin(game, tiles, totalBet);
  if (scatterWin) wins.push(scatterWin);
  const triggerName = triggerSymbol(game)?.name ?? 'скаттер';
  const triggerBoard = board(tiles, wins, 1, { label: `${need}× ${triggerName}` });
  const bonus = playBonus(game, totalBet, tier, need, tiles);
  const cap = totalBet * game.maxWinMultiplier;
  let totalWin = roundMoney(triggerBoard.win + bonus.totalWin);
  let capped = false;
  if (totalWin > cap) {
    capped = true;
    bonus.totalWin = cap;
    totalWin = cap;
  }
  return {
    grid: triggerBoard.grid,
    boards: [triggerBoard],
    wins: triggerBoard.wins,
    multiplier: 1,
    totalWin,
    capped,
    scatterCount: bonus.scatterCount,
    events: [],
    bonus,
  };
}

export function scoreArcherPick(
  cells: { kind: 'mult' | 'miss'; value?: number; amount: number }[],
  opened: number[],
  missLimit: number,
  already: number,
  baseBet: number,
  tier: Tier,
  maxWinMultiplier: number,
): { collected: number; extra: number; floorAdded: number; total: number; capped: boolean } {
  const seen = new Set<number>();
  let misses = 0;
  let collected = 0;
  for (const raw of opened) {
    const index = Number(raw);
    if (!Number.isInteger(index) || index < 0 || index >= cells.length || seen.has(index)) continue;
    seen.add(index);
    const cell = cells[index];
    const prize = cell.kind === 'miss' ? 0 : roundMoney((cell.value ?? 0) * baseBet);
    collected = roundMoney(collected + prize);
    if (cell.kind === 'miss') misses += 1;
    if (misses >= missLimit) break;
  }
  const floor = tier === 'top' ? baseBet * 50 : tier === 'regular' ? baseBet * 10 : 0;
  let extra = collected;
  let floorAdded = 0;
  if (floor > already + collected) {
    floorAdded = roundMoney(floor - already - collected);
    extra = roundMoney(collected + floorAdded);
  }
  const cap = baseBet * maxWinMultiplier;
  let capped = false;
  if (already + extra > cap) {
    extra = roundMoney(Math.max(0, cap - already));
    capped = true;
  }
  return { collected, extra, floorAdded, total: roundMoney(already + extra), capped };
}

export function formatGramUnits(units: number): string {
  return (units / 100).toFixed(2);
}
