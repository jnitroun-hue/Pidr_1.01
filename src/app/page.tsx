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
        if (isReady && telegramUser) {
          console.log('📱 Telegram WebApp данные получены, создаем пользователя...');
          console.log('👤 Telegram User:', telegramUser);
          await createUserThroughDatabase(telegramUser);
        } else if (!isReady) {
          console.log('⏳ Ожидаем инициализацию Telegram WebApp...');
          // Повторная попытка через 1 секунду
          setTimeout(initializePlayer, 1000);
        } else {
          console.log('❌ Telegram WebApp данные недоступны');
          setError('Запустите приложение через Telegram бота');
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

  // Показываем загрузку
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-white mx-auto mb-4"></div>
          <h2 className="text-2xl font-bold text-white mb-2">P.I.D.R. Game</h2>
          <p className="text-blue-200">Инициализация игры...</p>
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