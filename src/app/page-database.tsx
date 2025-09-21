"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { User } from '../types/game';
import { useTelegram } from '../hooks/useTelegram';
import NeonMainMenu from '../components/main_menu_component';

/**
 * Главная страница с авторизацией ТОЛЬКО через БД
 * Никакого localStorage - только HTTP cookies и БД сессии
 */
function HomeWithParams() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const { telegramUser, telegramId } = useTelegram();
  const router = useRouter();

  useEffect(() => {
    console.log('🎮 ИНИЦИАЛИЗАЦИЯ ИГРЫ - ПРОВЕРКА СЕССИИ В БД');
    
    const initializePlayer = async () => {
      // Проверяем что мы в браузере
      if (typeof window === 'undefined') {
        setLoading(false);
        return;
      }

      // Сначала проверяем активную сессию в БД
      console.log('🔍 Проверяем активную сессию в БД...');
      
      try {
        const sessionResponse = await fetch('/api/auth', {
          method: 'GET',
          credentials: 'include' // Важно для отправки cookies
        });

        if (sessionResponse.ok) {
          const sessionData = await sessionResponse.json();
          
          if (sessionData.success && sessionData.user) {
            console.log('✅ Найдена активная сессия в БД:', sessionData.user);
            
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
              photoUrl: sessionData.user.avatar
            };
            
            setUser(existingUser);
            setLoading(false);
            
            // Диспатчим событие обновления монет
            window.dispatchEvent(new CustomEvent('coinsUpdated', { 
              detail: { coins: existingUser.coins } 
            }));
            
            console.log('🚀 ИГРА ГОТОВА К ЗАПУСКУ (активная сессия)!');
            return;
          }
        }

        console.log('❌ Активной сессии нет, требуется авторизация');

      } catch (error) {
        console.error('❌ Ошибка проверки сессии:', error);
      }

      // Если нет активной сессии, пытаемся авторизоваться
      if (telegramId && telegramUser) {
        console.log('📱 Telegram данные найдены, авторизуемся через БД');
        await createUserThroughDatabase(telegramUser, telegramId);
      } else {
        console.log('❌ Нет Telegram данных, нужна ручная авторизация');
        setLoading(false);
      }
    };
    
    const createUserThroughDatabase = async (telegramUser: any | undefined, telegramId: string) => {
      console.log('🌐 Авторизация через БД...');
      
      const authData = {
        type: 'telegram',
        id: telegramId,
        username: telegramUser?.username || '',
        first_name: telegramUser?.first_name || 'Игрок',
        last_name: telegramUser?.last_name || '',
        photo_url: telegramUser?.photo_url || null
      };
      
      try {
        const response = await fetch('/api/auth', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          credentials: 'include', // Важно для получения cookies
          body: JSON.stringify(authData)
        });
        
        if (!response.ok) {
          throw new Error(`API ответил с ошибкой: ${response.status}`);
        }
        
        const result = await response.json();
        
        if (result.success && result.user) {
          console.log('✅ Пользователь авторизован через БД:', result.user);
          
          const newUser: User = {
            id: result.user.id,
            username: result.user.username,
            firstName: result.user.firstName || result.user.username,
            lastName: result.user.lastName || '',
            telegramId: result.user.telegramId || telegramId,
            coins: result.user.coins || 1000,
            rating: result.user.rating || 0,
            gamesPlayed: result.user.gamesPlayed || 0,
            gamesWon: result.user.gamesWon || 0,
            photoUrl: result.user.avatar
          };
          
          setUser(newUser);
          setLoading(false);
          
          // Диспатчим событие обновления монет
          window.dispatchEvent(new CustomEvent('coinsUpdated', { 
            detail: { coins: newUser.coins } 
          }));
          
          console.log('🚀 ИГРА ГОТОВА К ЗАПУСКУ (новая авторизация)!');
        } else {
          throw new Error(result.message || 'Не удалось авторизоваться');
        }
        
      } catch (error) {
        console.error('❌ Ошибка авторизации через БД:', error);
        setLoading(false);
      }
    };

    initializePlayer();
  }, [telegramUser, telegramId]);

  // Функция выхода
  const handleLogout = async () => {
    try {
      await fetch('/api/auth', {
        method: 'DELETE',
        credentials: 'include'
      });
      
      setUser(null);
      console.log('✅ Выход выполнен');
      
    } catch (error) {
      console.error('❌ Ошибка выхода:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-white mx-auto mb-4"></div>
          <h2 className="text-2xl font-bold text-white mb-2">Загрузка игры...</h2>
          <p className="text-blue-200">Проверяем сессию в базе данных</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center">
        <div className="text-center bg-black/30 backdrop-blur-md rounded-xl p-8 border border-white/20">
          <h2 className="text-3xl font-bold text-white mb-4">P.I.D.R. Game</h2>
          <p className="text-blue-200 mb-6">Для игры требуется авторизация</p>
          
          <div className="space-y-4">
            <button
              onClick={() => router.push('/auth/login')}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg transition-colors"
            >
              Войти
            </button>
            
            <button
              onClick={() => router.push('/auth/register')}
              className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-lg transition-colors"
            >
              Регистрация
            </button>
          </div>
          
          <div className="mt-6 text-sm text-gray-300">
            <p>🔒 Все данные хранятся в защищенной базе данных</p>
            <p>🚫 Никакого localStorage</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
      <NeonMainMenu 
        user={user} 
        onLogout={handleLogout}
      />
    </div>
  );
}

export default function HomePage() {
  return <HomeWithParams />;
}
