import type { Board, RoundResult } from './engine';
import type { SlotGame } from './games';

/**
 * Книга раунда в духе Stake Engine: упорядоченный список событий и итоговый payoutMultiplier.
 * Суммы — в сотых долях ставки (как центы при ставке 1.00), payoutMultiplier — целое, x11.5 = 1150.
 */
export type BookEvent = { index: number; type: string } & Record<string, unknown>;

export type Book = {
  id: number;
  events: BookEvent[];
  payoutMultiplier: number;
};

function cents(amount: number, bet: number): number {
  return Math.round((amount / bet) * 100);
}

function boardSymbols(game: SlotGame, item: Board) {
  return item.grid.map((reel, reelIndex) => reel.map((id, row) => {
    const symbol = game.symbols.find((entry) => entry.id === id);
    const cell: Record<string, unknown> = { name: id };
    if (symbol?.multiplier) cell.multiplier = symbol.multiplier;
    const value = item.values?.[reelIndex]?.[row];
    if (value != null) cell.value = value;
    if (item.locked?.[reelIndex]?.[row]) cell.locked = true;
    return cell;
  }));
}

function anticipation(game: SlotGame, item: Board): boolean[] {
  const trigger = game.symbols.find((symbol) => symbol.scatter || symbol.bonusCoin)?.id;
  if (!trigger) return item.grid.map(() => false);
  let seen = 0;
  return item.grid.map((reel) => {
    const waiting = seen >= Math.max(1, game.trigger - 1);
    if (reel.some((id) => id === trigger)) seen += 1;
    return waiting;
  });
}

function pushBoard(events: BookEvent[], game: SlotGame, item: Board, bet: number, gameType: 'basegame' | 'freegame', running: { total: number }) {
  events.push({
    index: events.length,
    type: 'reveal',
    board: boardSymbols(game, item),
    paddingPositions: item.grid.map(() => null),
    anticipation: anticipation(game, item),
    gameType,
    label: item.label ?? null,
    marks: item.marks ?? [],
    curtains: item.curtains ?? null,
  });
  if (item.wins.length) {
    events.push({
      index: events.length,
      type: 'winInfo',
      totalWin: cents(item.win, bet),
      wins: item.wins.map((win) => ({
        symbol: win.symbolId,
        kind: win.count,
        win: cents(win.amount, bet),
        positions: win.cells,
        meta: {
          type: win.kind,
          lineIndex: win.lineIndex ?? null,
          direction: win.direction ?? null,
          ways: win.ways ?? null,
          multiplier: item.multiplier,
        },
      })),
    });
  }
  if (item.win > 0) {
    running.total += item.win;
    events.push({ index: events.length, type: 'setWin', amount: cents(item.win, bet) });
    events.push({ index: events.length, type: 'setTotalWin', amount: cents(running.total, bet) });
  }
}

export function toBook(game: SlotGame, round: RoundResult, bet: number, id: number): Book {
  const events: BookEvent[] = [];
  const running = { total: 0 };

  for (const item of round.boards) pushBoard(events, game, item, bet, 'basegame', running);

  const bonus = round.bonus;
  if (bonus) {
    const triggerCells = round.boards[round.boards.length - 1].wins.find((win) => win.kind === 'scatter')?.cells ?? [];
    events.push({
      index: events.length,
      type: bonus.kind === 'hold-win' ? 'holdWinTrigger' : bonus.kind === 'wheel' ? 'wheelTrigger' : bonus.kind === 'pick' ? 'pickTrigger' : 'freeSpinTrigger',
      totalFs: bonus.spins.length,
      tier: bonus.tier,
      positions: triggerCells,
    });
    if (bonus.curtainWheel) {
      events.push({
        index: events.length,
        type: 'curtainWheel',
        segment: bonus.curtainWheel.index,
        spins: bonus.curtainWheel.spins,
        min: bonus.curtainWheel.min,
        label: bonus.curtainWheel.label,
      });
    }
    if (bonus.wheel) {
      for (const stop of bonus.wheel.stops) {
        events.push({ index: events.length, type: 'wheelStop', level: stop.level, segment: stop.index });
      }
      if (bonus.wheel.cash > 0) {
        running.total += bonus.wheel.cash;
        events.push({ index: events.length, type: 'setWin', amount: cents(bonus.wheel.cash, bet) });
        events.push({ index: events.length, type: 'setTotalWin', amount: cents(running.total, bet) });
      }
    }
    if (bonus.pick?.cells?.length) {
      events.push({
        index: events.length,
        type: 'pickField',
        columns: bonus.pick.columns ?? null,
        rows: bonus.pick.rows ?? null,
        missLimit: bonus.pick.missLimit ?? null,
        cells: bonus.pick.cells.map((cell) => ({ kind: cell.kind, value: cell.value })),
      });
    }
    if (bonus.pick) {
      bonus.pick.reveals.forEach((reveal, position) => {
        events.push({ index: events.length, type: 'pickReveal', position, kind: reveal.kind, value: reveal.value, win: cents(reveal.amount, bet) });
        if (reveal.amount > 0) {
          running.total += reveal.amount;
          events.push({ index: events.length, type: 'setTotalWin', amount: cents(running.total, bet) });
        }
      });
    }
    bonus.spins.forEach((step, spinIndex) => {
      events.push({ index: events.length, type: 'updateFreeSpin', amount: spinIndex + 1, total: bonus.spins.length, label: step.label ?? null });
      for (const item of step.boards) pushBoard(events, game, item, bet, 'freegame', running);
    });
    if (bonus.floorAdded > 0) {
      events.push({ index: events.length, type: 'buyFloor', amount: cents(bonus.floorAdded, bet) });
    }
  }

  const payout = cents(round.totalWin, bet);
  if (running.total <= 0) events.push({ index: events.length, type: 'setTotalWin', amount: 0 });
  if (round.capped) {
    events.push({ index: events.length, type: 'wincap', amount: payout });
    events.push({ index: events.length, type: 'setTotalWin', amount: payout });
  }
  events.push({ index: events.length, type: 'finalWin', amount: payout, capped: round.capped });

  return { id, events, payoutMultiplier: payout };
}
