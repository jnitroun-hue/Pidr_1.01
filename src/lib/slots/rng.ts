/** Честный равномерный индекс. Лишние значения отбрасываются, чтобы не было перекоса. */
export function randomInt(maxExclusive: number): number {
  if (maxExclusive <= 1) return 0;
  const range = 0x100000000;
  const limit = range - (range % maxExclusive);
  const buf = new Uint32Array(1);
  let value = 0;
  do {
    crypto.getRandomValues(buf);
    value = buf[0];
  } while (value >= limit);
  return value % maxExclusive;
}

export function pickWeighted<T extends { weight: number }>(items: T[]): T {
  const total = items.reduce((sum, item) => sum + item.weight, 0);
  if (total <= 0) return items[0];
  let roll = randomInt(total);
  for (const item of items) {
    roll -= item.weight;
    if (roll < 0) return item;
  }
  return items[items.length - 1];
}
