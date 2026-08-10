export interface FanLayoutInput {
  cardWidth: number;
  cardCount: number;
  maxFanWidth: number;
  /** Минимум видимой полоски соседней карты (ранг/масть) */
  minPeekPx?: number;
  /** Максимум «разлёта» при малом числе карт */
  maxPeekPx?: number;
}

export interface FanLayoutResult {
  /** Горизонтальный шаг между картами (видимая часть) */
  stepPx: number;
  /** margin-left для карты с index > 0 */
  marginLeftPx: number;
  totalWidthPx: number;
  /** true, когда пришлось сжать видимую полоску, чтобы строго остаться в лимите */
  compressed: boolean;
}

/**
 * Профессиональный веер:
 * - никогда не выходит за maxFanWidth;
 * - последняя (верхняя) карта остаётся видна полностью;
 * - при большом числе карт нижние сжимаются до аккуратных полосок.
 */
export function computeCardFanLayout(input: FanLayoutInput): FanLayoutResult {
  const { cardWidth, cardCount, maxFanWidth } = input;
  const minPeek = input.minPeekPx ?? Math.max(14, Math.round(cardWidth * 0.28));
  const maxPeek = input.maxPeekPx ?? Math.round(cardWidth * 0.52);

  if (cardCount <= 1) {
    return { stepPx: cardWidth, marginLeftPx: 0, totalWidthPx: cardWidth, compressed: false };
  }

  const safeMaxWidth = Math.max(cardWidth, maxFanWidth);
  const fitPeek = Math.max(1, (safeMaxWidth - cardWidth) / (cardCount - 1));
  const stepPx = Math.max(1, Math.min(maxPeek, fitPeek));
  const roundedStep = Math.max(1, Math.floor(stepPx * 100) / 100);
  const marginLeftPx = Math.max(0, cardWidth - roundedStep);
  const totalWidthPx = Math.min(
    safeMaxWidth,
    Math.round((cardWidth + (cardCount - 1) * roundedStep) * 100) / 100
  );

  return {
    stepPx: roundedStep,
    marginLeftPx,
    totalWidthPx,
    compressed: fitPeek < minPeek,
  };
}

/** Сколько рубашек показывать у соперника (остальное — бейдж с числом) */
export function getOpponentStackDisplayCount(totalCards: number, gameStage: number): number {
  if (gameStage >= 2) return Math.min(totalCards, 5);
  return totalCards;
}

export function playingCardHeight(width: number): number {
  return Math.round(width * 1.46);
}
