"use client";

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
// Интерфейс пользователя
interface User {
  id: string;
  username: string;
  firstName?: string;
  lastName?: string;
  telegramId?: string;
  coins: number;
  rating: number;
  gamesPlayed: number;
  gamesWon: number;
  photoUrl?: string;
}
import { useTelegram } from '../hooks/useTelegram';
import NeonMainMenu from '../components/main_menu_component';
import CardLoadingScreen from '../components/CardLoadingScreen';
import { useLanguage } from '../components/LanguageSwitcher';
import RoomInviteModal from '../components/RoomInviteModal';

/**
 * P.I.D.R. Game - Автоматическая авторизация через Telegram WebApp
 * Создание пользователя в БД и прямой вход в игру
 */
function HomeWithParams() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [showMainMenu, setShowMainMenu] = useState(false);
  const [error, setError] = useState<string>('');
  const [isBrowser, setIsBrowser] = useState(false); // ✅ НОВОЕ: Определяем браузер vs mini app
  const [retryCount, setRetryCount] = useState(0); // ✅ НОВОЕ: Счетчик попыток
  const initialized = useRef(false); // ✅ useRef - НЕ СБРАСЫВАЕТСЯ при рендере
  const { user: telegramUser, isReady } = useTelegram();
  const { language } = useLanguage();
  const router = useRouter();
  
  // ✅ СОСТОЯНИЕ ДЛЯ ПРИГЛАШЕНИЯ В КОМНАТУ
  const [roomInvite, setRoomInvite] = useState<{ roomId: string; roomCode: string } | null>(null);
  const [showRoomInviteModal, setShowRoomInviteModal] = useState(false);

  // ✅ ОПРЕДЕЛЯЕМ: БРАУЗЕР ИЛИ MINI APP
  const isTelegramMiniApp = (): boolean => {
    if (typeof window === 'undefined') return false;
    const tg = (window as any).Telegram?.WebApp;
    // Проверяем что это реальный Telegram Mini App (не mock)
    return !!(tg && tg.initData && tg.initData.length > 0);
  };

  useEffect(() => {
    // ✅ ЗАЩИТА ОТ ПОВТОРНОГО ЗАПУСКА
    if (initialized.current) {
      console.log('🛡️ Уже инициализировано - пропускаем');
      return;
    }
    
    console.log('🎮 P.I.D.R. GAME - АВТОМАТИЧЕСКАЯ АВТОРИЗАЦИЯ');
    
    // ✅ ПРОВЕРЯЕМ: БРАУЗЕР ИЛИ MINI APP
    const isMiniApp = isTelegramMiniApp();
    console.log('📱 Telegram Mini App:', isMiniApp);
    
    if (!isMiniApp) {
      console.log('🌐 Обнаружен браузер - проверяем авторизацию');
      
      // Проверяем, есть ли токен авторизации
      const checkAuth = async () => {
        try {
          const sessionResponse = await fetch('/api/auth', {
            method: 'GET',
            credentials: 'include'
          });

          if (sessionResponse.ok) {
            const sessionData = await sessionResponse.json();
            
            if (sessionData.success && sessionData.user) {
              console.log('✅ Найдена активная сессия в браузере:', sessionData.user.username);
              
              const existingUser: User = {
                id: sessionData.user.id,
                username: sessionData.user.username,
                firstName: sessionData.user.firstName || sessionData.user.username,
                lastName: sessionData.user.lastName || '',
                telegramId: sessionData.user.telegramId || '',
                coins: sessionData.user.coins || 1000,
                rating: sessionData.user.rating || 0,
                gamesPlayed: sessionData.user.gamesPlayed || 0,
                gamesWon: sessionData.user.gamesWon || 0,
                photoUrl: sessionData.user.photoUrl || ''
              };
              
              setUser(existingUser);
              initialized.current = true;
              setTimeout(() => {
                setLoading(false);
                setTimeout(() => setShowMainMenu(true), 100);
              }, 500);
              return;
            }
          }
        } catch (error) {
          console.error('❌ Ошибка проверки авторизации:', error);
        }
        
        // Если нет авторизации - показываем страницу входа/регистрации
        console.log('📝 Нет активной сессии - показываем страницу входа/регистрации');
        setIsBrowser(true);
        setLoading(false);
        initialized.current = true;
      };
      
      checkAuth();
      return;
    }
    
    // ✅ ПРОВЕРКА ПЕРВОГО ВХОДА - ПЕРЕНАПРАВЛЕНИЕ НА WELCOME
    const isFirstVisit = typeof window !== 'undefined' && !localStorage.getItem('pidr_visited');
    if (isFirstVisit) {
      console.log('👋 Первый визит - перенаправление на welcome');
      localStorage.setItem('pidr_visited', 'true');
      router.push('/welcome');
      return;
    }
    
    const initializePlayer = async () => {
      if (typeof window === 'undefined') {
        setLoading(false);
        return;
      }

      try {
        // ✅ КРИТИЧНО: Получаем telegram_id из Telegram WebApp для проверки
        const telegramUser = typeof window !== 'undefined' && (window as any).Telegram?.WebApp?.initDataUnsafe?.user;
        const telegramId = telegramUser?.id?.toString() || '';
        
        if (!telegramId) {
          console.warn('⚠️ Telegram ID не найден');
          // ✅ ЖДЕМ ИНИЦИАЛИЗАЦИИ TELEGRAM WEBAPP (до 3 секунд)
          if (retryCount < 3) {
            console.log(`🔄 Попытка ${retryCount + 1}/3 - ждем инициализации Telegram...`);
            setTimeout(() => {
              setRetryCount(prev => prev + 1);
            }, 1000);
            return;
          }
          // После 3 попыток показываем браузерную версию
          console.warn('⚠️ Telegram не инициализировался, показываем браузерную версию');
          setIsBrowser(true);
          setLoading(false);
          initialized.current = true;
          return;
        } else {
          console.log('🔍 Проверяем активную сессию для telegram_id:', telegramId);
        }
        
        // ✅ КРИТИЧНО: Отправляем x-telegram-id header для проверки безопасности
        const headers: HeadersInit = {
          'Content-Type': 'application/json'
        };
        
        if (telegramId) {
          headers['x-telegram-id'] = telegramId;
          headers['x-username'] = telegramUser?.username || telegramUser?.first_name || '';
        }
        
        const sessionResponse = await fetch('/api/auth', {
          method: 'GET',
          credentials: 'include',
          headers // ✅ ДОБАВЛЯЕМ headers с x-telegram-id!
        });

        if (sessionResponse.ok) {
          const sessionData = await sessionResponse.json();
          
          if (sessionData.success && sessionData.user) {
            // ✅ КРИТИЧНО: Проверяем что пользователь из сессии совпадает с Telegram ID
            const sessionTelegramId = String(sessionData.user.telegramId || '');
            const currentTelegramId = String(telegramId || '');
            
            if (telegramId && sessionTelegramId !== currentTelegramId) {
              console.error('🚨 КРИТИЧЕСКАЯ ОШИБКА: Пользователь из сессии не совпадает с Telegram ID!', {
                sessionUser: sessionData.user.username,
                sessionTelegramId,
                currentTelegramId,
                action: 'ОТКЛОНЯЕМ СЕССИЮ И ПЕРЕАВТОРИЗУЕМСЯ'
              });
              
              // Удаляем неверную сессию и переавторизуемся
              await fetch('/api/auth', {
                method: 'DELETE',
                credentials: 'include'
              });
              
              // Продолжаем с новой авторизацией - не throw, просто продолжаем
              console.log('🔄 Продолжаем с новой авторизацией...');
            } else {
              console.log('✅ Активная сессия найдена и проверена:', sessionData.user.username);
              
              const existingUser: User = {
                id: sessionData.user.id,
                username: sessionData.user.username,
                firstName: sessionData.user.firstName || sessionData.user.username,
                lastName: sessionData.user.lastName || '',
                telegramId: sessionData.user.telegramId || telegramId,
                coins: sessionData.user.coins || 1000,
                rating: sessionData.user.rating || 0,
                gamesPlayed: sessionData.user.gamesPlayed || 0,
                gamesWon: sessionData.user.gamesWon || 0,
                photoUrl: sessionData.user.photoUrl || ''
              };
              
              setUser(existingUser);
              initialized.current = true;
              setTimeout(() => {
                setLoading(false);
                setTimeout(() => setShowMainMenu(true), 100);
              }, 1500);
              console.log('🚀 ДОБРО ПОЖАЛОВАТЬ ОБРАТНО В P.I.D.R.!');
              return;
            }
          }
        } else if (sessionResponse.status === 401 || sessionResponse.status === 403) {
          // ✅ 401 = не авторизован (нормально), 403 = запрещено
          console.log('📝 Сессия не найдена или истекла, авторизуемся заново...');
        }

        // Если нет сессии, авторизуемся через Telegram
        // ✅ ПРОСТАЯ ЛОГИКА: Берем данные напрямую из window.Telegram.WebApp
        let telegramUserData = null;
        
        // Проверяем window.Telegram.WebApp напрямую
        if (typeof window !== 'undefined') {
          const tg = (window as any).Telegram;
          if (tg?.WebApp?.initDataUnsafe?.user) {
            telegramUserData = tg.WebApp.initDataUnsafe.user;
            console.log('✅ Данные Telegram пользователя получены:', telegramUserData.id);
          }
        }

        if (telegramUserData && telegramUserData.id) {
          console.log('📱 Создаем/авторизуем пользователя через БД...');
          await createUserThroughDatabase(telegramUserData);
        } else {
          console.error('❌ Telegram WebApp данные недоступны');
          // ✅ Показываем браузерную версию вместо ошибки
          setIsBrowser(true);
          setLoading(false);
          initialized.current = true;
        }

      } catch (error: any) {
        console.error('❌ Ошибка инициализации:', error);
        // ✅ Более информативная ошибка
        const errorMessage = error?.message || 'Неизвестная ошибка';
        if (errorMessage.includes('fetch') || errorMessage.includes('network')) {
          setError('Ошибка подключения к серверу. Проверьте интернет-соединение.');
        } else {
          setError(`Ошибка: ${errorMessage}`);
        }
        setLoading(false);
      }
    };
    
    const createUserThroughDatabase = async (telegramUser: any) => {
      console.log('🌐 Создание/авторизация пользователя в БД...');
      
      // ✅ ОБРАБОТКА РЕФЕРАЛЬНОЙ ССЫЛКИ И ПРИГЛАШЕНИЯ В КОМНАТУ
      const tgWebApp = typeof window !== 'undefined' && (window as any).Telegram?.WebApp;
      const referralParam = tgWebApp?.initDataUnsafe?.start_param;
      let referrerId: string | null = null;
      
      // ✅ ОБРАБОТКА ПРИГЛАШЕНИЯ В КОМНАТУ (формат: join_${roomId}_${roomCode} или join_${roomId}_${roomCode}_ref_${referralCode})
      let roomInviteData: { roomId: string; roomCode: string } | null = null;
      if (referralParam && referralParam.startsWith('join_')) {
        const parts = referralParam.replace('join_', '').split('_');
        // Ищем ref_ в параметрах
        const refIndex = parts.findIndex((p: string) => p === 'ref');
        if (refIndex !== -1 && parts[refIndex + 1]) {
          // Есть ref параметр
          referrerId = parts[refIndex + 1];
          console.log('🎁 Реферальная ссылка обнаружена в приглашении в комнату! Пригласил:', referrerId);
          // Убираем ref часть из parts
          parts.splice(refIndex, 2);
        }
        if (parts.length >= 2) {
          const roomId = parts[0];
          const roomCode = parts.slice(1).join('_'); // На случай если roomCode содержит подчеркивания
          console.log('🎮 Приглашение в комнату обнаружено!', { roomId, roomCode });
          roomInviteData = { roomId, roomCode };
          setRoomInvite(roomInviteData);
        }
      } else if (referralParam && referralParam.startsWith('invite_')) {
        // ✅ ОБРАБОТКА ПРИГЛАШЕНИЯ С REF (формат: invite_${id}_ref_${referralCode} или invite_${id})
        const parts = referralParam.replace('invite_', '').split('_');
        const refIndex = parts.findIndex((p: string) => p === 'ref');
        if (refIndex !== -1 && parts[refIndex + 1]) {
          // Есть ref параметр
          referrerId = parts[refIndex + 1];
          console.log('🎁 Реферальная ссылка обнаружена в приглашении! Пригласил:', referrerId);
        } else {
          // Нет ref, используем invite ID как referrerId
          referrerId = parts[0];
          console.log('🎁 Реферальная ссылка обнаружена! Пригласил:', referrerId);
        }
      } else if (referralParam && referralParam.startsWith('ref_')) {
        // ✅ ОБРАБОТКА ПРОСТОЙ РЕФЕРАЛЬНОЙ ССЫЛКИ
        referrerId = referralParam.replace('ref_', '');
        console.log('🎁 Реферальная ссылка обнаружена! Пригласил:', referrerId);
      }
      
      const authData = {
        telegramId: String(telegramUser.id),
        username: telegramUser?.username || `user_${telegramUser.id}`,
        firstName: telegramUser?.first_name || 'Игрок',
        lastName: telegramUser?.last_name || '',
        photoUrl: telegramUser?.photo_url || null,
        referrerId: referrerId // ✅ Передаем ID приглашающего
      };
      
      console.log('📤 Отправляем данные:', authData);
      
      try {
        const response = await fetch('/api/auth', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          credentials: 'include',
          body: JSON.stringify(authData)
        });
        
        if (!response.ok) {
          throw new Error(`API ответил с ошибкой: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.success && data.user) {
          console.log('✅ Пользователь создан/авторизован:', data.user.username);
          
          const newUser: User = {
            id: data.user.id,
            username: data.user.username,
            firstName: data.user.firstName || data.user.username,
            lastName: data.user.lastName || '',
            telegramId: data.user.telegramId || String(telegramUser.id),
            coins: data.user.coins || 1000,
            rating: data.user.rating || 0,
            gamesPlayed: data.user.gamesPlayed || 0,
            gamesWon: data.user.gamesWon || 0,
            photoUrl: data.user.photoUrl || ''
          };
          
          setUser(newUser);
          
          initialized.current = true; // ✅ Устанавливаем флаг через useRef
          
          // ✅ ПРОВЕРЯЕМ ПРИГЛАШЕНИЕ В КОМНАТУ ПОСЛЕ АВТОРИЗАЦИИ
          // Используем roomInviteData из замыкания функции createUserThroughDatabase
          if (roomInviteData) {
            // Проверяем статус пользователя (онлайн и не в игре)
            const checkUserStatus = async () => {
              try {
                const statusResponse = await fetch('/api/auth', {
                  method: 'GET',
                  credentials: 'include',
                  headers: {
                    'x-telegram-id': String(telegramUser.id),
                    'x-username': telegramUser.username || telegramUser.first_name || 'User'
                  }
                });
                
                if (statusResponse.ok) {
                  const statusData = await statusResponse.json();
                  if (statusData.success && statusData.user) {
                    const userStatus = statusData.user.status;
                    // Показываем модальное окно только если пользователь онлайн и не в игре
                    if (userStatus === 'online' && userStatus !== 'playing' && userStatus !== 'in_room') {
                      console.log('✅ Пользователь онлайн, показываем приглашение в комнату');
                      setTimeout(() => {
                        setShowRoomInviteModal(true);
                      }, 500);
                    } else {
                      console.log('⚠️ Пользователь не онлайн или уже в игре, пропускаем приглашение. Статус:', userStatus);
                    }
                  }
                }
              } catch (err: unknown) {
                console.error('❌ Ошибка проверки статуса пользователя:', err);
              }
            };
            
            checkUserStatus();
          }
          
          setTimeout(() => {
            setLoading(false);
            setTimeout(() => setShowMainMenu(true), 100);
          }, 2000);
          
          console.log('🎉 ДОБРО ПОЖАЛОВАТЬ В P.I.D.R. GAME!');
          console.log(`💰 Ваш баланс: ${newUser.coins} монет`);
          
          // Проверяем, что cookie установлен
          setTimeout(async () => {
            try {
              const checkResponse = await fetch('/api/auth', {
                method: 'GET',
                credentials: 'include',
                headers: {
                  'x-telegram-id': String(telegramUser.id),
                  'x-username': telegramUser.username || telegramUser.first_name || 'User'
                }
              });
              console.log('🍪 Проверка cookie после авторизации:', checkResponse.status);
              if (!checkResponse.ok) {
                console.warn('⚠️ Cookie не установлен корректно, но пользователь создан');
              }
            } catch (error: unknown) {
              console.warn('⚠️ Не удалось проверить cookie:', error);
            }
          }, 1000);
          
        } else {
          throw new Error(data.message || 'Ошибка создания пользователя');
        }
        
      } catch (error: any) {
        console.error('❌ Ошибка создания пользователя:', error);
        setError('Не удалось авторизоваться. Попробуйте перезапустить бота.');
        setLoading(false);
      }
    };

    initializePlayer();
  }, [retryCount]); // ✅ Перезапускается при изменении retryCount для retry логики

  const handleLogout = async () => {
    try {
      await fetch('/api/auth', {
        method: 'DELETE',
        credentials: 'include'
      });
      setUser(null);
      console.log('👋 Выход выполнен');
    } catch (error: unknown) {
      console.error('❌ Ошибка выхода:', error);
    }
  };

  // Показываем экран загрузки с картами
  if (loading) {
    return (
      <CardLoadingScreen 
        language={language}
        onLoadingComplete={() => setShowMainMenu(true)}
        duration={user ? 1500 : 2500}
      />
    );
  }

  // Показываем профессиональную заставку загрузки (старая версия - оставляем как fallback)
  if (false) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-indigo-900 relative overflow-hidden flex items-center justify-center">
        {/* Фоновые элементы */}
        <div className="absolute inset-0">
          {/* Анимированные частицы */}
          {[...Array(30)].map((_, i) => (
            <div
              key={i}
              className="absolute w-1 h-1 bg-white/30 rounded-full"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animation: `twinkle ${2 + Math.random() * 4}s ease-in-out infinite ${Math.random() * 2}s`,
              }}
            />
          ))}
        </div>

        {/* Основной контейнер по центру */}
        <div className="relative z-10 text-center max-w-md mx-auto px-8">
          {/* Логотип игры */}
          <div className="mb-8 relative">
            <div className="w-24 h-24 mx-auto bg-gradient-to-br from-purple-500 via-pink-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-2xl border border-white/20 backdrop-blur-sm">
              <div className="text-4xl font-black text-white">P</div>
            </div>
            
            {/* Светящийся эффект */}
            <div className="absolute inset-0 w-24 h-24 mx-auto bg-gradient-to-br from-purple-500/40 to-pink-500/40 rounded-2xl blur-xl animate-pulse"></div>
          </div>

          {/* Название игры */}
          <h1 className="text-5xl font-black mb-2 bg-gradient-to-r from-purple-400 via-pink-400 to-indigo-400 bg-clip-text text-transparent">
            P.I.D.R.
          </h1>
          <p className="text-xl text-gray-300 mb-8 font-light tracking-wide">Game</p>

          {/* Анимированные карты 10, J, Q, K, A */}
          <div className="flex justify-center items-center space-x-2 mb-8">
            {['10', 'J', 'Q', 'K', 'A'].map((card, index) => (
              <div
                key={card}
                className="w-12 h-16 bg-gradient-to-br from-white/20 to-white/5 backdrop-blur-sm border border-white/30 rounded-lg flex items-center justify-center text-white font-bold text-sm shadow-lg transform transition-all duration-1000 relative overflow-hidden"
                style={{
                  animation: `cardFloat 3s ease-in-out infinite ${index * 0.3}s, shimmer 4s ease-in-out infinite ${index * 0.5}s`,
                }}
              >
                {/* Переливающийся эффект */}
                <div 
                  className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -skew-x-12"
                  style={{ 
                    animation: `cardShimmer 3s ease-in-out infinite ${index * 0.4}s`,
                  }}
                />
                <span className="relative z-10">{card}</span>
              </div>
            ))}
          </div>

          {/* Прогресс загрузки */}
          <div className="w-full max-w-xs mx-auto mb-6">
            <div className="bg-white/10 rounded-full h-3 backdrop-blur-sm border border-white/20 overflow-hidden">
              <div 
                className="bg-gradient-to-r from-purple-500 via-pink-500 to-indigo-500 h-full rounded-full shadow-inner"
                style={{ 
                  width: '70%',
                  animation: 'loadingProgress 2.5s ease-in-out infinite'
                }}
              />
            </div>
          </div>

          {/* Текст загрузки */}
          <div className="space-y-3">
            <p className="text-xl text-white font-medium">Загрузка игры...</p>
            <p className="text-sm text-white/70">Инициализация Telegram WebApp</p>
          </div>

          {/* Анимированные точки */}
          <div className="flex justify-center space-x-2 mt-6">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="w-2 h-2 bg-gradient-to-r from-purple-400 to-pink-400 rounded-full"
                style={{ 
                  animation: `bounce 1.5s ease-in-out infinite ${i * 0.2}s`
                }}
              />
            ))}
          </div>
        </div>

        {/* Улучшенные стили для анимаций */}
        <style jsx>{`
          @keyframes cardFloat {
            0%, 100% { 
              transform: translateY(0px) rotate(-2deg); 
            }
            50% { 
              transform: translateY(-8px) rotate(2deg); 
            }
          }
          
          @keyframes cardShimmer {
            0% { 
              transform: translateX(-100%) skewX(-12deg); 
            }
            100% { 
              transform: translateX(200%) skewX(-12deg); 
            }
          }
          
          @keyframes shimmer {
            0%, 100% { 
              box-shadow: 0 0 5px rgba(168, 85, 247, 0.4); 
            }
            50% { 
              box-shadow: 0 0 20px rgba(168, 85, 247, 0.8), 0 0 30px rgba(236, 72, 153, 0.6); 
            }
          }
          
          @keyframes loadingProgress {
            0% { width: 30%; }
            50% { width: 85%; }
            100% { width: 70%; }
          }
          
          @keyframes twinkle {
            0%, 100% { opacity: 0.3; transform: scale(1); }
            50% { opacity: 1; transform: scale(1.2); }
          }
          
          @keyframes bounce {
            0%, 20%, 50%, 80%, 100% { transform: translateY(0); }
            40% { transform: translateY(-8px); }
            60% { transform: translateY(-4px); }
          }
        `}</style>
      </div>
    );
  }

  // Показываем ошибку
  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-900 via-purple-900 to-indigo-900 flex items-center justify-center p-4">
        <div className="text-center max-w-md mx-auto">
          <div className="text-6xl mb-4">❌</div>
          <h2 className="text-2xl font-bold text-white mb-4">Ошибка</h2>
          <p className="text-red-200 mb-6">{error}</p>
          
          <div className="space-y-3">
            <button 
              onClick={() => {
                setError('');
                setLoading(true);
                setRetryCount(0);
                initialized.current = false;
              }} 
              className="w-full bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
            >
              Попробовать снова
            </button>
            
            <a 
              href="https://t.me/NotPidrBot"
              target="_blank"
              rel="noopener noreferrer"
              className="block w-full bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors text-center"
            >
              Открыть в Telegram
            </a>
          </div>
          
          <p className="text-gray-400 text-sm mt-4">
            Если проблема повторяется, перезапустите бота в Telegram
          </p>
        </div>
      </div>
    );
  }

  // Показываем главное меню игры
  if (user && showMainMenu) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
        <NeonMainMenu 
          user={user} 
          onLogout={handleLogout}
        />
        
        {/* ✅ МОДАЛЬНОЕ ОКНО ПРИГЛАШЕНИЯ В КОМНАТУ */}
        {roomInvite && (
          <RoomInviteModal
            isOpen={showRoomInviteModal}
            roomId={roomInvite.roomId}
            roomCode={roomInvite.roomCode}
            onClose={() => {
              setShowRoomInviteModal(false);
              setRoomInvite(null);
            }}
            onJoin={() => {
              setShowRoomInviteModal(false);
              setRoomInvite(null);
            }}
          />
        )}
      </div>
    );
  }

  // ✅ БРАУЗЕРНАЯ ВЕРСИЯ - ПОКАЗЫВАЕМ РЕГИСТРАЦИЮ
  if (isBrowser) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-indigo-900 flex items-center justify-center p-4">
        <div className="text-center max-w-md mx-auto">
          {/* Логотип */}
          <div className="mb-8">
            <div className="w-24 h-24 mx-auto bg-gradient-to-br from-purple-500 via-pink-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-2xl border border-white/20 mb-4">
              <div className="text-4xl font-black text-white">P</div>
            </div>
            <h1 className="text-4xl font-black bg-gradient-to-r from-purple-400 via-pink-400 to-indigo-400 bg-clip-text text-transparent">
              P.I.D.R.
            </h1>
            <p className="text-xl text-gray-300 mt-2">Game</p>
          </div>

          {/* Информация */}
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20 mb-6">
            <h2 className="text-xl font-bold text-white mb-4">🎮 Играй в Telegram!</h2>
            <p className="text-gray-300 mb-4">
              P.I.D.R. - это карточная игра, доступная как Telegram Mini App.
            </p>
            <p className="text-gray-400 text-sm mb-6">
              Для игры откройте бота в Telegram и нажмите кнопку "Играть".
            </p>
            
            {/* Кнопки авторизации */}
            <div className="flex flex-col gap-3 mb-4">
              <a 
                href="/auth/login"
                className="inline-flex items-center justify-center gap-2 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white px-8 py-4 rounded-xl font-bold text-lg transition-all duration-300 shadow-lg hover:shadow-green-500/50 w-full"
              >
                🔐 Войти
              </a>
              <a 
                href="/auth/register"
                className="inline-flex items-center justify-center gap-2 bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white px-8 py-4 rounded-xl font-bold text-lg transition-all duration-300 shadow-lg hover:shadow-purple-500/50 w-full"
              >
                ✨ Зарегистрироваться
              </a>
            </div>

            {/* Кнопка открыть в Telegram */}
            <a 
              href="https://t.me/NotPidrBot"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white px-8 py-4 rounded-xl font-bold text-lg transition-all duration-300 shadow-lg hover:shadow-blue-500/50 w-full"
            >
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.562 8.161c-.18 1.897-.962 6.502-1.359 8.627-.168.9-.5 1.201-.82 1.23-.697.064-1.226-.461-1.901-.903-1.056-.692-1.653-1.123-2.678-1.799-1.185-.781-.417-1.21.258-1.911.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.139-5.062 3.345-.479.329-.913.489-1.302.481-.428-.009-1.252-.242-1.865-.442-.752-.244-1.349-.374-1.297-.789.027-.216.324-.437.893-.663 3.498-1.524 5.831-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635.099-.002.321.023.465.141.121.099.154.232.17.325.015.093.034.305.019.471z"/>
              </svg>
              Открыть в Telegram
            </a>
          </div>

          {/* QR код или инструкции */}
          <div className="text-gray-400 text-sm">
            <p>Или найдите бота: <span className="text-purple-400 font-mono">@NotPidrBot</span></p>
          </div>
        </div>
      </div>
    );
  }

  // Fallback - не должно появляться
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-indigo-900 flex items-center justify-center">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-white mb-4">P.I.D.R. Game</h2>
        <p className="text-gray-300">Загрузка...</p>
      </div>
    </div>
  );
}

export default function HomePage() {
  return <HomeWithParams />;
}