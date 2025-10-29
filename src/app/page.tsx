"use client";

import { useState, useEffect } from 'react';
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

/**
 * P.I.D.R. Game - Автоматическая авторизация через Telegram WebApp
 * Создание пользователя в БД и прямой вход в игру
 */
function HomeWithParams() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [showMainMenu, setShowMainMenu] = useState(false);
  const [error, setError] = useState<string>('');
  const initialized = useRef(false); // ✅ useRef - НЕ СБРАСЫВАЕТСЯ при рендере
  const { user: telegramUser, isReady } = useTelegram();
  const { language } = useLanguage();
  const router = useRouter();

  useEffect(() => {
    // ✅ ЗАЩИТА ОТ ПОВТОРНОГО ЗАПУСКА
    if (initialized.current) {
      console.log('🛡️ Уже инициализировано - пропускаем');
      return;
    }
    
    console.log('🎮 P.I.D.R. GAME - АВТОМАТИЧЕСКАЯ АВТОРИЗАЦИЯ');
    
    const initializePlayer = async () => {
      if (typeof window === 'undefined') {
        setLoading(false);
        return;
      }

      try {
        // Проверяем активную сессию
        console.log('🔍 Проверяем активную сессию...');
        
        const sessionResponse = await fetch('/api/auth', {
          method: 'GET',
          credentials: 'include'
        });

        if (sessionResponse.ok) {
          const sessionData = await sessionResponse.json();
          
          if (sessionData.success && sessionData.user) {
            console.log('✅ Активная сессия найдена:', sessionData.user.username);
            
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
            initialized.current = true; // ✅ Устанавливаем флаг
            setTimeout(() => {
              setLoading(false);
              setTimeout(() => setShowMainMenu(true), 100);
            }, 1500);
            console.log('🚀 ДОБРО ПОЖАЛОВАТЬ ОБРАТНО В P.I.D.R.!');
            return;
          }
        }

        // Если нет сессии, авторизуемся через Telegram
        console.log('🔍 Состояние Telegram:', { 
          isReady, 
          hasTelegramUser: !!telegramUser, 
          telegramUserId: telegramUser?.id 
        });

        if (!isReady) {
          console.log('⏳ Ожидаем инициализацию Telegram WebApp...');
          
          // Ограничиваем количество попыток
          const attempts = parseInt(sessionStorage.getItem('auth_attempts') || '0');
          if (attempts < 5) { // Уменьшаем попытки для быстрого fallback
            sessionStorage.setItem('auth_attempts', (attempts + 1).toString());
            setTimeout(initializePlayer, 1000);
          } else {
            console.log('❌ Telegram WebApp не инициализировался');
            setError('Не удалось подключиться к Telegram. Попробуйте перезапустить бота.');
            setLoading(false);
          }
          return;
        }

        if (telegramUser && telegramUser.id) {
          console.log('📱 Telegram WebApp данные получены, создаем пользователя...');
          console.log('👤 Telegram User:', {
            id: telegramUser.id,
            username: telegramUser.username,
            first_name: telegramUser.first_name
          });
          
          // Сбрасываем счетчик попыток
          sessionStorage.removeItem('auth_attempts');
          
          await createUserThroughDatabase(telegramUser);
        } else {
          console.log('❌ Telegram WebApp готов, но данные пользователя недоступны');
          console.log('📊 telegramUser полный объект:', telegramUser);
          
          // Попробуем получить данные из window.Telegram
          if (typeof window !== 'undefined' && (window as any).Telegram?.WebApp) {
            const tgWebApp = (window as any).Telegram.WebApp;
            console.log('🔍 Проверяем window.Telegram.WebApp:', {
              initDataUnsafe: tgWebApp.initDataUnsafe,
              user: tgWebApp.initDataUnsafe?.user
            });
            
            if (tgWebApp.initDataUnsafe?.user) {
              console.log('✅ Найдены данные в window.Telegram.WebApp');
              await createUserThroughDatabase(tgWebApp.initDataUnsafe.user);
              return;
            }
          }
          
          setError('Не удалось получить данные пользователя из Telegram. Попробуйте перезапустить бота.');
          setLoading(false);
        }

      } catch (error) {
        console.error('❌ Ошибка инициализации:', error);
        setError('Ошибка подключения к серверу');
        setLoading(false);
      }
    };
    
    const createUserThroughDatabase = async (telegramUser: any) => {
      console.log('🌐 Создание/авторизация пользователя в БД...');
      
      const authData = {
        telegramId: String(telegramUser.id),
        username: telegramUser?.username || `user_${telegramUser.id}`,
        firstName: telegramUser?.first_name || 'Игрок',
        lastName: telegramUser?.last_name || '',
        photoUrl: telegramUser?.photo_url || null
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
          
          setInitialized(true); // ✅ Устанавливаем флаг
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
                credentials: 'include'
              });
              console.log('🍪 Проверка cookie после авторизации:', checkResponse.status);
              if (!checkResponse.ok) {
                console.warn('⚠️ Cookie не установлен корректно, но пользователь создан');
              }
            } catch (error) {
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
  }, [isReady, telegramUser]);

  const handleLogout = async () => {
    try {
      await fetch('/api/auth', {
        method: 'DELETE',
        credentials: 'include'
      });
      setUser(null);
      console.log('👋 Выход выполнен');
    } catch (error) {
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
      <div className="min-h-screen bg-gradient-to-br from-red-900 via-purple-900 to-indigo-900 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <div className="text-6xl mb-4">❌</div>
          <h2 className="text-2xl font-bold text-white mb-4">Ошибка</h2>
          <p className="text-red-200 mb-6">{error}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-lg font-semibold"
          >
            Попробовать снова
          </button>
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
      </div>
    );
  }

  // Fallback - не должно появляться
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-indigo-900 flex items-center justify-center">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-white mb-4">P.I.D.R. Game</h2>
        <p className="text-gray-300">Запустите бота через Telegram</p>
      </div>
    </div>
  );
}

export default function HomePage() {
  return <HomeWithParams />;
}