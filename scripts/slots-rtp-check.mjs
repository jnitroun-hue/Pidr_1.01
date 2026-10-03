import { SLOT_GAMES } from '../src/lib/slots/games.ts';
import { spinSlot } from '../src/lib/slots/engine.ts';

const spins = 8000;
for (const game of SLOT_GAMES) {
  let wagered = 0;
  let returned = 0;
  const bet = 100;
  for (let i = 0; i < spins; i += 1) {
    wagered += bet;
    returned += spinSlot(game, bet).totalWin;
  }
  const rtp = (returned / wagered) * 100;
  console.log(`${game.id}: RTP ${rtp.toFixed(2)}%`);
}
