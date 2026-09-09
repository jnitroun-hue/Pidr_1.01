// 🏆 СИСТЕМА РЕЙТИНГА P.I.D.R.
// Расчет опыта и монет в зависимости от места и количества игроков

import { PREMIUM_RATING_MULTIPLIER } from '@/lib/premium/constants';

export interface RatingReward {
  experience: number; // +/- опыт
  coins: number; // монеты (0 для проигравших)
  position: number; // место (1-9)
  isWinner: boolean; // в топе или нет
  ratingChange: number; // изменение рейтинга
}

// Базовая таблица наград для 9 игроков
const BASE_REWARDS_9_PLAYERS = {
  1: { experience: 25, coins: 50, isWinner: true },
  2: { experience: 15, coins: 40, isWinner: true },
  3: { experience: 10, coins: 25, isWinner: true },
  4: { experience: 5, coins: 15, isWinner: true },
  5: { experience: -5, coins: 0, isWinner: false },
  6: { experience: -10, coins: 0, isWinner: false },
  7: { experience: -15, coins: 0, isWinner: false },
  8: { experience: -20, coins: 0, isWinner: false },
  9: { experience: -30, coins: 0, isWinner: false }
};

export function applyPremiumRatingMultiplier(change: number, isPremium: boolean): number {
  if (!isPremium || !Number.isFinite(change) || change <= 0) return change;
  return change * PREMIUM_RATING_MULTIPLIER;
}

/**
 * Рассчитывает награды для игрока в зависимости от его места и общего количества игроков
 * @param position - место игрока (1 = лучший)
 * @param totalPlayers - общее количество игроков (4-9)
 * @param isRanked - рейтинговая игра или нет
 */
export function calculateRatingRewards(
  position: number,
  totalPlayers: number,
  isRanked: boolean = true
): RatingReward {
  
  // Для нерейтинговых игр награды не даются
  if (!isRanked) {
    return {
      experience: 0,
      coins: 0,
      position,
      isWinner: position <= Math.ceil(totalPlayers / 2),
      ratingChange: 0
    };
  }

  // Адаптируем награды под количество игроков
  const rewards = adaptRewardsForPlayerCount(totalPlayers);
  const reward = rewards[position as keyof typeof rewards] || { experience: -30, coins: 0, isWinner: false };

  return {
    experience: reward.experience,
    coins: reward.coins,
    position,
    isWinner: reward.isWinner,
    ratingChange: reward.experience // Рейтинг меняется так же как опыт
  };
}

/**
 * Адаптирует систему наград под разное количество игроков
 */
function adaptRewardsForPlayerCount(totalPlayers: number) {
  switch (totalPlayers) {
    case 4:
      // 4 игрока: 2 победителя, 2 проигравших
      return {
        1: { experience: 20, coins: 40, isWinner: true },
        2: { experience: 10, coins: 25, isWinner: true },
        3: { experience: -10, coins: 0, isWinner: false },
        4: { experience: -20, coins: 0, isWinner: false }
      };
      
    case 5:
      // 5 игроков: 2 победителя, 3 проигравших
      return {
        1: { experience: 22, coins: 45, isWinner: true },
        2: { experience: 12, coins: 30, isWinner: true },
        3: { experience: -5, coins: 0, isWinner: false },
        4: { experience: -15, coins: 0, isWinner: false },
        5: { experience: -25, coins: 0, isWinner: false }
      };
      
    case 6:
      // 6 игроков: 3 победителя, 3 проигравших
      return {
        1: { experience: 23, coins: 47, isWinner: true },
        2: { experience: 13, coins: 35, isWinner: true },
        3: { experience: 8, coins: 20, isWinner: true },
        4: { experience: -8, coins: 0, isWinner: false },
        5: { experience: -18, coins: 0, isWinner: false },
        6: { experience: -28, coins: 0, isWinner: false }
      };
      
    case 7:
      // 7 игроков: 3 победителя, 4 проигравших
      return {
        1: { experience: 24, coins: 48, isWinner: true },
        2: { experience: 14, coins: 37, isWinner: true },
        3: { experience: 9, coins: 22, isWinner: true },
        4: { experience: -3, coins: 0, isWinner: false },
        5: { experience: -12, coins: 0, isWinner: false },
        6: { experience: -22, coins: 0, isWinner: false },
        7: { experience: -32, coins: 0, isWinner: false }
      };
      
    case 8:
      // 8 игроков: 4 победителя, 4 проигравших
      return {
        1: { experience: 25, coins: 49, isWinner: true },
        2: { experience: 15, coins: 38, isWinner: true },
        3: { experience: 10, coins: 24, isWinner: true },
        4: { experience: 3, coins: 12, isWinner: true },
        5: { experience: -7, coins: 0, isWinner: false },
        6: { experience: -17, coins: 0, isWinner: false },
        7: { experience: -27, coins: 0, isWinner: false },
        8: { experience: -37, coins: 0, isWinner: false }
      };
      
    case 9:
    default:
      // 9 игроков: 4 победителя, 5 проигравших (базовая система)
      return BASE_REWARDS_9_PLAYERS;
  }
}

/**
 * Определяет места игроков по времени выбывания
 * @param players - массив игроков
 * @param eliminationOrder - порядок выбывания (первый выбывший = последнее место)
 */
export function calculatePlayerPositions(
  players: any[], 
  eliminationOrder: string[]
): { [playerId: string]: number } {
  const positions: { [playerId: string]: number } = {};
  
  // Последний выбывший = последнее место
  eliminationOrder.forEach((playerId, index) => {
    positions[playerId] = players.length - index;
  });
  
  // Оставшиеся игроки (победители) получают места с 1-го
  const remainingPlayers = players.filter(p => !eliminationOrder.includes(p.id));
  remainingPlayers.forEach((player, index) => {
    positions[player.id] = index + 1;
  });
  
  return positions;
}

/**
 * Получает текстовое описание места
 */
export function getPositionText(position: number): string {
  switch (position) {
    case 1: return '🥇 1-е место';
    case 2: return '🥈 2-е место';
    case 3: return '🥉 3-е место';
    default: return `${position}-е место`;
  }
}

/**
 * Получает цвет для позиции
 */
export function getPositionColor(position: number): string {
  switch (position) {
    case 1: return '#ffd700'; // Золото
    case 2: return '#c0c0c0'; // Серебро
    case 3: return '#cd7f32'; // Бронза
    default: return position <= 4 ? '#22c55e' : '#ef4444'; // Зеленый или красный
  }
}

/**
 * Проверяет является ли позиция победной
 */
export function isWinningPosition(position: number, totalPlayers: number): boolean {
  const winnersCount = Math.ceil(totalPlayers / 2);
  return position <= winnersCount;
}
