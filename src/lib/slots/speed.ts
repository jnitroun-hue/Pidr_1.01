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

const SLOW = { drop: 220, step: 200, gap: 70 };
const SLOW_BONUS = { drop: 240, step: 220, gap: 80 };
const MID = { drop: 460, gap: 80 };
const MID_BONUS = { drop: 540, gap: 90 };
const FAST_DROP = 240;

/** Барабан не крутится: штора, заморозка или монета Hold & Win. */
export function isReelHeld(locked: boolean[] | undefined): boolean {
  return Boolean(locked?.some(Boolean));
}

/** Номер среди барабанов, которые в этом спине реально играют. */
export function openOrder(locked: boolean[][] | undefined, reelIndex: number): number {
  let order = 0;
  for (let index = 0; index < reelIndex; index += 1) {
    if (!isReelHeld(locked?.[index])) order += 1;
  }
  return order;
}

/** Ожидание только от предыдущих играющих барабанов. Закрытый не вставляет паузу. */
export function openPriorExtra(locked: boolean[][] | undefined, extras: number[], reelIndex: number): number {
  let prior = 0;
  for (let index = 0; index < reelIndex; index += 1) {
    if (!isReelHeld(locked?.[index])) prior += Math.max(0, extras[index] ?? 0);
  }
  return prior;
}

export function reelPlan(
  speed: ReelSpeed,
  /** Порядковый номер среди барабанов, которые крутятся, а не позиция на поле. */
  order: number,
  rows = 3,
  bonus = false,
  priorExtra = 0,
  ownExtra = 0,
): ReelPlan {
  const safeRows = Math.max(1, rows);
  const wait = Math.max(0, priorExtra) + Math.max(0, ownExtra);
  const slot = Math.max(0, order);
  if (speed === 'slow') {
    const tune = bonus ? SLOW_BONUS : SLOW;
    const span = (safeRows - 1) * tune.step + tune.drop;
    return {
      delay: 140 + slot * (span + tune.gap) + wait,
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
    delay: slot * (tune.drop + tune.gap) + wait,
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
  /** true — барабан закрыт и не занимает место в очереди. */
  held: boolean[] = [],
): number {
  let prior = 0;
  let end = 0;
  let order = 0;
  let played = 0;
  const count = Math.max(1, reels);
  for (let index = 0; index < count; index += 1) {
    if (held[index]) continue;
    const own = Math.max(0, extras[index] ?? 0);
    const plan = reelPlan(speed, order, rows, bonus, prior, own);
    end = Math.max(end, plan.delay + plan.duration);
    prior += own;
    order += 1;
    played += 1;
  }
  if (played === 0) return 0;
  return end + 70;
}

export function anteCharge(bet: number): number {
  return Math.round(bet * 150) / 100;
}
