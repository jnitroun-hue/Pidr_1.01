/**
 * Экспорт математики слотов в формат Stake Engine и отчёт по RTP.
 *
 *   npx tsx scripts/slots-books.mjs --report                 # только RTP по всем играм
 *   npx tsx scripts/slots-books.mjs --game oak-fortune       # книги + таблицы в library/oak-fortune/
 *   npx tsx scripts/slots-books.mjs --sims 100000 --bonus-sims 20000 --game hex-vault
 *
 * На выходе для каждой игры: index.json, books_<mode>.jsonl.zst, lookUpTable_<mode>_0.csv.
 * Режимы: base (цена 1.0), bonus (цена 100), top (цена 500). payoutMultiplier — целое, x11.5 = 1150.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { zstdCompressSync } from 'node:zlib';
import { SLOT_GAMES } from '../src/lib/slots/games.ts';
import { buyBonus, spinSlot } from '../src/lib/slots/engine.ts';
import { toBook } from '../src/lib/slots/book.ts';

const args = process.argv.slice(2);
const flag = (name, fallback) => {
  const index = args.indexOf(`--${name}`);
  if (index === -1) return fallback;
  const value = args[index + 1];
  return value && !value.startsWith('--') ? value : true;
};

const reportOnly = Boolean(flag('report', false));
const onlyGame = flag('game', null);
const baseSims = Number(flag('sims', reportOnly ? 40000 : 50000));
const bonusSims = Number(flag('bonus-sims', reportOnly ? 6000 : 10000));
const outRoot = flag('out', 'library');
const BET = 100;

const MODES = [
  { name: 'base', cost: 1, sims: baseSims, run: (game) => spinSlot(game, BET) },
  { name: 'ante', cost: 1.5, sims: Math.round(baseSims / 2), run: (game) => spinSlot(game, BET, true), reportOnly: true },
  { name: 'bonus', cost: 100, sims: bonusSims, run: (game) => buyBonus(game, BET, 'regular') },
  { name: 'top', cost: 500, sims: bonusSims, run: (game) => buyBonus(game, BET, 'top') },
];

function stats(payouts, cost) {
  const n = payouts.length;
  const mean = payouts.reduce((sum, value) => sum + value, 0) / n;
  const variance = payouts.reduce((sum, value) => sum + (value - mean) ** 2, 0) / n;
  const hits = payouts.filter((value) => value > 0).length;
  const sorted = [...payouts].sort((a, b) => b - a);
  return {
    rtp: (mean / cost) * 100,
    hitRate: (hits / n) * 100,
    std: Math.sqrt(variance) / cost,
    max: sorted[0],
    top1: sorted[Math.floor(n * 0.01)] ?? 0,
  };
}

const games = SLOT_GAMES.filter((game) => !onlyGame || game.id === onlyGame);
if (!games.length) {
  console.error(`Игра не найдена: ${onlyGame}`);
  process.exit(1);
}

for (const game of games) {
  const index = { modes: [] };
  const dir = join(outRoot, game.id);
  if (!reportOnly) mkdirSync(dir, { recursive: true });
  console.log(`\n${game.title} (${game.id}) · ${game.mechanic} · ${game.bonus.kind} · cap x${game.maxWinMultiplier}`);
  for (const mode of MODES) {
    if (!reportOnly && mode.reportOnly) continue;
    const payouts = [];
    const lines = [];
    const csv = [];
    let capped = 0;
    let bonusPart = 0;
    let triggers = 0;
    for (let sim = 1; sim <= mode.sims; sim += 1) {
      const round = mode.run(game);
      const payout = round.totalWin / BET;
      payouts.push(payout);
      if (round.capped) capped += 1;
      if (round.bonus && mode.cost < 100) {
        triggers += 1;
        bonusPart += Math.min(round.bonus.totalWin, round.totalWin) / BET;
      }
      if (!reportOnly) {
        const book = toBook(game, round, BET, sim);
        lines.push(JSON.stringify(book));
        csv.push(`${sim},1,${book.payoutMultiplier}`);
      }
    }
    const s = stats(payouts, mode.cost);
    const split = mode.cost < 100
      ? `  base-only ${((s.rtp - (bonusPart / mode.sims / mode.cost) * 100)).toFixed(1).padStart(6)}%  bonus ${((bonusPart / mode.sims / mode.cost) * 100).toFixed(1).padStart(5)}%  trigger 1/${triggers ? Math.round(mode.sims / triggers) : '∞'}  avg bonus x${triggers ? (bonusPart / triggers).toFixed(0) : '-'}`
      : '';
    console.log(
      `  ${mode.name.padEnd(6)} cost x${String(mode.cost).padEnd(4)} RTP ${s.rtp.toFixed(2).padStart(7)}%  hit ${s.hitRate.toFixed(1).padStart(5)}%  std ${s.std.toFixed(1).padStart(6)}  max x${s.max.toFixed(0).padStart(5)}  top1% x${s.top1.toFixed(0).padStart(4)}  capped ${capped}${split}`
    );
    if (!reportOnly) {
      const eventsFile = `books_${mode.name}.jsonl.zst`;
      const weightsFile = `lookUpTable_${mode.name}_0.csv`;
      writeFileSync(join(dir, eventsFile), zstdCompressSync(Buffer.from(lines.join('\n') + '\n')));
      writeFileSync(join(dir, weightsFile), csv.join('\n') + '\n');
      index.modes.push({ name: mode.name, cost: mode.cost, events: eventsFile, weights: weightsFile });
    }
  }
  if (!reportOnly) {
    writeFileSync(join(dir, 'index.json'), JSON.stringify(index, null, 2));
    console.log(`  → ${dir}`);
  }
}
