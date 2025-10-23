import React from 'react'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { createPlayers, generateAvatar } from '../lib/game/avatars'
import { calculateRatingRewards, calculatePlayerPositions } from '../lib/rating/ratingSystem'

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
  players: Player[]
  currentPlayerId: string | null
  deck: Card[]
  playedCards: Card[]
  lastPlayedCard: Card | null
  
  // НОВАЯ МЕХАНИКА: Стопка штрафных карт
  penaltyDeck: Card[]
  
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
  oneCardTimers: {[playerId: string]: number} // Таймеры для объявления (timestamp)
  playersWithOneCard: string[] // Игроки у которых 1 карта (для проверки штрафов)
  pendingPenalty: {targetPlayerId: string, contributorsNeeded: string[]} | null // Ожидающий штраф
  
  // UI для выбора карты для штрафа
  showPenaltyCardSelection: boolean // Показать UI выбора карты для штрафа
  penaltyCardSelectionPlayerId: string | null // ID игрока который выбирает карту
  
  // Система рейтинга и результатов
  eliminationOrder: string[] // Порядок выбывания игроков (первый = последнее место)
  isRankedGame: boolean // Рейтинговая игра или нет
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
  winnerModalData: { playerName: string; place: number; avatar?: string } | null
  showLoserModal: boolean
  loserModalData: { playerName: string; avatar?: string } | null
  
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
  
  // Методы для системы "Одна карта!" и штрафов
  checkOneCardStatus: () => void // Проверяет кому нужно объявлять "одна карта"
  declareOneCard: (playerId: string) => void // Игрок объявляет "одна карта"
  askHowManyCards: (askerPlayerId: string, targetPlayerId: string) => void // Спросить сколько карт
  startPenaltyProcess: (forgetfulPlayerId: string) => void // Начать процесс штрафа
  contributePenaltyCard: (contributorId: string, cardId: string) => void // Отдать карту за штраф
  cancelPenalty: () => void // Отменить штраф
  findWorstCardInHand: (cards: Card[], trumpSuit: string | null) => Card | null // Найти плохую карту
  
  // НОВЫЕ МЕТОДЫ ДЛЯ ШТРАФНОЙ СТОПКИ
  addCardToPenaltyDeck: (card: Card) => void // Добавить карту в штрафную стопку
  distributePenaltyCards: (targetPlayerId: string) => void // Раздать штрафные карты игроку
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
      players: [],
      currentPlayerId: null,
      deck: [...DEFAULT_CARDS],
      playedCards: [],
      lastPlayedCard: null,
      
      // НОВАЯ МЕХАНИКА: Стопка штрафных карт
      penaltyDeck: [],
      
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
      
      // UI для выбора карты для штрафа
      showPenaltyCardSelection: false,
      penaltyCardSelectionPlayerId: null,
      
      // Система рейтинга и результатов
      eliminationOrder: [],
      isRankedGame: false,
      showVictoryModal: false,
      victoryData: null,
      
      // 🎉 МОДАЛКИ ПОБЕДИТЕЛЕЙ И ПРОИГРАВШЕГО
      showWinnerModal: false,
      winnerModalData: null,
      showLoserModal: false,
      loserModalData: null,
      
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
        
        // Проверяем что у нас ровно 52 карты
        
        // Перемешиваем колоду
        const shuffledImages = [...standardDeck].sort(() => Math.random() - 0.5);
        
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
      addCardToPenaltyDeck: (card) => {
        const { penaltyDeck } = get();
        console.log(`⚠️ [addCardToPenaltyDeck] Добавляем карту ${card.image} в штрафную стопку`);
        set({ penaltyDeck: [...penaltyDeck, card] });
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
            const penaltyCardsForPlayer = penaltyDeck.map(card => ({ 
              ...card, 
              open: true // ✅ Все карты открыты во 2-й стадии!
            }));
            const newCards = [...player.cards, ...penaltyCardsForPlayer];
            console.log(`📊 [distributePenaltyCards] После штрафа: ${player.name} будет иметь ${newCards.length} карт`);
            console.log(`🃏 [distributePenaltyCards] Добавленные карты:`, penaltyCardsForPlayer.map(c => c.image));
            return { ...player, cards: newCards };
          }
          return player;
        });
        
        // Очищаем штрафную стопку и обновляем игроков
        set({ 
          penaltyDeck: [],
          players: newPlayers,
          pendingPenalty: null // ВАЖНО: Сбрасываем pendingPenalty чтобы убрать кнопку
        });
        
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
        // Проверяем кто сейчас ходит
        const currentPlayerId = get().currentPlayerId;
        if (currentPlayerId && gameStage === 2) {
          console.log(`⚠️ [distributePenaltyCards] Продолжаем ход игрока ${currentPlayerId}`);
          setTimeout(() => {
            get().processPlayerTurn(currentPlayerId);
          }, 1000);
        }
        
        // ✅ ВАЖНО: Проверяем статус "одна карта" после раздачи штрафа
        setTimeout(() => {
          get().checkOneCardStatus();
        }, 1500);
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
          
          // ✅ ИСПРАВЛЕНО: Пеньки ОСТАЮТСЯ в penki[] при переходе во 2-ю стадию!
          // Они активируются ТОЛЬКО когда закончатся карты в руке (переход в 3-ю стадию)
          console.log(`🃏 [checkStage1End] ${p.name}: ${p.cards.length} карт в руке, ${p.penki.length} пеньков`);
          
          // ✅ ИСПРАВЛЕНО: ВСЕ карты во 2-й стадии - ОТКРЫТЫЕ (open: true)!
          // Визуальное отображение (рубашкой вверх для других игроков) контролируется в UI
          p.cards = p.cards.map(card => ({
            ...card,
            open: true // ✅ ВСЕ карты открыты (для логики игры)
          }));
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
          // ✅ КРИТИЧНО: Очищаем штраф и таймеры при переходе во 2-ю стадию
          pendingPenalty: null,
          showPenaltyCardSelection: false,
          penaltyCardSelectionPlayerId: null,
          oneCardDeclarations: {},
          oneCardTimers: {},
          playersWithOneCard: []
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
          
          // Даём время на обновление state и ЗАТЕМ запускаем ход
          setTimeout(() => {
            console.log(`🎮 [checkStage1End] Запускаем processPlayerTurn для ${players.find(p => p.id === startingPlayerId)?.name}`);
            get().processPlayerTurn(startingPlayerId);
          }, 300);
        }, 800);
      },
      
      // Обработка хода игрока (НОВАЯ логика)
      processPlayerTurn: (playerId: string) => {
        const { gameStage, players, skipHandAnalysis, deck } = get();
        const currentPlayer = players.find(p => p.id === playerId);
        if (!currentPlayer) return;
        
        // ИСПРАВЛЕНО: Обрабатываем 2-ю и 3-ю стадии одинаково (правила дурака)
        if (gameStage === 2 || gameStage === 3) {
          // ✅ ОПТИМИЗАЦИЯ: Убрали лишний лог (слишком частый во 2-й стадии)
          // console.log(`🎮 [processPlayerTurn] Стадия ${gameStage}: ${currentPlayer.name} (${currentPlayer.cards.length} карт, ${currentPlayer.penki.length} пеньков)`);
          set({ 
            currentPlayerId: currentPlayer.id,
            stage2TurnPhase: 'selecting_card'
          });
          
          if (!currentPlayer.isBot) {
            get().showNotification(`${currentPlayer.name}: выберите карту для хода`, 'info', 5000);
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
          console.log(`📊 [playSelectedCard P.I.D.R.] У ${currentPlayer.name}: ${currentPlayer.cards.length} карт в руке, ${currentPlayer.penki.length} пеньков`);
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
             
             // КРИТИЧНО: Помечаем игрока как победителя НЕМЕДЛЕННО
             const updatedPlayers = players.map(p => 
               p.id === currentPlayer.id ? { ...p, isWinner: true } : p
             );
             set({ players: updatedPlayers });
             
             // Добавляем игрока в порядок выбывания (первые места)
             const { eliminationOrder } = get();
             const newEliminationOrder = [...eliminationOrder];
             if (!newEliminationOrder.includes(currentPlayer.id)) {
               newEliminationOrder.unshift(currentPlayer.id); // Добавляем в начало (лучшие места)
               set({ eliminationOrder: newEliminationOrder });
             }
             
             // Показываем модальное окно победы на 3.5 секунды
             const position = newEliminationOrder.length; // Место игрока (1-й, 2-й, 3-й...)
             const positionText = position === 1 ? '1-е место' : position === 2 ? '2-е место' : position === 3 ? '3-е место' : `${position}-е место`;
             
             get().showNotification(`🏆 ${currentPlayer.name} - ${positionText}!`, 'success', 3500);
             
             console.log(`🏆 [playSelectedCard] ${currentPlayer.name} занял ${position}-е место`);
             
             // КРИТИЧНО: Принудительно вызываем проверку победы
             setTimeout(() => {
               get().checkVictoryCondition();
             }, 100);
           }
           
           // Добавляем карту на стол (поверх всех)
           const playedCard = { ...selectedHandCard };
           playedCard.open = true;
           
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
          const { currentPlayerId, players, tableStack, roundFinisher, currentRoundInitiator } = get();
          
          console.log(`🎴 [takeTableCards] currentPlayerId=${currentPlayerId}, tableStack.length=${tableStack.length}`);
          
          if (!currentPlayerId || tableStack.length === 0) {
            console.log('🎴 [takeTableCards] БЛОКИРОВКА: нет currentPlayerId или пустой стол');
            return;
          }
          
          const currentPlayer = players.find(p => p.id === currentPlayerId);
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
            
            // Помечаем новых победителей
            const updatedPlayers = players.map(player => {
              if (newWinners.some(w => w.id === player.id)) {
                return { ...player, isWinner: true };
              }
              return player;
            });
            
            set({ players: updatedPlayers });
            
            // ✅ УЛУЧШЕННОЕ ОБЪЯВЛЕНИЕ ПОБЕДИТЕЛЕЙ С АНИМАЦИЕЙ
            newWinners.forEach((winner, index) => {
              const position = existingWinners.length + index + 1;
              const medals = ['🥇', '🥈', '🥉', '🏅', '🏅', '🏅'];
              const medal = medals[position - 1] || '🏅';
              const positionText = position === 1 ? '1-е место' : position === 2 ? '2-е место' : position === 3 ? '3-е место' : `${position}-е место`;
              
              console.log(`🎉 ОБЪЯВЛЯЕМ ПОБЕДИТЕЛЯ: ${winner.name} - ${positionText}`);
              
              // ✅ КРАСИВОЕ УВЕДОМЛЕНИЕ С МЕДАЛЬЮ
              get().showNotification(
                `${medal} ${winner.name} - ${positionText}! 🎉`, 
                'success', 
                7000
              );
              
              // 🎉 ПОКАЗЫВАЕМ МОДАЛКУ ПОБЕДИТЕЛЯ ДЛЯ ВСЕХ (не только для пользователя)
              setTimeout(() => {
                set({
                  showWinnerModal: true,
                  winnerModalData: {
                    playerName: winner.name,
                    place: position,
                    avatar: winner.avatar
                  }
                });
                
                // Автоматически скрываем модалку через 3 секунды
                setTimeout(() => {
                  set({
                    showWinnerModal: false,
                    winnerModalData: null
                  });
                }, 3000);
              }, 500 + index * 200); // Задержка между модалками если несколько победителей одновременно
              
              // Если это пользователь - показываем также старое модальное окно
              if (winner.isUser) {
                setTimeout(() => {
                  set({
                    showVictoryModal: true,
                    victoryData: {
                      position: position,
                      isWinner: true,
                      playerName: winner.name,
                      gameMode: get().gameMode,
                      ratingChange: 50,
                      rewardsEarned: 100
                    }
                  });
                }, 500);
              }
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
                
                // Если проигравший - пользователь
                if (loser.isUser) {
                  setTimeout(() => {
                    set({
                      showVictoryModal: true,
                      victoryData: {
                        position: players.length, // Последнее место
                        isWinner: false,
                        playerName: loser.name,
                        gameMode: get().gameMode,
                        ratingChange: -25,
                        rewardsEarned: 0
                      }
                    });
                  }, 2000);
                }
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
              
            }, newWinners.length > 0 ? 3000 : 1000); // Ждем объявления победителей
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
            // ✅ ИСПРАВЛЕНО: Считаем ТОЛЬКО карты в руке (player.cards), БЕЗ пеньков (player.penki)!
            // Пеньки открываются ТОЛЬКО когда рука пустая!
            const cardsInHand = player.cards.length; // Карты В РУКЕ (без пеньков!)
            const penkiCount = player.penki.length; // Пеньки (отдельно, не считаются!)
            const hasAlreadyDeclared = oneCardDeclarations[player.id] === true;
            
            // ✅ ОПТИМИЗАЦИЯ: Логируем ТОЛЬКО если 1 карта И НЕ объявлено
            // Убрали спам логами для игроков с != 1 картой или уже объявивших
            if (cardsInHand === 1 && !hasAlreadyDeclared) {
              console.log(`⚠️ [checkOneCardStatus] ${player.name} - 1 КАРТА! Объявлено: ${hasAlreadyDeclared ? 'ДА' : 'НЕТ'}`);
            }
            
            // Проверяем есть ли у игрока ровно 1 карта В РУКЕ (БЕЗ пеньков!)
            if (cardsInHand === 1) {
               newPlayersWithOneCard.push(player.id);
               
               // ✅ КРИТИЧНО: Если уже объявил "одна карта" - НЕ ПРОВЕРЯЕМ СНОВА!
               if (hasAlreadyDeclared) {
                 // Игрок уже объявил - пропускаем все проверки и таймеры
                 return;
               }
               
               // Если игрок еще не объявил "одна карта" и у него нет таймера
               if (!oneCardTimers[player.id]) {
                 // Запускаем таймер на 5 секунд для объявления
                 newOneCardTimers[player.id] = currentTime + 5000; // 5 секунд на объявление
                 
                 console.log(`⏰ [checkOneCardStatus] У игрока ${player.name} 1 карта в руке! Запущен таймер на объявление (до ${new Date(newOneCardTimers[player.id]).toLocaleTimeString()})`);
                 
                 // Уведомляем игрока (если это человек)
                 if (!player.isBot) {
                  get().showNotification(`⚠️ У вас осталась 1 карта! ОБЯЗАТЕЛЬНО нажмите "Одна карта!" в течение 5 секунд!`, 'warning', 5000);
                }
                 
                // ===== ИСПРАВЛЕНО: БОТЫ АВТОМАТИЧЕСКИ ОБЪЯВЛЯЮТ И СПРАШИВАЮТ =====
                if (player.isBot) {
                  // БОТ АВТОМАТИЧЕСКИ ОБЪЯВЛЯЕТ "ОДНА КАРТА!" через 3.5 секунды
                  setTimeout(() => {
                    const { oneCardDeclarations } = get();
                    if (!oneCardDeclarations[player.id]) {
                      console.log(`🤖 [checkOneCardStatus] Бот ${player.name} автоматически объявляет: "ОДНА КАРТА!"`);
                      get().showNotification(`🤖 ${player.name}: "ОДНА КАРТА!"`, 'info', 3000);
                      get().declareOneCard(player.id);
                    }
                  }, 3500); // ✅ Задержка 3.5 секунды
                } else {
                  // Для человека - планируем вопрос ботов ТОЛЬКО ОДИН РАЗ
                  // ✅ ИСПРАВЛЕНО: Проверяем что не спрашивали ранее
                  const alreadyScheduled = get().oneCardTimers[`bot_asked_${player.id}`];
                  if (!alreadyScheduled) {
                    console.log(`🤖 [checkOneCardStatus] Планируем вопрос ботов для ${player.name} (ПЕРВЫЙ РАЗ)`);
                    get().scheduleBotAskHowManyCards(player.id);
                    // Помечаем что уже запланировали
                    newOneCardTimers[`bot_asked_${player.id}`] = currentTime;
                  }
                }
                
               // ✅ ИСПРАВЛЕНО: Боты проверяют ТОЛЬКО ОДИН РАЗ при появлении таймера
               // НЕ ЗАПУСКАЕМ если уже спрашивали ранее (проверяем по pendingPenalty)
               }
            } else if (cardsInHand !== 1) {
              // ✅ КРИТИЧНО: У игрока больше или меньше 1 карты - СБРАСЫВАЕМ объявление и таймер
              // Теперь при новых картах игрок СНОВА должен объявить!
              if (oneCardDeclarations[player.id] || oneCardTimers[player.id] || oneCardTimers[`bot_asked_${player.id}`]) {
                console.log(`🔄 [checkOneCardStatus] ${player.name}: ${cardsInHand} карт → СБРОС объявления (нужно объявлять заново)`);
                delete newOneCardDeclarations[player.id];
                delete newOneCardTimers[player.id];
                delete newOneCardTimers[`bot_asked_${player.id}`]; // ✅ Сбрасываем флаг вопроса ботов
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
          const { players, oneCardDeclarations, oneCardTimers, gameStage } = get();
          const player = players.find(p => p.id === playerId);
          if (!player) return;
          
          const openCards = player.cards.filter(c => c.open);
          const totalCards = player.cards.length;
          
          // Во 2-й/3-й стадии считаем все карты (без пеньков), в 1-й стадии - только открытые
          const cardsInPlay = (gameStage === 2 || gameStage === 3) ? totalCards : openCards.length;
          
          // Проверяем что у игрока действительно 1 карта в игре
          if (cardsInPlay !== 1) {
            get().showNotification(`❌ ${player.name}: неправильное объявление! У вас ${cardsInPlay} карт`, 'error', 3000);
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
          const { players, oneCardDeclarations, oneCardTimers, gameStage } = get();
          const asker = players.find(p => p.id === askerPlayerId);
          const target = players.find(p => p.id === targetPlayerId);
          
          if (!asker || !target) return;
          
          const targetOpenCards = target.cards.filter(c => c.open);
          const targetTotalCards = target.cards.length;
          const currentTime = Date.now();
          
          // ОТОБРАЖАЕМ только открытые карты (пеньки = закрытые, НЕ показываем!)
          console.log(`❓ [askHowManyCards] ${asker.name} спрашивает у ${target.name} сколько карт`);
          console.log(`❓ [askHowManyCards] У ${target.name}: открытых=${targetOpenCards.length}, всего=${targetTotalCards} (показываем ТОЛЬКО открытые!)`);
          
          // Показываем только ОТКРЫТЫЕ карты (пеньки закрыты - не показываем)
          get().showNotification(`📊 ${target.name} имеет ${targetOpenCards.length} открыт${targetOpenCards.length === 1 ? 'ую' : 'ых'} карт${targetOpenCards.length === 1 ? 'у' : ''}`, 'info', 4000);
           
          // ШТРАФ проверяем по ОБЩЕМУ количеству карт (включая пеньки)
          console.log(`🎯 [askHowManyCards] Проверка штрафа: всего карт=${targetTotalCards}`);
          
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
          
          // ✅ ИСПРАВЛЕНО: Боты автоматически отдают карты, люди НЕ получают модалку автоматически!
          // Модалка открывается ТОЛЬКО когда игрок нажимает кнопку "Сдать штраф"
          contributorsNeeded.forEach((playerId, index) => {
            const player = players.find(p => p.id === playerId);
            
            if (player?.isBot) {
              // Для ботов - автоматически выбираем худшие карты с задержкой
              setTimeout(() => {
                const openCards = player.cards.filter(c => c.open);
                const worstCard = get().findWorstCardInHand(openCards, get().trumpSuit);
                if (worstCard) {
                  console.log(`🤖 [startPenaltyProcess] Бот ${player.name} автоматически выбирает худшую карту для штрафа`);
                  get().contributePenaltyCard(playerId, worstCard.id);
                }
              }, (index + 1) * 1000); // Боты отдают карты с задержкой
            }
            // Для людей - НЕ показываем модалку автоматически!
            // Они сами нажмут кнопку "Сдать штраф"
          });
         },
         
         // Игрок отдает карту за штраф
         contributePenaltyCard: (contributorId: string, cardId: string) => {
           const { players, pendingPenalty } = get();
           if (!pendingPenalty) return;
           
           // ЗАЩИТА: Проверяем что игрок еще в списке ожидающих (не отдал карту)
           if (!pendingPenalty.contributorsNeeded.includes(contributorId)) {
             console.log(`⚠️ [contributePenaltyCard] Игрок ${contributorId} уже отдал карту или не должен участвовать в штрафе`);
             return;
           }
           
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
           
          console.log(`💸 [contributePenaltyCard] ${contributor.name} отдает карту ${card.image} в штрафную стопку для ${targetPlayer.name}`);
          console.log(`📊 [contributePenaltyCard] До: ${contributor.name} имеет ${contributor.cards.length} карт`);
          
          // Создаем новое состояние
          const newPlayers = players.map(player => ({ ...player, cards: [...player.cards] }));
          const contributorIndex = newPlayers.findIndex(p => p.id === contributorId);
          
          // Убираем карту у отдающего
          newPlayers[contributorIndex].cards.splice(cardIndex, 1);
          console.log(`📊 [contributePenaltyCard] После: ${contributor.name} будет иметь ${newPlayers[contributorIndex].cards.length} карт`);
          
          // НОВАЯ МЕХАНИКА: Добавляем карту в штрафную стопку
          const penaltyCard = { ...card, open: false };
          console.log(`🗂️ [contributePenaltyCard] Добавляем карту ${penaltyCard.image} в штрафную стопку`);
          get().addCardToPenaltyDeck(penaltyCard);
           
           // НОВОЕ ПРАВИЛО: Если у отдающего осталась 1 карта - он должен объявить "одна карта!"
           if (newPlayers[contributorIndex].cards.filter(c => c.open).length === 1) {
             console.log(`🃏 [contributePenaltyCard] У ${contributor.name} осталась 1 открытая карта - нужно объявить!`);
             setTimeout(() => {
               if (contributor.isBot) {
                 // Бот автоматически объявляет через 1.5 секунды
                 get().showNotification(`🤖 ${contributor.name}: "ОДНА КАРТА!"`, 'info', 3000);
                 setTimeout(() => {
                   get().declareOneCard(contributorId);
                 }, 1500); // Увеличено до 1.5 секунды
               } else {
                 // Для пользователя - НЕ АВТОМАТИЧЕСКИ! Только планируем проверку ботами
                 console.log(`👤 [contributePenaltyCard] Пользователь ${contributor.name} должен сам объявить "одна карта!"`);
                 // Боты будут спрашивать через checkOneCardStatus
               }
             }, 1000);
           }
           
           // Убираем игрока из списка ожидающих
           const newContributorsNeeded = pendingPenalty.contributorsNeeded.filter(id => id !== contributorId);
           
           let newPendingPenalty = null;
           if (newContributorsNeeded.length > 0) {
             newPendingPenalty = {
               ...pendingPenalty,
               contributorsNeeded: newContributorsNeeded
             };
           } else {
             // ВСЕ КАРТЫ СОБРАНЫ - раздаем штрафные карты из стопки
             console.log(`⚠️ [contributePenaltyCard] Все штрафные карты собраны - раздаем игроку ${targetPlayer.name}`);
             setTimeout(() => {
               get().distributePenaltyCards(pendingPenalty.targetPlayerId);
             }, 500);
           }
           
          // Скрываем UI выбора карты для текущего игрока
          set({ 
            players: newPlayers,
            pendingPenalty: newPendingPenalty,
            showPenaltyCardSelection: false,
            penaltyCardSelectionPlayerId: null
          });
          
          // ✅ ИСПРАВЛЕНО: НЕ показываем модалку следующему автоматически
          // Каждый игрок должен САМ нажать кнопку "Сдать штраф"
          
          // ✅ ПРОВЕРЯЕМ что карта действительно убралась
          setTimeout(() => {
            const updatedContributor = get().players.find(p => p.id === contributorId);
            if (updatedContributor) {
              console.log(`✅ [contributePenaltyCard] ПРОВЕРКА: ${updatedContributor.name} теперь имеет ${updatedContributor.cards.length} карт`);
            }
          }, 100);
          
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
               
               // ИСПРАВЛЕНО: Проверяем активацию пеньков для ВСЕХ игроков после штрафа
               finalPlayers.forEach(player => {
                 get().checkStage3Transition(player.id);
               });
               
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
        isGameActive: state.isGameActive,
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