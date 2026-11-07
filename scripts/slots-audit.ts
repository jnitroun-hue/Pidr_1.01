import { SLOT_GAMES } from '../src/lib/slots/games';
import { BET_MODES, auditMode, playSeeded, stakeIndex, type BetMode } from '../src/lib/slots/release';

const gameId = process.argv[2] && process.argv[2] !== 'all' ? process.argv[2] : '';
const spins = Number(process.argv[3] || (gameId ? 4000 : 800));
const games = gameId ? SLOT_GAMES.filter((game) => game.id === gameId) : SLOT_GAMES;

if (!games.length) {
  console.error(`Нет игры ${gameId}`);
  process.exit(1);
}

const probe = playSeeded(games[0], 1, 'base', 42);
const again = playSeeded(games[0], 1, 'base', 42);
if (probe.totalWin !== again.totalWin || JSON.stringify(probe.grid) !== JSON.stringify(again.grid)) {
  console.error('Seed не повторяет раунд');
  process.exit(1);
}

const modes: BetMode[] = gameId ? BET_MODES : ['base'];
const band = { min: 0.96, max: 0.967 };

for (const game of games) {
  console.log(`\n${game.id}  cap x${game.maxWinMultiplier}`);
  if (gameId) console.log(JSON.stringify(stakeIndex(game)));
  for (const mode of modes) {
    const count = mode.startsWith('buy') ? Math.min(spins, Math.max(200, Math.floor(spins / 8))) : spins;
    const stat = auditMode(game, mode, count);
    const inside = stat.rtp >= band.min && stat.rtp <= band.max;
    const mark = inside ? 'в полосе' : 'вне полосы 96.0–96.7';
    console.log(
      [
        mode.padEnd(12),
        `n=${String(stat.spins).padStart(5)}`,
        `RTP ${(stat.rtp * 100).toFixed(2)}%`.padEnd(12),
        `hit ${(stat.hitRate * 100).toFixed(1)}%`.padEnd(10),
        `bonus ${(stat.featureRate * 100).toFixed(2)}%`.padEnd(12),
        `max x${stat.maxWinX.toFixed(0)}`,
        `sd ${stat.stdevX.toFixed(1)}`,
        mark,
      ].join('  '),
    );
  }
}
