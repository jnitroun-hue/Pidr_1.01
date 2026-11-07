const seedStack: Array<() => number> = [];

/** Mulberry32. Один и тот же seed даёт тот же раунд: так собирается книга для Stake. */
function mulberry32(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function nextUint32(): number {
  const seeded = seedStack[seedStack.length - 1];
  if (seeded) return Math.floor(seeded() * 0x100000000);
  const buf = new Uint32Array(1);
  crypto.getRandomValues(buf);
  return buf[0];
}

/**
 * Весь синхронный расчёт внутри fn идёт от seed.
 * spinSlot не делает await, поэтому вложенные запросы друг друга не перебивают.
 */
export function withSeed<T>(seed: number, fn: () => T): T {
  seedStack.push(mulberry32(seed));
  try {
    return fn();
  } finally {
    seedStack.pop();
  }
}

/** Честный равномерный индекс. Лишние значения отбрасываются, чтобы не было перекоса. */
export function randomInt(maxExclusive: number): number {
  if (maxExclusive <= 1) return 0;
  const range = 0x100000000;
  const limit = range - (range % maxExclusive);
  let value = 0;
  do {
    value = nextUint32();
  } while (value >= limit);
  return value % maxExclusive;
}

/** Равномерное число в [0, 1) с разрешением 2^-32. */
export function randomUnit(): number {
  return nextUint32() / 0x100000000;
}

/**
 * Взвешенный выбор. Веса могут быть дробными: бросок делается по непрерывной шкале,
 * иначе целочисленный randomInt(total) квантует дробные веса и искажает частоты.
 */
export function pickWeighted<T extends { weight: number }>(items: T[]): T {
  const total = items.reduce((sum, item) => sum + item.weight, 0);
  if (total <= 0) return items[0];
  let roll = randomUnit() * total;
  for (const item of items) {
    roll -= item.weight;
    if (roll < 0) return item;
  }
  return items[items.length - 1];
}
