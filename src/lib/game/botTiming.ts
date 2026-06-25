/** Единые задержки ботов — карты видны, ходы не мгновенные */
export const BOT_TIMING = {
  aiEntryDelayStage23: 700,
  aiEntryDelayStage1: 900,
  aiPlayAfterSelect: 750,
  aiErrorRecovery: 800,

  storeFirstTurn: 800,
  storeNextTurn: 600,
  storePlayToNextTurn: 550,
  storeRoundClosedContinue: 750,
  storeStage1HandMove: 750,
  storeStage1NoTarget: 900,
  storeStage1DeckClick: 550,
  storePlaceOnSelf: 900,
  storeTakeNotByRulesBot: 900,
  storeDeckToOpponent: 950,
  storeEmptyHandPass: 450,
} as const;

export const AI_THINK_DELAYS = {
  easy: { min: 450, range: 550 },
  medium: { min: 750, range: 850 },
  hard: { min: 1100, range: 900 },
} as const;

export function getAiThinkDelayMs(difficulty: 'easy' | 'medium' | 'hard'): number {
  const cfg = AI_THINK_DELAYS[difficulty] ?? AI_THINK_DELAYS.medium;
  return cfg.min + Math.random() * cfg.range;
}
