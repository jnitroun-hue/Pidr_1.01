import { describe, expect, it } from 'vitest';
import { computeCardFanLayout } from '../src/lib/game/card-fan-layout';

describe('computeCardFanLayout', () => {
  it('keeps a large open stack inside the seat width', () => {
    const layout = computeCardFanLayout({
      cardWidth: 38,
      cardCount: 12,
      maxFanWidth: 80,
      minPeekPx: 10,
      maxPeekPx: 16,
    });

    expect(layout.totalWidthPx).toBeLessThanOrEqual(80);
    expect(layout.marginLeftPx).toBeGreaterThan(0);
    expect(layout.compressed).toBe(true);
  });

  it('keeps one top card fully visible', () => {
    const layout = computeCardFanLayout({
      cardWidth: 38,
      cardCount: 1,
      maxFanWidth: 80,
    });

    expect(layout.totalWidthPx).toBe(38);
    expect(layout.marginLeftPx).toBe(0);
    expect(layout.compressed).toBe(false);
  });

  it('never grows past maxFanWidth even with dozens of cards', () => {
    const layout = computeCardFanLayout({
      cardWidth: 36,
      cardCount: 30,
      maxFanWidth: 74,
      minPeekPx: 8,
      maxPeekPx: 15,
    });

    expect(layout.totalWidthPx).toBeLessThanOrEqual(74);
    expect(layout.stepPx).toBeGreaterThanOrEqual(1);
  });
});
