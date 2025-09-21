'use client'
import { useState, useMemo, useEffect, useRef } from 'react';
import Image from 'next/image';
import BottomNav from '../../components/BottomNav';
import styles from './GameTable.module.css';
import { useDragAndDrop } from '@/hooks/useDragAndDrop';
import type { Player, Card } from '../../types/game';
import type { Card as StoreCard } from '../../store/gameStore';
import { motion, AnimatePresence } from 'framer-motion';
import React from 'react';
import { ErrorBoundary } from '../../components/ErrorBoundary';
import { useGameStore } from '@/store/gameStore';
import { AIPlayer, AIDifficulty } from '@/lib/game/ai-player';
import MultiplayerGame from '@/components/MultiplayerGame';
import { useWebSocket } from '@/hooks/useWebSocket';
import { useTelegram } from '@/hooks/useTelegram';

const CARD_IMAGES = [
  '2_of_clubs.png','2_of_diamonds.png','2_of_hearts.png','2_of_spades.png',
  '3_of_clubs.png','3_of_diamonds.png','3_of_hearts.png','3_of_spades.png',
  '4_of_clubs.png','4_of_diamonds.png','4_of_hearts.png','4_of_spades.png',
  '5_of_clubs.png','5_of_diamonds.png','5_of_hearts.png','5_of_spades.png',
  '6_of_clubs.png','6_of_diamonds.png','6_of_hearts.png','6_of_spades.png',
  '7_of_clubs.png','7_of_diamonds.png','7_of_hearts.png','7_of_spades.png',
  '8_of_clubs.png','8_of_diamonds.png','8_of_hearts.png','8_of_spades.png',
  '9_of_clubs.png','9_of_diamonds.png','9_of_hearts.png','9_of_spades.png',
  '10_of_clubs.png','10_of_diamonds.png','10_of_hearts.png','10_of_spades.png',
  'ace_of_clubs.png','ace_of_diamonds.png','ace_of_hearts.png','ace_of_spades.png',
  'jack_of_clubs.png','jack_of_diamonds.png','jack_of_hearts.png','jack_of_spades.png',
  'king_of_clubs.png','king_of_diamonds.png','king_of_hearts.png','king_of_spades.png',
  'queen_of_clubs.png','queen_of_diamonds.png','queen_of_hearts.png','queen_of_spades.png',
];
const CARD_BACK = 'back.png';

// Рассчитываем размеры и позицию стола
const getTableDimensions = () => {
  const vw = Math.min(window.innerWidth, document.documentElement.clientWidth);
  const vh = Math.min(window.innerHeight, document.documentElement.clientHeight);
  
  const isMobile = vw <= 768;
  const isSmallMobile = vw <= 480;
  const isLandscape = vw > vh;
  
  // Размеры стола в пикселях (ОПТИМАЛЬНЫЕ для видимости)
  let tableWidth, tableHeight;
  
  if (isSmallMobile) {
    tableWidth = Math.min(vw * 0.5, 200); // 50% от ширины экрана
    tableHeight = Math.min(vh * 0.25, 150); // 25% от высоты экрана
  } else if (isMobile) {
    tableWidth = Math.min(vw * 0.45, 280); // 45% от ширины экрана
    tableHeight = Math.min(vh * 0.25, 200); // 25% от высоты экрана
  } else {
    tableWidth = Math.min(vw * 0.35, 400); // 35% от ширины экрана для десктопа
    tableHeight = Math.min(vh * 0.3, 320); // 30% от высоты экрана
  }
  
  // Позиция стола (центр экрана)
  const tableX = vw / 2;
  const tableY = vh / 2;
  
  return {
    width: tableWidth,
    height: tableHeight,
    centerX: tableX,
    centerY: tableY,
    // Радиусы овала стола
    radiusX: tableWidth / 2,
    radiusY: tableHeight / 2
  };
};

// ФИКСИРОВАННЫЕ позиции игроков (настроено пользователем через DevTools)
const getCirclePosition = (index: number, totalPlayers: number): { top: string; left: string } => {
  // Ваши точные позиции ПО ЧАСОВОЙ СТРЕЛКЕ (снизу слева → вправо → вверх → влево)
  const fixedPositions = [
    { left: '-52.4997%', top: '119.7888%' },    // Игрок 1 (снизу слева) - НАЧАЛО
    { left: '10.9545%', top: '125.0384%' },     // Игрок 2 (снизу центр)
    { left: '75.0455%', top: '121.0384%' },     // Игрок 3 (снизу справа)
    { left: '110.5003%', top: '49.7888%' },     // Игрок 4 (справа центр)
    { left: '114.6837%', top: '-39.1274%' },    // Игрок 5 (сверху справа)
    { left: '65.6382%', top: '-89.6818%' },     // Игрок 6 (сверху центр-права)
    { left: '5%', top: '-79.2089%' },           // Игрок 7 (сверху центр-лева)
    { left: '-57.3618%', top: '-49.6818%' },    // Игрок 8 (сверху слева)
    { left: '-68%', top: '35%' },               // Игрок 9 (слева центр) - ВАША КОРРЕКТИРОВКА
  ];
  
  // Возвращаем вашу точную позицию или дефолтную для дополнительных игроков
  return fixedPositions[index] || { left: '50%', top: '50%' };
};

function getFirstPlayerIdx(players: Player[]): number {
  for (let i = 0; i < players.length; i++) {
    if (players[i].isUser) return i;
  }
  return 0;
}

interface GamePageContentProps {
  initialPlayerCount?: number;
  isMultiplayer?: boolean;
  multiplayerData?: {
    roomId: string;
    roomCode: string;
    isHost: boolean;
  };
  onGameEnd?: () => void;
}

function GamePageContentComponent({ 
  initialPlayerCount = 4, 
  isMultiplayer = false, 
  multiplayerData,
  onGameEnd 
}: GamePageContentProps) {
  const { user } = useTelegram();
  
  const { 
    isGameActive, gameStage, turnPhase, stage2TurnPhase,
    players, currentPlayerId, deck, availableTargets,
    selectedHandCard, revealedDeckCard, tableStack, trumpSuit,
    oneCardDeclarations, oneCardTimers, playersWithOneCard, pendingPenalty,
    gameCoins,
    startGame, endGame, 
    drawCard, makeMove, onDeckClick, placeCardOnSelfByRules,
    selectHandCard, playSelectedCard, takeTableCards, showNotification,
    declareOneCard, askHowManyCards, contributePenaltyCard, cancelPenalty
  } = useGameStore();

  // Мониторинг tableStack убран - система работает корректно

  const [playerCount, setPlayerCount] = useState(initialPlayerCount);
  
  // Состояние мультиплеера (используем пропсы)
  const [multiplayerRoom, setMultiplayerRoom] = useState<{
    id: string;
    code: string;
    isHost: boolean;
  } | null>(multiplayerData ? {
    id: multiplayerData.roomId,
    code: multiplayerData.roomCode,
    isHost: multiplayerData.isHost
  } : null);
  
  // Обновляем состояние мультиплеера при изменении пропсов
  useEffect(() => {
    if (multiplayerData) {
      setMultiplayerRoom({
        id: multiplayerData.roomId,
        code: multiplayerData.roomCode,
        isHost: multiplayerData.isHost
      });
    }
  }, [multiplayerData]);

  // Отслеживаем завершение игры для мультиплеера
  useEffect(() => {
    if (isMultiplayer && !isGameActive && onGameEnd) {
      console.log('🎮 [GamePageContent] Игра завершена в мультиплеере, вызываем onGameEnd');
      onGameEnd();
    }
  }, [isGameActive, isMultiplayer, onGameEnd]);
  
  // Проверяем что все необходимые функции доступны
  useEffect(() => {
    console.log('🔧 [GamePageContent] Проверка доступности функций:', {
      selectHandCard: !!selectHandCard,
      playSelectedCard: !!playSelectedCard,
      takeTableCards: !!takeTableCards,
      makeMove: !!makeMove,
      onDeckClick: !!onDeckClick
    });
  }, [selectHandCard, playSelectedCard, takeTableCards, makeMove, onDeckClick]);
  const [dealt, setDealt] = useState(false);
  const [gameInitialized, setGameInitialized] = useState(false);
  const [previousGameStage, setPreviousGameStage] = useState(gameStage);

  // Масштабирование элементов игроков в зависимости от количества
  const seatScale = useMemo(() => {
    const n = players.length || playerCount;
    if (n >= 8) return 0.85;
    if (n >= 6) return 0.9;
    return 1; // 5 и меньше
  }, [players.length, playerCount]);

  // Получаем игрока, который сейчас ходит
  const currentTurnPlayer = players.find(p => p.id === currentPlayerId);
  const currentPlayerIndex = players.findIndex(p => p.id === currentPlayerId);
  
  // Получаем пользователя-человека (для UI контейнера карт)
  const humanPlayer = players.find(p => p.isUser);
  
  // Создаем экземпляры ИИ для ботов
  const [aiPlayers, setAiPlayers] = useState<Map<number, AIPlayer>>(new Map());
  
  // Защита от повторных вызовов AI (race condition protection)
  const aiProcessingRef = useRef<string | null>(null);
  
  // Детектируем размер экрана и ориентацию для адаптивности
  const [screenInfo, setScreenInfo] = useState({
    isMobile: false,
    isSmallMobile: false,
    isVerySmallMobile: false,
    isLandscape: false,
    isIPhone: false,
    isAndroid: false,
    viewportWidth: 0,
    viewportHeight: 0,
    safeArea: { top: 0, bottom: 0, left: 0, right: 0 }
  });
  
  // Принудительное обновление позиций при изменении экрана
  const [positionKey, setPositionKey] = useState(0);
  
  useEffect(() => {
    const updateScreenInfo = () => {
      const vw = Math.min(window.innerWidth, document.documentElement.clientWidth);
      const vh = Math.min(window.innerHeight, document.documentElement.clientHeight);
      const isMobile = vw <= 768;
      const isSmallMobile = vw <= 480;
      const isVerySmallMobile = vw <= 375; // iPhone SE и подобные
      const isLandscape = vw > vh;
      
      // Особая проверка для iPhone
      const isIPhone = /iPhone|iPod/.test(navigator.userAgent);
      const isAndroid = /Android/.test(navigator.userAgent);
      
      // Определяем safe areas для iOS и Android
      const safeAreaTop = 
        window.screen && window.screen.height && window.innerHeight < window.screen.height 
          ? Math.max(0, (window.screen.height - window.innerHeight) / 2) 
          : 0;
      
      const newScreenInfo = {
        isMobile,
        isSmallMobile,
        isVerySmallMobile,
        isLandscape,
        isIPhone,
        isAndroid,
        viewportWidth: vw,
        viewportHeight: vh,
        safeArea: {
          top: safeAreaTop,
          bottom: isVerySmallMobile ? 120 : isSmallMobile ? 100 : isMobile ? 80 : 60, // Больше места для iPhone
          left: isIPhone ? 10 : 0, // Отступы по бокам для iPhone
          right: isIPhone ? 10 : 0
        }
      };
      
      setScreenInfo(newScreenInfo);
      // Принудительно обновляем позиции игроков
      setPositionKey(prev => prev + 1);
    };
    
    // Проверяем сразу
    updateScreenInfo();
    
    // Слушатели для всех изменений
    window.addEventListener('resize', updateScreenInfo);
    window.addEventListener('orientationchange', updateScreenInfo);
    
    // Дополнительная проверка после изменения ориентации (Android)
    let orientationTimeout: NodeJS.Timeout;
    const handleOrientationChange = () => {
      clearTimeout(orientationTimeout);
      orientationTimeout = setTimeout(updateScreenInfo, 500);
    };
    
    window.addEventListener('orientationchange', handleOrientationChange);
    
    // Очистка
    return () => {
      window.removeEventListener('resize', updateScreenInfo);
      window.removeEventListener('orientationchange', updateScreenInfo);
      window.removeEventListener('orientationchange', handleOrientationChange);
      clearTimeout(orientationTimeout);
    };
  }, []);

  // Инициализация ИИ игроков
  useEffect(() => {
    const newAiPlayers = new Map<number, AIPlayer>();
    players.forEach(player => {
      if (player.isBot) {
        const playerId = typeof player.id === 'string' ? 
          parseInt(player.id.replace('player_', '')) : player.id;
        console.log(`🤖 [AI Init] Создаем AI для бота ${player.name} (ID: ${player.id} -> ${playerId}, difficulty: ${player.difficulty || 'medium'})`);
        newAiPlayers.set(playerId, new AIPlayer(playerId, player.difficulty || 'medium'));
      }
    });
    console.log(`🤖 [AI Init] Всего AI создано: ${newAiPlayers.size}, для игроков:`, Array.from(newAiPlayers.keys()));
    setAiPlayers(newAiPlayers);
  }, [players]);

  // Отслеживаем изменения стадии игры для анимации пеньков
  useEffect(() => {
    if (gameStage !== previousGameStage) {
      setPreviousGameStage(gameStage);
    }
  }, [gameStage, previousGameStage]);
  
  // Обработка ходов ИИ
  useEffect(() => {
    const { isGameActive, currentPlayerId, players, gameStage, stage2TurnPhase, deck, availableTargets, revealedDeckCard, trumpSuit, tableStack } = useGameStore.getState();
    
    if (!isGameActive || !currentPlayerId) {
      console.log(`🤖 [AI useEffect] Игра неактивна или нет текущего игрока: isGameActive=${isGameActive}, currentPlayerId=${currentPlayerId}`);
      return;
    }
    
    const currentTurnPlayer = players.find(p => p.id === currentPlayerId);
    if (!currentTurnPlayer || !currentTurnPlayer.isBot) {
      console.log(`🤖 [AI useEffect] Не бот или игрок не найден: currentTurnPlayer=${currentTurnPlayer?.name}, isBot=${currentTurnPlayer?.isBot}`);
      return;
    }

    console.log(`🤖 [AI useEffect] ЗАПУСК AI для бота ${currentTurnPlayer.name}`);
    console.log(`🤖 [AI useEffect] Состояние: gameStage=${gameStage}, stage2TurnPhase=${stage2TurnPhase}`);
    console.log(`🤖 [AI useEffect] Карты в руке: ${currentTurnPlayer.cards?.length || 0}, на столе: ${tableStack?.length || 0}`);
    
    // Защита от повторных вызовов AI (race condition protection)
    if (aiProcessingRef.current === currentPlayerId) {
      console.log(`🚫 [AI Protection] AI уже обрабатывает ход для ${currentTurnPlayer.name}, пропускаем`);
      return;
    }
    
    // СТРОГИЕ ПРОВЕРКИ: ИИ может ходить только в свой ход!
    console.log(`🤖 [AI Check] Проверка хода для бота ${currentTurnPlayer.name}:`);
    console.log(`🤖 [AI Check] - gameStage: ${gameStage}, turnPhase: ${turnPhase}, stage2TurnPhase: ${stage2TurnPhase}`);
    console.log(`🤖 [AI Check] - currentPlayerId: ${currentPlayerId}, player.id: ${currentTurnPlayer.id}`);
    console.log(`🤖 [AI Check] - игрок.карты: ${currentTurnPlayer.cards.length}, открытых: ${currentTurnPlayer.cards.filter(c => c.open).length}`);
    console.log(`🤖 [AI Check] - карты игрока:`, currentTurnPlayer.cards.map(c => `${c.image}(${c.open ? 'open' : 'closed'})`));
    
    // Проверяем что это действительно ход этого бота
    if (gameStage === 2 || gameStage === 3) {
      // Разрешаем ИИ ходить в фазах 'selecting_card' и 'waiting_beat' для 2-й и 3-й стадий
      if (stage2TurnPhase !== 'selecting_card' && stage2TurnPhase !== 'waiting_beat') {
        console.log(`🚫 [AI Check] Бот не может ходить в фазу ${gameStage}-й стадии: ${stage2TurnPhase}`);
        return;
      }
      // Дополнительная проверка: игрок должен быть текущим
      if (currentTurnPlayer?.id !== currentPlayerId) {
        console.log(`🚫 [AI Check] ID игрока не совпадает с текущим ID хода`);
        return;
      }
    } else if (gameStage === 1) {
      if (turnPhase !== 'analyzing_hand' && turnPhase !== 'waiting_deck_action') {
        console.log(`🚫 [AI Check] Бот не может ходить в фазу 1-й стадии: ${turnPhase}`);
        return;
      }
    }
    
    const playerIdNum = typeof currentPlayerId === 'string' ? 
      parseInt(currentPlayerId.replace('player_', '')) : currentPlayerId;
    console.log(`🔍 [AI useEffect] currentPlayerId: ${currentPlayerId}, converted to: ${playerIdNum}`);
    
    const ai = aiPlayers.get(playerIdNum);
    if (!ai) {
      console.log(`🚨 [AI useEffect] AI не найден для игрока ${playerIdNum}, доступные AI:`, Array.from(aiPlayers.keys()));
      return;
    }
    
    console.log(`✅ [AI Check] ВСЕ ПРОВЕРКИ ПРОЙДЕНЫ! Запускаем AI для игрока ${currentTurnPlayer.name}`);
    
    // Устанавливаем флаг обработки
    aiProcessingRef.current = currentPlayerId;
    
    // Задержка перед ходом ИИ для реалистичности
    const makeAIMove = async () => {
      try {
        // ПРОВЕРКА: Убеждаемся что все нужные данные есть
        if (!currentTurnPlayer || !currentTurnPlayer.isBot || !players.length) {
          console.log(`🚨 [makeAIMove] Недостаточно данных для хода ИИ`);
          aiProcessingRef.current = null;
          return;
        }
        
        const gameState = {
          players,
          currentPlayer: currentPlayerId,
          gameStage,
          deck,
          availableTargets,
          revealedDeckCard,
          tableStack,
          trumpSuit, // Козырь из gameStore (определяется автоматически)
          stage2TurnPhase // Добавляем фазу 2-й стадии для AI
        };
        
        const decision = await ai.makeDecisionWithDelay(gameState);
      
        // Выполняем решение ИИ с учетом стадии игры
        if (gameStage === 1) {
        // В 1-й стадии ИИ должен следовать алгоритму: анализ руки → колода → анализ карты из колоды
        switch (decision.action) {
          case 'place_on_target':
            if (decision.targetPlayerId !== undefined) {
              const { makeMove } = useGameStore.getState();
              if (makeMove) makeMove(decision.targetPlayerId.toString());
            }
            break;
          case 'draw_card':
            // В 1-й стадии ИИ кликает по колоде только если не может ходить из руки
            const { onDeckClick } = useGameStore.getState();
            if (onDeckClick) onDeckClick();
            break;
          default:
            console.log('ИИ не может сделать ход в 1-й стадии');
            break;
        }
      } else if (gameStage === 2 || gameStage === 3) {
        // Во 2-й и 3-й стадиях AI использует систему selectHandCard + playSelectedCard (правила одинаковые)
        console.log(`🤖 [AI Stage${gameStage}] Принято решение:`, decision);
        console.log(`🤖 [AI Stage${gameStage}] - tableStack.length: ${tableStack?.length || 0}`);
        console.log(`🤖 [AI Stage${gameStage}] - trumpSuit: ${trumpSuit}`);
        console.log(`🤖 [AI Stage${gameStage}] - доступные функции проверяются динамически`);
        switch (decision.action) {
          case 'play_card':
            const { selectHandCard, playSelectedCard } = useGameStore.getState();
            if (decision.cardToPlay && selectHandCard && playSelectedCard) {
              // Найдем карту в руке игрока и выберем её
              if (currentTurnPlayer) {
                console.log(`🤖 [AI Stage${gameStage}] Ищем карту ${decision.cardToPlay?.image} среди:`, currentTurnPlayer.cards.map(c => `${c.image}(${c.open ? 'open' : 'closed'})`));
                
                const cardInHand = currentTurnPlayer.cards.find(c => 
                  c.image === decision.cardToPlay?.image && c.open
                );
                if (cardInHand) {
                  console.log(`🤖 [AI Stage${gameStage}] ✅ Выбираем карту: ${cardInHand.image}`);
                  selectHandCard(cardInHand);
                  // Играем карту с небольшой задержкой (УСКОРЕНО В 2 РАЗА)
                  setTimeout(() => {
                    console.log(`🤖 [AI Stage${gameStage}] ✅ Играем выбранную карту`);
                    playSelectedCard();
                  }, 400);
                } else {
                  console.log(`🚨 [AI Stage${gameStage}] Карта не найдена в руке или закрыта:`, decision.cardToPlay?.image);
                  console.log(`🚨 [AI Stage${gameStage}] Доступные карты:`, currentTurnPlayer.cards.filter(c => c.open).map(c => c.image));
                  console.log(`🚨 [AI Stage${gameStage}] Все карты игрока:`, currentTurnPlayer.cards.map(c => `${c.image}(${c.open ? 'open' : 'closed'})`));
                  // ИСПРАВЛЕНО: Безопасный fallback
                  console.log(`🤖 [AI Stage${gameStage}] Fallback: не можем найти карту, пропускаем ход`);
                  // Сбрасываем флаг обработки
                  aiProcessingRef.current = null;
                }
              }
            } else {
              console.log(`🚨 [AI Stage${gameStage}] Нет функций для игры карт`);
            }
            break;
          case 'draw_card':
            // Во 2-й и 3-й стадиях это значит "взять карты со стола"
            const { takeTableCards } = useGameStore.getState();
            if (takeTableCards) {
              console.log(`🤖 [AI Stage${gameStage}] Берем карты со стола`);
              takeTableCards();
            } else {
              console.log(`🚨 [AI Stage${gameStage}] Нет функции takeTableCards`);
            }
            break;
          case 'pass':
            console.log(`🤖 [AI Stage${gameStage}] Игрок пропускает ход`);
            // Логика пропуска хода может потребовать вызова nextTurn()
            break;
          default:
            console.log(`🚨 [AI Stage${gameStage}] Неизвестное действие:`, decision.action);
        }
      }
        
      // Сбрасываем флаг после завершения хода
      aiProcessingRef.current = null;
        
    } catch (error) {
      console.error(`🚨 [makeAIMove] КРИТИЧЕСКАЯ ОШИБКА при ходе ИИ:`, error);
      // Сбрасываем флаг обработки в случае ошибки
      aiProcessingRef.current = null;
    }
    };
    
    // Запускаем ход ИИ с небольшой задержкой (УСКОРЕНО В 2 РАЗА)
    const delay = (gameStage === 2 || gameStage === 3) ? 250 : 500;
    const timeoutId = setTimeout(makeAIMove, delay);
    
    return () => {
      clearTimeout(timeoutId);
      // Сбрасываем флаг при очистке useEffect
      aiProcessingRef.current = null;
    };
  }, [isGameActive, currentPlayerId, gameStage, stage2TurnPhase, turnPhase]);
  
  // Инициализация игры из gameStore
  useEffect(() => {
    if (!gameInitialized) {
      if (isGameActive && players.length > 0) {
        // ИГРА УЖЕ ЗАПУЩЕНА - ВОССТАНАВЛИВАЕМ СОСТОЯНИЕ ПОСЛЕ REFRESH!
        console.log(`🎮 [ВОССТАНОВЛЕНИЕ] Игра P.I.D.R. восстановлена: ${players.length} игроков`);
        console.log(`🎮 [ВОССТАНОВЛЕНИЕ] Стадия: ${gameStage}, текущий игрок: ${currentPlayerId}`);
        console.log(`🎮 [ВОССТАНОВЛЕНИЕ] Фаза хода: ${turnPhase}, stage2TurnPhase: ${stage2TurnPhase}`);
        
        setPlayerCount(players.length);
        setGameInitialized(true);
        setDealt(true); // ВАЖНО: карты уже розданы при восстановлении!
        
        // Уведомляем о восстановлении
        showNotification(`🔄 Игра восстановлена! Продолжаем с ${gameStage}-й стадии`, 'success', 3000);
        
        // Если сейчас ход бота - он автоматически продолжит через useEffect для AI
        const currentTurnPlayer = players.find(p => p.id === currentPlayerId);
        if (currentTurnPlayer?.isBot) {
          console.log(`🤖 [ВОССТАНОВЛЕНИЕ] Бот ${currentTurnPlayer.name} должен продолжить ход`);
        }
      } else {
        // Игра не активна - просто инициализируем интерфейс
        console.log('🎮 Ожидание запуска игры...');
        setGameInitialized(true);
      }
    }
  }, [gameInitialized, isGameActive, players.length, gameStage, currentPlayerId, turnPhase, stage2TurnPhase, showNotification]);

  // Эффект для автоматической раздачи карт при старте игры
  useEffect(() => {
    if (isGameActive && !dealt) {
      setDealt(true);
    }
  }, [isGameActive, dealt]);

  // Запуск игры
  const handleStartGame = () => {
    startGame('multiplayer', playerCount);
    setDealt(false);
    setGameInitialized(true);
  };

  // НОВЫЕ ФУНКЦИИ для кнопок подсчета карт
  
  // НОВЫЙ STATE для сообщений над игроками
  const [playerMessages, setPlayerMessages] = useState<{[playerId: string]: {text: string; type: 'info' | 'warning' | 'success' | 'error'; timestamp: number}}>({});

  // Показать сообщение над конкретным игроком
  const showPlayerMessage = (playerId: string, text: string, type: 'info' | 'warning' | 'success' | 'error' = 'info', duration: number = 3000) => {
    setPlayerMessages(prev => ({
      ...prev,
      [playerId]: { text, type, timestamp: Date.now() }
    }));
    
    // Убираем сообщение через указанное время
    setTimeout(() => {
      setPlayerMessages(prev => {
        const newMessages = { ...prev };
        delete newMessages[playerId];
        return newMessages;
      });
    }, duration);
  };

  // Показать количество карт у всех соперников (ОБНОВЛЕННАЯ ЛОГИКА)
  const showOpponentsCardCount = () => {
    if (!humanPlayer) return;
    
    console.log('🔢 [showOpponentsCardCount] Запрашиваем количество карт у соперников');
    
    // Показываем сообщение над игроком который спросил
    showPlayerMessage(humanPlayer.id, '🔍 Сколько карт?', 'info', 2000);
    
    // Проверяем каждого соперника через новую систему
    const opponentsWithOneCard = players.filter(p => 
      p.id !== humanPlayer.id && 
      playersWithOneCard.includes(p.id)
    );
    
    if (opponentsWithOneCard.length > 0) {
      // Если есть игроки с 1 картой, спрашиваем у первого через новую систему
      const targetPlayer = opponentsWithOneCard[0];
      console.log(`🎯 [showOpponentsCardCount] Проверяем штраф у ${targetPlayer.name} через новую систему`);
      askHowManyCards(humanPlayer.id, targetPlayer.id);
    } else {
      // Если нет игроков с 1 картой, показываем обычную информацию  
      players
        .filter(p => p.id !== humanPlayer.id)
        .forEach((player, index) => {
          const openCards = player.cards.filter(c => c.open).length;
          
          setTimeout(() => {
            showPlayerMessage(
              player.id, 
              `${openCards} открытых карт`, 
              'info', 
              4000
            );
          }, index * 800);
        });
    }
  };

  // Объявить что у игрока последняя карта (ОБНОВЛЕННАЯ ЛОГИКА)
  const announceLastCard = () => {
    if (!humanPlayer) return;
    
    const openCards = humanPlayer.cards.filter(c => c.open);
    console.log('1️⃣ [announceLastCard] Объявление последней карты:', openCards.length);
    
    if (openCards.length === 1) {
      // Используем новую системную функцию
      declareOneCard(humanPlayer.id);
      
      // Показываем сообщение над игроком который объявил
      showPlayerMessage(humanPlayer.id, '☝️ ОДНА КАРТА!', 'success', 4000);
      
      console.log(`📢 [announceLastCard] ${humanPlayer.name} объявил последнюю карту через новую систему!`);
    } else {
      // Показываем ошибку над игроком
      showPlayerMessage(humanPlayer.id, `❌ У вас ${openCards.length} карт!`, 'error', 3000);
      showNotification(`Нельзя объявлять "одна карта" - у вас ${openCards.length} карт`, 'error', 3000);
      console.warn(`⚠️ [announceLastCard] Неправильное объявление: ${openCards.length} карт вместо 1`);
    }
  };



  const canDrawCard = turnPhase === 'deck_card_revealed' && currentTurnPlayer?.id === currentPlayerId;
  const canClickDeck = turnPhase === 'showing_deck_hint' && currentTurnPlayer?.id === currentPlayerId;
  const waitingForTarget = turnPhase === 'waiting_target_selection';
  
  // УДАЛЕНО: Логика canBeatTopCard и shouldShowTakeButton - кнопка "Взять карту" теперь постоянная во 2-й стадии

  // Показываем заглушку если игра не активна
  if (!isGameActive) {
    return (
      <div className={styles.gameContainer}>
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          color: '#e2e8f0',
          textAlign: 'center',
          padding: '20px'
        }}>
          <h2 style={{ marginBottom: '20px', fontSize: '24px' }}>P.I.D.R. Game</h2>
          <p style={{ marginBottom: '30px', opacity: 0.7 }}>
            Игра не запущена. Вернитесь в главное меню и настройте игру.
          </p>
          <button
            onClick={() => window.history.back()}
            style={{
              background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
              color: '#fff',
              border: 'none',
              borderRadius: '12px',
              padding: '12px 24px',
              fontSize: '16px',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.3s ease'
            }}
          >
            ← Назад в меню
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.gameContainer}>
      {/* Информация о козыре - только со 2-й стадии рядом с бургер меню */}
      {isGameActive && gameStage >= 2 && trumpSuit && (
        <div style={{
          position: 'fixed',
          top: '15px',
          right: '70px', // Рядом с бургер меню
          zIndex: 1100,
          background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
          color: '#fff',
          padding: '5px 10px', // Уменьшено в 2 раза
          borderRadius: '12px',
          fontSize: '12px', // Уменьшено в 2 раза
          fontWeight: 600,
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          boxShadow: '0 5px 12px rgba(99, 102, 241, 0.4)',
          backdropFilter: 'blur(8px)'
        }}>
          <span style={{ fontSize: '14px' }}>
            {trumpSuit === 'hearts' ? '♥️' : 
             trumpSuit === 'diamonds' ? '♦️' : 
             trumpSuit === 'clubs' ? '♣️' : 
             trumpSuit === 'spades' ? '♠️' : ''}
          </span>
          Козырь
        </div>
      )}

      {!isGameActive ? (
        <div className={styles.setupScreen}>
          <h2>P.I.D.R. - Карточная игра</h2>
          
          {/* Выбор количества игроков */}
          <div className={styles.playerCountSelector}>
            <label>Количество игроков: {playerCount}</label>
            <input
              type="range"
              min="3"
              max="9"
              value={playerCount}
              onChange={(e) => setPlayerCount(Number(e.target.value))}
              className={styles.rangeSlider}
            />
          </div>
          
          {/* Кнопки игры */}
          <div className={styles.gameButtons}>
            <button onClick={handleStartGame} className={styles.startButton}>
              🎮 Играть
            </button>
            
            <button 
              onClick={() => alert('Создание комнаты временно недоступно')} 
              className={styles.roomButton}
            >
              🏠 Создать комнату
            </button>
            
            <button 
              onClick={() => alert('Подключение к комнате временно недоступно')} 
              className={styles.roomButton}
            >
              🔗 Присоединиться
            </button>
          </div>
        </div>
      ) : (
        <div className={styles.gameArea}>
          <div className={styles.tableBg}>
            <div 
              className={styles.tableCenter} 
              style={{ 
                transform: `translate(-50%, -50%)`,
                width: `${getTableDimensions().width}px`,
                height: `${getTableDimensions().height}px`
              }}
            >
              
              {/* Открытая карта из колоды (слева от колоды) */}
              {revealedDeckCard && (
                <div className={styles.revealedCardContainer}>
                  <div className={styles.revealedCard}>
                    <div 
                      className={styles.cardBackdrop} 
                      style={{ 
                        width: screenInfo.isVerySmallMobile ? 38 : screenInfo.isSmallMobile ? 43 : screenInfo.isMobile ? 48 : 53, 
                        height: screenInfo.isVerySmallMobile ? 58 : screenInfo.isSmallMobile ? 65 : screenInfo.isMobile ? 72 : 80,
                        background: 'white',
                        borderRadius: '8px',
                        position: 'absolute',
                        zIndex: -1
                      }} 
                    />
                    <Image 
                      src={revealedDeckCard.image ? `/img/cards/${revealedDeckCard.image}` : '/img/cards/back.png'} 
                      alt="revealed card" 
                      width={screenInfo.isVerySmallMobile ? 38 : screenInfo.isSmallMobile ? 43 : screenInfo.isMobile ? 48 : 53} 
                      height={screenInfo.isVerySmallMobile ? 58 : screenInfo.isSmallMobile ? 65 : screenInfo.isMobile ? 72 : 80}
                      className={styles.revealedCardImage}
                    />
                  </div>
                </div>
              )}

              {/* КАРТЫ НА СТОЛЕ для 2-й стадии (дурак) */}
              {gameStage === 2 && (
                <div className={styles.tableCardsContainer}>
                  {/* Отладочная информация убрана - отображение работает корректно */}
                  
                  {/* Консольная отладка убрана - стол работает корректно */}
                  
                  {tableStack && tableStack.length > 0 ? (
                    <>
                      <AnimatePresence mode="popLayout">
                        {tableStack.map((card, index) => (
                          <motion.div
                            key={`table-card-${card.id}-${index}`}
                            initial={{ 
                              opacity: 0, 
                              scale: 0.8, 
                              y: -50,
                              rotateX: -90 
                            }}
                            animate={{ 
                              opacity: 1, 
                              scale: Math.max(0.75, 1 - ((tableStack.length - 1 - index) * 0.05)), // ИСПРАВЛЕНО: минимум 75%, меньшее уменьшение
                              y: 0,
                              rotateX: 0,
                              transition: {
                                type: "spring",
                                stiffness: 200,
                                damping: 15,
                                delay: index * 0.1
                              }
                            }}
                            exit={{ 
                              opacity: 0, 
                              scale: 0.8,
                              y: 50,
                              transition: { duration: 0.3 }
                            }}
                            className={`${styles.tableCard} ${index === tableStack.length - 1 ? styles.tableCardTop : ''}`}
                            style={{
                              left: `${-15 + index * 18}px`, // ИСПРАВЛЕНО: Уменьшенное смещение для лучшего обзора
                              top: `${-10 + index * 5}px`, // ИСПРАВЛЕНО: Меньшее вертикальное смещение
                              zIndex: 200 + index // Высокий z-index - верхние карты поверх нижних
                            }}
                          >
                            <Image 
                              src={card.image ? `/img/cards/${card.image}` : '/img/cards/back.png'} 
                              alt={`table card ${index}: ${card.image}`}
                              width={screenInfo.isVerySmallMobile ? 50 : screenInfo.isSmallMobile ? 55 : screenInfo.isMobile ? 60 : 70} 
                              height={screenInfo.isVerySmallMobile ? 72 : screenInfo.isSmallMobile ? 79 : screenInfo.isMobile ? 87 : 102}
                              className={styles.tableCardImage}
                              priority
                            />
                          </motion.div>
                        ))}
                      </AnimatePresence>
                      {/* Лейбл для карт на столе убран - мешает основному столу */}
                    </>
                  ) : (
                    /* Лейбл убран - когда стол пустой ничего не показываем */
                    null
                  )}
                </div>
              )}

              {/* Колода и кнопка добора */}
              <div className={styles.dropZone}>
                <div 
                  className={styles.deckStack}
                  onClick={() => {
                    if (canClickDeck) {
                      onDeckClick();
                    } else if (canDrawCard) {
                      drawCard();
                    }
                  }}
                  style={{
                    cursor: (canDrawCard || canClickDeck) ? 'pointer' : 'default',
                    opacity: (canDrawCard || canClickDeck) ? 1 : 0.7
                  }}
                >
                  {deck.length > 0 && (
                    <Image 
                      src="/img/cards/back.png" 
                      alt="deck" 
                      width={screenInfo.isVerySmallMobile ? 32 : screenInfo.isSmallMobile ? 37 : screenInfo.isMobile ? 42 : 47} 
                      height={screenInfo.isVerySmallMobile ? 48 : screenInfo.isSmallMobile ? 53 : screenInfo.isMobile ? 60 : 67}
                      className={styles.deckCard}
                    />
                  )}
                  <div className={styles.deckCount}>{deck.length}</div>
                </div>
                
                {/* В 1-й стадии нет кнопки "Взять карту" - только клик по колоде */}
                {canDrawCard && gameStage > 1 && (
                  <button 
                    onClick={() => drawCard()}
                    className={styles.drawButton}
                  >
                    Взять карту
                  </button>
                )}
              </div>

              {/* УБРАНО: Стопка карт на столе загромождала центр. В примере ее нет в центре. */}

              {/* Элегантный индикатор для клика по колоде - ТОЛЬКО ДЛЯ ИГРОКА */}
              {gameStage === 1 && canClickDeck && !currentTurnPlayer?.isBot && (
                <div className={styles.deckHintContainer}>
                  <div className={styles.deckHintArrow}>👆</div>
                  <div className={styles.deckHintText}>Нажмите на колоду</div>
                </div>
              )}



              {/* Игроки по кругу */}
              {players.map((p, playerIndex) => {
                const position = getCirclePosition(playerIndex, players.length);
                const isCurrentPlayer = p.id === currentTurnPlayer?.id;
                const isCurrentTurn = p.id === players[currentPlayerIndex]?.id;
                // ПОДСКАЗКИ ТОЛЬКО ДЛЯ ЧЕЛОВЕКА (не для ботов!)
                const showHintsForUser = currentTurnPlayer && !currentTurnPlayer.isBot;
                
                const isTargetAvailable = availableTargets.includes(playerIndex) && showHintsForUser;
                const isCurrentPlayerCard = p.id === currentPlayerId && turnPhase === 'analyzing_hand' && availableTargets.length > 0 && showHintsForUser;
                
                // Дополнительная проверка для фазы waiting_deck_action когда можно положить карту на себя по правилам
                const canPlaceOnSelfInDeckAction = p.id === currentPlayerId && 
                                                   turnPhase === 'waiting_deck_action' && 
                                                   useGameStore.getState().canPlaceOnSelfByRules &&
                                                   showHintsForUser;
                
                const isClickableTarget = isTargetAvailable && (turnPhase === 'waiting_target_selection' || turnPhase === 'waiting_deck_action');
                const isClickableOwnCard = isCurrentPlayerCard || canPlaceOnSelfInDeckAction;
                
                // ОТЛАДКА: Логи кликабельности карт (только для человека)
                if (p.id === currentPlayerId && showHintsForUser) {
                  console.log(`🎯 [GamePageContent] Анализ кликабельности карты игрока ${p.name}:`);
                  console.log(`🎯 [GamePageContent] - p.id: ${p.id}, currentPlayerId: ${currentPlayerId}, совпадает: ${p.id === currentPlayerId}`);
                  console.log(`🎯 [GamePageContent] - turnPhase: ${turnPhase}`);
                  console.log(`🎯 [GamePageContent] - availableTargets: [${availableTargets.join(', ')}], длина: ${availableTargets.length}`);
                  console.log(`🎯 [GamePageContent] - isCurrentPlayerCard: ${isCurrentPlayerCard}`);
                  console.log(`🎯 [GamePageContent] - canPlaceOnSelfInDeckAction: ${canPlaceOnSelfInDeckAction}`);
                  console.log(`🎯 [GamePageContent] - isClickableOwnCard: ${isClickableOwnCard}`);
                }
                
                if (isTargetAvailable && showHintsForUser) {
                  console.log(`🎯 [GamePageContent] Анализ кликабельности ЦЕЛИ ${p.name} (индекс ${playerIndex}):`);
                  console.log(`🎯 [GamePageContent] - isTargetAvailable: ${isTargetAvailable}`);
                  console.log(`🎯 [GamePageContent] - turnPhase: ${turnPhase}`);
                  console.log(`🎯 [GamePageContent] - isClickableTarget: ${isClickableTarget}`);
                }

                return (
                  <div
                    key={`${p.id}-${positionKey}`} // Принудительное обновление при изменении экрана
                    className={`${styles.playerSeat} ${isCurrentPlayer ? styles.currentPlayerSeat : ''} ${isCurrentTurn ? styles.playerTurn : ''} ${isTargetAvailable ? styles.highlightedTarget : ''}`}
                    style={{
                      position: 'absolute',
                      left: position.left,
                      top: position.top,
                      transform: `translate(-50%, -50%) scale(0.85)`, // Фиксированный масштаб как в DevTools
                    }}
                  >
                    {/* СООБЩЕНИЕ НАД ИГРОКОМ */}
                    {playerMessages[p.id] && (
                      <motion.div
                        initial={{ opacity: 0, y: -10, scale: 0.8 }}
                        animate={{ opacity: 1, y: -50, scale: 1 }}
                        exit={{ opacity: 0, y: -60, scale: 0.8 }}
                        transition={{ duration: 0.3 }}
                        style={{
                          position: 'absolute',
                          top: '-20px',
                          left: '50%',
                          transform: 'translateX(-50%)',
                          background: playerMessages[p.id].type === 'warning' ? 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)' :
                                      playerMessages[p.id].type === 'error' ? 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)' :
                                      playerMessages[p.id].type === 'success' ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' :
                                      'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                          color: 'white',
                          padding: '6px 12px',
                          borderRadius: '12px',
                          fontSize: '11px',
                          fontWeight: '600',
                          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
                          zIndex: 1000,
                          whiteSpace: 'nowrap',
                          border: '1px solid rgba(255, 255, 255, 0.2)',
                          backdropFilter: 'blur(4px)'
                        }}
                      >
                        {playerMessages[p.id].text}
                      </motion.div>
                    )}

                    {/* Аватар и имя по центру */}
                    <div className={styles.avatarWrap}>
                      <div className={styles.avatarContainer}>
                        {p.avatar && p.avatar.startsWith('data:') ? (
                          // SVG аватар
                          <div 
                            className={styles.avatar}
                            style={{ 
                              width: screenInfo.isVerySmallMobile ? 26 : screenInfo.isSmallMobile ? 28 : screenInfo.isMobile ? 32 : 40,
                              height: screenInfo.isVerySmallMobile ? 26 : screenInfo.isSmallMobile ? 28 : screenInfo.isMobile ? 32 : 40,
                              borderRadius: '50%',
                              backgroundImage: `url(${p.avatar})`,
                              backgroundSize: 'cover',
                              border: isCurrentPlayer ? '2px solid #ffd700' : '1px solid rgba(255,255,255,0.2)',
                              boxShadow: isCurrentPlayer ? '0 0 10px #ffd700' : 'none'
                            }}
                          />
                        ) : (
                          // Обычное изображение
                          <Image 
                            src={p.avatar || '/img/player-avatar.svg'} 
                            alt="avatar" 
                            width={screenInfo.isVerySmallMobile ? 26 : screenInfo.isSmallMobile ? 28 : screenInfo.isMobile ? 32 : 40} 
                            height={screenInfo.isVerySmallMobile ? 26 : screenInfo.isSmallMobile ? 28 : screenInfo.isMobile ? 32 : 40} 
                            className={styles.avatar}
                            style={{
                              borderRadius: '50%',
                              border: isCurrentPlayer ? '2px solid #ffd700' : '1px solid rgba(255,255,255,0.2)',
                              boxShadow: isCurrentPlayer ? '0 0 10px #ffd700' : 'none'
                            }}
                          />
                        )}
                        {p.isBot && (
                          <div className={styles.botBadge} title={`AI (${p.difficulty || 'medium'})`}>
                            🤖
                          </div>
                        )}
                      </div>
                      {/* Имя РЯДОМ с аватаром (без обертки div) */}
                      <span 
                        className={styles.playerName} 
                        style={{ 
                          fontSize: screenInfo.isVerySmallMobile ? '9px' : screenInfo.isSmallMobile ? '10px' : screenInfo.isMobile ? '12px' : '14px', 
                          fontWeight: 600,
                          color: isCurrentPlayer ? '#ffd700' : 'white',
                          textShadow: isCurrentPlayer ? '0 0 10px #ffd700' : 'none',
                          whiteSpace: 'nowrap' /* Имя в одну строку */
                        }}
                      >
                        {p.name}
                        {isCurrentPlayer && <span style={{ marginLeft: 4 }}>👑</span>}
                      </span>
                      {/* Счетчик ОТКРЫТЫХ карт для ВСЕХ игроков во 2-й и 3-й стадии */}
                      {(gameStage === 2 || gameStage === 3) && (
                        <span style={{
                          color: p.id === humanPlayer?.id ? '#ffd700' : '#00ff88',
                          marginLeft: 4,
                          fontSize: '12px',
                          fontWeight: 'bold',
                          background: p.id === humanPlayer?.id ? 'rgba(255, 215, 0, 0.1)' : 'rgba(0, 255, 136, 0.1)',
                          padding: '2px 6px',
                          borderRadius: '8px',
                          border: p.id === humanPlayer?.id ? '1px solid rgba(255, 215, 0, 0.3)' : '1px solid rgba(0, 255, 136, 0.3)'
                        }}>
                          🃏 {p.cards.filter(c => c.open).length}
                        </span>
                      )}
                      {/* Подсказка цели только для человека */}
                      {isTargetAvailable && showHintsForUser && <span style={{color:'#ffd700',marginLeft:4}}>🎯</span>}
                    </div>
                    
                    {/* Контейнер для пеньков и открытой карты */}
                    <div className={styles.cardsContainer}>
                      {/* Пеньки (подложка) - показываем во 2-й стадии когда есть пеньки */}
                      {/* В 3-й стадии пеньки уже активированы и переносятся в player.cards */}
                      <AnimatePresence mode="wait">
                        {p.penki && p.penki.length > 0 && gameStage === 2 && (
                          <motion.div 
                            key="penki-visible"
                            className={styles.penkiRow}
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.8 }}
                            transition={{ duration: 0.3 }}
                          >
                            {p.penki.map((penkiCard, pi) => {
                              // Определяем направление для пеньков тоже
                              const playerPosition = getCirclePosition(playerIndex, players.length);
                              const isLeftSide = parseFloat(playerPosition.left) < 50;
                              const penkiOffset = isLeftSide ? pi * 10 : -pi * 10;
                              
                              return (
                              <motion.div
                                key={penkiCard.id}
                                className={`${styles.penkiCard} ${styles.visible}`}
                                style={{ 
                                  left: `${penkiOffset}px`,
                                  zIndex: pi + 1
                                }}
                                title={`Пенёк ${pi + 1} (активируется в 3-й стадии)`}
                                initial={{ opacity: 0, scale: 0.8, y: 10 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.8, y: 10 }}
                                transition={{ 
                                  duration: 0.4,
                                  delay: pi * 0.1 
                                }}
                              >
                                <Image
                                  src="/img/cards/back.png"
                                  alt="penki"
                                  width={screenInfo.isSmallMobile ? 33 : screenInfo.isMobile ? 42 : 52} /* Увеличено в 1.5 раза */
                                  height={screenInfo.isSmallMobile ? 48 : screenInfo.isMobile ? 60 : 75} /* Увеличено в 1.5 раза */
                                  style={{ 
                                    borderRadius: '8px',
                                    opacity: 0.8
                                  }}
                                />
                              </motion.div>
                            );
                            })}
                          </motion.div>
                        )}
                      </AnimatePresence>
                      
                      {/* Открытая карта поверх пеньков */}
                      {p.cards.length > 0 && (gameStage === 1 || gameStage === 3 || gameStage === 2) && (
                        <div className={styles.activeCardContainer}>
                          {p.cards.map((card, ci) => { // Показываем ВСЕ карты для синхронизации с контейнером
                            const visibleCards = p.cards;
                            const isTopCard = ci === visibleCards.length - 1; // Последняя из видимых карт
                            
                            // ОТЛАДКА: Логи для isTopCard (только для человека)
                            if (p.id === currentPlayerId && showHintsForUser) {
                              console.log(`🎯 [GamePageContent] Карта ${ci} игрока ${p.name}: isTopCard = ${isTopCard}, visibleCards.length = ${visibleCards.length}`);
                            }
                            // Определяем направление стекинга карт в зависимости от позиции игрока
                            const playerPosition = getCirclePosition(playerIndex, players.length);
                            const isLeftSide = parseFloat(playerPosition.left) < 50; // Левая половина экрана
                            const spacing = screenInfo.isSmallMobile ? 12 : screenInfo.isMobile ? 13 : 15;
                            const cardOffset = isLeftSide ? ci * spacing : -ci * spacing;
                            
                            return (
                              <motion.div
                                key={card.id}
                                initial={{ opacity: 0, y: -40, rotateY: -180, scale: 0.5 }}
                                animate={{ 
                                  opacity: dealt ? 1 : 0, 
                                  y: 0, 
                                  rotateY: 0, 
                                  scale: 1,
                                  transition: {
                                    type: "spring",
                                    stiffness: 200,
                                    damping: 15
                                  }
                                }}
                                exit={{ opacity: 0, y: 40, rotateY: 180, scale: 0.5 }}
                                transition={{ 
                                  delay: (playerIndex * 0.15) + (ci * 0.08), 
                                  duration: 0.6,
                                  type: "spring",
                                  stiffness: 150,
                                  damping: 12
                                }}
                                whileHover={{ 
                                  scale: isClickableTarget && isTopCard ? 1.15 : 1.05,
                                  rotateY: 5,
                                  z: 20
                                }}
                                style={{ 
                                  position: 'absolute',
                                  left: `${cardOffset}px`,
                                  zIndex: ci + 10 // Поверх пеньков
                                }}
                              >
                                <div
                                  className={`${styles.cardOnPenki} ${
                                    // Во 2-й стадии карты ботов всегда показываются как закрытые, пользователя - открытыми
                                    gameStage === 2 && p.isBot ? styles.closed :
                                    card.open ? styles.open : styles.closed
                                  } ${(isClickableTarget || isClickableOwnCard) && isTopCard ? styles.targetCard : ''}`}
                                  style={{ 
                                    cursor: (isClickableTarget || isClickableOwnCard) && isTopCard ? 'pointer' : 'default',
                                    transform: (isClickableTarget || isClickableOwnCard) && isTopCard ? 'scale(1.02)' : 'scale(1)',
                                    // Во 2-й стадии карты ботов имеют размер закрытых карт
                                    width: (gameStage === 2 && p.isBot) ? 60 : (card.open ? 82 : 60), // Увеличено в 1.5 раза
                                    height: (gameStage === 2 && p.isBot) ? 87 : (card.open ? 120 : 87) // Увеличено в 1.5 раза
                                  }}
                                  onClick={() => {
                                    if (showHintsForUser) {
                                      console.log(`🎯 [GamePageContent] КЛИК по карте ${p.name}, isTopCard: ${isTopCard}`);
                                      console.log(`🎯 [GamePageContent] - isClickableOwnCard: ${isClickableOwnCard}, isClickableTarget: ${isClickableTarget}`);
                                    }
                                    if (isTopCard) {
                                      if (isClickableOwnCard) {
                                        // Проверяем что именно можно делать с картой
                                        if (canPlaceOnSelfInDeckAction) {
                                          if (showHintsForUser) console.log(`✅ [GamePageContent] Клик по своей карте - кладем карту из колоды на себя по правилам`);
                                          placeCardOnSelfByRules();
                                        } else if (isCurrentPlayerCard) {
                                          if (showHintsForUser) console.log(`✅ [GamePageContent] Клик по своей карте - вызываем makeMove('initiate_move')`);
                                          makeMove('initiate_move');
                                        }
                                      } else if (isClickableTarget) {
                                        if (showHintsForUser) console.log(`✅ [GamePageContent] Клик по карте соперника - вызываем makeMove(${p.id})`);
                                        // Клик по карте соперника - делаем ход
                                        makeMove(p.id);
                                      } else {
                                        if (showHintsForUser) console.log(`❌ [GamePageContent] Карта не кликабельна`);
                                      }
                                    } else {
                                      if (showHintsForUser) console.log(`❌ [GamePageContent] Клик не по верхней карте`);
                                    }
                                  }}
                                >
                                  <Image
                                    src={
                                      // Во 2-й стадии карты ботов всегда скрыты, пользователя - открыты
                                      (gameStage as number) === 2 && p.isBot ? 
                                        `/img/cards/back.png` :
                                      // В 1-й стадии показываем как обычно
                                      (card.open && card.image ? `/img/cards/${card.image}` : `/img/cards/back.png`)
                                    }
                                    alt={
                                      (gameStage === 2 && p.isBot) ? 'back' :
                                      (card.open ? 'card' : 'back')
                                    }
                                    width={
                                      // Во 2-й стадии карты ботов всегда как закрытые по размеру
                                      (gameStage === 2 && p.isBot) ?
                                        (screenInfo.isSmallMobile ? 37 : screenInfo.isMobile ? 45 : 60) :
                                      card.open ? 
                                        (screenInfo.isSmallMobile ? 52 : screenInfo.isMobile ? 60 : 82) : // Увеличено в 1.5 раза
                                        (screenInfo.isSmallMobile ? 37 : screenInfo.isMobile ? 45 : 60) // Увеличено в 1.5 раза
                                    }
                                    height={
                                      // Во 2-й стадии карты ботов всегда как закрытые по размеру
                                      (gameStage === 2 && p.isBot) ?
                                        (screenInfo.isSmallMobile ? 52 : screenInfo.isMobile ? 63 : 87) :
                                      card.open ? 
                                        (screenInfo.isSmallMobile ? 75 : screenInfo.isMobile ? 87 : 120) : // Увеличено в 1.5 раза
                                        (screenInfo.isSmallMobile ? 52 : screenInfo.isMobile ? 63 : 87) // Увеличено в 1.5 раза
                                    }
                                    draggable={false}
                                    style={{
                                      borderRadius: 0,
                                      transition: 'all 0.3s ease-in-out'
                                    }}
                                  />
                                 </div>
                               </motion.div>
                             );
                           })}
                         </div>
                       )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Контейнер карт игрока внизу - только во 2-й и 3-й стадиях И ТОЛЬКО для человека */}
          {isGameActive && humanPlayer && humanPlayer.cards.length > 0 && gameStage >= 2 && (
            <div className={styles.playerHand}>
              <div className={styles.handTitle}>
                {gameStage === 2 && stage2TurnPhase === 'selecting_card' && humanPlayer.id === currentPlayerId ? 
                  '🎯 ВЫБЕРИТЕ КАРТУ' : 
                  '🎴 Ваши карты'} ({humanPlayer.cards.filter(c => c.open).length})
                
                {/* Кнопки во 2-й стадии */}
                <div style={{ marginLeft: '15px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '5px' }}>
                  {/* Кнопка "Взять карту" - показывается когда есть карты на столе */}
                  {gameStage === 2 && tableStack.length > 0 && humanPlayer?.id === currentPlayerId && (
                    <button 
                      className={styles.takeCardFromTableButton}
                      onClick={() => {
                        console.log('🃏 [GamePageContent] Взять нижнюю карту со стола');
                        takeTableCards();
                      }}
                    >
                      📥 Взять карту
                    </button>
                  )}
                  
                  {/* НОВАЯ ЛОГИКА кнопок подсчета карт с системой штрафов */}
                  {gameStage === 2 && humanPlayer && (() => {
                    const humanOpenCards = humanPlayer.cards.filter(c => c.open).length;
                    const humanNeedsToDeclaree = oneCardTimers[humanPlayer.id] && !oneCardDeclarations[humanPlayer.id];
                    const someoneHasOneCard = playersWithOneCard.some(playerId => playerId !== humanPlayer.id);
                    
                    return (
                      <>
                        {/* Кнопка "Одна карта!" - ОБЯЗАТЕЛЬНАЯ когда у игрока 1 карта и активен таймер */}
                        {humanNeedsToDeclaree && (
                          <div className={styles.cardCountButtonsContainer}>
                            <button 
                              className={styles.cardCountButton}
                              onClick={() => {
                                console.log('🃏 [GamePageContent] ОБЯЗАТЕЛЬНОЕ объявление: одна карта!');
                                announceLastCard();
                              }}
                              style={{ 
                                background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                                animation: 'pulseRed 1s infinite',
                                boxShadow: '0 0 20px rgba(239, 68, 68, 0.6)'
                              }}
                            >
                              ⚠️ ОДНА КАРТА! (ОБЯЗАТЕЛЬНО)
                            </button>
                          </div>
                        )}
                        
                        {/* Альтернативная кнопка "Одна карта!" для обычного объявления */}
                        {humanOpenCards === 1 && !humanNeedsToDeclaree && !oneCardDeclarations[humanPlayer.id] && (
                          <div className={styles.cardCountButtonsContainer}>
                            <button 
                              className={styles.cardCountButton}
                              onClick={() => {
                                console.log('🃏 [GamePageContent] Добровольное объявление: одна карта!');
                                announceLastCard();
                              }}
                              style={{ background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)' }}
                            >
                              ☝️ Одна карта!
                            </button>
                          </div>
                        )}
                        
                        {/* Кнопка "Сколько карт?" - показывается когда у кого-то есть 1 карта (можно поймать) */}
                        {someoneHasOneCard && !pendingPenalty && (
                          <div className={styles.cardCountButtonsContainer}>
                            <button 
                              className={styles.cardCountButton}
                              onClick={() => {
                                console.log('🃏 [GamePageContent] Проверяем штрафы: сколько карт?');
                                showOpponentsCardCount();
                              }}
                              style={{ 
                                background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                                border: '2px solid #ffd700'
                              }}
                            >
                              🎯 Сколько карт?
                            </button>
                          </div>
                        )}
                        
                        {/* Индикация активного штрафа */}
                        {pendingPenalty && humanPlayer && (
                          <div className={styles.cardCountButtonsContainer}>
                            {pendingPenalty.contributorsNeeded.includes(humanPlayer.id) ? (
                              <div 
                                className={styles.cardCountButton}
                                style={{ 
                                  background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                                  animation: 'pulse 1s infinite',
                                  border: '2px solid #ffd700',
                                  cursor: 'default'
                                }}
                              >
                                💸 Выберите карту для штрафа!
                              </div>
                            ) : (
                              <div 
                                className={styles.cardCountButton}
                                style={{ 
                                  background: 'linear-gradient(135deg, #6b7280 0%, #4b5563 100%)',
                                  cursor: 'default'
                                }}
                              >
                                ⏳ Ждем других игроков...
                              </div>
                            )}
                          </div>
                        )}
                      </>
                    );
                  })()}
                </div>
              </div>
              <div className={styles.handCards}>
                {humanPlayer.cards.map((card, index) => {
                  const isSelectableStage1 = gameStage === 1 && 
                    humanPlayer.id === currentPlayerId && 
                    !humanPlayer.isBot;
                  const isSelectableStage2 = card.open && 
                    gameStage === 2 && 
                    stage2TurnPhase === 'selecting_card' && 
                    humanPlayer.id === currentPlayerId && 
                    !humanPlayer.isBot;
                  const isSelectablePenalty = pendingPenalty && 
                    humanPlayer && 
                    pendingPenalty.contributorsNeeded.includes(humanPlayer.id) && 
                    card.open;
                  const isSelected = selectedHandCard?.id === card.id;
                  const baseStep = 10;
                  const mobileSteps = {
                    open: screenInfo.isSmallMobile ? 18 : screenInfo.isMobile ? 21 : 25,
                    closed: screenInfo.isSmallMobile ? 14 : screenInfo.isMobile ? 16 : 18
                  };
                  const step = card.open ? mobileSteps.open : mobileSteps.closed;
                  const cardOffset = index * step;
                  const mobileCardSizes = {
                    open: screenInfo.isVerySmallMobile 
                      ? { w: 60, h: 90 } 
                      : screenInfo.isSmallMobile 
                        ? { w: 70, h: 105 } 
                        : screenInfo.isMobile 
                          ? { w: 76, h: 115 } 
                          : { w: 84, h: 126 }, // Адаптивно для очень маленьких экранов
                    closed: screenInfo.isVerySmallMobile 
                      ? { w: 50, h: 75 } 
                      : screenInfo.isSmallMobile 
                        ? { w: 58, h: 87 } 
                        : screenInfo.isMobile 
                          ? { w: 64, h: 96 } 
                          : { w: 70, h: 105 }
                  };
                  const size = card.open ? mobileCardSizes.open : mobileCardSizes.closed;
                  
                  return (
                    <div 
                      key={card.id} 
                      className={`${styles.handCard} ${card.open ? styles.open : styles.closed} ${(isSelectableStage1 || isSelectableStage2 || isSelectablePenalty) ? styles.playable : ''}`}
                      style={{ 
                        position: 'absolute',
                        left: `${cardOffset}px`,
                        top: isSelected ? '-10px' : '0px',
                        zIndex: index + 1,
                        transform: isSelected ? 'scale(1.07)' : 'scale(1)',
                        filter: isSelected ? 'drop-shadow(0 0 10px #00ff00)' : 'none',
                        transition: 'all 0.2s ease-in-out',
                        width: `${size.w}px`,
                        height: `${size.h}px`,
                      }}
                      onClick={() => {
                        // ПРИОРИТЕТ: Если идет штраф - игрок отдает карту
                        if (pendingPenalty && humanPlayer && pendingPenalty.contributorsNeeded.includes(humanPlayer.id)) {
                          if (!card.open) {
                            showNotification('❌ Можно отдавать только открытые карты!', 'error', 3000);
                            return;
                          }
                          
                          console.log(`💸 [GamePageContent] Игрок выбрал карту ${card.image} для штрафа`);
                          contributePenaltyCard(humanPlayer.id, card.id);
                          return;
                        }
                        
                        // 1-я стадия: ходим любой картой
                        if (gameStage === 1 && 
                            humanPlayer.id === currentPlayerId && 
                            !humanPlayer.isBot) {
                          console.log(`🎮 [HandCard Click] Ход в 1-й стадии: ${card.image}`);
                          makeMove(card.id);
                          return;
                        }
                        
                        // 2-я и 3-я стадии: разрешаем клики только в свой ход
                        if (isSelectableStage2 && 
                            gameStage === 2 && 
                            humanPlayer.id === currentPlayerId && 
                            !humanPlayer.isBot) {
                          console.log(`🎯 [HandCard Click] Игрок выбирает карту: ${card.image}`);
                          selectHandCard(card);
                        } else {
                          console.log(`🚫 [HandCard Click] Клик заблокирован: isSelectableStage2=${isSelectableStage2}, gameStage=${gameStage}, isCurrentPlayer=${humanPlayer.id === currentPlayerId}, isBot=${humanPlayer.isBot}`);
                        }
                      }}
                    >
                      <div className={styles.cardBase} style={{ width: '100%', height: '100%' }}>
                        <Image
                          src={card.open && card.image ? `/img/cards/${card.image}` : `/img/cards/back.png`}
                          alt={card.open ? 'card' : 'back'}
                          width={size.w}
                          height={size.h}
                          draggable={false}
                          priority
                          style={{ 
                            borderRadius: 0,
                            boxShadow: card.open ? '0 2px 10px rgba(0, 0, 0, 0.35)' : '0 2px 8px rgba(0, 0, 0, 0.5)'
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Бургер меню */}
          <div className={styles.gameControls}>
            <div className={styles.burgerMenu}>
              <button className={styles.burgerButton}>
                <div className={styles.burgerLines}>
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
              </button>
              <div className={styles.burgerDropdown}>
                {/* Баланс игровых монет */}
                <div className={styles.menuCoinsBalance}>
                  <div className={styles.coinsIcon}>🪙</div>
                  <div className={styles.coinsInfo}>
                    <div className={styles.coinsAmount}>{gameCoins.toLocaleString()}</div>
                    <div className={styles.coinsLabel}>Монет</div>
                  </div>
                </div>
                
                <div className={styles.menuDivider}></div>
                
                <button onClick={() => window.history.back()} className={styles.menuItem}>
                  ← Назад
                </button>
                <button onClick={() => window.location.reload()} className={styles.menuItem}>
                  🔄 Обновить
                </button>
                <button onClick={() => {
                  endGame();
                  if (isMultiplayer && onGameEnd) {
                    onGameEnd();
                  }
                }} className={styles.menuItem}>
                  🚫 Закончить игру
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Мультиплеер компонент */}
      {isMultiplayer && multiplayerRoom && (
        <MultiplayerGame
          roomId={multiplayerRoom.id}
          roomCode={multiplayerRoom.code}
          isHost={multiplayerRoom.isHost}
          onGameStateUpdate={(gameState) => {
            console.log('🔄 [Multiplayer] Получено обновление состояния:', gameState);
            // Здесь можно обновить локальное состояние игры
          }}
        />
      )}

      <BottomNav />
    </div>
  );
}

// Оборачиваем в ErrorBoundary чтобы игра не вылетала
export default function GamePageContentWrapper(props: GamePageContentProps) {
  return (
    <ErrorBoundary>
      <GamePageContentComponent {...props} />
    </ErrorBoundary>
  );
}