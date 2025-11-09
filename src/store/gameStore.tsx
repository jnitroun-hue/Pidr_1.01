import React from 'react'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { createPlayers, generateAvatar } from '../lib/game/avatars'
import { calculateRatingRewards, calculatePlayerPositions } from '../lib/rating/ratingSystem'
import { RoomManager } from '../lib/multiplayer/room-manager'

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
  isWinner?: boolean // Является ли игрок победителем (для зрителей)
  finishTime?: number // ✅ Время выхода игрока (timestamp) для правильного определения мест
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

// Интерфейс для штрафной карты с информацией о том, кто её скинул
export interface PenaltyCard {
  card: Card
  contributorId: string
  contributorName: string
}

interface GameState {
  // Игровое состояние
  isGameActive: boolean
  gameMode: 'single' | 'multiplayer'
  players: Player[]
  currentPlayerId: string | null
  deck: Card[]
  playedCards: Card[]
  lastPlayedCard: Card | null
  
  // НОВАЯ МЕХАНИКА: Стопка штрафных карт
  penaltyDeck: PenaltyCard[]
  showPenaltyDeckModal: boolean // Показывать ли модалку штрафной стопки
  
  // Состояние для стадий игры P.I.D.R
  gameStage: 1 | 2 | 3 | 4 // 4 = завершение игры
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
  playersWithOneCard: string[] // Игроки у которых 1 карта (для проверки штрафов)
  pendingPenalty: {
    targetPlayerId: string | string[] // ✅ НОВОЕ: Может быть массив штрафников!
    contributorsNeeded: string[]
    contributorsCompleted: {[contributorId: string]: {[targetId: string]: string}} // ✅ НОВОЕ: contributorId -> {targetId -> cardId}
  } | null // Ожидающий штраф
  isGamePaused: boolean // ✅ НОВОЕ: Пауза игры при сборе штрафных карт
  
  // UI для выбора карты для штрафа
  showPenaltyCardSelection: boolean // Показать UI выбора карты для штрафа
  penaltyCardSelectionPlayerId: string | null // ID игрока который выбирает карту
  
  // Система рейтинга и результатов
  eliminationOrder: string[] // Порядок выбывания игроков (первый = последнее место)
  isRankedGame: boolean // Рейтинговая игра или нет
  statsUpdatedThisGame: boolean // ✅ Флаг: статистика уже обновлена за эту игру (защита от дублирования)
  showVictoryModal: boolean // Показывать ли модальное окно победы
  victoryData: {
    position: number;
    isWinner: boolean;
    playerName: string;
    totalPlayers?: number;
    gameMode: 'single' | 'multiplayer';
    isRanked?: boolean;
    ratingChange?: number;
    rewardsEarned?: number;
    rewards?: {
      experience: number;
      coins: number;
      ratingChange: number;
    };
  } | null
  
  // 🎉 МОДАЛКИ ПОБЕДИТЕЛЕЙ И ПРОИГРАВШЕГО
  showWinnerModal: boolean
  winnerModalData: { playerName: string; place: number; avatar?: string; isCurrentUser?: boolean } | null
  showLoserModal: boolean
  loserModalData: { playerName: string; avatar?: string } | null
  
  // 🏆 ФИНАЛЬНАЯ МОДАЛКА РЕЗУЛЬТАТОВ
  showGameResultsModal: boolean
  gameResults: Array<{
    place: number;
    name: string;
    avatar?: string;
    coinsEarned: number;
    ratingChange?: number;
    isUser: boolean;
  }> | null
  
  // Состояние 2-й стадии (дурак)
  tableStack: Card[] // Стопка карт на столе (нижняя = первая, верхняя = последняя)
  selectedHandCard: Card | null // Выбранная карта в руке (для двойного клика)
  stage2TurnPhase: 'selecting_card' | 'card_selected' | 'playing_card' | 'waiting_beat' | 'round_complete' // Фазы хода 2-й стадии
  
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
  startGame: (mode: 'single' | 'multiplayer', playersCount?: number, multiplayerConfig?: any, userInfo?: { avatar?: string; username?: string }) => Promise<void>
  endGame: () => void
  playCard: (cardId: string) => void
  drawCard: () => void
  nextTurn: () => void
  resetGame: () => void
  updatePlayerRewards: (experience: number, coins: number, ratingChange?: number) => Promise<void>
  
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
  calculateAndShowGameResults: () => void // Подсчёт и отображение финальных результатов
  
  // Методы для системы "Одна карта!" и штрафов
  checkOneCardStatus: () => void // Проверяет кому нужно объявлять "одна карта"
  declareOneCard: (playerId: string) => void // Игрок объявляет "одна карта"
  askHowManyCards: (askerPlayerId: string, targetPlayerId: string) => void // Спросить сколько карт
  startPenaltyProcess: (forgetfulPlayerIds: string | string[]) => void // ✅ НОВОЕ: Может принимать массив штрафников!
  contributePenaltyCard: (contributorId: string, cardId: string, targetId: string) => void // ✅ НОВОЕ: Указываем кому отдаем!
  cancelPenalty: () => void // Отменить штраф
  findWorstCardInHand: (cards: Card[], trumpSuit: string | null) => Card | null // Найти плохую карту
  
  // НОВЫЕ МЕТОДЫ ДЛЯ ШТРАФНОЙ СТОПКИ
  addCardToPenaltyDeck: (card: Card, contributorId: string, contributorName: string) => void // Добавить карту в штрафную стопку
  distributePenaltyCards: (targetPlayerId: string) => void // Раздать штрафные карты игроку
  togglePenaltyDeckModal: (show: boolean) => void // Открыть/закрыть модалку штрафной стопки
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

// ✅ НОВОЕ: Глобальный экземпляр RoomManager для мультиплеера
let roomManager: RoomManager | null = null;

// Создание Zustand стора с персистентностью
export const useGameStore = create<GameState>()(
  persist(
    (set, get) => ({
      // Начальное состояние
      isGameActive: false,
      gameMode: 'single',
      players: [],
      currentPlayerId: null,
      deck: [...DEFAULT_CARDS],
      playedCards: [],
      lastPlayedCard: null,
      
      // НОВАЯ МЕХАНИКА: Стопка штрафных карт
      penaltyDeck: [],
      showPenaltyDeckModal: false,
      
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
      playersWithOneCard: [],
      pendingPenalty: null,
      isGamePaused: false, // ✅ НОВОЕ: По умолчанию игра не на паузе
      
      // UI для выбора карты для штрафа
      showPenaltyCardSelection: false,
      penaltyCardSelectionPlayerId: null,
      
      // Система рейтинга и результатов
      eliminationOrder: [],
      isRankedGame: false,
      statsUpdatedThisGame: false, // ✅ Изначально не обновлена
      showVictoryModal: false,
      victoryData: null,
      
      // 🎉 МОДАЛКИ ПОБЕДИТЕЛЕЙ И ПРОИГРАВШЕГО
      showWinnerModal: false,
      winnerModalData: null,
      showLoserModal: false,
      loserModalData: null,
      
      // 🏆 ФИНАЛЬНАЯ МОДАЛКА РЕЗУЛЬТАТОВ
      showGameResultsModal: false,
      gameResults: null,
      
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
      startGame: async (mode, playersCount = 2, multiplayerConfig = null, userInfo = undefined) => {
        try {
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
        
        // ✅ ПРОВЕРЯЕМ ЧТО У НАС РОВНО 52 КАРТЫ!
        console.log(`🃏 [startGame] ПРОВЕРКА КОЛОДЫ: ${standardDeck.length} карт`);
        if (standardDeck.length !== 52) {
          console.error(`❌ [startGame] ОШИБКА! В колоде ${standardDeck.length} карт вместо 52!`);
        }
        
        // Перемешиваем колоду
        const shuffledImages = [...standardDeck].sort(() => Math.random() - 0.5);
        console.log(`🔀 [startGame] Колода перемешана: ${shuffledImages.length} карт`);
        
        const players: Player[] = []
        const cardsPerPlayer = 3;
        
        // ЗАГРУЖАЕМ данные реального игрока из БД
        let userAvatar = '';
        let userName = 'Игрок';
        
        try {
          const response = await fetch('/api/auth', { credentials: 'include' });
          if (response.ok) {
            const result = await response.json();
            if (result.success && result.user) {
              userAvatar = result.user.avatar_url || result.user.avatar || '';
              userName = result.user.username || 'Игрок';
            }
          }
        } catch (error) {
          console.error('❌ Ошибка загрузки игрока:', error);
        }
        
        const playerInfos = createPlayers(playersCount, 0, userAvatar, userName);
        
        for (let i = 0; i < playersCount; i++) {
          const playerInfo = playerInfos[i];
          
          if (!playerInfo) {
            throw new Error(`Не удалось создать информацию для игрока ${i + 1}`);
          }
          
          const playerOpenCards: Card[] = []; // Открытые карты (для 1-й стадии)
          const playerPenki: Card[] = []; // Пеньки (2 закрытые карты для 3-й стадии!)
          
          // Раздаем 3 карты каждому игроку
          for (let j = 0; j < cardsPerPlayer; j++) {
            const cardIndex = i * cardsPerPlayer + j;
            const imageName = shuffledImages[cardIndex];
            
            const card: Card = {
              id: `card_${Date.now()}_${i}_${j}_${Math.random().toString(36).substr(2, 9)}`, // ✅ УНИКАЛЬНЫЙ ID
              type: 'normal',
              title: `Карта ${j + 1}`,
              description: '',
              image: imageName,
              rarity: 'common',
              rank: get().getCardRank(imageName),
              open: false, // Пока все закрыты
            };
            
            if (j < 2) {
              // Первые 2 карты = ПЕНЬКИ (закрытые, для 3-й стадии!)
              playerPenki.push(card);
            } else {
              // Последняя карта = открытая карта для 1-й стадии
              card.open = true;
              playerOpenCards.push(card);
            }
          }
          
          const newPlayer: Player = {
            id: `player_${i + 1}`,
            name: playerInfo.name,
            avatar: playerInfo.avatar,
            score: 0,
            cards: playerOpenCards, // 1 открытая карта для 1-й стадии
            penki: playerPenki, // 2 пеньки (для 3-й стадии!)
            playerStage: 1 as 1, // Все начинают с 1-й стадии
            isCurrentPlayer: i === 0,
            isUser: !playerInfo.isBot,
            isBot: playerInfo.isBot,
            difficulty: playerInfo.difficulty
          };
          
          console.log(`🎴 [startGame] Создан ${newPlayer.isBot ? 'бот' : 'игрок'} ${newPlayer.name}: ${newPlayer.cards.length} карт в руке, ${newPlayer.penki.length} пеньков`);
          
          players.push(newPlayer);
        }
        
        // Оставшиеся карты в колоде
        const remainingCards: Card[] = shuffledImages.slice(playersCount * cardsPerPlayer).map((imageName, index) => ({
          id: `deck_${Date.now()}_${index}_${Math.random().toString(36).substr(2, 9)}`, // ✅ УНИКАЛЬНЫЙ ID
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
          // ✅ СБРАСЫВАЕМ ФЛАГИ СТАТИСТИКИ И РЕЗУЛЬТАТОВ
          statsUpdatedThisGame: false, // ✅ Новая игра = статистика не обновлена
          eliminationOrder: [],
          oneCardDeclarations: {},
          playersWithOneCard: [],
          pendingPenalty: null,
          isGamePaused: false, // ✅ НОВОЕ: Сбрасываем паузу
          // ✅ КРИТИЧНО: СБРАСЫВАЕМ ВСЕ МОДАЛКИ ПОБЕДЫ/ПОРАЖЕНИЯ!
          showWinnerModal: false,
          winnerModalData: null,
          showLoserModal: false,
          loserModalData: null,
          showGameResultsModal: false,
          gameResults: [],
          // Устанавливаем мультиплеер данные
          multiplayerData: mode === 'multiplayer' && multiplayerConfig ? {
            roomId: multiplayerConfig.roomId,
            roomCode: multiplayerConfig.roomCode,
            isHost: multiplayerConfig.isHost,
            connectedPlayers: multiplayerConfig.players?.map((p: any) => p.id) || []
          } : null
        });
        
        get().showNotification(`Игра начата! Ходит первым: ${players[firstPlayerIndex].name}`, 'success');
        
        // Запускаем обработку хода первого игрока
        setTimeout(() => {
          get().processPlayerTurn(players[firstPlayerIndex].id);
        }, 500);
        
        } catch (error) {
          console.error('❌ Ошибка старта игры:', error);
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
        
        console.log(`🗑️ [playedCards] Добавляем карту в БИТО: ${playedCard.image}. Было: ${playedCards.length}, Стало: ${newPlayedCards.length}`);
        
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
          const { players, currentPlayerId, gameStage } = get()
          
          if (!players || players.length === 0) {
            console.error(`🔄 [nextTurn] ❌ Нет игроков для передачи хода`);
            return;
          }
          
          if (!currentPlayerId) {
            console.error(`🔄 [nextTurn] ❌ Нет текущего игрока для передачи хода`);
            return;
          }
          
          const currentPlayer = players.find(p => p.id === currentPlayerId);
          const currentPlayerName = currentPlayer?.name || currentPlayerId;
          // ✅ ОПТИМИЗАЦИЯ: Убрали лишний лог (слишком частый во 2-й стадии)
          // console.log(`🔄 [nextTurn] Передача хода от ${currentPlayerName}`);
          
          // ИСПРАВЛЕНО: Находим следующего АКТИВНОГО игрока (с картами или пеньками) ПО ЧАСОВОЙ СТРЕЛКЕ
          const activePlayers = players.filter(p => 
            (p.cards.length > 0 || p.penki.length > 0) && !p.isWinner
          ); // ТОЛЬКО ИГРОКИ С КАРТАМИ/ПЕНЬКАМИ И НЕ ПОБЕДИТЕЛИ
          
          if (activePlayers.length <= 1) {
            console.log(`🔄 [nextTurn] ⚠️ Осталось ${activePlayers.length} активных игроков - проверяем победу`);
            get().checkVictoryCondition();
            return;
          }
          
          // ✅ ИСПРАВЛЕНО: Если текущий игрок победитель, берем первого активного игрока
          let currentIndex = activePlayers.findIndex(p => p.id === currentPlayerId);
          
          if (currentIndex === -1) {
            // Текущий игрок стал победителем или вышел из игры - берем первого активного
            console.log(`🏆 [nextTurn] ${currentPlayerName} уже не активен - передаем ход первому активному игроку`);
            currentIndex = 0; // Начинаем с первого активного игрока
          }
          
          const nextIndex = (currentIndex + 1) % activePlayers.length
          const nextPlayerId = activePlayers[nextIndex].id
          const nextPlayer = activePlayers[nextIndex]
          
          if (!nextPlayer) {
            console.error(`🔄 [nextTurn] ❌ Следующий игрок не найден`);
            return;
          }
          
          // ✅ ОПТИМИЗАЦИЯ: Убрали лишний лог (слишком частый во 2-й стадии)
          // console.log(`🔄 [nextTurn] Ход переходит к ${nextPlayer.name} (индекс ${nextIndex}/${activePlayers.length} активных) - ПО ЧАСОВОЙ`);
          
          // Обновляем текущего игрока
          players.forEach(p => p.isCurrentPlayer = p.id === nextPlayerId)
        
        // Сбрасываем состояния хода только для 1-й стадии
        if (gameStage === 1) {
          get().resetTurnState();
        }
        
        set({
          players: [...players],
          currentPlayerId: nextPlayerId
        })
        
        get().showNotification(`Ход переходит к ${nextPlayer.name}`, 'info')
        
        // ✅ ОПТИМИЗАЦИЯ: Убрали лишний лог (слишком частый во 2-й стадии)
        // console.log(`🔄 [nextTurn] Запускаем processPlayerTurn для ${nextPlayer.name}`);
        
        // ИСПРАВЛЕНО: Проверяем активацию пеньков для ВСЕХ игроков при переходе хода
        if (gameStage === 2) {
          players.forEach(player => {
            get().checkStage3Transition(player.id);
          });
        }
        
        // ДОБАВЛЕНО: Проверяем условия победы после каждого хода
        get().checkVictoryCondition();
        
        // КРИТИЧНО: Проверяем статус "одна карта" при каждом переходе хода
        get().checkOneCardStatus();
        
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
          players: [],
          currentPlayerId: null,
          deck: [...DEFAULT_CARDS],
          playedCards: [],
          lastPlayedCard: null,
          selectedCard: null,
          penaltyDeck: []
        })
      },
      
      // Обновление наград игрока
      updatePlayerRewards: async (experience: number, coins: number, ratingChange?: number) => {
        try {
          const response = await fetch('/api/user/rewards', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ 
              experience, 
              coins, 
              ratingChange: ratingChange || 0 
            })
          });
          
          if (!response.ok) {
            console.error('❌ Ошибка обновления наград:', response.status);
          } else {
            const result = await response.json();
            console.log('✅ Награды обновлены:', result.rewards);
          }
        } catch (error) {
          console.error('❌ Ошибка API наград:', error);
        }
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
      
      // НОВЫЕ МЕТОДЫ ДЛЯ ШТРАФНОЙ СТОПКИ
      addCardToPenaltyDeck: (card, contributorId, contributorName) => {
        const { penaltyDeck } = get();
        console.log(`⚠️ [addCardToPenaltyDeck] ${contributorName} добавляет карту ${card.image} в штрафную стопку`);
        set({ 
          penaltyDeck: [...penaltyDeck, { card, contributorId, contributorName }] 
        });
      },
      
      togglePenaltyDeckModal: (show) => {
        set({ showPenaltyDeckModal: show });
      },
      
      distributePenaltyCards: (targetPlayerId) => {
        const { penaltyDeck, players, gameStage } = get();
        if (penaltyDeck.length === 0) {
          console.log(`⚠️ [distributePenaltyCards] Штрафная стопка пуста!`);
          return;
        }
        
        const targetPlayer = players.find(p => p.id === targetPlayerId);
        if (!targetPlayer) {
          console.log(`❌ [distributePenaltyCards] Игрок ${targetPlayerId} не найден!`);
          return;
        }
        
        console.log(`⚠️ [distributePenaltyCards] Раздаем ${penaltyDeck.length} штрафных карт игроку ${targetPlayer.name}`);
        console.log(`📊 [distributePenaltyCards] До штрафа: ${targetPlayer.name} имеет ${targetPlayer.cards.length} карт`);
        
        const newPlayers = players.map(player => {
          if (player.id === targetPlayerId) {
            // Добавляем все штрафные карты в руку
            // ✅ ИСПРАВЛЕНО: Во 2-й стадии ВСЕ карты открыты (open: true) для логики игры!
            // Визуальное отображение контролируется в UI
            const penaltyCardsForPlayer = penaltyDeck.map(penaltyCard => ({ 
              ...penaltyCard.card, // ✅ Извлекаем card из PenaltyCard
              open: true // ✅ Все карты открыты во 2-й стадии!
            }));
            const newCards = [...player.cards, ...penaltyCardsForPlayer];
            console.log(`📊 [distributePenaltyCards] После штрафа: ${player.name} будет иметь ${newCards.length} карт`);
            console.log(`🃏 [distributePenaltyCards] Добавленные карты:`, penaltyCardsForPlayer.map(c => c.image));
            return { ...player, cards: newCards };
          }
          return player;
        });
        
        // ✅ НОВАЯ ЛОГИКА: Очищаем штрафную стопку, сбрасываем штраф и ВОЗОБНОВЛЯЕМ ИГРУ!
        set({ 
          penaltyDeck: [], // ✅ ОЧИЩАЕМ ШТРАФНУЮ СТОПКУ!
          players: newPlayers,
          pendingPenalty: null, // ✅ СБРАСЫВАЕМ ШТРАФ!
          isGamePaused: false // ✅ ВОЗОБНОВЛЯЕМ ИГРУ!
        });
        
        console.log(`▶️ [distributePenaltyCards] ✅ ИГРА ВОЗОБНОВЛЕНА! (isGamePaused = false)`);
        
        // ✅ ПРОВЕРЯЕМ что карты действительно добавились
        setTimeout(() => {
          const updatedPlayer = get().players.find(p => p.id === targetPlayerId);
          if (updatedPlayer) {
            console.log(`✅ [distributePenaltyCards] ПРОВЕРКА: ${updatedPlayer.name} теперь имеет ${updatedPlayer.cards.length} карт`);
            console.log(`✅ [distributePenaltyCards] Карты в руке:`, updatedPlayer.cards.map(c => c.image));
          }
        }, 100);
        
        get().showNotification(
          `⚠️ ${targetPlayer.name} получил ${penaltyDeck.length} штрафных карт!`, 
          'warning', 
          3000
        );
        
        // КРИТИЧНО: Продолжаем игру после раздачи штрафа!
        // ✅ ПРАВИЛО: Ход продолжается с ТОГО ЖЕ ИГРОКА, который был до штрафа
        // Пауза 5 секунд для сбора карт, затем игра продолжается
        if (gameStage === 2) {
          const { currentPlayerId } = get();
          
          if (!currentPlayerId) {
            console.error(`❌ [distributePenaltyCards] Нет currentPlayerId!`);
            return;
          }
          
          const currentPlayer = get().players.find(p => p.id === currentPlayerId);
          if (!currentPlayer) {
            console.error(`❌ [distributePenaltyCards] Текущий игрок не найден!`);
            return;
          }
          
          console.log(`⏸️ [distributePenaltyCards] ПАУЗА 5 секунд для сбора штрафных карт...`);
          console.log(`🎮 [distributePenaltyCards] После паузы ход продолжит: ${currentPlayer.name}`);
          
          // Пауза 5 секунд, затем продолжаем с того же игрока
          setTimeout(() => {
            try {
              const state = get();
              const updatedPlayer = state.players.find(p => p.id === currentPlayerId);
              
              if (!updatedPlayer) {
                console.error(`❌ [distributePenaltyCards] Игрок ${currentPlayerId} не найден после паузы! Вызываем nextTurn()`);
                get().nextTurn();
                return;
              }
              
              console.log(`🔍 [distributePenaltyCards] ПРОВЕРКА после паузы:`, {
                playerName: updatedPlayer.name,
                isWinner: updatedPlayer.isWinner,
                cardsLength: updatedPlayer.cards.length,
                penkiLength: updatedPlayer.penki.length,
                gameStage: state.gameStage,
                currentPlayerId: state.currentPlayerId
              });
              
              const isActive = !updatedPlayer.isWinner && (updatedPlayer.cards.length > 0 || updatedPlayer.penki.length > 0);
              
              console.log(`🔍 [distributePenaltyCards] isActive = ${isActive}`);
              
              // ✅ КРИТИЧНО: ПРОВЕРЯЕМ СТАТУС "ОДНА КАРТА" ПОСЛЕ РАЗДАЧИ ШТРАФА!
              console.log(`🔍 [distributePenaltyCards] ПРОВЕРЯЕМ СТАТУС "ОДНА КАРТА" после штрафа...`);
              get().checkOneCardStatus();
              
              if (isActive && state.gameStage === 2) {
                console.log(`🎮 [distributePenaltyCards] Продолжаем ход игрока: ${updatedPlayer.name}`);
                console.log(`🔍 [distributePenaltyCards] ВЫЗЫВАЕМ processPlayerTurn(${currentPlayerId})`);
                
                // ✅ КРИТИЧНО: Сбрасываем фазу перед вызовом processPlayerTurn
                set({ stage2TurnPhase: 'selecting_card' });
                
            get().processPlayerTurn(currentPlayerId);
                console.log(`✅ [distributePenaltyCards] processPlayerTurn() ВЫЗВАН!`);
              } else {
                console.log(`⚠️ [distributePenaltyCards] Игрок ${updatedPlayer.name} больше не активен или игра не в стадии 2, ищем следующего...`);
                console.log(`🔍 [distributePenaltyCards] ВЫЗЫВАЕМ nextTurn()`);
                get().nextTurn();
                console.log(`✅ [distributePenaltyCards] nextTurn() ВЫЗВАН!`);
              }
            } catch (error) {
              console.error(`❌ [distributePenaltyCards] Ошибка при продолжении игры после штрафа:`, error);
              // Аварийный nextTurn в случае ошибки
              get().nextTurn();
            }
          }, 5000); // ✅ ПАУЗА 5 СЕКУНД
        }
        
        // ✅ ВАЖНО: Проверяем статус "одна карта" после раздачи штрафа
        // ПЕРЕНЕСЕНО ВНУТРЬ setTimeout (после паузы 5 секунд)!
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
        return rank;
      },
      
      // Поиск доступных целей для текущего хода
      findAvailableTargets: (currentPlayerId: string) => {
        const { players, gameStage } = get();
        const currentPlayer = players.find(p => p.id === currentPlayerId);
        if (!currentPlayer || currentPlayer.cards.length === 0) return [];
        
        // Берем верхнюю открытую карту игрока
        const topCard = currentPlayer.cards[currentPlayer.cards.length - 1];
        if (!topCard || !topCard.open) return [];
        
        const currentRank = get().getCardRank(topCard.image || '');
        
        // Определяем целевой ранг с учетом правил P.I.D.R. 1-й стадии
        // ПРАВИЛО: СТАРШАЯ карта бьет МЛАДШУЮ (ищем карту на 1 ранг НИЖЕ)
        // Туз(14) → Король(13), Король(13) → Дама(12), Дама(12) → Валет(11), ..., 3 → 2
        // ИСКЛЮЧЕНИЕ: Двойка (2) кладется ТОЛЬКО на Туз (14)!
        
        const targets: number[] = [];
        players.forEach((player, index) => {
          if (player.id === currentPlayerId) return;
          
          const playerTopCard = player.cards[player.cards.length - 1];
          if (playerTopCard && playerTopCard.open) {
            const playerRank = get().getCardRank(playerTopCard.image || '');
            
            // ДВОЙКА (2) кладется ТОЛЬКО на ТУЗ (14)!
            if (currentRank === 2 && playerRank === 14) {
              targets.push(index);
            }
            // Для остальных карт: старшая карта бьет карту на 1 ранг ниже
            else if (currentRank !== 2 && playerRank === currentRank - 1) {
              targets.push(index);
            }
          }
        });
        
        return targets;
      },
      
      // Проверка возможности сделать ход
      canMakeMove: (currentPlayerId: string) => {
        const targets = get().findAvailableTargets(currentPlayerId);
        return targets.length > 0;
      },
      
      // Выполнение хода (обновленная логика)
      makeMove: (targetPlayerId: string) => {
        const { players, currentPlayerId, revealedDeckCard, turnPhase, deck } = get();
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
        let newDeck = deck;
        let shouldCheckStage1End = false;
        
        // Определяем какую карту перемещаем
        if (revealedDeckCard && (turnPhase === 'waiting_target_selection' || turnPhase === 'waiting_deck_action')) {
          // Ходим картой из колоды
          cardToMove = revealedDeckCard;
          
          // Убираем карту из колоды
          newDeck = deck.slice(1);
          
          // Проверяем переход к стадии 2 после использования карты из колоды
          if (newDeck.length === 0) {
            console.log(`🃏 [makeMove] Колода пуста после хода - переходим к стадии 2!`);
            shouldCheckStage1End = true;
          }
        } else {
          // Ходим верхней картой из руки
          if (currentPlayer.cards.length === 0) return;
          
          // Берём верхнюю карту (последнюю в массиве)
          cardToMove = currentPlayer.cards[currentPlayer.cards.length - 1];
        }
        
        if (!cardToMove) return;
        
        // Запоминаем верхнюю карту цели ДО хода
        const targetTopCard = targetPlayer.cards[targetPlayer.cards.length - 1];
        
        // ГАРАНТИРУЕМ что карта открыта в 1-й стадии!
        cardToMove.open = true;
        
        // СОЗДАЁМ НОВЫЙ МАССИВ ИГРОКОВ с IMMUTABLE обновлениями!
        const newPlayers = players.map(p => {
          if (p.id === currentPlayerId && !revealedDeckCard) {
            // Убираем верхнюю карту у текущего игрока (если ходим из руки)
            return {
              ...p,
              cards: p.cards.slice(0, -1) // Убираем последнюю карту
            };
          } else if (p.id === targetPlayerId) {
            // Добавляем карту целевому игроку
            return {
              ...p,
              cards: [...p.cards, cardToMove!] // Добавляем карту!
            };
          }
          return p;
        });
        
        // Обновляем state ОДИН раз со всеми изменениями!
        set({ 
          players: newPlayers,
          deck: newDeck,
          revealedDeckCard: revealedDeckCard ? null : revealedDeckCard,
          lastDrawnCard: revealedDeckCard ? cardToMove : null,
          lastPlayerToDrawCard: revealedDeckCard ? currentPlayerId : null,
          turnPhase: revealedDeckCard ? 'turn_ended' : turnPhase,
          skipHandAnalysis: false // После хода на соперника - ВСЕГДА анализ руки
        });
        
        // Проверяем переход к стадии 2 ПОСЛЕ обновления state
        if (shouldCheckStage1End) {
          setTimeout(() => {
            get().checkStage1End();
          }, 1000);
        }
        
        // ЕДИНСТВЕННЫЙ ЛОГ ХОДА
        if (targetTopCard && targetTopCard.image) {
          console.log(`🎴 ${currentPlayer.name} положил ${cardToMove.image} на ${targetTopCard.image} (${targetPlayer.name})`);
        } else {
          console.log(`🎴 ${currentPlayer.name} положил ${cardToMove.image} на ${targetPlayer.name}`);
        }
        
        get().showNotification(`Карта переложена на ${targetPlayer.name}!`, 'success');
        
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
        
        console.log(`🎯 [checkStage1End] ✅ 1-я стадия завершена! Переход во 2-ю стадию...`);
        
        // Определяем козырь второй стадии
        const trumpSuit = get().determineTrumpSuit();

        console.log(`🎯 [checkStage1End] Козырь определен: ${trumpSuit || 'НЕТ'}`);
        
        // Определяем стартового игрока (последний взявший карту)
        const startingPlayerId = lastPlayerToDrawCard || players[0].id;

        console.log(`🎯 [checkStage1End] Стартовый игрок: ${players.find(p => p.id === startingPlayerId)?.name}`);
        
        // Обновляем текущего игрока и переводим всех во 2-ю стадию
        players.forEach(p => {
          p.isCurrentPlayer = p.id === startingPlayerId;
          p.playerStage = 2; // Все переходят во 2-ю стадию
          
          console.log(`🃏 [checkStage1End] ${p.name}: ${p.cards.length} карт в руке, ${p.penki.length} пеньков`);
          
          // ✅ ИСПРАВЛЕНО: ВСЕ карты во 2-й стадии - ОТКРЫТЫЕ (open: true)!
          p.cards = p.cards.map(card => ({
            ...card,
            open: true // ✅ ВСЕ карты открыты (для логики игры)
          }));
          
          // ✅ КРИТИЧНО: ОТКРЫВАЕМ ПЕНЬКИ при переходе во 2-ю стадию!
          // Если у игрока НЕТ открытых карт в руке, но ЕСТЬ пеньки - открываем их!
          if (p.cards.length === 0 && p.penki.length > 0) {
            console.log(`🔓 [checkStage1End] ОТКРЫВАЕМ ПЕНЬКИ для ${p.name}: ${p.penki.length} карт`);
            p.penki = p.penki.map(card => ({
              ...card,
              open: true
            }));
            // Перемещаем пеньки в руку для игры
            p.cards = [...p.penki];
            p.penki = [];
            p.playerStage = 3; // Сразу переходим в стадию 3
            console.log(`✅ [checkStage1End] ${p.name} теперь в стадии 3 с ${p.cards.length} картами`);
          }
          
          console.log(`✅ [checkStage1End] ${p.name}: ${p.cards.length} карт (open=true), ${p.penki.length} пеньков`)
        });
        
        set({ 
          gameStage: 2,
          availableTargets: [],
          canPlaceOnSelf: false,
          mustDrawFromDeck: false,
          trumpSuit: trumpSuit,
          currentPlayerId: startingPlayerId,
          players: [...players],
          // ✅ КРИТИЧНО: Очищаем штраф при переходе во 2-ю стадию
          pendingPenalty: null,
          showPenaltyCardSelection: false,
          penaltyCardSelectionPlayerId: null,
          oneCardDeclarations: {},
          playersWithOneCard: [],
          isGamePaused: false // ✅ НОВОЕ: Снимаем паузу при переходе в новую стадию
        });
        
        // Показываем уведомления
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
        }, 500);
        
        // ИНИЦИАЛИЗИРУЕМ 2-Ю СТАДИЮ И ЗАПУСКАЕМ ХОД
        setTimeout(() => {
          get().initializeStage2();
          
          // ✅ ВАЖНО: Проверяем статус "одна карта" после перехода во 2-ю стадию
          setTimeout(() => {
            get().checkOneCardStatus();
            console.log('✅ [checkStage1End] Проверка "одна карта" после перехода во 2-ю стадию');
          }, 200);
          
          // ✅ ИСПРАВЛЕНО: НЕ вызываем processPlayerTurn вручную!
          // AI useEffect автоматически сработает при изменении gameStage и currentPlayerId
          console.log(`🎮 [checkStage1End] Стадия 2 инициализирована, AI должен автоматически начать ход`);
        }, 800);
      },
      
      // Обработка хода игрока (НОВАЯ логика)
      processPlayerTurn: (playerId: string) => {
        const { gameStage, players, skipHandAnalysis, deck, stage2TurnPhase, currentPlayerId } = get();
        const currentPlayer = players.find(p => p.id === playerId);
        
        console.log(`🔍 [processPlayerTurn] ВЫЗВАН! playerId: ${playerId}, gameStage: ${gameStage}`);
        
        if (!currentPlayer) {
          console.error(`❌ [processPlayerTurn] Игрок ${playerId} не найден!`);
          return;
        }
        
        console.log(`🔍 [processPlayerTurn] Игрок: ${currentPlayer.name}, isBot: ${currentPlayer.isBot}, isWinner: ${currentPlayer.isWinner}`);
        
        // ИСПРАВЛЕНО: Обрабатываем 2-ю и 3-ю стадии одинаково (правила дурака)
        if (gameStage === 2 || gameStage === 3) {
          console.log(`🎮 [processPlayerTurn] Стадия ${gameStage}: ${currentPlayer.name} (${currentPlayer.cards.length} карт, ${currentPlayer.penki.length} пеньков)`);
          
          // ✅ КРИТИЧНО: СРАЗУ ПРОВЕРЯЕМ АКТИВАЦИЮ ПЕНЬКОВ!
          if (currentPlayer.cards.length === 0 && currentPlayer.penki.length > 0) {
            console.log(`🃏 [processPlayerTurn] У ${currentPlayer.name} нет карт, но есть пеньки - активируем!`);
            get().checkStage3Transition(playerId);
            // Перезапускаем ход после активации пеньков
            setTimeout(() => {
              get().processPlayerTurn(playerId);
            }, 300);
            return;
          }
          
          // ✅ КРИТИЧНО: Если у игрока нет карт и нет пеньков - передаем ход!
          if (currentPlayer.cards.length === 0 && currentPlayer.penki.length === 0) {
            console.log(`⚠️ [processPlayerTurn] У ${currentPlayer.name} нет карт и пеньков - передаем ход`);
            setTimeout(() => {
              get().nextTurn();
            }, 300);
            return;
          }
          
          // ✅ КРИТИЧНО: НЕ сбрасываем stage2TurnPhase если уже выбрана карта!
          // Это предотвращает race condition с AI ботами
          if (stage2TurnPhase === 'card_selected' && currentPlayerId === playerId) {
            console.log(`⚠️ [processPlayerTurn] Игрок ${currentPlayer.name} уже выбрал карту, не сбрасываем фазу`);
            return;
          }
          
          console.log(`🔍 [processPlayerTurn] Устанавливаем currentPlayerId: ${currentPlayer.id}, stage2TurnPhase: 'selecting_card'`);
          
            set({ 
              currentPlayerId: currentPlayer.id,
              stage2TurnPhase: 'selecting_card'
            });
          
          console.log(`✅ [processPlayerTurn] set() ВЫЗВАН! Состояние обновлено`);
          
          if (!currentPlayer.isBot) {
            get().showNotification(`${currentPlayer.name}: выберите карту для хода`, 'info', 5000);
            console.log(`✅ [processPlayerTurn] Уведомление показано для пользователя ${currentPlayer.name}`);
          } else {
            console.log(`🤖 [processPlayerTurn] Бот ${currentPlayer.name} должен сейчас сделать ход через AI (управляется внешними компонентами)`);
          }
          // Примечание: AI для ботов в стадии 2 управляется через внешние компоненты (ViktorAI и др.)
          return;
        }
        
        if (gameStage !== 1) return;
        
        const openCards = currentPlayer.cards.filter(c => c.open);
        
        // ЭТАП 1: Анализ руки (ТОЛЬКО если не пропускаем)
        if (!skipHandAnalysis && currentPlayer.cards.length > 0) {
          if (get().canMakeMove(playerId)) {
            const targets = get().findAvailableTargets(playerId);

            set({ 
              availableTargets: targets,
              turnPhase: 'analyzing_hand'
            });
            
            if (currentPlayer.isBot) {
              if (targets.length > 0) {
                const targetIndex = targets[0];
                const targetPlayer = players[targetIndex];
                setTimeout(() => {
                  try {
                    get().makeMove(targetPlayer?.id || '');
                  } catch (error) {
                    console.error(`🚨 Ошибка хода бота:`, error);
                  }
                }, 800);
              } else {
                setTimeout(() => get().nextTurn(), 1000);
              }
            } else if (!currentPlayer.isBot) {
              get().showNotification(`${currentPlayer.name}: выберите карту для хода`, 'info');
            }
            return;
          } else {
            set({ 
              availableTargets: [],
              canPlaceOnSelf: false,
              turnPhase: 'showing_deck_hint'
            });
            
            if (currentPlayer.isBot) {
              setTimeout(() => {
                get().onDeckClick();
              }, 500);
            } else if (!currentPlayer.isBot) {
              get().showNotification(`${currentPlayer.name}: нет ходов из руки, кликните на колоду`, 'warning');
            }
            return;
          }
        } else if (skipHandAnalysis) {
          set({ skipHandAnalysis: false });
        }
        
        // ЭТАП 2: Работа с колодой
        if (deck.length === 0) {
          get().checkStage1End();
          return;
        }
        
        set({ turnPhase: 'showing_deck_hint' });
        
        if (currentPlayer.isBot) {
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
        }
        
        // АВТОМАТИЧЕСКИ кладем на себя если можно по правилам И НЕТ ходов на соперников
        if (!canMoveToOpponents && canPlaceOnSelfByRules) {
          set({
            turnPhase: 'waiting_deck_action',
            canPlaceOnSelfByRules: true,
            availableTargets: []
          });
          setTimeout(() => {
            get().placeCardOnSelfByRules();
          }, currentPlayer.isBot ? 1200 : 800);
          return;
        }
        
        // АВТОМАТИЧЕСКИ берем карту если НЕТ ХОДОВ ВООБЩЕ
        if (!canMoveToOpponents && !canPlaceOnSelfByRules) {
          set({
            turnPhase: 'waiting_deck_action',
            canPlaceOnSelfByRules: false,
            availableTargets: []
          });
          setTimeout(() => {
            get().takeCardNotByRules();
          }, currentPlayer.isBot ? 1200 : 800);
          return;
        }
        
        set({
          turnPhase: 'waiting_deck_action',
          canPlaceOnSelfByRules: canPlaceOnSelfByRules,
          availableTargets: canMoveToOpponents ? deckTargets : []
        });
        
        // Для ботов - автоматически принимаем решение (только если есть ходы)
        if (currentPlayer.isBot && canMoveToOpponents) {
          setTimeout(() => {
            const targetIndex = deckTargets[0];
            const targetPlayer = players[targetIndex];
            get().makeMove(targetPlayer?.id || '');
          }, 1500);
        } else if (!currentPlayer.isBot && canMoveToOpponents) {
          // Для игрока - показываем что нужно КЛИКНУТЬ по карте
          get().showNotification('✓ Кликните по открытой карте чтобы сходить', 'info');
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
         
        return true;
       },
       

       
             // Проверка возможности положить карту из колоды на себя по правилам
      canPlaceCardOnSelf: (deckCard: Card, playerTopCard: Card) => {
        if (!deckCard.image || !playerTopCard.image) return false;
        
        const deckRank = get().getCardRank(deckCard.image);
        const playerRank = get().getCardRank(playerTopCard.image);
        
        // ДВОЙКА (2) кладется ТОЛЬКО на ТУЗ (14)!
        if (deckRank === 2) {
          return playerRank === 14;
        }
        
        // ПРАВИЛЬНАЯ ЛОГИКА: Карта из колоды может лечь на карту игрока, если она на 1 ранг БОЛЬШЕ
        // Пример: 5♠ (deckRank=5) может лечь на 4♣ (playerRank=4)
        return deckRank === (playerRank + 1);
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
          const targets: number[] = [];
          
          players.forEach((player, index) => {
            if (player.id === currentPlayerId) return; // Не можем положить на себя
            
            // Проверяем верхнюю карту игрока
            const playerTopCard = player.cards[player.cards.length - 1];
            if (playerTopCard && playerTopCard.open && playerTopCard.image) {
              const playerRank = get().getCardRank(playerTopCard.image);
              
              // ДВОЙКА (2) кладется ТОЛЬКО на ТУЗ (14)!
              if (deckRank === 2 && playerRank === 14) {
                targets.push(index);
              }
              // Для остальных карт: старшая карта бьет карту на 1 ранг ниже
              else if (deckRank !== 2 && playerRank === deckRank - 1) {
                targets.push(index);
              }
            }
          });
          
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
           
           console.log(`🎯 [calculateRoundFinisher] Инициатор: ${players[initiatorIndex].name} (индекс ${initiatorIndex})`);
          
          // ✅ КРИТИЧНО: Ищем ПЕРВОГО АКТИВНОГО игрока ПЕРЕД инициатором
          // Пропускаем игроков которые уже выбыли (isWinner или карт+пеньков=0)
          let finisherIndex = initiatorIndex;
          let attempts = 0;
          const maxAttempts = players.length; // Защита от бесконечного цикла
          
          do {
            // Двигаемся против часовой стрелки
            finisherIndex = finisherIndex === 0 ? players.length - 1 : finisherIndex - 1;
            attempts++;
            
            const candidate = players[finisherIndex];
            const isActive = !candidate.isWinner && (candidate.cards.length > 0 || candidate.penki.length > 0);
            
            if (isActive) {
              console.log(`🎯 [calculateRoundFinisher] Должен завершить: ${candidate.name} (индекс ${finisherIndex})`);
              return candidate.id;
            }
            
            console.log(`⚠️ [calculateRoundFinisher] Пропускаем ${candidate.name} - выбыл из игры`);
            
          } while (finisherIndex !== initiatorIndex && attempts < maxAttempts);
          
          // Если дошли до инициатора - значит больше нет активных игроков
          console.error(`🚨 [calculateRoundFinisher] НЕТ АКТИВНЫХ ИГРОКОВ ДЛЯ ЗАВЕРШЕНИЯ КРУГА!`);
          return null;
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
            set({ 
              selectedHandCard: card,
              stage2TurnPhase: 'card_selected' // ✅ ИСПРАВЛЕНО: Устанавливаем фазу "карта выбрана"
            });
          }
        },
         
         // Розыгрыш выбранной карты (ПРАВИЛА P.I.D.R.)
        playSelectedCard: () => {
          const { selectedHandCard, currentPlayerId, players, tableStack, roundInProgress, stage2TurnPhase, trumpSuit, roundFinisher, finisherPassed, multiplayerData } = get();
          if (!selectedHandCard || !currentPlayerId) return;
          
          const currentPlayer = players.find(p => p.id === currentPlayerId);
          if (!currentPlayer) return;
          
          // ✅ НОВОЕ: Отправляем ход в мультиплеер
          if (multiplayerData && !currentPlayer.isBot) {
            get().sendPlayerMove({
              type: 'card_played',
              playerId: currentPlayerId,
              cardId: selectedHandCard.id,
              targetId: null
            });
          }
          
          // Логи для стадии 2 убраны (слишком много)
           
           // ПРАВИЛА P.I.D.R.: Проверяем можем ли побить верхнюю карту (если есть карты на столе)
           if (tableStack.length > 0) {
             const topCard = tableStack[tableStack.length - 1];
             
             const canBeat = get().canBeatCard(topCard, selectedHandCard, trumpSuit || '');
             if (!canBeat) {
               get().showNotification('Эта карта не может побить верхнюю карту на столе!', 'error', 3000);
               return; // Блокируем неправильный ход
             }
           }
           
           // УБРАНА СТАРАЯ НЕПРАВИЛЬНАЯ ЛОГИКА ЛИМИТА КАРТ
           // Теперь круг завершается только когда финишер (-1 от инициатора) побьет карту
           
          // Убираем карту из руки игрока
          const cardIndex = currentPlayer.cards.findIndex(c => c.id === selectedHandCard.id);
          if (cardIndex === -1) return;
          
          currentPlayer.cards.splice(cardIndex, 1);
          
          // 🔍 ДЛЯ ОТЛАДКИ: Логируем если у игрока осталось 0 карт
          if (currentPlayer.cards.length === 0) {
            console.log(`🔥 [playSelectedCard] У ${currentPlayer.name} закончились карты! Пеньки: ${currentPlayer.penki.length}, playerStage: ${currentPlayer.playerStage}`);
          }
          
          // 🏆 ПРОВЕРЯЕМ ПОБЕДУ ТОЛЬКО ВО 2-Й СТАДИИ КОГДА И КАРТЫ И ПЕНЬКИ ЗАКОНЧИЛИСЬ!
           const { gameStage } = get();
           const cardsLeft = currentPlayer.cards.length;
           const penkiLeft = currentPlayer.penki.length;
           const totalCardsLeft = cardsLeft + penkiLeft;
           
           console.log(`🏆 [playSelectedCard] Проверка победы для ${currentPlayer.name}: карт=${cardsLeft}, пеньков=${penkiLeft}, всего=${totalCardsLeft}, стадия=${gameStage}`);
           
           if (gameStage >= 2 && totalCardsLeft === 0 && cardsLeft === 0 && penkiLeft === 0) {
             console.log(`🎉 [playSelectedCard] 🏆 ИГРОК ${currentPlayer.name} ИЗБАВИЛСЯ ОТ ВСЕХ КАРТ И ПЕНЬКОВ ВО 2-Й СТАДИИ!`);
             
            // ✅ НЕ ОПРЕДЕЛЯЕМ МЕСТО ЗДЕСЬ! Место определится в checkVictoryCondition по finishTime!
            // КРИТИЧНО: Вызываем проверку победы немедленно
             setTimeout(() => {
               get().checkVictoryCondition();
             }, 100);
           }
           
           // Добавляем карту на стол (поверх всех)
           // ✅ КРИТИЧНО: НЕ создаем копию! Используем ту же ссылку на объект!
           // Это гарантирует что карта ПЕРЕМЕЩАЕТСЯ, а не ДУБЛИРУЕТСЯ!
           selectedHandCard.open = true;
           const playedCard = selectedHandCard; // ✅ ТА ЖЕ ССЫЛКА!
           
           const newTableStack = [...tableStack, playedCard];
           const wasEmptyTable = tableStack.length === 0;
           
           console.log(`🃏 [${currentPlayer.name}] кладет карту ${playedCard.image} на стол (всего на столе: ${newTableStack.length})`);
           
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
          // 3. НЕТ финишера (все игроки выбыли) - любой игрок закрывает круг
           
           const shouldEndRound = !wasEmptyTable && (
             // Обычное завершение: финишер побил карту
             (currentPlayerId === roundFinisher && !finisherPassed) ||
             // Овертайм: финишер уже пропустил, любой следующий побил
            (finisherPassed && newTableStack.length > 0) ||
            // ✅ КРИТИЧНО: Нет финишера (все игроки выбыли) - любой закрывает круг
            (roundFinisher === null && newTableStack.length > 0)
           );
           
          if (shouldEndRound) {
            const reasonText = roundFinisher === null
              ? `${currentPlayer.name} закрыл круг (нет финишера)`
              : finisherPassed
              ? `Овертайм! ${currentPlayer.name} побил и закрыл круг`
              : `${currentPlayer.name} (финишер) закрыл круг`;
              
            console.log(`🎯 [playSelectedCard] 🏁 КРУГ ЗАВЕРШЕН! ${reasonText}`);
            console.log(`🎯 [playSelectedCard] 📊 Карт в биту: ${newTableStack.length}`);
            console.log(`🎯 [playSelectedCard] 🗑️ Карты: ${newTableStack.map(c => c.image).join(', ')}`);
            
            // ВСЕ КАРТЫ СО СТОЛА УХОДЯТ В БИТУ
            const { playedCards = [] } = get();
            const updatedPlayedCards = [...playedCards, ...newTableStack];
            console.log(`🗑️ [playSelectedCard] Добавляем ${newTableStack.length} карт в бито (всего: ${updatedPlayedCards.length})`);
            
            set({
              tableStack: [],
              playedCards: updatedPlayedCards, // ✅ Добавляем карты в бито
              roundInProgress: false,
              currentRoundInitiator: null,
              roundFinisher: null,
              finisherPassed: false,
              lastCardTaker: null,
              stage2TurnPhase: 'selecting_card'
            });
            
            get().showNotification(`🏁 ${reasonText}! ${newTableStack.length} карт в бито`, 'success', 3000);
            
            // ИСПРАВЛЕНО: Проверяем активацию пеньков для ВСЕХ игроков
            // ✅ ВАЖНО: Проверяем с задержкой, чтобы состояние успело обновиться!
            setTimeout(() => {
              const currentPlayers = get().players; // Получаем СВЕЖИЕ данные из стора!
              currentPlayers.forEach(player => {
                get().checkStage3Transition(player.id);
              });
            }, 50);
            
            // Проверяем условия победы
            get().checkVictoryCondition();
            
            // ✅ ИСПРАВЛЕНО: Игрок который ЗАКРЫЛ круг ОСТАЕТСЯ ходить!
            // Ход НЕ переходит к следующему игроку - победитель круга ходит снова
            console.log(`🏆 [playSelectedCard] ${currentPlayer.name} закрыл круг и остается ходить!`);
            
            // Проверяем статус "одна карта"
            setTimeout(() => {
            get().checkOneCardStatus();
            }, 100);
            
            // ✅ КРИТИЧНО: Запускаем следующий ход для того же игрока!
            setTimeout(() => {
              console.log(`🎮 [playSelectedCard] Запускаем новый ход для ${currentPlayer.name}`);
              get().processPlayerTurn(currentPlayer.id);
            }, 500);
            
            return;
          }
           
           // ОБЫЧНОЕ ПРОДОЛЖЕНИЕ КРУГА
          // ИСПРАВЛЕНО: Проверяем активацию пеньков для ВСЕХ игроков
          // ✅ ВАЖНО: Проверяем с задержкой, чтобы состояние успело обновиться!
          setTimeout(() => {
            const currentPlayers = get().players; // Получаем СВЕЖИЕ данные из стора!
            currentPlayers.forEach(player => {
              get().checkStage3Transition(player.id);
            });
          }, 50);
          
          // Проверяем условия победы
          get().checkVictoryCondition();
          // ✅ ИСПРАВЛЕНО: Убрали дублирующий вызов checkOneCardStatus() - он уже вызывается в nextTurn()
          
          // ПРАВИЛА P.I.D.R.: Ход переходит к следующему игроку (УСКОРЕНО)
          setTimeout(() => get().nextTurn(), 200);
         },
         
        // Проверка возможности побить карту
        canBeatCard: (attackCard: Card, defendCard: Card, trumpSuit: string) => {
          if (!attackCard.image || !defendCard.image) return false;
          
          const attackSuit = get().getCardSuit(attackCard.image);
          const defendSuit = get().getCardSuit(defendCard.image);
          const attackRank = get().getCardRank(attackCard.image);
          const defendRank = get().getCardRank(defendCard.image);
          
          // Убраны логи (спамят консоль - вызываются 30+ раз за ход)
          
          // ОСОБОЕ ПРАВИЛО: "Пики только Пикями" - пики можно бить ТОЛЬКО пиками
          if (attackSuit === 'spades' && defendSuit !== 'spades') {
            return false;
          }
          
          // Бить той же мастью старшей картой
          if (attackSuit === defendSuit) {
            return defendRank > attackRank;
          }
          
          // Бить козырем некозырную карту (НО НЕ ПИКУ!)
          if (defendSuit === trumpSuit && attackSuit !== trumpSuit && attackSuit !== 'spades') {
            return true;
          }
          
          return false;
        },
         

         
         // Взять НИЖНЮЮ карту со стола (ПРАВИЛА P.I.D.R.)
         takeTableCards: () => {
          console.log('🎴 [takeTableCards] ВЫЗВАНА ФУНКЦИЯ!');
           const { currentPlayerId, players, tableStack, roundFinisher, currentRoundInitiator, multiplayerData } = get();
          
          console.log(`🎴 [takeTableCards] currentPlayerId=${currentPlayerId}, tableStack.length=${tableStack.length}`);
          
          if (!currentPlayerId || tableStack.length === 0) {
            console.log('🎴 [takeTableCards] БЛОКИРОВКА: нет currentPlayerId или пустой стол');
            return;
          }
           
           const currentPlayer = players.find(p => p.id === currentPlayerId);
           
           // ✅ НОВОЕ: Отправляем ход в мультиплеер
           if (multiplayerData && currentPlayer && !currentPlayer.isBot) {
             get().sendPlayerMove({
               type: 'card_taken',
               playerId: currentPlayerId
             });
           }
          if (!currentPlayer) {
            console.log('🎴 [takeTableCards] БЛОКИРОВКА: игрок не найден');
            return;
          }
           
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
           
          // ИСПРАВЛЕНО: Проверяем активацию пеньков для ВСЕХ игроков
          // ✅ ВАЖНО: Проверяем с задержкой, чтобы состояние успело обновиться!
          setTimeout(() => {
            const currentPlayers = get().players; // Получаем СВЕЖИЕ данные из стора!
            currentPlayers.forEach(player => {
              get().checkStage3Transition(player.id);
            });
          }, 50);
          
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
             // Убран лог (повторяется при каждом ходе для каждого бота)
             return;
           }
           
         // ✅ ИСПРАВЛЕНО: Пеньки активируются только когда РУКА ПУСТАЯ (cards.length === 0)
          // НЕ когда "нет открытых карт", а когда "ВООБЩЕ НЕТ КАРТ"!
          
          // ДЛЯ ОТЛАДКИ: Логируем проверку для игроков с 0 картами
          if (player.cards.length === 0) {
            console.log(`🔍 [checkStage3Transition] ${player.name}: карт=${player.cards.length}, пеньки=${player.penki.length}, playerStage=${player.playerStage || 'undefined'}`);
          }
          
          // ✅ УБРАНА ПРОВЕРКА player.playerStage === 2 (избыточна, т.к. gameStage уже === 2)
          if (player.cards.length === 0 && player.penki.length > 0) {
            console.log(`🃏 [checkStage3Transition] ✅ У игрока ${player.name} пустая рука во 2-й стадии - активируем пеньки!`);
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
         
        // ИСПРАВЛЕННАЯ ПРОВЕРКА УСЛОВИЙ ПОБЕДЫ - ОБЪЯВЛЯЕМ ИНДИВИДУАЛЬНЫХ ПОБЕДИТЕЛЕЙ!
        checkVictoryCondition: () => {
          const { players, isGameActive, gameStage } = get();
          
          // ЗАЩИТА: Игра не активна
          if (!isGameActive) {
            console.log(`🏆 [checkVictoryCondition] ⚠️ Игра не активна - пропускаем`);
            return;
          }
          
          // ЗАЩИТА: Нет игроков
          if (players.length === 0) {
            console.log(`🏆 [checkVictoryCondition] ⚠️ Нет игроков - пропускаем`);
            return;
          }
          
          // КРИТИЧЕСКИ ВАЖНО: В 1-й стадии победа НЕВОЗМОЖНА!
          if (gameStage === 1) {
            // Убран лог (слишком частый - при каждом ходе)
            return;
          }
          
          // Убран лог проверки победы (слишком частый)
          
          // Анализируем КАЖДОГО игрока
          const newWinners: Player[] = [];
          const existingWinners: Player[] = [];
          const playersInGame: Player[] = [];
          
          players.forEach(player => {
            const openCards = player.cards.filter(c => c.open).length;
            const closedCards = player.cards.filter(c => !c.open).length;
            const penki = player.penki.length;
            const total = player.cards.length + player.penki.length;
            
            // Убран лог для каждого игрока (слишком частый)
            
            // ПОБЕДИТЕЛЬ = НЕТ КАРТ ВООБЩЕ (ни открытых, ни закрытых, ни пеньков)
            if (total === 0) {
              if (!player.isWinner) {
                console.log(`   🎉 НОВЫЙ ПОБЕДИТЕЛЬ!`);
                newWinners.push(player);
              } else {
                console.log(`   ✅ УЖЕ ПОБЕДИТЕЛЬ (зритель)`);
                existingWinners.push(player);
              }
            } else {
              // Убран лог (повторяется при каждом ходе для каждого игрока)
              playersInGame.push(player);
            }
          });
          
          // Убран лог итогов (слишком частый)
          
          // 🎉 ОБЪЯВЛЯЕМ НОВЫХ ПОБЕДИТЕЛЕЙ (НЕ ЗАВЕРШАЯ ИГРУ)
          if (newWinners.length > 0) {
            console.log(`🎉 [checkVictoryCondition] ОБЪЯВЛЯЕМ НОВЫХ ПОБЕДИТЕЛЕЙ!`);
            
            // ✅ КРИТИЧНО: Присваиваем время выхода КАЖДОМУ новому победителю
            const now = Date.now();
            newWinners.forEach((winner, idx) => {
              if (!winner.finishTime) {
                winner.finishTime = now + idx; // ✅ Добавляем idx чтобы порядок был правильный если вышли одновременно
                console.log(`⏰ [checkVictoryCondition] ${winner.name} закончил игру в ${winner.finishTime}`);
              }
            });
            
            // Помечаем новых победителей
            const updatedPlayers = players.map(player => {
              const newWinner = newWinners.find(w => w.id === player.id);
              if (newWinner) {
                return { ...player, isWinner: true, finishTime: newWinner.finishTime };
              }
              return player;
            });
            
            set({ players: updatedPlayers });
            
            // ✅ ОБНОВЛЯЕМ СТАТИСТИКУ СРАЗУ ПРИ ВЫХОДЕ!
            const telegramUser = typeof window !== 'undefined' && (window as any).Telegram?.WebApp?.initDataUnsafe?.user;
            const currentUserTelegramId = telegramUser?.id?.toString() || '';
            
            // ✅ КРИТИЧНО: Объединяем ВСЕ победителей и сортируем по времени выхода!
            const allWinnersSorted = [...existingWinners, ...newWinners].sort((a, b) => {
              const timeA = a.finishTime || 0;
              const timeB = b.finishTime || 0;
              return timeA - timeB; // Сначала тот кто вышел раньше
            });
            
            console.log(`🏆 [checkVictoryCondition] СУЩЕСТВУЮЩИЕ ПОБЕДИТЕЛИ:`, 
              existingWinners.map(w => `${w.name} (finishTime: ${w.finishTime})`));
            console.log(`🏆 [checkVictoryCondition] НОВЫЕ ПОБЕДИТЕЛИ:`, 
              newWinners.map(w => `${w.name} (finishTime: ${w.finishTime})`));
            console.log(`🏆 [checkVictoryCondition] ПОРЯДОК ПОБЕДИТЕЛЕЙ (по времени):`, 
              allWinnersSorted.map((w, idx) => `${idx + 1}. ${w.name} (finishTime: ${w.finishTime})`));
            
            newWinners.forEach((winner, index) => {
              // ✅ ИСПРАВЛЕНО: Находим РЕАЛЬНУЮ позицию по отсортированному списку!
              const position = allWinnersSorted.findIndex(w => w.id === winner.id) + 1;
              const isUser = winner.isUser || winner.id === currentUserTelegramId;
              
              // ✅ ЕСЛИ ЭТО ПОЛЬЗОВАТЕЛЬ - ОБНОВЛЯЕМ СТАТИСТИКУ СРАЗУ!
              if (isUser && currentUserTelegramId) {
                // ✅ ЗАЩИТА ОТ ДУБЛИРОВАНИЯ: Проверяем что статистика ЕЩЁ НЕ ОБНОВЛЕНА!
                const { statsUpdatedThisGame } = get();
                if (statsUpdatedThisGame) {
                  console.warn(`⚠️ [checkVictoryCondition] Статистика УЖЕ обновлена за эту игру! Пропускаем для ${winner.name}`);
                  return; // ✅ КРИТИЧНО: Выходим чтобы не дублировать!
                }
                
                // ✅ ДЕТЕРМИНИРОВАННЫЙ РАНДОМ для 4-8 мест (используем ID как seed)
                const seededRandom = (playerId: string, min: number, max: number): number => {
                  let hash = 0;
                  for (let i = 0; i < playerId.length; i++) {
                    const char = playerId.charCodeAt(i);
                    hash = ((hash << 5) - hash) + char;
                    hash = hash & hash;
                  }
                  const normalized = Math.abs(hash % (max - min + 1));
                  return min + normalized;
                };
                
                // Определяем награды
                const isTopThree = position >= 1 && position <= 3;
                let coinsEarned = 0;
                let ratingChange = 0;
                
                if (position === 1) {
                  coinsEarned = 350;
                  ratingChange = 50; // 🥇 Золото
                } else if (position === 2) {
                  coinsEarned = 250;
                  ratingChange = 25; // 🥈 Серебро
                } else if (position === 3) {
                  coinsEarned = 150;
                  ratingChange = 10; // 🥉 Бронза
                } else if (position >= 4 && position <= 8) {
                  coinsEarned = seededRandom(winner.id, 50, 100); // ✅ Рандом 50-100
                  ratingChange = 0; // Нейтрально
                }
                // Для 9-го места (последнего) монеты и рейтинг начисляются в конце игры
                
                // ✅ ГЕНЕРИРУЕМ УНИКАЛЬНЫЙ TRACE ID
                const traceId = `WINNER_${position}_${Date.now()}`;
                
                // ✅ КРИТИЧНО: Детальная проверка isTopThree
                console.log(`🔍 [${traceId}] РАСЧЁТ isTopThree:`, {
                  position,
                  'position >= 1': position >= 1,
                  'position <= 3': position <= 3,
                  isTopThree,
                  calculation: `${position} >= 1 && ${position} <= 3 = ${isTopThree}`
                });
                
                console.log(`🔥🔥🔥 [${traceId}] [checkVictoryCondition] СРАЗУ обновляем статистику для ${winner.name}:`, {
                  winnerId: winner.id,
                  winnerName: winner.name,
                  isUser: isUser,
                  position,
                  finishTime: winner.finishTime,
                  isTopThree,
                  coinsEarned,
                  statsWasUpdated: statsUpdatedThisGame,
                  traceId,
                  allWinnersCount: allWinnersSorted.length,
                  telegramId: currentUserTelegramId
                });
                
                // ✅ УСТАНАВЛИВАЕМ ФЛАГ ЧТО СТАТИСТИКА ОБНОВЛЕНА!
                set({ statsUpdatedThisGame: true });
                console.log(`🚩 [${traceId}] ФЛАГ statsUpdatedThisGame УСТАНОВЛЕН В TRUE!`);
                
                // ✅ СРАЗУ ОТПРАВЛЯЕМ ЗАПРОС НА ОБНОВЛЕНИЕ!
                console.log(`📤 [${traceId}] ОТПРАВЛЯЕМ FETCH для победителя места ${position}`);
                fetch('/api/user/add-coins', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    'x-telegram-id': currentUserTelegramId,
                    'x-username': telegramUser?.username || telegramUser?.first_name || ''
                  },
                  body: JSON.stringify({
                    amount: coinsEarned,
                    source: `game_finish_place_${position}`,
                    updateStats: {
                      gamesPlayed: true,  // ✅ Всегда +1
                      wins: isTopThree,   // ✅ +1 если ТОП-3
                      losses: false       // ✅ Не последнее место
                    },
                    traceId: traceId, // ✅ Передаем trace ID
                    // ✅ Дополнительная информация для отладки
                    debug: {
                      position,
                      isTopThree,
                      playerName: winner.name,
                      finishTime: winner.finishTime
                    }
                  })
                }).then(res => res.json())
                  .then(data => {
                    if (data.success) {
                      console.log(`✅✅✅ [${traceId}] СТАТИСТИКА ОБНОВЛЕНА! Место ${position}, Победа: ${isTopThree}, Монеты: +${coinsEarned}`);
                      
                      // ✅ ОБНОВЛЯЕМ РЕЙТИНГ ЕСЛИ ЭТО РЕЙТИНГОВАЯ ИГРА
                      if (get().isRankedGame && ratingChange !== 0) {
                        console.log(`🏆 [${traceId}] РЕЙТИНГОВАЯ ИГРА! Обновляем рейтинг: ${ratingChange > 0 ? '+' : ''}${ratingChange}`);
                        get().updatePlayerRewards(0, 0, ratingChange);
                      }
                    } else {
                      console.error(`❌❌❌ [${traceId}] Ошибка обновления статистики:`, data.error);
                    }
                  })
                  .catch(err => console.error(`❌❌❌ [${traceId}] Ошибка fetch:`, err));
              }
            });
            
            // ✅ УЛУЧШЕННОЕ ОБЪЯВЛЕНИЕ ПОБЕДИТЕЛЕЙ С АНИМАЦИЕЙ
            newWinners.forEach((winner, index) => {
              // ✅ ИСПРАВЛЕНО: Используем тот же отсортированный список!
              const position = allWinnersSorted.findIndex(w => w.id === winner.id) + 1;
              const medals = ['🥇', '🥈', '🥉', '🏅', '🏅', '🏅'];
              const medal = medals[position - 1] || '🏅';
              const positionText = position === 1 ? '1-е место' : position === 2 ? '2-е место' : position === 3 ? '3-е место' : `${position}-е место`;
              
              console.log(`🎉 ОБЪЯВЛЯЕМ ПОБЕДИТЕЛЯ: ${winner.name} - ${positionText} (finishTime: ${winner.finishTime})`);
              
              // ✅ КРАСИВОЕ УВЕДОМЛЕНИЕ С МЕДАЛЬЮ
              get().showNotification(
                `${medal} ${winner.name} - ${positionText}! 🎉`, 
                'success', 
                7000
              );
              
              // ✅ ПРОВЕРЯЕМ: Это ПОЛЬЗОВАТЕЛЬ или БОТ?
              const isWinnerUser = winner.isUser || winner.id === currentUserTelegramId;
              
              console.log(`🔍 [checkVictoryCondition] Победитель ${winner.name}: isUser=${winner.isUser}, isWinnerUser=${isWinnerUser}`);
              
              // 🎉 ПОКАЗЫВАЕМ МОДАЛКУ ПОБЕДИТЕЛЯ
                setTimeout(() => {
                  set({
                  showWinnerModal: true,
                  winnerModalData: {
                      playerName: winner.name,
                    place: position,
                    avatar: winner.avatar,
                    isCurrentUser: isWinnerUser // ✅ Передаём флаг!
                  }
                });
                
                // ✅ АВТОЗАКРЫТИЕ ТОЛЬКО ДЛЯ БОТОВ! (не для пользователя)
                if (!isWinnerUser) {
                  setTimeout(() => {
                    set({
                      showWinnerModal: false,
                      winnerModalData: null
                    });
                    
                    // ✅ КРИТИЧНО: ПРОДОЛЖАЕМ ИГРУ! Ищем следующего активного игрока
                    const { players } = get();
                    const activePlayers = players.filter(p => !p.isWinner && (p.cards.length > 0 || p.penki.length > 0));
                    
                    console.log(`🔄 [checkVictoryCondition] После закрытия модалки - активных игроков: ${activePlayers.length}`);
                    
                    if (activePlayers.length > 1) {
                      // ✅ ИГРА ПРОДОЛЖАЕТСЯ! Передаём ход следующему активному игроку
                      console.log(`✅ [checkVictoryCondition] Игра продолжается - передаём ход!`);
                      get().nextTurn();
                    } else {
                      console.log(`🏁 [checkVictoryCondition] Остался 1 или меньше активных игроков - игра закончится`);
                    }
                  }, 3000);
                } else {
                  console.log(`👤 [checkVictoryCondition] ПОЛЬЗОВАТЕЛЬ победил - модалка останется открытой до нажатия кнопки`);
                }
              }, 500 + index * 200); // Задержка между модалками если несколько победителей одновременно
            });
          }
          
          // 🏁 ЗАВЕРШАЕМ ИГРУ ТОЛЬКО КОГДА ОСТАЛСЯ 1 ИГРОК
          if (playersInGame.length <= 1) {
            console.log(`🏁 [checkVictoryCondition] ИГРА ЗАВЕРШЕНА - остался 1 игрок или меньше!`);
            
            setTimeout(() => {
              // Завершаем игру
              set({
                isGameActive: false,
                gameStage: 4, // Завершение игры
              });
              
              if (playersInGame.length === 1) {
                // ПОСЛЕДНИЙ ИГРОК = ПРОИГРАВШИЙ
                const loser = playersInGame[0];
                const cardsLeft = loser.cards.length + loser.penki.length;
                
                console.log(`💸 ПРОИГРАВШИЙ: ${loser.name} (${cardsLeft} карт)`);
                
                get().showNotification(
                  `💸 ПРОИГРАВШИЙ: ${loser.name} (${cardsLeft} карт)`, 
                  'error', 
                  5000
                );
                
                // 💀 ПОКАЗЫВАЕМ МОДАЛКУ ПРОИГРАВШЕГО
                  setTimeout(() => {
                    set({
                    showLoserModal: true,
                    loserModalData: {
                        playerName: loser.name,
                      avatar: loser.avatar
                    }
                  });
                  
                  // Автоматически скрываем модалку через 5 секунд
                  setTimeout(() => {
                    set({
                      showLoserModal: false,
                      loserModalData: null
                    });
                  }, 5000);
                }, 1000);
              }
              
              // Финальное объявление всех результатов
              const allWinners = players.filter(p => p.isWinner || (p.cards.length + p.penki.length === 0));
              setTimeout(() => {
                get().showNotification(
                  `🎊 ИГРА ЗАВЕРШЕНА! Победители: ${allWinners.map(w => w.name).join(', ')}`, 
                  'success', 
                  6000
                );
              }, 3000);
              
              // 🏆 ПОКАЗЫВАЕМ ФИНАЛЬНУЮ МОДАЛКУ РЕЗУЛЬТАТОВ ЧЕРЕЗ 7 СЕКУНД
              setTimeout(() => {
                get().calculateAndShowGameResults();
              }, 7000);
              
            }, newWinners.length > 0 ? 3000 : 1000); // Ждем объявления победителей
          }
        },
         
        // 🏆 РАСЧЕТ И ОТОБРАЖЕНИЕ ФИНАЛЬНЫХ РЕЗУЛЬТАТОВ
        calculateAndShowGameResults: () => {
          const { players, gameMode } = get();
          console.log('🏆 [calculateAndShowGameResults] Подсчёт финальных результатов...');
          
          // Получаем telegram_id текущего пользователя
          const telegramUser = typeof window !== 'undefined' && (window as any).Telegram?.WebApp?.initDataUnsafe?.user;
          const currentUserTelegramId = telegramUser?.id?.toString() || '';
          
          // Сортируем игроков по местам (winner first, loser last)
          // ✅ ДЕТЕРМИНИРОВАННАЯ СОРТИРОВКА для мультиплеера!
          const sortedPlayers = [...players].sort((a, b) => {
            // 1️⃣ Победители (isWinner) идут первыми
            if (a.isWinner && !b.isWinner) return -1;
            if (!a.isWinner && b.isWinner) return 1;
            
            // 2️⃣ Сортируем по количеству карт (меньше = лучше)
            const aTotal = a.cards.length + a.penki.length;
            const bTotal = b.cards.length + b.penki.length;
            
            // ✅ ЕСЛИ У ОБОИХ 0 КАРТ - СОРТИРУЕМ ПО finishTime (КТО РАНЬШЕ ВЫШЕЛ)!
            if (aTotal === 0 && bTotal === 0) {
              if (a.finishTime && b.finishTime) {
                return a.finishTime - b.finishTime; // Раньше = лучше место
              }
              // Если нет finishTime - сравниваем по ID
              return a.id.localeCompare(b.id);
            }
            
            if (aTotal === 0 && bTotal > 0) return -1;
            if (aTotal > 0 && bTotal === 0) return 1;
            
            // 3️⃣ Если количество карт разное - сортируем по количеству
            if (aTotal !== bTotal) {
              return aTotal - bTotal;
            }
            
            // 4️⃣ TIEBREAKER: Сравниваем по ID (лексикографически)
            return a.id.localeCompare(b.id);
          });
          
          // ✅ ДЕТЕРМИНИРОВАННЫЙ РАНДОМ для мультиплеера
          // Используем ID игрока как seed для рандома, чтобы все видели одинаковые награды
          const seededRandom = (playerId: string, min: number, max: number): number => {
            // Простая хеш-функция из ID игрока
            let hash = 0;
            for (let i = 0; i < playerId.length; i++) {
              const char = playerId.charCodeAt(i);
              hash = ((hash << 5) - hash) + char;
              hash = hash & hash; // Convert to 32bit integer
            }
            // Нормализуем в диапазон min-max
            const normalized = Math.abs(hash % (max - min + 1));
            return min + normalized;
          };
          
          // Формируем результаты
          const results = sortedPlayers.map((player, index) => {
            const place = index + 1;
            const isLastPlace = place === sortedPlayers.length;
            const totalCards = player.cards.length + player.penki.length;
            
            // ✅ РАСЧЕТ НАГРАД (только для НЕ ботов)
            let coinsEarned = 0;
            let ratingChange = 0;
            
            if (player.isUser || player.id === currentUserTelegramId) {
              // Пользователь
              if (place === 1) {
                coinsEarned = 350; // 🥇 Победитель
                ratingChange = 50;
              } else if (place === 2) {
                coinsEarned = 250; // 🥈 Второе место
                ratingChange = 25;
              } else if (place === 3) {
                coinsEarned = 150; // 🥉 Третье место
                ratingChange = 10;
              } else if (place >= 4 && place <= 8) {
                // 🎲 Места 4-8: детерминированный рандом от 50 до 100 монет
                // Используем ID игрока для seed - все устройства увидят одинаковый результат!
                coinsEarned = seededRandom(player.id, 50, 100);
                ratingChange = 0;
              } else if (isLastPlace) {
                coinsEarned = 5; // 🎁 Утешительный приз за участие!
                ratingChange = -25;
              }
            } else if (!player.isBot) {
              // Другие реальные игроки (НЕ боты)
              if (place === 1) {
                coinsEarned = 350; // 🥇 Победитель
                ratingChange = 50;
              } else if (place === 2) {
                coinsEarned = 250; // 🥈 Второе место
                ratingChange = 25;
              } else if (place === 3) {
                coinsEarned = 150; // 🥉 Третье место
                ratingChange = 10;
              } else if (place >= 4 && place <= 8) {
                // 🎲 Места 4-8: детерминированный рандом от 50 до 100 монет
                // Используем ID игрока для seed - все устройства увидят одинаковый результат!
                coinsEarned = seededRandom(player.id, 50, 100);
                ratingChange = 0;
              } else if (isLastPlace) {
                coinsEarned = 5; // 🎁 Утешительный приз за участие!
                ratingChange = -25;
              }
            }
            // Боты не получают монеты/рейтинг
            
            return {
              place,
              name: player.name,
              avatar: player.avatar,
              coinsEarned,
              ratingChange,
              isUser: player.isUser || player.id === currentUserTelegramId
            };
          });
          
          console.log('🏆 [calculateAndShowGameResults] Результаты:', results);
          
          // ✅ ОБНОВЛЯЕМ СТАТИСТИКУ ТОЛЬКО ДЛЯ ПОСЛЕДНЕГО ИГРОКА (ПРОИГРАВШЕГО)
          // Остальные игроки уже обновили статистику при выходе!
          const userResult = results.find(r => r.isUser);
          
          console.log(`🔍 [calculateAndShowGameResults] Проверка пользователя:`, {
            userResult,
            currentUserTelegramId,
            telegramUser
          });
          
          if (userResult) {
            const isLastPlace = userResult.place === results.length;
            
            // ✅ ОБНОВЛЯЕМ СТАТИСТИКУ ТОЛЬКО ДЛЯ ПОСЛЕДНЕГО ИГРОКА!
            // Все остальные (1-8 места) уже обновили при выходе!
            if (isLastPlace) {
              // ✅ ЗАЩИТА ОТ ДУБЛИРОВАНИЯ: Проверяем что статистика ЕЩЁ НЕ ОБНОВЛЕНА!
              const { statsUpdatedThisGame } = get();
              
              console.log(`🔍🔍🔍 [calculateAndShowGameResults] ПРОВЕРКА ПОСЛЕДНЕГО ИГРОКА:`, {
                isLastPlace,
                place: userResult.place,
                totalPlaces: results.length,
                statsUpdatedThisGame,
                shouldUpdate: !statsUpdatedThisGame
              });
              
              if (statsUpdatedThisGame) {
                console.warn(`⚠️⚠️⚠️ [calculateAndShowGameResults] Статистика УЖЕ обновлена за эту игру! Пропускаем последнего игрока`);
              } else {
                // ✅ ГЕНЕРИРУЕМ УНИКАЛЬНЫЙ TRACE ID
                const traceId = `LOSER_${userResult.place}_${Date.now()}`;
                
                const requestBody = {
                  amount: userResult.coinsEarned, // 5 монет
                  source: 'game_loss',
                  updateStats: {
                    gamesPlayed: true, // ✅ +1 к играм
                    wins: false,       // ✅ Не победа
                    losses: true       // ✅ +1 к поражениям
                  },
                  traceId: traceId // ✅ Передаем trace ID
                };
                
                console.log(`🔥🔥🔥 [${traceId}] [calculateAndShowGameResults] ПОСЛЕДНИЙ ИГРОК! Обновляем статистику:`, {
                  place: userResult.place,
                  coins: userResult.coinsEarned,
                  rating: userResult.ratingChange,
                  isLastPlace: true,
                  telegramId: currentUserTelegramId,
                  isRankedGame: get().isRankedGame,
                  statsWasUpdated: statsUpdatedThisGame,
                  requestBody
                });
                
                // ✅ УСТАНАВЛИВАЕМ ФЛАГ ЧТО СТАТИСТИКА ОБНОВЛЕНА!
                set({ statsUpdatedThisGame: true });
                console.log(`🚩 [${traceId}] ФЛАГ statsUpdatedThisGame УСТАНОВЛЕН В TRUE!`);
                
                // Обновляем баланс и статистику в БД через API
                console.log(`📤 [${traceId}] ОТПРАВЛЯЕМ FETCH для последнего игрока`);
                fetch('/api/user/add-coins', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'x-telegram-id': currentUserTelegramId,
                  'x-username': telegramUser?.username || telegramUser?.first_name || ''
                },
                body: JSON.stringify(requestBody)
              })
                .then(res => {
                  console.log(`📥 [calculateAndShowGameResults] Response status:`, res.status);
                  return res.json();
                })
                .then(data => {
                  console.log(`📥 [${traceId}] Response data:`, data);
                  if (data.success) {
                    console.log(`✅✅✅ [${traceId}] СТАТИСТИКА ПОСЛЕДНЕГО ИГРОКА ОБНОВЛЕНА: Поражение +1, Монеты: +${userResult.coinsEarned}`);
                    
                    // ✅ ОБНОВЛЯЕМ РЕЙТИНГ ЕСЛИ ЭТО РЕЙТИНГОВАЯ ИГРА
                    if (get().isRankedGame && userResult.ratingChange !== undefined) {
                      console.log(`🏆 [${traceId}] РЕЙТИНГОВАЯ ИГРА! Обновляем рейтинг: ${userResult.ratingChange > 0 ? '+' : ''}${userResult.ratingChange}`);
                      get().updatePlayerRewards(0, 0, userResult.ratingChange);
                    }
                  } else {
                    console.error(`❌❌❌ [${traceId}] API вернул ошибку:`, data.error);
                  }
                })
                .catch(err => {
                  console.error(`❌❌❌ [${traceId}] КРИТИЧЕСКАЯ ОШИБКА ОБНОВЛЕНИЯ:`, err);
                  console.error('Полная ошибка:', {
                    message: err.message,
                    stack: err.stack,
                    name: err.name
                    });
                  });
              } // ✅ Закрываем else блок для statsUpdatedThisGame
            } else {
              console.log(`✅ [calculateAndShowGameResults] Игрок на месте ${userResult.place} УЖЕ обновил статистику при выходе!`);
               }
            } else {
            console.warn(`⚠️ [calculateAndShowGameResults] Пользователь не найден в результатах!`);
          }
          
          // ✅ КРИТИЧНО: Закрываем все старые модалки перед показом финальной!
          set({
            showWinnerModal: false,
            winnerModalData: null,
            showLoserModal: false,
            loserModalData: null,
            showGameResultsModal: true,
            gameResults: results
          });
          
          console.log('🎉 [calculateAndShowGameResults] Показываем финальную модалку результатов!');
        },
         
         // ===== МЕТОДЫ ДЛЯ СИСТЕМЫ "ОДНА КАРТА!" И ШТРАФОВ =====
         
        // Проверка кому нужно объявлять "одна карта"
        // ✅ НОВАЯ ЛОГИКА: БЕЗ ТАЙМЕРОВ! Только отслеживание кто с 1 картой
        checkOneCardStatus: () => {
          const { players, gameStage, oneCardDeclarations } = get();
          if (gameStage !== 2 && gameStage !== 3) return; // Только во 2-й и 3-й стадиях
          
          const newOneCardDeclarations = { ...oneCardDeclarations };
          const newPlayersWithOneCard: string[] = [];
          
          players.forEach(player => {
            const cardsInHand = player.cards.length;
            
            // Проверяем есть ли у игрока ровно 1 карта
            if (cardsInHand === 1) {
              newPlayersWithOneCard.push(player.id);
              
              const hasAlreadyDeclared = oneCardDeclarations[player.id];
              
              // Логируем только если не объявил
              if (!hasAlreadyDeclared) {
                console.log(`⚠️ [checkOneCardStatus] ${player.name} - 1 КАРТА! Нужно объявить или спросят!`);
              }
            } else if (cardsInHand !== 1) {
              // ✅ КРИТИЧНО: У игрока больше или меньше 1 карты - СБРАСЫВАЕМ объявление
              if (oneCardDeclarations[player.id]) {
                console.log(`🔄 [checkOneCardStatus] ${player.name}: ${cardsInHand} карт → СБРОС объявления`);
                delete newOneCardDeclarations[player.id];
              }
            }
           });
           
           // Обновляем состояние
           set({ 
             oneCardDeclarations: newOneCardDeclarations,
             playersWithOneCard: newPlayersWithOneCard
           });
         },
         
        // Игрок объявляет "одна карта"
        declareOneCard: (playerId: string) => {
          const { players, oneCardDeclarations, gameStage, multiplayerData } = get();
          const player = players.find(p => p.id === playerId);
          if (!player) return;
          
          // ✅ НОВОЕ: Отправляем объявление в мультиплеер
          if (multiplayerData && !player.isBot) {
            get().sendPlayerMove({
              type: 'one_card_declared',
              playerId: playerId
            });
          }
          
          // ✅ КРИТИЧНО: Проверяем что игрок УЖЕ НЕ ОБЪЯВЛЯЛ (защита от дублирования!)
          if (oneCardDeclarations[playerId]) {
            console.log(`⚠️ [declareOneCard] ${player.name} УЖЕ объявил "одна карта" - игнорируем повторный вызов`);
            return;
          }
          
          const totalCards = player.cards.length;
          
          // Проверяем что у игрока действительно 1 карта
          if (totalCards !== 1) {
            get().showNotification(`❌ ${player.name}: неправильное объявление! У вас ${totalCards} карт`, 'error', 3000);
            return;
          }
           
          // ✅ НОВАЯ ЛОГИКА: Просто объявляем, БЕЗ таймеров!
           const newDeclarations = { ...oneCardDeclarations };
           newDeclarations[playerId] = true;
           
           set({ 
            oneCardDeclarations: newDeclarations
           });
           
          console.log(`✅ [declareOneCard] ${player.name} объявил "ОДНА КАРТА!"`);
          get().showNotification(`✅ ${player.name}: ОДНА КАРТА!`, 'success', 3000);
         },
         
       // Спросить "сколько карт?" у другого игрока
       askHowManyCards: (askerPlayerId: string, targetPlayerId: string) => {
          const { players, oneCardDeclarations, pendingPenalty } = get();
          const asker = players.find(p => p.id === askerPlayerId);
          const target = players.find(p => p.id === targetPlayerId);
          
          if (!asker || !target) return;
          
          // ✅ ЗАЩИТА: Если уже идет штраф, не проверяем снова!
          if (pendingPenalty) {
            console.log(`⚠️ [askHowManyCards] Уже идет штраф для ${pendingPenalty.targetPlayerId} - пропускаем проверку`);
            return;
          }
          
          const targetTotalCards = target.cards.length;
          
          console.log(`❓ [askHowManyCards] ${asker.name} спрашивает у ${target.name} сколько карт`);
          console.log(`❓ [askHowManyCards] У ${target.name}: всего карт=${targetTotalCards}`);
          
          // ✅ НОВАЯ ЛОГИКА: Проверяем СРАЗУ при вопросе!
          if (targetTotalCards === 1) {
             const hasDeclared = oneCardDeclarations[targetPlayerId];
             
            console.log(`🎯 [askHowManyCards] Проверка штрафа: объявил=${hasDeclared}`);
            
            if (!hasDeclared) {
              // ❌ НЕ ОБЪЯВИЛ ДО ВОПРОСА → ШТРАФ!
              console.log(`💸 [askHowManyCards] ⚠️ ШТРАФ! ${target.name} НЕ объявил "одна карта!" до вопроса!`);
              
              get().showNotification(`💸 ШТРАФ! ${target.name} забыл объявить "одна карта!" → получает штрафные карты!`, 'error', 5000);
              
              // ✅ ЗАПУСКАЕМ ПРОЦЕСС ШТРАФА - ИГРА ОСТАНАВЛИВАЕТСЯ!
               get().startPenaltyProcess(targetPlayerId);
            } else {
              // ✅ ОБЪЯВИЛ ДО ВОПРОСА → ШТРАФА НЕТ!
              console.log(`✅ [askHowManyCards] ${target.name} объявил "одна карта" вовремя - штрафа нет!`);
              get().showNotification(`✅ ${target.name} объявил "одна карта" вовремя → штрафа нет!`, 'success', 3000);
            }
          } else {
            // У цели не 1 карта - просто показываем количество
            console.log(`ℹ️ [askHowManyCards] У ${target.name} ${targetTotalCards} карт - штрафа нет`);
            get().showNotification(`ℹ️ У ${target.name}: ${targetTotalCards} карт`, 'info', 3000);
           }
         },
         
         // ✅ НОВАЯ ЛОГИКА: Начать процесс штрафа - ОДНОВРЕМЕННО ДЛЯ ВСЕХ ШТРАФНИКОВ!
         startPenaltyProcess: (forgetfulPlayerIds: string | string[]) => {
           const { players } = get();
           
           // ✅ КРИТИЧНО: Поддерживаем как одного штрафника, так и массив!
           const targetIds = Array.isArray(forgetfulPlayerIds) ? forgetfulPlayerIds : [forgetfulPlayerIds];
           
           if (targetIds.length === 0) return;
           
           const forgetfulPlayers = players.filter(p => targetIds.includes(p.id));
           if (forgetfulPlayers.length === 0) return;
           
           // Определяем кто должен отдать карты (все кроме штрафуемых)
           const contributorsNeeded = players
             .filter(p => !targetIds.includes(p.id) && p.cards.length > 0)
             .map(p => p.id);
           
           if (contributorsNeeded.length === 0) {
             get().showNotification(`⚠️ Никто не может скинуть карты штрафникам`, 'warning', 3000);
             return;
           }
           
           const namesText = forgetfulPlayers.map(p => p.name).join(', ');
           console.log(`💸 [startPenaltyProcess] Начинаем штраф для ${forgetfulPlayers.length} игроков: ${namesText}`);
           console.log(`⏸️ [startPenaltyProcess] ✅ ОСТАНАВЛИВАЕМ ИГРУ! (isGamePaused = true)`);
           
           // ✅ НОВАЯ ЛОГИКА: ОСТАНАВЛИВАЕМ ИГРУ!
           set({ 
             isGamePaused: true, // ✅ КРИТИЧНО: ПАУЗА!
             pendingPenalty: {
               targetPlayerId: targetIds.length === 1 ? targetIds[0] : targetIds, // ✅ Массив если несколько!
               contributorsNeeded: [...contributorsNeeded],
               contributorsCompleted: {} // ✅ НОВОЕ: Пустой объект для отслеживания
             }
           });
           
           get().showNotification(`⏸️ ИГРА НА ПАУЗЕ! Все должны скинуть карты для штрафа (${forgetfulPlayers.length} игроков)!`, 'warning', 7000);
           
          // ✅ ИСПРАВЛЕНО: Для ЛЮДЕЙ открываем модалку автоматически!
          const humanContributors = contributorsNeeded.filter(id => {
            const p = players.find(player => player.id === id);
            return p && !p.isBot;
          });
          
          if (humanContributors.length > 0) {
            // ✅ АВТОМАТИЧЕСКИ ОТКРЫВАЕМ МОДАЛКУ ДЛЯ ЛЮДЕЙ!
            set({ showPenaltyCardSelection: true });
            console.log(`🎯 [startPenaltyProcess] Открыта модалка штрафа для ${humanContributors.length} игроков`);
          }
          
          // Боты автоматически отдают карты с задержкой
           contributorsNeeded.forEach((playerId, index) => {
             const player = players.find(p => p.id === playerId);
            
             if (player?.isBot) {
              // Для ботов - автоматически выбираем худшие карты с задержкой
               setTimeout(() => {
                 // ✅ КРИТИЧНО: Проверяем что штраф ЕЩЕ АКТИВЕН!
                 const currentPenalty = get().pendingPenalty;
                 if (!currentPenalty) {
                   console.log(`⚠️ [startPenaltyProcess] Штраф уже завершен - бот ${player.name} не скидывает карту`);
                   return;
                 }
                 
                 // ✅ КРИТИЧНО: Проверяем что бот ЕЩЕ НЕ СКИНУЛ карты!
                 if (currentPenalty.contributorsCompleted[playerId]) {
                   console.log(`⚠️ [startPenaltyProcess] Бот ${player.name} УЖЕ скинул карты - пропускаем`);
                   return;
                 }
                 
                 const currentPlayer = get().players.find(p => p.id === playerId);
                 if (!currentPlayer) return;
                 
                 const openCards = currentPlayer.cards.filter(c => c.open);
                 const cardsToGive = Math.min(openCards.length, targetIds.length);
                 
                 // ✅ НОВАЯ ЛОГИКА: Бот выбирает худшие карты и распределяет их по штрафникам
                 const sortedWorstCards = openCards
                   .map(card => ({ card, rank: get().getCardRank(card.image || '') }))
                   .sort((a, b) => a.rank - b.rank) // Сортируем от худшей к лучшей
                   .slice(0, cardsToGive)
                   .map(item => item.card);
                 
                 // Распределяем карты по штрафникам (по кругу)
                 sortedWorstCards.forEach((card, cardIndex) => {
                   const targetId = targetIds[cardIndex % targetIds.length];
                   console.log(`🤖 [startPenaltyProcess] Бот ${player.name} отдает карту ${card.image} игроку ${targetId}`);
                   get().contributePenaltyCard(playerId, card.id, targetId);
                 });
              }, (index + 1) * 1000); // Боты отдают карты с задержкой
             }
            // Для людей - НЕ показываем модалку автоматически!
            // Они сами нажмут кнопку "Сдать штраф"
           });
         },
         
         // ✅ НОВАЯ ЛОГИКА: Игрок отдает карту за штраф КОНКРЕТНОМУ ШТРАФНИКУ
         contributePenaltyCard: (contributorId: string, cardId: string, targetId: string) => {
           const { players, pendingPenalty } = get();
           if (!pendingPenalty) {
             console.log(`⚠️ [contributePenaltyCard] Нет активного штрафа!`);
             return;
           }
           
           // ✅ ЗАЩИТА: Проверяем что игрок еще в списке ожидающих
           if (!pendingPenalty.contributorsNeeded.includes(contributorId)) {
             console.log(`⚠️ [contributePenaltyCard] Игрок ${contributorId} уже отдал все карты или не должен участвовать в штрафе`);
             return;
           }
           
           const contributor = players.find(p => p.id === contributorId);
           const targetPlayer = players.find(p => p.id === targetId);
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
          console.log(`📊 [contributePenaltyCard] До: ${contributor.name} имеет ${contributor.cards.length} карт`);
          
          // Создаем новое состояние
          const newPlayers = players.map(player => ({ ...player, cards: [...player.cards] }));
          const contributorIndex = newPlayers.findIndex(p => p.id === contributorId);
          const targetIndex = newPlayers.findIndex(p => p.id === targetId);
          
          // Убираем карту у отдающего
          newPlayers[contributorIndex].cards.splice(cardIndex, 1);
          console.log(`📊 [contributePenaltyCard] После: ${contributor.name} будет иметь ${newPlayers[contributorIndex].cards.length} карт`);
          
          // ✅ НОВАЯ МЕХАНИКА: Карта сразу идет к штрафнику (НЕ в стопку!)
          card.open = true; // ✅ Карта остается открытой во 2-й стадии!
          newPlayers[targetIndex].cards.push(card);
          console.log(`📊 [contributePenaltyCard] ${targetPlayer.name} получил карту! Теперь ${newPlayers[targetIndex].cards.length} карт`);
           
           // НОВОЕ ПРАВИЛО: Если у отдающего осталась 1 карта - он должен объявить "одна карта!"
           if (newPlayers[contributorIndex].cards.filter(c => c.open).length === 1) {
             console.log(`🃏 [contributePenaltyCard] У ${contributor.name} осталась 1 открытая карта - нужно объявить!`);
             
             // ✅ ИСПРАВЛЕНО: Проверяем что игрок ЕЩЁ НЕ ОБЪЯВИЛ
             const { oneCardDeclarations } = get();
             if (!oneCardDeclarations[contributorId]) {
             setTimeout(() => {
               if (contributor.isBot) {
                 // Бот автоматически объявляет через 1.5 секунды
                   const { oneCardDeclarations: currentDeclarations } = get();
                   if (!currentDeclarations[contributorId]) {
                 get().showNotification(`🤖 ${contributor.name}: "ОДНА КАРТА!"`, 'info', 3000);
                 setTimeout(() => {
                   get().declareOneCard(contributorId);
                 }, 1500); // Увеличено до 1.5 секунды
                   } else {
                     console.log(`⚠️ [contributePenaltyCard] Бот ${contributor.name} УЖЕ объявил - пропускаем`);
                   }
               } else {
                 // Для пользователя - НЕ АВТОМАТИЧЕСКИ! Только планируем проверку ботами
                 console.log(`👤 [contributePenaltyCard] Пользователь ${contributor.name} должен сам объявить "одна карта!"`);
                 // Боты будут спрашивать через checkOneCardStatus
               }
             }, 1000);
             } else {
               console.log(`⚠️ [contributePenaltyCard] ${contributor.name} УЖЕ ОБЪЯВИЛ - пропускаем таймер`);
             }
           }
           
           // ✅ НОВАЯ ЛОГИКА: Добавляем в contributorsCompleted
           const newContributorsCompleted = { ...pendingPenalty.contributorsCompleted };
           if (!newContributorsCompleted[contributorId]) {
             newContributorsCompleted[contributorId] = {};
           }
           newContributorsCompleted[contributorId][targetId] = cardId;
           
           // Проверяем сколько карт отдал этот игрок
           const targetIds = Array.isArray(pendingPenalty.targetPlayerId) 
             ? pendingPenalty.targetPlayerId 
             : [pendingPenalty.targetPlayerId];
           const cardsGivenByContributor = Object.keys(newContributorsCompleted[contributorId] || {}).length;
           const cardsNeededByContributor = Math.min(contributor.cards.length + 1, targetIds.length); // +1 потому что мы уже убрали карту
           
           console.log(`✅ [contributePenaltyCard] ${contributor.name} отдал ${cardsGivenByContributor}/${cardsNeededByContributor} карт`);
           
           // Проверяем: ВСЕ ли игроки отдали нужное количество карт?
           const allContributorsCompleted = pendingPenalty.contributorsNeeded.every(contribId => {
             const contribPlayer = players.find(p => p.id === contribId);
             if (!contribPlayer) return true; // Игрок не найден - считаем что завершил
             
             const cardsGiven = Object.keys(newContributorsCompleted[contribId] || {}).length;
             const cardsNeeded = Math.min(contribPlayer.cards.length, targetIds.length);
             return cardsGiven >= cardsNeeded;
           });
           
           let newPendingPenalty = null;
           if (allContributorsCompleted) {
             // ✅ ВСЕ СКИНУЛИ! ШТРАФ ЗАВЕРШЕН!
             console.log(`✅ [contributePenaltyCard] ВСЕ СКИНУЛИ! Штраф завершен для ${targetIds.length} игроков`);
             // НЕ вызываем distributePenaltyCards - карты уже розданы!
           } else {
             // Ждём остальных
             newPendingPenalty = {
               ...pendingPenalty,
               contributorsCompleted: newContributorsCompleted
             };
             const remaining = pendingPenalty.contributorsNeeded.filter(id => {
               const p = players.find(pl => pl.id === id);
               if (!p) return false;
               const given = Object.keys(newContributorsCompleted[id] || {}).length;
               const needed = Math.min(p.cards.length, targetIds.length);
               return given < needed;
             });
             console.log(`⏳ [contributePenaltyCard] Ждём ещё ${remaining.length} игроков...`);
           }
           
          // ✅ ИСПРАВЛЕНО: Закрываем модалку ТОЛЬКО если игрок отдал ВСЕ нужные карты
          const { showPenaltyCardSelection, penaltyCardSelectionPlayerId } = get();
          const shouldCloseModal = showPenaltyCardSelection 
            && penaltyCardSelectionPlayerId === contributorId 
            && cardsGivenByContributor >= cardsNeededByContributor;
          
          set({ 
            players: newPlayers,
            pendingPenalty: newPendingPenalty,
            isGamePaused: newPendingPenalty !== null, // ✅ ВОЗОБНОВЛЯЕМ ИГРУ если штраф завершен!
            showPenaltyCardSelection: shouldCloseModal ? false : showPenaltyCardSelection,
            penaltyCardSelectionPlayerId: shouldCloseModal ? null : penaltyCardSelectionPlayerId
          });
          
          if (shouldCloseModal) {
            console.log(`✅ [contributePenaltyCard] ${contributor.name} отдал все карты - закрываем модалку`);
          }
          
          // ✅ КРИТИЧНО: СРАЗУ ПРОВЕРЯЕМ ПЕНЬКИ ДЛЯ ВСЕХ ИГРОКОВ!
          // Это нужно делать ДО продолжения игры!
          console.log(`🔍 [contributePenaltyCard] Проверяем активацию пеньков для всех игроков...`);
          newPlayers.forEach(player => {
            if (player.cards.length === 0 && player.penki.length > 0) {
              console.log(`🃏 [contributePenaltyCard] ${player.name} без карт - активируем пеньки!`);
              get().checkStage3Transition(player.id);
            }
          });
          
          // Проверяем победу СРАЗУ (до продолжения игры)
          get().checkVictoryCondition();
          
          // Обновляем статус "одна карта" СРАЗУ
          get().checkOneCardStatus();
          
          // ✅ ЕСЛИ ШТРАФ ЗАВЕРШЕН - ВОЗОБНОВЛЯЕМ ИГРУ!
          if (allContributorsCompleted) {
            console.log(`▶️ [contributePenaltyCard] ✅ ШТРАФ ЗАВЕРШЕН! ИГРА ВОЗОБНОВЛЕНА! (isGamePaused = false)`);
            get().showNotification(`✅ Штраф завершен! Игра продолжается!`, 'success', 3000);
            
            // ✅ КРИТИЧНО: ПРИНУДИТЕЛЬНО СНИМАЕМ ПАУЗУ!
            set({ isGamePaused: false });
            console.log(`🔓 [contributePenaltyCard] isGamePaused = false УСТАНОВЛЕНО!`);
            
            // Продолжаем игру с того же игрока
            const { currentPlayerId, gameStage } = get();
            if (gameStage === 2 && currentPlayerId) {
              // ✅ КРИТИЧНО: Проверяем что у текущего игрока ЕСТЬ КАРТЫ!
              const currentPlayerData = get().players.find(p => p.id === currentPlayerId);
              if (currentPlayerData && currentPlayerData.cards.length === 0 && currentPlayerData.penki.length === 0) {
                console.log(`⚠️ [contributePenaltyCard] У ${currentPlayerData.name} нет карт - передаем ход`);
                setTimeout(() => {
                  get().nextTurn();
                }, 500);
              } else {
                setTimeout(() => {
                  set({ stage2TurnPhase: 'selecting_card' });
                  get().processPlayerTurn(currentPlayerId);
             }, 1000);
           }
            } else if (gameStage === 1 && currentPlayerId) {
              // ✅ ЕСЛИ 1-Я СТАДИЯ - ПРОСТО ПРОДОЛЖАЕМ ИГРУ
              console.log(`▶️ [contributePenaltyCard] Стадия 1: игра продолжается автоматически`);
            }
          }
           
           get().showNotification(`✅ ${contributor.name} отдал карту ${targetPlayer.name}!`, 'success', 2000);
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
         
        // ✅ УЛУЧШЕНО: Синхронизация состояния игры от сервера
         syncGameState: (remoteGameState) => {
          const { multiplayerData, currentPlayerId } = get();
           if (!multiplayerData) return;
           
          console.log(`🌐 [syncGameState] Синхронизация состояния игры:`, remoteGameState);
           
           // Осторожно обновляем состояние, проверяя каждое поле
           const stateUpdates: any = {};
           
           // Синхронизируем базовые поля игры
           if (remoteGameState.gameStage !== undefined) stateUpdates.gameStage = remoteGameState.gameStage;
           if (remoteGameState.currentPlayerId !== undefined) stateUpdates.currentPlayerId = remoteGameState.currentPlayerId;
           if (remoteGameState.trumpSuit !== undefined) stateUpdates.trumpSuit = remoteGameState.trumpSuit;
           if (remoteGameState.tableStack !== undefined) stateUpdates.tableStack = [...remoteGameState.tableStack];
           if (remoteGameState.stage2TurnPhase !== undefined) stateUpdates.stage2TurnPhase = remoteGameState.stage2TurnPhase;
          if (remoteGameState.roundInProgress !== undefined) stateUpdates.roundInProgress = remoteGameState.roundInProgress;
          if (remoteGameState.currentRoundInitiator !== undefined) stateUpdates.currentRoundInitiator = remoteGameState.currentRoundInitiator;
          if (remoteGameState.roundFinisher !== undefined) stateUpdates.roundFinisher = remoteGameState.roundFinisher;
          if (remoteGameState.deck !== undefined && Array.isArray(remoteGameState.deck)) stateUpdates.deck = [...remoteGameState.deck];
          if (remoteGameState.playedCards !== undefined && Array.isArray(remoteGameState.playedCards)) stateUpdates.playedCards = [...remoteGameState.playedCards];
           
           // Синхронизируем игроков (осторожно, не перезаписывая локального пользователя)
           if (remoteGameState.players && Array.isArray(remoteGameState.players)) {
             const { players } = get();
             const updatedPlayers = players.map(localPlayer => {
               const remotePlayer = remoteGameState.players.find((p: any) => p.id === localPlayer.id);
               if (remotePlayer && !localPlayer.isUser) {
                 // Обновляем данные бота/других игроков
                 return {
                   ...localPlayer,
                  // ✅ ФИКС: Проверяем что массивы НЕ ПУСТЫЕ!
                  cards: (remotePlayer.cards && remotePlayer.cards.length > 0) ? remotePlayer.cards : localPlayer.cards,
                  penki: (remotePlayer.penki && remotePlayer.penki.length > 0) ? remotePlayer.penki : localPlayer.penki,
                  isWinner: remotePlayer.isWinner !== undefined ? remotePlayer.isWinner : localPlayer.isWinner,
                  finishTime: remotePlayer.finishTime || localPlayer.finishTime
                 };
               }
               return localPlayer;
             });
             stateUpdates.players = updatedPlayers;
           }
           
           // Применяем обновления
           set(stateUpdates);
          
          console.log(`✅ [syncGameState] Состояние синхронизировано:`, Object.keys(stateUpdates));
         },
         
        // ✅ РЕАЛИЗОВАНО: Отправка хода игрока через Supabase Realtime
        sendPlayerMove: async (moveData) => {
           const { multiplayerData } = get();
          if (!multiplayerData) {
            console.warn(`🌐 [sendPlayerMove] Нет данных мультиплеера!`);
            return;
          }
           
           console.log(`🌐 [Multiplayer] Отправляем ход игрока:`, moveData);
           
          try {
            // Инициализируем RoomManager если не создан
            if (!roomManager) {
              roomManager = new RoomManager();
            }
            
            // Отправляем через broadcast в комнату
            await roomManager.broadcastMove(multiplayerData.roomId, {
              type: moveData.type,
              playerId: moveData.playerId,
              cardId: moveData.cardId,
              targetId: moveData.targetId,
              contributorId: moveData.contributorId,
              timestamp: Date.now()
            });
            
            console.log(`✅ [sendPlayerMove] Ход отправлен успешно:`, moveData.type);
          } catch (error) {
            console.error(`❌ [sendPlayerMove] Ошибка отправки хода:`, error);
          }
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
                // ✅ РЕАЛИЗОВАНО: Применяем сыгранную карту
                 if (moveData.cardId && moveData.playerId) {
                  console.log(`🃏 [applyRemoteMove] Игрок ${moveData.playerId} играет карту ${moveData.cardId}`);
                  
                  const { players, gameStage } = get();
                  const player = players.find(p => p.id === moveData.playerId);
                  
                  if (!player) {
                    console.warn(`⚠️ [applyRemoteMove] Игрок ${moveData.playerId} не найден`);
                    return;
                  }
                  
                  // Для 2-й/3-й стадии - используем selectHandCard + playSelectedCard
                  if (gameStage === 2 || gameStage === 3) {
                    const card = player.cards.find(c => c.id === moveData.cardId);
                    if (card) {
                      get().selectHandCard(card);
                      setTimeout(() => {
                        get().playSelectedCard();
                      }, 100);
                    }
                  } else {
                    // Для 1-й стадии - используем makeMove
                    if (moveData.targetId) {
                      get().makeMove(moveData.targetId);
                    }
                  }
                 }
                 break;
                 
               case 'card_taken':
                // ✅ РЕАЛИЗОВАНО: Игрок взял карту
                 if (moveData.playerId) {
                  console.log(`🃏 [applyRemoteMove] Игрок ${moveData.playerId} берет карту`);
                  
                  const { gameStage } = get();
                  
                  // Для 2-й стадии - взятие карт со стола
                  if (gameStage === 2 || gameStage === 3) {
                    // Используем takeTableCards только если текущий игрок
                    const { currentPlayerId } = get();
                    if (currentPlayerId === moveData.playerId) {
                      get().takeTableCards();
                    }
                  } else {
                    // Для 1-й стадии - взятие из колоды
                    const { currentPlayerId } = get();
                    if (currentPlayerId === moveData.playerId) {
                      get().drawCardFromDeck();
                    }
                  }
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
                if (moveData.contributorId && moveData.cardId && moveData.targetId) {
                  get().contributePenaltyCard(moveData.contributorId, moveData.cardId, moveData.targetId);
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
           
           // ПРАВИЛЬНО: Проверяем ОТКРЫТЫЕ карты (включая открытые пеньки!)
           const openCards = target.cards.filter(c => c.open);
           if (openCards.length !== 1) {
             console.log(`🤖 [scheduleBotAskHowManyCards] У ${target.name} ${openCards.length} открытых карт, не 1 - отменяем`);
             return; // Не 1 открытая карта
           }
           
           if (oneCardDeclarations[targetPlayerId]) {
             console.log(`🤖 [scheduleBotAskHowManyCards] ${target.name} уже объявил "одну карту", ботам спрашивать не нужно`);
             return; // Уже объявил
           }
           
           const delay = get().calculateAdaptiveDelay();
           
           console.log(`🤖 [scheduleBotAskHowManyCards] Планируем вопрос ботов к ${target.name} через ${delay}ms (у него ${openCards.length} открытых карт)`);
           
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
        // ✅ КРИТИЧНО: При перезагрузке страницы НЕ восстанавливаем активную игру!
        // Это предотвращает показ модалок победителей и другие артефакты
        isGameActive: false, // ✅ Всегда false после перезагрузки!
        gameMode: state.gameMode,
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
        playersWithOneCard: state.playersWithOneCard,
        pendingPenalty: state.pendingPenalty,
        isGamePaused: state.isGamePaused, // ✅ НОВОЕ: Флаг паузы игры
        
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