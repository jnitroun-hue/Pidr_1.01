"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { User } from '../types/game';
import { useTelegram } from '../hooks/useTelegram';
import NeonMainMenu from '../components/main_menu_component';

/**
 * P.I.D.R. Game - Автоматическая авторизация через Telegram WebApp
 * Создание пользователя в БД и прямой вход в игру
 */
function HomeWithParams() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const { user: telegramUser, isReady } = useTelegram();
  const router = useRouter();

  useEffect(() => {
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
            setLoading(false);
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
          if (attempts < 15) { // Увеличиваем до 15 попыток
            sessionStorage.setItem('auth_attempts', (attempts + 1).toString());
            setTimeout(initializePlayer, 1000);
          } else {
            console.log('❌ Превышено количество попыток ожидания WebApp');
            setError('Telegram WebApp не готов. Попробуйте перезапустить бота.');
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
          setLoading(false);
          
          console.log('🎉 ДОБРО ПОЖАЛОВАТЬ В P.I.D.R. GAME!');
          console.log(`💰 Ваш баланс: ${newUser.coins} монет`);
          
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

  // Показываем загрузку с красивыми картами
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900 flex items-center justify-center overflow-hidden">
        <div className="text-center relative">
          {/* Анимированные карты */}
          <div className="relative mb-8">
            <div className="flex justify-center items-center space-x-4 mb-6">
              {['10', 'J', 'Q', 'K', 'A'].map((card, index) => (
                <div
                  key={card}
                  className="w-16 h-24 bg-gradient-to-br from-red-600 to-red-800 rounded-lg shadow-2xl flex items-center justify-center text-white font-bold text-xl border-2 border-red-400 transform transition-all duration-1000"
                  style={{
                    animationDelay: `${index * 0.2}s`,
                    animation: `float 2s ease-in-out infinite ${index * 0.2}s, shimmer 3s ease-in-out infinite ${index * 0.3}s`,
                    boxShadow: '0 0 20px rgba(239, 68, 68, 0.5)',
                  }}
                >
                  {card}
                </div>
              ))}
            </div>
            
            {/* Переливающийся эффект */}
            <div 
              className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
              style={{ animation: 'shimmer 2s infinite' }}
            ></div>
          </div>

          {/* Заголовок */}
          <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-red-400 via-yellow-400 to-red-400 bg-clip-text text-transparent animate-pulse">
            P.I.D.R. Game
          </h1>
          
          {/* Загрузка */}
          <div className="flex items-center justify-center space-x-2 mb-4">
            <div className="w-2 h-2 bg-red-400 rounded-full animate-bounce"></div>
            <div className="w-2 h-2 bg-yellow-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
            <div className="w-2 h-2 bg-red-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
          </div>
          
          <p className="text-xl text-gray-300 animate-pulse">Загрузка...</p>
          <p className="text-sm text-gray-400 mt-2">Авторизация через Telegram</p>

          {/* Стили для анимаций */}
          <style jsx>{`
            @keyframes shimmer {
              0% { transform: translateX(-100%); }
              100% { transform: translateX(100%); }
            }
            
            @keyframes float {
              0%, 100% { 
                transform: translateY(0px) rotate(${Math.random() * 10 - 5}deg); 
              }
              50% { 
                transform: translateY(-10px) rotate(${Math.random() * 10 - 5}deg); 
              }
            }
          `}</style>
        </div>
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
  if (user) {
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