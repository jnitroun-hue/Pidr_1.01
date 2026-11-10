export type ReelSpeed = 'slow' | 'mid' | 'fast';

export type ReelPlan = {
  /** Когда начинается движение этого барабана, мс. */
  delay: number;
  /** Сколько длится движение барабана до полной остановки, мс. */
  duration: number;
  /** Длительность падения одного символа или всей колонки. */
  drop: number;
  /** Пауза между символами. 0 — колонка падает целиком. */
  step: number;
  mode: 'cell' | 'column';
};

/** Сколько старые символы падают вниз перед новым медленным спином диджея. */
export const SLOW_DUMP_MS = 560;
/** Падение одного уцелевшего символа в каскаде. */
export const GRAVITY_STEP_MS = 170;

const SLOW_TICK = 68;
const SLOW_GAP = 18;
const SLOW_MIN = 150;

/** Медленный режим: фишка падает сверху и ложится на стопку. Первой садится нижняя. */
export function slowCellTiming(row: number, rows: number, bonus = false): { start: number; drop: number; fall: number } {
  const tick = bonus ? SLOW_TICK + 8 : SLOW_TICK;
  const gap = bonus ? SLOW_GAP + 8 : SLOW_GAP;
  const min = bonus ? SLOW_MIN + 20 : SLOW_MIN;
  const safe = Math.max(1, rows);
  const clamped = Math.max(0, Math.min(safe - 1, row));
  const fall = clamped + 1;
  const fromBottom = safe - 1 - clamped;
  let start = 0;
  for (let index = 0; index < fromBottom; index += 1) {
    start += Math.max(min, (safe - index) * tick) + gap;
  }
  return { start, drop: Math.max(min, fall * tick), fall };
}

function slowSpan(rows: number, bonus: boolean): number {
  const top = slowCellTiming(0, rows, bonus);
  return top.start + top.drop;
}

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
    const span = slowSpan(safeRows, bonus);
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
