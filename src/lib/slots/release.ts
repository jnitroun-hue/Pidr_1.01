import { toBook, type Book } from './book';
import { buyBonus, spinSlot, type RoundResult } from './engine';
import { SLOT_GAMES, type SlotGame } from './games';
import { withSeed } from './rng';
import { anteCharge } from './speed';

/**
 * Режимы, которые Stake Engine и агрегатор ждут отдельными книгами.
 * payoutMultiplier в книге — сотые доли базовой ставки (100 = 1x).
 * RTP режима = средний (totalWin / базовая ставка) / cost.
 */
export type BetMode = 'base' | 'ante' | 'buy-regular' | 'buy-top';

export const BET_MODES: BetMode[] = ['base', 'ante', 'buy-regular', 'buy-top'];

export function modeCost(mode: BetMode): number {
  if (mode === 'ante') return 1.5;
  if (mode === 'buy-regular') return 100;
  if (mode === 'buy-top') return 500;
  return 1;
}

export function modeStake(bet: number, mode: BetMode): number {
  if (mode === 'ante') return anteCharge(bet);
  if (mode === 'buy-regular') return bet * 100;
  if (mode === 'buy-top') return bet * 500;
  return bet;
}

export function playMode(game: SlotGame, bet: number, mode: BetMode): RoundResult {
  if (mode === 'buy-regular') return buyBonus(game, bet, 'regular');
  if (mode === 'buy-top') return buyBonus(game, bet, 'top');
  return spinSlot(game, bet, mode === 'ante');
}

export function playSeeded(game: SlotGame, bet: number, mode: BetMode, seed: number): RoundResult {
  return withSeed(seed, () => playMode(game, bet, mode));
}

/** Книга одного раунда. id — номер симуляции, с нуля, в том же порядке, что строка lookup. */
export function bookOf(game: SlotGame, round: RoundResult, bet: number, id: number): Book {
  return toBook(game, round, bet, id);
}

export type ModeAudit = {
  gameId: string;
  mode: BetMode;
  cost: number;
  spins: number;
  rtp: number;
  hitRate: number;
  featureRate: number;
  maxWinX: number;
  capHits: number;
  meanX: number;
  stdevX: number;
};

/** Оценка режима. RTP в долях: 0.96 = 96%. Не публиковать как сертификат, пока прогон не 100k+. */
export function auditMode(game: SlotGame, mode: BetMode, spins: number, seed = 1): ModeAudit {
  const cost = modeCost(mode);
  let returned = 0;
  let hits = 0;
  let features = 0;
  let maxWinX = 0;
  let capHits = 0;
  let sumX = 0;
  let sumX2 = 0;
  for (let index = 0; index < spins; index += 1) {
    const round = playSeeded(game, 1, mode, seed + index * 9973);
    const multiple = round.totalWin;
    returned += multiple;
    sumX += multiple;
    sumX2 += multiple * multiple;
    if (multiple > 0) hits += 1;
    if (round.bonus) features += 1;
    if (multiple > maxWinX) maxWinX = multiple;
    if (round.capped) capHits += 1;
    const book = bookOf(game, round, 1, index);
    if (book.payoutMultiplier !== Math.round(round.totalWin * 100)) {
      throw new Error(`Книга ${game.id}/${mode}#${index} не сходится с выплатой`);
    }
    const finalWin = book.events[book.events.length - 1];
    if (finalWin?.type !== 'finalWin' || finalWin.amount !== book.payoutMultiplier) {
      throw new Error(`Книга ${game.id}/${mode}#${index} без finalWin`);
    }
  }
  const meanX = sumX / spins;
  const variance = Math.max(0, sumX2 / spins - meanX * meanX);
  return {
    gameId: game.id,
    mode,
    cost,
    spins,
    rtp: returned / spins / cost,
    hitRate: hits / spins,
    featureRate: features / spins,
    maxWinX,
    capHits,
    meanX,
    stdevX: Math.sqrt(variance),
  };
}

/** Строка lookup без заголовка: sim_id,weight,payoutMultiplier. Вес целый. */
export function lookupRow(id: number, weight: number, payoutMultiplier: number): string {
  return `${id},${Math.round(weight)},${payoutMultiplier}`;
}

export type ModeIndex = {
  name: BetMode;
  cost: number;
  rtpTarget: number;
  maxWin: number;
  events: string;
  weights: string;
};

/**
 * index.json одного тайтла.
 * Полоса Stake на октябрь 2026: каждый режим 96.0–96.7%.
 * rtpTarget здесь — заявленная цель, не измеренный RTP.
 */
export function stakeIndex(game: SlotGame, rtpTarget = 0.965): { game: string; modes: ModeIndex[] } {
  return {
    game: game.id,
    modes: BET_MODES.map((mode) => ({
      name: mode,
      cost: modeCost(mode),
      rtpTarget,
      maxWin: game.maxWinMultiplier,
      events: `books_${mode}.jsonl`,
      weights: `lookUpTable_${mode}.csv`,
    })),
  };
}

export function gameById(id: string): SlotGame | undefined {
  return SLOT_GAMES.find((game) => game.id === id);
}
