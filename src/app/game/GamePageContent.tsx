'use client'
import { useState, useMemo, useEffect, useRef } from 'react';
import Image from 'next/image';
import PlayerProfileModal from '../../components/PlayerProfileModal';
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
import WinnerScreen from '@/components/WinnerScreen';
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

// 🎯 РАССАДКА ИГРОКОВ ПО ЧАСОВОЙ СТРЕЛКЕ ДЛЯ ВЕРТИКАЛЬНОГО СТОЛА
const getRectanglePosition = (index: number, totalPlayers: number): { 
  top: string; 
  left: string; 
  cardDirection: 'horizontal' | 'vertical';
  cardOffset: { x: number; y: number };
} => {
  // ПОЗИЦИЯ 0: Главный игрок ВНИЗУ ПО ЦЕНТРУ
  if (index === 0) {
    return { 
      left: '50%', 
      top: '92%', // Самый низ
      cardDirection: 'horizontal',
      cardOffset: { x: 0, y: -40 }
    };
  }
  
  // НОВАЯ РАССАДКА: 2 СВЕРХУ, ПО 3 ПО БОКАМ
  // 1-3 → левая сторона (3 игрока)
  // 4-5 → верхняя сторона (2 игрока) 
  // 6-8 → правая сторона (3 игрока)
  
  const positions = [
    // ЛЕВАЯ СТОРОНА - 3 ИГРОКА (снизу вверх)
    { left: '5%', top: '70%', cardDirection: 'vertical' as const, cardOffset: { x: 55, y: 0 } }, // 1: слева внизу
    { left: '5%', top: '50%', cardDirection: 'vertical' as const, cardOffset: { x: 55, y: 0 } }, // 2: слева центр
    { left: '5%', top: '30%', cardDirection: 'vertical' as const, cardOffset: { x: 55, y: 0 } }, // 3: слева вверху
    
    // ВЕРХНЯЯ СТОРОНА - 2 ИГРОКА (слева направо)
    { left: '35%', top: '5%', cardDirection: 'horizontal' as const, cardOffset: { x: 0, y: 55 } }, // 4: сверху слева
    { left: '65%', top: '5%', cardDirection: 'horizontal' as const, cardOffset: { x: 0, y: 55 } }, // 5: сверху справа
    
    // ПРАВАЯ СТОРОНА - 3 ИГРОКА (сверху вниз)
    { left: '95%', top: '30%', cardDirection: 'vertical' as const, cardOffset: { x: -55, y: 0 } }, // 6: справа вверху
    { left: '95%', top: '50%', cardDirection: 'vertical' as const, cardOffset: { x: -55, y: 0 } }, // 7: справа центр
    { left: '95%', top: '70%', cardDirection: 'vertical' as const, cardOffset: { x: -55, y: 0 } }, // 8: справа внизу
  ];
  
  // Возвращаем позицию для индекса
  if (index >= 1 && index <= 9) {
    return positions[index - 1];
  }
  
  // Fallback для дополнительных игроков
  const fallbackAngle = (2 * Math.PI * (index - 1)) / totalPlayers;
  const fallbackX = 50 + 42 * Math.cos(fallbackAngle - Math.PI / 2);
  const fallbackY = 50 + 42 * Math.sin(fallbackAngle - Math.PI / 2);
  
  return {
    left: `${Math.max(5, Math.min(95, fallbackX))}%`,
    top: `${Math.max(5, Math.min(95, fallbackY))}%`,
    cardDirection: 'horizontal' as const,
    cardOffset: { x: 0, y: -30 }
  };
};

// LEGACY ФУНКЦИЯ (для обратной совместимости)
const getCirclePosition = (index: number, totalPlayers: number): { top: string; left: string } => {
  // Используем новую прямоугольную систему
  return getRectanglePosition(index, totalPlayers);
  
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
  initialPlayerCount = 4, 
  isMultiplayer = false, 
  multiplayerData,
  onGameEnd 
}: GamePageContentProps) {
  const { user } = useTelegram();
  const { language } = useLanguage();
  const t = useTranslations(language);
  
  const { 
    isGameActive, gameStage, turnPhase, stage2TurnPhase,
    players, currentPlayerId, deck, availableTargets,
    selectedHandCard, revealedDeckCard, tableStack, trumpSuit,
    oneCardDeclarations, oneCardTimers, playersWithOneCard, pendingPenalty,
    penaltyDeck, gameCoins,
    startGame, endGame, 
    drawCard, makeMove, onDeckClick, placeCardOnSelfByRules,
    selectHandCard, playSelectedCard, takeTableCards, showNotification,
    declareOneCard, askHowManyCards, contributePenaltyCard, cancelPenalty
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

  // Модальное окно профиля игрока
  const [selectedPlayerProfile, setSelectedPlayerProfile] = useState<any>(null);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  // Функция генерации профиля игрока
  const generatePlayerProfile = async (player: any) => {
    if (player.isUser) {
      // Реальный игрок - данные из БД
      try {
        const response = await fetch('/api/auth', {
          credentials: 'include',
        });
        
        if (response.ok) {
          const result = await response.json();
          if (result.success && result.user) {
            return {
              id: player.id,
              name: result.user.username || userData?.username || 'Игрок',
              avatar: result.user.avatar_url || userData?.avatar || '',
              isBot: false,
              isUser: true,
              level: Math.floor((result.user.experience || 0) / 1000) + 1,
              rating: result.user.rating || 0,
              gamesPlayed: result.user.games_played || 0,
              winRate: result.user.games_played > 0 
                ? Math.round((result.user.wins / result.user.games_played) * 100) 
                : 0,
              bestStreak: result.user.best_win_streak || 0,
              status: '🟢 Online',
              joinedDate: result.user.created_at 
                ? new Date(result.user.created_at).toLocaleDateString('ru-RU')
                : 'Недавно',
            };
          }
        }
      } catch (error) {
        console.error('Ошибка загрузки профиля:', error);
      }
      
      // Fallback для реального игрока
      return {
        id: player.id,
        name: userData?.username || 'Игрок',
        avatar: userData?.avatar || '',
        isBot: false,
        isUser: true,
        level: 1,
        rating: 0,
        gamesPlayed: 0,
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
    const profile = await generatePlayerProfile(player);
    setSelectedPlayerProfile(profile);
    setIsProfileModalOpen(true);
  };

  // Обработчик добавления в друзья
  const handleAddFriend = (playerId: string) => {
    console.log('🤝 Добавить в друзья:', playerId);
    alert(`Запрос в друзья отправлен! (В разработке)`);
    setIsProfileModalOpen(false);
  };

  // Обновляем currentCard из revealedDeckCard
  useEffect(() => {
    if (revealedDeckCard && revealedDeckCard.image) {
      console.log('🎴 [currentCard] Обновляем открытую карту:', revealedDeckCard.image);
      setCurrentCard(revealedDeckCard.image); // Используем image, а не весь объект!
    } else {
      console.log('🎴 [currentCard] Нет открытой карты из колоды');
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
      console.log('🖼️ Аватарки игроков обновлены:', avatars);
    }
  }, [players]);

  // Загружаем данные пользователя из Supabase БД через API
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        setIsLoadingUserData(true);
        
        const response = await fetch('/api/auth', {
          method: 'GET',
          credentials: 'include', // Важно для cookies
          headers: {
            'Content-Type': 'application/json',
          }
        });
        
        if (!response.ok) {
          console.error('❌ Ошибка получения данных пользователя:', response.status);
          setUserData({ coins: 0, username: 'Игрок' });
          return;
        }
        
        const result = await response.json();
        
        if (result.success && result.user) {
          console.log('✅ Данные пользователя загружены из БД:', result.user);
          setUserData({
            coins: result.user.coins || 0,
            avatar: result.user.avatar_url || '', // Из БД
            username: result.user.username || result.user.firstName || 'Игрок',
            telegramId: result.user.telegramId
          });
        } else {
          console.error('❌ Пользователь не авторизован');
          setUserData({ coins: 0, username: 'Игрок' });
        }
      } catch (error) {
        console.error('❌ Ошибка загрузки данных пользователя:', error);
        setUserData({ coins: 0, username: 'Игрок' });
      } finally {
        setIsLoadingUserData(false);
      }
    };

    fetchUserData();
  }, []);

  // Обновляем данные пользователя периодически (для обновления монет)
  useEffect(() => {
    const interval = setInterval(async () => {
      if (!userData) return;
      
      try {
        const response = await fetch('/api/user/balance', {
          method: 'GET',
          credentials: 'include',
        });
        
        if (response.ok) {
          const result = await response.json();
          if (result.success && result.data) {
            setUserData(prev => prev ? { 
              ...prev, 
              coins: result.data.balance 
            } : { 
              coins: result.data.balance, 
              username: 'Игрок' 
            });
          }
        }
      } catch (error) {
        console.error('❌ Ошибка обновления баланса:', error);
      }
    }, 30000); // Обновляем каждые 30 секунд

    return () => clearInterval(interval);
  }, [userData]);

  // Мониторинг tableStack убран - система работает корректно

  const [playerCount, setPlayerCount] = useState(initialPlayerCount);
  
  // Состояние экрана победителя
  const [winner, setWinner] = useState<{
    name: string;
    isUser: boolean;
    id: string;
  } | null>(null);
  const [showWinnerScreen, setShowWinnerScreen] = useState(false);
  
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

  // ✅ ИСПРАВЛЕНО: Отслеживаем завершение игры и показываем экран победителя
  useEffect(() => {
    // Если игра была активна, а теперь неактивна - игра завершилась
    if (!isGameActive && players.length > 0) {
      console.log('🎮 [GamePageContent] Игра завершена, ищем победителя...');
      
      // Находим игрока без карт (победителя)
      const gameWinner = players.find(player => {
        const totalCards = player.cards.length + (player.penki?.length || 0);
        return totalCards === 0;
      });
      
      if (gameWinner) {
        console.log('🏆 Найден победитель:', gameWinner.name);
        setWinner({
          name: gameWinner.name,
          isUser: gameWinner.isUser || false,
          id: gameWinner.id
        });
        setShowWinnerScreen(true);
      } else {
        console.log('⚠️ Победитель не найден, возможно ничья');
        // Можно добавить обработку ничьей
      }
    }
    
    // Отслеживаем завершение игры для мультиплеера
    if (isMultiplayer && !isGameActive && onGameEnd) {
      console.log('🎮 [GamePageContent] Игра завершена в мультиплеере, вызываем onGameEnd');
      onGameEnd();
    }
  }, [isGameActive, players, isMultiplayer, onGameEnd]);
  
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
  
  // ОТЛАДКА убрана - логи были слишком многословные
  
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
    const { isGameActive, currentPlayerId, players, gameStage, stage2TurnPhase, deck, availableTargets, revealedDeckCard, trumpSuit, tableStack } = useGameStore.getState();
    
    if (!isGameActive || !currentPlayerId) {
      console.log(`🤖 [AI useEffect] Игра неактивна или нет текущего игрока: isGameActive=${isGameActive}, currentPlayerId=${currentPlayerId}`);
      return;
    }
    
    const currentTurnPlayer = players.find(p => p.id === currentPlayerId);
    if (!currentTurnPlayer) {
      console.log(`🤖 [AI useEffect] Игрок не найден: currentPlayerId=${currentPlayerId}`);
      return;
    }
    
    if (!currentTurnPlayer.isBot) {
      console.log(`👤 [AI useEffect] Ход РЕАЛЬНОГО ИГРОКА: ${currentTurnPlayer.name}, isUser=${currentTurnPlayer.isUser}`);
      // Это РЕАЛЬНЫЙ ИГРОК - не обрабатываем через AI!
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
      if (isGameActive && players.length > 0 && dealt) {
        // ИГРА УЖЕ ЗАПУЩЕНА И КАРТЫ РОЗДАНЫ - ВОССТАНАВЛИВАЕМ СОСТОЯНИЕ ПОСЛЕ REFRESH!
        console.log(`🎮 [ВОССТАНОВЛЕНИЕ] Игра P.I.D.R. восстановлена: ${players.length} игроков`);
        console.log(`🎮 [ВОССТАНОВЛЕНИЕ] Стадия: ${gameStage}, текущий игрок: ${currentPlayerId}`);
        console.log(`🎮 [ВОССТАНОВЛЕНИЕ] Фаза хода: ${turnPhase}, stage2TurnPhase: ${stage2TurnPhase}`);
        
        setPlayerCount(players.length);
        setGameInitialized(true);
        
        // Уведомляем о восстановлении
        showNotification(`🔄 Игра восстановлена! Продолжаем с ${gameStage}-й стадии`, 'success', 3000);
        
        // Если сейчас ход бота - он автоматически продолжит через useEffect для AI
        const currentTurnPlayer = players.find(p => p.id === currentPlayerId);
        if (currentTurnPlayer?.isBot) {
          console.log(`🤖 [ВОССТАНОВЛЕНИЕ] Бот ${currentTurnPlayer.name} должен продолжить ход`);
        }
      } else if (!isGameActive) {
        // Игра не активна - просто инициализируем интерфейс
        console.log('🎮 Ожидание запуска игры...');
        setGameInitialized(true);
      }
    }
  }, [gameInitialized, isGameActive, players.length, gameStage, currentPlayerId, turnPhase, stage2TurnPhase, dealt, showNotification]);

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
      const response = await fetch('/api/auth', {
        credentials: 'include',
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
    } catch (error) {
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
      
    } catch (error) {
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
      
    } catch (error) {
      console.error('❌ Ошибка генерации аватаров:', error);
    } finally {
      setIsGeneratingAvatars(false);
    }
  };

  // Автоматически запускаем игру если она не активна
  useEffect(() => {
    if (!isGameActive && !gameInitialized && userData) { // Ждем загрузки данных пользователя
      console.log('🎮 [AUTO-START] Автоматически запускаем игру...');
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
  }, [isGameActive, gameInitialized, isMultiplayer, multiplayerData, playerCount, startGame, userData]);

  // Вычисляемые значения для UI
  const canDrawCard = turnPhase === 'deck_card_revealed' && currentTurnPlayer?.id === currentPlayerId;
  const canClickDeck = turnPhase === 'showing_deck_hint' && currentTurnPlayer?.id === currentPlayerId;
  const waitingForTarget = turnPhase === 'waiting_target_selection';

  // Функция для расчета позиции игрока вокруг прямоугольного стола
  const getPlayerPosition = (index: number, totalPlayers: number) => {
    // Позиции для прямоугольного стола (9 позиций - ИСПРАВЛЕНО!)
    const positions = [
      { x: 50, y: 85 },  // 0: Низ-центр (РЕАЛЬНЫЙ ИГРОК)
      { x: 20, y: 75 },  // 1: Лево-низ
      { x: 5, y: 55 },   // 2: Лево-центр
      { x: 10, y: 30 },  // 3: Лево-верх
      { x: 35, y: 12 },  // 4: Верх-лево
      { x: 65, y: 12 },  // 5: Верх-право
      { x: 90, y: 30 },  // 6: Право-верх
      { x: 95, y: 55 },  // 7: Право-центр
      { x: 80, y: 75 },  // 8: Право-низ
    ];
    
    // ВАЖНО: для 9 игроков все позиции должны быть уникальными!
    if (index >= positions.length) {
      console.warn(`⚠️ Индекс ${index} больше чем позиций ${positions.length}`);
      return positions[index % positions.length];
    }
    
    return positions[index];
  };

  // Показываем загрузку если игра инициализируется
  if (!isGameActive && !winner) {
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
          <h2 style={{ marginBottom: '20px', fontSize: '24px' }}>🎮 P.I.D.R. Game</h2>
          <p style={{ marginBottom: '30px', opacity: 0.7 }}>
            {players.length > 0 ? 'Игра завершена! Начните новую игру' : 'Запускаем игру...'}
          </p>
          {players.length === 0 && (
          <div style={{
            width: '40px',
            height: '40px',
            border: '4px solid rgba(99, 102, 241, 0.3)',
            borderTop: '4px solid #6366f1',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 20px'
          }}></div>
          )}
          <button
            onClick={() => {
              console.log('🎮 Запуск новой игры...');
              startGame('single', playerCount, null, {
                avatar: userData?.avatar,
                username: userData?.username
              });
              setGameInitialized(true);
              setDealt(false);
            }}
            style={{
              background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
              color: '#fff',
              border: 'none',
              borderRadius: '12px',
              padding: '12px 24px',
              fontSize: '16px',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              marginBottom: '10px'
            }}
          >
            🚀 {players.length > 0 ? 'Играть снова' : 'Запустить игру'}
          </button>
          <button
            onClick={() => typeof window !== 'undefined' && window.history.back()}
            style={{
              background: 'rgba(255, 255, 255, 0.1)',
              color: '#e2e8f0',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              borderRadius: '12px',
              padding: '8px 16px',
              fontSize: '14px',
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
      {/* ЗАГОЛОВОК ИГРЫ - СТАДИЯ И КОЛОДА */}
      {isGameActive && (
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
            🎴 Колода: {deck.length}
          </div>
        </div>
      )}

      {/* БУРГЕР МЕНЮ */}
      {isGameActive && (
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
      {isGameActive && (
        <div className={styles.tableWrapper}>
          {/* Прямоугольный стол */}
          <div className={styles.rectangularTable}>
            {/* КАРТЫ НА СТОЛЕ (2-я стадия) */}
            {gameStage >= 2 && tableStack && tableStack.length > 0 && (
              <div style={{
                position: 'absolute',
                left: '50%',
                top: '40%',
                transform: 'translate(-50%, -50%)',
                zIndex: 15,
                display: 'flex',
                flexWrap: 'wrap',
                gap: '8px',
                maxWidth: '300px',
                justifyContent: 'center',
                alignItems: 'center',
                background: 'rgba(0, 0, 0, 0.5)',
                padding: '12px',
                borderRadius: '12px',
                border: '2px solid rgba(255, 193, 7, 0.5)'
              }}>
                {tableStack.map((card, idx) => (
                  <div key={`table-${idx}`} style={{
                    position: 'relative',
                    background: '#ffffff',
                    borderRadius: '6px',
                    padding: '2px',
                    boxShadow: '0 4px 8px rgba(0,0,0,0.3)'
                  }}>
                    <Image
                      src={`${CARDS_PATH}${card.image || 'card_back.png'}`}
                      alt={`Card ${idx + 1}`}
                      width={32}
                      height={48}
                      style={{ 
                        borderRadius: '4px',
                        display: 'block'
                      }}
                    />
                  </div>
                ))}
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
                {/* Открытая карта из колоды (слева) - БЕЛЫЙ ФОН! */}
                {currentCard && revealedDeckCard && (
                  <div style={{ 
                    position: 'relative',
                    background: '#ffffff',
                    borderRadius: '8px',
                    padding: '2px',
                    boxShadow: turnPhase === 'waiting_deck_action' 
                      ? '0 0 30px rgba(99, 102, 241, 0.8), 0 0 50px rgba(99, 102, 241, 0.5)' 
                      : '0 0 20px rgba(255, 255, 255, 0.3), 0 4px 12px rgba(0,0,0,0.4)',
                    border: '2px solid #e2e8f0',
                    animation: turnPhase === 'waiting_deck_action' ? 'pulse 2s ease-in-out infinite' : 'none',
                  }}>
                    <Image
                      src={`${CARDS_PATH}${currentCard}`}
                      alt="Current Card"
                      width={36}
                      height={54}
                      style={{ 
                        borderRadius: '6px',
                        opacity: 1,
                        filter: 'none',
                        visibility: 'visible',
                        display: 'block'
                      }}
                      priority
                    />
                  </div>
                )}
                
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
                    const humanPlayer = players.find(p => p.isUser);
                    if (currentPlayerId === humanPlayer?.id && (turnPhase === 'showing_deck_hint' || turnPhase === 'waiting_deck_action')) {
                      console.log('🎴 [КЛИК НА КОЛОДУ] Игрок кликнул на колоду');
                      onDeckClick();
                    } else if (currentPlayerId !== humanPlayer?.id) {
                      console.log('⛔ [КЛИК НА КОЛОДУ] Сейчас не ваш ход');
                    } else {
                      showNotification('Сначала попробуйте сходить из руки!', 'warning', 2000);
                    }
                  }}
                  onMouseEnter={(e) => {
                    const humanPlayer = players.find(p => p.isUser);
                    if (currentPlayerId === humanPlayer?.id && (turnPhase === 'showing_deck_hint' || turnPhase === 'waiting_deck_action')) {
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

                return (
                  <div
                  key={player.id}
                  className={`${styles.playerSeat} ${isCurrentTurn ? styles.activePlayer : ''}`}
                    style={{
                    left: `${position.x}%`,
                    top: `${position.y}%`,
                  }}
                >
                  {/* Аватар и имя */}
                    <div className={styles.avatarWrap}>
                      <div 
                        className={styles.avatarContainer}
                        onClick={(e) => {
                          e.stopPropagation();
                          handlePlayerClick(player);
                        }}
                        style={{ cursor: 'pointer' }}
                      >
                          <Image 
                        src={playerAvatars[player.id] || player.avatar || '/images/default-avatar.png'}
                        alt={player.name}
                        width={40}
                        height={40}
                            className={styles.avatar}
                          />
                      {player.isBot && (
                        <div className={styles.botBadge}>🤖</div>
                        )}
                          </div>
                    <span className={styles.playerName}>{player.name}</span>
                    </div>
                    
                  {/* Карты игрока */}
                  {playerCards.length > 0 && (
                    <div className={styles.cardsContainer}>
                      <div className={styles.activeCardContainer}>
                        {playerCards.slice(0, 3).map((card: any, cardIndex: number) => {
                          // Карта может быть строкой "7_of_spades.png(open)" или объектом {rank, suit, image}
                          const cardImage = typeof card === 'string' 
                            ? card.replace('(open)', '').replace('(closed)', '')
                            : card.image || `${card.rank}_of_${card.suit}.png`;
                          
                          // В 1-й стадии ВСЕ карты открыты! Со 2-й стадии - только свои или помеченные (open)
                          const showOpen = gameStage === 1 || isHumanPlayer || (typeof card === 'string' && card.includes('(open)')) || card.open;
                          
                          // ЛОГИКА ДЛЯ 1-Й СТАДИИ: подсветка верхней карты если можно ходить
                          const isTopCard = cardIndex === playerCards.length - 1;
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
                          
                          return (
                            <div 
                              key={cardIndex} 
                              className={styles.cardOnPenki} 
                              style={{
                                marginLeft: cardIndex > 0 ? '-54px' : '0', // 90% перекрытие (60px * 0.9 = 54px)
                                zIndex: cardIndex, // Верхние карты выше
                                cursor: (shouldHighlight || isAvailableTarget) ? 'pointer' : 'default',
                                position: 'relative',
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
                              <Image
                                src={showOpen ? `${CARDS_PATH}${cardImage}` : `${CARDS_PATH}${CARD_BACK}`}
                                alt={showOpen ? cardImage : 'Card'}
                                width={60}
                                height={90}
                                style={{ 
                                  borderRadius: '8px', 
                                  opacity: 1,
                                  filter: shouldHighlight || isAvailableTarget ? 'brightness(1.2)' : 'none',
                                  visibility: 'visible',
                                  display: 'block',
                                  boxShadow: shouldHighlight 
                                    ? '0 0 20px rgba(40, 167, 69, 0.8), 0 0 30px rgba(40, 167, 69, 0.5)' 
                                    : isAvailableTarget 
                                    ? '0 0 20px rgba(59, 130, 246, 0.8), 0 0 30px rgba(59, 130, 246, 0.5)'
                                    : 'none',
                                  transition: 'all 0.3s ease',
                                }}
                                priority
                              />
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

      {/* ПАНЕЛЬ ДЕЙСТВИЙ С ОТКРЫТОЙ КАРТОЙ ИЗ КОЛОДЫ - 1-Я СТАДИЯ */}
      {isGameActive && gameStage === 1 && turnPhase === 'waiting_deck_action' && humanPlayer?.id === currentPlayerId && revealedDeckCard && (
        <div style={{
          position: 'fixed',
          bottom: '20px',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 200,
          background: 'linear-gradient(145deg, rgba(30, 41, 59, 0.98) 0%, rgba(15, 23, 42, 0.98) 100%)',
          backdropFilter: 'blur(20px)',
          borderRadius: '16px',
          padding: '20px',
          boxShadow: '0 10px 40px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(99, 102, 241, 0.3)',
          border: '2px solid rgba(99, 102, 241, 0.4)',
          minWidth: '320px',
          maxWidth: '90vw',
        }}>
          <div style={{
            textAlign: 'center',
            marginBottom: '16px',
          }}>
            <div style={{
              fontSize: '14px',
              color: '#94a3b8',
              marginBottom: '12px',
              fontWeight: '600',
            }}>Открыта карта из колоды:</div>
            
            {/* Отображение открытой карты */}
            <div style={{
              display: 'flex',
              justifyContent: 'center',
              marginBottom: '16px',
            }}>
              <div style={{
                background: '#ffffff',
                borderRadius: '12px',
                padding: '4px',
                boxShadow: '0 8px 24px rgba(99, 102, 241, 0.4)',
              }}>
                <Image
                  src={`${CARDS_PATH}${revealedDeckCard.image}`}
                  alt="Revealed Card"
                  width={80}
                  height={120}
                  style={{ borderRadius: '8px' }}
                  priority
                />
              </div>
            </div>

            {/* Кнопки действий */}
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
            }}>
              {(() => {
                const state = useGameStore.getState();
                const deckTargets = state.findAvailableTargetsForDeckCard?.(revealedDeckCard) || [];
                const canPlaceOnSelf = humanPlayer.cards.length > 0 && state.canPlaceCardOnSelf?.(
                  revealedDeckCard,
                  humanPlayer.cards[humanPlayer.cards.length - 1]
                );

                return (
                  <>
                    {/* Кнопка "Положить на соперника" если есть цели */}
                    {deckTargets.length > 0 && (
                      <button
                        onClick={() => {
                          const targetIndex = deckTargets[0];
                          const targetPlayer = players[targetIndex];
                          console.log(`🎴 [Действие с картой] Кладем на соперника: ${targetPlayer.name}`);
                          makeMove(targetPlayer.id);
                        }}
                        style={{
                          background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                          color: 'white',
                          border: 'none',
                          borderRadius: '12px',
                          padding: '14px 20px',
                          fontSize: '15px',
                          fontWeight: '700',
                          cursor: 'pointer',
                          boxShadow: '0 4px 15px rgba(16, 185, 129, 0.4)',
                          transition: 'all 0.3s ease',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.transform = 'translateY(-2px)';
                          e.currentTarget.style.boxShadow = '0 6px 20px rgba(16, 185, 129, 0.5)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.transform = 'translateY(0)';
                          e.currentTarget.style.boxShadow = '0 4px 15px rgba(16, 185, 129, 0.4)';
                        }}
                      >
                        ✅ Положить на соперника ({players[deckTargets[0]].name})
                      </button>
                    )}

                    {/* Кнопка "Положить себе" УДАЛЕНА - теперь автоматически */}

                    {/* Кнопка "Взять себе" если нет других ходов */}
                    {deckTargets.length === 0 && !canPlaceOnSelf && (
                      <button
                        onClick={() => {
                          console.log(`🎴 [Действие с картой] Берем себе (не по правилам)`);
                          const state = useGameStore.getState();
                          state.takeCardNotByRules?.();
                        }}
                        style={{
                          background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                          color: 'white',
                          border: 'none',
                          borderRadius: '12px',
                          padding: '14px 20px',
                          fontSize: '15px',
                          fontWeight: '700',
                          cursor: 'pointer',
                          boxShadow: '0 4px 15px rgba(245, 158, 11, 0.4)',
                          transition: 'all 0.3s ease',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.transform = 'translateY(-2px)';
                          e.currentTarget.style.boxShadow = '0 6px 20px rgba(245, 158, 11, 0.5)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.transform = 'translateY(0)';
                          e.currentTarget.style.boxShadow = '0 4px 15px rgba(245, 158, 11, 0.4)';
                        }}
                      >
                        ⬇️ Взять себе (нет ходов)
                      </button>
                    )}
                  </>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {/* Рука игрока внизу экрана - ТОЛЬКО СО 2-Й СТАДИИ! */}
      {isGameActive && gameStage >= 2 && humanPlayer && humanPlayer.cards && humanPlayer.cards.length > 0 && (
        <div className={styles.playerHand}>
          <div className={styles.handCards}>
            {humanPlayer.cards.map((card: any, index: number) => {
              // Карта может быть строкой "7_of_spades.png(open)" или объектом {rank, suit, image}
              const cardImage = typeof card === 'string' 
                ? card.replace('(open)', '').replace('(closed)', '')
                : card.image || `${card.rank}_of_${card.suit}.png`;
              
              // Проверяем можно ли сыграть эту карту
              const isMyTurn = humanPlayer.id === currentPlayerId;
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
                  style={{
                    zIndex: isSelected ? 100 : index,
                    cursor: isMyTurn ? 'pointer' : 'not-allowed',
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
                  <Image
                    src={`${CARDS_PATH}${cardImage}`}
                    alt={cardImage}
                    width={70}
                    height={105}
                    style={{ 
                      borderRadius: '8px', 
                      opacity: isMyTurn ? 1 : 0.6,
                      filter: canPlay ? 'brightness(1.1)' : 'none',
                      visibility: 'visible',
                      display: 'block',
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
      
      {/* Экран победителя */}
      {winner && (
        <WinnerScreen
          winner={winner}
          isVisible={showWinnerScreen}
          onClose={() => {
            setShowWinnerScreen(false);
            setWinner(null);
          }}
          onPlayAgain={() => {
            setShowWinnerScreen(false);
            setWinner(null);
            handleStartGame();
          }}
        />
      )}

      {/* Модальное окно профиля игрока */}
      <PlayerProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        playerData={selectedPlayerProfile}
        onAddFriend={handleAddFriend}
      />
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