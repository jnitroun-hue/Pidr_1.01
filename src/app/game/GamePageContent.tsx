'use client'
import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import Image from 'next/image';
import PlayerProfileModal from '../../components/PlayerProfileModal';
import PenaltyCardSelector from '../../components/PenaltyCardSelector';
import WinnerModal from '../../components/WinnerModal';
import LoserModal from '../../components/LoserModal';
import GameResultsModal from '../../components/GameResultsModal';
import PenaltyDeckModal from '../../components/PenaltyDeckModal';
import TutorialModal from '../../components/TutorialModal';
import PremiumAvatarFire from '../../components/PremiumAvatarFire';
import { useTutorial } from '../../hooks/useTutorial';
import styles from './GameTable.module.css';
// Генераторы перенесены в отдельный проект pidr_generators
import { getPremiumTable } from '@/utils/generatePremiumTable';
import { useDragAndDrop } from '@/hooks/useDragAndDrop';
// TableSelector удален - выбор стола больше не нужен
import type { Player as StorePlayer, Card as StoreCard } from '../../store/gameStore';
import { motion, AnimatePresence } from 'framer-motion';
import React from 'react';
import { ErrorBoundary } from '../../components/ErrorBoundary';
import { useGameStore } from '@/store/gameStore';
import { AIPlayer, AIDifficulty } from '@/lib/game/ai-player';
import GameChat from '@/components/GameChat';
import GameWallet from '@/components/GameWallet';
import { useLanguage } from '../../components/LanguageSwitcher';
import { useTranslations } from '../../lib/i18n/translations';
import { useWebSocket } from '@/hooks/useWebSocket';
import { useTelegram } from '@/hooks/useTelegram';
import { getCardAssetSrc, deckEntriesToNftMap, buildNftDeckKey } from '@/lib/game/cardAssets';
import { BOT_TIMING } from '@/lib/game/botTiming';
import { preloadNftCardUrls, preloadStandardCardAssets } from '@/lib/game/preload-card-assets';
import {
  computeCardFanLayout,
  getOpponentStackDisplayCount,
  playingCardHeight,
} from '@/lib/game/card-fan-layout';
import { translateGameText } from '@/lib/i18n/gameRuntimeTranslations';
import { getApiHeaders } from '@/lib/api-headers';
import { loadGameUserProfile } from '@/lib/game/load-game-profile';
import { appConfirm } from '@/lib/app-notice';
import type { TelegramWebAppUser } from '@/types/telegram-webapp';

interface PlayerProfile {
  id: string;
  name: string;
  avatar?: string;
  isBot?: boolean;
  isUser?: boolean;
  level?: number;
  rating?: number;
  gamesPlayed?: number;
  wins?: number;
  winRate?: number;
  bestStreak?: number;
  status?: string;
  joinedDate?: string;
}

type LegacyCardLike = string | (Partial<StoreCard> & { id?: string; image?: string; rank?: number | string; suit?: string });
type TouchCardElement = HTMLDivElement & { __draggedCard?: StoreCard; __touchStartY?: number };
type UserDeckEntry = { rank?: string | number; suit?: string; image_url?: string };

const getTelegramUser = (): TelegramWebAppUser | undefined =>
  typeof window !== 'undefined' ? window.Telegram?.WebApp?.initDataUnsafe?.user : undefined;

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
const CARDS_PATH = '/img/cards/';

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
type PlayerBubbleSource = 'chat' | 'action' | 'system';

const isEmojiOnlyChatText = (text: string) => {
  const trimmed = text.trim();
  if (!trimmed || trimmed.length > 8) return false;
  return !/[a-zA-Zа-яА-Я0-9]/.test(trimmed);
};

const getBubbleToneClass = (type: 'info' | 'warning' | 'success' | 'error') => {
  if (type === 'success') return styles.avatarBubbleSuccess;
  if (type === 'error') return styles.avatarBubbleError;
  if (type === 'warning') return styles.avatarBubbleWarning;
  return styles.avatarBubbleInfo;
};

const getRectanglePosition = (index: number, totalPlayers: number, gameStage: number = 1): { 
  top: string; 
  left: string; 
  cardDirection: 'horizontal' | 'vertical';
  cardOffset: { x: number; y: number };
  side: 'top' | 'bottom' | 'left' | 'right'; // ✅ НОВОЕ: сторона для правильного расположения карт
} => {
  const isMobileViewport =
    typeof window !== 'undefined' ? window.innerWidth <= 768 : false;
  const isStage2Plus = gameStage >= 2;

  // ПОЗИЦИЯ 0: Главный игрок ВНИЗУ ПО ЦЕНТРУ (компактнее на 2+ стадии — рука внизу)
  if (index === 0) {
    return { 
      left: '50%', 
      top: isStage2Plus ? (isMobileViewport ? '74%' : '76%') : '83%',
      cardDirection: 'horizontal',
      cardOffset: { x: 0, y: -40 },
      side: 'bottom'
    };
  }
  
  // ✅ НОВАЯ РАССАДКА В ЗАВИСИМОСТИ ОТ КОЛИЧЕСТВА ИГРОКОВ
  const adjustedIndex = index - 1; // Индекс без главного игрока (0-based)
  const topY = isStage2Plus
    ? (isMobileViewport ? '8%' : '9%')
    : (isMobileViewport ? '11%' : '13%');
  const leftX = isStage2Plus
    ? (isMobileViewport ? '7%' : '9%')
    : (isMobileViewport ? '10%' : '13%');
  const rightX = isStage2Plus
    ? (isMobileViewport ? '93%' : '91%')
    : (isMobileViewport ? '90%' : '87%');
  const topSplitLeft = isStage2Plus
    ? (isMobileViewport ? '26%' : '24%')
    : (isMobileViewport ? '30%' : '28%');
  const topSplitRight = isStage2Plus
    ? (isMobileViewport ? '74%' : '76%')
    : (isMobileViewport ? '70%' : '72%');
  const sideTopY = isStage2Plus
    ? (isMobileViewport ? '26%' : '30%')
    : (isMobileViewport ? '28%' : '32%');
  const sideBottomY = isStage2Plus
    ? (isMobileViewport ? '62%' : '58%')
    : (isMobileViewport ? '66%' : '62%');
  const sideTop7 = isStage2Plus
    ? (isMobileViewport ? '28%' : '32%')
    : (isMobileViewport ? '30%' : '34%');
  const sideBottom7 = isStage2Plus
    ? (isMobileViewport ? '64%' : '60%')
    : (isMobileViewport ? '68%' : '64%');
  
  if (totalPlayers === 4) {
    const positions = [
      { left: '50%', top: topY, cardDirection: 'horizontal' as const, cardOffset: { x: 0, y: 0 }, side: 'top' as const },
      { left: rightX, top: '50%', cardDirection: 'vertical' as const, cardOffset: { x: 0, y: 0 }, side: 'right' as const },
      { left: leftX, top: '50%', cardDirection: 'vertical' as const, cardOffset: { x: 0, y: 0 }, side: 'left' as const },
    ];
    return positions[adjustedIndex] || positions[0];
  }
  
  if (totalPlayers === 5) {
    const positions = [
      { left: topSplitLeft, top: topY, cardDirection: 'horizontal' as const, cardOffset: { x: 0, y: 0 }, side: 'top' as const },
      { left: topSplitRight, top: topY, cardDirection: 'horizontal' as const, cardOffset: { x: 0, y: 0 }, side: 'top' as const },
      { left: rightX, top: '50%', cardDirection: 'vertical' as const, cardOffset: { x: 0, y: 0 }, side: 'right' as const },
      { left: leftX, top: '50%', cardDirection: 'vertical' as const, cardOffset: { x: 0, y: 0 }, side: 'left' as const },
    ];
    return positions[adjustedIndex] || positions[0];
  }
  
  if (totalPlayers === 6) {
    const positions = [
      { left: '50%', top: isStage2Plus ? (isMobileViewport ? '7%' : '8%') : (isMobileViewport ? '10%' : '12%'), cardDirection: 'horizontal' as const, cardOffset: { x: 0, y: 0 }, side: 'top' as const },
      { left: rightX, top: sideTopY, cardDirection: 'vertical' as const, cardOffset: { x: 0, y: 0 }, side: 'right' as const },
      { left: rightX, top: sideBottomY, cardDirection: 'vertical' as const, cardOffset: { x: 0, y: 0 }, side: 'right' as const },
      { left: leftX, top: sideTopY, cardDirection: 'vertical' as const, cardOffset: { x: 0, y: 0 }, side: 'left' as const },
      { left: leftX, top: sideBottomY, cardDirection: 'vertical' as const, cardOffset: { x: 0, y: 0 }, side: 'left' as const },
    ];
    return positions[adjustedIndex] || positions[0];
  }
  
  if (totalPlayers === 7) {
    const positions = [
      { left: topSplitLeft, top: isStage2Plus ? (isMobileViewport ? '7%' : '8%') : (isMobileViewport ? '10%' : '12%'), cardDirection: 'horizontal' as const, cardOffset: { x: 0, y: 0 }, side: 'top' as const },
      { left: topSplitRight, top: isStage2Plus ? (isMobileViewport ? '7%' : '8%') : (isMobileViewport ? '10%' : '12%'), cardDirection: 'horizontal' as const, cardOffset: { x: 0, y: 0 }, side: 'top' as const },
      { left: leftX, top: sideTop7, cardDirection: 'vertical' as const, cardOffset: { x: 0, y: 0 }, side: 'left' as const },
      { left: leftX, top: sideBottom7, cardDirection: 'vertical' as const, cardOffset: { x: 0, y: 0 }, side: 'left' as const },
      { left: rightX, top: sideTop7, cardDirection: 'vertical' as const, cardOffset: { x: 0, y: 0 }, side: 'right' as const },
      { left: rightX, top: sideBottom7, cardDirection: 'vertical' as const, cardOffset: { x: 0, y: 0 }, side: 'right' as const },
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

function getFirstPlayerIdx(players: StorePlayer[]): number {
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
  const tr = (text: string) => translateGameText(text, language);
  
  const { 
    isGameActive, gameMode, gameStage, turnPhase, stage2TurnPhase,
    players, currentPlayerId, deck, availableTargets,
    selectedHandCard, revealedDeckCard, tableStack, trumpSuit,
    oneCardDeclarations, playersWithOneCard, pendingPenalty,
    isGamePaused,
    penaltyDeck, gameCoins, playedCards,
    showPenaltyCardSelection, penaltyCardSelectionPlayerId,
    showWinnerModal, winnerModalData, showLoserModal, loserModalData,
    showGameResultsModal, gameResults,
    showPenaltyDeckModal,
    nftDeckCards: storeNftDeckCards,
    canPlaceOnSelfByRules,
    startGame, endGame, resetGame, setNftDeckCards: patchStoreNftDeck,
    syncLocalUserPremium,
    syncLocalUserProfile,
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
    isPremium?: boolean;
  } | null>(() => {
    const tg = getTelegramUser();
    if (!tg) return null;
    return {
      coins: 0,
      username: tg.username || tg.first_name || 'Игрок',
      telegramId: String(tg.id),
      isPremium: false,
    };
  });
  const [isLoadingUserData, setIsLoadingUserData] = useState(() => !getTelegramUser());

  const applyGameProfile = useCallback(
    (profile: NonNullable<Awaited<ReturnType<typeof loadGameUserProfile>>>) => {
      setUserData({
        coins: profile.coins,
        avatar: profile.avatar,
        username: profile.username,
        telegramId: profile.telegramId,
        isPremium: profile.isPremium,
      });
      syncLocalUserProfile({
        username: profile.username,
        avatar: profile.avatar,
        isPremium: profile.isPremium,
      });
      if (profile.isPremium) syncLocalUserPremium(true);
    },
    [syncLocalUserProfile, syncLocalUserPremium]
  );

  // Текущая открытая карта из колоды (для отображения рядом с колодой)
  const [currentCard, setCurrentCard] = useState<string | null>(null);

  // Модальное окно профиля игрока
  const [selectedPlayerProfile, setSelectedPlayerProfile] = useState<PlayerProfile | null>(null);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [showWalletModal, setShowWalletModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);

  // ✅ СИСТЕМА ОБУЧЕНИЯ: Проверяем первые 3 игры
  const [gamesPlayed, setGamesPlayed] = useState<number | null>(null);
  const [isTutorialGame, setIsTutorialGame] = useState(false);
  const [tutorialGameNumber, setTutorialGameNumber] = useState<number | null>(null);
  const isUserTurn = currentPlayerId && players.find(p => p.id === currentPlayerId)?.isUser || false;
  const userPlayer = players.find(p => p.isUser);
  const userPlayerId = userPlayer?.id || null;

  const gameWalletUserMemo = useMemo(
    () =>
      userData
        ? {
            id: String(userData.telegramId || userPlayerId || ''),
            username: userData.username || 'Игрок',
            firstName: userData.username || 'Игрок',
            coins: userData.coins || 0,
            rating: 0,
          }
        : undefined,
    [userData?.telegramId, userData?.username, userData?.coins, userPlayerId]
  );

  const handleGameWalletBalance = useCallback((newBalance: number) => {
    setUserData(prev => (prev ? { ...prev, coins: newBalance } : prev));
  }, []);
  
  const { 
    currentStep, 
    isTutorialPaused, 
    nextStep, 
    closeTutorial, 
    isTutorialActive,
    totalSteps,
    currentStepIndex,
  } = useTutorial(gameStage, isTutorialGame, tutorialGameNumber, isUserTurn, currentPlayerId, userPlayerId, players, deck.length, playersWithOneCard, pendingPenalty, penaltyDeck, oneCardDeclarations);
  const showTutorialFieldHints = false;

  // ✅ Загружаем количество игр ПЕРЕД началом игры
  useEffect(() => {
    if (isMultiplayer) {
      // Если мультиплеер - отключаем обучение
      console.log('⚠️ [GamePageContent] Туториал отключен:', { isMultiplayer });
      setIsTutorialGame(false);
      setTutorialGameNumber(null);
      return;
    }

    const loadGamesCount = async () => {
      try {
        console.log('📊 [GamePageContent] Загружаем количество игр для обучения...', { userId: user?.id || 'cookie-auth' });
        const headers = new Headers(getApiHeaders());
        if (user?.id) {
          headers.set('x-telegram-id', user.id.toString());
        }

        const response = await fetch('/api/user/bot-games', {
          method: 'GET',
          headers,
          credentials: 'include'
        });
        
        console.log('📥 [GamePageContent] Ответ от /api/user/bot-games:', { status: response.status, ok: response.ok });

        if (response.ok) {
          const data = await response.json();
          if (data.success) {
            const gamesCount = data.gamesPlayed || 0;
            setGamesPlayed(gamesCount);
            
            // Для fresh web/VK cookie-сессии не гасим обучение только из-за отсутствия Telegram user.
            const isNewUser = data.isNewUser !== false;
            const showTutorial = data.showTutorial !== false;
            const isTutorial = (showTutorial || gamesCount === 0) && gamesCount < 3;
            
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
  // const [penaltyTargets, setPenaltyTargets] = useState<StorePlayer[]>([]);
  // const [selectedCards, setSelectedCards] = useState<Record<string, StoreCard>>({});

  // Функция генерации профиля игрока
  const generatePlayerProfile = async (player: StorePlayer): Promise<PlayerProfile> => {
    if (player.isUser) {
      try {
        const profile = await loadGameUserProfile();
        if (profile) {
          applyGameProfile(profile);
          return {
            id: player.id,
            name: profile.username,
            avatar: profile.avatar || player.avatar || '',
            isBot: false,
            isUser: true,
            level: 1,
            rating: 0,
            gamesPlayed: 0,
            wins: 0,
            winRate: 0,
            bestStreak: 0,
            status: profile.isPremium ? '💎 Premium' : '🟢 Online',
            joinedDate: 'Недавно',
          };
        }
      } catch (error: unknown) {
        console.error('❌ [generatePlayerProfile] Ошибка загрузки профиля:', error);
      }

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
  const handlePlayerClick = async (player: StorePlayer) => {
    console.log('👤 [handlePlayerClick] Клик на игрока:', player);
    const profile = await generatePlayerProfile(player);
    console.log('📋 [handlePlayerClick] Сгенерированный профиль:', profile);
    setSelectedPlayerProfile(profile);
    setIsProfileModalOpen(true);
    
    // ✅ СИНХРОНИЗАЦИЯ: Если это текущий пользователь, обновляем данные при открытии модального окна
    if (player.isUser) {
      const syncUserProfile = async () => {
        try {
          const telegramUser = getTelegramUser();
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
              setSelectedPlayerProfile((prev) => prev ? {
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

  // Аватарки из store + профиль (без заглушки player-avatar.svg)
  useEffect(() => {
    if (players.length === 0) return;
    const avatars: Record<string, string> = {};
    players.forEach((player) => {
      if (player.isUser && userData?.avatar) {
        avatars[player.id] = userData.avatar;
      } else if (player.avatar) {
        avatars[player.id] = player.avatar;
      }
    });
    setPlayerAvatars(avatars);
  }, [players, userData?.avatar]);

  useEffect(() => {
    let cancelled = false;
    const fetchUserData = async () => {
      try {
        const profile = await loadGameUserProfile();
        if (cancelled) return;
        if (profile) {
          applyGameProfile(profile);
        } else {
          const telegramUser = getTelegramUser();
          setUserData({
            coins: 0,
            username: telegramUser?.username || telegramUser?.first_name || 'Игрок',
            telegramId: telegramUser?.id?.toString() || '',
            isPremium: false,
          });
        }
      } catch (error) {
        console.error('❌ Ошибка загрузки профиля:', error);
        if (!cancelled) {
          const telegramUser = getTelegramUser();
          setUserData({
            coins: 0,
            username: telegramUser?.username || telegramUser?.first_name || 'Игрок',
            telegramId: telegramUser?.id?.toString() || '',
            isPremium: false,
          });
        }
      } finally {
        if (!cancelled) setIsLoadingUserData(false);
      }
    };
    void fetchUserData();
    return () => {
      cancelled = true;
    };
  }, [applyGameProfile]);

  useEffect(() => {
    if (!userData) return;
    syncLocalUserProfile({
      username: userData.username,
      avatar: userData.avatar,
      isPremium: userData.isPremium,
    });
    if (userData.isPremium) syncLocalUserPremium(true);
  }, [userData, syncLocalUserProfile, syncLocalUserPremium]);

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
        const profile = await loadGameUserProfile();
        if (profile) applyGameProfile(profile);
      } catch (error) {
        console.warn('⚠️ Ошибка синхронизации профиля:', error);
      }
    };

    syncUserData();
    const interval = setInterval(syncUserData, 30000);

    return () => clearInterval(interval);
  }, [applyGameProfile]);

  // ✅ СИНХРОНИЗАЦИЯ ПРОФИЛЯ: Обновляем данные профиля при открытии модального окна
  useEffect(() => {
    if (isProfileModalOpen && selectedPlayerProfile?.isUser) {
      const syncProfileData = async () => {
        try {
          const telegramUser = getTelegramUser();
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
              setSelectedPlayerProfile((prev) => prev ? {
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
          const telegramUser = getTelegramUser();
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

  useEffect(() => {
    preloadStandardCardAssets();
  }, []);

  // ✅ ЗАГРУЗКА NFT КАРТ ИЗ КОЛОДЫ (фон — стандартные PNG уже на столе)
  useEffect(() => {
    const loadNFTDeck = async () => {
      try {
        const response = await fetch('/api/user/deck', {
          method: 'GET',
          headers: {
            ...getApiHeaders(),
            'Cache-Control': 'no-cache',
          },
          credentials: 'include',
          cache: 'no-store',
        });

        if (response.ok) {
          const result = await response.json();
          if (result.success && result.deck) {
            const nftMap = deckEntriesToNftMap(result.deck);
            if (Object.keys(nftMap).length > 0) {
              patchStoreNftDeck(nftMap);
              preloadNftCardUrls(Object.values(nftMap));
            }
          }
        }
      } catch (error: unknown) {
        console.error('❌ Ошибка загрузки NFT колоды:', error);
      }
    };

    void loadNFTDeck();
  }, [patchStoreNftDeck]);

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

  useEffect(() => {
    if (players.length > 0 && !isGameActive) {
      resetGame();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
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
  const canPlaceDeckOnSelf = useMemo(
    () =>
      gameStage === 1 &&
      turnPhase === 'waiting_deck_action' &&
      canPlaceOnSelfByRules &&
      !!revealedDeckCard &&
      currentPlayerId === myPlayer?.id,
    [gameStage, turnPhase, canPlaceOnSelfByRules, revealedDeckCard, currentPlayerId, myPlayer?.id]
  );

  // ✅ ТАЙМЕР ДЕЙСТВИЯ: 15 секунд на действие, обратный отсчёт
  const TURN_ACTION_SECONDS = 15;
  const TURN_OK_THRESHOLD = Math.ceil((TURN_ACTION_SECONDS * 2) / 3);
  const TURN_WARN_THRESHOLD = Math.ceil(TURN_ACTION_SECONDS / 3);
  const [turnTimeLeft, setTurnTimeLeft] = useState(TURN_ACTION_SECONDS);
  const turnTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (turnTimerRef.current) clearInterval(turnTimerRef.current);
    setTurnTimeLeft(TURN_ACTION_SECONDS);
    if (!currentPlayerId || !isGameActive || isTutorialPaused) return;
    turnTimerRef.current = setInterval(() => {
      setTurnTimeLeft(prev => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => { if (turnTimerRef.current) clearInterval(turnTimerRef.current); };
  }, [currentPlayerId, turnPhase, stage2TurnPhase, gameStage, isGameActive, isTutorialPaused]);

  const turnTimerPercent = Math.max(0, (turnTimeLeft / TURN_ACTION_SECONDS) * 100);
  
  // ОТЛАДКА убрана - логи были слишком многословные
  
  // Создаем экземпляры ИИ для ботов
  const [aiPlayers, setAiPlayers] = useState<Map<number, AIPlayer>>(new Map());
  
  // Защита от повторных вызовов AI (race condition protection)
  const aiProcessingRef = useRef<string | null>(null);
  const aiLastProcessingTimeRef = useRef<number | null>(null);
  const botStallGuardRef = useRef<{ key: string; since: number }>({ key: '', since: 0 });
  
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

  const layoutMetrics = useMemo(() => {
    const vw = screenInfo.viewportWidth || 390;
    const vh = screenInfo.viewportHeight || 844;

    const base = (handW: number, oppW: number, handFanMax: number, oppFanMax: number) => ({
      handCardWidth: handW,
      handCardHeight: playingCardHeight(handW),
      handMaxFanWidth: handFanMax,
      opponentCardWidth: oppW,
      opponentCardHeight: playingCardHeight(oppW),
      opponentMaxFanWidth: oppFanMax,
    });

    if (vw >= 1400) {
      return {
        ...base(92, 54, Math.min(vw * 0.55, 820), 118),
        centerCardWidth: 82,
        centerCardHeight: 120,
        revealedCardWidth: 58,
        revealedCardHeight: 86,
        tableStackOffset: 28,
        tableStackMinWidth: 260,
        tableStackMinHeight: 146,
      };
    }

    if (vw >= 1024) {
      return {
        ...base(86, 50, Math.min(vw * 0.58, 760), 110),
        centerCardWidth: 76,
        centerCardHeight: 114,
        revealedCardWidth: 54,
        revealedCardHeight: 81,
        tableStackOffset: 26,
        tableStackMinWidth: 238,
        tableStackMinHeight: 136,
      };
    }

    if (vw >= 769) {
      return {
        ...base(78, 46, Math.min(vw * 0.62, 680), 102),
        centerCardWidth: 68,
        centerCardHeight: 102,
        revealedCardWidth: 48,
        revealedCardHeight: 72,
        tableStackOffset: 22,
        tableStackMinWidth: 214,
        tableStackMinHeight: 124,
      };
    }

    if (screenInfo.isLandscape && vh <= 500) {
      return {
        ...base(58, 34, Math.min(vw * 0.88, 520), 72),
        centerCardWidth: 50,
        centerCardHeight: 75,
        revealedCardWidth: 38,
        revealedCardHeight: 57,
        tableStackOffset: 16,
        tableStackMinWidth: 170,
        tableStackMinHeight: 92,
      };
    }

    if (screenInfo.isVerySmallMobile) {
      return {
        ...base(54, 32, Math.min(vw * 0.94, 360), 68),
        centerCardWidth: 48,
        centerCardHeight: 72,
        revealedCardWidth: 36,
        revealedCardHeight: 54,
        tableStackOffset: 15,
        tableStackMinWidth: 162,
        tableStackMinHeight: 88,
      };
    }

    if (screenInfo.isSmallMobile) {
      return {
        ...base(62, 36, Math.min(vw * 0.92, 400), 74),
        centerCardWidth: 54,
        centerCardHeight: 81,
        revealedCardWidth: 38,
        revealedCardHeight: 57,
        tableStackOffset: 18,
        tableStackMinWidth: 176,
        tableStackMinHeight: 96,
      };
    }

    return {
      ...base(68, 38, Math.min(vw * 0.92, 420), 80),
      centerCardWidth: 60,
      centerCardHeight: 90,
      revealedCardWidth: 42,
      revealedCardHeight: 63,
      tableStackOffset: 20,
      tableStackMinWidth: 192,
      tableStackMinHeight: 104,
    };
  }, [screenInfo]);

  const myHandFan = useMemo(() => {
    const count = myPlayer?.cards.length ?? 0;
    if (!count) return null;
    const minPeek = (screenInfo.viewportWidth || 390) >= 769 ? 24 : 18;
    return computeCardFanLayout({
      cardWidth: layoutMetrics.handCardWidth,
      cardCount: count,
      maxFanWidth: layoutMetrics.handMaxFanWidth,
      minPeekPx: minPeek,
    });
  }, [myPlayer?.cards.length, layoutMetrics, screenInfo.viewportWidth]);

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

    if (isTutorialPaused) {
      aiProcessingRef.current = null;
      aiLastProcessingTimeRef.current = null;
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
              const { makeMove, players: livePlayers } = useGameStore.getState();
              const target = livePlayers[decision.targetPlayerId as number];
              if (makeMove && target) makeMove(target.id);
            }
            break;
          case 'place_on_self':
            if (placeCardOnSelfByRules) placeCardOnSelfByRules();
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
                      }, BOT_TIMING.aiErrorRecovery);
                    }
                  }, BOT_TIMING.aiPlayAfterSelect);
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
                    }, BOT_TIMING.aiPlayAfterSelect);
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
    const delay = (gameStage === 2 || gameStage === 3) ? BOT_TIMING.aiEntryDelayStage23 : BOT_TIMING.aiEntryDelayStage1;
    const timeoutId = setTimeout(makeAIMove, delay);
    
    return () => {
      clearTimeout(timeoutId);
      // Сбрасываем флаг при очистке useEffect
      aiProcessingRef.current = null;
    };
  }, [isGameActive, currentPlayerId, gameStage, stage2TurnPhase, turnPhase, pendingPenalty, isGamePaused, isTutorialPaused]);

  // Защита от зависания раунда, когда бот "застревает" в фазе хода.
  useEffect(() => {
    if (!isGameActive || !currentPlayerId || (gameStage !== 2 && gameStage !== 3)) {
      botStallGuardRef.current = { key: '', since: 0 };
      return;
    }

    if (isTutorialPaused || isGamePaused || pendingPenalty) {
      botStallGuardRef.current = { key: '', since: 0 };
      return;
    }

    const currentTurnPlayer = players.find(p => p.id === currentPlayerId);
    if (!currentTurnPlayer?.isBot) {
      botStallGuardRef.current = { key: '', since: 0 };
      return;
    }

    const stallKey = `${currentPlayerId}:${stage2TurnPhase}:${tableStack.length}`;
    const now = Date.now();

    if (botStallGuardRef.current.key !== stallKey) {
      botStallGuardRef.current = { key: stallKey, since: now };
      return;
    }

    const stalledFor = now - botStallGuardRef.current.since;
    if (stalledFor < 7000) return;

    console.warn(`⚠️ [BotStallGuard] Обнаружено зависание у ${currentTurnPlayer.name} (${stage2TurnPhase}), восстановление...`);
    const state = useGameStore.getState();

    if (state.currentPlayerId !== currentPlayerId || !state.isGameActive) {
      botStallGuardRef.current = { key: '', since: 0 };
      return;
    }

    if (state.stage2TurnPhase === 'card_selected') {
      useGameStore.setState({ stage2TurnPhase: 'selecting_card', selectedHandCard: null });
      state.processPlayerTurn(currentPlayerId);
    } else {
      state.processPlayerTurn(currentPlayerId);
      setTimeout(() => {
        const fresh = useGameStore.getState();
        if (fresh.currentPlayerId === currentPlayerId && (fresh.stage2TurnPhase === stage2TurnPhase)) {
          fresh.nextTurn();
        }
      }, 1200);
    }

    botStallGuardRef.current = { key: '', since: 0 };
  }, [isGameActive, currentPlayerId, gameStage, stage2TurnPhase, tableStack.length, players, isTutorialPaused, isGamePaused, pendingPenalty]);
  
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

  // Эффект для автоматической раздачи карт при старте игры
  useEffect(() => {
    if (isGameActive && !dealt) {
      setDealt(true);
    }
  }, [isGameActive, dealt]);

  // Запуск игры
  const handleStartGame = async () => {
    console.log('🎮 [handleStartGame] Запуск новой игры с ботами');

    const profile = await loadGameUserProfile();
    const actualUsername = profile?.username || userData?.username;
    const actualAvatar = profile?.avatar || userData?.avatar;
    const actualPremium = profile?.isPremium ?? userData?.isPremium;
    if (profile) applyGameProfile(profile);
    
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
      username: actualUsername || 'Игрок',
      isPremium: actualPremium,
    });
    
    // Помечаем, что игра инициализирована
    setTimeout(() => {
      setGameInitialized(true);
      console.log('✅ [handleStartGame] Игра инициализирована');
    }, 100);
  };

  // НОВЫЕ ФУНКЦИИ для кнопок подсчета карт
  
  // НОВЫЙ STATE для сообщений над игроками
  const [playerMessages, setPlayerMessages] = useState<{[playerId: string]: {text: string; type: 'info' | 'warning' | 'success' | 'error'; source: PlayerBubbleSource; timestamp: number}}>({});
  
  // STATE для задержки показа кнопки "Сколько карт?"
  const [showAskCardsButton, setShowAskCardsButton] = useState(false);
  const [lastPlayersWithOneCardUpdate, setLastPlayersWithOneCardUpdate] = useState<string[]>([]);

  // Сообщения действий (Одна карта, Сколько карт) — синхрон с чатом
  const [chatActionMessages, setChatActionMessages] = useState<Array<{id: string; playerId: string; playerName: string; text: string; timestamp: number; type: 'message'}>>([]);

  // Показать сообщение над конкретным игроком
  const showPlayerMessage = (
    playerId: string,
    text: string,
    type: 'info' | 'warning' | 'success' | 'error' = 'info',
    duration: number = 3000,
    source: PlayerBubbleSource = 'system'
  ) => {
    setPlayerMessages(prev => ({
      ...prev,
      [playerId]: { text, type, source, timestamp: Date.now() }
    }));
    
    const hideAfter = source === 'chat' ? Math.max(duration, 5000) : duration;
    setTimeout(() => {
      setPlayerMessages(prev => {
        const newMessages = { ...prev };
        delete newMessages[playerId];
        return newMessages;
      });
    }, hideAfter);
  };

  // Callback: действия игроков/ботов (Одна карта, Сколько карт) — компактный пузырь
  useEffect(() => {
    const handler = (playerId: string, playerName: string, text: string, type: 'info' | 'warning' | 'success' | 'error') => {
      showPlayerMessage(playerId, text, type, 4000, 'action');
      setChatActionMessages(prev => [...prev, {
        id: `act-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        playerId,
        playerName,
        text,
        timestamp: Date.now(),
        type: 'message'
      }]);
    };
    useGameStore.getState().setOnPlayerActionDisplay(handler);
    return () => { useGameStore.getState().setOnPlayerActionDisplay(null); };
  }, [players.length]); // showPlayerMessage стабильна

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

  // Автоматически запускаем игру если она не активна
  useEffect(() => {
    if (!gameInitialized && !isLoadingUserData && userData) {
      console.log('🎮 [AUTOSTART] Запускаем игру автоматически...');

      const profilePayload = {
        avatar: userData.avatar,
        username: userData.username,
        isPremium: userData.isPremium,
      };

      if (isMultiplayer && multiplayerData) {
        let cancelled = false;

        void (async () => {
          const multiplayerConfig: {
            roomId: string;
            roomCode: string;
            isHost: boolean;
            roomPlayers?: Array<{
              id: string;
              name: string;
              avatar?: string | null;
              isBot: boolean;
              position: number;
              isUser?: boolean;
            }>;
          } = {
            roomId: multiplayerData.roomId,
            roomCode: multiplayerData.roomCode,
            isHost: multiplayerData.isHost,
          };

          let tableSize = playerCount;

          try {
            const response = await fetch(`/api/rooms/${multiplayerData.roomId}/players`, {
              method: 'GET',
              credentials: 'include',
              headers: getApiHeaders(),
              cache: 'no-store',
            });

            if (response.ok) {
              const data = await response.json();
              if (data.success && Array.isArray(data.players) && data.players.length > 0) {
                const myIds = new Set(
                  [userData.telegramId, userPlayerId]
                    .filter((value) => value != null && String(value).trim() !== '')
                    .map(String)
                );

                const roomPlayers = data.players.map((player: {
                  user_id: string | number;
                  db_user_id?: number | null;
                  username?: string;
                  avatar_url?: string | null;
                  is_bot?: boolean;
                  position?: number;
                }) => {
                  const publicId = String(player.user_id);
                  const dbId =
                    player.db_user_id != null ? String(player.db_user_id) : '';
                  const isBot =
                    player.is_bot === true || Number(publicId) < 0;
                  const isUser =
                    myIds.has(publicId) || (dbId !== '' && myIds.has(dbId));

                  return {
                    id: publicId,
                    name: player.username || (isBot ? 'Бот' : 'Игрок'),
                    avatar: player.avatar_url,
                    isBot,
                    position: player.position ?? 0,
                    isUser,
                  };
                });

                multiplayerConfig.roomPlayers = roomPlayers;
                tableSize = roomPlayers.length;
                console.log(
                  `🎮 [AUTOSTART] Загружено игроков комнаты: ${tableSize}`,
                  roomPlayers
                );
              }
            }
          } catch (error) {
            console.warn('⚠️ [AUTOSTART] Не удалось загрузить игроков комнаты:', error);
          }

          if (cancelled) return;

          await startGame('multiplayer', tableSize, multiplayerConfig, profilePayload);
          setGameInitialized(true);
        })();

        return () => {
          cancelled = true;
        };
      }

      void startGame('single', playerCount, null, profilePayload).then(() => {
        setGameInitialized(true);
      });
    }
  }, [gameInitialized, isLoadingUserData, isMultiplayer, multiplayerData, playerCount, startGame, userData, userPlayerId]);

  // Вычисляемые значения для UI
  const canDrawCard = turnPhase === 'deck_card_revealed' && currentTurnPlayer?.id === currentPlayerId;
  const canClickDeck = turnPhase === 'showing_deck_hint' && currentTurnPlayer?.id === currentPlayerId;
  const waitingForTarget = turnPhase === 'waiting_target_selection' || turnPhase === 'analyzing_hand';

  const adaptiveSeatPositions = useMemo(() => {
    const totalPlayers = players.length;
    if (!totalPlayers) return [] as Array<{ x: number; y: number; side: 'top' | 'bottom' | 'left' | 'right'; cardOffset: { x: number; y: number } }>;

    const isMobileViewport = typeof window !== 'undefined' ? window.innerWidth <= 768 : false;
    const isStage2Plus = gameStage >= 2;
    const minGap = isMobileViewport ? (isStage2Plus ? 18 : 20) : (isStage2Plus ? 14 : 16);
    const sideClamp = isMobileViewport
      ? (isStage2Plus ? { minY: 14, maxY: 68, minX: 8, maxX: 92 } : { minY: 20, maxY: 72, minX: 18, maxX: 82 })
      : (isStage2Plus ? { minY: 12, maxY: 66, minX: 6, maxX: 94 } : { minY: 18, maxY: 74, minX: 16, maxX: 84 });

    const base = Array.from({ length: totalPlayers }, (_, i) => {
      const rectPos = getRectanglePosition(i, totalPlayers, gameStage);
      return {
        x: parseFloat(rectPos.left),
        y: parseFloat(rectPos.top),
        side: rectPos.side,
        cardOffset: rectPos.cardOffset
      };
    });

    const adjusted = [...base];

    const spreadAxis = (indexes: number[], axis: 'x' | 'y', min: number, max: number) => {
      if (indexes.length <= 1) return;

      const sorted = [...indexes].sort((a, b) => adjusted[a][axis] - adjusted[b][axis]);
      for (let i = 1; i < sorted.length; i++) {
        const prevIndex = sorted[i - 1];
        const currentIndex = sorted[i];
        if (adjusted[currentIndex][axis] - adjusted[prevIndex][axis] < minGap) {
          adjusted[currentIndex][axis] = adjusted[prevIndex][axis] + minGap;
        }
      }

      // Если вышли за пределы — сдвигаем всю группу назад в диапазон
      const lastIndex = sorted[sorted.length - 1];
      if (adjusted[lastIndex][axis] > max) {
        const overflow = adjusted[lastIndex][axis] - max;
        sorted.forEach((idx) => {
          adjusted[idx][axis] -= overflow;
        });
      }

      const firstIndex = sorted[0];
      if (adjusted[firstIndex][axis] < min) {
        const underflow = min - adjusted[firstIndex][axis];
        sorted.forEach((idx) => {
          adjusted[idx][axis] += underflow;
        });
      }

      sorted.forEach((idx) => {
        adjusted[idx][axis] = Math.max(min, Math.min(max, adjusted[idx][axis]));
      });
    };

    const leftPlayers: number[] = [];
    const rightPlayers: number[] = [];
    const topPlayers: number[] = [];
    const bottomPlayers: number[] = [];

    adjusted.forEach((pos, idx) => {
      if (pos.side === 'left') leftPlayers.push(idx);
      if (pos.side === 'right') rightPlayers.push(idx);
      if (pos.side === 'top') topPlayers.push(idx);
      if (pos.side === 'bottom' && idx !== 0) bottomPlayers.push(idx);
    });

    spreadAxis(leftPlayers, 'y', sideClamp.minY, sideClamp.maxY);
    spreadAxis(rightPlayers, 'y', sideClamp.minY, sideClamp.maxY);
    spreadAxis(topPlayers, 'x', sideClamp.minX, sideClamp.maxX);
    spreadAxis(bottomPlayers, 'x', sideClamp.minX, sideClamp.maxX);

    return adjusted;
  }, [players.length, gameStage]);

  // ✅ ИСПРАВЛЕНО: Используем getRectanglePosition с передачей gameStage
  const getPlayerPosition = (index: number, totalPlayers: number) => {
    const adaptive = adaptiveSeatPositions[index];
    if (adaptive && totalPlayers === players.length) {
      return adaptive;
    }
    const rectPos = getRectanglePosition(index, totalPlayers, gameStage);
    return {
      x: parseFloat(rectPos.left),
      y: parseFloat(rectPos.top),
      side: rectPos.side, // ✅ НОВОЕ: сторона для правильного расположения карт
      cardOffset: rectPos.cardOffset // ✅ ИСПРАВЛЕНО: Добавляем cardOffset для позиционирования карт
    };
  };

  const getHintAnchor = (position: { x: number; y: number; side: 'top' | 'bottom' | 'left' | 'right' }) => {
    switch (position.side) {
      case 'top':
        return { x: position.x, y: position.y + 13 };
      case 'bottom':
        return { x: position.x, y: position.y - 10 };
      case 'left':
        return { x: position.x + 8, y: position.y + 8 };
      case 'right':
        return { x: position.x - 8, y: position.y + 8 };
      default:
        return { x: position.x, y: position.y };
    }
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
                <div className={styles.menuUserAvatar} style={{ overflow: userData?.isPremium ? 'visible' : 'hidden' }}>
                  <PremiumAvatarFire size={40} active={!!userData?.isPremium}>
                    {userData?.avatar ? (
                      <img
                        src={userData.avatar}
                        alt="Avatar"
                        className={styles.menuAvatarImage}
                      />
                    ) : (
                      <span className={styles.menuAvatarPlaceholder}>👤</span>
                    )}
                  </PremiumAvatarFire>
                </div>
                <div className={styles.menuUserInfo}>
                  <div className={styles.menuUserName}>{userData?.username || t.mainMenu.player}</div>
                  <div className={styles.menuUserCoins}>
                    <div className={styles.coinAnimated}></div>
                    <span className={styles.menuCoinsValue}>{userData?.coins || 0}</span>
                  </div>
                </div>
              </div>
              
              <div className={styles.menuDivider}></div>

              <button type="button" className={styles.menuItem} onClick={() => setShowProfileModal(true)}>
                👤 {t.mainMenu.gameBurgerProfile}
              </button>
              <button type="button" className={styles.menuItem} onClick={() => setShowWalletModal(true)}>
                💰 {t.mainMenu.gameBurgerWallet}
              </button>
              
              <div className={styles.menuDivider}></div>
              
              <button type="button" className={styles.menuItem} onClick={() => typeof window !== 'undefined' && window.history.back()}>
                🏠 {t.game.home}
              </button>
              <button type="button" className={styles.menuItem} onClick={() => {
                void appConfirm(t.game.confirmQuitGame, { destructive: true, confirmText: t.game.leaveGame || 'Выйти' }).then((confirmed) => {
                  if (confirmed) {
                    endGame();
                    typeof window !== 'undefined' && window.history.back();
                  }
                });
              }}>
                🚪 {t.game.leaveGame}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 🎮 ИГРОВОЙ СТОЛ И КАРТЫ */}
      {players.length > 0 && (
        <div className={styles.tableWrapper}>
          {/* Прямоугольный стол */}
          <div className={`${styles.rectangularTable} ${gameStage >= 2 ? styles.stage2TableLayout : ''}`}>
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
                minWidth: `${layoutMetrics.tableStackMinWidth}px`,
                minHeight: `${layoutMetrics.tableStackMinHeight}px`
              }}>
                {tableStack.map((card, idx) => {
                  // ГОРИЗОНТАЛЬНАЯ СТОПКА: Каждая следующая карта смещается ВПРАВО
                  // Левая карта = нижняя (первая), правая карта = верхняя (последняя)
                  const offset = idx * layoutMetrics.tableStackOffset;
                  const isTopCard = idx === tableStack.length - 1;
                  
                  // ✅ ИСПРАВЛЕНО: Проверяем является ли card.image NFT URL
                  const cardImg = card.image || 'card_back.png';
                  const tableCardRank = String(card.rank || '').toLowerCase();
                  const tableCardSuit = String(card.suit || '').toLowerCase();
                  const isNftUrl = cardImg.startsWith('http://') || cardImg.startsWith('https://');
                  const tableCardSrc = isNftUrl
                    ? cardImg
                    : getCardAssetSrc({ image: cardImg, rank: tableCardRank, suit: tableCardSuit });
                  
                  return (
                    <div 
                      key={card.id || `table-${tableCardSuit}-${tableCardRank}-${idx}`} // ✅ СТАБИЛЬНЫЙ КЛЮЧ 
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
                        <div style={{ position: 'relative', width: `${layoutMetrics.centerCardWidth}px`, height: `${layoutMetrics.centerCardHeight}px` }}>
                          <img
                            src={tableCardSrc}
                            alt={`Card ${idx + 1}`}
                            style={{ 
                              width: `${layoutMetrics.centerCardWidth}px`,
                              height: `${layoutMetrics.centerCardHeight}px`,
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
                        <img
                          src={tableCardSrc}
                          alt={`Card ${idx + 1}`}
                          width={layoutMetrics.centerCardWidth}
                          height={layoutMetrics.centerCardHeight}
                          style={{
                            width: `${layoutMetrics.centerCardWidth}px`,
                            height: `${layoutMetrics.centerCardHeight}px`,
                            borderRadius: '6px',
                            display: 'block',
                            objectFit: 'cover'
                          }}
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
                  // Парсим ранг и масть для оверлея
                  let deckCardRank = '';
                  let deckCardSuit = '';
                  const isNftUrl = currentCard.startsWith('http://') || currentCard.startsWith('https://');
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
                  const cardSrc = isNftUrl
                    ? currentCard
                    : getCardAssetSrc({ image: currentCard, rank: deckCardRank, suit: deckCardSuit });
                  
                  return (
                  <div 
                    style={{ 
                      position: 'relative',
                      background: '#ffffff',
                      borderRadius: '4px',
                      padding: '1px',
                      boxShadow: turnPhase === 'waiting_deck_action' 
                        ? '0 0 30px rgba(99, 102, 241, 0.8), 0 0 50px rgba(99, 102, 241, 0.5)' 
                        : '0 0 20px rgba(255, 255, 255, 0.3), 0 4px 12px rgba(0,0,0,0.4)',
                      border: canPlaceDeckOnSelf
                        ? '2px solid rgba(34, 197, 94, 0.85)'
                        : '2px solid #e2e8f0',
                      animation: turnPhase === 'waiting_deck_action' ? 'pulse 2s ease-in-out infinite' : 'none',
                      cursor: (turnPhase === 'waiting_deck_action' && (availableTargets.length > 0 || canPlaceDeckOnSelf)) ? 'pointer' : 'default',
                      transition: 'transform 0.2s ease'
                    }}
                    onClick={() => {
                      if (currentPlayerId !== myPlayer?.id || turnPhase !== 'waiting_deck_action') return;
                      if (canPlaceDeckOnSelf && availableTargets.length === 0) {
                        placeCardOnSelfByRules();
                        return;
                      }
                      if (availableTargets.length === 1) {
                        const targetPlayer = players[availableTargets[0]];
                        makeMove(targetPlayer?.id || '');
                      }
                    }}
                    onMouseEnter={(e) => {
                      if (turnPhase === 'waiting_deck_action' && (availableTargets.length > 0 || canPlaceDeckOnSelf)) {
                        e.currentTarget.style.transform = 'scale(1.08)';
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
                          width: `${layoutMetrics.revealedCardWidth}px`,
                          height: `${layoutMetrics.revealedCardHeight}px`,
                          borderRadius: '3px',
                          opacity: 1,
                          filter: 'none',
                          visibility: 'visible',
                          display: 'block',
                          objectFit: 'contain'
                        }}
                      />
                    ) : (
                      <img
                        src={cardSrc}
                        alt="Current Card"
                        width={layoutMetrics.revealedCardWidth}
                        height={layoutMetrics.revealedCardHeight}
                        style={{
                          width: `${layoutMetrics.revealedCardWidth}px`,
                          height: `${layoutMetrics.revealedCardHeight}px`,
                          borderRadius: '3px',
                          opacity: 1,
                          filter: 'none',
                          visibility: 'visible',
                          display: 'block',
                          objectFit: 'contain'
                        }}
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
                          top: '4px',
                          left: '5px',
                          fontSize: '11px',
                          fontWeight: 'bold',
                          color: deckCardSuit === 'hearts' || deckCardSuit === 'diamonds' ? '#dc2626' : '#1f2937',
                          textShadow: '0 0 3px white, 0 0 3px white, 0 1px 2px white',
                        lineHeight: '1.1',
                        pointerEvents: 'none'
                      }}>
                        <div>{formatRank(deckCardRank)}</div>
                        <div>{deckCardSuit === 'hearts' ? '♥' : deckCardSuit === 'diamonds' ? '♦' : deckCardSuit === 'clubs' ? '♣' : deckCardSuit === 'spades' ? '♠' : ''}</div>
                      </div>
                      );
                    })()}
                    {turnPhase === 'waiting_deck_action' && (availableTargets.length > 0 || canPlaceDeckOnSelf) && (
                      <div style={{
                        position: 'absolute',
                        top: '-8px',
                        right: '-8px',
                        background: canPlaceDeckOnSelf && availableTargets.length === 0 ? '#22c55e' : '#10b981',
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
                        {canPlaceDeckOnSelf && availableTargets.length === 0 ? '↓' : '✓'}
                      </div>
                    )}
                    {canPlaceDeckOnSelf && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          placeCardOnSelfByRules();
                        }}
                        style={{
                          position: 'absolute',
                          left: '50%',
                          bottom: '-34px',
                          transform: 'translateX(-50%)',
                          whiteSpace: 'nowrap',
                          padding: '5px 10px',
                          borderRadius: '8px',
                          border: '1px solid rgba(34, 197, 94, 0.65)',
                          background: 'rgba(34, 197, 94, 0.92)',
                          color: '#fff',
                          fontSize: '10px',
                          fontWeight: 800,
                          cursor: 'pointer',
                          boxShadow: '0 4px 12px rgba(34, 197, 94, 0.35)',
                          zIndex: 20,
                        }}
                      >
                        Положить на себя (+1)
                      </button>
                    )}
                  </div>
                  );
                })()}
                
                {/* Колода (справа, уменьшена на 60%) */}
                <div 
                  style={{ 
                    position: 'relative',
                    cursor: (currentPlayerId === myPlayer?.id && turnPhase === 'showing_deck_hint') ? 'pointer' : 'default',
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
                    if (currentPlayerId === myPlayer?.id && turnPhase === 'showing_deck_hint') {
                      console.log('🎴 [КЛИК НА КОЛОДУ] Игрок кликнул на колоду');
                      onDeckClick();
                    } else if (currentPlayerId !== myPlayer?.id) {
                      console.log('⛔ [КЛИК НА КОЛОДУ] Сейчас не ваш ход');
                    } else if (turnPhase === 'waiting_deck_action') {
                      showNotification('Сначала положите открытую карту на себя или на соперника', 'warning', 2500);
                    } else {
                      showNotification('Сначала попробуйте сходить из руки!', 'warning', 2000);
                    }
                  }}
                  onMouseEnter={(e) => {
                    if (currentPlayerId === myPlayer?.id && turnPhase === 'showing_deck_hint') {
                      e.currentTarget.style.transform = 'scale(1.15)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'scale(1)';
                  }}
                >
                  <img
                    src={getCardAssetSrc({ faceDown: true })}
                    alt="Deck"
                    width={36}
                    height={54}
                    className={styles.deckCard}
                    style={{
                      width: '36px',
                      height: '54px',
                      opacity: 1,
                      filter: 'none',
                      visibility: 'visible',
                      display: 'block'
                    }}
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
              const isMyTurnGlobal = currentPlayerId === myPlayer?.id;
              const canPickStage1Target = gameStage === 1 && isMyTurnGlobal &&
                (turnPhase === 'analyzing_hand' || turnPhase === 'waiting_target_selection');
              const isStage1Target = !isHumanPlayer && canPickStage1Target && availableTargets.includes(index);
              
              // Расположение карт — всегда снизу аватара (столбик)

                return (
                  <div
                  key={player.id}
                  className={`${styles.playerSeat} ${isCurrentTurn ? styles.activePlayer : ''} ${isHumanPlayer && gameStage >= 2 ? styles.userSeatCompact : ''}`}
                    style={{
                    left: `${position.x}%`,
                    top: `${position.y}%`,
                    flexDirection: 'column',
                    backdropFilter: 'blur(8px)',
                  }}
                >
                  {/* Таймер-бар вокруг контейнера активного игрока */}
                  {isCurrentTurn && (
                    <div style={{
                      position: 'absolute', inset: '-3px', borderRadius: 'inherit', zIndex: -1, pointerEvents: 'none',
                      background: `conic-gradient(${turnTimeLeft > TURN_OK_THRESHOLD ? '#22c55e' : turnTimeLeft > TURN_WARN_THRESHOLD ? '#eab308' : '#ef4444'} ${turnTimerPercent}%, transparent ${turnTimerPercent}%)`,
                      WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
                      WebkitMaskComposite: 'xor',
                      maskComposite: 'exclude' as React.CSSProperties['maskComposite'],
                      padding: '3px',
                      transition: 'background 1s linear',
                    }} />
                  )}
                  {/* ✅ АВАТАР СВЕРХУ, КАРТЫ СНИЗУ ДЛЯ ВСЕХ ИГРОКОВ */}
                    <div className={styles.avatarWrap} style={{ order: 1, overflow: player.isPremium ? 'visible' : undefined }}>
                      {/* Сообщение над игроком (как в чате) */}
                      {playerMessages[player.id] && (() => {
                        const msg = playerMessages[player.id];
                        const isChatBubble = msg.source === 'chat';
                        const isEmojiBubble = isChatBubble && isEmojiOnlyChatText(msg.text);
                        return (
                        <div className={[
                          styles.avatarBubble,
                          getBubbleToneClass(msg.type),
                          isChatBubble ? styles.avatarBubbleChat : styles.avatarBubbleAction,
                          isEmojiBubble ? styles.avatarBubbleChatEmoji : '',
                        ].filter(Boolean).join(' ')}>
                          {msg.text}
                          <div className={styles.avatarBubbleArrow} />
                        </div>
                        );
                      })()}
                      
                      {/* ✅ ТОЛЬКО АВАТАР ВО ВЕСЬ КОНТЕЙНЕР - ПРИ КЛИКЕ МОДАЛКА */}
                      <div 
                        className={`${styles.avatarContainer} ${isStage1Target ? styles.avatarTargetable : ''}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (isStage1Target) {
                            makeMove(player.id);
                            return;
                          }
                          handlePlayerClick(player);
                        }}
                        style={{ 
                          cursor: isStage1Target ? 'pointer' : 'pointer',
                          width: '100%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          overflow: player.isPremium ? 'visible' : 'hidden',
                          position: 'relative'
                        }}
                      >
                        {/* Пульсирующее кольцо вокруг активного игрока */}
                        {isCurrentTurn && (
                          <>
                            <div style={{
                              position: 'absolute', inset: '-6px', borderRadius: '50%',
                              border: '3px solid #22c55e',
                              animation: 'avatarPulseRing 1.2s ease-in-out infinite',
                              zIndex: 4, pointerEvents: 'none',
                            }} />
                            <div style={{
                              position: 'absolute', inset: '-10px', borderRadius: '50%',
                              border: '2px solid rgba(34,197,94,0.3)',
                              animation: 'avatarPulseRing 1.2s ease-in-out infinite 0.3s',
                              zIndex: 3, pointerEvents: 'none',
                            }} />
                          </>
                        )}
                        <PremiumAvatarFire size={28} active={!!player.isPremium}>
                        <img 
                        src={playerAvatars[player.id] || player.avatar || '/img/player-avatar.svg'}
                        alt={player.name}
                            className={styles.avatar}
                          style={{
                            width: '28px',
                            height: '28px',
                            borderRadius: '50%',
                            boxShadow: isCurrentTurn 
                              ? '0 0 15px rgba(34, 197, 94, 1), 0 0 30px rgba(34, 197, 94, 0.6), 0 0 45px rgba(34, 197, 94, 0.3)'
                              : player.isPremium
                                ? '0 0 10px rgba(56, 189, 248, 0.8)'
                                : '0 1px 4px rgba(0, 0, 0, 0.3)',
                            border: `${isCurrentTurn ? '3px' : '1px'} solid ${isCurrentTurn ? '#22c55e' : player.isPremium ? '#38bdf8' : 'rgba(255, 255, 255, 0.2)'}`,
                            transition: 'all 0.3s ease',
                            objectFit: 'cover',
                            position: 'relative',
                            zIndex: 5
                          }}
                          />
                        </PremiumAvatarFire>
                      {player.isBot && (
                        <div className={styles.botBadge}>🤖</div>
                        )}
                          </div>
                    </div>
                    
                  {/* ✅ КАРТЫ СНИЗУ АВАТАРА (у себя на 2+ стадии — только рука внизу) */}
                  {playerCards.length > 0 && !(isHumanPlayer && gameStage >= 2) && (
                    <div className={styles.cardsContainer} style={{ 
                      order: 2,
                      flexDirection: 'row',
                    }}>
                      {(() => {
                        const opponentClosedStack = !isHumanPlayer && gameStage >= 2;
                        const cardsToRender = opponentClosedStack
                          ? playerCards.slice(-getOpponentStackDisplayCount(playerCards.length, gameStage))
                          : playerCards;
                        const opponentFan = computeCardFanLayout({
                          cardWidth: layoutMetrics.opponentCardWidth,
                          cardCount: Math.max(cardsToRender.length, 1),
                          maxFanWidth: layoutMetrics.opponentMaxFanWidth,
                          minPeekPx: opponentClosedStack ? 4 : 10,
                          maxPeekPx: opponentClosedStack ? 7 : Math.round(layoutMetrics.opponentCardWidth * 0.38),
                        });

                        return (
                      <div
                        className={styles.activeCardContainer}
                        style={{
                          width: opponentFan.totalWidthPx,
                          maxWidth: layoutMetrics.opponentMaxFanWidth,
                          position: 'relative',
                          margin: '0 auto',
                        }}
                      >
                        {cardsToRender.map((card: LegacyCardLike, cardIndex: number) => {
                          // Карта может быть строкой "7_of_spades.png(open)" или объектом {rank, suit, image}
                          const rawCardImage = typeof card === 'string'
                            ? card
                            : (card.image || (card.rank && card.suit ? `${card.rank}_of_${card.suit}.png` : 'back.png'));
                          const cardImage = rawCardImage
                            .replace('(open)', '')
                            .replace('(closed)', '');
                          
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
                            const nftKey = getNFTKey?.(cardImage) || buildNftDeckKey(cardRank, cardSuit);
                            nftImageUrl = storeNftDeckCards?.[nftKey] || null;
                          }
                          
                          // Верхняя карта должна быть последней добавленной для любого игрока.
                          const isTopCard = cardIndex === cardsToRender.length - 1;
                          const showOpen = isHumanPlayer || (gameStage === 1 && isTopCard);
                          const isMyTurn = player.id === currentPlayerId;
                          const canPlaceDeckOnSelfHere = isHumanPlayer && isTopCard && canPlaceDeckOnSelf;
                          const canMakeMove = gameStage === 1 && isMyTurn && isHumanPlayer && canPickStage1Target && availableTargets.length > 0;
                          const shouldHighlight = gameStage === 1 && isTopCard && canMakeMove;
                          
                          // Подсветка игрока как доступной цели (сразу при analyzing_hand, без лишнего клика по своей карте)
                          let isAvailableTarget = gameStage === 1 && isStage1Target;
                          
                          // Также подсвечиваем цели для карты из колоды
                          if (gameStage === 1 && !isHumanPlayer && turnPhase === 'waiting_deck_action' && revealedDeckCard) {
                            const state = useGameStore.getState();
                            const deckTargets = state.findAvailableTargetsForDeckCard?.(revealedDeckCard) || [];
                            isAvailableTarget = deckTargets.includes(index);
                          }
                          
                          const normalizedCardImage = cardImage.toLowerCase();
                          const isCardBackImage =
                            normalizedCardImage === 'back.png' ||
                            normalizedCardImage === 'card_back.png' ||
                            normalizedCardImage.endsWith('/back.png') ||
                            normalizedCardImage.endsWith('/card_back.png');

                          // Иногда сервер может прислать image=back.png даже для открытой карты.
                          // В этом случае собираем путь по rank/suit, чтобы карта не отображалась рубашкой.
                          const resolvedOpenCardSrc = nftImageUrl
                            ? nftImageUrl
                            : isCardBackImage
                              ? getCardAssetSrc({ rank: cardRank, suit: cardSuit })
                              : getCardAssetSrc({ image: cardImage, rank: cardRank, suit: cardSuit });

                          // ✅ ИСПРАВЛЕНО: Определяем URL изображения (NFT или обычная карта) для ВСЕХ игроков
                          const cardImageUrl = showOpen
                            ? resolvedOpenCardSrc
                            : getCardAssetSrc({ faceDown: true });

                          const isOpponentCard = !isHumanPlayer;
                          const isStage2 = gameStage >= 2;
                          const overlap = cardIndex > 0 ? `-${opponentFan.marginLeftPx}px` : '0';
                          const cardStackZIndex = cardIndex + 1;
                          
                          const cardId = typeof card === 'string' ? undefined : card.id;
                          return (
                            <div 
                              key={cardId || `${player.id}-${cardImage}-${cardIndex}-${showOpen ? 'open' : 'closed'}`} 
                              className={styles.cardOnPenki} 
                              style={{
                                width: layoutMetrics.opponentCardWidth,
                                height: layoutMetrics.opponentCardHeight,
                                flexShrink: 0,
                                marginLeft: overlap,
                                zIndex: cardStackZIndex,
                                cursor: (shouldHighlight || isAvailableTarget || canPlaceDeckOnSelfHere) ? 'pointer' : 'default',
                                position: 'relative',
                                transform: isStage2 && isOpponentCard ? `translateY(${cardIndex * 1}px)` : 'none',
                                transition: 'all 0.2s ease',
                                boxShadow: canPlaceDeckOnSelfHere
                                  ? '0 0 16px rgba(34, 197, 94, 0.75), 0 0 0 2px rgba(34, 197, 94, 0.85)'
                                  : undefined,
                              }}
                              onClick={() => {
                                if (gameStage === 1) {
                                  if (canPlaceDeckOnSelfHere) {
                                    placeCardOnSelfByRules();
                                  } else if (shouldHighlight && isTopCard) {
                                    console.log(`🎴 [1-я стадия] Клик по своей карте, инициируем выбор цели`);
                                    makeMove('initiate_move');
                                  } else if (isAvailableTarget) {
                                    console.log(`🎴 [1-я стадия] Клик по цели: ${player.name}`);
                                    makeMove(player.id);
                                  }
                                }
                              }}
                              onMouseEnter={(e) => {
                                if (isAvailableTarget || canPlaceDeckOnSelfHere) {
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
                                      target.src = getCardAssetSrc({ image: cardImage, rank: cardRank, suit: cardSuit });
                                    } else {
                                      target.src = getCardAssetSrc({ rank: cardRank, suit: cardSuit });
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
                                    objectFit: 'contain',
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
                                <img
                                  src={cardImageUrl}
                                  alt={showOpen ? cardImage : 'Card'}
                                  width={60}
                                  height={90}
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
                                    objectFit: 'contain',
                                  }}
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
                                  inset: '-2px',
                                  borderRadius: '10px',
                                  border: '2px solid rgba(212, 175, 55, 0.78)',
                                  boxShadow: '0 0 10px rgba(212, 175, 55, 0.35)',
                                  pointerEvents: 'none'
                                }} />
                              )}
                              
                              {/* 🔢 ПОКАЗЫВАЕМ КОЛИЧЕСТВО КАРТ ВО 2-Й СТАДИИ (только для закрытых карт) */}
                              {opponentClosedStack && !showOpen && cardIndex === cardsToRender.length - 1 && (
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
                        );
                      })()}
                    </div>
                  )}

                  {/* Имя игрока + таймер хода */}
                  <div style={{ order: 3, textAlign: 'center', marginTop: '2px', maxWidth: '70px' }}>
                    <div style={{
                      fontSize: '9px', fontWeight: '600', color: isCurrentTurn ? '#22c55e' : '#cbd5e1',
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      textShadow: '0 1px 3px rgba(0,0,0,0.7)',
                    }}>
                      {player.name}
                    </div>
                    {isCurrentTurn && (
                      <div style={{
                        fontSize: '10px', fontWeight: '800', marginTop: '1px',
                        color: turnTimeLeft > TURN_OK_THRESHOLD ? '#22c55e' : turnTimeLeft > TURN_WARN_THRESHOLD ? '#eab308' : '#ef4444',
                        textShadow: `0 0 6px ${turnTimeLeft > TURN_OK_THRESHOLD ? 'rgba(34,197,94,0.6)' : turnTimeLeft > TURN_WARN_THRESHOLD ? 'rgba(234,179,8,0.6)' : 'rgba(239,68,68,0.6)'}`,
                      }}>
                        {turnTimeLeft}с
                      </div>
                    )}
                  </div>
                  </div>
                );
              })}
            </div>
          </div>
      )}

      {/* Убираем постоянную стрелку хода: визуально перегружала стол */}

      {/* ПАНЕЛЬ КНОПОК ДЕЙСТВИЙ - УБРАНА, КНОПКА ПЕРЕНЕСЕНА В РУКУ ИГРОКА */}

      {/* Рука игрока внизу экрана - ТОЛЬКО СО 2-Й СТАДИИ! */}
      {players.length > 0 && gameStage >= 2 && myPlayer && (myPlayer.cards.length > 0 || myPlayer.penki.length > 0) && (
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
                showPlayerMessage(myPlayer.id, tr('☝️ ОДНА КАРТА!'), 'success', 4000);
                } else if (oneCardDeclarations[myPlayer.id]) {
                  console.log('⚠️ [ОДНА КАРТА] Уже объявлено!');
                  showPlayerMessage(myPlayer.id, tr('✅ Уже объявлено!'), 'info', 2000);
                  } else {
                  console.log(`❌ [ОДНА КАРТА] Недоступно: ${totalCards} карт`);
                  showPlayerMessage(myPlayer.id, tr(`❌ У вас ${totalCards} ${totalCards === 1 ? 'карта' : totalCards < 5 ? 'карты' : 'карт'}!`), 'error', 3000);
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
                {tr('☝️ Одна карта!')}
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
                    showPlayerMessage(myPlayer.id, tr('⏳ Недоступно сейчас'), 'warning', 2000);
                    return;
                  }
                  
                  console.log('✅ [СКОЛЬКО КАРТ] Спрашиваем...');
                  showPlayerMessage(myPlayer.id, tr('❓ Сколько карт?'), 'info', 2000);
                  
                  const targets = targetsNotDeclared;
                  
                  if (targets.length === 1) {
                    console.log(`🎯 [СКОЛЬКО КАРТ] Проверка 1 игрока: ${targets[0].name}`);
                    showPlayerMessage(targets[0].id, tr('🔍 Проверка...'), 'warning', 3000);
                    askHowManyCards(myPlayer.id, targets[0].id);
                  } else if (targets.length > 1) {
                    console.log(`🎯 [СКОЛЬКО КАРТ] Проверка ${targets.length} игроков`);
                    targets.forEach(t => {
                      showPlayerMessage(t.id, tr('🔍 Проверка...'), 'warning', 3000);
                      askHowManyCards(myPlayer.id, t.id);
                    });
                  } else {
                    console.log('❌ [СКОЛЬКО КАРТ] Нет целей');
                    showNotification(tr('Нет доступных целей для проверки'), 'warning', 2000);
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
                {tr('❓ Сколько карт?')}
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
          
          <div
            className={styles.handCards}
            style={myHandFan ? { width: myHandFan.totalWidthPx, maxWidth: layoutMetrics.handMaxFanWidth, margin: '0 auto' } : undefined}
          >
            {myPlayer.cards.length === 0 && myPlayer.penki.length > 0 && (
              <div style={{
                padding: '10px 14px',
                borderRadius: '12px',
                background: 'rgba(15, 23, 42, 0.85)',
                border: '1px solid rgba(251, 191, 36, 0.35)',
                color: '#fde68a',
                fontSize: '13px',
                fontWeight: 700,
                textAlign: 'center',
                boxShadow: '0 0 18px rgba(251, 191, 36, 0.18)'
              }}>
                Открываем пеньки...
              </div>
            )}
            {myPlayer.cards.map((card: LegacyCardLike, index: number) => {
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
                const nftKey = getNFTKey?.(cardImage) || buildNftDeckKey(cardRank, cardSuit);
                nftImageUrl = storeNftDeckCards?.[nftKey] || null;
              }
              
              const cardId = typeof card === 'string' ? undefined : card.id;
              const isTopHandCard = index === myPlayer.cards.length - 1;
              const highlightSelfPlacement = canPlaceDeckOnSelf && isTopHandCard;
              // Проверяем можно ли сыграть эту карту
              const isMyTurn = myPlayer.id === currentPlayerId;
              const isSelected = selectedHandCard?.id === cardId || selectedHandCard?.image === cardImage;
              
              // Логика подсветки: карта доступна если это ваш ход и либо стол пустой, либо карта может побить верхнюю
              let canPlay = false;
              if (isMyTurn && stage2TurnPhase === 'selecting_card') {
                if (tableStack.length === 0) {
                  canPlay = true; // Можно сыграть любую карту на пустой стол
                } else {
                  // Проверяем можем ли побить верхнюю карту на столе
                  const topCard = tableStack[tableStack.length - 1];
                  // Простая проверка - используем функцию из gameStore
                  const cardObj = (typeof card === 'string'
                    ? { image: cardImage, open: true, id: `card-${index}` }
                    : { ...card, id: card.id || `card-${index}` }) as StoreCard;
                  const state = useGameStore.getState();
                  if (state.canBeatCard && topCard && trumpSuit) {
                    canPlay = state.canBeatCard(topCard, cardObj, trumpSuit);
                  }
                }
              }
              
              return (
                <div
                  key={`hand-${index}-${cardImage}`}
                  className={`${styles.handCard} ${isSelected ? styles.selected : ''} ${canPlay ? styles.playable : ''} ${highlightSelfPlacement ? styles.playable : ''} ${!isMyTurn ? styles.disabled : ''}`}
                  draggable={isMyTurn && canPlay}
                  onDragStart={(e) => {
                    if (!isMyTurn || !canPlay) {
                      e.preventDefault();
                      return;
                    }
                    console.log(`🖱️ [DRAG START] Начало перетаскивания: ${cardImage}`);
                    const cardObj = (typeof card === 'string' 
                      ? { image: cardImage, open: true, id: `card-${index}` }
                      : { ...card, id: card.id || `card-${index}` }) as StoreCard;
                    e.dataTransfer.setData('card', JSON.stringify(cardObj));
                    e.dataTransfer.effectAllowed = 'move';
                  }}
                  onTouchStart={(e) => {
                    if (!isMyTurn || !canPlay) return;
                    console.log(`📱 [TOUCH START] Начало касания: ${cardImage}`);
                    const touch = e.touches[0];
                    const cardObj = (typeof card === 'string' 
                      ? { image: cardImage, open: true, id: `card-${index}` }
                      : { ...card, id: card.id || `card-${index}` }) as StoreCard;
                    // Сохраняем данные карты для touchEnd
                    const target = e.currentTarget as TouchCardElement;
                    target.__draggedCard = cardObj;
                    target.__touchStartY = touch.clientY;
                  }}
                  onTouchMove={(e) => {
                    if (!isMyTurn || !canPlay) return;
                    const touch = e.touches[0];
                    const startY = (e.currentTarget as TouchCardElement).__touchStartY;
                    if (startY && touch.clientY < startY - 50) {
                      // Карта перетащена вверх на 50px - визуальная обратная связь
                      e.currentTarget.style.transform = 'translateY(-20px)';
                    }
                  }}
                  onTouchEnd={(e) => {
                    if (!isMyTurn || !canPlay) return;
                    const target = e.currentTarget as TouchCardElement;
                    const cardObj = target.__draggedCard;
                    const startY = target.__touchStartY;
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
                    width: layoutMetrics.handCardWidth,
                    height: layoutMetrics.handCardHeight,
                    flexShrink: 0,
                    marginLeft: index > 0 && myHandFan ? `-${myHandFan.marginLeftPx}px` : '0',
                    zIndex: isSelected ? 200 : index + 1,
                    cursor: highlightSelfPlacement ? 'pointer' : isMyTurn && canPlay ? 'grab' : isMyTurn ? 'pointer' : 'not-allowed',
                    position: 'relative',
                    transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                    touchAction: 'none',
                    boxShadow: highlightSelfPlacement
                      ? '0 0 18px rgba(34, 197, 94, 0.75), 0 0 0 2px rgba(34, 197, 94, 0.85)'
                      : undefined,
                  }}
                  onClick={() => {
                    if (!isMyTurn) {
                      showNotification('Сейчас не ваш ход!', 'warning', 2000);
                      return;
                    }

                    if (highlightSelfPlacement) {
                      placeCardOnSelfByRules();
                      return;
                    }
                    
                    // Клик по карте - выбираем её через gameStore
                    const cardObj = (typeof card === 'string' 
                      ? { image: cardImage, open: true, id: `card-${index}` }
                      : { ...card, id: card.id || `card-${index}` }) as StoreCard;
                    
                    console.log(`🎴 [Клик по карте] Игрок кликнул на карту:`, cardObj);
                    selectHandCard(cardObj);
                  }}
                >
                  {/* ✅ НОВОЕ: Используем NFT карту если она есть в колоде */}
                  {(() => {
                    const standardHandCardSrc = getCardAssetSrc({ image: cardImage, rank: cardRank, suit: cardSuit });
                    return (
                      <>
                  {nftImageUrl ? (
                    <div style={{ position: 'relative', width: `${layoutMetrics.handCardWidth}px`, height: `${layoutMetrics.handCardHeight}px` }}>
                    <img
                      src={nftImageUrl}
                      alt={cardImage}
                      onError={(e) => {
                        console.log('❌ NFT изображение не загрузилось, показываем обычную карту');
                        e.currentTarget.style.display = 'none';
                        const fallbackImg = e.currentTarget.nextSibling as HTMLImageElement;
                        if (fallbackImg) {
                          fallbackImg.src = standardHandCardSrc;
                          fallbackImg.style.display = 'block';
                        }
                      }}
                      style={{ 
                        width: `${layoutMetrics.handCardWidth}px`,
                        height: `${layoutMetrics.handCardHeight}px`,
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
                  <img
                    src={standardHandCardSrc}
                    alt={cardImage}
                    width={layoutMetrics.handCardWidth}
                    height={layoutMetrics.handCardHeight}
                    style={{
                      width: `${layoutMetrics.handCardWidth}px`,
                      height: `${layoutMetrics.handCardHeight}px`,
                      borderRadius: '8px',
                      background: '#ffffff',
                      opacity: 1,
                      filter: canPlay ? 'brightness(1.1)' : 'none',
                      visibility: 'visible',
                      display: nftImageUrl ? 'none' : 'block',
                      transform: isSelected ? 'translateY(-20px) scale(1.1)' : 'none',
                      transition: 'all 0.3s ease',
                      boxShadow: canPlay ? '0 0 20px rgba(40, 167, 69, 0.6), 0 0 40px rgba(40, 167, 69, 0.3)' : 'none',
                      objectFit: 'cover'
                    }}
                  />
                      </>
                    );
                  })()}
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
          coinsEarned={winnerModalData.place === 1 ? 350 : winnerModalData.place === 2 ? 250 : winnerModalData.place === 3 ? 150 : winnerModalData.place === 4 ? 100 : winnerModalData.place === 5 ? 70 : 30}
          ratingChange={winnerModalData.place === 1 ? 50 : winnerModalData.place === 2 ? 25 : winnerModalData.place === 3 ? 10 : 0}
          isBotGame={!isMultiplayer}
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
      {showTutorialFieldHints && isTutorialActive && !isTutorialPaused && isUserTurn && players.length > 0 && (() => {
        const userIndex = players.findIndex(p => p.isUser);
        if (userIndex < 0) return null;
        const userPos = getPlayerPosition(userIndex, players.length);

        // В 1-й стадии — плавная стрелка к доступной цели
        if (gameStage === 1 && availableTargets.length > 0) {
          const targetIdx = availableTargets[0];
          const targetPos = getPlayerPosition(targetIdx, players.length);
          const targetPlayer = players[targetIdx];
          const start = getHintAnchor(userPos);
          const end = getHintAnchor(targetPos);
          const midX = (start.x + end.x) / 2;
          const midY = (start.y + end.y) / 2;
          const curveOffset = end.x > start.x ? -10 : 10;
          const labelX = Math.max(20, Math.min(80, midX + curveOffset * 0.45));
          const labelY = Math.max(18, Math.min(78, midY - 2));

          return (
            <>
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
                  <linearGradient id="arrow-grad" x1="0%" y1="100%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#34d399" stopOpacity="0.35" />
                    <stop offset="55%" stopColor="#4ade80" stopOpacity="0.95" />
                    <stop offset="100%" stopColor="#86efac" stopOpacity="1" />
                  </linearGradient>
                  <filter id="tut-glow2">
                    <feGaussianBlur stdDeviation="4" result="blur" />
                    <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
                  </filter>
                </defs>
                <path
                  d={`M ${start.x}% ${start.y}% Q ${midX + curveOffset}% ${midY}% ${end.x}% ${end.y}%`}
                  stroke="rgba(34,197,94,0.2)"
                  strokeWidth="13"
                  fill="none"
                  strokeLinecap="round"
                />
                <path
                  d={`M ${start.x}% ${start.y}% Q ${midX + curveOffset}% ${midY}% ${end.x}% ${end.y}%`}
                  stroke="url(#arrow-grad)"
                  strokeWidth="5"
                  fill="none"
                  strokeLinecap="round"
                  markerEnd="url(#tut-arrowhead)"
                  filter="url(#tut-glow2)"
                />
                <circle
                  cx={`${midX + curveOffset * 0.35}%`}
                  cy={`${midY}%`}
                  r="6"
                  fill="#bbf7d0"
                  filter="url(#tut-glow2)"
                >
                  <animate attributeName="opacity" values="0.35;1;0.35" dur="1.4s" repeatCount="indefinite" />
                </circle>
              </svg>

              <motion.div
                style={{
                  position: 'absolute',
                  left: `${end.x}%`,
                  top: `${end.y}%`,
                  width: '56px',
                  height: '56px',
                  transform: 'translate(-50%, -50%)',
                  borderRadius: '50%',
                  border: '2px solid rgba(74, 222, 128, 0.9)',
                  boxShadow: '0 0 0 8px rgba(34, 197, 94, 0.12), 0 0 26px rgba(34, 197, 94, 0.45)',
                  zIndex: 210,
                  pointerEvents: 'none',
                }}
                animate={{ scale: [0.95, 1.08, 0.95], opacity: [0.85, 1, 0.85] }}
                transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
              />

              <motion.div
                style={{
                  position: 'absolute',
                  left: `${labelX}%`,
                  top: `${labelY}%`,
                  transform: 'translate(-50%, -50%)',
                  zIndex: 220,
                  pointerEvents: 'none',
                  maxWidth: '42vw'
                }}
                animate={{ y: [0, -4, 0], opacity: [0.92, 1, 0.92] }}
                transition={{ duration: 1.9, repeat: Infinity, ease: 'easeInOut' }}
              >
                <div style={{
                  color: '#f8fafc',
                  fontSize: '11px',
                  fontWeight: '800',
                  background: 'linear-gradient(135deg, rgba(22, 163, 74, 0.94) 0%, rgba(34, 197, 94, 0.88) 100%)',
                  padding: '7px 12px',
                  borderRadius: '12px',
                  whiteSpace: 'nowrap',
                  boxShadow: '0 10px 24px rgba(34,197,94,0.35)',
                  border: '1px solid rgba(255,255,255,0.18)'
                }}>
                  Положи на {targetPlayer?.name || 'соперника'}
                </div>
              </motion.div>
            </>
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
      {showTutorialFieldHints && isTutorialActive && !isTutorialPaused && !isUserTurn && currentPlayerId && players.length > 0 && (() => {
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
                <>Бот ищет соперника, у которого открытая карта <span style={{ color: '#fbbf24' }}>ровно на 1 МЛАДШЕ</span>. Если найдёт — положит свою карту сверху!</>
              ) : (
                <>Бот ищет карту в руке чтобы <span style={{ color: '#fbbf24' }}>побить карту на столе</span> — той же масти, но старше. Козырь бьёт некозырь, пики — только пиками!</>
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

      {/* 💬 ЧАТ ЗА СТОЛОМ — сообщения и действия (Одна карта, Сколько карт) над игроками и в чате */}
      {players.length > 0 && (
        <GameChat
          playerName={userData?.username || 'Игрок'}
          playerId={userPlayerId || 'user'}
          isMultiplayer={isMultiplayer}
          externalMessages={chatActionMessages}
          onSendMessage={(text) => {
            const pid = myPlayer?.id || userPlayerId || 'user';
            if (pid) showPlayerMessage(pid, text, 'info', 6000, 'chat');
          }}
        />
      )}

      {/* 👤 МОДАЛКА ПРОФИЛЯ (из бургер-меню) */}
      <AnimatePresence>
        {showProfileModal && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowProfileModal(false)}
              style={{
                position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
                zIndex: 8000, backdropFilter: 'blur(6px)',
              }}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              style={{
                position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                zIndex: 8001, padding: '16px', pointerEvents: 'none',
              }}
            >
              <div
                onClick={(e) => e.stopPropagation()}
                style={{
                  width: 'min(400px, 92vw)',
                  maxHeight: '80vh',
                  overflowY: 'auto',
                  background: 'linear-gradient(145deg, rgba(30,41,59,0.98), rgba(15,23,42,0.99))',
                  borderRadius: '24px',
                  border: '2px solid rgba(99,102,241,0.3)',
                  boxShadow: '0 25px 60px rgba(0,0,0,0.5), 0 0 40px rgba(99,102,241,0.15)',
                  padding: '28px',
                  pointerEvents: 'auto',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                  <h2 style={{ color: '#e2e8f0', fontSize: '20px', fontWeight: '800', margin: 0 }}>👤 Профиль</h2>
                  <button onClick={() => setShowProfileModal(false)} style={{
                    background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)',
                    borderRadius: '10px', padding: '6px 10px', cursor: 'pointer', color: '#f87171', fontSize: '14px',
                  }}>✕</button>
                </div>
                <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                  <div style={{
                    width: '80px', height: '80px', borderRadius: '50%', margin: '0 auto 12px',
                    background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    border: '3px solid rgba(99,102,241,0.4)',
                    boxShadow: '0 4px 20px rgba(99,102,241,0.3)',
                    overflow: 'hidden',
                  }}>
                    {userData?.avatar ? (
                      <img src={userData.avatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <span style={{ fontSize: '36px' }}>👤</span>
                    )}
                  </div>
                  <div style={{ color: '#e2e8f0', fontSize: '18px', fontWeight: '700' }}>{userData?.username || 'Игрок'}</div>
                </div>
                <div style={{
                  background: 'rgba(15,23,42,0.5)', borderRadius: '16px',
                  padding: '16px', border: '1px solid rgba(51,65,85,0.3)',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <span style={{ color: '#94a3b8', fontSize: '13px' }}>Баланс</span>
                    <span style={{ color: '#fbbf24', fontSize: '16px', fontWeight: '700' }}>🪙 {userData?.coins || 0}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <span style={{ color: '#94a3b8', fontSize: '13px' }}>ID</span>
                    <span style={{ color: '#64748b', fontSize: '12px', fontFamily: 'monospace' }}>{userData?.telegramId || userPlayerId || '—'}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: '#94a3b8', fontSize: '13px' }}>Стадия</span>
                    <span style={{ color: '#a5b4fc', fontSize: '14px', fontWeight: '600' }}>
                      {gameStage === 1 ? '1-я стадия' : gameStage === 2 ? '2-я стадия' : '3-я стадия (пеньки)'}
                    </span>
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* 💰 МОДАЛКА КОШЕЛЬКА (из бургер-меню) */}
      <AnimatePresence>
        {showWalletModal && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowWalletModal(false)}
              style={{
                position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
                zIndex: 8000, backdropFilter: 'blur(6px)',
              }}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              style={{
                position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                zIndex: 8001, padding: '12px', pointerEvents: 'none',
              }}
            >
              <div
                onClick={(e) => e.stopPropagation()}
                style={{
                  width: 'min(440px, 95vw)',
                  maxHeight: '85vh',
                  overflowY: 'auto',
                  background: 'linear-gradient(145deg, rgba(30,41,59,0.98), rgba(15,23,42,0.99))',
                  borderRadius: '24px',
                  border: '2px solid rgba(251,191,36,0.3)',
                  boxShadow: '0 25px 60px rgba(0,0,0,0.5), 0 0 40px rgba(251,191,36,0.1)',
                  pointerEvents: 'auto',
                  position: 'relative',
                }}
              >
                <button onClick={() => setShowWalletModal(false)} style={{
                  position: 'absolute', top: '14px', right: '14px', zIndex: 10,
                  background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)',
                  borderRadius: '10px', padding: '6px 10px', cursor: 'pointer', color: '#f87171', fontSize: '14px',
                }}>✕</button>
                <GameWallet
                  user={gameWalletUserMemo}
                  onBalanceUpdate={handleGameWalletBalance}
                />
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
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