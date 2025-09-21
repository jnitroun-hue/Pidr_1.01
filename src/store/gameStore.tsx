import React from 'react'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { createPlayers, generateAvatar } from '../lib/game/avatars'

export interface Card {
  id: string
  type: 'normal' | 'special' | 'pidr'
  title: string
  description: string
  image?: string
  rarity: 'common' | 'rare' | 'epic' | 'legendary'
  effect?: string
  rank?: number // Ранг карты (2-14)
  suit?: string // Масть карты
  open?: boolean // Открыта ли карта
}

export interface Player {
  id: string
  name: string
  avatar?: string
  score: number
  cards: Card[] // Открытые карты (доступные для игры)
  penki: Card[] // Пеньки (2 закрытые карты, доступны в 3-й стадии)
  playerStage: 1 | 2 | 3 // Индивидуальная стадия игрока
  isCurrentPlayer: boolean
  isUser?: boolean // Является ли игрок пользователем
  isBot?: boolean // Является ли игрок ботом
  difficulty?: 'easy' | 'medium' | 'hard' // Сложность бота
}

export interface GameStats {
  gamesPlayed: number
  gamesWon: number
  totalScore: number
  bestScore: number
  cardsCollected: number
  achievements: string[]
}

export interface GameSettings {
  soundEnabled: boolean
  animationsEnabled: boolean
  hapticEnabled: boolean
  autoPlay: boolean
  difficulty: 'easy' | 'medium' | 'hard'
}

interface GameState {
  // Игровое состояние
  isGameActive: boolean
  gameMode: 'single' | 'multiplayer'
  currentRound: number
  maxRounds: number
  players: Player[]
  currentPlayerId: string | null
  deck: Card[]
  playedCards: Card[]
  lastPlayedCard: Card | null
  
  // Состояние для стадий игры P.I.D.R
  gameStage: 1 | 2 | 3
  availableTargets: number[] // Индексы игроков, на которых можно положить карту
  mustDrawFromDeck: boolean // Должен ли игрок взять карту из колоды
  canPlaceOnSelf: boolean // Может ли игрок положить карту себе
  
  // Состояния хода для новой логики
  turnPhase: 'analyzing_hand' | 'showing_deck_hint' | 'deck_card_revealed' | 'waiting_deck_action' | 'showing_card_actions' | 'waiting_target_selection' | 'turn_ended'
  revealedDeckCard: Card | null // Открытая карта из колоды (слева от колоды)
  canPlaceOnSelfByRules: boolean // Может ли положить карту из колоды на себя по правилам
  skipHandAnalysis: boolean // Пропуск анализа руки после укладки на себя
  
  // Для второй стадии
  lastDrawnCard: Card | null // Последняя взятая карта из колоды
  lastPlayerToDrawCard: string | null // ID игрока, который последним взял карту
  trumpSuit: 'clubs' | 'diamonds' | 'hearts' | 'spades' | null // Козырь второй стадии
  drawnHistory: Card[] // История добранных/положенных из колоды карт (для определения козыря)
  
  // Система "Одна карта!" и штрафов
  oneCardDeclarations: {[playerId: string]: boolean} // Кто объявил "одна карта"
  oneCardTimers: {[playerId: string]: number} // Таймеры для объявления (timestamp)
  playersWithOneCard: string[] // Игроки у которых 1 карта (для проверки штрафов)
  pendingPenalty: {targetPlayerId: string, contributorsNeeded: string[]} | null // Ожидающий штраф
  
  // Состояние 2-й стадии (дурак)
  tableStack: Card[] // Стопка карт на столе (нижняя = первая, верхняя = последняя)
  selectedHandCard: Card | null // Выбранная карта в руке (для двойного клика)
  stage2TurnPhase: 'selecting_card' | 'playing_card' | 'waiting_beat' | 'round_complete' // Фазы хода 2-й стадии
  
  // Мультиплеер состояние
  multiplayerData: {
    roomId: string
    roomCode: string
    isHost: boolean
    connectedPlayers: string[]
  } | null
  roundInProgress: boolean // Идет ли текущий раунд битья
  currentRoundInitiator: string | null // Кто начал текущий раунд
  roundFinisher: string | null // Игрок который должен завершить круг (позиция -1 от инициатора)
  finisherPassed: boolean // Финишер уже сходил и не побил (начался овертайм)
  lastCardTaker: string | null // Последний игрок который взял карту со стола
  
  // Статистика и настройки
  stats: GameStats
  settings: GameSettings
  
  // Игровая валюта
  gameCoins: number
  
  // UI состояние
  selectedCard: Card | null
  showCardDetails: boolean
  isLoading: boolean
  notification: {
    message: string
    type: 'success' | 'error' | 'warning' | 'info'
    visible: boolean
  } | null
  
  // Действия игры
  startGame: (mode: 'single' | 'multiplayer', playersCount?: number, multiplayerConfig?: any) => void
  endGame: () => void
  playCard: (cardId: string) => void
  drawCard: () => void
  nextTurn: () => void
  resetGame: () => void
  
  // Методы для P.I.D.R игры
  getCardRank: (imageName: string) => number
  findAvailableTargets: (currentPlayerId: string) => number[]
  canMakeMove: (currentPlayerId: string) => boolean
  makeMove: (targetPlayerId: string) => void
  drawCardFromDeck: () => boolean // возвращает true если карта взята
  placeCardOnSelf: () => void
  checkStage1End: () => void
  processPlayerTurn: (playerId: string) => void
  determineTrumpSuit: () => 'clubs' | 'diamonds' | 'hearts' | 'spades' | null
  getCardSuit: (imageName: string) => 'clubs' | 'diamonds' | 'hearts' | 'spades' | 'unknown'
  
  // Новые методы для алгоритма хода
  revealDeckCard: () => boolean
  canPlaceCardOnSelf: (deckCard: Card, playerTopCard: Card) => boolean  
  placeCardOnSelfByRules: () => void
  takeCardNotByRules: () => void // Положить карту поверх своих карт (если нет ходов)
  resetTurnState: () => void
  onDeckClick: () => void
  findAvailableTargetsForDeckCard: (deckCard: Card) => number[]
  
  // Методы для 2-й стадии (P.I.D.R. правила)
  selectHandCard: (card: Card) => void
  playSelectedCard: () => void
  canBeatCard: (attackCard: Card, defendCard: Card, trumpSuit: string) => boolean
  takeTableCards: () => void
  initializeStage2: () => void
  calculateRoundFinisher: (initiatorId: string) => string | null
  
  // Методы для 3-й стадии
  checkStage3Transition: (playerId: string) => void
  activatePenki: (playerId: string) => void
  checkVictoryCondition: () => void
  
  // Методы для системы "Одна карта!" и штрафов
  checkOneCardStatus: () => void // Проверяет кому нужно объявлять "одна карта"
  declareOneCard: (playerId: string) => void // Игрок объявляет "одна карта"
  askHowManyCards: (askerPlayerId: string, targetPlayerId: string) => void // Спросить сколько карт
  startPenaltyProcess: (forgetfulPlayerId: string) => void // Начать процесс штрафа
  contributePenaltyCard: (contributorId: string, cardId: string) => void // Отдать карту за штраф
  cancelPenalty: () => void // Отменить штраф
  findWorstCardInHand: (cards: Card[], trumpSuit: string | null) => Card | null // Найти плохую карту
  // Новые методы для ботов
  calculateAdaptiveDelay: () => number // Вычисляет адаптивную задержку в зависимости от FPS
  scheduleBotAskHowManyCards: (targetPlayerId: string) => void // Планирует вопрос бота "сколько карт?"
  
  // Управление картами
  selectCard: (card: Card | null) => void
  addCardToDeck: (card: Card) => void
  removeCardFromDeck: (cardId: string) => void
  
  // Мультиплеер методы
  syncGameState: (gameState: any) => void
  sendPlayerMove: (moveData: any) => void
  applyRemoteMove: (moveData: any) => void
  
  // Игроки
  addPlayer: (name: string) => void
  removePlayer: (playerId: string) => void
  updatePlayerScore: (playerId: string, score: number) => void
  
  // Настройки
  updateSettings: (settings: Partial<GameSettings>) => void
  
  // Статистика
  updateStats: (stats: Partial<GameStats>) => void
  addAchievement: (achievementId: string) => void
  
  // Игровая валюта
  addCoins: (amount: number) => void
  spendCoins: (amount: number) => boolean
  
  // UI
  showNotification: (message: string, type: 'success' | 'error' | 'warning' | 'info', duration?: number) => void
  hideNotification: () => void
  setLoading: (loading: boolean) => void
}

// Базовые карты для игры P.I.D.R.
const DEFAULT_CARDS: Card[] = [
  {
    id: '1',
    type: 'normal',
    title: 'Обычная карта',
    description: 'Простая карта без особых эффектов',
    rarity: 'common'
  },
  {
    id: '2',
    type: 'special',
    title: 'Специальная карта',
    description: 'Карта с особым эффектом',
    rarity: 'rare',
    effect: 'draw_extra'
  },
  {
    id: '3',
    type: 'pidr',
    title: 'P.I.D.R.',
    description: 'Легендарная карта P.I.D.R.!',
    rarity: 'legendary',
    effect: 'pidr_power'
  }
]

// Создание Zustand стора с персистентностью
export const useGameStore = create<GameState>()(
  persist(
    (set, get) => ({
      // Начальное состояние
      isGameActive: false,
      gameMode: 'single',
      currentRound: 0,
      maxRounds: 10,
      players: [],
      currentPlayerId: null,
      deck: [...DEFAULT_CARDS],
      playedCards: [],
      lastPlayedCard: null,
      
      // Состояние для стадий игры P.I.D.R
      gameStage: 1,
      availableTargets: [],
      mustDrawFromDeck: false,
      canPlaceOnSelf: false,
      
      // Для второй стадии
      lastDrawnCard: null,
      lastPlayerToDrawCard: null,
      trumpSuit: null,
      drawnHistory: [],
      
      // Система "Одна карта!" и штрафов
      oneCardDeclarations: {},
      oneCardTimers: {},
      playersWithOneCard: [],
      pendingPenalty: null,
      
      // Состояние 2-й стадии (дурак)
      tableStack: [],
      selectedHandCard: null,
      stage2TurnPhase: 'selecting_card',
      roundInProgress: false,
      currentRoundInitiator: null,
      roundFinisher: null,
      finisherPassed: false,
      lastCardTaker: null,
      
      // Мультиплеер состояние
      multiplayerData: null,
      
      // Состояния хода для новой логики
      turnPhase: 'analyzing_hand',
      revealedDeckCard: null,
      canPlaceOnSelfByRules: false,
      skipHandAnalysis: false,
      
      stats: {
        gamesPlayed: 0,
        gamesWon: 0,
        totalScore: 0,
        bestScore: 0,
        cardsCollected: 0,
        achievements: []
      },
      
      settings: {
        soundEnabled: true,
        animationsEnabled: true,
        hapticEnabled: true,
        autoPlay: false,
        difficulty: 'medium'
      },
      
      // Игровая валюта (0 монет - будут зарабатываться в игре)
      gameCoins: 0,
      
      selectedCard: null,
      showCardDetails: false,
      isLoading: false,
      notification: null,
      
      // Игровые действия
      startGame: (mode, playersCount = 2, multiplayerConfig = null) => {
        console.log('🎮 [GameStore] startGame вызван с параметрами:', { mode, playersCount, multiplayerConfig });
        
        try {
          // Создаем полную стандартную колоду карт (52 карты)
          console.log('🎮 [GameStore] Создаем колоду...');
        const standardDeck = [
          // Двойки (2)
          '2_of_clubs.png','2_of_diamonds.png','2_of_hearts.png','2_of_spades.png',
          // Тройки (3) 
          '3_of_clubs.png','3_of_diamonds.png','3_of_hearts.png','3_of_spades.png',
          // Четверки (4)
          '4_of_clubs.png','4_of_diamonds.png','4_of_hearts.png','4_of_spades.png',
          // Пятерки (5)
          '5_of_clubs.png','5_of_diamonds.png','5_of_hearts.png','5_of_spades.png',
          // Шестерки (6)
          '6_of_clubs.png','6_of_diamonds.png','6_of_hearts.png','6_of_spades.png',
          // Семерки (7)
          '7_of_clubs.png','7_of_diamonds.png','7_of_hearts.png','7_of_spades.png',
          // Восьмерки (8)
          '8_of_clubs.png','8_of_diamonds.png','8_of_hearts.png','8_of_spades.png',
          // Девятки (9)
          '9_of_clubs.png','9_of_diamonds.png','9_of_hearts.png','9_of_spades.png',
          // Десятки (10)
          '10_of_clubs.png','10_of_diamonds.png','10_of_hearts.png','10_of_spades.png',
          // Валеты (11)
          'jack_of_clubs.png','jack_of_diamonds.png','jack_of_hearts.png','jack_of_spades.png',
          // Дамы (12)
          'queen_of_clubs.png','queen_of_diamonds.png','queen_of_hearts.png','queen_of_spades.png',
          // Короли (13)
          'king_of_clubs.png','king_of_diamonds.png','king_of_hearts.png','king_of_spades.png',
          // Тузы (14)
          'ace_of_clubs.png','ace_of_diamonds.png','ace_of_hearts.png','ace_of_spades.png'
        ];
        
        // Проверяем что у нас ровно 52 карты
        
        // Перемешиваем колоду
        const shuffledImages = [...standardDeck].sort(() => Math.random() - 0.5);
        
        const players: Player[] = []
        const cardsPerPlayer = 3;
        
        // ИСПРАВЛЕНО: Создаем игроков с аватарами и ботами
        console.log('🎮 [GameStore] Создаем игроков...');
        const playerInfos = createPlayers(playersCount, 0); // 0 - позиция пользователя
        console.log('🎮 [GameStore] Игроки созданы:', playerInfos);
        
        for (let i = 0; i < playersCount; i++) {
          const playerInfo = playerInfos[i];
          
          // Проверяем что playerInfo корректен
          if (!playerInfo) {
            throw new Error(`Не удалось создать информацию для игрока ${i + 1}`);
          }
          
          const playerOpenCards: Card[] = []; // Открытые карты (для 1-й стадии)
          const playerPenki: Card[] = []; // Пеньки (2 закрытые карты)
          
          // Раздаем 3 карты каждому игроку
          for (let j = 0; j < cardsPerPlayer; j++) {
            const cardIndex = i * cardsPerPlayer + j;
            const imageName = shuffledImages[cardIndex];
            
            const card: Card = {
              id: `card_${i}_${j}`,
              type: 'normal',
              title: `Карта ${j + 1}`,
              description: '',
              image: imageName,
              rarity: 'common',
              rank: get().getCardRank(imageName),
              open: false, // Пока все закрыты
            };
            
            if (j < 2) {
              // Первые 2 карты = пеньки (закрытые)
              playerPenki.push(card);
            } else {
              // Последняя карта = открытая карта для 1-й стадии
              card.open = true;
              playerOpenCards.push(card);
            }
          }
          
          console.log(`🎮 [GameStore] Создаем игрока ${i + 1}:`, playerInfo);
          
          players.push({
            id: `player_${i + 1}`,
            name: playerInfo.name,
            avatar: playerInfo.avatar,
            score: 0,
            cards: playerOpenCards, // Только верхняя открытая карта
            penki: playerPenki, // 2 закрытые карты
            playerStage: 1, // Все начинают с 1-й стадии
            isCurrentPlayer: i === 0,
            isUser: !playerInfo.isBot,
            isBot: playerInfo.isBot,
            difficulty: playerInfo.difficulty
          });
          
          console.log(`🎮 [GameStore] Игрок ${i + 1} создан успешно`);
        }
        
        // Оставшиеся карты в колоде
        const remainingCards: Card[] = shuffledImages.slice(playersCount * cardsPerPlayer).map((imageName, index) => ({
          id: `deck_card_${index}`,
          type: 'normal',
          title: `Карта колоды`,
          description: '',
          image: imageName,
          rarity: 'common',
          rank: get().getCardRank(imageName),
          open: false,
        }));
        
        // Определяем первого игрока по старшей открытой карте
        let firstPlayerIndex = 0;
        let maxRank = 0;
        players.forEach((player, index) => {
          const topCard = player.cards[player.cards.length - 1];
          if (topCard && topCard.rank && topCard.rank > maxRank) {
            maxRank = topCard.rank;
            firstPlayerIndex = index;
          }
        });
        
        // Обновляем кто ходит первым
        players.forEach((player, index) => {
          player.isCurrentPlayer = index === firstPlayerIndex;
        });
        
        // Сбрасываем состояние и начинаем игру
        get().resetTurnState();
        
        set({
          isGameActive: true,
          gameMode: mode,
          currentRound: 1,
          players,
          currentPlayerId: players[firstPlayerIndex].id,
          deck: remainingCards,
          playedCards: [],
          lastPlayedCard: null,
          gameStage: 1,
          // Сбрасываем данные второй стадии
          lastDrawnCard: null,
          lastPlayerToDrawCard: null,
          trumpSuit: null,
          drawnHistory: [],
          // Устанавливаем мультиплеер данные
          multiplayerData: mode === 'multiplayer' && multiplayerConfig ? {
            roomId: multiplayerConfig.roomId,
            roomCode: multiplayerConfig.roomCode,
            isHost: multiplayerConfig.isHost,
            connectedPlayers: multiplayerConfig.players?.map((p: any) => p.id) || []
          } : null
        });
        
        console.log('🎮 [GameStore] Игра успешно создана, показываем уведомление...');
        get().showNotification(`Игра начата! Ходит первым: ${players[firstPlayerIndex].name}`, 'success');
        
        // ИСПРАВЛЕНО: Запускаем обработку хода первого игрока через новую систему (УСКОРЕНО В 2 РАЗА)
        console.log('🎮 [GameStore] Запускаем processPlayerTurn через 0.5 секунды...');
        setTimeout(() => {
          get().processPlayerTurn(players[firstPlayerIndex].id);
        }, 500);
        
        console.log('🎮 [GameStore] startGame завершен успешно!');
        
        } catch (error) {
          console.error('🚨 [GameStore] ОШИБКА В startGame:', error);
          console.error('Stack trace:', (error as Error).stack);
          
          // Сбрасываем состояние при ошибке
          set({
            isGameActive: false,
            isLoading: false
          });
          
          // Пробрасываем ошибку дальше
          throw error;
        }
      },
      
      endGame: () => {
        // УСТАРЕЛО: Логика определения победителя перенесена в checkVictoryCondition
        // Этот метод теперь используется только для принудительного завершения игры
        console.log('🎮 [endGame] Принудительное завершение игры');
        
        set({
          isGameActive: false
        });
        
        get().showNotification('Игра завершена', 'info', 3000);
      },
      
      playCard: (cardId) => {
        const { players, currentPlayerId, playedCards } = get()
        const currentPlayer = players.find(p => p.id === currentPlayerId)
        
        if (!currentPlayer) return
        
        const cardIndex = currentPlayer.cards.findIndex(c => c.id === cardId)
        if (cardIndex === -1) return
        
        const playedCard = currentPlayer.cards[cardIndex]
        
        // Удаляем карту из руки игрока
        currentPlayer.cards.splice(cardIndex, 1)
        
        // Добавляем карту в сыгранные
        const newPlayedCards = [...playedCards, playedCard]
        
        // Обновляем счет игрока
        let scoreBonus = 10
        if (playedCard.rarity === 'rare') scoreBonus = 20
        if (playedCard.rarity === 'epic') scoreBonus = 50
        if (playedCard.rarity === 'legendary') scoreBonus = 100
        
        currentPlayer.score += scoreBonus
        
        set({
          players: [...players],
          playedCards: newPlayedCards,
          lastPlayedCard: playedCard
        })
        
        // Применяем эффект карты
        if (playedCard.effect === 'pidr_power') {
          get().showNotification('P.I.D.R. АКТИВИРОВАН!', 'success')
          currentPlayer.score += 50 // Бонус за P.I.D.R.
        }
        
        // Переходим к следующему ходу (УСКОРЕНО В 1.5 РАЗА)
        setTimeout(() => get().nextTurn(), 670)
      },
      
      drawCard: () => {
        const { players, currentPlayerId, deck } = get()
        const currentPlayer = players.find(p => p.id === currentPlayerId)
        
        if (!currentPlayer || deck.length === 0) return // Нельзя брать карты из пустой колоды
        
        const drawnCard = deck[0]
        currentPlayer.cards.push(drawnCard)
        
        const newDeck = deck.slice(1);
        set({
          players: [...players],
          deck: newDeck
        })
        
        // Проверяем переход к стадии 2 если колода опустела (только в 1-й стадии)
        const { gameStage } = get();
        if (gameStage === 1 && newDeck.length === 0) {
          console.log(`🃏 [drawCard] Колода пуста после взятия карты - переходим к стадии 2!`);
          setTimeout(() => {
            get().checkStage1End();
          }, 1500);
        }
        
        get().showNotification('Карта взята!', 'info')
      },
      
      nextTurn: () => {
        try {
          const { players, currentPlayerId, currentRound, maxRounds, gameStage } = get()
          
          if (!players || players.length === 0) {
            console.error(`🔄 [nextTurn] ❌ Нет игроков для передачи хода`);
            return;
          }
          
          if (!currentPlayerId) {
            console.error(`🔄 [nextTurn] ❌ Нет текущего игрока для передачи хода`);
            return;
          }
          
          const currentPlayerName = players.find(p => p.id === currentPlayerId)?.name || currentPlayerId;
          console.log(`🔄 [nextTurn] Передача хода от ${currentPlayerName}`);
          
          // ИСПРАВЛЕНО: Находим следующего игрока ПО ЧАСОВОЙ СТРЕЛКЕ
          const currentIndex = players.findIndex(p => p.id === currentPlayerId)
          
          if (currentIndex === -1) {
            console.error(`🔄 [nextTurn] ❌ Текущий игрок не найден в списке игроков`);
            return;
          }
          
          const nextIndex = (currentIndex + 1) % players.length
          const nextPlayerId = players[nextIndex].id
          const nextPlayer = players[nextIndex]
          
          if (!nextPlayer) {
            console.error(`🔄 [nextTurn] ❌ Следующий игрок не найден`);
            return;
          }
          
          console.log(`🔄 [nextTurn] Ход переходит к ${nextPlayer.name} (индекс ${nextIndex}) - ПО ЧАСОВОЙ`);
          
          // Обновляем текущего игрока
          players.forEach(p => p.isCurrentPlayer = p.id === nextPlayerId)
          
          let newRound = currentRound
          
          // Если круг завершен (вернулись к первому игроку при движении по часовой стрелке)
          if (nextIndex === 0) {
            newRound = currentRound + 1
          }
        
        // Сбрасываем состояния хода только для 1-й стадии
        if (gameStage === 1) {
          get().resetTurnState();
        }
        
        set({
          players: [...players],
          currentPlayerId: nextPlayerId,
          currentRound: newRound
        })
        
        get().showNotification(`Ход переходит к ${nextPlayer.name}`, 'info')
        
        console.log(`🔄 [nextTurn] Запускаем processPlayerTurn для ${nextPlayer.name}`);
        
        // Проверяем переход к 3-й стадии для игрока который получает ход
        if (gameStage === 2) {
          get().checkStage3Transition(nextPlayerId);
        }
        
        // ДОБАВЛЕНО: Проверяем условия победы после каждого хода
        get().checkVictoryCondition();
        
        // Запускаем обработку хода для соответствующей стадии (УСКОРЕНО В 2 РАЗА, затем в 1.5)
        if (gameStage === 1) {
          setTimeout(() => get().processPlayerTurn(nextPlayerId), 330)
        } else if (gameStage === 2 || gameStage === 3) {
          // Для 2-й и 3-й стадий устанавливаем фазу выбора карты (правила одинаковые)
          set({ stage2TurnPhase: 'selecting_card' });
          setTimeout(() => get().processPlayerTurn(nextPlayerId), 330)
        }
        
        // УДАЛЕНО: Неправильная логика завершения игры по maxRounds
        // Игра завершается только когда игроки остаются без карт (checkVictoryCondition)
        } catch (error) {
          console.error(`🔄 [nextTurn] ❌ Критическая ошибка при передаче хода:`, error);
          get().showNotification('Ошибка при передаче хода', 'error', 3000);
        }
      },
      
      resetGame: () => {
        set({
          isGameActive: false,
          currentRound: 0,
          players: [],
          currentPlayerId: null,
          deck: [...DEFAULT_CARDS],
          playedCards: [],
          lastPlayedCard: null,
          selectedCard: null
        })
      },
      
      // Управление картами
      selectCard: (card) => set({ selectedCard: card }),
      
      addCardToDeck: (card) => {
        const { deck } = get()
        set({ deck: [...deck, card] })
      },
      
      removeCardFromDeck: (cardId) => {
        const { deck } = get()
        set({ deck: deck.filter(c => c.id !== cardId) })
      },
      
      // Управление игроками
      addPlayer: (name) => {
        const { players } = get()
        const newPlayer: Player = {
          id: `player_${Date.now()}`,
          name,
          score: 0,
          cards: [],
          penki: [],
          playerStage: 1,
          isCurrentPlayer: false
        }
        set({ players: [...players, newPlayer] })
      },
      
      removePlayer: (playerId) => {
        const { players } = get()
        set({ players: players.filter(p => p.id !== playerId) })
      },
      
      updatePlayerScore: (playerId, score) => {
        const { players } = get()
        const player = players.find(p => p.id === playerId)
        if (player) {
          player.score = score
          set({ players: [...players] })
        }
      },
      
      // Настройки
      updateSettings: (newSettings) => {
        const { settings } = get()
        set({ settings: { ...settings, ...newSettings } })
      },
      
      // Статистика
      updateStats: (newStats) => {
        const { stats } = get()
        set({ stats: { ...stats, ...newStats } })
      },
      
      addAchievement: (achievementId) => {
        const { stats } = get()
        if (!stats.achievements.includes(achievementId)) {
          set({
            stats: {
              ...stats,
              achievements: [...stats.achievements, achievementId]
            }
          })
          get().showNotification('Новое достижение!', 'success')
        }
      },
      
      // Игровая валюта
      addCoins: (amount) => {
        const { gameCoins } = get()
        const newAmount = gameCoins + amount
        set({ gameCoins: newAmount })
        get().showNotification(`+${amount} монет! Баланс: ${newAmount}`, 'success', 2000)
      },
      
      spendCoins: (amount) => {
        const { gameCoins } = get()
        if (gameCoins >= amount) {
          const newAmount = gameCoins - amount
          set({ gameCoins: newAmount })
          get().showNotification(`-${amount} монет. Баланс: ${newAmount}`, 'info', 2000)
          return true
        } else {
          get().showNotification(`Недостаточно монет! Нужно: ${amount}, у вас: ${gameCoins}`, 'error', 3000)
          return false
        }
      },
      
      // UI
      showNotification: (message, type, duration = 3000) => {
        set({
          notification: {
            message,
            type,
            visible: true
          }
        })
        
        // Автоматически скрываем через указанное время (по умолчанию 3 секунды)
        setTimeout(() => get().hideNotification(), duration)
      },
      
      hideNotification: () => {
        set({ notification: null })
      },
      
      setLoading: (loading) => set({ isLoading: loading }),
      
      // ===== МЕТОДЫ ДЛЯ P.I.D.R ИГРЫ =====
      
      // Определение ранга карты по изображению
      getCardRank: (imageName: string) => {
        const name = imageName.replace('.png', '').replace('/img/cards/', '');
        let rank = 0;
        if (name.startsWith('ace')) rank = 14;
        else if (name.startsWith('king')) rank = 13;
        else if (name.startsWith('queen')) rank = 12;
        else if (name.startsWith('jack')) rank = 11;
        else {
          const match = name.match(/(\d+)_of/);
          rank = match ? parseInt(match[1], 10) : 0;
        }
        console.log(`🎴 [getCardRank] ${imageName} → ${name} → ранг: ${rank}`);
        return rank;
      },
      
      // Поиск доступных целей для текущего хода
      findAvailableTargets: (currentPlayerId: string) => {
        const { players } = get();
        const currentPlayer = players.find(p => p.id === currentPlayerId);
        if (!currentPlayer || currentPlayer.cards.length === 0) return [];
        
        // Берем верхнюю открытую карту игрока
        const topCard = currentPlayer.cards[currentPlayer.cards.length - 1];
        if (!topCard || !topCard.open) return [];
        
        const currentRank = get().getCardRank(topCard.image || '');
        console.log(`🎯 [findAvailableTargets] Игрок ${currentPlayer.name}, карта: ${topCard.image}, ранг: ${currentRank}`);
        
        // Определяем целевой ранг с учетом правил P.I.D.R.
        // ПРАВИЛО: Ищем у соперников карты на 1 ранг НИЖЕ нашей карты
        // ИСКЛЮЧЕНИЯ: 
        // 1) Только двойка (2) может ложиться на Туз (14)!
        // 2) Туз (14) может ложиться на Короля (13)!
        let targetRank: number;
        
        if (currentRank === 2) {
          // Двойка может ложиться ТОЛЬКО на Туз (14) - ИСКЛЮЧЕНИЕ!
          targetRank = 14;
        } else {
          // Обычное правило: ищем карты на 1 ранг ниже
          // Туз(14) → Король(13), Король(13) → Дама(12), Дама(12) → Валет(11), ..., 3 → 2
          targetRank = currentRank - 1;
        }
        
        console.log(`🎯 [findAvailableTargets] Ищем цели с рангом: ${targetRank}`);
        
        const targets: number[] = [];
        players.forEach((player, index) => {
          if (player.id === currentPlayerId) return; // Не можем положить на себя (пока)
          
          // Проверяем верхнюю карту игрока
          const playerTopCard = player.cards[player.cards.length - 1];
          if (playerTopCard && playerTopCard.open) {
            const playerRank = get().getCardRank(playerTopCard.image || '');
            console.log(`🎯 [findAvailableTargets] Соперник ${player.name}, карта: ${playerTopCard.image}, ранг: ${playerRank}`);
            if (playerRank === targetRank) {
              console.log(`✅ [findAvailableTargets] НАЙДЕНА ЦЕЛЬ: ${player.name} (индекс ${index})`);
              targets.push(index);
            }
          }
        });
        
        console.log(`🎯 [findAvailableTargets] ИТОГО найдено целей: ${targets.length}, массив: [${targets.join(', ')}]`);
        return targets;
      },
      
      // Проверка возможности сделать ход
      canMakeMove: (currentPlayerId: string) => {
        const targets = get().findAvailableTargets(currentPlayerId);
        console.log(`🎯 [canMakeMove] Игрок ${currentPlayerId}, найдено целей: ${targets.length}, цели: [${targets.join(', ')}]`);
        return targets.length > 0;
      },
      
      // Выполнение хода (обновленная логика)
      makeMove: (targetPlayerId: string) => {
        const { players, currentPlayerId, revealedDeckCard, turnPhase } = get();
        if (!currentPlayerId) return;
        
        // Специальная обработка инициации хода
        if (targetPlayerId === 'initiate_move') {
          // Игрок кликнул по своей карте - переключаем в режим выбора цели
          const targets = get().findAvailableTargets(currentPlayerId);
          set({ 
            turnPhase: 'waiting_target_selection',
            availableTargets: targets
          });
          if (!players.find(p => p.id === currentPlayerId)?.isBot) {
            get().showNotification('Выберите цель для хода', 'info');
          }
          return;
        }
        
        const currentPlayer = players.find(p => p.id === currentPlayerId);
        const targetPlayer = players.find(p => p.id === targetPlayerId);
        
        if (!currentPlayer || !targetPlayer) return;
        
        let cardToMove: Card | undefined;
        
        // Определяем какую карту перемещаем
        if (revealedDeckCard && (turnPhase === 'waiting_target_selection' || turnPhase === 'waiting_deck_action')) {
          // Ходим картой из колоды
          cardToMove = revealedDeckCard;
          
          // Убираем карту из колоды и сбрасываем состояние
          const { deck } = get();
          const newDeck = deck.slice(1);
          set({
            deck: newDeck,
            revealedDeckCard: null,
            lastDrawnCard: cardToMove,
            lastPlayerToDrawCard: currentPlayerId,
            turnPhase: 'turn_ended'
          });
          
          // Проверяем переход к стадии 2 после использования карты из колоды
          if (newDeck.length === 0) {
            console.log(`🃏 [makeMove] Колода пуста после хода - переходим к стадии 2!`);
            setTimeout(() => {
              get().checkStage1End();
            }, 1000);
          }
        } else {
          // Ходим верхней картой из руки
          if (currentPlayer.cards.length === 0) return;
          
          // Ходим верхней картой из руки (удаляем ее из стопки)
          cardToMove = currentPlayer.cards.pop();
          
          set({ 
            players: [...players],
            skipHandAnalysis: false // После хода на соперника - ВСЕГДА анализ руки
          });
        }
        
        if (!cardToMove) return;
        
        // Перемещаем карту ПОВЕРХ открытых карт целевого игрока
        targetPlayer.cards.push(cardToMove);
        
        set({ 
          players: [...players]
        });
        
        get().showNotification(`Карта переложена на ${targetPlayer.name}!`, 'success');
        
        console.log(`🔄 [makeMove] Ход выполнен успешно, игрок продолжает ходить`);
        
        // ИСПРАВЛЕНО: После успешного хода игрок ПРОДОЛЖАЕТ ходить (анализ руки)
        // Ход передается только когда игрок не может больше ходить
        get().resetTurnState();
        
         // Проверяем условия победы после хода
         get().checkVictoryCondition();
         
         // Проверяем статус "одна карта" после хода
         get().checkOneCardStatus();
         
         setTimeout(() => {
           get().processPlayerTurn(currentPlayerId);
         }, 500);
      },
      
      // Взятие карты из колоды
      drawCardFromDeck: () => {
        const { deck, players, currentPlayerId, gameStage } = get();
        if (deck.length === 0 || !currentPlayerId) return false; // Нельзя брать карты из пустой колоды
        
        const currentPlayer = players.find(p => p.id === currentPlayerId);
        if (!currentPlayer) return false;
        
        const drawnCard = deck[0];
        // Добавляем ранг к карте
        drawnCard.rank = get().getCardRank(drawnCard.image || '');
        drawnCard.open = true;
        
        // Карта добавляется ПОВЕРХ открытых карт (в стопку)
        currentPlayer.cards.push(drawnCard);
        
        // Отслеживаем для второй стадии
        const newDeck = deck.slice(1);
        set({ 
          deck: newDeck,
          players: [...players],
          lastDrawnCard: drawnCard,
          lastPlayerToDrawCard: currentPlayerId
        });
        // фиксируем историю
        // set({ drawnHistory: [...get().drawnHistory, drawnCard] }); // Уже добавлено в revealDeckCard
        
        // Проверяем переход к стадии 2 если мы в 1-й стадии и колода опустела (УСКОРЕНО В 2 РАЗА)
        if (gameStage === 1 && newDeck.length === 0) {
          console.log(`🃏 [drawCardFromDeck] Колода пуста после взятия карты - переходим к стадии 2!`);
          setTimeout(() => {
            get().checkStage1End();
          }, 750);
        }
        
        get().showNotification(`${currentPlayer.name} взял карту из колоды (осталось: ${newDeck.length})`, 'info');
        return true;
      },
      
      // Размещение карты на себя
      placeCardOnSelf: () => {
        const { players, currentPlayerId } = get();
        if (!currentPlayerId) return;
        
        const currentPlayer = players.find(p => p.id === currentPlayerId);
        if (!currentPlayer || currentPlayer.cards.length === 0) return;
        
        // Карта уже лежит на игроке, просто завершаем ход
        set({ 
          canPlaceOnSelf: false,
          mustDrawFromDeck: false,
          availableTargets: [] // Убираем подсветку
        });
        
        get().showNotification(`${currentPlayer.name} оставил карту у себя и пропускает ход`, 'warning');
        
        // Проверяем окончание стадии перед передачей хода
        get().checkStage1End();
        
        // Переходим к следующему игроку (УСКОРЕНО В 2 РАЗА, затем в 1.5)
        setTimeout(() => get().nextTurn(), 330);
      },
      
      // Проверка окончания 1-й стадии
      checkStage1End: () => {
        const { deck, gameStage, lastPlayerToDrawCard, players } = get();
        if (gameStage !== 1 || deck.length > 0) return;
        

        
        // Определяем козырь второй стадии
        const trumpSuit = get().determineTrumpSuit();

        
        // Определяем стартового игрока (последний взявший карту)
        const startingPlayerId = lastPlayerToDrawCard || players[0].id;

        
        // Обновляем текущего игрока и переводим всех во 2-ю стадию
        players.forEach(p => {
          p.isCurrentPlayer = p.id === startingPlayerId;
          p.playerStage = 2; // Все переходят во 2-ю стадию
        });
        
        set({ 
          gameStage: 2,
          availableTargets: [],
          canPlaceOnSelf: false,
          mustDrawFromDeck: false,
          trumpSuit: trumpSuit,
          currentPlayerId: startingPlayerId,
          players: [...players],
          currentRound: 1 // Сбрасываем раунды для новой стадии
        });
        
        // Инициализируем 2-ю стадию
        get().initializeStage2();
        
        // Показываем уведомления и СРАЗУ запускаем ход
        get().showNotification('🎉 Первая стадия завершена!', 'success', 3000);
        
        setTimeout(() => {
          const startingPlayer = players.find(p => p.id === startingPlayerId);
          get().showNotification(`🚀 Вторая стадия! Ходит: ${startingPlayer?.name || 'Игрок'}`, 'info', 3000);
          
          const trumpName = trumpSuit === 'clubs' ? 'Трефы' : 
                          trumpSuit === 'diamonds' ? 'Бубны' :
                          trumpSuit === 'hearts' ? 'Червы' : 'Неизвестно';
          
          setTimeout(() => {
            get().showNotification(`🃏 Козырь: ${trumpName} (Пики не козырь!)`, 'warning', 3000);
          }, 1000);
          
          // ИСПРАВЛЕНО: Запускаем ход СРАЗУ (не ждем окончания уведомлений)
          get().processPlayerTurn(startingPlayerId);
        }, 500);
      },
      
      // Обработка хода игрока (НОВАЯ логика)
      processPlayerTurn: (playerId: string) => {
        const { gameStage, players, skipHandAnalysis, deck } = get();
        const currentPlayer = players.find(p => p.id === playerId);
        if (!currentPlayer) return;
        
        console.log(`🎮 [processPlayerTurn] Обработка хода для ${currentPlayer.name} (стадия ${gameStage}, бот: ${currentPlayer.isBot})`);
        
        // ИСПРАВЛЕНО: Обрабатываем 2-ю и 3-ю стадии одинаково (правила дурака)
        if (gameStage === 2 || gameStage === 3) {
          console.log(`🎮 [processPlayerTurn Stage${gameStage}] Обрабатываем ход для ${currentPlayer.name} (бот: ${currentPlayer.isBot})`);
          
          // Для 2-й и 3-й стадий устанавливаем фазу выбора карты (правила одинаковые)
          set({ stage2TurnPhase: 'selecting_card' });
          
          if (currentPlayer.isBot) {
            console.log(`🤖 [processPlayerTurn Stage${gameStage}] Бот ${currentPlayer.name} должен автоматически выбрать карту`);
            // Для бота - логика обрабатывается через useEffect в GamePageContent
            // Принудительно обновляем состояние чтобы useEffect сработал
            set({ 
              currentPlayerId: currentPlayer.id,
              stage2TurnPhase: 'selecting_card'
            });
          } else if (!currentPlayer.isBot) {
            get().showNotification(`${currentPlayer.name}: выберите карту для хода`, 'info', 5000);
          }
          return;
        }
        
        if (gameStage !== 1) return; // Поддерживаем только 1-ю стадию в этой ветке
        
        // Проверяем состояние карт игрока
        const openCards = currentPlayer.cards.filter(c => c.open);
        
        // ЭТАП 1: Анализ руки (ТОЛЬКО если не пропускаем)
        if (!skipHandAnalysis && currentPlayer.cards.length > 0) {
          console.log(`🎮 [processPlayerTurn] ЭТАП 1: Анализ руки для ${currentPlayer.name}`);
          
          if (get().canMakeMove(playerId)) {
            // Может ходить - для ботов автоматически делаем ход, для пользователя ждем клика
            const targets = get().findAvailableTargets(playerId);
            console.log(`✅ [processPlayerTurn] Игрок МОЖЕТ ходить, цели: [${targets.join(', ')}]`);

            set({ 
              availableTargets: targets,
              turnPhase: 'analyzing_hand'
            });
            
            if (currentPlayer.isBot) {
              console.log(`🤖 [processPlayerTurn] Бот автоматически делает ход из руки`);
              // ИСПРАВЛЕНО: Убрали двойные setTimeout - источник race conditions
              if (targets.length > 0) {
                const targetIndex = targets[0];
                const targetPlayer = players[targetIndex];
                console.log(`🤖 [processPlayerTurn] Бот ходит на ${targetPlayer?.name} (индекс ${targetIndex})`);
                // Один безопасный setTimeout
                setTimeout(() => {
                  try {
                    get().makeMove(targetPlayer?.id || ''); // Прямой ход на цель
                  } catch (error) {
                    console.error(`🚨 [processPlayerTurn] Ошибка хода бота:`, error);
                  }
                }, 800);
              } else {
                console.log(`🤖 [processPlayerTurn] У бота нет целей для хода - переход к колоде`);
                setTimeout(() => get().nextTurn(), 1000);
              }
            } else if (!currentPlayer.isBot) {
              get().showNotification(`${currentPlayer.name}: выберите карту для хода`, 'info');
            }
            return; // Ждем выполнения хода
          } else {
            console.log(`❌ [processPlayerTurn] Игрок НЕ МОЖЕТ ходить, переход к колоде`);

            // Очищаем состояние и переходим к колоде
            set({ 
              availableTargets: [],
              canPlaceOnSelf: false,
              turnPhase: 'showing_deck_hint'
            });
            
            if (currentPlayer.isBot) {
              console.log(`🤖 [processPlayerTurn] Бот автоматически кликает по колоде`);
              // Для бота - автоматически кликаем по колоде (УСКОРЕНО В 2 РАЗА)
              setTimeout(() => {
                get().onDeckClick();
              }, 500);
            } else if (!currentPlayer.isBot) {
              get().showNotification(`${currentPlayer.name}: нет ходов из руки, кликните на колоду`, 'warning');
            }
            return; // Ждем клика по колоде
          }
        } else if (skipHandAnalysis) {
          set({ skipHandAnalysis: false }); // Сбрасываем флаг
        }
        
        // ЭТАП 2: Работа с колодой
        if (deck.length === 0) {
          // Если колода пуста, переходим к стадии 2
          get().checkStage1End();
          return;
        }
        
        // Показываем подсказку о клике на колоду
        set({ turnPhase: 'showing_deck_hint' });
        
        if (currentPlayer.isBot) {
          console.log(`🤖 [processPlayerTurn] Бот автоматически кликает по колоде (этап 2)`);
          // Для бота - автоматически кликаем по колоде (УСКОРЕНО В 2 РАЗА)
          setTimeout(() => {
            get().onDeckClick();
          }, 500);
        } else if (!currentPlayer.isBot) {
          get().showNotification(`${currentPlayer.name}: кликните на колоду чтобы открыть карту`, 'info');
        }
      },
      
      // Обработка клика по колоде
      onDeckClick: () => {
        const { turnPhase, currentPlayerId, players, revealedDeckCard } = get();
        if (turnPhase !== 'showing_deck_hint' || !currentPlayerId) return;
        
        // Открываем карту из колоды (ВОЗВРАЩАЕМ СТАРУЮ ЛОГИКУ)
        if (!get().revealDeckCard()) {
          // revealDeckCard уже вызвал checkStage1End если нужно
          return;
        }
        
        // Сразу анализируем открытую карту (как и было раньше)
        const { revealedDeckCard: newRevealedCard } = get();
        if (!newRevealedCard) return;
        
        const currentPlayer = players.find(p => p.id === currentPlayerId);
        if (!currentPlayer) return;
        
        // Проверяем возможности с картой из колоды
        const deckTargets = get().findAvailableTargetsForDeckCard(newRevealedCard);
        const canMoveToOpponents = deckTargets.length > 0;
        
        let canPlaceOnSelfByRules = false;
        if (currentPlayer.cards.length > 0) {
          const topCard = currentPlayer.cards[currentPlayer.cards.length - 1];
          canPlaceOnSelfByRules = get().canPlaceCardOnSelf(newRevealedCard, topCard);
          console.log(`🎯 [onDeckClick] Проверка canPlaceCardOnSelf:`);
          console.log(`🎯 [onDeckClick] - Карта из колоды: ${newRevealedCard.image} (ранг ${get().getCardRank(newRevealedCard.image || '')})`);
          console.log(`🎯 [onDeckClick] - Верхняя карта игрока: ${topCard.image} (ранг ${get().getCardRank(topCard.image || '')})`);
          console.log(`🎯 [onDeckClick] - Результат canPlaceCardOnSelf: ${canPlaceOnSelfByRules}`);
        }
        
        set({
          turnPhase: 'waiting_deck_action',
          canPlaceOnSelfByRules: canPlaceOnSelfByRules,
          availableTargets: canMoveToOpponents ? deckTargets : []
        });
        
        // Для ботов - автоматически принимаем решение
        if (currentPlayer.isBot) {
          console.log(`🤖 [onDeckClick] Бот анализирует карту из колоды:`);
          console.log(`🤖 [onDeckClick] - canMoveToOpponents: ${canMoveToOpponents}, targets: [${deckTargets.join(', ')}]`);
          console.log(`🤖 [onDeckClick] - canPlaceOnSelfByRules: ${canPlaceOnSelfByRules}`);
          
          setTimeout(() => {
            if (canMoveToOpponents) {
              // Приоритет: ходить на противников
              const targetIndex = deckTargets[0];
              const targetPlayer = players[targetIndex];
              console.log(`🤖 [onDeckClick] Бот ходит картой из колоды на ${targetPlayer?.name}`);
              get().makeMove(targetPlayer?.id || '');
            } else if (canPlaceOnSelfByRules) {
              // Второй приоритет: положить на себя по правилам
              console.log(`🤖 [onDeckClick] Бот кладет карту на себя по правилам`);
              get().placeCardOnSelfByRules();
            } else {
              // Последний вариант: взять поверх
              console.log(`🤖 [onDeckClick] Бот берет карту поверх своих карт`);
              get().takeCardNotByRules();
            }
          }, 1500);
        } else {
          // Для пользователя - показываем варианты
          if (canMoveToOpponents && !currentPlayer.isBot) {
            get().showNotification('Выберите: сходить на соперника или положить на себя', 'info');
          } else if (canPlaceOnSelfByRules && !currentPlayer.isBot) {
            get().showNotification('Можете положить карту на себя по правилам', 'info');
          } else if (!currentPlayer.isBot) {
            get().showNotification('Нет доступных ходов - карта ложится поверх ваших карт', 'warning');
            // Автоматически кладем карту поверх через 2 секунды
            setTimeout(() => {
              get().takeCardNotByRules();
            }, 2000);
          }
        }
      },
      
      // Определение козыря для второй стадии
      // ПРАВИЛО: Козырь = последняя взятая карта из колоды, которая НЕ пики
      // Если последняя карта пика, ищем предыдущую непиковую из взятых карт
      determineTrumpSuit: () => {
        const { lastDrawnCard, drawnHistory } = get();
        
        console.log(`🃏 [determineTrumpSuit] Определяем козырь из последней взятой карты или истории`);
        console.log(`🃏 [determineTrumpSuit] Последняя взятая карта: ${lastDrawnCard?.image || 'нет'}`);
        console.log(`🃏 [determineTrumpSuit] История взятых карт: ${drawnHistory.length} карт`);
        
        // Сначала проверяем последнюю взятую карту
        if (lastDrawnCard && lastDrawnCard.image) {
          const suit = get().getCardSuit(lastDrawnCard.image);
          console.log(`🃏 [determineTrumpSuit] Последняя взятая карта: ${lastDrawnCard.image} → масть: ${suit}`);
          
          // Козырем может быть любая масть КРОМЕ пик
          if (suit !== 'spades' && suit !== 'unknown') {
            console.log(`✅ [determineTrumpSuit] НАЙДЕН КОЗЫРЬ: ${suit} (карта: ${lastDrawnCard.image})`);
            return suit as 'clubs' | 'diamonds' | 'hearts' | 'spades';
          }
        }
        
        // Если последняя карта пика или нет lastDrawnCard, ищем в истории
        console.log(`🃏 [determineTrumpSuit] Ищем непиковую карту в истории взятых карт (${drawnHistory.length} карт)`);
        drawnHistory.forEach((card, index) => {
          if (card && card.image) {
            const cardSuit = get().getCardSuit(card.image);
            console.log(`🃏 [determineTrumpSuit] История ${index}: ${card.image} → масть: ${cardSuit}`);
          }
        });
        
        // Ищем последнюю непиковую карту в истории взятых карт (в обратном порядке)
        for (let i = drawnHistory.length - 1; i >= 0; i--) {
          const card = drawnHistory[i];
          if (card && card.image) {
            const cardSuit = get().getCardSuit(card.image);
            console.log(`🃏 [determineTrumpSuit] Проверяем историю ${i}: ${card.image} → масть: ${cardSuit}`);
            if (cardSuit !== 'spades' && cardSuit !== 'unknown') {
              console.log(`✅ [determineTrumpSuit] НАЙДЕН КОЗЫРЬ ИЗ ИСТОРИИ: ${cardSuit} (карта: ${card.image})`);
              return cardSuit as 'clubs' | 'diamonds' | 'hearts' | 'spades';
            }
          }
        }
        
        console.log(`❌ [determineTrumpSuit] КРИТИЧЕСКАЯ ОШИБКА: Все карты были пиками! Это не должно происходить!`);
        // ИСПРАВЛЕНО: Если все карты пики - это критическая ошибка, возвращаем null
        return null;
      },
      
      // Определение масти карты
      getCardSuit: (imageName: string) => {
        const name = imageName.replace('.png', '').replace('/img/cards/', '');
        if (name.includes('clubs')) return 'clubs';
        if (name.includes('diamonds')) return 'diamonds';
        if (name.includes('hearts')) return 'hearts';
                 if (name.includes('spades')) return 'spades';
         return 'unknown';
       },
       
       // ===== НОВЫЕ МЕТОДЫ ДЛЯ АЛГОРИТМА ХОДА =====
       
       // Показать карту из колоды
       revealDeckCard: () => {
         const { deck } = get();
         if (deck.length === 0) return false;
         
         const topCard = { ...deck[0] };
         topCard.rank = get().getCardRank(topCard.image || '');
         topCard.open = true; // Карта открывается для хода
         
         // ИСПРАВЛЕНИЕ: Добавляем открытую карту в историю для правильного определения козыря
         const { drawnHistory } = get();
         set({ 
           revealedDeckCard: topCard,
           turnPhase: 'deck_card_revealed',
           drawnHistory: [...drawnHistory, topCard] // Добавляем в историю при открытии
         });
         
         // СПЕЦИАЛЬНЫЙ СЛУЧАЙ: Если это последняя карта, отмечаем это в логах
         if (deck.length === 1) {
           console.log(`🃏 [revealDeckCard] ВНИМАНИЕ: Открыта ПОСЛЕДНЯЯ карта из колоды: ${topCard.image}`);
           console.log(`🃏 [revealDeckCard] После использования этой карты -> переход к стадии 2`);
         }
         
         console.log(`🎴 [revealDeckCard] Карта из колоды открыта: ${topCard.image}, добавлена в drawnHistory`);
         return true;
       },
       

       
             // Проверка возможности положить карту из колоды на себя по правилам
      canPlaceCardOnSelf: (deckCard: Card, playerTopCard: Card) => {
        if (!deckCard.image || !playerTopCard.image) return false;
        
        const deckRank = get().getCardRank(deckCard.image);
        const playerRank = get().getCardRank(playerTopCard.image);
        

        
        // ПРАВИЛЬНАЯ ЛОГИКА: Карта из колоды может лечь на карту игрока, если она на 1 ранг БОЛЬШЕ
        // Пример: 5♠ (deckRank=5) может лечь на 4♣ (playerRank=4)
        if (deckRank === 2) {
          return playerRank === 14; // Двойка только на туз
        } else {
          return deckRank === (playerRank + 1); // ПРАВИЛЬНО: 5 ложится на 4
        }
      },
       
       // Положить карту из колоды на себя по правилам
       placeCardOnSelfByRules: () => {
         const { players, currentPlayerId, revealedDeckCard, deck, gameStage } = get();
         if (!currentPlayerId || !revealedDeckCard) return;
         
         const currentPlayer = players.find(p => p.id === currentPlayerId);
         if (!currentPlayer) return;
         
         // Добавляем карту из колоды на верх стопки игрока (ОТКРЫТОЙ!)
         revealedDeckCard.open = true; // ИСПРАВЛЕНО: убеждаемся что карта открыта
         
         // Добавляем карту из колоды ПОВЕРХ открытых карт игрока
         currentPlayer.cards.push(revealedDeckCard);
         
                 // Отслеживаем для второй стадии
        const newDeck = deck.slice(1);
        set({
          players: [...players],
          deck: newDeck,
          lastDrawnCard: revealedDeckCard,
          lastPlayerToDrawCard: currentPlayerId,
          revealedDeckCard: null,
          skipHandAnalysis: true, // ⭐ Пропускаем анализ руки!
          turnPhase: 'analyzing_hand' // Возвращаемся к началу (но с пропуском)
        });
        // set({ drawnHistory: [...get().drawnHistory, revealedDeckCard] }); // Уже добавлено в revealDeckCard
        
        // Проверяем переход к стадии 2 после размещения карты на себя
        if (newDeck.length === 0) {
          console.log(`🃏 [placeCardOnSelfByRules] Колода пуста после размещения карты на себя - переходим к стадии 2!`);
          setTimeout(() => {
            get().checkStage1End();
          }, 1500);
        }
         
         get().showNotification(`${currentPlayer.name} положил карту на себя по правилам - ходит снова!`, 'success');
         
         // ИСПРАВЛЕНО: Продолжаем ход (анализируем руку, если нет открытых карт - идем к колоде)
         setTimeout(() => {
           get().processPlayerTurn(currentPlayerId);
         }, 1000);
       },
       
             // Положить карту поверх своих карт (завершение хода)
      takeCardNotByRules: () => {
        const { players, currentPlayerId, revealedDeckCard, deck, gameStage } = get();
        if (!currentPlayerId || !revealedDeckCard) return;
        
        const currentPlayer = players.find(p => p.id === currentPlayerId);
        if (!currentPlayer) return;
        
        // Карта ложится ПОВЕРХ открытых карт игрока (становится новой верхней картой)
        revealedDeckCard.open = true; // Карта остается открытой
        
        // Карта ложится ПОВЕРХ открытых карт игрока (становится новой верхней картой)
        currentPlayer.cards.push(revealedDeckCard);
        
        // Отслеживаем для второй стадии
        const newDeck = deck.slice(1);
        set({
          players: [...players],
          deck: newDeck,
          lastDrawnCard: revealedDeckCard,
          lastPlayerToDrawCard: currentPlayerId,
          turnPhase: 'turn_ended'
        });
        // set({ drawnHistory: [...get().drawnHistory, revealedDeckCard] }); // Уже добавлено в revealDeckCard
        
        // Проверяем переход к стадии 2 после взятия карты поверх
        if (newDeck.length === 0) {
          console.log(`🃏 [takeCardNotByRules] Колода пуста после взятия карты поверх - переходим к стадии 2!`);
          setTimeout(() => {
            get().checkStage1End();
          }, 2000);
        }
        
        get().showNotification(`${currentPlayer.name} положил карту поверх своих карт и передает ход`, 'info');
        get().resetTurnState();
        
        console.log(`🔄 [takeCardNotByRules] Карта добавлена в руку, ход передается следующему игроку`);
        
        // ИСПРАВЛЕНО: После добавления карты в руку - ход передается следующему игроку!
        setTimeout(() => {
          get().nextTurn();
        }, 1500);
      },
       
                // Сброс состояния хода
         resetTurnState: () => {
           set({
             turnPhase: 'analyzing_hand',
             revealedDeckCard: null,
             availableTargets: [],
             canPlaceOnSelf: false,
             canPlaceOnSelfByRules: false,
             skipHandAnalysis: false
           });
         },
         
         // Поиск целей для карты из колоды
         findAvailableTargetsForDeckCard: (deckCard: Card) => {
           const { players, currentPlayerId } = get();
           if (!deckCard.image || !currentPlayerId) return [];
           
           const deckRank = get().getCardRank(deckCard.image);
           console.log(`🃏 [findAvailableTargetsForDeckCard] Анализ карты из колоды: ${deckCard.image}, ранг: ${deckRank}`);
           
           // Определяем целевой ранг (та же логика что в findAvailableTargets)
           let targetRank: number;
           
           if (deckRank === 2) {
             // Двойка может ложиться ТОЛЬКО на Туз (14)
             targetRank = 14;
           } else {
             // Обычное правило: ищем карты на 1 ранг ниже
             // Туз(14) → Король(13), Король(13) → Дама(12), и т.д.
             targetRank = deckRank - 1;
           }
           
           console.log(`🃏 [findAvailableTargetsForDeckCard] Ищем соперников с картами ранга: ${targetRank}`);
           
           const targets: number[] = [];
           players.forEach((player, index) => {
             if (player.id === currentPlayerId) return; // Не можем положить на себя
             
             // Проверяем верхнюю карту игрока
             const playerTopCard = player.cards[player.cards.length - 1];
             if (playerTopCard && playerTopCard.open && playerTopCard.image) {
               const playerRank = get().getCardRank(playerTopCard.image);
               console.log(`🃏 [findAvailableTargetsForDeckCard] Соперник ${player.name} (индекс ${index}), карта: ${playerTopCard.image}, ранг: ${playerRank}`);
               if (playerRank === targetRank) {
                 console.log(`✅ [findAvailableTargetsForDeckCard] НАЙДЕНА ЦЕЛЬ ДЛЯ КАРТЫ ИЗ КОЛОДЫ: ${player.name} (индекс ${index})`);
                 targets.push(index);
               }
             }
           });
           
           console.log(`🃏 [findAvailableTargetsForDeckCard] ИТОГО найдено целей для карты из колоды: ${targets.length}, массив: [${targets.join(', ')}]`);
           return targets;
         },
         
         // ===== МЕТОДЫ ДЛЯ 2-Й СТАДИИ =====
         
         // Инициализация 2-й стадии
         initializeStage2: () => {
           set({
             stage2TurnPhase: 'selecting_card',
             roundInProgress: false,
             currentRoundInitiator: null,
             roundFinisher: null,
             tableStack: [],
             selectedHandCard: null
           });
         },

         // Вычисляем игрока который должен завершить круг битья (позиция -1 от инициатора)
         calculateRoundFinisher: (initiatorId: string): string | null => {
           const { players } = get();
           const initiatorIndex = players.findIndex(p => p.id === initiatorId);
           if (initiatorIndex === -1) return null;

           // Находим игрока который сидит ПЕРЕД инициатором (позиция -1)
           const finisherIndex = initiatorIndex === 0 ? players.length - 1 : initiatorIndex - 1;
           const finisher = players[finisherIndex];
           
           console.log(`🎯 [calculateRoundFinisher] Инициатор: ${players[initiatorIndex].name} (индекс ${initiatorIndex})`);
           console.log(`🎯 [calculateRoundFinisher] Должен завершить: ${finisher.name} (индекс ${finisherIndex})`);
           
           return finisher.id;
         },
         
                 // Выбор карты в руке (двойной клик)
        selectHandCard: (card: Card) => {
          const { selectedHandCard, currentPlayerId, players, gameStage } = get();
          
          // БЕЗОПАСНОСТЬ: Проверяем что карта принадлежит текущему игроку
          const currentPlayer = players.find(p => p.id === currentPlayerId);
          if (!currentPlayer) {
            console.warn(`🚫 [selectHandCard] Текущий игрок не найден`);
            return;
          }
          
          const cardBelongsToCurrentPlayer = currentPlayer.cards.some(c => c.id === card.id);
          if (!cardBelongsToCurrentPlayer) {
            console.warn(`🚫 [selectHandCard] Карта ${card.id} не принадлежит текущему игроку ${currentPlayer.name}`);
            return;
          }
          
          // Разрешаем ботам играть во 2-й стадии через AI логику
          if (gameStage === 2 && currentPlayer.isBot) {
            console.log(`🤖 [selectHandCard] Бот ${currentPlayer.name} играет карту во 2-й стадии: ${card.image}`);
          }
          
          console.log(`✅ [selectHandCard] Игрок ${currentPlayer.name} выбирает карту ${card.image}`);
          
          if (selectedHandCard?.id === card.id) {
            // Второй клик - играем карту
            get().playSelectedCard();
          } else {
            // Первый клик - выбираем карту
            set({ selectedHandCard: card });
          }
        },
         
         // Розыгрыш выбранной карты (ПРАВИЛА P.I.D.R.)
         playSelectedCard: () => {
           const { selectedHandCard, currentPlayerId, players, tableStack, roundInProgress, stage2TurnPhase, trumpSuit, roundFinisher, finisherPassed } = get();
           if (!selectedHandCard || !currentPlayerId) return;
           
           const currentPlayer = players.find(p => p.id === currentPlayerId);
           if (!currentPlayer) return;
           
           console.log(`🃏 [playSelectedCard P.I.D.R.] Игрок ${currentPlayer.name} играет картой: ${selectedHandCard?.image}`);
           console.log(`🃏 [playSelectedCard P.I.D.R.] - tableStack.length: ${tableStack.length}`);
           console.log(`🃏 [playSelectedCard P.I.D.R.] - roundInProgress: ${roundInProgress}`);
           
           // ПРАВИЛА P.I.D.R.: Проверяем можем ли побить верхнюю карту (если есть карты на столе)
           if (tableStack.length > 0) {
             const topCard = tableStack[tableStack.length - 1];
             console.log(`🃏 [playSelectedCard P.I.D.R.] Пытаемся побить верхнюю карту: ${topCard?.image}`);
             
             const canBeat = get().canBeatCard(topCard, selectedHandCard, trumpSuit || '');
             if (!canBeat) {
               get().showNotification('Эта карта не может побить верхнюю карту на столе!', 'error', 3000);
               console.log(`🃏 [playSelectedCard P.I.D.R.] ❌ НЕ МОЖЕТ ПОБИТЬ!`);
               return; // Блокируем неправильный ход
             }
             console.log(`🃏 [playSelectedCard P.I.D.R.] ✅ ПОБИЛ ВЕРХНЮЮ КАРТУ!`);
           } else {
             console.log(`🃏 [playSelectedCard P.I.D.R.] 🆕 Первая карта на стол (начало раунда)`);
           }
           
           // УБРАНА СТАРАЯ НЕПРАВИЛЬНАЯ ЛОГИКА ЛИМИТА КАРТ
           // Теперь круг завершается только когда финишер (-1 от инициатора) побьет карту
           
           // Убираем карту из руки игрока
           const cardIndex = currentPlayer.cards.findIndex(c => c.id === selectedHandCard.id);
           if (cardIndex === -1) return;
           
           currentPlayer.cards.splice(cardIndex, 1);
           
           // Добавляем карту на стол (поверх всех)
           const playedCard = { ...selectedHandCard };
           playedCard.open = true;
           
           const newTableStack = [...tableStack, playedCard];
           const wasEmptyTable = tableStack.length === 0;
           
           // НОВАЯ ЛОГИКА: Определяем инициатора и финишера круга
           let newInitiator = get().currentRoundInitiator;
           let newFinisher = get().roundFinisher;
           let newFinisherPassed = finisherPassed;
           
           if (wasEmptyTable) {
             // Начинается новый раунд - текущий игрок становится инициатором
             newInitiator = currentPlayerId;
             newFinisher = get().calculateRoundFinisher(currentPlayerId);
             newFinisherPassed = false; // Новый раунд - сбрасываем овертайм
             console.log(`🎯 [playSelectedCard] 🆕 НОВЫЙ РАУНД НАЧАТ! Инициатор: ${currentPlayer.name}, Финишер: ${players.find(p => p.id === newFinisher)?.name}`);
           }
           
           set({
             players: [...players],
             tableStack: newTableStack,
             selectedHandCard: null,
             roundInProgress: true,
             currentRoundInitiator: newInitiator,
             roundFinisher: newFinisher,
             finisherPassed: newFinisherPassed,
             lastCardTaker: null, // Сбрасываем последнего взявшего карту
             stage2TurnPhase: 'selecting_card' // Следующий игрок выбирает карту
           });
           
           const actionType = wasEmptyTable ? 'начал атаку' : 'побил карту';
           get().showNotification(`${currentPlayer.name} ${actionType} (на столе: ${newTableStack.length})`, 'info', 3000);
           
           // ИСПРАВЛЕННАЯ ЛОГИКА P.I.D.R.: Карты должны накапливаться в массиве!
           // Круг завершается НЕ после первого битья, а только при особых условиях
           console.log(`🃏 [playSelectedCard] Карта добавлена в массив. На столе карт: ${newTableStack.length}`);
           console.log(`🃏 [playSelectedCard] Карты на столе: ${newTableStack.map(c => c.image).join(' -> ')}`);
           
           // НОВАЯ УПРОЩЕННАЯ ЛОГИКА ЗАВЕРШЕНИЯ КРУГА:
           // Круг завершается когда:
           // 1. Финишер побил карту (обычное завершение)
           // 2. Любой игрок после финишера побил карту (овертайм)
           
           const shouldEndRound = !wasEmptyTable && (
             // Обычное завершение: финишер побил карту
             (currentPlayerId === roundFinisher && !finisherPassed) ||
             // Овертайм: финишер уже пропустил, любой следующий побил
             (finisherPassed && newTableStack.length > 0)
           );
           
          if (shouldEndRound) {
            const reasonText = finisherPassed
              ? `Овертайм! ${currentPlayer.name} побил и закрыл круг`
              : `${currentPlayer.name} (финишер) закрыл круг`;
              
            console.log(`🎯 [playSelectedCard] 🏁 КРУГ ЗАВЕРШЕН! ${reasonText}`);
            console.log(`🎯 [playSelectedCard] 📊 Карт в биту: ${newTableStack.length}`);
            console.log(`🎯 [playSelectedCard] 🗑️ Карты: ${newTableStack.map(c => c.image).join(', ')}`);
            
            // ВСЕ КАРТЫ СО СТОЛА УХОДЯТ В БИТУ
            set({
              tableStack: [],
              roundInProgress: false,
              currentRoundInitiator: null,
              roundFinisher: null,
              finisherPassed: false,
              lastCardTaker: null,
              stage2TurnPhase: 'selecting_card'
            });
            
            get().showNotification(`🏁 ${reasonText}! ${newTableStack.length} карт в биту`, 'success', 3000);
            
            // Проверяем переход в 3-ю стадию
            get().checkStage3Transition(currentPlayerId);
            // Проверяем условия победы
            get().checkVictoryCondition();
            // Проверяем статус "одна карта"
            get().checkOneCardStatus();
            
            // Игрок который завершил круг начинает новый раунд
            setTimeout(() => get().nextTurn(), 330);
            return;
          }
           
           // ОБЫЧНОЕ ПРОДОЛЖЕНИЕ КРУГА
           // Проверяем переход в 3-ю стадию
           get().checkStage3Transition(currentPlayerId);
           // Проверяем условия победы
           get().checkVictoryCondition();
           // Проверяем статус "одна карта"
           get().checkOneCardStatus();
           
           // ПРАВИЛА P.I.D.R.: Ход переходит к следующему игроку (УСКОРЕНО)
           console.log(`🃏 [playSelectedCard P.I.D.R.] ✅ Ход к следующему игроку`);
           setTimeout(() => get().nextTurn(), 200);
         },
         
         // Проверка возможности побить карту
         canBeatCard: (attackCard: Card, defendCard: Card, trumpSuit: string) => {
           if (!attackCard.image || !defendCard.image) return false;
           
           const attackSuit = get().getCardSuit(attackCard.image);
           const defendSuit = get().getCardSuit(defendCard.image);
           const attackRank = get().getCardRank(attackCard.image);
           const defendRank = get().getCardRank(defendCard.image);
           
           console.log(`🃏 [canBeatCard] Проверка: ${attackCard.image} (${attackSuit}, ранг ${attackRank}) vs ${defendCard.image} (${defendSuit}, ранг ${defendRank}), козырь: ${trumpSuit}`);
           
           // ОСОБОЕ ПРАВИЛО: "Пики только Пикями" - пики можно бить ТОЛЬКО пиками
           if (attackSuit === 'spades' && defendSuit !== 'spades') {
             console.log(`🃏 [canBeatCard] ❌ Пику можно бить только пикой!`);
             return false;
           }
           
           // Бить той же мастью старшей картой
           if (attackSuit === defendSuit) {
             const result = defendRank > attackRank;
             console.log(`🃏 [canBeatCard] Та же масть: ${result ? '✅' : '❌'} (${defendRank} > ${attackRank})`);
             return result;
           }
           
           // Бить козырем некозырную карту (НО НЕ ПИКУ!)
           if (defendSuit === trumpSuit && attackSuit !== trumpSuit && attackSuit !== 'spades') {
             console.log(`🃏 [canBeatCard] ✅ Козырь бьет некозырную (не пику)`);
             return true;
           }
           
           console.log(`🃏 [canBeatCard] ❌ Нет подходящих правил для битья`);
           return false;
         },
         

         
         // Взять НИЖНЮЮ карту со стола (ПРАВИЛА P.I.D.R.)
         takeTableCards: () => {
           const { currentPlayerId, players, tableStack, roundFinisher, currentRoundInitiator } = get();
           if (!currentPlayerId || tableStack.length === 0) return;
           
           const currentPlayer = players.find(p => p.id === currentPlayerId);
           if (!currentPlayer) return;
           
           console.log(`🃏 [takeTableCards P.I.D.R.] ${currentPlayer.name} не может побить и берет НИЖНЮЮ карту`);
           console.log(`🃏 [takeTableCards P.I.D.R.] Карты на столе:`, tableStack.map(c => c.image));
           
           // Отслеживаем если финишер взял карту (начался овертайм)
           const { finisherPassed } = get();
           let newFinisherPassed = finisherPassed;
           if (currentPlayerId === roundFinisher && !finisherPassed) {
             console.log(`🎯 [takeTableCards] ⚠️ ФИНИШЕР ${currentPlayer.name} взял карту - НАЧАЛСЯ ОВЕРТАЙМ!`);
             newFinisherPassed = true;
           }
           
           // Берем ТОЛЬКО нижнюю карту (первую в стопке)
           const bottomCard = tableStack[0];
           bottomCard.open = true; // Открываем взятую карту
           
           currentPlayer.cards.push(bottomCard);
           
           // Убираем только нижнюю карту, остальные остаются на столе
           const newTableStack = tableStack.slice(1);
           
           set({
             players: [...players],
             tableStack: newTableStack,
             finisherPassed: newFinisherPassed,
             lastCardTaker: currentPlayerId, // Запоминаем последнего взявшего
             stage2TurnPhase: 'selecting_card' // Следующий игрок выбирает карту
           });
           
           console.log(`🃏 [takeTableCards P.I.D.R.] Взята нижняя карта: ${bottomCard.image}`);
           console.log(`🃏 [takeTableCards P.I.D.R.] Осталось на столе:`, newTableStack.map(c => c.image));
           
           get().showNotification(`${currentPlayer.name} взял нижнюю карту (осталось: ${newTableStack.length})`, 'warning', 3000);
           
           // Если стол опустел - завершаем раунд
           if (newTableStack.length === 0) {
             console.log(`🎯 [takeTableCards] 📭 Стол полностью очищен - раунд завершен`);
             set({
               roundInProgress: false,
               currentRoundInitiator: null,
               roundFinisher: null,
 // Сбрасываем флаг
               stage2TurnPhase: 'selecting_card'
             });
             get().showNotification('Стол очищен! Новый раунд', 'info', 3000);
           }
           
           // Проверяем переход в 3-ю стадию
           get().checkStage3Transition(currentPlayerId);
           
           // Проверяем условия победы
           get().checkVictoryCondition();
           
           // Проверяем статус "одна карта"
           get().checkOneCardStatus();
           
           // ПРАВИЛА P.I.D.R.: Ход переходит к следующему игроку (УСКОРЕНО)
           console.log(`🃏 [takeTableCards P.I.D.R.] ✅ Ход к следующему игроку`);
           setTimeout(() => get().nextTurn(), 200);
         },
         
         // Проверка завершения раунда
         checkRoundComplete: () => {
           const { currentPlayerId, currentRoundInitiator, players } = get();
           if (!currentRoundInitiator) return false;
           
           // Найдем индекс инициатора раунда
           const initiatorIndex = players.findIndex(p => p.id === currentRoundInitiator);
           const currentIndex = players.findIndex(p => p.id === currentPlayerId);
           
           if (initiatorIndex === -1 || currentIndex === -1) return false;
           
           // Раунд завершается когда доходим до игрока перед инициатором
           const beforeInitiatorIndex = (initiatorIndex - 1 + players.length) % players.length;
           
           return currentIndex === beforeInitiatorIndex;
         },
         
         // ===== МЕТОДЫ ДЛЯ 3-Й СТАДИИ =====
         
         // Проверка перехода в 3-ю стадию - ИСПРАВЛЕНО
         checkStage3Transition: (playerId: string) => {
           const { players, gameStage } = get();
           if (gameStage !== 2) return; // Только во 2-й стадии можно перейти в 3-ю
           
           const player = players.find(p => p.id === playerId);
           if (!player) {
             console.log(`🃏 [checkStage3Transition] ❌ Игрок не найден: ${playerId}`);
             return;
           }
           
           // ЗАЩИТА: Если у игрока уже нет пеньков, значит они уже активированы
           if (player.penki.length === 0) {
             console.log(`🃏 [checkStage3Transition] ⚠️ У игрока ${player.name} пеньки уже активированы - пропускаем`);
             return;
           }
           
           // Проверяем есть ли у игрока открытые карты
           const hasOpenCards = player.cards.some(card => card.open);
           
           console.log(`🃏 [checkStage3Transition] Проверка перехода игрока ${player.name}:`);
           console.log(`🃏 [checkStage3Transition] - hasOpenCards: ${hasOpenCards}`);
           console.log(`🃏 [checkStage3Transition] - player.cards.length: ${player.cards.length}`);
           console.log(`🃏 [checkStage3Transition] - player.playerStage: ${player.playerStage}`);
           console.log(`🃏 [checkStage3Transition] - player.penki.length: ${player.penki.length}`);
           
           // ИСПРАВЛЕНО: Во 2-й стадии если у игрока НЕТ открытых карт → открываем пеньки
           if (!hasOpenCards && player.playerStage === 2 && player.penki.length > 0) {
             console.log(`🃏 [checkStage3Transition] ✅ У игрока ${player.name} нет открытых карт во 2-й стадии - активируем пеньки!`);
             get().activatePenki(playerId);
           }
         },
         
         // Активация пеньков (остается во 2-й стадии) - ИСПРАВЛЕНО
         activatePenki: (playerId: string) => {
           const { players } = get();
           const playerIndex = players.findIndex(p => p.id === playerId);
           const player = players[playerIndex];
           
           if (!player || player.penki.length === 0) {
             console.log(`🃏 [activatePenki] ❌ Игрок не найден или нет пеньков для активации: ${playerId}`);
             return;
           }
           
           console.log(`🃏 [activatePenki] Активация пеньков для ${player.name}`);
           console.log(`🃏 [activatePenki] - Текущие карты:`, player.cards.map(c => `${c.image}(${c.open ? 'open' : 'closed'})`));
           console.log(`🃏 [activatePenki] - Пеньки:`, player.penki.map(c => `${c.image}(${c.open ? 'open' : 'closed'})`));
           
           // Открываем пеньки и переносим их в активные карты
           const activatedPenki = player.penki.map(card => ({
             ...card,
             open: true // Пеньки становятся открытыми когда переходят в руку
           }));
           
           // ИСПРАВЛЕНО: НЕ МУТИРУЕМ объект player, а создаем новый
           const newPlayers = [...players];
           newPlayers[playerIndex] = {
             ...player,
             cards: [...player.cards, ...activatedPenki],
             penki: [] // Очищаем пеньки
           };
           
           // Обновляем состояние с новым массивом игроков
           set({ players: newPlayers });
           
           console.log(`🃏 [activatePenki] После активации карты игрока:`, newPlayers[playerIndex].cards.map(c => `${c.image}(${c.open ? 'open' : 'closed'})`));
           
           get().showNotification(`${player.name} активировал пеньки - продолжает играть во 2-й стадии!`, 'info', 5000);
           
           // БЕЗОПАСНАЯ ПРОВЕРКА условий победы и статуса "одна карта" с небольшой задержкой
           setTimeout(() => {
             get().checkVictoryCondition();
             get().checkOneCardStatus();
           }, 100);
         },
         
         // Проверка условий победы и поражения с усиленной диагностикой
         checkVictoryCondition: () => {
           const { players, isGameActive } = get();
           
           // ИСПРАВЛЕНО: Проверяем что игра активна
           if (!isGameActive) {
             console.log(`🏆 [checkVictoryCondition] ⚠️ Игра не активна - пропускаем проверку`);
             return;
           }
           
           // ДОПОЛНИТЕЛЬНАЯ ПРОВЕРКА: Не завершаем игру если она только началась
           if (players.length === 0) {
             console.log(`🏆 [checkVictoryCondition] ⚠️ Нет игроков - пропускаем проверку`);
             return;
           }
           
           const { gameStage } = get();
           
           // КРИТИЧЕСКИ ВАЖНО: Не завершаем игру в первой стадии (раскладка карт)
           if (gameStage === 1) {
             console.log(`🏆 [checkVictoryCondition] ⚠️ Первая стадия (раскладка) - победа невозможна, пропускаем проверку`);
             return;
           }
           
           console.log(`🏆 [checkVictoryCondition] ===== ДЕТАЛЬНАЯ ДИАГНОСТИКА ИГРОКОВ =====`);
           
           // 1. Ищем игроков без карт (ни открытых, ни пеньков) - ПОБЕДИТЕЛИ
           const winners: Player[] = [];
           const playersWithCards: Player[] = [];
           
           players.forEach(player => {
             const openCardsCount = player.cards.filter(c => c.open).length;
             const closedCardsCount = player.cards.filter(c => !c.open).length;
             const penkiCount = player.penki.length;
             const totalCards = player.cards.length + player.penki.length;
             
             console.log(`🏆 [checkVictoryCondition] Игрок ${player.name}:`);
             console.log(`🏆 [checkVictoryCondition] - Открытые карты: ${openCardsCount}`);
             console.log(`🏆 [checkVictoryCondition] - Закрытые карты: ${closedCardsCount}`);
             console.log(`🏆 [checkVictoryCondition] - Пеньки: ${penkiCount}`);
             console.log(`🏆 [checkVictoryCondition] - ВСЕГО карт: ${totalCards}`);
             console.log(`🏆 [checkVictoryCondition] - Карты игрока:`, player.cards.map(c => `${c.image}(${c.open ? 'open' : 'closed'})`));
             console.log(`🏆 [checkVictoryCondition] - Пеньки игрока:`, player.penki.map(c => c.image));
             
             // ИСПРАВЛЕНО: Игрок побеждает только если у него НЕТ карт вообще
             if (totalCards === 0) {
               console.log(`🏆 [checkVictoryCondition] ✅ ${player.name} - ПОБЕДИТЕЛЬ (нет карт)!`);
               winners.push(player);
             } else {
               console.log(`🏆 [checkVictoryCondition] ⏳ ${player.name} - еще играет (${totalCards} карт)`);
               playersWithCards.push(player);
             }
           });
           
           console.log(`🏆 [checkVictoryCondition] ===== ИТОГИ ПРОВЕРКИ =====`);
           console.log(`🏆 [checkVictoryCondition] - Победители: ${winners.map(w => w.name).join(', ') || 'НЕТ'}`);
           console.log(`🏆 [checkVictoryCondition] - Игроки с картами: ${playersWithCards.map(p => `${p.name}(${p.cards.length + p.penki.length})`).join(', ')}`);
           
           // 2. ИСПРАВЛЕНО: Завершаем игру только если есть РЕАЛЬНЫЙ победитель
           if (winners.length === 1 && playersWithCards.length >= 1) {
             const winner = winners[0];
             const isUserWinner = winner.isUser;
             
             console.log(`🎉 [checkVictoryCondition] ИГРА ЗАВЕРШЕНА! Победитель: ${winner.name}`);
             
             get().showNotification(`🎉 ПОБЕДИТЕЛЬ: ${winner.name}!`, 'success', 8000);
             
             // Определяем проигравшего если остался только один с картами
             if (playersWithCards.length === 1) {
               const loser = playersWithCards[0];
               const totalCardsLeft = loser.cards.length + loser.penki.length;
               setTimeout(() => {
                 get().showNotification(`💸 ПРОИГРАВШИЙ: ${loser.name} (осталось ${totalCardsLeft} карт)`, 'error', 8000);
               }, 2000);
             }
             
             // Обновляем статистику
             const { stats } = get();
             set({
               isGameActive: false,
               stats: {
                 ...stats,
                 gamesPlayed: stats.gamesPlayed + 1,
                 gamesWon: isUserWinner ? stats.gamesWon + 1 : stats.gamesWon,
                 totalScore: stats.totalScore + (isUserWinner ? 100 : 0),
                 bestScore: isUserWinner ? Math.max(stats.bestScore, 100) : stats.bestScore
               }
             });
             
             setTimeout(() => {
               get().showNotification(
                 isUserWinner ? '🎉 Поздравляем с победой!' : '😔 В следующий раз повезет!', 
                 isUserWinner ? 'success' : 'info',
                 5000
               );
             }, 4000);
           }
           // 3. Несколько игроков без карт одновременно - ничья
           else if (winners.length > 1) {
             console.log(`🤝 [checkVictoryCondition] НИЧЬЯ! Победители: ${winners.map(w => w.name).join(', ')}`);
             
             const winnerNames = winners.map(w => w.name).join(', ');
             const hasUserWinner = winners.some(w => w.isUser);
             
             get().showNotification(`🤝 НИЧЬЯ! Победители: ${winnerNames}`, 'success', 8000);
             
             // Обновляем статистику для ничьей
             const { stats } = get();
             set({
               isGameActive: false,
               stats: {
                 ...stats,
                 gamesPlayed: stats.gamesPlayed + 1,
                 gamesWon: hasUserWinner ? stats.gamesWon + 1 : stats.gamesWon,
                 totalScore: stats.totalScore + (hasUserWinner ? 50 : 0), // Меньше очков за ничью
                 bestScore: hasUserWinner ? Math.max(stats.bestScore, 50) : stats.bestScore
               }
             });
           }
           // 4. ИСПРАВЛЕНО: Никто не выиграл - игра продолжается (НОРМАЛЬНАЯ ситуация)
           else if (winners.length === 0) {
             console.log(`⏳ [checkVictoryCondition] ✅ Игра продолжается - никто не выиграл (нормально)`);
             // Ничего не делаем - игра продолжается нормально
           }
           // 5. Критическая ошибка - все игроки без карт
           else if (winners.length === players.length) {
             console.error(`🚨 [checkVictoryCondition] КРИТИЧЕСКАЯ ОШИБКА: Все игроки без карт!`);
             // Аварийное завершение
             set({ isGameActive: false });
             get().showNotification('Критическая ошибка игры - все игроки без карт!', 'error', 5000);
           }
           else {
             console.log(`⚠️ [checkVictoryCondition] Неожиданная ситуация: ${winners.length} победителей, ${playersWithCards.length} игроков с картами`);
           }
         },
         
         // ===== МЕТОДЫ ДЛЯ СИСТЕМЫ "ОДНА КАРТА!" И ШТРАФОВ =====
         
         // Проверка кому нужно объявлять "одна карта"
         checkOneCardStatus: () => {
           const { players, gameStage, oneCardDeclarations, oneCardTimers } = get();
           if (gameStage !== 2 && gameStage !== 3) return; // Только во 2-й и 3-й стадиях
           
           const currentTime = Date.now();
           const newOneCardTimers = { ...oneCardTimers };
           const newOneCardDeclarations = { ...oneCardDeclarations };
           const newPlayersWithOneCard: string[] = [];
           
           players.forEach(player => {
             const openCards = player.cards.filter(c => c.open);
             const totalCards = player.cards.length; // ИСПРАВЛЕНО: Общее количество карт
             
             console.log(`🔍 [checkOneCardStatus] ${player.name}: открытых=${openCards.length}, всего=${totalCards}`);
             
             // ИСПРАВЛЕНО: Проверяем есть ли у игрока ровно 1 ОБЩАЯ карта (не только открытые!)
             // Игрок должен объявлять "одна карта" когда у него остается всего 1 карта, независимо от того открытая она или нет
             if (totalCards === 1) {
               newPlayersWithOneCard.push(player.id);
               
               // Если игрок еще не объявил "одна карта" и у него нет таймера
               if (!oneCardDeclarations[player.id] && !oneCardTimers[player.id]) {
                 // Запускаем таймер на 5 секунд для объявления
                 newOneCardTimers[player.id] = currentTime + 5000; // 5 секунд на объявление
                 
                 console.log(`⏰ [checkOneCardStatus] У игрока ${player.name} всего 1 карта! Запущен таймер на объявление (до ${new Date(newOneCardTimers[player.id]).toLocaleTimeString()})`);
                 
                 // Уведомляем игрока (если это человек)
                 if (!player.isBot) {
                   get().showNotification(`⚠️ У вас осталась 1 карта! ОБЯЗАТЕЛЬНО нажмите "Одна карта!" в течение 5 секунд!`, 'warning', 5000);
                 }
                 
                 // ===== НОВАЯ МЕХАНИКА: БОТЫ АВТОМАТИЧЕСКИ СПРАШИВАЮТ "СКОЛЬКО КАРТ?" =====
                 // Планируем вопрос ботов через адаптивную задержку (2.545с + лаг)
                 get().scheduleBotAskHowManyCards(player.id);
                 
                 // ИСПРАВЛЕНО: Бот автоматически объявляет "ОДНА КАРТА!" через ТОЧНО 3.245 секунды
                 if (player.isBot) {
                   setTimeout(() => {
                     // Проверяем что бот всё ещё должен объявить (не был пойман)
                     const { oneCardDeclarations } = get();
                     if (!oneCardDeclarations[player.id]) {
                       // Сначала показываем сообщение от бота
                       get().showNotification(`🤖 ${player.name}: "ОДНА КАРТА!"`, 'info', 3000);
                       console.log(`🤖 [checkOneCardStatus] Бот ${player.name} объявляет через 3.245с: "ОДНА КАРТА!"`);
                       
                       // Затем делаем официальное объявление
                       setTimeout(() => {
                         get().declareOneCard(player.id);
                       }, 800); // Небольшая задержка после сообщения
                     } else {
                       console.log(`🤖 [checkOneCardStatus] Бот ${player.name} уже был пойман, не объявляем`);
                     }
                   }, 3245); // ТОЧНО 3.245 секунды для ботов
                 }
               }
             } else {
               // ИСПРАВЛЕНО: У игрока больше или меньше 1 ОБЩЕЙ карты - сбрасываем объявление и таймер
               if (oneCardDeclarations[player.id] || oneCardTimers[player.id]) {
                 console.log(`🔄 [checkOneCardStatus] У игрока ${player.name} теперь ${totalCards} карт - СБРАСЫВАЕМ объявление и таймер`);
                 delete newOneCardDeclarations[player.id];
                 delete newOneCardTimers[player.id];
               }
             }
           });
           
           // Обновляем состояние
           set({ 
             oneCardTimers: newOneCardTimers,
             oneCardDeclarations: newOneCardDeclarations,
             playersWithOneCard: newPlayersWithOneCard
           });
         },
         
         // Игрок объявляет "одна карта"
         declareOneCard: (playerId: string) => {
           const { players, oneCardDeclarations, oneCardTimers } = get();
           const player = players.find(p => p.id === playerId);
           if (!player) return;
           
           const openCards = player.cards.filter(c => c.open);
           
           // Проверяем что у игрока действительно 1 открытая карта
           if (openCards.length !== 1) {
             get().showNotification(`❌ ${player.name}: неправильное объявление! У вас ${openCards.length} карт`, 'error', 3000);
             return;
           }
           
           // Успешное объявление
           const newDeclarations = { ...oneCardDeclarations };
           const newTimers = { ...oneCardTimers };
           
           newDeclarations[playerId] = true;
           delete newTimers[playerId]; // Убираем таймер
           
           set({ 
             oneCardDeclarations: newDeclarations,
             oneCardTimers: newTimers
           });
           
           console.log(`✅ [declareOneCard] ${player.name} объявил "одна карта!" вовремя`);
           get().showNotification(`✅ ${player.name}: "ОДНА КАРТА!" объявлено вовремя`, 'success', 3000);
         },
         
        // Спросить "сколько карт?" у другого игрока
        askHowManyCards: (askerPlayerId: string, targetPlayerId: string) => {
          const { players, oneCardDeclarations, oneCardTimers } = get();
          const asker = players.find(p => p.id === askerPlayerId);
          const target = players.find(p => p.id === targetPlayerId);
          
          if (!asker || !target) return;
          
          // ПРАВИЛЬНО: Считаем только ОТКРЫТЫЕ карты (пеньки не в игре!)
          const targetOpenCards = target.cards.filter(c => c.open);
          const currentTime = Date.now();
          
          console.log(`❓ [askHowManyCards] ${asker.name} спрашивает у ${target.name} сколько карт`);
          console.log(`❓ [askHowManyCards] У ${target.name}: ${targetOpenCards.length} открытых карт (пеньки не считаются)`);
          console.log(`❓ [askHowManyCards] Таймер: ${oneCardTimers[targetPlayerId]}, текущее время: ${currentTime}`);
          console.log(`❓ [askHowManyCards] Объявил: ${oneCardDeclarations[targetPlayerId]}`);
          
          // Показываем только ОТКРЫТЫЕ карты
          get().showNotification(`📊 ${target.name} имеет ${targetOpenCards.length} открытых карт`, 'info', 4000);
           
          // ИСПРАВЛЕНО: ШТРАФНАЯ ПРОВЕРКА по ОБЩЕМУ количеству карт, не только открытых
          const targetTotalCards = target.cards.length;
          console.log(`🎯 [askHowManyCards] ${target.name}: открытых=${targetOpenCards.length}, всего=${targetTotalCards}`);
          
          if (targetTotalCards === 1) {
             const hasActiveTimer = oneCardTimers[targetPlayerId] && oneCardTimers[targetPlayerId] > currentTime;
             const hasExpiredTimer = oneCardTimers[targetPlayerId] && oneCardTimers[targetPlayerId] <= currentTime;
             const hasDeclared = oneCardDeclarations[targetPlayerId];
             
             console.log(`🎯 [askHowManyCards] Активный таймер: ${hasActiveTimer}, просроченный таймер: ${hasExpiredTimer}, объявил: ${hasDeclared}`);
             
             if ((hasActiveTimer || hasExpiredTimer) && !hasDeclared) {
               // ШТРАФ! Игрок должен был объявить, но не объявил
               console.log(`💸 [askHowManyCards] ⚠️ ШТРАФ! ${target.name} должен был объявить "одна карта!", но не объявил`);
               
               get().showNotification(`💸 ШТРАФ! ${target.name} забыл объявить "одна карта!" - получает ЗАКРЫТЫЕ штрафные карты!`, 'error', 5000);
               
               // Запускаем процесс штрафа - игроки сами выбирают карты
               get().startPenaltyProcess(targetPlayerId);
             } else if (hasDeclared) {
               console.log(`✅ [askHowManyCards] ${target.name} объявил "одна карта" вовремя`);
               get().showNotification(`✅ ${target.name} объявил "одна карта" вовремя - штрафа нет`, 'success', 3000);
             } else if (!hasActiveTimer && !hasExpiredTimer) {
               console.log(`ℹ️ [askHowManyCards] У ${target.name} не было таймера - штрафа нет`);
               get().showNotification(`ℹ️ У ${target.name} не было обязательства объявлять - штрафа нет`, 'info', 3000);
             }
           }
         },
         
         // Начать процесс штрафа - каждый игрок должен выбрать карту
         startPenaltyProcess: (forgetfulPlayerId: string) => {
           const { players } = get();
           const forgetfulPlayer = players.find(p => p.id === forgetfulPlayerId);
           if (!forgetfulPlayer) return;
           
           // Определяем кто должен отдать карты (все кроме штрафуемого)
           const contributorsNeeded = players
             .filter(p => p.id !== forgetfulPlayerId && p.cards.filter(c => c.open).length > 0)
             .map(p => p.id);
           
           if (contributorsNeeded.length === 0) {
             get().showNotification(`⚠️ Никто не может скинуть карты ${forgetfulPlayer.name}`, 'warning', 3000);
             return;
           }
           
           console.log(`💸 [startPenaltyProcess] Начинаем штраф для ${forgetfulPlayer.name}, участники: ${contributorsNeeded.length}`);
           
           // Устанавливаем ожидающий штраф
           set({ 
             pendingPenalty: {
               targetPlayerId: forgetfulPlayerId,
               contributorsNeeded: [...contributorsNeeded]
             }
           });
           
           get().showNotification(`💸 Игроки должны выбрать карты для штрафа ${forgetfulPlayer.name}!`, 'warning', 7000);
           
           // Для ботов - автоматически выбираем худшие карты с задержкой
           contributorsNeeded.forEach((playerId, index) => {
             const player = players.find(p => p.id === playerId);
             if (player?.isBot) {
               setTimeout(() => {
                 const openCards = player.cards.filter(c => c.open);
                 const worstCard = get().findWorstCardInHand(openCards, get().trumpSuit);
                 if (worstCard) {
                   console.log(`🤖 [startPenaltyProcess] Бот ${player.name} автоматически выбирает худшую карту для штрафа`);
                   get().contributePenaltyCard(playerId, worstCard.id);
                 }
               }, (index + 1) * 1000); // Боты отдают карты с задержкой (УСКОРЕНО)
             }
           });
         },
         
         // Игрок отдает карту за штраф
         contributePenaltyCard: (contributorId: string, cardId: string) => {
           const { players, pendingPenalty } = get();
           if (!pendingPenalty) return;
           
           const contributor = players.find(p => p.id === contributorId);
           const targetPlayer = players.find(p => p.id === pendingPenalty.targetPlayerId);
           if (!contributor || !targetPlayer) return;
           
           // Находим карту у отдающего игрока
           const cardIndex = contributor.cards.findIndex(c => c.id === cardId);
           if (cardIndex === -1) return;
           
           const card = contributor.cards[cardIndex];
           if (!card.open) {
             get().showNotification(`❌ Можно отдавать только открытые карты!`, 'error', 3000);
             return;
           }
           
           console.log(`💸 [contributePenaltyCard] ${contributor.name} отдает карту ${card.image} игроку ${targetPlayer.name}`);
           console.log(`💸 [contributePenaltyCard] ДО: ${targetPlayer.name} имеет ${targetPlayer.cards.length} карт (${targetPlayer.cards.filter(c => c.open).length} открытых)`);
           
           // Создаем новое состояние
           const newPlayers = players.map(player => ({ ...player, cards: [...player.cards] }));
           const contributorIndex = newPlayers.findIndex(p => p.id === contributorId);
           const targetIndex = newPlayers.findIndex(p => p.id === pendingPenalty.targetPlayerId);
           
           // Убираем карту у отдающего
           newPlayers[contributorIndex].cards.splice(cardIndex, 1);
           
           // ИСПРАВЛЕНО: Штрафные карты передаются в ОТКРЫТОМ виде (ими можно играть)!
           const penaltyCard = { ...card, open: true };
           newPlayers[targetIndex].cards.push(penaltyCard);
           
           console.log(`💸 [contributePenaltyCard] ПОСЛЕ: ${newPlayers[targetIndex].name} имеет ${newPlayers[targetIndex].cards.length} карт (${newPlayers[targetIndex].cards.filter(c => c.open).length} открытых)`);
           console.log(`💸 [contributePenaltyCard] Добавленная карта: ${penaltyCard.image} (open: ${penaltyCard.open})`);
           
           // Убираем игрока из списка ожидающих
           const newContributorsNeeded = pendingPenalty.contributorsNeeded.filter(id => id !== contributorId);
           
           let newPendingPenalty = null;
           if (newContributorsNeeded.length > 0) {
             newPendingPenalty = {
               ...pendingPenalty,
               contributorsNeeded: newContributorsNeeded
             };
           }
           
           // Обновляем состояние с принудительным обновлением
           set({ 
             players: newPlayers,
             pendingPenalty: newPendingPenalty
           });
           
           // КРИТИЧНО: Принудительно обновляем состояние для React
           setTimeout(() => {
             const currentPlayers = get().players;
             set({ players: [...currentPlayers] });
             
             // ВАЖНО: Обновляем статус "одна карта" после обновления состояния
             get().checkOneCardStatus();
           }, 100);
           
           get().showNotification(`✅ ${contributor.name} скинул карту штрафа!`, 'success', 2000);
           
           // Если все отдали карты - завершаем штраф
           if (newContributorsNeeded.length === 0) {
             console.log(`💸 [contributePenaltyCard] Штраф завершен для ${targetPlayer.name}`);
             
             // Сбрасываем данные об объявлениях
             const { oneCardDeclarations, oneCardTimers } = get();
             const newDeclarations = { ...oneCardDeclarations };
             const newTimers = { ...oneCardTimers };
             delete newDeclarations[pendingPenalty.targetPlayerId];
             delete newTimers[pendingPenalty.targetPlayerId];
             
             set({ 
               oneCardDeclarations: newDeclarations,
               oneCardTimers: newTimers
             });
             
             get().showNotification(`💸 ${targetPlayer.name} получил штрафные карты за забывчивость!`, 'error', 4000);
             
             // Проверяем статус "одна карта" - ВАЖНО: обновляем после изменения карт
             setTimeout(() => {
               const finalPlayers = get().players;
               const finalTarget = finalPlayers.find(p => p.id === pendingPenalty.targetPlayerId);
               console.log(`💸 [contributePenaltyCard] ИТОГО: ${finalTarget?.name} имеет ${finalTarget?.cards.length} карт (${finalTarget?.cards.filter(c => c.open).length} открытых)`);
               
               get().checkOneCardStatus();
               
               // КРИТИЧНО: Принудительно обновляем состояние для синхронизации UI
               const updatedPlayers = get().players;
               set({ players: [...updatedPlayers] });
             }, 1000);
           }
         },
         
         // Отменить штраф (если что-то пошло не так)
         cancelPenalty: () => {
           set({ pendingPenalty: null });
           get().showNotification(`❌ Штраф отменен`, 'info', 2000);
         },
         
         // Найти худшую карту в руке для скидывания
         findWorstCardInHand: (cards: Card[], trumpSuit: string | null) => {
           if (cards.length === 0) return null;
           
           // Приоритет плохих карт:
           // 1. Некозырные карты низкого ранга (2-7)
           // 2. Козыри низкого ранга (если нет некозырных)
           // 3. Любая самая низкая карта
           
           const nonTrumpCards = cards.filter(c => trumpSuit && get().getCardSuit(c.image || '') !== trumpSuit);
           const trumpCards = cards.filter(c => trumpSuit && get().getCardSuit(c.image || '') === trumpSuit);
           
           // Сначала ищем плохие некозырные карты
           if (nonTrumpCards.length > 0) {
             const lowNonTrumpCards = nonTrumpCards.filter(c => {
               const rank = get().getCardRank(c.image || '');
               return rank <= 7; // 2, 3, 4, 5, 6, 7 - плохие карты
             });
             
             if (lowNonTrumpCards.length > 0) {
               // Возвращаем самую низкую некозырную карту
               return lowNonTrumpCards.reduce((worst, card) => {
                 const worstRank = get().getCardRank(worst.image || '');
                 const cardRank = get().getCardRank(card.image || '');
                 return cardRank < worstRank ? card : worst;
               });
             }
             
             // Возвращаем любую некозырную карту (самую низкую)
             return nonTrumpCards.reduce((worst, card) => {
               const worstRank = get().getCardRank(worst.image || '');
               const cardRank = get().getCardRank(card.image || '');
               return cardRank < worstRank ? card : worst;
             });
           }
           
           // Если некозырных карт нет, берем самый низкий козырь
           if (trumpCards.length > 0) {
             return trumpCards.reduce((worst, card) => {
               const worstRank = get().getCardRank(worst.image || '');
               const cardRank = get().getCardRank(card.image || '');
               return cardRank < worstRank ? card : worst;
             });
           }
           
           // В крайнем случае - самую низкую карту из всех
           return cards.reduce((worst, card) => {
             const worstRank = get().getCardRank(worst.image || '');
             const cardRank = get().getCardRank(card.image || '');
             return cardRank < worstRank ? card : worst;
           });
         },
         
         // ===== МУЛЬТИПЛЕЕР МЕТОДЫ =====
         
         // Синхронизация состояния игры от сервера
         syncGameState: (remoteGameState) => {
           const { multiplayerData } = get();
           if (!multiplayerData) return;
           
           console.log(`🌐 [Multiplayer] Синхронизация состояния игры:`, remoteGameState);
           
           // Осторожно обновляем состояние, проверяя каждое поле
           const stateUpdates: any = {};
           
           // Синхронизируем базовые поля игры
           if (remoteGameState.gameStage !== undefined) stateUpdates.gameStage = remoteGameState.gameStage;
           if (remoteGameState.currentPlayerId !== undefined) stateUpdates.currentPlayerId = remoteGameState.currentPlayerId;
           if (remoteGameState.trumpSuit !== undefined) stateUpdates.trumpSuit = remoteGameState.trumpSuit;
           if (remoteGameState.tableStack !== undefined) stateUpdates.tableStack = [...remoteGameState.tableStack];
           if (remoteGameState.stage2TurnPhase !== undefined) stateUpdates.stage2TurnPhase = remoteGameState.stage2TurnPhase;
           
           // Синхронизируем игроков (осторожно, не перезаписывая локального пользователя)
           if (remoteGameState.players && Array.isArray(remoteGameState.players)) {
             const { players } = get();
             const updatedPlayers = players.map(localPlayer => {
               const remotePlayer = remoteGameState.players.find((p: any) => p.id === localPlayer.id);
               if (remotePlayer && !localPlayer.isUser) {
                 // Обновляем данные бота/других игроков
                 return {
                   ...localPlayer,
                   cards: remotePlayer.cards || localPlayer.cards,
                   penki: remotePlayer.penki || localPlayer.penki
                 };
               }
               return localPlayer;
             });
             stateUpdates.players = updatedPlayers;
           }
           
           // Применяем обновления
           set(stateUpdates);
         },
         
         // Отправка хода игрока
         sendPlayerMove: (moveData) => {
           const { multiplayerData } = get();
           if (!multiplayerData) return;
           
           console.log(`🌐 [Multiplayer] Отправляем ход игрока:`, moveData);
           
           // TODO: Интегрироваться с WebSocket из useWebSocket
           // const { sendPlayerMove } = useWebSocket();
           // sendPlayerMove(moveData);
         },
         
         // Применение хода от удаленного игрока
         applyRemoteMove: (moveData) => {
           console.log(`🌐 [Multiplayer] Применяем удаленный ход:`, moveData);
           
           const { multiplayerData } = get();
           if (!multiplayerData) return;
           
           try {
             // Обрабатываем различные типы ходов
             switch (moveData.type) {
               case 'card_played':
                 // Применяем сыгранную карту
                 if (moveData.cardId && moveData.playerId) {
                   // TODO: Реализовать применение хода с картой
                 }
                 break;
                 
               case 'card_taken':
                 // Игрок взял карту
                 if (moveData.playerId) {
                   // TODO: Реализовать взятие карты
                 }
                 break;
                 
               case 'one_card_declared':
                 // Игрок объявил "одна карта"
                 if (moveData.playerId) {
                   get().declareOneCard(moveData.playerId);
                 }
                 break;
                 
               case 'penalty_card_contributed':
                 // Игрок отдал штрафную карту
                 if (moveData.contributorId && moveData.cardId) {
                   get().contributePenaltyCard(moveData.contributorId, moveData.cardId);
                 }
                 break;
                 
               default:
                 console.warn(`🌐 [Multiplayer] Неизвестный тип хода:`, moveData.type);
             }
           } catch (error) {
             console.error(`🌐 [Multiplayer] Ошибка применения удаленного хода:`, error);
           }
         },
         
         // ===== НОВЫЕ МЕТОДЫ ДЛЯ БОТОВ =====
         
         // Вычисляет адаптивную задержку в зависимости от производительности
         // ДЛЯ ИГРОКОВ: базовая задержка 2.545с для кнопки "Сколько карт?"
         calculateAdaptiveDelay: () => {
           const now = performance.now();
           const frameTime = now - (window as any).lastFrameTime || 16.67; // Время последнего кадра
           (window as any).lastFrameTime = now;
           
           // Базовая задержка: 2.545 секунды (ИГРОКИ)
           let delay = 2545;
           
           console.log(`🎯 [calculateAdaptiveDelay] Время кадра: ${frameTime.toFixed(2)}ms`);
           
           // Если FPS хуже 60 (frame time > 16.67ms), добавляем задержку
           if (frameTime > 16.67) {
             const lagMs = frameTime - 16.67;
             const lagIncrements = Math.floor(lagMs / 100); // За каждые 100ms лага
             const additionalDelay = lagIncrements * 1055; // Добавляем 1.055с
             delay += additionalDelay;
             
             console.log(`⏳ [calculateAdaptiveDelay] Лаг ${lagMs.toFixed(2)}ms, добавляем ${additionalDelay}ms задержки`);
           }
           
           console.log(`⌛ [calculateAdaptiveDelay] Итоговая задержка для ИГРОКОВ: ${delay}ms`);
           return delay;
         },
         
         // Планирует вопрос бота "сколько карт?" через адаптивную задержку
         scheduleBotAskHowManyCards: (targetPlayerId: string) => {
           const { players, oneCardDeclarations } = get();
           
           // Проверяем что цель действительно имеет 1 карту и не объявил
           const target = players.find(p => p.id === targetPlayerId);
           if (!target) return;
           
           const openCards = target.cards.filter(c => c.open);
           if (openCards.length !== 1) return; // Не 1 карта
           
           if (oneCardDeclarations[targetPlayerId]) {
             console.log(`🤖 [scheduleBotAskHowManyCards] ${target.name} уже объявил "одну карту", ботам спрашивать не нужно`);
             return; // Уже объявил
           }
           
           const delay = get().calculateAdaptiveDelay();
           
           console.log(`🤖 [scheduleBotAskHowManyCards] Планируем вопрос ботов к ${target.name} через ${delay}ms`);
           
           setTimeout(() => {
             // Проверяем что цель всё ещё не объявила "одну карту"
             const { players: currentPlayers, oneCardDeclarations: currentDeclarations } = get();
             
             if (currentDeclarations[targetPlayerId]) {
               console.log(`🤖 [scheduleBotAskHowManyCards] ${target.name} уже объявил, отменяем вопрос ботов`);
               return;
             }
             
             // Найдем случайного бота, который спросит
             const botPlayers = currentPlayers.filter(p => p.isBot && p.id !== targetPlayerId);
             
             if (botPlayers.length > 0) {
               const randomBot = botPlayers[Math.floor(Math.random() * botPlayers.length)];
               
               console.log(`🤖 [scheduleBotAskHowManyCards] Бот ${randomBot.name} спрашивает у ${target.name}: "Сколько карт?"`);
               
               get().askHowManyCards(randomBot.id, targetPlayerId);
               
               // Показываем уведомление от имени бота
               get().showNotification(`🤖 ${randomBot.name}: "Сколько карт у ${target.name}?"`, 'info', 3000);
             }
           }, delay);
         }
    }),
    {
      name: 'pidr-game-storage',
      // ИСПРАВЛЕНО: Сохраняем ВСЁ ИГРОВОЕ СОСТОЯНИЕ для восстановления после refresh
      partialize: (state) => ({
        // Основное игровое состояние
        isGameActive: state.isGameActive,
        gameMode: state.gameMode,
        currentRound: state.currentRound,
        maxRounds: state.maxRounds,
        players: state.players,
        currentPlayerId: state.currentPlayerId,
        deck: state.deck,
        playedCards: state.playedCards,
        lastPlayedCard: state.lastPlayedCard,
        
        // Состояние стадий P.I.D.R
        gameStage: state.gameStage,
        availableTargets: state.availableTargets,
        mustDrawFromDeck: state.mustDrawFromDeck,
        canPlaceOnSelf: state.canPlaceOnSelf,
        
        // Состояния хода
        turnPhase: state.turnPhase,
        revealedDeckCard: state.revealedDeckCard,
        canPlaceOnSelfByRules: state.canPlaceOnSelfByRules,
        skipHandAnalysis: state.skipHandAnalysis,
        
        // Вторая стадия
        lastDrawnCard: state.lastDrawnCard,
        lastPlayerToDrawCard: state.lastPlayerToDrawCard,
        trumpSuit: state.trumpSuit,
        drawnHistory: state.drawnHistory,
        
        // Система "Одна карта!" и штрафов
        oneCardDeclarations: state.oneCardDeclarations,
        oneCardTimers: state.oneCardTimers,
        playersWithOneCard: state.playersWithOneCard,
        pendingPenalty: state.pendingPenalty,
        
        // Состояние 2-й стадии (дурак)
        tableStack: state.tableStack,
        selectedHandCard: state.selectedHandCard,
        stage2TurnPhase: state.stage2TurnPhase,
        roundInProgress: state.roundInProgress,
        currentRoundInitiator: state.currentRoundInitiator,
        roundFinisher: state.roundFinisher,
        
        // Мультиплеер (опционально)
        multiplayerData: state.multiplayerData,
        
        // Статистика и настройки
        stats: state.stats,
        settings: state.settings,
        gameCoins: state.gameCoins
      })
    }
  )
)