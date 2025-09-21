"use client";
import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Spinner, Text, Flex } from '@chakra-ui/react';
import { MainMenu } from '../components/main_menu_component'

interface User {
  id: string;
  username: string;
  firstName?: string;
  lastName?: string;
  avatar?: string;
  rating: number;
  coins: number;
  gamesPlayed: number;
  gamesWon: number;
  telegramId?: string | null; // ДОБАВЛЕНО
  photoUrl?: string | null;   // ДОБАВЛЕНО
}

function HomeWithParams() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const searchParams = useSearchParams();
  const router = useRouter();


  // ПРАВИЛЬНАЯ инициализация пользователя с проверкой существования
  useEffect(() => {
    console.log('🎮 ИНИЦИАЛИЗАЦИЯ ИГРЫ - ПРОВЕРКА ИГРОКА');
    
    const initializePlayer = async () => {
      // Проверяем что мы в браузере и Telegram WebApp загружен
      if (typeof window === 'undefined' || !window.Telegram?.WebApp) {
        console.log('⚠️ Telegram WebApp не загружен, создаем локального игрока');
        createLocalPlayer();
        return;
      }
      
      const telegramUser = window.Telegram.WebApp.initDataUnsafe?.user;
      const telegramId = telegramUser?.id?.toString();
      
      if (!telegramId) {
        console.log('⚠️ Нет Telegram ID, создаем локального игрока');
        createLocalPlayer();
        return;
      }
      
      try {
        // ВСЕГДА проверяем БД, даже если есть localStorage
        console.log('🔍 Проверяем игрока в базе данных (ОБЯЗАТЕЛЬНО)...');
        const response = await fetch('/api/auth', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'telegram',
            id: telegramId,
            username: telegramUser?.username || undefined,
            first_name: telegramUser?.first_name || undefined,
            last_name: telegramUser?.last_name || undefined,
            photo_url: telegramUser?.photo_url || undefined
          })
        });
        
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.user) {
            console.log('✅ Игрок найден в базе:', data.user);
            
            const existingUser: User = {
              id: data.user.id || `player_${telegramId}`,
              username: data.user.username || telegramUser?.first_name || 'Игрок',
              firstName: data.user.first_name || telegramUser?.first_name || 'Игрок',
              lastName: data.user.last_name || telegramUser?.last_name || '',
              telegramId: telegramId,
              coins: data.user.coins || 1000,
              rating: data.user.rating || 0,
              gamesPlayed: data.user.games_played || 0,
              gamesWon: data.user.games_won || 0,
              photoUrl: data.user.photo_url || telegramUser?.photo_url
            };
            
            // Сохраняем в localStorage для быстрого доступа
            localStorage.setItem('user', JSON.stringify(existingUser));
            localStorage.setItem('current_user', JSON.stringify(existingUser));
            
            // 🔑 КРИТИЧЕСКИ ВАЖНО: Сохраняем токен авторизации!
            if (data.token) {
              localStorage.setItem('auth_token', data.token);
              console.log('✅ Токен авторизации сохранен в localStorage');
            } else {
              console.error('❌ ТОКЕН НЕ ПОЛУЧЕН ОТ API!');
            }
            
            setUser(existingUser);
            setLoading(false);
            
            // Диспатчим событие обновления монет
            window.dispatchEvent(new CustomEvent('coinsUpdated', { 
              detail: { coins: existingUser.coins } 
            }));
            
            console.log('🚀 ИГРА ГОТОВА К ЗАПУСКУ (игрок из базы)!');
            return;
          }
        }
        
        // Если игрок не найден - создаем нового
        console.log('👤 Игрок не найден, создаем нового...');
        createNewPlayer(telegramUser, telegramId);
        
      } catch (error) {
        console.error('❌ Ошибка при загрузке игрока:', error);
        console.log('🔄 Пытаемся создать пользователя через API');
        
        // Пытаемся создать пользователя через API авторизации
        try {
          await createUserThroughAPI(telegramUser, telegramId);
        } catch (apiError) {
          console.error('❌ Ошибка создания через API:', apiError);
          console.log('🔄 Создаем локального игрока как последний fallback');
          createLocalPlayer();
        }
      }
    };
    
    const createUserThroughAPI = async (telegramUser: any | undefined, telegramId: string) => {
      console.log('🌐 Создаем пользователя через API...');
      
      const authData = {
        type: 'telegram',
        id: telegramId,
        username: telegramUser?.username || '',
        first_name: telegramUser?.first_name || 'Игрок',
        last_name: telegramUser?.last_name || '',
        photo_url: telegramUser?.photo_url || null
      };
      
      const response = await fetch('/api/auth', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(authData)
      });
      
      if (!response.ok) {
        throw new Error(`API ответил с ошибкой: ${response.status}`);
      }
      
      const result = await response.json();
      
      if (result.success && result.user && result.token) {
        console.log('✅ Пользователь создан через API:', result.user);
        
        // Сохраняем токен и данные пользователя
        localStorage.setItem('auth_token', result.token);
        localStorage.setItem('user', JSON.stringify(result.user));
        localStorage.setItem('current_user', JSON.stringify(result.user));
        
        // Диспатчим событие обновления монет
        window.dispatchEvent(new CustomEvent('coinsUpdated', { 
          detail: { coins: result.user.coins } 
        }));
        
        setUser(result.user);
        setLoading(false);
        
        console.log('🚀 ИГРА ГОТОВА К ЗАПУСКУ (пользователь из API)!');
      } else {
        throw new Error(result.message || 'Не удалось создать пользователя');
      }
    };
    
    const createNewPlayer = (telegramUser: any | undefined, telegramId: string) => {
      const newUser: User = {
        id: `player_${telegramId}`, // ФИКСИРОВАННЫЙ ID на основе Telegram ID!
        username: telegramUser?.first_name || 'Игрок',
        firstName: telegramUser?.first_name || 'Игрок', 
        lastName: telegramUser?.last_name || '',
        telegramId: telegramId,
        coins: 1000,
        rating: 0,
        gamesPlayed: 0,
        gamesWon: 0,
        photoUrl: telegramUser?.photo_url || null
      };

      console.log('✅ Создан НОВЫЙ игрок:', newUser);
      
      // Сохраняем данные игрока
      localStorage.setItem('user', JSON.stringify(newUser));
      localStorage.setItem('current_user', JSON.stringify(newUser));
      
      // Диспатчим событие обновления монет
      window.dispatchEvent(new CustomEvent('coinsUpdated', { 
        detail: { coins: newUser.coins } 
      }));
      
      setUser(newUser);
      setLoading(false);
      
      console.log('🚀 ИГРА ГОТОВА К ЗАПУСКУ (новый игрок)!');
    };
    
    const createLocalPlayer = () => {
      console.error('❌ ЛОКАЛЬНЫЕ ИГРОКИ ОТКЛЮЧЕНЫ! Используйте только авторизацию через БД.');
      console.error('📱 Откройте игру в Telegram WebApp или авторизуйтесь через /auth/login');
      
      setLoading(false);
      
      // Показываем сообщение об ошибке
      alert('Для игры требуется авторизация через Telegram WebApp или вход в систему. Локальные игроки отключены.');
    };
    
    initializePlayer();
  }, []);
  
  // Функция для сохранения обновлений игрока в базу данных
  const savePlayerToDatabase = async (playerData: User) => {
    if (!playerData.telegramId) {
      console.log('⚠️ Нет Telegram ID, пропускаем сохранение в базу');
      return;
    }
    
    try {
      const response = await fetch('/api/auth', {
        method: 'PUT', // PUT для обновления
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'telegram',
          id: playerData.telegramId,
          username: playerData.username,
          first_name: playerData.firstName,
          last_name: playerData.lastName,
          coins: playerData.coins,
          rating: playerData.rating,
          games_played: playerData.gamesPlayed,
          games_won: playerData.gamesWon,
          photo_url: playerData.photoUrl
        })
      });
      
      if (response.ok) {
        console.log('✅ Статистика игрока сохранена в базу');
      } else {
        console.warn('⚠️ Не удалось сохранить статистику игрока в базу');
      }
    } catch (error) {
      console.error('❌ Ошибка сохранения в базу:', error);
    }
  };
  
  // Слушаем обновления статистики игрока
  useEffect(() => {
    const handleStatsUpdate = (event: CustomEvent) => {
      if (user) {
        const updatedUser = { ...user, ...event.detail };
        setUser(updatedUser);
        
        // Сохраняем в localStorage
        localStorage.setItem('user', JSON.stringify(updatedUser));
        localStorage.setItem('current_user', JSON.stringify(updatedUser));
        
        // Сохраняем в базу данных
        savePlayerToDatabase(updatedUser);
      }
    };
    
    window.addEventListener('playerStatsUpdated', handleStatsUpdate as EventListener);
    
    return () => {
      window.removeEventListener('playerStatsUpdated', handleStatsUpdate as EventListener);
    };
  }, [user]);

  // Обработка реферального кода из URL
  useEffect(() => {
    const referralCode = searchParams.get('ref');
    if (referralCode && user) {
      handleReferralCode(referralCode);
    }
  }, [searchParams, user]);

  const handleReferralCode = async (referralCode: string) => {
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) {
        // Если пользователь не авторизован, сохраняем код для использования после входа
        localStorage.setItem('pending_referral_code', referralCode);
        alert('🎁 Реферальный код сохранен! Войдите в игру чтобы получить бонус 100 монет.');
        return;
      }

      // Если пользователь авторизован, сразу используем код
      const response = await fetch('/api/referral', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          action: 'use_referral',
          referralCode: referralCode
        })
      });

      const result = await response.json();
      if (result.success) {
        alert(`🎉 ${result.message}`);
        // Очищаем URL от реферального кода
        const url = new URL(window.location.href);
        url.searchParams.delete('ref');
        window.history.replaceState({}, '', url.toString());
      } else {
        alert(result.error || 'Ошибка при использовании реферального кода');
      }
    } catch (error) {
      console.error('Error processing referral code:', error);
      alert('Ошибка при обработке реферального кода');
    }
  };

  const handleNavigate = (page: string) => {
    if (page === 'wallet') {
      window.location.href = '/wallet';
    } else if (page === 'profile') {
      window.location.href = '/profile';
    } else if (page === 'rating') {
      window.location.href = '/rating';
    } else if (page === 'rules') {
      window.location.href = '/rules';
    } else if (page === 'game') {
      window.location.href = '/game-setup';
    } else if (page === 'multiplayer') {
      window.location.href = '/multiplayer';
    } else if (page === 'new-room') {
      window.location.href = '/new-room';
    } else if (page === 'invite') {
      window.location.href = '/friends';
    } else if (page === 'shop') {
      window.location.href = '/shop';
    } else if (page === 'menu') {
      // открыть бургер-меню, если нужно
    }
  };
  
  if (loading) {
    return (
      <Flex 
        minH="100vh" 
        alignItems="center" 
        justifyContent="center" 
        bg="linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
        flexDirection="column"
      >
        <Spinner size="xl" color="white" />
        <Text mt={4} color="white" fontSize="lg">
          Загрузка P.I.D.R...
        </Text>
      </Flex>
    );
  }

  if (!user) {
    return null; // Будет перенаправлен middleware'ом
  }

  return <MainMenu onNavigate={handleNavigate} />;
}

export default function Home() {
  return (
    <Suspense fallback={<div>Загрузка...</div>}>
      <HomeWithParams />
    </Suspense>
  );
}
