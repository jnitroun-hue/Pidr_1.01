export type ReelSpeed = 'slow' | 'mid' | 'fast';

export function reelPlan(speed: ReelSpeed, reelIndex: number, bonus = false): { delay: number; duration: number } {
  if (speed === 'slow') {
    const each = bonus ? 1400 : 980;
    return { delay: reelIndex * each, duration: each };
  }
  if (speed === 'fast') return { delay: 0, duration: 620 };
  return { delay: 0, duration: bonus ? 1500 : 1000 };
}

export function reelSpinMs(speed: ReelSpeed, reels: number, bonus = false): number {
  const last = reelPlan(speed, Math.max(0, reels - 1), bonus);
  return last.delay + last.duration + 90;
}

export function anteCharge(bet: number): number {
  return Math.round(bet * 150) / 100;
}
