// ИИ для игры в P.I.D.R.

import type { Card, Player } from '../../types/game';
import { getAiThinkDelayMs } from '@/lib/game/botTiming';

export type AIDifficulty = 'easy' | 'medium' | 'hard';

interface AIDecision {
  action: 'play_card' | 'draw_card' | 'place_on_target' | 'place_on_self' | 'pass';
  targetPlayerId?: number;
  cardToPlay?: Card;
  confidence: number; // 0-1, насколько ИИ уверен в решении
}

export class AIPlayer {
  private difficulty: AIDifficulty;
  private playerId: number;
  
  constructor(playerId: number, difficulty: AIDifficulty = 'medium') {
    this.playerId = playerId;
    this.difficulty = difficulty;
  }
  
  // Главный метод принятия решения
  makeDecision(
    gameState: {
      players: Player[];
      currentPlayer: number;
      gameStage: 1 | 2 | 3;
      deck: Card[];
      availableTargets: number[];
      revealedDeckCard: Card | null;
      tableStack?: Card[];
      trumpSuit?: string | null;
    }
  ): AIDecision {
    const { gameStage } = gameState;
    
    let decision: AIDecision;
    switch (gameStage) {
      case 1:
        decision = this.makeStage1Decision(gameState);
        break;
      case 2:
        decision = this.makeStage2Decision(gameState);
        break;
      case 3:
        decision = this.makeStage3Decision(gameState);
        break;
      default:
        decision = { action: 'pass', confidence: 0 };
    }
    
    return decision;
  }
  
  // Решения для 1-й стадии (раскладывание карт)
  private makeStage1Decision(gameState: any): AIDecision {
    const { players, availableTargets, revealedDeckCard } = gameState;
    const currentPlayer = players.find((p: Player) => {
      const pId = typeof p.id === 'string' ? parseInt(p.id.replace('player_', '')) : p.id;
      return pId === this.playerId;
    });
    
    if (!currentPlayer) {
      console.error(`🔴 [AI Stage1] Не найден игрок с ID ${this.playerId}`);
      return { action: 'draw_card', confidence: 0.6 };
    }
    
    // Если есть открытая карта из колоды
    if (revealedDeckCard) {
      const cardRank = this.getCardRank(revealedDeckCard);
      
      // Логика в зависимости от сложности
      switch (this.difficulty) {
        case 'easy':
          // Простой ИИ - случайный выбор
          if (availableTargets.length > 0) {
            const randomTarget = availableTargets[Math.floor(Math.random() * availableTargets.length)];
            return {
              action: 'place_on_target',
              targetPlayerId: randomTarget,
              confidence: 0.5
            };
          }
          break;
          
        case 'medium':
          // Средний ИИ - старается положить плохие карты противникам
          if (cardRank <= 6 && availableTargets.length > 0) {
            // Кладем слабые карты противникам
            const enemyTargets = availableTargets.filter((id: number) => id !== this.playerId);
            if (enemyTargets.length > 0) {
              const target = enemyTargets[Math.floor(Math.random() * enemyTargets.length)];
              return {
                action: 'place_on_target',
                targetPlayerId: target,
                confidence: 0.7
              };
            }
          } else if (cardRank >= 10) {
            // Хорошие карты себе
            if (this.canPlaceOnSelf(currentPlayer, revealedDeckCard)) {
              return {
                action: 'place_on_self',
                confidence: 0.8
              };
            }
          }
          break;
          
        case 'hard':
          // Сложный ИИ - продвинутая стратегия
          const decision = this.analyzeStage1Situation(gameState);
          if (decision) return decision;
          break;
      }
    }
    
    // По умолчанию берем карту из колоды
    return {
      action: 'draw_card',
      confidence: 0.6
    };
  }
  
  // Решения для 2-й стадии (P.I.D.R. правила)
  private makeStage2Decision(gameState: any): AIDecision {
    const { players, tableStack, trumpSuit } = gameState;
    const currentPlayer = players.find((p: Player) => {
      const pId = typeof p.id === 'string' ? parseInt(p.id.replace('player_', '')) : p.id;
      return pId === this.playerId;
    });
    
    if (!currentPlayer) {
      console.error(`🔴 [AI Stage2 P.I.D.R.] Не найден игрок с ID ${this.playerId}`);
      return { action: 'pass', confidence: 0 };
    }
    
    if (!currentPlayer.cards) {
      console.error(`🔴 [AI Stage2 P.I.D.R.] У игрока ${this.playerId} нет карт`);
      return { action: 'pass', confidence: 0 };
    }
    
    // ВО 2-Й СТАДИИ AI видит ВСЕ свои карты (даже если open=false для отображения)!
    const handCards = currentPlayer.cards; // ВСЕ карты, не фильтруем по open!
    
    const playerName = currentPlayer.name || `Игрок ${this.playerId}`;
    console.log(`🤖 [${playerName}] Анализ ситуации:`, {
      tableStack: tableStack?.length || 0,
      handCards: handCards.length,
      cards: handCards.map((c: any) => c.image),
      trumpSuit
    });
    
    // Проверяем есть ли карты для игры
    if (handCards.length === 0) {
      console.log(`🤖 [AI Stage2 P.I.D.R.] ❌ Нет карт для игры`);
      return { action: 'draw_card', confidence: 0.9 }; // Берем нижнюю карту
    }
    
    if (!tableStack || tableStack.length === 0) {
      // ПРАВИЛА P.I.D.R.: Начинаем раунд - кладем самую слабую карту
      const weakestCard = this.findWeakestNonTrumpCard(handCards, trumpSuit) || this.findWeakestCard(handCards, trumpSuit);
      if (weakestCard) {
        console.log(`🃏 [${playerName}] ходит ${weakestCard.image} (начало раунда)`);
        return {
          action: 'play_card',
          cardToPlay: weakestCard,
          confidence: 0.8
        };
      }
    } else {
      // ПРАВИЛА P.I.D.R.: На столе есть карты - пытаемся побить ВЕРХНЮЮ карту
      const topCard = tableStack[tableStack.length - 1];
      const defenseCard = this.findBestDefenseCard(handCards, topCard, trumpSuit);
      
      if (defenseCard) {
        console.log(`🛡️ [${playerName}] бьет ${topCard?.image} картой ${defenseCard.image}`);
        return {
          action: 'play_card',
          cardToPlay: defenseCard,
          confidence: 0.8
        };
      } else {
        // ПРАВИЛА P.I.D.R.: Не можем побить - берем НИЖНЮЮ карту со стола
        console.log(`⬇️ [${playerName}] берет карту (не может побить ${topCard?.image})`);
        return {
          action: 'draw_card', // В P.I.D.R. = takeTableCards (берет нижнюю)
          confidence: 0.9
        };
      }
    }
    
    console.log(`🤖 [AI Stage2 P.I.D.R.] ⚠️ Нет доступных ходов - берем нижнюю карту`);
    return { action: 'draw_card', confidence: 0.6 };
  }
  
  // Решения для 3-й стадии (пеньки) - используют правила 2-й стадии (P.I.D.R.)
  private makeStage3Decision(gameState: any): AIDecision {
    console.log(`🤖 [AI Stage3] 3-я стадия использует правила 2-й стадии (P.I.D.R.)`);
    
    // ИСПРАВЛЕНО: 3-я стадия использует правила 2-й стадии P.I.D.R.!
    return this.makeStage2Decision(gameState);
  }
  
  // Вспомогательные методы
  private getCardRank(card: Card): number {
    if (!card.image) return 0;
    
    const imageName = card.image.split('/').pop()?.toLowerCase() || '';
    
    if (imageName.includes('2_')) return 2;
    if (imageName.includes('3_')) return 3;
    if (imageName.includes('4_')) return 4;
    if (imageName.includes('5_')) return 5;
    if (imageName.includes('6_')) return 6;
    if (imageName.includes('7_')) return 7;
    if (imageName.includes('8_')) return 8;
    if (imageName.includes('9_')) return 9;
    if (imageName.includes('10_')) return 10;
    if (imageName.includes('jack_')) return 11;
    if (imageName.includes('queen_')) return 12;
    if (imageName.includes('king_')) return 13;
    if (imageName.includes('ace_')) return 14;
    
    return 0;
  }
  
  private canPlaceOnSelf(player: Player, card: Card): boolean {
    const topCard = player.cards[player.cards.length - 1];
    if (!topCard) return true;
    
    const cardRank = this.getCardRank(card);
    const topRank = this.getCardRank(topCard);
    
    return cardRank > topRank;
  }
  
  private analyzeStage1Situation(gameState: any): AIDecision | null {
    const { players, availableTargets, revealedDeckCard } = gameState;
    
    // Анализируем игровую ситуацию
    const threats = this.identifyThreats(players);
    const opportunities = this.identifyOpportunities(players);
    
    // Принимаем решение на основе анализа
    if (threats.length > 0 && revealedDeckCard) {
      const cardRank = this.getCardRank(revealedDeckCard);
      
      // Если карта слабая, кладем самому сильному противнику
      if (cardRank <= 6) {
        const strongestThreat = threats[0];
        if (availableTargets.includes(strongestThreat)) {
          return {
            action: 'place_on_target',
            targetPlayerId: strongestThreat,
            confidence: 0.9
          };
        }
      }
    }
    
    return null;
  }
  

  
  private identifyCriticalThreats(players: Player[]): number[] {
    // Игроки с минимальным количеством карт (близкие к победе)
    return players
      .filter(p => {
        const pId = typeof p.id === 'string' ? parseInt(p.id.replace('player_', '')) : p.id;
        return pId !== this.playerId;
      })
      .filter(p => {
        const totalCards = p.cards.length + (p.penki?.length || 0);
        return totalCards <= 2; // Критическая угроза - 2 или меньше карт
      })
      .sort((a, b) => {
        const aCards = a.cards.length + (a.penki?.length || 0);
        const bCards = b.cards.length + (b.penki?.length || 0);
        return aCards - bCards; // Сортируем по возрастанию количества карт
      })
      .map(p => {
        const pId = typeof p.id === 'string' ? parseInt(p.id.replace('player_', '')) : p.id;
        return pId;
      });
  }
  
  private identifyThreats(players: Player[]): number[] {
    // Определяем игроков, которые представляют угрозу
    return players
      .filter(p => {
        const pId = typeof p.id === 'string' ? parseInt(p.id.replace('player_', '')) : p.id;
        return pId !== this.playerId;
      })
      .sort((a, b) => {
        // Сортируем по количеству хороших карт
        const aScore = this.evaluatePlayerPosition(a);
        const bScore = this.evaluatePlayerPosition(b);
        return bScore - aScore;
      })
      .map(p => {
        const pId = typeof p.id === 'string' ? parseInt(p.id.replace('player_', '')) : p.id;
        return pId;
      });
  }
  
  private identifyOpportunities(players: Player[]): number[] {
    // Определяем слабых игроков
    return players
      .filter(p => {
        const pId = typeof p.id === 'string' ? parseInt(p.id.replace('player_', '')) : p.id;
        return pId !== this.playerId;
      })
      .filter(p => p.cards.length < 3) // Мало карт
      .map(p => {
        const pId = typeof p.id === 'string' ? parseInt(p.id.replace('player_', '')) : p.id;
        return pId;
      });
  }
  
  private evaluatePlayerPosition(player: Player): number {
    let score = 0;
    for (const card of player.cards) {
      if (card.open) {
        score += this.getCardRank(card);
      }
    }
    return score;
  }
  
  private findWeakestNonTrumpCard(cards: Card[], trumpSuit: string | null): Card | null {
    // Ищем самую слабую некозырную карту для атаки
    const nonTrumpCards = cards.filter(c => !this.isTrump(c, trumpSuit));
    if (nonTrumpCards.length === 0) return null;
    
    return nonTrumpCards.reduce((weakest, card) => {
      return this.getCardRank(card) < this.getCardRank(weakest) ? card : weakest;
    });
  }
  
  private findWeakestCard(cards: Card[], trumpSuit: string | null): Card | null {
    const nonTrumpCards = cards.filter(c => !this.isTrump(c, trumpSuit));
    
    if (nonTrumpCards.length > 0) {
      return nonTrumpCards.reduce((weakest, card) => {
        return this.getCardRank(card) < this.getCardRank(weakest) ? card : weakest;
      });
    }
    
    // Если только козыри, выбираем самый слабый
    if (cards.length > 0) {
      return cards.reduce((weakest, card) => {
        return this.getCardRank(card) < this.getCardRank(weakest) ? card : weakest;
      });
    }
    
    return null;
  }
  
  private findBestDefenseCard(
    handCards: Card[], 
    attackCard: Card, 
    trumpSuit: string | null
  ): Card | null {
    const attackRank = this.getCardRank(attackCard);
    const attackSuit = this.getCardSuit(attackCard);
    
    // Подходящие карты для защиты
    const validDefenseCards: Card[] = [];
    
    handCards.forEach(card => {
      const cardRank = this.getCardRank(card);
      const cardSuit = this.getCardSuit(card);
      
      // Проверяем правила битья (как в gameStore.canBeatCard)
      let canBeat = false;
      
      // 1. ОСОБОЕ ПРАВИЛО: "Пики только Пикями!"
      if (attackSuit === 'spades' && cardSuit !== 'spades') {
        canBeat = false;
      }
      // 2. Бить той же мастью старшей картой
      else if (attackSuit === cardSuit && cardRank > attackRank) {
        canBeat = true;
      }
      // 3. Бить козырем некозырную карту (НО НЕ ПИКУ!)
      else if (trumpSuit && cardSuit === trumpSuit && attackSuit !== trumpSuit && attackSuit !== 'spades') {
        canBeat = true;
      }
      
      if (canBeat) {
        validDefenseCards.push(card);
      }
    });
    
    if (validDefenseCards.length === 0) {
      return null;
    }
    
    // Выбираем стратегию в зависимости от сложности AI
    let bestCard: Card;
    
    switch (this.difficulty) {
      case 'easy':
        // Простой AI - случайная подходящая карта
        bestCard = validDefenseCards[Math.floor(Math.random() * validDefenseCards.length)];
        break;
        
      case 'medium':
        // Средний AI - минимальная подходящая карта
        bestCard = validDefenseCards.reduce((min, card) => {
          return this.getCardRank(card) < this.getCardRank(min) ? card : min;
        });
        break;
        
      case 'hard':
        // Сложный AI - продвинутая стратегия (пока тоже минимальная)
        bestCard = validDefenseCards.reduce((min, card) => {
          return this.getCardRank(card) < this.getCardRank(min) ? card : min;
        });
        break;
        
      default:
        bestCard = validDefenseCards[0];
    }
    
    return bestCard;
  }
  
  private getCardSuit(card: Card): string {
    const imageName = card.image?.split('/').pop()?.toLowerCase() || '';
    
    if (imageName.includes('clubs')) return 'clubs';
    if (imageName.includes('diamonds')) return 'diamonds';
    if (imageName.includes('hearts')) return 'hearts';
    if (imageName.includes('spades')) return 'spades';
    
    return 'unknown';
  }
  
  private isTrump(card: Card, trumpSuit: string | null): boolean {
    if (!trumpSuit) return false;
    return this.getCardSuit(card) === trumpSuit;
  }
  
  // Задержка для имитации размышления
  async makeDecisionWithDelay(gameState: any): Promise<AIDecision> {
    const delay = getAiThinkDelayMs(this.difficulty);

    return new Promise(resolve => {
      setTimeout(() => {
        resolve(this.makeDecision(gameState));
      }, delay);
    });
  }
}
