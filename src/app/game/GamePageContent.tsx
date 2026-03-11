'use client'
import { useState, useMemo, useEffect, useRef } from 'react';
import Image from 'next/image';
import PlayerProfileModal from '../../components/PlayerProfileModal';
import PenaltyCardSelector from '../../components/PenaltyCardSelector';
import WinnerModal from '../../components/WinnerModal';
import LoserModal from '../../components/LoserModal';
import GameResultsModal from '../../components/GameResultsModal';
import PenaltyDeckModal from '../../components/PenaltyDeckModal';
import TutorialModal from '../../components/TutorialModal';
import { useTutorial } from '../../hooks/useTutorial';
import styles from './GameTable.module.css';
// Генераторы перенесены в отдельный проект pidr_generators
import { getPremiumTable } from '@/utils/generatePremiumTable';
import { useDragAndDrop } from '@/hooks/useDragAndDrop';
// TableSelector удален - выбор стола больше не нужен
import type { Player, Card } from '../../types/game';
import type { Card as StoreCard } from '../../store/gameStore';
import { motion, AnimatePresence } from 'framer-motion';
import React from 'react';
import { ErrorBoundary } from '../../components/ErrorBoundary';
import { useGameStore } from '@/store/gameStore';
import { AIPlayer, AIDifficulty } from '@/lib/game/ai-player';
import MultiplayerGame from '@/components/MultiplayerGame';
import { useLanguage } from '../../components/LanguageSwitcher';
import { useTranslations } from '../../lib/i18n/translations';
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
const CARDS_PATH = '/img/cards/'; // ПРАВИЛЬНЫЙ ПУТЬ К КАРТАМ!

// Рассчитываем размеры и позицию стола
const getTableDimensions = () => {
  if (typeof window === 'undefined') {
    return { vw: 1024, vh: 768, isMobile: false, isSmallMobile: false };
  }
  
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

// ✅ ФУНКЦИЯ ДЛЯ ОПРЕДЕЛЕНИЯ ПОРЯДКА ИГРОКОВ ПО ЧАСОВОЙ СТРЕЛКЕ
// Возвращает порядок индексов игроков вокруг стола по часовой стрелке (начиная с главного игрока внизу)
// Порядок определяется по визуальному расположению: внизу → слева → сверху → справа
const getClockwiseOrder = (totalPlayers: number): number[] => {
  if (totalPlayers === 4) {
    // 4 игрока: главный (0, внизу) → слева (3, 5%, 50%) → сверху (1, 50%, 5%) → справа (2, 95%, 50%)
    return [0, 3, 1, 2];
  }
  if (totalPlayers === 5) {
    // 5 игроков: главный (0) → слева (4) → сверху слева (1) → сверху справа (2) → справа (3)
    return [0, 4, 1, 2, 3];
  }
  if (totalPlayers === 6) {
    // 6 игроков: главный (0) → слева внизу (5) → слева вверху (4) → сверху (1) → справа вверху (2) → справа внизу (3)
    return [0, 5, 4, 1, 2, 3];
  }
  if (totalPlayers === 7) {
    // 7 игроков: главный (0) → слева внизу (4) → слева вверху (3) → сверху слева (1) → сверху справа (2) → справа вверху (5) → справа внизу (6)
    return [0, 4, 3, 1, 2, 5, 6];
  }
  // Fallback для других количеств
  return Array.from({ length: totalPlayers }, (_, i) => i);
};

// 🎯 РАССАДКА ИГРОКОВ ПО ЧАСОВОЙ СТРЕЛКЕ ДЛЯ ВЕРТИКАЛЬНОГО СТОЛА
const getRectanglePosition = (index: number, totalPlayers: number, gameStage: number = 1): { 
  top: string; 
  left: string; 
  cardDirection: 'horizontal' | 'vertical';
  cardOffset: { x: number; y: number };
  side: 'top' | 'bottom' | 'left' | 'right'; // ✅ НОВОЕ: сторона для правильного расположения карт
} => {
  // ПОЗИЦИЯ 0: Главный игрок ВНИЗУ ПО ЦЕНТРУ
  if (index === 0) {
    return { 
      left: '50%', 
      top: '85%', // ✅ ПОДНЯТО ВЫШЕ - не накладывается на системные кнопки телефона
      cardDirection: 'horizontal',
      cardOffset: { x: 0, y: -40 },
      side: 'bottom'
    };
  }
  
  // ✅ НОВАЯ РАССАДКА В ЗАВИСИМОСТИ ОТ КОЛИЧЕСТВА ИГРОКОВ
  const adjustedIndex = index - 1; // Индекс без главного игрока (0-based)
  
  if (totalPlayers === 4) {
    const positions = [
      { left: '50%', top: '10%', cardDirection: 'horizontal' as const, cardOffset: { x: 0, y: 0 }, side: 'top' as const },
      { left: '92%', top: '50%', cardDirection: 'vertical' as const, cardOffset: { x: 0, y: 0 }, side: 'right' as const },
      { left: '8%', top: '50%', cardDirection: 'vertical' as const, cardOffset: { x: 0, y: 0 }, side: 'left' as const },
    ];
    return positions[adjustedIndex] || positions[0];
  }
  
  if (totalPlayers === 5) {
    const positions = [
      { left: '25%', top: '10%', cardDirection: 'horizontal' as const, cardOffset: { x: 0, y: 0 }, side: 'top' as const },
      { left: '75%', top: '10%', cardDirection: 'horizontal' as const, cardOffset: { x: 0, y: 0 }, side: 'top' as const },
      { left: '92%', top: '50%', cardDirection: 'vertical' as const, cardOffset: { x: 0, y: 0 }, side: 'right' as const },
      { left: '8%', top: '50%', cardDirection: 'vertical' as const, cardOffset: { x: 0, y: 0 }, side: 'left' as const },
    ];
    return positions[adjustedIndex] || positions[0];
  }
  
  if (totalPlayers === 6) {
    const positions = [
      { left: '50%', top: '10%', cardDirection: 'horizontal' as const, cardOffset: { x: 0, y: 0 }, side: 'top' as const },
      { left: '92%', top: '35%', cardDirection: 'vertical' as const, cardOffset: { x: 0, y: 0 }, side: 'right' as const },
      { left: '92%', top: '65%', cardDirection: 'vertical' as const, cardOffset: { x: 0, y: 0 }, side: 'right' as const },
      { left: '8%', top: '35%', cardDirection: 'vertical' as const, cardOffset: { x: 0, y: 0 }, side: 'left' as const },
      { left: '8%', top: '65%', cardDirection: 'vertical' as const, cardOffset: { x: 0, y: 0 }, side: 'left' as const },
    ];
    return positions[adjustedIndex] || positions[0];
  }
  
  if (totalPlayers === 7) {
    const positions = [
      { left: '25%', top: '10%', cardDirection: 'horizontal' as const, cardOffset: { x: 0, y: 0 }, side: 'top' as const },
      { left: '75%', top: '10%', cardDirection: 'horizontal' as const, cardOffset: { x: 0, y: 0 }, side: 'top' as const },
      { left: '8%', top: '35%', cardDirection: 'vertical' as const, cardOffset: { x: 0, y: 0 }, side: 'left' as const },
      { left: '8%', top: '65%', cardDirection: 'vertical' as const, cardOffset: { x: 0, y: 0 }, side: 'left' as const },
      { left: '92%', top: '35%', cardDirection: 'vertical' as const, cardOffset: { x: 0, y: 0 }, side: 'right' as const },
      { left: '92%', top: '65%', cardDirection: 'vertical' as const, cardOffset: { x: 0, y: 0 }, side: 'right' as const },
    ];
    return positions[adjustedIndex] || positions[0];
  }
  
  // Fallback для других количеств игроков (старая логика)
  const fallbackAngle = (2 * Math.PI * (index - 1)) / totalPlayers;
  const fallbackX = 50 + 42 * Math.cos(fallbackAngle - Math.PI / 2);
  const fallbackY = 50 + 42 * Math.sin(fallbackAngle - Math.PI / 2);
  
  return {
    left: `${Math.max(5, Math.min(95, fallbackX))}%`,
    top: `${Math.max(5, Math.min(95, fallbackY))}%`,
    cardDirection: 'horizontal' as const,
    cardOffset: { x: 0, y: -30 },
    side: 'top'
  };
};

// LEGACY ФУНКЦИЯ (для обратной совместимости)
const getCirclePosition = (index: number, totalPlayers: number, gameStage: number = 1): { top: string; left: string } => {
  // Используем новую прямоугольную систему
  return getRectanglePosition(index, totalPlayers, gameStage);
  
  /*
  // СТАРАЯ ОВАЛЬНАЯ СИСТЕМА (закомментирована)
  // Пользователь всегда снизу по центру (позиция 0)
  if (index === 0) {
    return { left: '50%', top: '85%' };
  }
  
  // Для остальных игроков используем математическое распределение по эллипсу
  const actualIndex = index - 1; // Исключаем пользователя
  const remainingPlayers = totalPlayers - 1;
  
  // Параметры эллипса (адаптированы под овальный стол)
  const centerX = 50; // Центр по X (%)
  const centerY = 45; // Центр по Y (%) - немного выше для лучшего баланса
  const radiusX = 45; // Радиус по X (%)
  const radiusY = 35; // Радиус по Y (%)
  
  // Углы распределяются равномерно, начиная с верха и идя по часовой стрелке
  // Оставляем место внизу для пользователя
  const startAngle = -Math.PI / 2; // Начинаем сверху
  const endAngle = Math.PI / 2; // Заканчиваем внизу справа
  const angleRange = Math.PI; // Полукруг сверху
  */
  
  // УДАЛЕН СТАРЫЙ КОД - используется только новая прямоугольная система
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
  initialPlayerCount = 7, // ✅ ИЗМЕНЕНО: 9 → 7 ИГРОКОВ!
  isMultiplayer = false, 
  multiplayerData,
  onGameEnd 
}: GamePageContentProps) {
  const { user } = useTelegram();
  const { language } = useLanguage();
  const t = useTranslations(language);
  
  const { 
    isGameActive, gameMode, gameStage, turnPhase, stage2TurnPhase,
    players, currentPlayerId, deck, availableTargets,
    selectedHandCard, revealedDeckCard, tableStack, trumpSuit,
    oneCardDeclarations, playersWithOneCard, pendingPenalty,
    penaltyDeck, gameCoins, playedCards,
    showPenaltyCardSelection, penaltyCardSelectionPlayerId,
    showWinnerModal, winnerModalData, showLoserModal, loserModalData,
    showGameResultsModal, gameResults,
    showPenaltyDeckModal,
    nftDeckCards: storeNftDeckCards, // ✅ ИСПОЛЬЗУЕМ NFT КАРТЫ ИЗ STORE
    startGame, endGame, resetGame,
    drawCard, makeMove, onDeckClick, placeCardOnSelfByRules,
    selectHandCard, playSelectedCard, takeTableCards, showNotification,
    declareOneCard, askHowManyCards, contributePenaltyCard, cancelPenalty,
    togglePenaltyDeckModal, nextTurn, getNFTKey
  } = useGameStore();

  // ИСПРАВЛЕНО: Получаем данные пользователя из Supabase БД
  const [userData, setUserData] = useState<{
    coins: number;
    avatar?: string;
    username?: string;
    telegramId?: string;
  } | null>(null);
  const [isLoadingUserData, setIsLoadingUserData] = useState(true);

  // Текущая открытая карта из колоды (для отображения рядом с колодой)
  const [currentCard, setCurrentCard] = useState<string | null>(null);

  // ✅ NFT КАРТЫ ИЗ КОЛОДЫ (используем из store, но также загружаем локально для синхронизации)
  const [nftDeckCards, setNftDeckCards] = useState<Record<string, string>>({}); // { "ace_of_hearts": "https://..." }
  
  // ✅ СИНХРОНИЗИРУЕМ С STORE
  useEffect(() => {
    if (storeNftDeckCards && Object.keys(storeNftDeckCards).length > 0) {
      console.log('🔄 [GamePageContent] Синхронизируем NFT карты из store:', Object.keys(storeNftDeckCards).length);
      setNftDeckCards(storeNftDeckCards);
    }
  }, [storeNftDeckCards]);

  // Модальное окно профиля игрока
  const [selectedPlayerProfile, setSelectedPlayerProfile] = useState<any>(null);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  // ✅ СИСТЕМА ОБУЧЕНИЯ: Проверяем первые 3 игры
  const [gamesPlayed, setGamesPlayed] = useState<number | null>(null);
  const [isTutorialGame, setIsTutorialGame] = useState(false);
  const [tutorialGameNumber, setTutorialGameNumber] = useState<number | null>(null);
  const isUserTurn = currentPlayerId && players.find(p => p.id === currentPlayerId)?.isUser || false;
  const userPlayer = players.find(p => p.isUser);
  const userPlayerId = userPlayer?.id || null;
  
  const { 
    currentStep, 
    isTutorialPaused, 
    nextStep, 
    closeTutorial, 
    isTutorialActive,
    totalSteps,
    currentStepIndex,
  } = useTutorial(gameStage, isTutorialGame, tutorialGameNumber, isUserTurn, currentPlayerId, userPlayerId, players, deck.length);

  // ✅ Загружаем количество игр ПЕРЕД началом игры
  useEffect(() => {
    if (!user?.id || isMultiplayer) {
      // Если мультиплеер - отключаем обучение
      console.log('⚠️ [GamePageContent] Туториал отключен:', { hasUser: !!user?.id, isMultiplayer });
      setIsTutorialGame(false);
      setTutorialGameNumber(null);
      return;
    }

    const loadGamesCount = async () => {
      try {
        console.log('📊 [GamePageContent] Загружаем количество игр для обучения...', { userId: user.id });
        const response = await fetch('/api/user/bot-games', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'x-telegram-id': user.id.toString()
          },
          credentials: 'include'
        });
        
        console.log('📥 [GamePageContent] Ответ от /api/user/bot-games:', { status: response.status, ok: response.ok });

        if (response.ok) {
          const data = await response.json();
          if (data.success) {
            const gamesCount = data.gamesPlayed || 0;
            setGamesPlayed(gamesCount);
            
            // ✅ ИСПРАВЛЕНО: Обучение только для новых пользователей (после 10.02.2026) в первых 3 играх
            const isNewUser = data.isNewUser !== false; // По умолчанию true если не указано
            const showTutorial = data.showTutorial !== false; // Используем флаг из API
            const isTutorial = showTutorial && gamesCount < 3;
            
            setIsTutorialGame(isTutorial);
            setTutorialGameNumber(isTutorial ? gamesCount + 1 : null);
            
            console.log(`✅ [GamePageContent] Игр сыграно: ${gamesCount}, новый пользователь: ${isNewUser}, обучающая игра: ${isTutorial ? gamesCount + 1 : 'нет'}`);
            
            if (!isTutorial && isNewUser && gamesCount >= 3) {
              console.log('ℹ️ [GamePageContent] Новый пользователь, но уже сыграно 3+ игр - туториал не нужен');
            } else if (!isNewUser) {
              console.log('ℹ️ [GamePageContent] Старый пользователь (до 10.02.2026) - туториал отключен');
            }
          } else {
            console.warn('⚠️ [GamePageContent] Не удалось получить данные игр');
            // По умолчанию включаем обучение для новых пользователей
            setIsTutorialGame(true);
            setTutorialGameNumber(1);
          }
        } else {
          console.warn('⚠️ [GamePageContent] Ошибка ответа API, включаем обучение по умолчанию');
          // По умолчанию включаем обучение для новых пользователей
          setIsTutorialGame(true);
          setTutorialGameNumber(1);
        }
      } catch (error: unknown) {
        console.error('❌ [GamePageContent] Ошибка загрузки игр:', error);
        // По умолчанию включаем обучение для новых пользователей
        setIsTutorialGame(true);
        setTutorialGameNumber(1);
      }
    };

    loadGamesCount();
  }, [user?.id, isMultiplayer]);

  // Модальное окно сдачи штрафных карт (УДАЛЕНО - теперь используется showPenaltyCardSelection из store)
  // const [showPenaltyModal, setShowPenaltyModal] = useState(false);
  // const [penaltyTargets, setPenaltyTargets] = useState<any[]>([]);
  // const [selectedCards, setSelectedCards] = useState<{[playerId: string]: any}>({});

  // Функция генерации профиля игрока
  const generatePlayerProfile = async (player: any) => {
    if (player.isUser) {
      // ✅ ИСПРАВЛЕНО: Реальный игрок - данные ИЗ БД через /api/user/me
      try {
        const telegramUser = typeof window !== 'undefined' && (window as any).Telegram?.WebApp?.initDataUnsafe?.user;
        const telegramId = telegramUser?.id?.toString() || '';
        const username = telegramUser?.username || telegramUser?.first_name || '';
        
        console.log('📋 [generatePlayerProfile] Загружаем профиль из БД:', { telegramId, username });
        
        const response = await fetch('/api/user/me', {
          method: 'GET',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
            'x-telegram-id': telegramId,
            'x-username': username
          }
        });
        
        if (response.ok) {
          const result = await response.json();
          console.log('✅ [generatePlayerProfile] Данные из БД:', result);
          
          if (result.success && result.user) {
            // ✅ ИСПРАВЛЕНО: Используем fallback для username
            const displayName = result.user.username || result.user.firstName || result.user.first_name || username || 'Игрок';
            console.log(`🎮 [generatePlayerProfile] Username для игры: "${displayName}" (из: username="${result.user.username}", firstName="${result.user.firstName}")`);
            
            return {
              id: player.id,
              name: displayName,
              avatar: result.user.avatar_url || userData?.avatar || '',
              isBot: false,
              isUser: true,
              level: Math.floor((result.user.experience || 0) / 1000) + 1,
              rating: result.user.rating || 0,
              gamesPlayed: result.user.games_played || result.user.gamesPlayed || 0,
              wins: result.user.games_won || result.user.gamesWon || result.user.wins || 0,
              winRate: (result.user.games_played || result.user.gamesPlayed || 0) > 0 
                ? Math.round(((result.user.games_won || result.user.gamesWon || result.user.wins || 0) / (result.user.games_played || result.user.gamesPlayed || 1)) * 100) 
                : 0,
              bestStreak: result.user.best_win_streak || 0,
              status: '🟢 Online',
              joinedDate: result.user.created_at 
                ? new Date(result.user.created_at).toLocaleDateString('ru-RU')
                : 'Недавно',
            };
          }
        }
      } catch (error: unknown) {
        console.error('❌ [generatePlayerProfile] Ошибка загрузки профиля:', error);
      }
      
      // Fallback для реального игрока
      console.warn('⚠️ [generatePlayerProfile] Используем fallback данные');
      return {
        id: player.id,
        name: userData?.username || 'Игрок',
        avatar: userData?.avatar || '',
        isBot: false,
        isUser: true,
        level: 1,
        rating: 0,
        gamesPlayed: 0,
        wins: 0,
        winRate: 0,
        bestStreak: 0,
        status: '🟢 Online',
        joinedDate: 'Сегодня',
      };
    } else {
      // Бот - генерируем рандомные данные
      const seed = player.name.length + player.id.length;
      return {
        id: player.id,
        name: player.name,
        avatar: player.avatar,
        isBot: true,
        isUser: false,
        level: Math.floor(Math.random() * 50) + 1,
        rating: Math.floor(Math.random() * 2000) + 500,
        gamesPlayed: Math.floor(Math.random() * 500) + 50,
        winRate: Math.floor(Math.random() * 40) + 30, // 30-70%
        bestStreak: Math.floor(Math.random() * 15) + 1,
        status: '🤖 AI Bot',
        joinedDate: `${Math.floor(Math.random() * 30) + 1}.${Math.floor(Math.random() * 12) + 1}.2024`,
      };
    }
  };

  // Обработчик клика на игрока
  const handlePlayerClick = async (player: any) => {
    console.log('👤 [handlePlayerClick] Клик на игрока:', player);
    const profile = await generatePlayerProfile(player);
    console.log('📋 [handlePlayerClick] Сгенерированный профиль:', profile);
    setSelectedPlayerProfile(profile);
    setIsProfileModalOpen(true);
    
    // ✅ СИНХРОНИЗАЦИЯ: Если это текущий пользователь, обновляем данные при открытии модального окна
    if (player.isUser) {
      const syncUserProfile = async () => {
        try {
          const telegramUser = typeof window !== 'undefined' && (window as any).Telegram?.WebApp?.initDataUnsafe?.user;
          const telegramId = telegramUser?.id?.toString() || '';
          const username = telegramUser?.username || telegramUser?.first_name || '';
          
          if (!telegramId) return;
          
          const response = await fetch('/api/user/me', {
            method: 'GET',
            credentials: 'include',
            headers: {
              'Content-Type': 'application/json',
              'x-telegram-id': telegramId,
              'x-username': username
            }
          });
          
          if (response.ok) {
            const result = await response.json();
            if (result.success && result.user) {
              console.log('✅ [handlePlayerClick] Данные пользователя обновлены для профиля:', result.user);
              setSelectedPlayerProfile((prev: any) => prev ? {
                ...prev,
                name: result.user.username || result.user.firstName || prev.name,
                avatar: result.user.avatar_url || prev.avatar || '',
                rating: result.user.rating || prev.rating || 0,
                gamesPlayed: result.user.games_played || result.user.gamesPlayed || prev.gamesPlayed || 0,
                wins: result.user.games_won || result.user.gamesWon || prev.wins || 0,
                winRate: result.user.games_played && result.user.games_won 
                  ? Math.round((result.user.games_won / result.user.games_played) * 100)
                  : prev.winRate || 0
              } : null);
            }
          }
        } catch (error) {
          console.warn('⚠️ Ошибка синхронизации профиля пользователя:', error);
        }
      };
      
      // ✅ Обновляем данные с небольшой задержкой
      setTimeout(syncUserProfile, 300);
    }
  };


  // Обновляем currentCard из revealedDeckCard
  useEffect(() => {
    if (revealedDeckCard && revealedDeckCard.image) {
      setCurrentCard(revealedDeckCard.image);
    } else {
      setCurrentCard(null);
    }
  }, [revealedDeckCard]);

  // АВАТАРКИ ИГРОКОВ
  const [playerAvatars, setPlayerAvatars] = useState<Record<string, string>>({});

  // Заполняем аватарки игроков после создания
  useEffect(() => {
    if (players.length > 0) {
      const avatars: Record<string, string> = {};
      players.forEach(player => {
        if (player.avatar) {
          avatars[player.id] = player.avatar;
        }
      });
      setPlayerAvatars(avatars);
    }
  }, [players]);

  // Загружаем данные пользователя из Supabase БД через API
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        setIsLoadingUserData(true);
        
        // ✅ ИСПРАВЛЕНО: Получаем telegramId из Telegram WebApp
        const telegramUser = typeof window !== 'undefined' && (window as any).Telegram?.WebApp?.initDataUnsafe?.user;
        const telegramId = telegramUser?.id?.toString() || '';
        const username = telegramUser?.username || telegramUser?.first_name || '';
        
        if (!telegramId) {
          console.error('❌ Telegram WebApp не доступен');
          setUserData({ coins: 0, username: 'Игрок' });
          setIsLoadingUserData(false);
          return;
        }
        
        console.log('🎮 [GamePageContent] Загружаем userData для:', telegramId);
        
        const response = await fetch('/api/user/me', {
          method: 'GET',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
            'x-telegram-id': telegramId,
            'x-username': username
          }
        });
        
        if (!response.ok) {
          console.error('❌ Ошибка получения данных пользователя:', response.status);
          // ✅ Даже при ошибке устанавливаем дефолтные данные чтобы игра запустилась
          setUserData({ coins: 0, username: username || 'Игрок', telegramId });
          return;
        }
        
        const result = await response.json();
        
        if (result.success && result.user) {
          console.log('✅ Данные пользователя загружены из БД:', result.user);
          setUserData({
            coins: result.user.coins || 0,
            avatar: result.user.avatar_url || '',
            username: result.user.username || result.user.firstName || username || 'Игрок',
            telegramId: result.user.telegramId || telegramId
          });
        } else {
          console.warn('⚠️ Пользователь не найден в БД, используем дефолтные данные');
          setUserData({ coins: 0, username: username || 'Игрок', telegramId });
        }
      } catch (error: unknown) {
        console.error('❌ Ошибка загрузки данных пользователя:', error);
        // ✅ Даже при ошибке устанавливаем дефолтные данные
        const telegramUser = typeof window !== 'undefined' && (window as any).Telegram?.WebApp?.initDataUnsafe?.user;
        const username = telegramUser?.username || telegramUser?.first_name || '';
        const telegramId = telegramUser?.id?.toString() || '';
        setUserData({ coins: 0, username: username || 'Игрок', telegramId });
      } finally {
        setIsLoadingUserData(false);
      }
    };

    fetchUserData();
  }, []);

  // ✅ СИНХРОНИЗАЦИЯ ДАННЫХ ПОЛЬЗОВАТЕЛЯ: Слушаем события обновления монет
  useEffect(() => {
    const handleCoinsUpdate = (event: CustomEvent) => {
      console.log('💰 [GamePageContent] Получено событие обновления монет:', event.detail);
      if (event.detail?.coins !== undefined && userData) {
        setUserData(prev => prev ? { ...prev, coins: event.detail.coins } : null);
      }
    };

    // ✅ Слушаем событие обновления монет
    window.addEventListener('coinsUpdated', handleCoinsUpdate as EventListener);

    return () => {
      window.removeEventListener('coinsUpdated', handleCoinsUpdate as EventListener);
    };
  }, [userData]);

  // ✅ ПЕРИОДИЧЕСКАЯ СИНХРОНИЗАЦИЯ: Обновляем данные пользователя каждые 30 секунд
  useEffect(() => {
    const syncUserData = async () => {
      try {
        const telegramUser = typeof window !== 'undefined' && (window as any).Telegram?.WebApp?.initDataUnsafe?.user;
        const telegramId = telegramUser?.id?.toString() || '';
        const username = telegramUser?.username || telegramUser?.first_name || '';
        
        if (!telegramId) return;
        
        const response = await fetch('/api/user/me', {
          method: 'GET',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
            'x-telegram-id': telegramId,
            'x-username': username
          }
        });
        
        if (response.ok) {
          const result = await response.json();
          if (result.success && result.user) {
            console.log('🔄 [GamePageContent] Синхронизация данных пользователя:', result.user.username);
            setUserData(prev => ({
              coins: result.user.coins || prev?.coins || 0,
              avatar: result.user.avatar_url || prev?.avatar || '',
              username: result.user.username || result.user.firstName || prev?.username || 'Игрок',
              telegramId: result.user.telegramId || prev?.telegramId || telegramId
            }));
          }
        }
      } catch (error) {
        console.warn('⚠️ Ошибка синхронизации данных пользователя:', error);
      }
    };

    // ✅ Обновляем сразу и затем каждые 30 секунд
    syncUserData();
    const interval = setInterval(syncUserData, 30000);

    return () => clearInterval(interval);
  }, []);

  // ✅ СИНХРОНИЗАЦИЯ ПРОФИЛЯ: Обновляем данные профиля при открытии модального окна
  useEffect(() => {
    if (isProfileModalOpen && selectedPlayerProfile?.isUser) {
      const syncProfileData = async () => {
        try {
          const telegramUser = typeof window !== 'undefined' && (window as any).Telegram?.WebApp?.initDataUnsafe?.user;
          const telegramId = telegramUser?.id?.toString() || '';
          const username = telegramUser?.username || telegramUser?.first_name || '';
          
          if (!telegramId) return;
          
          const response = await fetch('/api/user/me', {
            method: 'GET',
            credentials: 'include',
            headers: {
              'Content-Type': 'application/json',
              'x-telegram-id': telegramId,
              'x-username': username
            }
          });
          
          if (response.ok) {
            const result = await response.json();
            if (result.success && result.user) {
              console.log('✅ [useEffect] Данные профиля обновлены:', result.user);
              setSelectedPlayerProfile((prev: any) => prev ? {
                ...prev,
                name: result.user.username || result.user.firstName || prev.name,
                avatar: result.user.avatar_url || prev.avatar || '',
                rating: result.user.rating || prev.rating || 0,
                gamesPlayed: result.user.games_played || result.user.gamesPlayed || prev.gamesPlayed || 0,
                wins: result.user.games_won || result.user.gamesWon || prev.wins || 0,
                winRate: result.user.games_played && result.user.games_won 
                  ? Math.round((result.user.games_won / result.user.games_played) * 100)
                  : prev.winRate || 0
              } : null);
            }
          }
        } catch (error) {
          console.warn('⚠️ Ошибка синхронизации профиля:', error);
        }
      };
      
      // ✅ Обновляем данные при открытии и каждые 10 секунд пока открыто
      syncProfileData();
      const interval = setInterval(syncProfileData, 10000);
      
      return () => clearInterval(interval);
    }
  }, [isProfileModalOpen, selectedPlayerProfile?.isUser]);

  // ✅ СИНХРОНИЗАЦИЯ ПОСЛЕ ОКОНЧАНИЯ ИГРЫ: Обновляем данные при показе модального окна результатов
  useEffect(() => {
    if (showGameResultsModal && gameResults) {
      const syncAfterGame = async () => {
        try {
          const telegramUser = typeof window !== 'undefined' && (window as any).Telegram?.WebApp?.initDataUnsafe?.user;
          const telegramId = telegramUser?.id?.toString() || '';
          const username = telegramUser?.username || telegramUser?.first_name || '';
          
          if (!telegramId) return;
          
          const response = await fetch('/api/user/me', {
            method: 'GET',
            credentials: 'include',
            headers: {
              'Content-Type': 'application/json',
              'x-telegram-id': telegramId,
              'x-username': username
            }
          });
          
          if (response.ok) {
            const result = await response.json();
            if (result.success && result.user) {
              console.log('✅ [GamePageContent] Данные пользователя обновлены после игры:', result.user.coins);
              setUserData(prev => ({
                coins: result.user.coins || prev?.coins || 0,
                avatar: result.user.avatar_url || prev?.avatar || '',
                username: result.user.username || result.user.firstName || prev?.username || 'Игрок',
                telegramId: result.user.telegramId || prev?.telegramId || telegramId
              }));
            }
          }
        } catch (error) {
          console.warn('⚠️ Ошибка обновления данных после игры:', error);
        }
      };

      // ✅ Обновляем данные с небольшой задержкой, чтобы сервер успел обработать изменения
      setTimeout(syncAfterGame, 1000);
    }
  }, [showGameResultsModal, gameResults]);

  // ✅ ЗАГРУЗКА NFT КАРТ ИЗ КОЛОДЫ (только для игрока)
  useEffect(() => {
    const loadNFTDeck = async () => {
      try {
        const telegramUser = typeof window !== 'undefined' && (window as any).Telegram?.WebApp?.initDataUnsafe?.user;
        const telegramId = telegramUser?.id?.toString() || '';
        
        if (!telegramId) {
          console.warn('⚠️ Telegram ID не найден, NFT карты не загружены');
          return;
        }

        console.log('🎴 [GamePageContent] Загружаем NFT карты из колоды...');
        
        const response = await fetch('/api/user/deck', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'x-telegram-id': telegramId
          },
          credentials: 'include',
          cache: 'no-store' // ✅ ОТКЛЮЧАЕМ КЭШИРОВАНИЕ
        });

        if (response.ok) {
          const result = await response.json();
          if (result.success && result.deck) {
            // Формируем мапу: "rank_of_suit" -> image_url
            const nftMap: Record<string, string> = {};
            result.deck.forEach((deckCard: any) => {
              // ✅ ИСПРАВЛЕНО: Нормализуем rank и suit для правильного ключа
              let rank = String(deckCard.rank || '').toLowerCase().trim();
              let suit = String(deckCard.suit || '').toLowerCase().trim();
              
              // ✅ Нормализация рангов (A -> ace, K -> king, Q -> queen, J -> jack, числа остаются)
              if (rank === 'a' || rank === 'ace') rank = 'ace';
              else if (rank === 'k' || rank === 'king') rank = 'king';
              else if (rank === 'q' || rank === 'queen') rank = 'queen';
              else if (rank === 'j' || rank === 'jack') rank = 'jack';
              
              // ✅ Нормализация мастей (H -> hearts, D -> diamonds, C -> clubs, S -> spades)
              if (suit === 'h' || suit === 'heart') suit = 'hearts';
              else if (suit === 'd' || suit === 'diamond') suit = 'diamonds';
              else if (suit === 'c' || suit === 'club') suit = 'clubs';
              else if (suit === 's' || suit === 'spade') suit = 'spades';
              
              const key = `${rank}_of_${suit}`;
              if (deckCard.image_url && rank && suit) {
                nftMap[key] = deckCard.image_url;
                console.log(`🎴 [GamePageContent] Добавлена NFT карта: ${key} -> ${deckCard.image_url}`);
              }
            });
            console.log(`✅ [GamePageContent] Загружено ${Object.keys(nftMap).length} NFT карт из колоды:`, nftMap);
            setNftDeckCards(nftMap);
            // ✅ ТАКЖЕ ОБНОВЛЯЕМ STORE (если есть метод для этого)
            // Store уже загружает NFT карты в startGame, но для синхронизации обновляем локальный state
          }
        }
      } catch (error: unknown) {
        console.error('❌ Ошибка загрузки NFT колоды:', error);
      }
    };

    loadNFTDeck();
  }, []);

  // ✅ УДАЛЕНО: Периодическое обновление баланса (тормозило игру)
  // Баланс обновляется только при явных действиях пользователя

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

  // 🎨 Состояния для генерации контента
  const [generatedTableImage, setGeneratedTableImage] = useState<string | null>(null);
  const [isGeneratingTable, setIsGeneratingTable] = useState(false);
  // playerAvatars уже объявлен выше на строке 220
  const [isGeneratingAvatars, setIsGeneratingAvatars] = useState(false);

  // Выбор стола удален - используем только роскошный SVG стол
  
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

  // ❌ УДАЛЕНО: Старая логика WinnerScreen - теперь используем WinnerModal из gameStore
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

  // Получаем игрока, который сейчас ходит (МЕМОИЗИРОВАНО)
  const currentTurnPlayer = useMemo(() => players.find(p => p.id === currentPlayerId), [players, currentPlayerId]);
  const currentPlayerIndex = useMemo(() => players.findIndex(p => p.id === currentPlayerId), [players, currentPlayerId]);
  
  // ✅ ИСПРАВЛЕНО: Находим РЕАЛЬНОГО ИГРОКА (не бота)
  const myPlayer = useMemo(() => players.find(p => !p.isBot), [players]);
  const isMyTurn = currentPlayerId === myPlayer?.id;
  
  // ОТЛАДКА убрана - логи были слишком многословные
  
  // Создаем экземпляры ИИ для ботов
  const [aiPlayers, setAiPlayers] = useState<Map<number, AIPlayer>>(new Map());
  
  // Защита от повторных вызовов AI (race condition protection)
  const aiProcessingRef = useRef<string | null>(null);
  const aiLastProcessingTimeRef = useRef<number | null>(null);
  
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
      if (typeof window === 'undefined') return;
      
      const vw = Math.min(window.innerWidth, document.documentElement.clientWidth);
      const vh = Math.min(window.innerHeight, document.documentElement.clientHeight);
      const isMobile = vw <= 768;
      const isSmallMobile = vw <= 480;
      const isVerySmallMobile = vw <= 375; // iPhone SE и подобные
      const isLandscape = vw > vh;
      
      // Особая проверка для iPhone
      const isIPhone = typeof navigator !== 'undefined' && /iPhone|iPod/.test(navigator.userAgent);
      const isAndroid = typeof navigator !== 'undefined' && /Android/.test(navigator.userAgent);
      
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
    if (typeof window !== 'undefined') {
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
    }
  }, []);

  // Инициализация ИИ игроков
  useEffect(() => {
    const newAiPlayers = new Map<number, AIPlayer>();
    players.forEach(player => {
      if (player.isBot) {
        const playerId = typeof player.id === 'string' ? 
          parseInt(player.id.replace('player_', '')) : player.id;
        newAiPlayers.set(playerId, new AIPlayer(playerId, player.difficulty || 'medium'));
      }
    });
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
    const { isGameActive, currentPlayerId, players, gameStage, stage2TurnPhase, deck, availableTargets, revealedDeckCard, trumpSuit, tableStack, isGamePaused, pendingPenalty } = useGameStore.getState();
    
    if (!isGameActive || !currentPlayerId) {
      return;
    }
    
    // ✅ КРИТИЧНО: НЕ ДАЕМ AI ХОДИТЬ ЕСЛИ ИГРА НА ПАУЗЕ (сбор штрафа)
    if (isGamePaused) {
      console.log(`⏸️ [AI] Игра на паузе (сбор штрафа), AI ${currentPlayerId} ждёт...`);
      return;
    }
    
    // ✅ КРИТИЧНО: НЕ ДАЕМ AI ХОДИТЬ ЕСЛИ ЕСТЬ ОЖИДАЮЩИЙ ШТРАФ
    if (pendingPenalty) {
      console.log(`⏸️ [AI] Ожидающий штраф, AI ${currentPlayerId} ждёт...`);
      // ✅ СБРОС REF: Когда появляется штраф - сбрасываем ref чтобы AI мог продолжить после
      aiProcessingRef.current = null;
      return;
    }
    
    const currentTurnPlayer = players.find(p => p.id === currentPlayerId);
    if (!currentTurnPlayer) {
      return;
    }
    
    if (!currentTurnPlayer.isBot) {
      return;
    }
    
    // Защита от повторных вызовов AI (race condition protection)
    // ✅ ИСПРАВЛЕНО: Добавлена проверка на время (защита от застревания)
    if (aiProcessingRef.current === currentPlayerId) {
      // Проверяем не застрял ли AI (более 5 секунд)
      const now = Date.now();
      if (aiLastProcessingTimeRef.current && now - aiLastProcessingTimeRef.current > 5000) {
        console.log(`⚠️ [AI] AI застрял на ${currentPlayerId}, принудительно сбрасываем`);
        aiProcessingRef.current = null;
        aiLastProcessingTimeRef.current = null;
      } else {
      return;
      }
    }
    
    // СТРОГИЕ ПРОВЕРКИ: ИИ может ходить только в свой ход!
    
    // Проверяем что это действительно ход этого бота
    if (gameStage === 2 || gameStage === 3) {
      // Разрешаем ИИ ходить в фазах 'selecting_card' и 'waiting_beat' для 2-й и 3-й стадий
      if (stage2TurnPhase !== 'selecting_card' && stage2TurnPhase !== 'waiting_beat') {
        return;
      }
      // Дополнительная проверка: игрок должен быть текущим
      if (currentTurnPlayer?.id !== currentPlayerId) {
        return;
      }
    } else if (gameStage === 1) {
      if (turnPhase !== 'analyzing_hand' && turnPhase !== 'waiting_deck_action') {
        return;
      }
    }
    
    const playerIdNum = typeof currentPlayerId === 'string' ? 
      parseInt(currentPlayerId.replace('player_', '')) : currentPlayerId;
    
    const ai = aiPlayers.get(playerIdNum);
    if (!ai) {
      return;
    }
    
    // Устанавливаем флаг обработки и время начала
    aiProcessingRef.current = currentPlayerId;
    aiLastProcessingTimeRef.current = Date.now();
    
    // Задержка перед ходом ИИ для реалистичности
    const makeAIMove = async () => {
      try {
        // ПРОВЕРКА: Убеждаемся что все нужные данные есть
        if (!currentTurnPlayer || !currentTurnPlayer.isBot || !players.length) {
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
            break;
        }
      } else if (gameStage === 2 || gameStage === 3) {
        // Во 2-й и 3-й стадиях AI использует систему selectHandCard + playSelectedCard (правила одинаковые)
        switch (decision.action) {
          case 'play_card':
            const { selectHandCard, playSelectedCard } = useGameStore.getState();
            if (decision.cardToPlay && selectHandCard && playSelectedCard) {
              // Найдем карту в руке игрока и выберем её
              if (currentTurnPlayer) {
                // ИСПРАВЛЕНО: Убрана проверка c.open - у ботов карты закрыты во 2-й стадии!
                const cardInHand = currentTurnPlayer.cards.find(c => 
                  c.image === decision.cardToPlay?.image
                );
                if (cardInHand) {
                  console.log(`🤖 [${currentTurnPlayer.name}] AI выбирает карту ${cardInHand.image} для хода`);
                  selectHandCard(cardInHand);
                  // Играем карту с небольшой задержкой (УСКОРЕНО В 2 РАЗА)
                  setTimeout(() => {
                    // ✅ ЗАЩИТА: Проверяем что игра все еще активна и ход не изменился
                    const currentState = useGameStore.getState();
                    if (!currentState.isGameActive || currentState.currentPlayerId !== currentPlayerId) {
                      console.warn(`⚠️ [AI] Игра изменилась, отменяем ход бота`);
                      aiProcessingRef.current = null;
                      return;
                    }
                    console.log(`🤖 [${currentTurnPlayer.name}] AI играет карту ${cardInHand.image}`);
                    try {
                      playSelectedCard();
                    } catch (error: unknown) {
                      console.error(`🚨 [AI] Ошибка при игре карты:`, error);
                      // ✅ ЗАЩИТА: Если ошибка - передаем ход следующему игроку
                      setTimeout(() => {
                        const { nextTurn } = useGameStore.getState();
                        if (nextTurn) nextTurn();
                      }, 500);
                    }
                  }, 400);
                } else {
                  console.error(`🚨 [AI] Карта ${decision.cardToPlay?.image} не найдена в руке ${currentTurnPlayer.name}!`);
                  console.log(`🚨 [AI] Карты в руке:`, currentTurnPlayer.cards.map(c => c.image));
                  // ✅ ЗАЩИТА: Если карта не найдена - берем первую доступную или передаем ход
                  if (currentTurnPlayer.cards.length > 0) {
                    console.log(`🔄 [AI] Пробуем взять первую карту из руки`);
                    const firstCard = currentTurnPlayer.cards[0];
                    selectHandCard(firstCard);
                    setTimeout(() => {
                      try {
                        playSelectedCard();
                      } catch (error: unknown) {
                        console.error(`🚨 [AI] Ошибка при игре первой карты:`, error);
                        const { nextTurn } = useGameStore.getState();
                        if (nextTurn) nextTurn();
                      }
                    }, 400);
                  } else {
                    // Нет карт - передаем ход
                    console.log(`⚠️ [AI] У ${currentTurnPlayer.name} нет карт, передаем ход`);
                    const { nextTurn } = useGameStore.getState();
                    if (nextTurn) nextTurn();
                  }
                  // Сбрасываем флаг обработки
                  aiProcessingRef.current = null;
                }
              }
            }
            break;
          case 'draw_card':
            // Во 2-й и 3-й стадиях это значит "взять карты со стола"
            // ✅ ИСПРАВЛЕНО: Используем уже импортированную функцию из хука
            if (takeTableCards) {
              console.log('🎴 [BOT] Вызываем takeTableCards для бота');
              takeTableCards();
            }
            break;
          case 'pass':
            // Логика пропуска хода может потребовать вызова nextTurn()
            break;
          default:
            break;
        }
      }
        
      // Сбрасываем флаг после завершения хода
      aiProcessingRef.current = null;
        
    } catch (error: unknown) {
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
  }, [isGameActive, currentPlayerId, gameStage, stage2TurnPhase, turnPhase, pendingPenalty]);
  
  // ✅ УБРАН ЕБАНЫЙ БАГ: Больше НЕ СБРАСЫВАЕМ игру для single player!
  // Этот useEffect УБИВАЛ только что созданную игру!

  // 🎲 Используем роскошный SVG стол (экипированный стол удален)
  // Функциональность выбора стола удалена - используем только luxury SVG table

  // Автоматическая генерация стола при инициализации
  useEffect(() => {
    if (typeof window !== 'undefined' && !generatedTableImage && !isGeneratingTable) {
      generatePremiumTable('luxury');
    }
  }, [generatedTableImage, isGeneratingTable]);

  // Автоматическая генерация аватаров при появлении игроков
  useEffect(() => {
    if (players.length > 0 && Object.keys(playerAvatars).length === 0 && !isGeneratingAvatars) {
      generatePlayersAvatars();
    }
  }, [players.length, playerAvatars, isGeneratingAvatars]);

  // Эффект для автоматической раздачи карт при старте игры
  useEffect(() => {
    if (isGameActive && !dealt) {
      setDealt(true);
    }
  }, [isGameActive, dealt]);

  // Запуск игры
  const handleStartGame = async () => {
    console.log('🎮 [handleStartGame] Запуск новой игры с ботами');
    
    // ВАЖНО: Загружаем актуальные данные из БД
    let actualUsername = userData?.username;
    let actualAvatar = userData?.avatar;
    
    try {
      // ✅ Получаем telegram данные для header
      const tg = (window as any).Telegram?.WebApp;
      const telegramUser = tg?.initDataUnsafe?.user;
      
      const authHeaders: Record<string, string> = {};
      if (telegramUser?.id) {
        authHeaders['x-telegram-id'] = String(telegramUser.id);
        authHeaders['x-username'] = telegramUser.username || telegramUser.first_name || 'User';
      }
      
      const response = await fetch('/api/auth', {
        credentials: 'include',
        headers: authHeaders
      });
      
      if (response.ok) {
        const result = await response.json();
        if (result.success && result.user) {
          actualUsername = result.user.username || actualUsername;
          actualAvatar = result.user.avatar_url || actualAvatar;
          console.log('✅ [handleStartGame] Данные из БД:', {
            username: actualUsername,
            avatar: actualAvatar ? 'есть' : 'нет'
          });
        }
      }
    } catch (error: unknown) {
      console.error('❌ [handleStartGame] Ошибка загрузки данных:', error);
    }
    
    console.log('👤 [handleStartGame] Передаем в startGame:', {
      avatar: actualAvatar,
      username: actualUsername
    });
    
    // ВАЖНО: Сбрасываем все состояния перед новой игрой
    setDealt(false);
    setGameInitialized(false);
    
    // Очищаем AI
    setAiPlayers(new Map());
    aiProcessingRef.current = null;
    
    // Запускаем новую игру с РЕАЛЬНЫМИ данными из БД
    startGame('multiplayer', playerCount, null, {
      avatar: actualAvatar,
      username: actualUsername || 'Игрок' // Fallback на "Игрок" вместо "Вы"
    });
    
    // Помечаем, что игра инициализирована
    setTimeout(() => {
      setGameInitialized(true);
      console.log('✅ [handleStartGame] Игра инициализирована');
    }, 100);
  };

  // НОВЫЕ ФУНКЦИИ для кнопок подсчета карт
  
  // НОВЫЙ STATE для сообщений над игроками
  const [playerMessages, setPlayerMessages] = useState<{[playerId: string]: {text: string; type: 'info' | 'warning' | 'success' | 'error'; timestamp: number}}>({});
  
  // STATE для задержки показа кнопки "Сколько карт?"
  const [showAskCardsButton, setShowAskCardsButton] = useState(false);
  const [lastPlayersWithOneCardUpdate, setLastPlayersWithOneCardUpdate] = useState<string[]>([]);

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

  // Отслеживаем изменения playersWithOneCard и показываем кнопку с задержкой 2 сек
  useEffect(() => {
    // Если список игроков с 1 картой изменился
    const currentIds = JSON.stringify(playersWithOneCard?.sort() || []);
    const lastIds = JSON.stringify(lastPlayersWithOneCardUpdate.sort());
    
    if (currentIds !== lastIds) {
      setLastPlayersWithOneCardUpdate(playersWithOneCard || []);
      
      // Если появились игроки с 1 картой
      if (playersWithOneCard && playersWithOneCard.length > 0) {
        setShowAskCardsButton(false); // Скрываем сначала
        
        // ❌ УБРАНО: НЕ показываем сообщение "1 карта!" автоматически
        // Сообщение должно появляться ТОЛЬКО после объявления игроком!
        
        // Показываем кнопку через 2 секунды
        setTimeout(() => {
          setShowAskCardsButton(true);
        }, 2000);
      } else {
        // Нет игроков с 1 картой - скрываем кнопку
        setShowAskCardsButton(false);
      }
    }
  }, [playersWithOneCard, players, lastPlayersWithOneCardUpdate]);

  // ✅ ИСПРАВЛЕНО: Показать количество карт у всех соперников + автоматическое спрашивание для ботов
  const showOpponentsCardCount = () => {
    if (!myPlayer) return;
    
    console.log('🔢 [showOpponentsCardCount] Запрашиваем количество карт у соперников');
    
    // Показываем сообщение над игроком который спросил
    showPlayerMessage(myPlayer.id, '🔍 Сколько карт?', 'info', 2000);
    
    // Проверяем каждого соперника через новую систему
    const opponentsWithOneCard = players.filter(p => 
      p.id !== myPlayer.id && 
      playersWithOneCard.includes(p.id)
    );
    
    if (opponentsWithOneCard.length > 0) {
      // Если есть игроки с 1 картой, спрашиваем у первого через новую систему
      const targetPlayer = opponentsWithOneCard[0];
      console.log(`🎯 [showOpponentsCardCount] Проверяем штраф у ${targetPlayer.name} через новую систему`);
      askHowManyCards(myPlayer.id, targetPlayer.id);
    } else {
      // Если нет игроков с 1 картой, показываем обычную информацию  
      players
        .filter(p => p.id !== myPlayer.id)
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
  
  // ✅ НОВОЕ: Автоматическое спрашивание "Сколько карт?" для ботов
  useEffect(() => {
    if (gameStage !== 2 && gameStage !== 3) return;
    if (!currentPlayerId) return;
    
    const currentPlayer = players.find(p => p.id === currentPlayerId);
    if (!currentPlayer || !currentPlayer.isBot) return;
    
    // ✅ Бот спрашивает "Сколько карт?" у игроков с 1 картой
    if (playersWithOneCard.length > 0) {
      const targetPlayerId = playersWithOneCard[0];
      const targetPlayer = players.find(p => p.id === targetPlayerId);
      
      if (targetPlayer && targetPlayer.id !== currentPlayerId) {
        const { scheduleBotAskHowManyCards } = useGameStore.getState();
        if (scheduleBotAskHowManyCards) {
          scheduleBotAskHowManyCards(targetPlayerId);
        }
      }
    }
  }, [playersWithOneCard, currentPlayerId, gameStage, players]);

  // Объявить что у игрока последняя карта (ОБНОВЛЕННАЯ ЛОГИКА)
  const announceLastCard = () => {
    if (!myPlayer) return;
    
    const openCards = myPlayer.cards.filter(c => c.open);
    console.log('1️⃣ [announceLastCard] Объявление последней карты:', openCards.length);
    
    if (openCards.length === 1) {
      // Используем новую системную функцию
      declareOneCard(myPlayer.id);
      
      // Показываем сообщение над игроком который объявил
      showPlayerMessage(myPlayer.id, '☝️ ОДНА КАРТА!', 'success', 4000);
      
      console.log(`📢 [announceLastCard] ${myPlayer.name} объявил последнюю карту через новую систему!`);
    } else {
      // Показываем ошибку над игроком
      showPlayerMessage(myPlayer.id, `❌ У вас ${openCards.length} карт!`, 'error', 3000);
      showNotification(`Нельзя объявлять "одна карта" - у вас ${openCards.length} карт`, 'error', 3000);
      console.warn(`⚠️ [announceLastCard] Неправильное объявление: ${openCards.length} карт вместо 1`);
    }
  };

  // 🎨 Генерация премиум стола
  const generatePremiumTable = async (style: 'luxury' | 'neon' | 'classic' = 'luxury') => {
    if (typeof window === 'undefined') return;
    
    setIsGeneratingTable(true);
    try {
      console.log(`🎲 Используем статичный ${style} стол...`);
      
      // Генерация перенесена в отдельный проект pidr_generators
      const tableImage = await getPremiumTable();
      setGeneratedTableImage(tableImage);
      console.log('✅ Статичный стол загружен!');
      
    } catch (error: unknown) {
      console.error('❌ Ошибка генерации стола:', error);
    } finally {
      setIsGeneratingTable(false);
    }
  };

  // Функция смены стола удалена - используем только роскошный SVG стол

  // 👥 Генерация аватаров для всех игроков
  const generatePlayersAvatars = async () => {
    if (typeof window === 'undefined' || players.length === 0) return;
    
    setIsGeneratingAvatars(true);
    try {
      console.log('🎨 Используем стандартные аватары...');
      const avatars: {[playerId: string]: string} = {};
      
      // Генерация аватаров перенесена в отдельный проект pidr_generators
      // Используем стандартные аватары
      for (const player of players) {
        avatars[player.id] = '/images/default-avatar.png'; // Заглушка
        await new Promise(resolve => setTimeout(resolve, 50));
      }
      
      setPlayerAvatars(avatars);
      console.log('✅ Стандартные аватары загружены!');
      
    } catch (error: unknown) {
      console.error('❌ Ошибка генерации аватаров:', error);
    } finally {
      setIsGeneratingAvatars(false);
    }
  };

  // Автоматически запускаем игру если она не активна
  useEffect(() => {
    if (!gameInitialized && userData) { // Ждем загрузки данных пользователя
      console.log('🎮 [AUTOSTART] Запускаем игру автоматически...');
      if (isMultiplayer && multiplayerData) {
        // Для мультиплеера
        startGame('multiplayer', playerCount, null, {
          avatar: userData.avatar,
          username: userData.username
        });
      } else {
        // Для одиночной игры
        startGame('single', playerCount, null, {
          avatar: userData.avatar,
          username: userData.username
        });
      }
      setGameInitialized(true);
    }
  }, [gameInitialized, isMultiplayer, multiplayerData, playerCount, startGame, userData]);

  // Вычисляемые значения для UI
  const canDrawCard = turnPhase === 'deck_card_revealed' && currentTurnPlayer?.id === currentPlayerId;
  const canClickDeck = turnPhase === 'showing_deck_hint' && currentTurnPlayer?.id === currentPlayerId;
  const waitingForTarget = turnPhase === 'waiting_target_selection';

  // ✅ ИСПРАВЛЕНО: Используем getRectanglePosition с передачей gameStage
  const getPlayerPosition = (index: number, totalPlayers: number) => {
    const rectPos = getRectanglePosition(index, totalPlayers, gameStage);
    return {
      x: parseFloat(rectPos.left),
      y: parseFloat(rectPos.top),
      side: rectPos.side, // ✅ НОВОЕ: сторона для правильного расположения карт
      cardOffset: rectPos.cardOffset // ✅ ИСПРАВЛЕНО: Добавляем cardOffset для позиционирования карт
    };
  };

  // ✅ УБРАН ЗАГРУЗОЧНЫЙ ЭКРАН - ИГРА ПОКАЗЫВАЕТСЯ СРАЗУ ПОСЛЕ СОЗДАНИЯ ИГРОКОВ!
  // Показываем лоадер ТОЛЬКО если userData еще не загружена
  if (isLoadingUserData) {
    return (
      <div className={styles.gameContainer} style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        minHeight: '100vh'
        }}>
          <div style={{
          width: '60px',
          height: '60px',
          border: '6px solid rgba(99, 102, 241, 0.3)',
          borderTop: '6px solid #6366f1',
            borderRadius: '50%',
          animation: 'spin 1s linear infinite'
          }}></div>
      </div>
    );
  }

  return (
    <div className={styles.gameContainer}>
      {/* ЗАГОЛОВОК ИГРЫ - СТАДИЯ И КОЛОДА/БИТКО */}
      {players.length > 0 && (
        <div className={styles.gameHeader}>
          <div className={styles.stageInfo}>
            <span className={styles.trumpIcon}>
              {gameStage === 1 ? '🎴' : gameStage === 2 ? '🃏' : gameStage === 3 ? '🎯' : '🏆'}
            </span>
            Стадия {gameStage}
            {gameStage >= 2 && trumpSuit && (
              <span style={{ marginLeft: '8px' }}>
                {trumpSuit === 'hearts' ? '♥️' : 
                 trumpSuit === 'diamonds' ? '♦️' : 
                 trumpSuit === 'clubs' ? '♣️' : 
                 trumpSuit === 'spades' ? '♠️' : ''}
              </span>
            )}
          </div>
          <div className={styles.deckInfo}>
            {gameStage === 1 ? (
              <>🎴 Колода: {deck.length}</>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'center' }}>
                <button
                  onClick={() => togglePenaltyDeckModal(true)}
                        style={{ 
                    background: 'none',
                    border: 'none',
                    color: 'inherit',
                    fontSize: 'inherit',
                    fontFamily: 'inherit',
                    cursor: penaltyDeck.length > 0 ? 'pointer' : 'default',
                    padding: 0,
                    margin: 0,
                    transition: 'all 0.2s',
                    textDecoration: penaltyDeck.length > 0 ? 'underline' : 'none'
                  }}
                  onMouseEnter={(e) => {
                    if (penaltyDeck.length > 0) {
                      e.currentTarget.style.transform = 'scale(1.05)';
                      e.currentTarget.style.color = '#60a5fa';
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'scale(1)';
                    e.currentTarget.style.color = '';
                  }}
                  disabled={penaltyDeck.length === 0}
                >
                  🗑️ Бито: {playedCards?.length || 0}
                </button>
                {/* ✅ НОВОЕ: Отдельный индикатор козыря во 2-й стадии */}
                {gameStage >= 2 && trumpSuit && (
                  <div style={{
                    fontSize: '11px',
                    fontWeight: '700',
                    color: '#fbbf24',
                    textShadow: '0 1px 2px rgba(0, 0, 0, 0.5)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    justifyContent: 'center',
                    whiteSpace: 'nowrap'
                  }}>
                    <span>🃏 Козырь:</span>
                    <span style={{ fontSize: '13px' }}>
                      {trumpSuit === 'hearts' ? '♥️' : 
                       trumpSuit === 'diamonds' ? '♦️' : 
                       trumpSuit === 'clubs' ? '♣️' : 
                       trumpSuit === 'spades' ? '♠️' : ''}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
          {/* 💸 СЧЕТЧИК ШТРАФНОЙ СТОПКИ - КНОПКА! */}
          {penaltyDeck.length > 0 && (
            <button
              className={styles.deckInfo}
              onClick={() => {
                console.log('🔥 [КНОПКА ШТРАФ] Клик! penaltyDeck.length:', penaltyDeck.length);
                togglePenaltyDeckModal(true);
              }}
              style={{ 
                background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.2), rgba(220, 38, 38, 0.2))',
                borderColor: 'rgba(239, 68, 68, 0.5)',
                boxShadow: '0 2px 8px rgba(239, 68, 68, 0.4)',
                cursor: 'pointer',
                textDecoration: 'underline',
                transition: 'all 0.2s',
                zIndex: 1000 // ✅ ПОВЕРХ ВСЕХ ЭЛЕМЕНТОВ!
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'scale(1.05)';
                e.currentTarget.style.background = 'linear-gradient(135deg, rgba(239, 68, 68, 0.3), rgba(220, 38, 38, 0.3))';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'scale(1)';
                e.currentTarget.style.background = 'linear-gradient(135deg, rgba(239, 68, 68, 0.2), rgba(220, 38, 38, 0.2))';
              }}
            >
              💸 Штраф: {penaltyDeck.length}
            </button>
          )}
        </div>
      )}

      {/* БУРГЕР МЕНЮ */}
      {players.length > 0 && (
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
              {/* Профиль пользователя */}
              <div className={styles.menuUserProfile}>
                <div className={styles.menuUserAvatar}>
                  {userData?.avatar ? (
                    <img 
                      src={userData.avatar} 
                      alt="Avatar" 
                      className={styles.menuAvatarImage}
                    />
                  ) : (
                    <span className={styles.menuAvatarPlaceholder}>👤</span>
                  )}
                </div>
                <div className={styles.menuUserInfo}>
                  <div className={styles.menuUserName}>{userData?.username || 'Игрок'}</div>
                  <div className={styles.menuUserCoins}>
                    <div className={styles.coinAnimated}></div>
                    <span className={styles.menuCoinsValue}>{userData?.coins || 0}</span>
                  </div>
                </div>
              </div>
              
              <div className={styles.menuDivider}></div>
              
              <button className={styles.menuItem} onClick={() => typeof window !== 'undefined' && window.history.back()}>
                🏠 Главная
              </button>
              <button className={styles.menuItem} onClick={() => {
                if (confirm('Вы уверены что хотите завершить игру?')) {
                  endGame();
                  typeof window !== 'undefined' && window.history.back();
                }
              }}>
                🚪 Выйти
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 🎮 ИГРОВОЙ СТОЛ И КАРТЫ */}
      {players.length > 0 && (
        <div className={styles.tableWrapper}>
          {/* Прямоугольный стол */}
          <div className={styles.rectangularTable}>
            {/* СТОПКА КАРТ НА СТОЛЕ (2-я стадия) - ЗАМЕНЯЕТ КОЛОДУ */}
            {gameStage >= 2 && tableStack && tableStack.length > 0 && (
              <div 
                onDragOver={(e) => {
                  e.preventDefault();
                  e.dataTransfer.dropEffect = 'move';
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  const cardData = e.dataTransfer.getData('card');
                  if (!cardData) return;
                  
                  try {
                    const card = JSON.parse(cardData);
                    console.log(`🎯 [DROP] Карта сброшена на стол:`, card);
                    
                    // Проверяем что это ход игрока
                    const myPlayer = players.find(p => !p.isBot);
                    if (myPlayer?.id !== currentPlayerId) {
                      showNotification('Сейчас не ваш ход!', 'warning', 2000);
                      return;
                    }
                    
                    // Играем карту через gameStore
                    const { selectHandCard, playSelectedCard } = useGameStore.getState();
                    if (selectHandCard && playSelectedCard) {
                      selectHandCard(card);
                      setTimeout(() => playSelectedCard(), 100);
                    }
                  } catch (error: unknown) {
                    console.error('❌ [DROP] Ошибка парсинга карты:', error);
                  }
                }}
                style={{
                position: 'absolute',
                left: '50%',
                top: '50%',
                transform: 'translate(-50%, -50%)',
                zIndex: 15,
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                minWidth: '200px',
                minHeight: '120px'
              }}>
                {tableStack.map((card, idx) => {
                  // ГОРИЗОНТАЛЬНАЯ СТОПКА: Каждая следующая карта смещается ВПРАВО
                  // Левая карта = нижняя (первая), правая карта = верхняя (последняя)
                  const offset = idx * 25; // 25px смещение вправо (примерно 30% от ширины карты 74px)
                  const isTopCard = idx === tableStack.length - 1;
                  
                  // ✅ ИСПРАВЛЕНО: Проверяем является ли card.image NFT URL
                  const cardImg = card.image || 'card_back.png';
                  const isNftUrl = cardImg.startsWith('http://') || cardImg.startsWith('https://');
                  const tableCardSrc = isNftUrl ? cardImg : `${CARDS_PATH}${cardImg}`;
                  
                  // Парсим ранг и масть для оверлея NFT
                  const tableCardRank = String(card.rank || '').toLowerCase();
                  const tableCardSuit = String(card.suit || '').toLowerCase();
                  
                  return (
                    <div 
                      key={`table-${card.suit}-${card.rank}-${idx}-${card.id || Math.random()}`} // ✅ УНИКАЛЬНЫЙ КЛЮЧ 
                      style={{
                        position: 'absolute',
                        left: `${offset}px`, // СЛЕВА НАПРАВО!
                        top: '0',
                        background: '#ffffff',
                        borderRadius: '8px',
                        padding: '3px',
                        boxShadow: isTopCard 
                          ? '0 8px 24px rgba(255, 193, 7, 0.6), 0 0 30px rgba(255, 193, 7, 0.4)' 
                          : '0 4px 12px rgba(0,0,0,0.4)',
                        border: isTopCard ? '3px solid rgba(255, 193, 7, 0.8)' : '2px solid rgba(255, 255, 255, 0.3)',
                        zIndex: idx, // Правая карта (больший idx) поверх левой
                        transition: 'all 0.3s ease'
                        // УБРАНА АНИМАЦИЯ pulse - не мерцает больше
                      }}
                    >
                      {/* ✅ ИСПРАВЛЕНО: Для NFT используем img, для обычных - Image */}
                      {isNftUrl ? (
                        <div style={{ position: 'relative', width: '74px', height: '111px' }}>
                          <img
                            src={tableCardSrc}
                            alt={`Card ${idx + 1}`}
                            style={{ 
                              width: '74px',
                              height: '111px',
                              borderRadius: '6px',
                              display: 'block',
                              objectFit: 'cover'
                            }}
                          />
                          {/* ✅ ОВЕРЛЕЙ РАНГА И МАСТИ ДЛЯ NFT НА СТОЛЕ */}
                          {tableCardRank && tableCardSuit && (() => {
                            // ✅ ИСПРАВЛЕНО: Правильное форматирование ранга (поддержка чисел и строк)
                            const formatRank = (rank: string | number): string => {
                              const rankStr = String(rank).toLowerCase();
                              const rankNum = typeof rank === 'number' ? rank : parseInt(rankStr, 10);
                              
                              if (rankNum === 11 || rankStr === 'jack' || rankStr === 'j') return 'J';
                              if (rankNum === 12 || rankStr === 'queen' || rankStr === 'q') return 'Q';
                              if (rankNum === 13 || rankStr === 'king' || rankStr === 'k') return 'K';
                              if (rankNum === 14 || rankStr === 'ace' || rankStr === 'a') return 'A';
                              if (rankNum >= 2 && rankNum <= 10) return String(rankNum);
                              return rankStr.toUpperCase(); // Для NFT карт с нестандартными рангами
                            };
                            
                            return (
                              <div style={{
                                position: 'absolute',
                                top: '4px',
                                left: '6px',
                                fontSize: '14px',
                                fontWeight: 'bold',
                                color: tableCardSuit === 'hearts' || tableCardSuit === 'diamonds' ? '#dc2626' : '#1f2937',
                                textShadow: '0 0 3px white, 0 0 3px white, 0 0 3px white',
                                lineHeight: '1',
                                pointerEvents: 'none'
                              }}>
                                <div>{formatRank(tableCardRank)}</div>
                                <div>{tableCardSuit === 'hearts' ? '♥' : tableCardSuit === 'diamonds' ? '♦' : tableCardSuit === 'clubs' ? '♣' : tableCardSuit === 'spades' ? '♠' : ''}</div>
                              </div>
                            );
                          })()}
                        </div>
                      ) : (
                      <Image
                          src={tableCardSrc}
                        alt={`Card ${idx + 1}`}
                        width={74}
                        height={111}
                        style={{ 
                          borderRadius: '6px',
                          display: 'block'
                        }}
                        priority
                      />
                      )}
                    </div>
                  );
                })}
                {/* Индикатор количества карт */}
                <div style={{
                  position: 'absolute',
                  bottom: '-35px',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  background: 'rgba(0, 0, 0, 0.8)',
                  color: '#fbbf24',
                  padding: '4px 12px',
                  borderRadius: '12px',
                  fontSize: '14px',
                  fontWeight: 'bold',
                  whiteSpace: 'nowrap',
                  border: '2px solid rgba(255, 193, 7, 0.5)'
                }}>
                  На столе: {tableStack.length}
                </div>
              </div>
            )}

            {/* Колода и открытая карта в центре (1-я стадия) */}
            {deck && deck.length > 0 && gameStage === 1 && (
              <div className={styles.deckStack} style={{
                position: 'absolute',
                left: '50%',
                top: '50%',
                transform: 'translate(-50%, -50%)',
                zIndex: 10,
                display: 'flex',
                gap: '15px',
                alignItems: 'center'
              }}>
                {/* Открытая карта из колоды (слева) - КЛИКАБЕЛЬНАЯ! */}
                {currentCard && revealedDeckCard && (() => {
                  // ✅ ИСПРАВЛЕНО: Проверяем является ли карта NFT URL
                  const isNftUrl = currentCard.startsWith('http://') || currentCard.startsWith('https://');
                  const cardSrc = isNftUrl ? currentCard : `${CARDS_PATH}${currentCard}`;
                  
                  // Парсим ранг и масть для оверлея
                  let deckCardRank = '';
                  let deckCardSuit = '';
                  if (!isNftUrl) {
                    const match = currentCard.match(/(\w+)_of_(\w+)\.png/);
                    if (match) {
                      deckCardRank = match[1].toLowerCase();
                      deckCardSuit = match[2].toLowerCase();
                    }
                  } else if (revealedDeckCard) {
                    deckCardRank = String(revealedDeckCard.rank || '').toLowerCase();
                    deckCardSuit = String(revealedDeckCard.suit || '').toLowerCase();
                  }
                  
                  return (
                  <div 
                    style={{ 
                      position: 'relative',
                      background: '#ffffff',
                      borderRadius: '8px',
                      padding: '2px',
                      boxShadow: turnPhase === 'waiting_deck_action' 
                        ? '0 0 30px rgba(99, 102, 241, 0.8), 0 0 50px rgba(99, 102, 241, 0.5)' 
                        : '0 0 20px rgba(255, 255, 255, 0.3), 0 4px 12px rgba(0,0,0,0.4)',
                      border: '2px solid #e2e8f0',
                      animation: turnPhase === 'waiting_deck_action' ? 'pulse 2s ease-in-out infinite' : 'none',
                      cursor: (turnPhase === 'waiting_deck_action' && availableTargets.length > 0) ? 'pointer' : 'default',
                      transition: 'transform 0.2s ease'
                    }}
                    onClick={() => {
                      const myPlayer = players.find(p => p.isUser);
                      if (turnPhase === 'waiting_deck_action' && availableTargets.length > 0 && currentPlayerId === myPlayer?.id) {
                        // Автоматически ходим на первую доступную цель
                        const targetIndex = availableTargets[0];
                        const targetPlayer = players[targetIndex];
                        console.log(`🎴 [КЛИК ПО КАРТЕ ИЗ КОЛОДЫ] Ходим на ${targetPlayer?.name}`);
                        makeMove(targetPlayer?.id || '');
                      }
                    }}
                    onMouseEnter={(e) => {
                      if (turnPhase === 'waiting_deck_action' && availableTargets.length > 0) {
                        e.currentTarget.style.transform = 'scale(1.1)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'scale(1)';
                    }}
                  >
                    {/* ✅ ИСПРАВЛЕНО: Для NFT используем img, для обычных - Image */}
                    {/* ✅ УВЕЛИЧЕНО В 1.5 РАЗА: 36x54 → 54x81 */}
                    {isNftUrl ? (
                      <img
                        src={cardSrc}
                        alt="Current Card"
                        style={{ 
                          width: '54px',
                          height: '81px',
                          borderRadius: '8px',
                          opacity: 1,
                          filter: 'none',
                          visibility: 'visible',
                          display: 'block',
                          objectFit: 'contain' // ✅ ИСПРАВЛЕНО: contain вместо cover - карта не обрезается
                        }}
                      />
                    ) : (
                    <Image
                        src={cardSrc}
                      alt="Current Card"
                      width={54}
                      height={81}
                      style={{ 
                        borderRadius: '8px',
                        opacity: 1,
                        filter: 'none',
                        visibility: 'visible',
                        display: 'block'
                      }}
                      priority
                    />
                    )}
                    {/* ✅ ОВЕРЛЕЙ РАНГА И МАСТИ ДЛЯ NFT КАРТЫ ИЗ КОЛОДЫ */}
                    {isNftUrl && deckCardRank && deckCardSuit && (() => {
                      // ✅ ИСПРАВЛЕНО: Правильное форматирование ранга
                      const formatRank = (rank: string | number | undefined): string => {
                        if (!rank) return '';
                        const rankStr = String(rank).toLowerCase();
                        const rankNum = typeof rank === 'number' ? rank : parseInt(rankStr, 10);
                        
                        if (rankNum === 11 || rankStr === 'jack' || rankStr === 'j') return 'J';
                        if (rankNum === 12 || rankStr === 'queen' || rankStr === 'q') return 'Q';
                        if (rankNum === 13 || rankStr === 'king' || rankStr === 'k') return 'K';
                        if (rankNum === 14 || rankStr === 'ace' || rankStr === 'a') return 'A';
                        if (rankNum >= 2 && rankNum <= 10) return String(rankNum);
                        return rankStr.toUpperCase();
                      };
                      
                      return (
                        <div style={{
                          position: 'absolute',
                          top: '3px',
                          left: '4px',
                          fontSize: '12px',
                          fontWeight: 'bold',
                          color: deckCardSuit === 'hearts' || deckCardSuit === 'diamonds' ? '#dc2626' : '#1f2937',
                          textShadow: '0 0 3px white, 0 0 3px white',
                        lineHeight: '1',
                        pointerEvents: 'none'
                      }}>
                        <div>{formatRank(deckCardRank)}</div>
                        <div>{deckCardSuit === 'hearts' ? '♥' : deckCardSuit === 'diamonds' ? '♦' : deckCardSuit === 'clubs' ? '♣' : deckCardSuit === 'spades' ? '♠' : ''}</div>
                      </div>
                      );
                    })()}
                    {turnPhase === 'waiting_deck_action' && availableTargets.length > 0 && (
                      <div style={{
                        position: 'absolute',
                        top: '-8px',
                        right: '-8px',
                        background: '#10b981',
                        color: 'white',
                        borderRadius: '50%',
                        width: '20px',
                        height: '20px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '12px',
                        fontWeight: 'bold',
                        border: '2px solid white',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.3)'
                      }}>
                        ✓
                      </div>
                    )}
                  </div>
                  );
                })()}
                
                {/* Колода (справа, уменьшена на 60%) */}
                <div 
                  style={{ 
                    position: 'relative',
                    cursor: (currentPlayerId === players.find(p => p.isUser)?.id && (turnPhase === 'showing_deck_hint' || turnPhase === 'waiting_deck_action')) ? 'pointer' : 'default',
                    transition: 'transform 0.2s ease, box-shadow 0.3s ease',
                    borderRadius: '8px',
                    padding: '4px',
                    boxShadow: (currentPlayerId === players.find(p => p.isUser)?.id && turnPhase === 'showing_deck_hint')
                      ? '0 0 30px rgba(255, 193, 7, 0.9), 0 0 50px rgba(255, 193, 7, 0.6), 0 0 70px rgba(255, 193, 7, 0.3)' 
                      : currentPlayerId === players.find(p => p.isUser)?.id 
                      ? '0 0 20px rgba(59, 130, 246, 0.6), 0 0 40px rgba(59, 130, 246, 0.4)' 
                      : 'none',
                    animation: (currentPlayerId === players.find(p => p.isUser)?.id && turnPhase === 'showing_deck_hint')
                      ? 'pulse 1.5s ease-in-out infinite'
                      : 'none',
                  }}
                  onClick={() => {
                    const myPlayer = players.find(p => p.isUser);
                    if (currentPlayerId === myPlayer?.id && (turnPhase === 'showing_deck_hint' || turnPhase === 'waiting_deck_action')) {
                      console.log('🎴 [КЛИК НА КОЛОДУ] Игрок кликнул на колоду');
                      onDeckClick();
                    } else if (currentPlayerId !== myPlayer?.id) {
                      console.log('⛔ [КЛИК НА КОЛОДУ] Сейчас не ваш ход');
                    } else {
                      showNotification('Сначала попробуйте сходить из руки!', 'warning', 2000);
                    }
                  }}
                  onMouseEnter={(e) => {
                    const myPlayer = players.find(p => p.isUser);
                    if (currentPlayerId === myPlayer?.id && (turnPhase === 'showing_deck_hint' || turnPhase === 'waiting_deck_action')) {
                      e.currentTarget.style.transform = 'scale(1.15)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'scale(1)';
                  }}
                >
                  <Image
                    src={`${CARDS_PATH}${CARD_BACK}`}
                    alt="Deck"
                    width={36}
                    height={54}
                    className={styles.deckCard}
                    style={{ 
                      opacity: 1,
                      filter: 'none',
                      visibility: 'visible',
                      display: 'block'
                    }}
                    priority
                  />
                  <div className={styles.deckCount}>{deck.length}</div>
                  
                  {/* Индикатор подсказки когда нужно кликнуть на колоду */}
                  {currentPlayerId === players.find(p => p.isUser)?.id && turnPhase === 'showing_deck_hint' && (
                    <div style={{
                      position: 'absolute',
                      top: '-35px',
                      left: '50%',
                      transform: 'translateX(-50%)',
                      fontSize: '24px',
                      animation: 'bounce 1s ease-in-out infinite',
                      filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))',
                    }}>👆</div>
                  )}
                  {currentPlayerId === players.find(p => p.isUser)?.id && turnPhase === 'showing_deck_hint' && (
                    <div style={{
                      position: 'absolute',
                      bottom: '-40px',
                      left: '50%',
                      transform: 'translateX(-50%)',
                      whiteSpace: 'nowrap',
                      background: 'rgba(255, 193, 7, 0.95)',
                      color: '#1e293b',
                      padding: '6px 12px',
                      borderRadius: '8px',
                      fontSize: '12px',
                      fontWeight: '600',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                      animation: 'pulse 2s ease-in-out infinite',
                    }}>Кликните на колоду</div>
                  )}
                </div>
              </div>
            )}
              
            {/* Игроки вокруг стола */}
            {players.map((player, index) => {
              const position = getPlayerPosition(index, players.length);
              const isCurrentTurn = player.id === currentPlayerId;
              const playerCards = player.cards || []; // ИСПРАВЛЕНО: используем player.cards из gameStore!
              const isHumanPlayer = player.isUser === true; // ИСПРАВЛЕНО: используем флаг isUser из gameStore!
              
              // Расположение карт — всегда снизу аватара (столбик)

                return (
                  <div
                  key={player.id}
                  className={`${styles.playerSeat} ${isCurrentTurn ? styles.activePlayer : ''}`}
                    style={{
                    left: `${position.x}%`,
                    top: `${position.y}%`,
                    flexDirection: 'column',
                    background: 'linear-gradient(145deg, rgba(0, 0, 0, 0.4) 0%, rgba(0, 0, 0, 0.2) 100%), radial-gradient(circle at center, rgba(255, 215, 0, 0.1) 0%, transparent 70%)',
                    border: isCurrentTurn ? '2px solid rgba(34, 197, 94, 1)' : '1px solid rgba(255, 215, 0, 0.4)',
                    backdropFilter: 'blur(8px)',
                    boxShadow: isCurrentTurn 
                      ? '0 8px 30px rgba(0, 0, 0, 0.5), 0 0 30px rgba(34, 197, 94, 0.8), 0 0 50px rgba(34, 197, 94, 0.6), 0 0 70px rgba(34, 197, 94, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.1)'
                      : '0 4px 20px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
                  }}
                >
                  {/* ✅ АВАТАР СВЕРХУ, КАРТЫ СНИЗУ ДЛЯ ВСЕХ ИГРОКОВ */}
                    <div className={styles.avatarWrap} style={{ order: 1 }}>
                      {/* Сообщение над игроком (как в чате) */}
                      {playerMessages[player.id] && (
                        <div style={{
                          position: 'absolute',
                          bottom: '100%',
                          left: '50%',
                          transform: 'translateX(-50%)',
                          marginBottom: '8px',
                          background: playerMessages[player.id].type === 'success' 
                            ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
                            : playerMessages[player.id].type === 'error'
                            ? 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)'
                            : playerMessages[player.id].type === 'warning'
                            ? 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)'
                            : 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                          color: 'white',
                          padding: '6px 12px',
                          borderRadius: '12px',
                          fontSize: '11px',
                          fontWeight: '700',
                          whiteSpace: 'nowrap',
                          boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                          zIndex: 1000,
                          animation: 'fadeInDown 0.3s ease-out',
                          border: '2px solid rgba(255,255,255,0.3)'
                        }}>
                          {playerMessages[player.id].text}
                          {/* Стрелка вниз */}
                          <div style={{
                            position: 'absolute',
                            bottom: '-6px',
                            left: '50%',
                            transform: 'translateX(-50%)',
                            width: '0',
                            height: '0',
                            borderLeft: '6px solid transparent',
                            borderRight: '6px solid transparent',
                            borderTop: `6px solid ${
                              playerMessages[player.id].type === 'success' ? '#059669'
                              : playerMessages[player.id].type === 'error' ? '#dc2626'
                              : playerMessages[player.id].type === 'warning' ? '#d97706'
                              : '#2563eb'
                            }`
                          }}></div>
                        </div>
                      )}
                      
                      {/* ✅ ТОЛЬКО АВАТАР ВО ВЕСЬ КОНТЕЙНЕР - ПРИ КЛИКЕ МОДАЛКА */}
                      <div 
                        className={styles.avatarContainer}
                        onClick={(e) => {
                          e.stopPropagation();
                          handlePlayerClick(player);
                        }}
                        style={{ 
                          cursor: 'pointer',
                          width: '100%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          overflow: 'hidden', // ✅ СКРЫВАЕМ ЕБАНЫЙ ТЕКСТ URL!
                          position: 'relative'
                        }}
                      >
                        {/* ✅ ИСПРАВЛЕНО: Используем <img> вместо <Image> для поддержки SVG data URLs */}
                        <img 
                        src={playerAvatars[player.id] || player.avatar || '/images/default-avatar.png'}
                        alt={player.name}
                            className={styles.avatar}
                          style={{
                            width: '24px',
                            height: '24px',
                            borderRadius: '50%',
                            boxShadow: currentPlayerId === player.id 
                              ? '0 0 10px rgba(34, 197, 94, 0.9), 0 0 20px rgba(34, 197, 94, 0.5)'
                              : '0 1px 4px rgba(0, 0, 0, 0.3)',
                            border: `${currentPlayerId === player.id ? '2px' : '1px'} solid ${currentPlayerId === player.id ? '#22c55e' : 'rgba(255, 255, 255, 0.2)'}`,
                            transition: 'all 0.3s ease',
                            objectFit: 'cover',
                            position: 'relative',
                            zIndex: 5
                          }}
                          />
                      {player.isBot && (
                        <div className={styles.botBadge}>🤖</div>
                        )}
                          </div>
                    </div>
                    
                  {/* ✅ КАРТЫ СНИЗУ АВАТАРА ДЛЯ ВСЕХ ИГРОКОВ */}
                  {playerCards.length > 0 && (
                    <div className={styles.cardsContainer} style={{ 
                      order: 2,
                      flexDirection: 'row',
                    }}>
                      <div className={styles.activeCardContainer}>
                        {playerCards.map((card: any, cardIndex: number) => {
                          // Карта может быть строкой "7_of_spades.png(open)" или объектом {rank, suit, image}
                          const cardImage = typeof card === 'string' 
                            ? card.replace('(open)', '').replace('(closed)', '')
                            : card.image || (card.rank && card.suit ? `${card.rank}_of_${card.suit}.png` : 'back.png');
                          
                          // ✅ ИСПРАВЛЕНО: Проверяем является ли cardImage уже URL (NFT карта)
                          const isCardAlreadyNftUrl = cardImage.startsWith('http://') || cardImage.startsWith('https://');
                          
                          // ✅ НОВОЕ: Определяем rank и suit для поиска NFT карты
                          // ✅ ИСПРАВЛЕНО: Сохраняем оригинальный ранг (может быть числом или строкой)
                          let cardRank: string | number = '';
                          let cardSuit = '';
                          if (typeof card === 'object' && card.rank !== undefined && card.suit) {
                            // ✅ КРИТИЧНО: Сохраняем ранг как есть (число или строка) для правильного отображения
                            cardRank = card.rank; // Может быть 11, 12, 13, 14 или 'jack', 'queen', 'king', 'ace'
                            cardSuit = String(card.suit).toLowerCase();
                          } else if (typeof card === 'string' && !isCardAlreadyNftUrl) {
                            // Парсим из строки "7_of_spades.png" (только если не URL)
                            const match = cardImage.match(/(\w+)_of_(\w+)\.png/);
                            if (match) {
                              cardRank = match[1].toLowerCase();
                              cardSuit = match[2].toLowerCase();
                            }
                          }
                          
                          // ✅ ИСПРАВЛЕНО: NFT карты для ВСЕХ игроков (не только главного)
                          let nftImageUrl: string | null = null;
                          // ✅ НОВОЕ: Проверяем NFT для всех игроков, если cardImage уже URL
                          if (isCardAlreadyNftUrl) {
                            nftImageUrl = cardImage; // ✅ cardImage уже является NFT URL!
                          } else if (cardRank && cardSuit) {
                            // ✅ ИСПРАВЛЕНО: Ищем NFT для всех игроков по ключу
                            const nftKey = getNFTKey ? getNFTKey(cardImage) : `${cardRank}_of_${cardSuit}`;
                            nftImageUrl = (nftDeckCards[nftKey] || storeNftDeckCards?.[nftKey]) || null;
                          }
                          
                          // ИСПРАВЛЕНО: В 1-й стадии ТОЛЬКО ВЕРХНЯЯ карта соперника открыта!
                          // Во 2-й стадии ТОЛЬКО СВОИ КАРТЫ открыты!
                          // ЛОГИКА ДЛЯ 1-Й СТАДИИ: подсветка верхней карты если можно ходить
                          const isTopCard = cardIndex === playerCards.length - 1;
                          const showOpen = isHumanPlayer || (gameStage === 1 && isTopCard);
                          const isMyTurn = player.id === currentPlayerId;
                          const canMakeMove = gameStage === 1 && isMyTurn && isHumanPlayer && turnPhase === 'analyzing_hand' && availableTargets.length > 0;
                          const shouldHighlight = gameStage === 1 && isTopCard && canMakeMove;
                          
                          // Подсветка игрока как доступной цели
                          let isAvailableTarget = gameStage === 1 && !isHumanPlayer && availableTargets.includes(index) && turnPhase === 'waiting_target_selection';
                          
                          // Также подсвечиваем цели для карты из колоды
                          if (gameStage === 1 && !isHumanPlayer && turnPhase === 'waiting_deck_action' && revealedDeckCard) {
                            const state = useGameStore.getState();
                            const deckTargets = state.findAvailableTargetsForDeckCard?.(revealedDeckCard) || [];
                            isAvailableTarget = deckTargets.includes(index);
                          }
                          
                          // ✅ ИСПРАВЛЕНО: Определяем URL изображения (NFT или обычная карта) для ВСЕХ игроков
                          const cardImageUrl = showOpen 
                            ? (nftImageUrl 
                                ? nftImageUrl 
                                : (isCardAlreadyNftUrl ? cardImage : `${CARDS_PATH}${cardImage}`))
                            : `${CARDS_PATH}${CARD_BACK}`;
                          
                          // ✅ ИСПРАВЛЕНО: Динамическое перекрытие - УВЕЛИЧЕНО для закрытых карт
                          const isOpponentCard = !isHumanPlayer;
                          const isStage2 = gameStage >= 2;
                          const totalCards = playerCards.length;
                          const isClosedCard = !showOpen; // ✅ Закрытая карта (рубашкой вверх)
                          
                          // ✅ УВЕЛИЧЕНО ПЕРЕКРЫТИЕ: для закрытых карт больше наложение
                          const baseOverlap = isClosedCard ? 60 : 50; // ✅ Больше перекрытие для закрытых карт
                          const minVisible = isClosedCard ? 4 : 8; // ✅ Меньше видимой части для закрытых карт
                          
                          // Динамическое перекрытие: чем больше карт, тем меньше перекрытие
                          // Но для закрытых карт перекрытие больше
                          const dynamicOverlap = totalCards > 1 
                            ? Math.max(minVisible, baseOverlap - (totalCards - 1) * (isClosedCard ? 1.5 : 2)) 
                            : 0;
                          const overlap = cardIndex > 0 ? `-${dynamicOverlap}px` : '0';
                          
                          return (
                            <div 
                              key={cardIndex} 
                              className={styles.cardOnPenki} 
                              style={{
                                marginLeft: overlap,
                                zIndex: cardIndex + 1, // ВЕРХНЯЯ карта (последняя, больший индекс) ПОВЕРХ всех! Первая=1, последняя=макс
                                cursor: (shouldHighlight || isAvailableTarget) ? 'pointer' : 'default',
                                position: 'relative',
                                transform: isStage2 && isOpponentCard ? `translateY(${cardIndex * 2}px)` : 'none', // Небольшое вертикальное смещение для глубины
                                transition: 'all 0.2s ease',
                              }}
                              onClick={() => {
                                if (gameStage === 1) {
                                  if (shouldHighlight && isTopCard) {
                                    // Клик по своей верхней карте - инициируем выбор цели
                                    console.log(`🎴 [1-я стадия] Клик по своей карте, инициируем выбор цели`);
                                    makeMove('initiate_move');
                                  } else if (isAvailableTarget) {
                                    // Клик по доступной цели - делаем ход
                                    console.log(`🎴 [1-я стадия] Клик по цели: ${player.name}`);
                                    makeMove(player.id);
                                  }
                                }
                              }}
                              onMouseEnter={(e) => {
                                if (isAvailableTarget) {
                                  e.currentTarget.style.transform = 'scale(1.05)';
                                }
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.transform = 'scale(1)';
                              }}
                            >
                              {/* ✅ ИСПРАВЛЕНО: NFT карты для ВСЕХ игроков (не только главного) */}
                              {nftImageUrl && showOpen ? (
                                <div style={{ position: 'relative', width: '100%', height: '100%' }}>
                                <img
                                  src={nftImageUrl}
                                  alt={cardImage}
                                  onError={(e) => {
                                    console.log('❌ NFT не загрузилась, показываем стандартную:', cardImage);
                                    const target = e.currentTarget;
                                    if (!cardImage.startsWith('http')) {
                                      target.src = `${CARDS_PATH}${cardImage}`;
                                    } else {
                                      target.src = `${CARDS_PATH}${cardRank}_of_${cardSuit}.png`;
                                    }
                                  }}
                                  style={{ 
                                    width: '100%',
                                    height: '100%',
                                    borderRadius: 'inherit',
                                    background: '#ffffff',
                                    opacity: 1,
                                    filter: shouldHighlight || isAvailableTarget ? 'brightness(1.2)' : 'none',
                                    visibility: 'visible',
                                    display: 'block',
                                    boxShadow: shouldHighlight 
                                      ? '0 0 12px rgba(40, 167, 69, 0.8)' 
                                      : isAvailableTarget 
                                      ? '0 0 12px rgba(59, 130, 246, 0.8)'
                                      : 'none',
                                    transition: 'all 0.3s ease',
                                    objectFit: 'cover',
                                  }}
                                />
                                  {/* ✅ ОВЕРЛЕЙ РАНГА И МАСТИ НА NFT КАРТЕ */}
                                  {(() => {
                                    // ✅ ИСПРАВЛЕНО: Правильное форматирование ранга (поддержка чисел и строк)
                                    const formatRank = (rank: string | number | undefined): string => {
                                      if (!rank) return '';
                                      const rankStr = String(rank).toLowerCase();
                                      const rankNum = typeof rank === 'number' ? rank : parseInt(rankStr, 10);
                                      
                                      if (rankNum === 11 || rankStr === 'jack' || rankStr === 'j') return 'J';
                                      if (rankNum === 12 || rankStr === 'queen' || rankStr === 'q') return 'Q';
                                      if (rankNum === 13 || rankStr === 'king' || rankStr === 'k') return 'K';
                                      if (rankNum === 14 || rankStr === 'ace' || rankStr === 'a') return 'A';
                                      if (rankNum >= 2 && rankNum <= 10) return String(rankNum);
                                      return rankStr.toUpperCase(); // Для NFT карт с нестандартными рангами
                                    };
                                    
                                    return (
                                      <div style={{
                                        position: 'absolute',
                                        top: '1px',
                                        left: '2px',
                                        fontSize: '8px',
                                        fontWeight: 'bold',
                                        color: cardSuit === 'hearts' || cardSuit === 'diamonds' ? '#dc2626' : '#1f2937',
                                        textShadow: '0 0 2px white, 0 0 2px white',
                                        lineHeight: '1',
                                        pointerEvents: 'none'
                                      }}>
                                        <div>{formatRank(cardRank)}</div>
                                        <div>{cardSuit === 'hearts' ? '♥' : cardSuit === 'diamonds' ? '♦' : cardSuit === 'clubs' ? '♣' : cardSuit === 'spades' ? '♠' : ''}</div>
                                      </div>
                                    );
                                  })()}
                                </div>
                              ) : (
                                <Image
                                  src={cardImageUrl}
                                  alt={showOpen ? cardImage : 'Card'}
                                  width={60}
                                  height={90}
                                  loading="eager"
                                  style={{ 
                                    width: '100%',
                                    height: '100%',
                                    borderRadius: 'inherit',
                                    background: '#ffffff',
                                    opacity: 1,
                                    filter: shouldHighlight || isAvailableTarget ? 'brightness(1.2)' : 'none',
                                    visibility: 'visible',
                                    display: 'block',
                                    boxShadow: shouldHighlight 
                                      ? '0 0 12px rgba(40, 167, 69, 0.8)' 
                                      : isAvailableTarget 
                                      ? '0 0 12px rgba(59, 130, 246, 0.8)'
                                      : 'none',
                                    transition: 'all 0.3s ease',
                                    objectFit: 'cover',
                                  }}
                                  priority
                                />
                              )}
                              {shouldHighlight && (
                                <div style={{
                                  position: 'absolute',
                                  top: '5px',
                                  right: '5px',
                                  width: '10px',
                                  height: '10px',
                                  background: '#28a745',
                                  borderRadius: '50%',
                                  border: '2px solid white',
                                  animation: 'pulse 1.5s ease-in-out infinite',
                                  zIndex: 10,
                                }}></div>
                              )}
                              {isAvailableTarget && (
                                <div style={{
                                  position: 'absolute',
                                  top: '-10px',
                                  left: '50%',
                                  transform: 'translateX(-50%)',
                                  fontSize: '20px',
                                  animation: 'bounce 1s ease-in-out infinite',
                                }}>⬇️</div>
                              )}
                              
                              {/* 🔢 ПОКАЗЫВАЕМ КОЛИЧЕСТВО КАРТ ВО 2-Й СТАДИИ (только для закрытых карт) */}
                              {gameStage >= 2 && !showOpen && cardIndex === playerCards.length - 1 && (
                                <div style={{
                                  position: 'absolute',
                                  top: '50%',
                                  left: '50%',
                                  transform: 'translate(-50%, -50%)',
                                  background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.95) 0%, rgba(37, 99, 235, 0.95) 100%)',
                                  color: 'white',
                                  fontSize: '11px',
                                  fontWeight: '900',
                                  width: '20px',
                                  height: '20px',
                                  borderRadius: '50%',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  boxShadow: '0 2px 8px rgba(59, 130, 246, 0.6)',
                                  border: '1.5px solid white',
                                  zIndex: 20,
                                  textShadow: '0 1px 2px rgba(0, 0, 0, 0.5)'
                                }}>
                                  {playerCards.length}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                  </div>
                );
              })}
            </div>
          </div>
      )}

      {/* ПАНЕЛЬ КНОПОК ДЕЙСТВИЙ - УБРАНА, КНОПКА ПЕРЕНЕСЕНА В РУКУ ИГРОКА */}

      {/* Рука игрока внизу экрана - ТОЛЬКО СО 2-Й СТАДИИ! */}
      {(() => {
        console.log('🔍 [RENDER CHECK] players:', players.length, 'gameStage:', gameStage, 'myPlayer:', myPlayer?.id, 'cards:', myPlayer?.cards?.length);
        return players.length > 0 && gameStage >= 2 && myPlayer && myPlayer.cards && myPlayer.cards.length > 0;
      })() && (
        <div className={styles.playerHand}>
          {/* Кнопки компактно над картами игрока */}
          <div style={{
            display: 'flex',
            gap: '6px',
            justifyContent: 'center',
            marginBottom: '8px',
            flexWrap: 'wrap',
            position: 'relative', // ✅ КРИТИЧНО!
            zIndex: 100, // ✅ КРИТИЧНО: КНОПКИ ПОВЕРХ ВСЕГО!
            pointerEvents: 'auto', // ✅ КРИТИЧНО: ВКЛЮЧАЕМ КЛИКИ!
          }}>
            {/* Кнопка "Одна карта!" - ВСЕГДА ВИДНА, ПРОЗРАЧНАЯ */}
              <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('🔘 [ОДНА КАРТА] Кнопка НАЖАТА!');
                
                if (!myPlayer) {
                  console.error('❌ [ОДНА КАРТА] myPlayer не найден!');
                  return;
                }
                
                  // ИСПРАВЛЕНО: Во 2-й стадии считаем ВСЕ карты, а не только открытые!
                const totalCards = myPlayer.cards.length;
                console.log(`🔘 [ОДНА КАРТА] Всего карт: ${totalCards}, объявлено: ${oneCardDeclarations[myPlayer.id]}`);
                
                if (totalCards === 1 && !oneCardDeclarations[myPlayer.id]) {
                  console.log('✅ [ОДНА КАРТА] Объявляем!');
                  declareOneCard(myPlayer.id);
                  showPlayerMessage(myPlayer.id, '☝️ ОДНА КАРТА!', 'success', 4000);
                } else if (oneCardDeclarations[myPlayer.id]) {
                  console.log('⚠️ [ОДНА КАРТА] Уже объявлено!');
                  showPlayerMessage(myPlayer.id, '✅ Уже объявлено!', 'info', 2000);
                  } else {
                  console.log(`❌ [ОДНА КАРТА] Недоступно: ${totalCards} карт`);
                  showPlayerMessage(myPlayer.id, `❌ У вас ${totalCards} ${totalCards === 1 ? 'карта' : totalCards < 5 ? 'карты' : 'карт'}!`, 'error', 3000);
                  }
                }}
                style={{
                  background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '6px 12px',
                  fontSize: '11px',
                  fontWeight: '700',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                opacity: myPlayer && myPlayer.cards.length === 1 && !oneCardDeclarations[myPlayer.id] ? 1 : 0.3,
                transition: 'opacity 0.3s ease',
                pointerEvents: 'auto',
                zIndex: 9999,
                }}
              >
                ☝️ Одна карта!
              </button>
            
            {/* Кнопка "Сколько карт?" - ВСЕГДА ВИДНА, ПРОЗРАЧНАЯ */}
            {(() => {
              if (!myPlayer) return null; // ✅ ЗАЩИТА ОТ undefined
              
              const targetsNotDeclared = players.filter(p => 
                playersWithOneCard.includes(p.id) && 
                p.id !== myPlayer.id &&
                !oneCardDeclarations[p.id]
              );
              
              const isActive = showAskCardsButton && targetsNotDeclared.length > 0;
              
              return (
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  console.log('🔘 [СКОЛЬКО КАРТ] Кнопка НАЖАТА!');
                  console.log(`🔘 [СКОЛЬКО КАРТ] isActive: ${isActive}, targets: ${targetsNotDeclared.length}`);
                  
                  if (!isActive) {
                    console.log('⚠️ [СКОЛЬКО КАРТ] Недоступно');
                    showPlayerMessage(myPlayer.id, '⏳ Недоступно сейчас', 'warning', 2000);
                    return;
                  }
                  
                  console.log('✅ [СКОЛЬКО КАРТ] Спрашиваем...');
                  showPlayerMessage(myPlayer.id, '❓ Сколько карт?', 'info', 2000);
                  
                  const targets = targetsNotDeclared;
                  
                  if (targets.length === 1) {
                    console.log(`🎯 [СКОЛЬКО КАРТ] Проверка 1 игрока: ${targets[0].name}`);
                    showPlayerMessage(targets[0].id, '🔍 Проверка...', 'warning', 3000);
                    askHowManyCards(myPlayer.id, targets[0].id);
                  } else if (targets.length > 1) {
                    console.log(`🎯 [СКОЛЬКО КАРТ] Проверка ${targets.length} игроков`);
                    targets.forEach(t => {
                      showPlayerMessage(t.id, '🔍 Проверка...', 'warning', 3000);
                      askHowManyCards(myPlayer.id, t.id);
                    });
                  } else {
                    console.log('❌ [СКОЛЬКО КАРТ] Нет целей');
                    showNotification('Нет доступных целей для проверки', 'warning', 2000);
                  }
                }}
                style={{
                  background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '6px 12px',
                  fontSize: '11px',
                  fontWeight: '700',
                  cursor: isActive ? 'pointer' : 'not-allowed',
                  whiteSpace: 'nowrap',
                  opacity: isActive ? 1 : 0.3, // ✅ ПРОЗРАЧНОСТЬ!
                  transition: 'opacity 0.3s ease',
                  pointerEvents: 'auto' // ✅ ВСЕГДА КЛИКАБЕЛЬНА!
                }}
              >
                ❓ Сколько карт?
              </button>
              );
            })()}
            
            {/* КОМПАКТНАЯ КНОПКА "ШТРАФ" - ВСЕГДА ВИДНА, ПРОЗРАЧНАЯ */}
            {myPlayer && (
              <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('🔘 [ШТРАФ] Кнопка НАЖАТА!');
                console.log(`🔘 [ШТРАФ] pendingPenalty:`, pendingPenalty);
                
                if (!pendingPenalty || !pendingPenalty.contributorsNeeded.includes(myPlayer.id)) {
                  console.log('⚠️ [ШТРАФ] Нет активного штрафа');
                  showPlayerMessage(myPlayer.id, '⏳ Нет активного штрафа', 'warning', 2000);
                    return;
                  }
                  
                console.log('✅ [ШТРАФ] Открываем модалку штрафа');
                useGameStore.setState({
                  showPenaltyCardSelection: true,
                  penaltyCardSelectionPlayerId: myPlayer.id
                });
                }}
                style={{
                background: 'linear-gradient(135deg, #ff1744 0%, #f50057 100%)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '6px 12px',
                  fontSize: '11px',
                  fontWeight: '700',
                cursor: (pendingPenalty && pendingPenalty.contributorsNeeded.includes(myPlayer.id)) ? 'pointer' : 'not-allowed',
                whiteSpace: 'nowrap',
                opacity: (pendingPenalty && pendingPenalty.contributorsNeeded.includes(myPlayer.id)) ? 1 : 0.3,
                transition: 'opacity 0.3s ease',
                pointerEvents: 'auto'
              }}
            >
              💸 Штраф
              </button>
            )}
            
            {/* КОМПАКТНАЯ КНОПКА "ВЗЯТЬ" - ВСЕГДА ВИДНА, ПРОЗРАЧНАЯ */}
            {myPlayer && (
              <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('🔘 [ВЗЯТЬ] Кнопка НАЖАТА!');
                console.log(`🔘 [ВЗЯТЬ] gameStage: ${gameStage}, tableStack: ${tableStack?.length}, currentPlayerId: ${currentPlayerId}, myPlayer: ${myPlayer.id}`);
                
                if (gameStage < 2) {
                  console.log('⚠️ [ВЗЯТЬ] Недоступно до 2-й стадии');
                  showPlayerMessage(myPlayer.id, '⏳ Доступно со 2-й стадии', 'warning', 2000);
                  return;
                }
                if (!tableStack || tableStack.length === 0) {
                  console.log('⚠️ [ВЗЯТЬ] Нет карт на столе');
                  showPlayerMessage(myPlayer.id, '❌ Нет карт на столе', 'warning', 2000);
                  return;
                }
                if (myPlayer.id !== currentPlayerId) {
                  console.log('⚠️ [ВЗЯТЬ] Не ваш ход');
                  showPlayerMessage(myPlayer.id, '⏳ Не ваш ход', 'warning', 2000);
                  return;
                }
                console.log('✅ [ВЗЯТЬ] Берем карты со стола!');
                takeTableCards();
              }}
                style={{
                  background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '6px 12px',
                  fontSize: '11px',
                  fontWeight: '700',
                cursor: (gameStage >= 2 && tableStack && tableStack.length > 0 && myPlayer.id === currentPlayerId) ? 'pointer' : 'not-allowed',
                whiteSpace: 'nowrap',
                opacity: (gameStage >= 2 && tableStack && tableStack.length > 0 && myPlayer.id === currentPlayerId) ? 1 : 0.3,
                transition: 'opacity 0.3s ease',
                pointerEvents: 'auto'
              }}
            >
              ⬇️ Взять {tableStack && tableStack.length > 0 ? `(${tableStack.length})` : ''}
              </button>
            )}
          </div>
          
          <div className={styles.handCards}>
            {myPlayer && myPlayer.cards.map((card: any, index: number) => {
              // Карта может быть строкой "7_of_spades.png(open)" или объектом {rank, suit, image}
              const cardImage = typeof card === 'string' 
                ? card.replace('(open)', '').replace('(closed)', '')
                : card.image || (card.rank && card.suit ? `${card.rank}_of_${card.suit}.png` : 'back.png');
              
              // ✅ ИСПРАВЛЕНО: Проверяем является ли cardImage уже URL (NFT карта из store)
              const isCardImageUrl = cardImage.startsWith('http://') || cardImage.startsWith('https://');
              
              // ✅ НОВОЕ: Определяем rank и suit для поиска NFT карты
              // ✅ ИСПРАВЛЕНО: Сохраняем оригинальный ранг (может быть числом или строкой)
              let cardRank: string | number = '';
              let cardSuit = '';
              if (typeof card === 'object' && card.rank !== undefined && card.suit) {
                // ✅ КРИТИЧНО: Сохраняем ранг как есть (число или строка) для правильного отображения
                cardRank = card.rank; // Может быть 11, 12, 13, 14 или 'jack', 'queen', 'king', 'ace'
                cardSuit = String(card.suit).toLowerCase();
              } else if (typeof card === 'string' && !isCardImageUrl) {
                // Парсим из строки "7_of_spades.png" (только если не URL)
                const match = cardImage.match(/(\w+)_of_(\w+)\.png/);
                if (match) {
                  cardRank = match[1].toLowerCase();
                  cardSuit = match[2].toLowerCase();
                }
              }
              
              // ✅ ИСПРАВЛЕНО: Если cardImage уже URL - используем его как NFT
              // Иначе ищем NFT по ключу
              let nftImageUrl: string | null = null;
              if (isCardImageUrl) {
                nftImageUrl = cardImage; // ✅ cardImage уже является NFT URL!
              } else {
                const nftKey = getNFTKey ? getNFTKey(cardImage) : `${cardRank}_of_${cardSuit}`;
                nftImageUrl = (nftDeckCards[nftKey] || storeNftDeckCards?.[nftKey]) || null;
              }
              
              // Проверяем можно ли сыграть эту карту
              const isMyTurn = myPlayer.id === currentPlayerId;
              const isSelected = selectedHandCard?.id === card.id || selectedHandCard?.image === cardImage;
              
              // Логика подсветки: карта доступна если это ваш ход и либо стол пустой, либо карта может побить верхнюю
              let canPlay = false;
              if (isMyTurn && stage2TurnPhase === 'selecting_card') {
                if (tableStack.length === 0) {
                  canPlay = true; // Можно сыграть любую карту на пустой стол
                } else {
                  // Проверяем можем ли побить верхнюю карту на столе
                  const topCard = tableStack[tableStack.length - 1];
                  // Простая проверка - используем функцию из gameStore
                  const cardObj = typeof card === 'string' ? { image: cardImage, open: true } : card;
                  const state = useGameStore.getState();
                  if (state.canBeatCard && topCard && trumpSuit) {
                    canPlay = state.canBeatCard(topCard, cardObj, trumpSuit);
                  }
                }
              }
              
              return (
                <div
                  key={`hand-${index}-${cardImage}`}
                  className={`${styles.handCard} ${isSelected ? styles.selected : ''} ${canPlay ? styles.playable : ''} ${!isMyTurn ? styles.disabled : ''}`}
                  draggable={isMyTurn && canPlay}
                  onDragStart={(e) => {
                    if (!isMyTurn || !canPlay) {
                      e.preventDefault();
                      return;
                    }
                    console.log(`🖱️ [DRAG START] Начало перетаскивания: ${cardImage}`);
                    const cardObj = typeof card === 'string' 
                      ? { image: cardImage, open: true, id: `card-${index}` }
                      : { ...card, id: card.id || `card-${index}` };
                    e.dataTransfer.setData('card', JSON.stringify(cardObj));
                    e.dataTransfer.effectAllowed = 'move';
                  }}
                  onTouchStart={(e) => {
                    if (!isMyTurn || !canPlay) return;
                    console.log(`📱 [TOUCH START] Начало касания: ${cardImage}`);
                    const touch = e.touches[0];
                    const cardObj = typeof card === 'string' 
                      ? { image: cardImage, open: true, id: `card-${index}` }
                      : { ...card, id: card.id || `card-${index}` };
                    // Сохраняем данные карты для touchEnd
                    (e.currentTarget as any).__draggedCard = cardObj;
                    (e.currentTarget as any).__touchStartY = touch.clientY;
                  }}
                  onTouchMove={(e) => {
                    if (!isMyTurn || !canPlay) return;
                    const touch = e.touches[0];
                    const startY = (e.currentTarget as any).__touchStartY;
                    if (startY && touch.clientY < startY - 50) {
                      // Карта перетащена вверх на 50px - визуальная обратная связь
                      e.currentTarget.style.transform = 'translateY(-20px)';
                    }
                  }}
                  onTouchEnd={(e) => {
                    if (!isMyTurn || !canPlay) return;
                    const cardObj = (e.currentTarget as any).__draggedCard;
                    const startY = (e.currentTarget as any).__touchStartY;
                    const touch = e.changedTouches[0];
                    
                    // Сбрасываем визуальный эффект
                    e.currentTarget.style.transform = '';
                    
                    // Если карта перетащена вверх на 50px - играем её
                    if (cardObj && startY && touch.clientY < startY - 50) {
                      console.log(`📱 [TOUCH END] Карта сброшена: ${cardObj.image}`);
                      selectHandCard(cardObj);
                      setTimeout(() => playSelectedCard(), 100);
                    }
                  }}
                  style={{
                    marginLeft: index > 0 ? '-50px' : '0',
                    zIndex: isSelected ? 100 : index + 1,
                    cursor: isMyTurn && canPlay ? 'grab' : isMyTurn ? 'pointer' : 'not-allowed',
                    position: 'relative',
                    transition: 'transform 0.2s ease', // ✅ Плавная анимация для touch
                    touchAction: 'none', // ✅ Отключаем стандартное поведение браузера
                  }}
                  onClick={() => {
                    if (!isMyTurn) {
                      showNotification('Сейчас не ваш ход!', 'warning', 2000);
                      return;
                    }
                    
                    // Клик по карте - выбираем её через gameStore
                    const cardObj = typeof card === 'string' 
                      ? { image: cardImage, open: true, id: `card-${index}` }
                      : { ...card, id: card.id || `card-${index}` };
                    
                    console.log(`🎴 [Клик по карте] Игрок кликнул на карту:`, cardObj);
                    selectHandCard(cardObj);
                  }}
                >
                  {/* ✅ НОВОЕ: Используем NFT карту если она есть в колоде */}
                  {nftImageUrl ? (
                    <div style={{ position: 'relative', width: '55px', height: '82px' }}>
                    <img
                      src={nftImageUrl}
                      alt={cardImage}
                      onError={(e) => {
                        console.log('❌ NFT изображение не загрузилось, показываем обычную карту');
                        e.currentTarget.style.display = 'none';
                        const fallbackImg = e.currentTarget.nextSibling as HTMLImageElement;
                        if (fallbackImg) {
                          fallbackImg.style.display = 'block';
                        }
                      }}
                      style={{ 
                        width: '55px',
                        height: '82px',
                        borderRadius: '8px',
                        background: '#ffffff',
                        opacity: 1,
                        filter: canPlay ? 'brightness(1.1)' : 'none',
                        visibility: 'visible',
                        display: 'block',
                        transform: isSelected ? 'translateY(-20px) scale(1.1)' : 'none',
                        transition: 'all 0.3s ease',
                        boxShadow: canPlay ? '0 0 20px rgba(40, 167, 69, 0.6), 0 0 40px rgba(40, 167, 69, 0.3)' : 'none',
                        objectFit: 'contain', // ✅ ИСПРАВЛЕНО: contain вместо cover - карта не обрезается
                      }}
                    />
                      {/* ✅ ОВЕРЛЕЙ РАНГА И МАСТИ НА NFT КАРТЕ */}
                      <div style={{
                        position: 'absolute',
                        top: '2px',
                        left: '3px',
                        fontSize: '10px',
                        fontWeight: 'bold',
                        color: cardSuit === 'hearts' || cardSuit === 'diamonds' ? '#dc2626' : '#1f2937',
                        textShadow: '0 0 2px white, 0 0 2px white',
                        lineHeight: '1',
                        pointerEvents: 'none',
                        transform: isSelected ? 'translateY(-20px)' : 'none',
                        transition: 'transform 0.3s ease'
                      }}>
                                    <div>{(() => {
                                      // ✅ ИСПРАВЛЕНО: Правильное форматирование ранга
                                      const formatRank = (rank: string | number | undefined): string => {
                                        if (!rank) return '';
                                        const rankStr = String(rank).toLowerCase();
                                        const rankNum = typeof rank === 'number' ? rank : parseInt(rankStr, 10);
                                        
                                        if (rankNum === 11 || rankStr === 'jack' || rankStr === 'j') return 'J';
                                        if (rankNum === 12 || rankStr === 'queen' || rankStr === 'q') return 'Q';
                                        if (rankNum === 13 || rankStr === 'king' || rankStr === 'k') return 'K';
                                        if (rankNum === 14 || rankStr === 'ace' || rankStr === 'a') return 'A';
                                        if (rankNum >= 2 && rankNum <= 10) return String(rankNum);
                                        return rankStr.toUpperCase();
                                      };
                                      return formatRank(cardRank);
                                    })()}</div>
                        <div>{cardSuit === 'hearts' ? '♥' : cardSuit === 'diamonds' ? '♦' : cardSuit === 'clubs' ? '♣' : cardSuit === 'spades' ? '♠' : ''}</div>
                      </div>
                    </div>
                  ) : null}
                  <Image
                    src={cardImage.startsWith('http') ? `${CARDS_PATH}${cardRank}_of_${cardSuit}.png` : `${CARDS_PATH}${cardImage}`}
                    alt={cardImage}
                    width={55}
                    height={82}
                    loading="eager"
                    style={{ 
                      borderRadius: '8px',
                      background: '#ffffff',
                      opacity: 1,
                      filter: canPlay ? 'brightness(1.1)' : 'none',
                      visibility: 'visible',
                      display: nftImageUrl ? 'none' : 'block',
                      transform: isSelected ? 'translateY(-20px) scale(1.1)' : 'none',
                      transition: 'all 0.3s ease',
                      boxShadow: canPlay ? '0 0 20px rgba(40, 167, 69, 0.6), 0 0 40px rgba(40, 167, 69, 0.3)' : 'none',
                    }}
                    priority
                  />
                  {canPlay && (
                    <div style={{
                      position: 'absolute',
                      top: '5px',
                      right: '5px',
                      width: '12px',
                      height: '12px',
                      background: '#28a745',
                      borderRadius: '50%',
                      border: '2px solid white',
                      animation: 'pulse 1.5s ease-in-out infinite',
                      zIndex: 10,
                    }}></div>
                  )}
                </div>
              );
            })}
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

      {/* Модальное окно профиля игрока */}
      {/* ✅ МОДАЛКА ПРОФИЛЯ ИГРОКА */}
      {selectedPlayerProfile && (
      <PlayerProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
          player={selectedPlayerProfile}
        />
      )}

      {/* МОДАЛЬНОЕ ОКНО ВЫБОРА КАРТЫ ДЛЯ ШТРАФА */}
      <PenaltyCardSelector />
      
      {/* 🎉 МОДАЛКА ПОБЕДИТЕЛЯ */}
      {showWinnerModal && winnerModalData && (
        <WinnerModal
          playerName={winnerModalData.playerName}
          place={winnerModalData.place}
          avatar={winnerModalData.avatar}
          isCurrentUser={winnerModalData.isCurrentUser}
          onClose={() => {
            useGameStore.setState({
              showWinnerModal: false,
              winnerModalData: null
            });
          }}
          onContinueWatching={() => {
            console.log('👁️ [GamePageContent] Пользователь продолжает просмотр игры');
            
            // ✅ ЗАКРЫВАЕМ МОДАЛКУ
            useGameStore.setState({
              showWinnerModal: false,
              winnerModalData: null
            });
            
            // ✅ ПРОДОЛЖАЕМ ИГРУ! Ищем следующего активного игрока
            const { players } = useGameStore.getState();
            const activePlayers = players.filter(p => !p.isWinner && (p.cards.length > 0 || p.penki.length > 0));
            
            console.log(`🔄 [GamePageContent] После закрытия модалки - активных игроков: ${activePlayers.length}`);
            
            if (activePlayers.length > 1) {
              console.log(`✅ [GamePageContent] Игра продолжается - передаём ход!`);
              nextTurn();
            } else {
              console.log(`🏁 [GamePageContent] Остался 1 или меньше активных игроков - игра закончится`);
            }
          }}
          onExitToMenu={() => {
            console.log('🚪 [GamePageContent] Пользователь выходит в главное меню');
            // ✅ КРИТИЧНО: Сохраняем статистику и перенаправляем в меню
            if (typeof window !== 'undefined') {
              window.location.href = '/';
            }
          }}
        />
      )}
      
      {/* 💀 МОДАЛКА ПРОИГРАВШЕГО */}
      {showLoserModal && loserModalData && (
        <LoserModal
          playerName={loserModalData.playerName}
          avatar={loserModalData.avatar}
          onClose={() => {
            useGameStore.setState({
              showLoserModal: false,
              loserModalData: null
            });
          }}
        />
      )}
      
      {/* 🏆 ФИНАЛЬНАЯ МОДАЛКА РЕЗУЛЬТАТОВ */}
      {showGameResultsModal && gameResults && (
        <GameResultsModal
          results={gameResults}
          isRanked={false}
          onPlayAgain={() => {
            // Закрываем модалку
            useGameStore.setState({
              showGameResultsModal: false,
              gameResults: null
            });
            // Сбрасываем игру
            resetGame();
            // Начинаем новую игру с теми же настройками
            startGame(gameMode);
          }}
          onMainMenu={() => {
            // Закрываем модалку
            useGameStore.setState({
              showGameResultsModal: false,
              gameResults: null
            });
            // Сбрасываем игру
            resetGame();
            // Переходим на главную (можно использовать роутер)
            if (typeof window !== 'undefined') {
              window.location.href = '/';
            }
          }}
        />
      )}
      
      {/* 🗑️ МОДАЛКА ШТРАФНОЙ СТОПКИ */}
      <PenaltyDeckModal
        isOpen={showPenaltyDeckModal}
        onClose={() => togglePenaltyDeckModal(false)}
        penaltyCards={penaltyDeck.map(pc => ({
          playerId: pc.contributorId,
          playerName: pc.contributorName
        }))}
        totalCards={penaltyDeck.length}
        targetPlayerName={
          pendingPenalty
            ? players.find(p => p.id === pendingPenalty.targetPlayerId)?.name || 'Неизвестный'
            : undefined
        }
      />

      {/* ✅ ЖИВЫЕ АНИМИРОВАННЫЕ СТРЕЛКИ НА ИГРОВОМ ПОЛЕ (только в туториале) */}
      {isTutorialActive && !isTutorialPaused && isUserTurn && players.length > 0 && (() => {
        const userIndex = players.findIndex(p => p.isUser);
        if (userIndex < 0) return null;
        const userPos = getPlayerPosition(userIndex, players.length);

        // В 1-й стадии — толстая изогнутая стрелка к доступной цели
        if (gameStage === 1 && availableTargets.length > 0) {
          const targetIdx = availableTargets[0];
          const targetPos = getPlayerPosition(targetIdx, players.length);
          const targetPlayer = players[targetIdx];
          // Контрольная точка для кривой Безье — смещаем вбок для изгиба
          const midX = (userPos.x + targetPos.x) / 2;
          const midY = (userPos.y + targetPos.y) / 2;
          const curveOffset = targetPos.x > userPos.x ? -12 : 12; // изгиб в сторону
          return (
            <svg
              style={{
                position: 'absolute', inset: 0, width: '100%', height: '100%',
                zIndex: 200, pointerEvents: 'none', overflow: 'visible',
              }}
            >
              <defs>
                <marker id="tut-arrowhead" markerWidth="14" markerHeight="12" refX="12" refY="6" orient="auto">
                  <path d="M0,0 L14,6 L0,12 L3,6 Z" fill="#22c55e" />
                </marker>
                <linearGradient id="arrow-grad" x1="0%" y1="100%" x2="0%" y2="0%">
                  <stop offset="0%" stopColor="#22c55e" stopOpacity="0.3" />
                  <stop offset="100%" stopColor="#4ade80" stopOpacity="1" />
                </linearGradient>
                <filter id="tut-glow2">
                  <feGaussianBlur stdDeviation="4" result="blur" />
                  <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
                </filter>
              </defs>
              {/* Толстое свечение-подложка */}
              <path
                d={`M ${userPos.x}% ${userPos.y - 5}% Q ${midX + curveOffset}% ${midY}% ${targetPos.x}% ${targetPos.y + 5}%`}
                stroke="rgba(34,197,94,0.25)" strokeWidth="12" fill="none"
                strokeLinecap="round"
              />
              {/* Основная толстая изогнутая стрелка */}
              <path
                d={`M ${userPos.x}% ${userPos.y - 5}% Q ${midX + curveOffset}% ${midY}% ${targetPos.x}% ${targetPos.y + 5}%`}
                stroke="url(#arrow-grad)" strokeWidth="5" fill="none"
                strokeLinecap="round" markerEnd="url(#tut-arrowhead)"
                filter="url(#tut-glow2)"
              />
              {/* Пульсирующий круг-цель */}
              <circle cx={`${targetPos.x}%`} cy={`${targetPos.y}%`} r="24"
                fill="none" stroke="#4ade80" strokeWidth="2.5" opacity="0.7">
                <animate attributeName="r" values="20;30;20" dur="1.3s" repeatCount="indefinite" />
                <animate attributeName="opacity" values="0.9;0.3;0.9" dur="1.3s" repeatCount="indefinite" />
              </circle>
              {/* Подпись на середине стрелки */}
              <foreignObject
                x={`${midX + curveOffset - 15}%`} y={`${midY - 3}%`}
                width="30%" height="6%"
              >
                <div style={{
                  display: 'flex', justifyContent: 'center', alignItems: 'center',
                  width: '100%', height: '100%',
                }}>
                  <span style={{
                    color: '#fff', fontSize: '11px', fontWeight: '700',
                    background: 'rgba(34,197,94,0.85)', padding: '3px 10px',
                    borderRadius: '8px', whiteSpace: 'nowrap',
                    boxShadow: '0 2px 12px rgba(34,197,94,0.5)',
                  }}>
                    Положи на {targetPlayer?.name || 'соперника'} 👆
                  </span>
                </div>
              </foreignObject>
            </svg>
          );
        }

        // В 2-й стадии — подсказка
        if (gameStage >= 2 && selectedHandCard) {
          return (
            <div style={{
              position: 'absolute', bottom: '22%', left: '50%', transform: 'translateX(-50%)',
              zIndex: 200, pointerEvents: 'none',
            }}>
              <span style={{
                color: '#fff', fontSize: '12px', fontWeight: '700',
                background: 'rgba(34,197,94,0.85)', padding: '6px 14px', borderRadius: '10px',
                boxShadow: '0 4px 16px rgba(34,197,94,0.4)',
              }}>Теперь нажмите на соперника! ⬆️</span>
            </div>
          );
        }

        if (gameStage >= 2 && !selectedHandCard) {
          return (
            <div style={{
              position: 'absolute', bottom: '14%', left: '50%', transform: 'translateX(-50%)',
              zIndex: 200, pointerEvents: 'none',
            }}>
              <span style={{
                color: '#fff', fontSize: '12px', fontWeight: '700',
                background: 'rgba(99,102,241,0.85)', padding: '6px 14px', borderRadius: '10px',
                boxShadow: '0 4px 16px rgba(99,102,241,0.4)',
                animation: 'pulse 2s ease-in-out infinite',
              }}>⬇️ Выберите карту из руки внизу</span>
            </div>
          );
        }

        return null;
      })()}

      {/* Подсказка хода бота — ОБЪЯСНЕНИЕ почему бот кладёт карту */}
      {isTutorialActive && !isTutorialPaused && !isUserTurn && currentPlayerId && players.length > 0 && (() => {
        const activePlayer = players.find(p => p.id === currentPlayerId);
        if (!activePlayer || activePlayer.isUser) return null;
        // Находим позицию бота
        const botIndex = players.findIndex(p => p.id === currentPlayerId);
        const botPos = botIndex >= 0 ? getPlayerPosition(botIndex, players.length) : null;
        // Ищем цель бота (юзер или другой игрок с младшей картой)
        const userPlayer = players.find(p => p.isUser);
        const userTopCard = userPlayer?.cards?.length ? userPlayer.cards[userPlayer.cards.length - 1] : null;
        const botTopCard = activePlayer?.cards?.length ? activePlayer.cards[activePlayer.cards.length - 1] : null;

        return (
          <motion.div
            key={currentPlayerId}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            style={{
              position: 'absolute',
              top: botPos && botPos.y < 30 ? '18%' : '4%',
              left: '50%', transform: 'translateX(-50%)',
              zIndex: 200, pointerEvents: 'none',
              background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.95) 0%, rgba(30, 41, 59, 0.95) 100%)',
              border: '1.5px solid rgba(139, 92, 246, 0.4)',
              borderRadius: '14px', padding: '10px 16px', backdropFilter: 'blur(10px)',
              maxWidth: '300px', textAlign: 'center',
              boxShadow: '0 8px 24px rgba(0,0,0,0.4), 0 0 20px rgba(139,92,246,0.15)',
            }}
          >
            <div style={{ color: '#e2e8f0', fontSize: '12px', fontWeight: '700', marginBottom: '4px' }}>
              🤖 Ходит <span style={{ color: '#a78bfa' }}>{activePlayer.name}</span>
            </div>
            <div style={{ color: '#94a3b8', fontSize: '11px', lineHeight: '1.5' }}>
              {gameStage === 1 ? (
                <>Бот ищет соперника, у которого открытая карта <span style={{ color: '#fbbf24' }}>МЕНЬШЕ</span> его. Если найдёт — положит свою карту сверху. Старшая бьёт младшую!</>
              ) : (
                <>Бот выбирает карту из руки и кладёт на того, у кого карта слабее. Козырь бьёт все некозырные!</>
              )}
            </div>
          </motion.div>
        );
      })()}

      {/* ✅ МОДАЛКА ОБУЧЕНИЯ (ТУТОРИАЛ) - УЛУЧШЕННАЯ С АНИМАЦИЯМИ */}
      {currentStep && (
        <TutorialModal
          isOpen={isTutorialPaused}
          step={currentStep}
          onClose={closeTutorial}
          onNext={nextStep}
          showNext={false}
          totalSteps={totalSteps}
          currentStepIndex={currentStepIndex}
        />
      )}
    </div>
  );
}

export default function GamePageContentWrapper(props: GamePageContentProps) {
  return (
    <ErrorBoundary>
      <GamePageContentComponent {...props} />
    </ErrorBoundary>
  );
}