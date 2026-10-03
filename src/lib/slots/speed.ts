export type ReelSpeed = 'slow' | 'mid' | 'fast';

export const REEL_SPEED: Record<ReelSpeed, { base: number; step: number }> = {
  slow: { base: 2400, step: 460 },
  mid: { base: 1500, step: 280 },
  fast: { base: 900, step: 180 },
};

export function reelMotion(speed: ReelSpeed, reelIndex: number): number {
  const spec = REEL_SPEED[speed];
  return spec.base + reelIndex * spec.step;
}

export function reelSpinMs(speed: ReelSpeed, reels: number): number {
  return reelMotion(speed, Math.max(0, reels - 1)) + 140;
}

export function anteCharge(bet: number): number {
  return Math.round(bet * 150) / 100;
}
