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
import BurgerMenu from '../components/BurgerMenu';
import { motion } from 'framer-motion';
import { Menu, X } from 'lucide-react';

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
  const [checkingAuth, setCheckingAuth] = useState(false); // ✅ Проверка авторизации в браузере
  const [retryCount, setRetryCount] = useState(0); // ✅ НОВОЕ: Счетчик попыток
  const [leftMenuOpen, setLeftMenuOpen] = useState(false); // ✅ Бургер-меню слева
  const [rightMenuOpen, setRightMenuOpen] = useState(false); // ✅ Бургер-меню справа
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
      console.log('🌐 Обнаружен браузер - проверяем сессию');
      setCheckingAuth(true);
      
      // ✅ ПРОВЕРЯЕМ PENDING AUTH ИЗ SESSIONSTORAGE (после логина/регистрации)
      // Это должно быть ПЕРВЫМ делом, до любых API запросов!
      if (typeof window !== 'undefined') {
        console.log('🔍 [Браузер] Проверяем pendingAuth в sessionStorage...');
        const pendingAuthStr = sessionStorage.getItem('pendingAuth');
        
        if (pendingAuthStr) {
          console.log('📦 [Браузер] pendingAuth найден в sessionStorage!');
          try {
            const pendingAuth = JSON.parse(pendingAuthStr);
            const timeDiff = Date.now() - pendingAuth.timestamp;
            
            console.log('⏱️ [Браузер] Время с момента сохранения:', timeDiff, 'мс');
            
            // ✅ УВЕЛИЧЕНО: Используем данные если они свежие (менее 30 секунд)
            if (timeDiff < 30000 && pendingAuth.user) {
              console.log('✅ [Браузер] pendingAuth свежий, используем данные:', pendingAuth.user.username);
              console.log('👤 [Браузер] Данные пользователя:', pendingAuth.user);
              
              const existingUser: User = {
                id: pendingAuth.user.id,
                username: pendingAuth.user.username,
                firstName: pendingAuth.user.firstName || pendingAuth.user.username,
                lastName: pendingAuth.user.lastName || '',
                telegramId: pendingAuth.user.telegramId || '',
                coins: pendingAuth.user.coins || 1000,
                rating: pendingAuth.user.rating || 0,
                gamesPlayed: pendingAuth.user.games_played || pendingAuth.user.gamesPlayed || 0,
                gamesWon: pendingAuth.user.games_won || pendingAuth.user.gamesWon || 0,
                photoUrl: pendingAuth.user.avatar_url || pendingAuth.user.photoUrl || ''
              };
              
              console.log('✅ [Браузер] Устанавливаем пользователя из pendingAuth:', existingUser.username);
              setUser(existingUser);
              setCheckingAuth(false);
              initialized.current = true;
              
              // Удаляем pendingAuth после использования
              sessionStorage.removeItem('pendingAuth');
              console.log('🗑️ [Браузер] pendingAuth удален из sessionStorage');
              
              setTimeout(() => {
                setLoading(false);
                setTimeout(() => setShowMainMenu(true), 100);
              }, 500);
              
              console.log('✅ [Браузер] Вход выполнен через pendingAuth, НЕ вызываем checkAuth()');
              return; // ✅ КРИТИЧНО: Выходим, НЕ вызываем checkAuth()!
            } else {
              // Данные устарели, удаляем
              console.log('⏰ [Браузер] pendingAuth устарел, удаляем');
              sessionStorage.removeItem('pendingAuth');
            }
          } catch (e) {
            console.warn('⚠️ [Браузер] Ошибка парсинга pendingAuth:', e);
            sessionStorage.removeItem('pendingAuth');
          }
        } else {
          console.log('📭 [Браузер] pendingAuth не найден в sessionStorage');
        }
      }
      
      // Проверяем сессию через API (без localStorage)
      const checkAuth = async () => {
        try {
          console.log('🔍 [Браузер] Проверяем сессию через /api/auth...');
          
          const sessionResponse = await fetch('/api/auth', {
            method: 'GET',
            credentials: 'include'
          });

          console.log('📥 [Браузер] Ответ от /api/auth:', {
            status: sessionResponse.status,
            statusText: sessionResponse.statusText,
            ok: sessionResponse.ok
          });

          if (sessionResponse.ok) {
            const sessionData = await sessionResponse.json();
            console.log('📊 [Браузер] Данные сессии:', {
              success: sessionData.success,
              hasUser: !!sessionData.user
            });
            
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
              setCheckingAuth(false);
              initialized.current = true;
              setTimeout(() => {
                setLoading(false);
                setTimeout(() => setShowMainMenu(true), 100);
              }, 500);
              return;
            }
          } else if (sessionResponse.status === 404) {
            console.error('❌ [Браузер] API endpoint /api/auth не найден (404)');
            console.error('❌ Это критическая ошибка - API route не работает!');
            
            // ✅ FALLBACK: Если API не работает, но есть cookie - используем pendingAuth или ждем
            const hasAuthCookie = typeof document !== 'undefined' && 
              document.cookie.includes('auth_token=');
            
            console.log('🍪 [Браузер] Проверка cookie:', hasAuthCookie ? 'найден' : 'не найден');
            
            // ✅ ЕЩЕ РАЗ ПРОВЕРЯЕМ pendingAuth (может быть сохранен после редиректа)
            const pendingAuthRetry = typeof window !== 'undefined' && sessionStorage.getItem('pendingAuth');
            if (pendingAuthRetry) {
              console.log('🔄 [Браузер] pendingAuth найден при повторной проверке!');
              try {
                const pendingAuth = JSON.parse(pendingAuthRetry);
                if (pendingAuth.user) {
                  console.log('✅ [Браузер] Используем pendingAuth из повторной проверки');
                  const existingUser: User = {
                    id: pendingAuth.user.id,
                    username: pendingAuth.user.username,
                    firstName: pendingAuth.user.firstName || pendingAuth.user.username,
                    lastName: pendingAuth.user.lastName || '',
                    telegramId: pendingAuth.user.telegramId || '',
                    coins: pendingAuth.user.coins || 1000,
                    rating: pendingAuth.user.rating || 0,
                    gamesPlayed: pendingAuth.user.games_played || pendingAuth.user.gamesPlayed || 0,
                    gamesWon: pendingAuth.user.games_won || pendingAuth.user.gamesWon || 0,
                    photoUrl: pendingAuth.user.avatar_url || pendingAuth.user.photoUrl || ''
                  };
                  
                  setUser(existingUser);
                  setCheckingAuth(false);
                  initialized.current = true;
                  sessionStorage.removeItem('pendingAuth');
                  
                  setTimeout(() => {
                    setLoading(false);
                    setTimeout(() => setShowMainMenu(true), 100);
                  }, 500);
                  return;
                }
              } catch (e) {
                console.warn('⚠️ [Браузер] Ошибка парсинга pendingAuth при повторной проверке:', e);
              }
            }
            
            if (hasAuthCookie) {
              console.log('🍪 [Браузер] Cookie найден, но API не работает. Ждем и пробуем еще раз...');
              setTimeout(async () => {
                try {
                  const retryResponse = await fetch('/api/auth', {
                    method: 'GET',
                    credentials: 'include'
                  });
                  
                  if (retryResponse.ok) {
                    const retryData = await retryResponse.json();
                    if (retryData.success && retryData.user) {
                      console.log('✅ [Браузер] Повторная проверка успешна!');
                      const existingUser: User = {
                        id: retryData.user.id,
                        username: retryData.user.username,
                        firstName: retryData.user.firstName || retryData.user.username,
                        lastName: retryData.user.lastName || '',
                        telegramId: retryData.user.telegramId || '',
                        coins: retryData.user.coins || 1000,
                        rating: retryData.user.rating || 0,
                        gamesPlayed: retryData.user.gamesPlayed || 0,
                        gamesWon: retryData.user.gamesWon || 0,
                        photoUrl: retryData.user.photoUrl || ''
                      };
                      
                      setUser(existingUser);
                      setCheckingAuth(false);
                      initialized.current = true;
                      setTimeout(() => {
                        setLoading(false);
                        setTimeout(() => setShowMainMenu(true), 100);
                      }, 500);
                      return;
                    }
                  }
                } catch (retryError) {
                  console.error('❌ [Браузер] Повторная проверка тоже не удалась:', retryError);
                }
                
                // Если повторная проверка не помогла - редиректим на логин
                console.log('📝 Повторная проверка не помогла - редирект на страницу входа');
                setCheckingAuth(false);
                setIsBrowser(true);
                initialized.current = true;
                router.push('/auth/login');
              }, 2000); // Ждем 2 секунды перед повторной попыткой
              return; // Не продолжаем дальше, ждем результат повторной попытки
            }
          } else if (sessionResponse.status === 401) {
            // 401 = не авторизован (нормально, нет сессии)
            console.log('📝 [Браузер] Сессия не найдена (401)');
          }
        } catch (error: any) {
          console.error('❌ [Браузер] Ошибка проверки авторизации:', {
            message: error?.message,
            name: error?.name,
            stack: error?.stack
          });
          
          // ✅ Если это ошибка сети - показываем сообщение
          if (error?.message?.includes('fetch') || error?.message?.includes('network')) {
            console.error('❌ [Браузер] Ошибка сети при проверке авторизации');
          }
        }
        
        // Если нет авторизации - редиректим на страницу входа
        console.log('📝 Нет активной сессии - редирект на страницу входа');
        setCheckingAuth(false);
        setIsBrowser(true);
        initialized.current = true;
        router.push('/auth/login');
      };
      
      checkAuth();
      return;
    }
    
    // ✅ УБРАНА ПРОВЕРКА ПЕРВОГО ВИЗИТА - сразу авторизуемся
    // Пользователь сразу попадает в игру после авторизации
    
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
        
        // ✅ УПРОЩЕННАЯ ПРОВЕРКА: Пробуем проверить сессию, но если не работает - сразу авторизуемся
        try {
          const sessionResponse = await fetch('/api/auth', {
            method: 'GET',
            credentials: 'include',
            headers
          });

          if (sessionResponse.ok) {
            const sessionData = await sessionResponse.json();
            
            if (sessionData.success && sessionData.user) {
              // ✅ Проверяем что пользователь из сессии совпадает с Telegram ID
              const sessionTelegramId = String(sessionData.user.telegramId || '');
              const currentTelegramId = String(telegramId || '');
              
              if (telegramId && sessionTelegramId === currentTelegramId) {
                console.log('✅ Активная сессия найдена:', sessionData.user.username);
                
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
                setLoading(false);
                setTimeout(() => {
                  setShowMainMenu(true);
                }, 300);
                console.log('🚀 ДОБРО ПОЖАЛОВАТЬ ОБРАТНО В P.I.D.R.!');
                return;
              } else {
                console.log('⚠️ Сессия не совпадает с Telegram ID, авторизуемся заново...');
              }
            }
          } else {
            console.log('📝 Сессия не найдена (статус:', sessionResponse.status, '), авторизуемся...');
          }
        } catch (sessionError) {
          console.warn('⚠️ Ошибка проверки сессии (не критично), авторизуемся напрямую:', sessionError);
        }
        
        // ✅ Если сессия не найдена или ошибка - сразу авторизуемся через БД

        // ✅ УПРОЩЕННАЯ АВТОРИЗАЦИЯ: Сразу создаем/авторизуем пользователя через БД
        // Без лишних проверок - берем данные из Telegram и сразу авторизуемся
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
          console.log('📱 Создаем/авторизуем пользователя через БД (упрощенная версия)...');
          await createUserThroughDatabase(telegramUserData);
        } else {
          console.warn('⚠️ Telegram WebApp данные недоступны, ждем инициализации...');
          // ✅ ЖДЕМ ИНИЦИАЛИЗАЦИИ TELEGRAM (до 5 секунд)
          if (retryCount < 5) {
            console.log(`🔄 Попытка ${retryCount + 1}/5 - ждем инициализации Telegram...`);
            setTimeout(() => {
              setRetryCount(prev => prev + 1);
            }, 1000);
            return;
          }
          // После 5 попыток показываем браузерную версию
          console.warn('⚠️ Telegram не инициализировался после 5 попыток, показываем браузерную версию');
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
        console.log('📤 Отправляем запрос на /api/auth:', {
          method: 'POST',
          hasAuthData: !!authData,
          telegramId: authData.telegramId
        });
        
        const response = await fetch('/api/auth', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          credentials: 'include',
          body: JSON.stringify(authData)
        });
        
        console.log('📥 Ответ от /api/auth:', {
          status: response.status,
          statusText: response.statusText,
          ok: response.ok
        });
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error('❌ Ошибка API:', {
            status: response.status,
            statusText: response.statusText,
            body: errorText
          });
          throw new Error(`API ответил с ошибкой ${response.status}: ${errorText.substring(0, 200)}`);
        }
        
        const data = await response.json();
        console.log('📊 Данные ответа:', {
          success: data.success,
          hasUser: !!data.user,
          message: data.message
        });
        
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
          
          console.log('👤 Устанавливаем пользователя:', newUser.username);
          setUser(newUser);
          initialized.current = true;
          
          // ✅ ПРОВЕРЯЕМ ПРИГЛАШЕНИЕ В КОМНАТУ ПОСЛЕ АВТОРИЗАЦИИ
          if (roomInviteData) {
            console.log('🎮 Приглашение в комнату обнаружено, показываем модальное окно');
            setTimeout(() => {
              setShowRoomInviteModal(true);
            }, 1000);
          }
          
          // ✅ СРАЗУ ПОКАЗЫВАЕМ ГЛАВНОЕ МЕНЮ БЕЗ ЗАДЕРЖЕК
          console.log('🎉 ДОБРО ПОЖАЛОВАТЬ В P.I.D.R. GAME!');
          console.log(`💰 Ваш баланс: ${newUser.coins} монет`);
          
          setLoading(false);
          setTimeout(() => {
            setShowMainMenu(true);
          }, 300);
          
        } else {
          throw new Error(data.message || 'Ошибка создания пользователя');
        }
        
      } catch (error: any) {
        console.error('❌ Ошибка создания пользователя:', {
          message: error?.message,
          stack: error?.stack,
          name: error?.name
        });
        
        // ✅ УПРОЩЕННАЯ ОБРАБОТКА ОШИБОК
        // Если ошибка сети - пробуем еще раз через 2 секунды
        if (error?.message?.includes('404') || error?.message?.includes('network') || error?.message?.includes('fetch')) {
          console.log('🔄 Ошибка сети, пробуем еще раз через 2 секунды...');
          setTimeout(async () => {
            try {
              await createUserThroughDatabase(telegramUser);
            } catch (retryError) {
              console.error('❌ Повторная попытка тоже не удалась:', retryError);
              setError('Ошибка подключения к серверу. Проверьте интернет-соединение.');
              setLoading(false);
            }
          }, 2000);
          return;
        }
        
        setError(error?.message || 'Ошибка авторизации. Попробуйте перезапустить бота.');
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

  // Показываем экран загрузки с картами (пока идет загрузка ИЛИ проверка авторизации)
  if (loading || checkingAuth) {
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
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 relative">
        {/* Бургер-меню */}
        <BurgerMenu 
          isOpen={leftMenuOpen} 
          onClose={() => setLeftMenuOpen(false)} 
          side="left" 
          user={user}
        />
        <BurgerMenu 
          isOpen={rightMenuOpen} 
          onClose={() => setRightMenuOpen(false)} 
          side="right" 
          user={user}
        />
        
        {/* Кнопки бургер-меню */}
        <motion.button
          initial={{ x: -20, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ delay: 0.5 }}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={() => setLeftMenuOpen(true)}
          style={{
            position: 'fixed',
            top: '20px',
            left: '20px',
            zIndex: 1000,
            background: 'linear-gradient(145deg, rgba(30, 41, 59, 0.95) 0%, rgba(15, 23, 42, 0.95) 100%)',
            border: '2px solid rgba(99, 102, 241, 0.3)',
            borderRadius: '12px',
            padding: '12px',
            cursor: 'pointer',
            color: '#ffffff',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)'
          }}
        >
          <Menu size={24} />
        </motion.button>
        
        <motion.button
          initial={{ x: 20, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ delay: 0.5 }}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={() => setRightMenuOpen(true)}
          style={{
            position: 'fixed',
            top: '20px',
            right: '20px',
            zIndex: 1000,
            background: 'linear-gradient(145deg, rgba(30, 41, 59, 0.95) 0%, rgba(15, 23, 42, 0.95) 100%)',
            border: '2px solid rgba(99, 102, 241, 0.3)',
            borderRadius: '12px',
            padding: '12px',
            cursor: 'pointer',
            color: '#ffffff',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)'
          }}
        >
          <Menu size={24} />
        </motion.button>
        
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

  // ✅ БРАУЗЕРНАЯ ВЕРСИЯ - РЕДИРЕКТ НА ВХОД (если нет пользователя)
  if (isBrowser && !user && !checkingAuth) {
    // Редирект уже выполнен в useEffect, показываем загрузку
    return null;
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