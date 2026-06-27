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
}

/** Профессиональный веер: все карты влезают в maxFanWidth, ранг всегда читаем */
export function computeCardFanLayout(input: FanLayoutInput): FanLayoutResult {
  const { cardWidth, cardCount, maxFanWidth } = input;
  const minPeek = input.minPeekPx ?? Math.max(14, Math.round(cardWidth * 0.28));
  const maxPeek = input.maxPeekPx ?? Math.round(cardWidth * 0.52);

  if (cardCount <= 1) {
    return { stepPx: cardWidth, marginLeftPx: 0, totalWidthPx: cardWidth };
  }

  const fitPeek = (maxFanWidth - cardWidth) / (cardCount - 1);
  const stepPx = Math.max(minPeek, Math.min(maxPeek, fitPeek));
  const marginLeftPx = Math.max(0, Math.round(cardWidth - stepPx));
  const totalWidthPx = Math.round(cardWidth + (cardCount - 1) * stepPx);

  return { stepPx, marginLeftPx, totalWidthPx };
}

/** Сколько рубашек показывать у соперника (остальное — бейдж с числом) */
export function getOpponentStackDisplayCount(totalCards: number, gameStage: number): number {
  if (gameStage >= 2) return Math.min(totalCards, 5);
  return totalCards;
}

export function playingCardHeight(width: number): number {
  return Math.round(width * 1.46);
}
