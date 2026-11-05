export type ReelSpeed = 'slow' | 'mid' | 'fast';

export type ReelPlan = {
  /** Когда начинается движение этого барабана, мс. */
  delay: number;
  /** Сколько длится движение барабана до полной остановки, мс. */
  duration: number;
  /** Длительность падения одного символа или всей колонки. */
  drop: number;
  /** Пауза между символами сверху вниз. 0 — колонка падает целиком. */
  step: number;
  mode: 'cell' | 'column';
};

const SLOW = { drop: 180, step: 145, gap: 40 };
const SLOW_BONUS = { drop: 200, step: 160, gap: 50 };
const MID = { drop: 460, gap: 80 };
const MID_BONUS = { drop: 540, gap: 90 };
const FAST_DROP = 240;

export function reelPlan(
  speed: ReelSpeed,
  reelIndex: number,
  rows = 3,
  bonus = false,
  priorExtra = 0,
  ownExtra = 0,
): ReelPlan {
  const safeRows = Math.max(1, rows);
  const wait = Math.max(0, priorExtra) + Math.max(0, ownExtra);
  if (speed === 'slow') {
    const tune = bonus ? SLOW_BONUS : SLOW;
    const span = (safeRows - 1) * tune.step + tune.drop;
    return {
      delay: reelIndex * (span + tune.gap) + wait,
      duration: span,
      drop: tune.drop,
      step: tune.step,
      mode: 'cell',
    };
  }
  if (speed === 'fast') {
    return { delay: Math.max(0, ownExtra), duration: FAST_DROP, drop: FAST_DROP, step: 0, mode: 'column' };
  }
  const tune = bonus ? MID_BONUS : MID;
  return {
    delay: reelIndex * (tune.drop + tune.gap) + wait,
    duration: tune.drop,
    drop: tune.drop,
    step: 0,
    mode: 'column',
  };
}

export function reelSpinMs(
  speed: ReelSpeed,
  reels: number,
  rows = 3,
  bonus = false,
  extras: number[] = [],
): number {
  let prior = 0;
  let end = 0;
  const count = Math.max(1, reels);
  for (let index = 0; index < count; index += 1) {
    const own = Math.max(0, extras[index] ?? 0);
    const plan = reelPlan(speed, index, rows, bonus, prior, own);
    end = Math.max(end, plan.delay + plan.duration);
    prior += own;
  }
  return end + 70;
}

export function anteCharge(bet: number): number {
  return Math.round(bet * 150) / 100;
}
