export type ReelSpeed = 'slow' | 'mid' | 'fast';

export function reelPlan(speed: ReelSpeed, reelIndex: number, bonus = false): { delay: number; duration: number } {
  if (speed === 'slow') {
    const base = bonus ? 1180 : 860;
    return { delay: 50, duration: base + reelIndex * 280 };
  }
  if (speed === 'fast') return { delay: 40, duration: 680 };
  return { delay: 40, duration: bonus ? 1480 : 1040 };
}

export function reelSpinMs(speed: ReelSpeed, reels: number, bonus = false): number {
  const last = reelPlan(speed, Math.max(0, reels - 1), bonus);
  return last.delay + last.duration + 70;
}

export function anteCharge(bet: number): number {
  return Math.round(bet * 150) / 100;
}
