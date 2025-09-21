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

  // Показываем загрузку в стиле игры
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-indigo-900 relative overflow-hidden">
        {/* Фоновые элементы */}
        <div className="absolute inset-0">
          {/* Анимированные частицы */}
          {[...Array(20)].map((_, i) => (
            <div
              key={i}
              className="absolute w-2 h-2 bg-white/20 rounded-full animate-pulse"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 2}s`,
                animationDuration: `${2 + Math.random() * 3}s`,
              }}
            />
          ))}
        </div>

        {/* Основной контент */}
        <div className="relative z-10 flex items-center justify-center min-h-screen">
          <div className="text-center px-6">
            {/* Логотип/Иконка игры */}
            <div className="mb-8 relative">
              <div className="w-32 h-32 mx-auto bg-gradient-to-br from-purple-500 to-indigo-600 rounded-3xl flex items-center justify-center shadow-2xl transform rotate-3 hover:rotate-0 transition-transform duration-500">
                <div className="text-6xl font-black text-white">P</div>
              </div>
              
              {/* Светящийся эффект */}
              <div className="absolute inset-0 w-32 h-32 mx-auto bg-gradient-to-br from-purple-500/50 to-indigo-600/50 rounded-3xl blur-xl animate-pulse"></div>
            </div>

            {/* Название игры */}
            <h1 className="text-6xl font-black mb-2 bg-gradient-to-r from-purple-400 via-pink-400 to-indigo-400 bg-clip-text text-transparent">
              P.I.D.R.
            </h1>
            <p className="text-2xl text-gray-300 mb-8 font-light">Game</p>

            {/* Анимированные карты */}
            <div className="flex justify-center items-center space-x-3 mb-8">
              {['♠', '♥', '♦', '♣'].map((suit, index) => (
                <div
                  key={suit}
                  className="w-12 h-16 bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg flex items-center justify-center text-2xl transform transition-all duration-1000"
                  style={{
                    animationDelay: `${index * 0.2}s`,
                    animation: `cardFloat 3s ease-in-out infinite ${index * 0.5}s`,
                    color: suit === '♥' || suit === '♦' ? '#ef4444' : '#ffffff',
                  }}
                >
                  {suit}
                </div>
              ))}
            </div>

            {/* Прогресс загрузки */}
            <div className="w-64 mx-auto mb-6">
              <div className="bg-white/10 rounded-full h-2 backdrop-blur-sm">
                <div 
                  className="bg-gradient-to-r from-purple-500 to-pink-500 h-2 rounded-full animate-pulse"
                  style={{ 
                    width: '60%',
                    animation: 'loadingProgress 2s ease-in-out infinite'
                  }}
                ></div>
              </div>
            </div>

            {/* Текст загрузки */}
            <div className="space-y-2">
              <p className="text-xl text-white/90 font-medium animate-pulse">Загрузка игры...</p>
              <p className="text-sm text-white/60">Инициализация Telegram WebApp</p>
            </div>

            {/* Анимированные точки */}
            <div className="flex justify-center space-x-1 mt-4">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="w-2 h-2 bg-purple-400 rounded-full animate-bounce"
                  style={{ animationDelay: `${i * 0.2}s` }}
                ></div>
              ))}
            </div>
          </div>
        </div>

        {/* Стили для анимаций */}
        <style jsx>{`
          @keyframes cardFloat {
            0%, 100% { 
              transform: translateY(0px) rotate(0deg); 
            }
            50% { 
              transform: translateY(-10px) rotate(5deg); 
            }
          }
          
          @keyframes loadingProgress {
            0% { width: 20%; }
            50% { width: 80%; }
            100% { width: 60%; }
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