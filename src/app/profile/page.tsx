'use client'
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { ArrowLeft, Trophy, Medal, Users, User, Star, Award, Target, Camera, Upload, Wallet, Palette, Sparkles, Gift, Frame, LogOut, Shield } from 'lucide-react';
import GameWallet from '../../components/GameWallet';
import { useLanguage } from '../../components/LanguageSwitcher';
import { useTranslations } from '../../lib/i18n/translations';
import { avatarFrames, getRarityColor, getRarityName } from '../../data/avatar-frames';
import TonWalletConnect from '../../components/TonWalletConnect';
import { getApiHeaders } from '@/lib/api-headers';

// Компонент таймера для бонусов
function BonusCooldownTimer({ bonus, onCooldownEnd }: { bonus: any; onCooldownEnd: () => void }) {
  const [timeLeft, setTimeLeft] = useState('');

  useEffect(() => {
    if (!bonus.cooldownUntil) {
      setTimeLeft('🔒 НЕДОСТУПНО');
      return;
    }

    const updateTimer = () => {
      const now = new Date().getTime();
      const cooldownTime = new Date(bonus.cooldownUntil).getTime();
      const difference = cooldownTime - now;

      if (difference <= 0) {
        setTimeLeft('');
        onCooldownEnd();
        return;
      }

      const hours = Math.floor(difference / (1000 * 60 * 60));
      const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((difference % (1000 * 60)) / 1000);

      setTimeLeft(`⏰ ${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [bonus.cooldownUntil, onCooldownEnd]);

  return (
    <div style={{
      background: 'rgba(55, 65, 81, 0.6)',
      border: '1px solid rgba(255, 255, 255, 0.1)',
      borderRadius: '12px',
      color: '#94a3b8',
      padding: '12px 20px',
      fontWeight: '600',
      fontSize: '0.9rem',
      fontFamily: 'monospace'
    }}>
      {timeLeft || '🔒 НЕДОСТУПНО'}
    </div>
  );
}

export default function ProfilePage() {
  const router = useRouter();
  const { language } = useLanguage();
  const t = useTranslations(language);
  
  // ✅ УНИВЕРСАЛЬНО: Получение данных пользователя из всех платформ
  const getCurrentUser = () => {
    // Если user уже загружен из API - используем его
    if (user) {
      return {
        id: user.id || user.telegramId || '',
        username: user.username || '',
        firstName: user.firstName || ''
      };
    }
    
    // Для Telegram WebApp (fallback)
    if (typeof window !== 'undefined' && window.Telegram?.WebApp) {
      const telegramUser = (window as any).Telegram?.WebApp?.initDataUnsafe?.user;
      if (telegramUser) {
        return {
          id: telegramUser.id?.toString() || '',
          username: telegramUser.username || telegramUser.first_name || '',
          firstName: telegramUser.first_name || ''
        };
      }
    }
    
    // Для веб-версии данные будут загружены через API
    return null;
  };
  
  const [stats, setStats] = useState({
    rating: 0,
    gamesPlayed: 0,
    wins: 0,
    losses: 0,
    winRate: 0,
    achievements: [
      { id: 1, name: t.profile.firstWin, description: t.profile.firstWinDesc, unlocked: false, icon: Trophy },
      { id: 2, name: t.profile.veteran, description: t.profile.veteranDesc, unlocked: false, icon: Medal },
      { id: 3, name: t.profile.master, description: t.profile.masterDesc, unlocked: false, icon: Award },
      { id: 4, name: t.profile.legend, description: t.profile.legendDesc, unlocked: false, icon: Star }
    ]
  });

  const [user, setUser] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);

  const [avatarUrl, setAvatarUrl] = useState('😎');

  // ✅ ИСПРАВЛЕНО: Загружаем ВСЕ данные пользователя из Supabase БД
  useEffect(() => {
    const loadUserData = async () => {
      try {
        console.log('👤 Загружаем данные пользователя из Supabase БД...');
        
        // ✅ УНИВЕРСАЛЬНО: Используем headers для всех платформ
        const apiHeaders = getApiHeaders();
        console.log('🔐 [Profile] Отправляем запрос с headers:', apiHeaders);
        
        // ✅ УНИВЕРСАЛЬНО: Используем /api/user/me для получения данных
        // Для веб-версии используется cookie из логина, для Telegram - headers
        const response = await fetch('/api/user/me', {
          method: 'GET',
          credentials: 'include', // ✅ КРИТИЧНО: Отправляем cookies
          headers: apiHeaders
        });
        
        if (!response.ok) {
          console.error('❌ Ошибка получения данных пользователя:', response.status, response.statusText);
          // ✅ Если 404, это означает что API endpoint не найден - это проблема деплоя
          if (response.status === 404) {
            console.error('❌ [Profile] API endpoint /api/user/me не найден (404). Проверьте деплой на Vercel.');
          }
          return;
        }
        
        const result = await response.json();
        
        if (result.success && result.user) {
          console.log('✅ Данные пользователя загружены из БД:', result.user);
          console.log('📊 [Profile] Username из API:', result.user.username);
          console.log('📊 [Profile] FirstName из API:', result.user.firstName);
          console.log('📊 [Profile] Все поля user:', Object.keys(result.user));
          
          // ✅ КРИТИЧНО: Загружаем актуальный баланс из /api/user/balance
          const balanceResponse = await fetch('/api/user/balance', {
            method: 'GET',
            credentials: 'include', // ✅ КРИТИЧНО: Отправляем cookies
            headers: apiHeaders
          });
          
          let actualCoins = result.user.coins || 0;
          if (balanceResponse.ok) {
            const balanceResult = await balanceResponse.json();
            if (balanceResult.success && balanceResult.data) {
              actualCoins = balanceResult.data.balance || result.user.coins || 0;
              console.log('💰 Актуальный баланс из БД:', actualCoins);
            }
          }
          
          const userData = {
            id: result.user.id,
            username: result.user.username,
            firstName: result.user.firstName,
            lastName: result.user.lastName,
            telegramId: result.user.telegramId,
            coins: actualCoins, // ✅ ИСПОЛЬЗУЕМ актуальный баланс из БД
            rating: result.user.rating || 0,
            gamesPlayed: result.user.gamesPlayed || result.user.games_played || 0,
            wins: result.user.wins || 0,
            losses: result.user.losses || 0,
            status: result.user.status,
            avatar_url: result.user.avatar_url,
            is_admin: result.user.is_admin || false
          };
          
          setUser(userData);
          setIsAdmin(userData.is_admin || false);
          setAvatarUrl(userData.avatar_url || '😎');
          
          // Обновляем статистику
          setStats(prev => ({
            ...prev,
            rating: userData.rating || 0,
            gamesPlayed: userData.gamesPlayed || 0,
            wins: userData.wins || 0,
            losses: userData.losses || 0,
            winRate: userData.gamesPlayed > 0 
              ? Math.round(((userData.wins || 0) / userData.gamesPlayed) * 100)
              : 0
          }));
          
          console.log('✅ Статистика и баланс обновлены из БД:', {
            coins: actualCoins,
            rating: userData.rating,
            gamesPlayed: userData.gamesPlayed,
            wins: userData.wins
          });
        } else {
          console.error('❌ Пользователь не авторизован');
        }
        
      } catch (error) {
        console.error('❌ Ошибка загрузки данных пользователя:', error);
      }
    };

    const loadBonuses = async () => {
      try {
        console.log('🎁 Загружаем доступные бонусы...');
        const apiHeaders = getApiHeaders();
        const response = await fetch('/api/bonus', {
          method: 'GET',
          credentials: 'include', // ✅ КРИТИЧНО: Отправляем cookies
          headers: apiHeaders
        });
        
        if (response.ok) {
          const result = await response.json();
          if (result.success && result.bonuses) {
            console.log('✅ Бонусы загружены:', result.bonuses);
            setBonuses(result.bonuses);
          }
        }
      } catch (error) {
        console.warn('⚠️ Не удалось загрузить бонусы:', error);
      }
    };
    
    const loadInventory = async () => {
      try {
        console.log('📦 Загружаем инвентарь пользователя...');
        
        // ✅ УНИВЕРСАЛЬНО: Используем универсальные headers
        const apiHeaders = getApiHeaders();
        
        const response = await fetch('/api/shop/inventory', {
          method: 'GET',
          credentials: 'include', // ✅ КРИТИЧНО: Отправляем cookies
          headers: apiHeaders
        });
        
        if (response.ok) {
          const result = await response.json();
          if (result.success && result.inventory) {
            console.log('✅ Инвентарь загружен:', result.inventory);
            setInventory(result.inventory);
            
            // Обновляем список купленных предметов
            const purchased = result.inventory.map((item: any) => item.item_id);
            setPurchasedItems(purchased);
            
            // Устанавливаем активные предметы
            const activeFrame = result.inventory.find((item: any) => item.item_type === 'frame' && item.is_active);
            if (activeFrame) {
              setSelectedFrame(activeFrame.item_id);
            }
          }
        }
      } catch (error) {
        console.warn('⚠️ Не удалось загрузить инвентарь:', error);
      }
    };

    // ✅ ФУНКЦИЯ ЗАГРУЗКИ КОЛОДЫ С RETRY МЕХАНИЗМОМ
    const loadDeckCards = async (retryCount = 0) => {
      try {
        setIsLoadingDeck(true);
        console.log('🎴 Загружаем колоду пользователя...');
        
        // ✅ УНИВЕРСАЛЬНО: Используем универсальные headers
        const apiHeaders = {
          ...getApiHeaders(),
          'Cache-Control': 'no-cache' // ✅ ОТКЛЮЧАЕМ КЭШИРОВАНИЕ
        };
        
        const response = await fetch('/api/user/deck', {
          method: 'GET',
          credentials: 'include', // ✅ КРИТИЧНО: Отправляем cookies
          headers: apiHeaders,
          cache: 'no-store' // ✅ ОТКЛЮЧАЕМ КЭШИРОВАНИЕ
        });
        
        if (response.ok) {
          const result = await response.json();
          if (result.success && result.deck) {
            console.log(`✅ Колода загружена: ${result.deck.length} карт`);
            setDeckCards(result.deck);
          } else if (retryCount < 2) {
            // ✅ RETRY: Повторяем запрос если не получили данные
            console.log(`🔄 Retry загрузки колоды (попытка ${retryCount + 1})...`);
            setTimeout(() => loadDeckCards(retryCount + 1), 1000 * (retryCount + 1));
          }
        } else {
          console.error('❌ Ошибка загрузки колоды:', response.status);
          // ✅ RETRY: Повторяем запрос при ошибке
          if (retryCount < 2) {
            setTimeout(() => loadDeckCards(retryCount + 1), 1000 * (retryCount + 1));
          }
        }
      } catch (error) {
        console.error('❌ Не удалось загрузить колоду:', error);
        // ✅ RETRY: Повторяем запрос при ошибке
        if (retryCount < 2) {
          setTimeout(() => loadDeckCards(retryCount + 1), 1000 * (retryCount + 1));
        }
      } finally {
        setIsLoadingDeck(false);
      }
    };
    
    loadUserData();
    loadBonuses();
    loadInventory();
    loadDeckCards();
    
    // ✅ СЛУШАЕМ СОБЫТИЯ ОБНОВЛЕНИЯ КОЛЛЕКЦИИ И КОЛОДЫ
    const handleDeckUpdate = () => {
      console.log('🔄 Обновляем колоду...');
      loadDeckCards();
    };
    
    // ✅ СЛУШАЕМ СОБЫТИЯ ОБНОВЛЕНИЯ БАЛАНСА
    const handleBalanceUpdate = () => {
      console.log('🔄 Обновляем баланс пользователя...');
      loadUserData(); // Перезагружаем данные пользователя (включая баланс)
    };
    
    window.addEventListener('deck-updated', handleDeckUpdate);
    window.addEventListener('nft-deck-updated', handleDeckUpdate); // ✅ Новое событие
    window.addEventListener('balance-updated', handleBalanceUpdate);
    
    return () => {
      window.removeEventListener('deck-updated', handleDeckUpdate);
      window.removeEventListener('balance-updated', handleBalanceUpdate);
    };
  }, []);
  const [activeSection, setActiveSection] = useState('stats'); // 'stats', 'achievements', 'wallet'
  const [showModal, setShowModal] = useState<'skins' | 'effects' | 'bonuses' | 'frames' | 'deck' | 'wallet' | null>(null);
  const [selectedSkin, setSelectedSkin] = useState('classic');
  const [selectedEffect, setSelectedEffect] = useState('none');
  const [selectedFrame, setSelectedFrame] = useState('default');
  const [purchasedItems, setPurchasedItems] = useState<string[]>([]);
  const [inventory, setInventory] = useState<any[]>([]);
  const [deckCards, setDeckCards] = useState<any[]>([]);
  const [isLoadingDeck, setIsLoadingDeck] = useState(false);

  // Скины для карт
  const cardSkins = [
    {
      id: 'classic',
      name: 'Классический',
      description: 'Стандартные карты',
      preview: '🂡',
      price: 0,
      unlocked: true,
      rarity: 'common'
    },
    {
      id: 'royal',
      name: 'Королевский',
      description: 'Элегантные золотые карты',
      preview: '👑',
      price: 500,
      unlocked: false,
      rarity: 'rare'
    },
    {
      id: 'neon',
      name: 'Неоновый',
      description: 'Светящиеся карты в стиле киберпанк',
      preview: '⚡',
      price: 750,
      unlocked: false,
      rarity: 'epic'
    },
    {
      id: 'cosmic',
      name: 'Космический',
      description: 'Карты с эффектом звездного неба',
      preview: '🌌',
      price: 1000,
      unlocked: false,
      rarity: 'legendary'
    }
  ];

  // Эффекты для игры
  const gameEffects = [
    {
      id: 'none',
      name: 'Без эффектов',
      description: 'Стандартная игра',
      preview: '🎴',
      price: 0,
      unlocked: true
    },
    {
      id: 'particles',
      name: 'Частицы',
      description: 'Красивые частицы при ходах',
      preview: '✨',
      price: 200,
      unlocked: false
    },
    {
      id: 'lightning',
      name: 'Молнии',
      description: 'Эффект молний при победе',
      preview: '⚡',
      price: 350,
      unlocked: false
    },
    {
      id: 'fire',
      name: 'Огонь',
      description: 'Огненные эффекты при взятии карт',
      preview: '🔥',
      price: 500,
      unlocked: false
    }
  ];

  // Бонусы
  const [bonuses, setBonuses] = useState<Array<{
    id: string;
    name: string;
    description: string;
    reward: string;
    icon: string;
    available: boolean;
    cooldown?: null;
    cooldownUntil?: Date | null;
    referrals?: number;
    nextRank?: string;
    link?: string;
    note?: string;
  }>>([
    {
      id: 'daily',
      name: 'Ежедневный бонус',
      description: 'Получайте монеты каждый день',
      reward: '50-200 монет',
      icon: '📅',
      available: true,
      cooldown: null,
      cooldownUntil: null
    },
    {
      id: 'referral',
      name: 'Реферальная система',
      description: 'Приглашайте друзей и получайте бонусы',
      reward: '500 монет за активного друга',
      icon: '👥',
      available: true,
      referrals: 0
    },
    {
      id: 'telegram_subscribe',
      name: 'Подписка в Telegram',
      description: 'Подпишитесь на наш Telegram канал',
      reward: '300 монет',
      icon: '📢',
      available: true,
      link: process.env.NEXT_PUBLIC_TELEGRAM_CHANNEL_LINK || 'https://t.me/your_channel',
      note: 'Подпишитесь на канал и получите бонус!'
    },
    {
      id: 'vk_subscribe',
      name: 'Подписка в ВК',
      description: 'Подпишитесь на наше сообщество ВКонтакте',
      reward: '300 монет',
      icon: '👥',
      available: true,
      link: process.env.NEXT_PUBLIC_VK_GROUP_LINK || 'https://vk.com/your_group',
      note: 'Подпишитесь на сообщество и получите бонус!'
    },
    {
      id: 'rank_up',
      name: 'Повышение ранга',
      description: 'Бонусы за достижение новых рангов',
      reward: '500-2000 монет',
      icon: '🏆',
      available: false,
      nextRank: 'Серебро'
    }
  ]);

  // ✏️ ОБРАБОТКА ИЗМЕНЕНИЯ ИМЕНИ
  const handleUsernameChange = async (newUsername: string) => {
    try {
      console.log('✏️ Обновление имени пользователя:', newUsername);

      const response = await fetch('/api/user/username', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ username: newUsername })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Ошибка обновления имени');
      }

      if (result.success) {
        console.log('✅ Имя успешно обновлено');
        setUser((prev: any) => prev ? { ...prev, username: newUsername } : null);
        alert(`✅ Имя успешно изменено на "${newUsername}"!`);
      }
    } catch (error: any) {
      console.error('❌ Ошибка изменения имени:', error);
      alert(`❌ ${error.message}`);
    }
  };

  // ✅ ИСПРАВЛЕНО: Обработка получения бонусов через Supabase API
  const handleBonusClick = async (bonusId: string) => {
    console.log('🎁 Получение бонуса через API:', bonusId);
    
    // ✅ НОВОЕ: Для реферального бонуса показываем ссылку для приглашения
    if (bonusId === 'referral') {
      try {
        const currentUser = getCurrentUser();
        const referralCode = currentUser?.id || user?.telegramId || user?.id || 'player_' + Date.now();
        // ✅ ИСПРАВЛЕНО: Реферальная ссылка на Telegram бота
        const botUsername = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME || 'your_bot_username';
        const inviteUrl = `https://t.me/${botUsername}?start=ref_${referralCode}`;
        
        // Если мы в Telegram WebApp, используем Telegram Share API
        if (typeof window !== 'undefined' && window.Telegram?.WebApp) {
          const tg = window.Telegram.WebApp;
          const inviteText = `🎮 Присоединяйся к игре P.I.D.R.!\n\nПолучи +500 монет за регистрацию по моей ссылке!\n\n${inviteUrl}`;
          
          if (typeof tg.openTelegramLink === 'function') {
            tg.openTelegramLink(`https://t.me/share/url?url=${encodeURIComponent(inviteUrl)}&text=${encodeURIComponent(inviteText)}`);
          } else {
            window.open(`https://t.me/share/url?url=${encodeURIComponent(inviteUrl)}&text=${encodeURIComponent(inviteText)}`, '_blank');
          }
        } else {
          // Fallback - копируем в буфер обмена
          if (navigator.clipboard) {
            await navigator.clipboard.writeText(inviteUrl);
            alert(`✅ Реферальная ссылка скопирована!\n\n${inviteUrl}\n\nПоделитесь ей с друзьями и получите +500 монет за каждого активного друга!`);
          } else {
            prompt('Скопируйте эту ссылку и поделитесь с друзьями:', inviteUrl);
          }
        }
      } catch (error: any) {
        console.error('❌ Ошибка создания реферальной ссылки:', error);
        alert(`❌ Ошибка: ${error.message || 'Не удалось создать реферальную ссылку'}`);
      }
      return; // Выходим, не обрабатываем как обычный бонус
    }
    
    // ✅ НОВОЕ: Для бонусов за подписки открываем ссылку
    const bonus = bonuses.find(b => b.id === bonusId);
    if ((bonusId === 'telegram_subscribe' || bonusId === 'vk_subscribe') && bonus?.link) {
      // Открываем ссылку на подписку
      if (typeof window !== 'undefined' && (window as any).Telegram?.WebApp?.openLink) {
        (window as any).Telegram.WebApp.openLink(bonus.link);
      } else {
        window.open(bonus.link, '_blank');
      }
      
      // Показываем сообщение с инструкцией
      alert(`📢 Подпишитесь на ${bonusId === 'telegram_subscribe' ? 'Telegram канал' : 'сообщество ВК'} и вернитесь сюда, чтобы получить бонус!\n\nПосле подписки нажмите кнопку "Получить бонус" еще раз.`);
      return; // Выходим, пользователь должен подписаться
    }
    
    try {
      console.log('🔑 Отправляем запрос на получение бонуса...');
      
      // Отправляем запрос на API - токен передается автоматически через HttpOnly cookies
      const response = await fetch('/api/bonus', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // Включаем cookies (КРИТИЧНО для HttpOnly cookies)
        body: JSON.stringify({
          bonusType: bonusId
        })
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        // Если это ошибка таймера, обновляем статус бонуса
        if (result.data?.cooldownUntil) {
          setBonuses(prev => prev.map(bonus => 
            bonus.id === bonusId 
              ? { ...bonus, available: false, cooldownUntil: result.data.cooldownUntil }
              : bonus
          ));
        }
        throw new Error(result.message || 'Ошибка сервера');
      }
      
      if (result.success) {
        const { bonusAmount, newBalance, description } = result.data;
        
        console.log(`✅ Бонус получен: +${bonusAmount} монет`);
        
        // Обновляем локальный баланс для UI
        setUser((prev: any) => prev ? { ...prev, coins: newBalance } : null);

        // ✅ ОБНОВЛЯЕМ СТАТУС БОНУСА
        if (bonusId === 'daily') {
          const nextBonusTime = new Date(Date.now() + 24 * 60 * 60 * 1000);
          setBonuses(prev => prev.map(bonus => 
            bonus.id === bonusId 
              ? { ...bonus, available: false, cooldownUntil: nextBonusTime }
              : bonus
          ));
        } else if (bonusId === 'telegram_subscribe' || bonusId === 'vk_subscribe') {
          // Обновляем статус бонуса за подписку
          setBonuses(prev => prev.map(bonus => 
            bonus.id === bonusId 
              ? { ...bonus, available: false }
              : bonus
          ));
        }
        
        // Отправляем событие обновления баланса
        window.dispatchEvent(new CustomEvent('coinsUpdated', { 
          detail: { coins: newBalance } 
        }));
        
        // Показываем уведомление
        alert(`🎉 ${description}!\nПолучено: ${bonusAmount} монет\nНовый баланс: ${newBalance.toLocaleString()}`);
        
        console.log(`✅ Бонус "${bonusId}" успешно получен через API`);
        
      } else {
        throw new Error(result.message || 'Неизвестная ошибка');
      }
      
    } catch (error: any) {
      console.error('❌ Ошибка получения бонуса:', error);
      alert(`❌ Ошибка: ${error.message || 'Не удалось получить бонус'}`);
    }
  };

  // 🛒 ПОКУПКА ПРЕДМЕТА
  const handlePurchaseItem = async (item: any, itemType: 'skin' | 'effect' | 'frame') => {
    try {
      console.log('🛒 Покупка предмета:', item);
      
      if (!user || user.coins < item.price) {
        alert('❌ Недостаточно монет для покупки!');
        return;
      }
      
      const response = await fetch('/api/shop/purchase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          item_id: item.id,
          item_type: itemType,
          item_name: item.name,
          price: item.price,
          metadata: {
            description: item.description,
            preview: item.preview,
            rarity: item.rarity
          }
        })
      });
      
      const result = await response.json();
      
      if (!response.ok || !result.success) {
        throw new Error(result.message || 'Ошибка покупки');
      }
      
      console.log('✅ Предмет куплен:', result);
      
      // Обновляем баланс
      setUser((prev: any) => prev ? { ...prev, coins: result.new_balance } : null);
      
      // Добавляем в список купленных
      setPurchasedItems(prev => [...prev, item.id]);
      
      // Перезагружаем инвентарь
      // ✅ УНИВЕРСАЛЬНО: Используем универсальные headers
      const inventoryHeaders = getApiHeaders();
      
      const inventoryResponse = await fetch('/api/shop/inventory', {
        method: 'GET',
        headers: inventoryHeaders,
        credentials: 'include'
      });
      
      if (inventoryResponse.ok) {
        const inventoryResult = await inventoryResponse.json();
        if (inventoryResult.success) {
          setInventory(inventoryResult.inventory);
        }
      }
      
      alert(`✅ ${item.name} успешно куплен!`);
      
    } catch (error: any) {
      console.error('❌ Ошибка покупки:', error);
      alert(`❌ ${error.message}`);
    }
  };

  // ✨ АКТИВАЦИЯ ПРЕДМЕТА
  const handleActivateItem = async (inventoryItemId: string, itemId: string, itemType: 'skin' | 'effect' | 'frame') => {
    try {
      console.log('✨ Активация предмета:', inventoryItemId);
      
      const response = await fetch('/api/shop/activate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          inventory_item_id: inventoryItemId,
          is_active: true
        })
      });
      
      const result = await response.json();
      
      if (!response.ok || !result.success) {
        throw new Error(result.message || 'Ошибка активации');
      }
      
      console.log('✅ Предмет активирован:', result);
      
      // Обновляем локальное состояние
      if (itemType === 'frame') {
        setSelectedFrame(itemId);
      } else if (itemType === 'skin') {
        setSelectedSkin(itemId);
      } else if (itemType === 'effect') {
        setSelectedEffect(itemId);
      }
      
      // Перезагружаем инвентарь
      // ✅ УНИВЕРСАЛЬНО: Используем универсальные headers
      const inventoryHeaders = getApiHeaders();
      
      const inventoryResponse = await fetch('/api/shop/inventory', {
        method: 'GET',
        headers: inventoryHeaders,
        credentials: 'include'
      });
      
      if (inventoryResponse.ok) {
        const inventoryResult = await inventoryResponse.json();
        if (inventoryResult.success) {
          setInventory(inventoryResult.inventory);
        }
      }
      
      alert(`✅ Предмет активирован!`);
      
    } catch (error: any) {
      console.error('❌ Ошибка активации:', error);
      alert(`❌ ${error.message}`);
    }
  };

  // ✅ УДАЛЕНИЕ КАРТЫ ИЗ КОЛОДЫ
  const handleRemoveFromDeck = async (deckCardId: number) => {
    if (!confirm('Удалить эту карту из колоды?')) {
      return;
    }

    try {
      // ✅ УНИВЕРСАЛЬНО: Используем универсальные headers
      const headers = getApiHeaders();

      const response = await fetch('/api/user/deck', {
        method: 'DELETE',
        headers,
        credentials: 'include',
        body: JSON.stringify({ deckCardId })
      });

      const result = await response.json();

      if (response.ok && result.success) {
        // ✅ ОБНОВЛЯЕМ КОЛОДУ ПОСЛЕ УДАЛЕНИЯ
        setDeckCards(prev => prev.filter(card => card.id !== deckCardId));
        
        // Показываем уведомление через Telegram WebApp
        if ((window as any).Telegram?.WebApp?.showAlert) {
          (window as any).Telegram.WebApp.showAlert('✅ Карта удалена из колоды!');
        } else {
          alert('✅ Карта удалена из колоды!');
        }
      } else {
        alert(`❌ Ошибка: ${result.error}`);
      }
    } catch (error: any) {
      console.error('❌ Ошибка удаления из колоды:', error);
      alert(`❌ ${error.message}`);
    }
  };

  // State для подключенных кошельков
  const [connectedWallets, setConnectedWallets] = useState<{ton?: string, solana?: string}>({});
  
  // Загружаем подключенные кошельки при инициализации
  useEffect(() => {
    const loadConnectedWallets = async () => {
      try {
        console.log('🔍 [Profile] Загружаем сохраненные кошельки...');
        const response = await fetch('/api/nft/connect-wallet', {
          method: 'GET',
          credentials: 'include',
          headers: getApiHeaders()
        });
        
        if (response.ok) {
          const result = await response.json();
          console.log('🔍 [Profile] Результат загрузки кошельков:', result);
          if (result.success && result.wallets && result.wallets.length > 0) {
            // Берем последний подключенный TON кошелек
            const tonWallet = result.wallets.find((w: any) => w.wallet_type === 'ton');
            if (tonWallet) {
              console.log('✅ [Profile] Загружен сохраненный TON кошелек:', tonWallet.wallet_address);
              setConnectedWallets(prev => ({ ...prev, ton: tonWallet.wallet_address }));
            } else {
              console.log('⚠️ [Profile] TON кошелек не найден в сохраненных кошельках');
            }
          } else {
            console.log('⚠️ [Profile] Нет сохраненных кошельков');
          }
        } else {
          console.error('❌ [Profile] Ошибка ответа сервера:', response.status);
        }
      } catch (error) {
        console.error('❌ [Profile] Ошибка загрузки кошельков:', error);
      }
    };
    
    loadConnectedWallets();
  }, []);

  const handleBurningMint = async () => {
    try {
      console.log('🔥 Генерация горящей NFT карты...');
      
      if (!user || user.coins < 20000) {
        alert('❌ Недостаточно монет! Требуется 20 000 монет.');
        return;
      }
      
      if (!confirm('🔥 Сгенерировать уникальную горящую NFT карту за 20 000 монет?\n\nКарта будет создана и привязана к вашему кошельку (опционально).')) {
        return;
      }

      // Опционально: привязываем к кошельку если подключен
      const wallet_address = connectedWallets.ton || connectedWallets.solana;
      const network = connectedWallets.ton ? 'TON' : connectedWallets.solana ? 'SOL' : undefined;
      
      const response = await fetch('/api/nft/mint-burning', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ 
          wallet_address, 
          network 
        }),
      });
      
      const result = await response.json();
      
      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Ошибка генерации NFT');
      }
      
      console.log('✅ Горящая NFT карта создана:', result.nft);
      
      // Обновляем баланс
      if (user) {
        setUser({ ...user, coins: result.newBalance });
      }
      
      alert(`🔥 Поздравляем! Вы получили ${result.nft.rarity} карту:\n${result.nft.rank} ${getSuitEmoji(result.nft.suit)}\n\nОгонь: ${result.nft.burningParams.fireColor}\nИнтенсивность: ${result.nft.burningParams.intensity}\n\n${wallet_address ? `✅ Привязана к кошельку: ${wallet_address.slice(0, 8)}...` : '📦 Сохранена в аккаунте'}`);
      
    } catch (error: any) {
      console.error('❌ Ошибка генерации горящей NFT:', error);
      alert(`❌ ${error.message}`);
    }
  };

  const getSuitEmoji = (suit: string): string => {
    switch (suit) {
      case 'hearts': return '♥️';
      case 'diamonds': return '♦️';
      case 'clubs': return '♣️';
      case 'spades': return '♠️';
      default: return suit;
    }
  };

  const handleAvatarChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Проверяем размер файла (максимум 5MB)
      if (file.size > 5 * 1024 * 1024) {
        alert('Файл слишком большой. Максимальный размер: 5MB');
        return;
      }
      
      // Проверяем тип файла
      if (!file.type.startsWith('image/')) {
        alert('Пожалуйста, выберите изображение');
        return;
      }

      // Создаем URL для предварительного просмотра
      const reader = new FileReader();
      reader.onload = async (e) => {
        const result = e.target?.result as string;
        setAvatarUrl(result);
        
        try {
          // Сохраняем аватар в Supabase БД через API
          console.log('💾 Сохраняем аватар в БД...');
          
          const response = await fetch('/api/user/avatar', {
            method: 'POST',
            credentials: 'include',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              avatar_url: result
            })
          });
          
          if (response.ok) {
            const updateResult = await response.json();
            if (updateResult.success) {
              console.log('✅ Аватар сохранен в БД');
              // Обновляем локальное состояние
              setUser((prev: any) => prev ? { ...prev, avatar_url: result } : null);
            } else {
              console.error('❌ Ошибка сохранения аватара:', updateResult.message);
            }
          } else {
            console.error('❌ Ошибка API при сохранении аватара:', response.status);
          }
        } catch (error) {
          console.error('❌ Ошибка сохранения аватара:', error);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Данные пользователя загружаются через useEffect выше
  
  const handleLogout = async () => {
    try {
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include'
      });

      if (response.ok) {
        // Перенаправляем на страницу входа
        router.push('/auth/login');
      } else {
        console.error('Ошибка выхода');
        // Все равно перенаправляем
        router.push('/auth/login');
      }
    } catch (error) {
      console.error('Ошибка выхода:', error);
      // Все равно перенаправляем
      router.push('/auth/login');
    }
  };

  const handleBalanceUpdate = (newBalance: number) => {
    // Обновляем баланс в состоянии пользователя (БД обновляется через API)
    if (user) {
      const updatedUser = { ...user, coins: newBalance };
      setUser(updatedUser);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #334155 100%)',
      padding: '20px',
      paddingTop: '80px',
      paddingBottom: '40px'
    }}>
      {/* Кнопка назад */}
      <motion.button
        initial={{ x: -20, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => {
          // ✅ Сохраняем сессию перед переходом
          console.log('🔙 [Profile] Возврат на главную страницу...');
          router.push('/');
        }}
        style={{
          position: 'fixed',
          top: '20px',
          left: '20px',
          background: 'rgba(239, 68, 68, 0.2)',
          border: '2px solid rgba(239, 68, 68, 0.3)',
          borderRadius: '12px',
          padding: '12px',
          color: '#ef4444',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          fontSize: '16px',
          fontWeight: '600',
          zIndex: 100,
          backdropFilter: 'blur(10px)'
        }}
      >
        <ArrowLeft size={20} />
        {t.profile.back}
      </motion.button>

      <div style={{
        maxWidth: '800px',
        margin: '0 auto'
      }}>
        {/* Заголовок */}
        <motion.div 
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          style={{
            textAlign: 'center',
            marginBottom: '30px'
          }}
        >
          <h1 style={{
            fontSize: '42px',
            fontWeight: '900',
            background: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 50%, #ea580c 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            marginBottom: '10px'
          }}>
            ПРОФИЛЬ
          </h1>
        </motion.div>

        {/* Компактный блок: Аватар + Друзья слева, Бонусы + Колода справа */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1 }}
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '15px',
            marginBottom: '20px'
          }}
        >
          {/* ЛЕВАЯ КОЛОНКА: Аватар + Ник + Монеты + Кнопки */}
          <div style={{
            background: 'linear-gradient(145deg, rgba(30, 41, 59, 0.95) 0%, rgba(15, 23, 42, 0.95) 100%)',
            border: '2px solid rgba(99, 102, 241, 0.3)',
            borderRadius: '16px',
            padding: '15px',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '10px'
          }}>
            {/* Аватар (меньше) */}
            <div style={{
              width: '80px',
              height: '80px',
              borderRadius: '50%',
              border: '3px solid rgba(99, 102, 241, 0.5)',
              overflow: 'hidden',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.2), rgba(139, 92, 246, 0.2))'
            }}>
              {avatarUrl.startsWith('data:') || avatarUrl.startsWith('http') ? (
                <img src={avatarUrl} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <span style={{ fontSize: '40px' }}>{avatarUrl}</span>
              )}
            </div>

            {/* Ник */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h3 style={{
                color: '#f1f5f9',
                fontSize: '16px',
                fontWeight: '700',
                margin: 0
              }}>
                {user?.username || user?.firstName || 'Загрузка...'}
              </h3>
              <button
                onClick={() => {
                  const newUsername = prompt('Введите новое имя (3-20 символов):', user?.username || '');
                  if (newUsername && newUsername.length >= 3 && newUsername.length <= 20) {
                    handleUsernameChange(newUsername);
                  } else if (newUsername) {
                    alert('❌ Имя должно быть от 3 до 20 символов');
                  }
                }}
                style={{
                  background: 'rgba(59, 130, 246, 0.2)',
                  border: '1px solid rgba(59, 130, 246, 0.4)',
                  borderRadius: '6px',
                  padding: '4px 6px',
                  cursor: 'pointer',
                  fontSize: '12px'
                }}
              >
                ✏️
              </button>
            </div>

            {/* Монеты */}
            <div style={{
              background: 'linear-gradient(135deg, #fbbf24, #f59e0b)',
              padding: '6px 12px',
              borderRadius: '8px',
              fontWeight: '600',
              color: '#1f2937',
              fontSize: '14px'
            }}>
              💰 {(user?.coins || 0).toLocaleString()}
            </div>

            {/* Кнопки: Друзья, Аватар и Админ панель (если админ) */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: isAdmin ? '1fr 1fr 1fr' : '1fr 1fr',
              gap: '8px',
              width: '100%'
            }}>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => router.push('/friends')}
                style={{
                  background: 'rgba(59, 130, 246, 0.2)',
                  border: '2px solid rgba(59, 130, 246, 0.3)',
                  borderRadius: '10px',
                  padding: '8px',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '4px',
                  color: '#60a5fa',
                  fontWeight: '600',
                  fontSize: '11px'
                }}
              >
                <Users size={20} />
                ДРУЗЬЯ
              </motion.button>

              <input
                type="file"
                accept="image/*"
                onChange={handleAvatarChange}
                style={{ display: 'none' }}
                id="avatar-upload"
              />
              <motion.label
                htmlFor="avatar-upload"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                style={{
                  background: 'rgba(34, 197, 94, 0.2)',
                  border: '2px solid rgba(34, 197, 94, 0.3)',
                  borderRadius: '10px',
                  padding: '8px',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '4px',
                  color: '#4ade80',
                  fontWeight: '600',
                  fontSize: '11px'
                }}
              >
                <Camera size={20} />
                АВАТАР
              </motion.label>

              {isAdmin && (
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => router.push('/admin')}
                  style={{
                    background: 'rgba(239, 68, 68, 0.2)',
                    border: '2px solid rgba(239, 68, 68, 0.3)',
                    borderRadius: '10px',
                    padding: '8px',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '4px',
                    color: '#f87171',
                    fontWeight: '600',
                    fontSize: '11px'
                  }}
                >
                  <Shield size={20} />
                  АДМИН
                </motion.button>
              )}
            </div>
          </div>

          {/* ПРАВАЯ КОЛОНКА: Бонусы и Моя колода */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '15px'
          }}>
            {/* Бонусы */}
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setShowModal('bonuses')}
              style={{
                flex: 1,
                background: 'linear-gradient(145deg, rgba(251, 146, 60, 0.8) 0%, rgba(249, 115, 22, 0.6) 100%)',
                border: '2px solid rgba(251, 146, 60, 0.3)',
                borderRadius: '16px',
                padding: '15px',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)'
              }}
            >
              <Gift size={32} style={{ color: '#fef3c7' }} />
              <span style={{
                color: '#fef3c7',
                fontSize: '16px',
                fontWeight: '700'
              }}>
                🎁 БОНУСЫ
              </span>
            </motion.button>

            {/* Моя колода */}
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setShowModal('deck')}
              style={{
                flex: 1,
                background: 'linear-gradient(145deg, rgba(139, 92, 246, 0.8) 0%, rgba(124, 58, 237, 0.6) 100%)',
                border: '2px solid rgba(139, 92, 246, 0.3)',
                borderRadius: '16px',
                padding: '15px',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)'
              }}
            >
              <Sparkles size={32} style={{ color: '#e9d5ff' }} />
              <span style={{
                color: '#e9d5ff',
                fontSize: '16px',
                fontWeight: '700'
              }}>
                ✨ МОЯ КОЛОДА
              </span>
            </motion.button>
          </div>
        </motion.div>

        {/* 2 кнопки: КОШЕЛЕК (модалка) и РЕЙТИНГ */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '15px',
          marginBottom: '20px'
        }}>
          {/* КОШЕЛЕК → МОДАЛКА */}
          <motion.button
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3 }}
            whileHover={{ scale: 1.03, boxShadow: '0 8px 30px rgba(99, 102, 241, 0.4)' }}
            whileTap={{ scale: 0.97 }}
            onClick={() => setShowModal('wallet')}
            style={{
              background: 'linear-gradient(145deg, rgba(30, 41, 59, 0.95) 0%, rgba(15, 23, 42, 0.95) 100%)',
              border: '2px solid rgba(99, 102, 241, 0.4)',
              borderRadius: '16px',
              padding: '20px',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '10px',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
              transition: 'all 0.3s',
            }}
          >
            <Wallet size={32} style={{ color: '#6366f1' }} />
            <span style={{ color: '#f1f5f9', fontSize: '16px', fontWeight: '700' }}>КОШЕЛЕК</span>
          </motion.button>

          {/* РЕЙТИНГ */}
          <motion.button
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.35 }}
            whileHover={{ scale: 1.03, boxShadow: '0 8px 30px rgba(251, 191, 36, 0.4)' }}
            whileTap={{ scale: 0.97 }}
            onClick={() => router.push('/rating')}
            style={{
              background: 'linear-gradient(145deg, rgba(30, 41, 59, 0.95) 0%, rgba(15, 23, 42, 0.95) 100%)',
              border: '2px solid rgba(251, 191, 36, 0.4)',
              borderRadius: '16px',
              padding: '20px',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '10px',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
              transition: 'all 0.3s',
            }}
          >
            <Trophy size={32} style={{ color: '#fbbf24' }} />
            <span style={{ color: '#f1f5f9', fontSize: '16px', fontWeight: '700' }}>РЕЙТИНГ</span>
          </motion.button>
        </div>

        {/* СТАТИСТИКА — всегда видна inline */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.4 }}
          style={{ marginBottom: '20px' }}
        >
          <h3 style={{
            color: '#94a3b8',
            fontSize: '14px',
            fontWeight: '700',
            textTransform: 'uppercase',
            letterSpacing: '2px',
            textAlign: 'center',
            marginBottom: '12px'
          }}>
            📊 Статистика
          </h3>
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '10px',
          }}>
            <div style={{
              background: 'linear-gradient(145deg, rgba(30, 41, 59, 0.9) 0%, rgba(15, 23, 42, 0.9) 100%)',
              border: '1px solid rgba(99, 102, 241, 0.25)',
              borderRadius: '12px',
              padding: '14px',
              textAlign: 'center'
            }}>
              <div style={{ color: '#6366f1', fontSize: '22px', fontWeight: '800' }}>{stats.rating}</div>
              <div style={{ color: '#64748b', fontSize: '11px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '1px', marginTop: '4px' }}>Рейтинг</div>
            </div>
            <div style={{
              background: 'linear-gradient(145deg, rgba(30, 41, 59, 0.9) 0%, rgba(15, 23, 42, 0.9) 100%)',
              border: '1px solid rgba(59, 130, 246, 0.25)',
              borderRadius: '12px',
              padding: '14px',
              textAlign: 'center'
            }}>
              <div style={{ color: '#3b82f6', fontSize: '22px', fontWeight: '800' }}>{stats.gamesPlayed}</div>
              <div style={{ color: '#64748b', fontSize: '11px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '1px', marginTop: '4px' }}>Игр</div>
            </div>
            <div style={{
              background: 'linear-gradient(145deg, rgba(30, 41, 59, 0.9) 0%, rgba(15, 23, 42, 0.9) 100%)',
              border: '1px solid rgba(34, 197, 94, 0.25)',
              borderRadius: '12px',
              padding: '14px',
              textAlign: 'center'
            }}>
              <div style={{ color: '#22c55e', fontSize: '22px', fontWeight: '800' }}>{stats.wins}</div>
              <div style={{ color: '#64748b', fontSize: '11px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '1px', marginTop: '4px' }}>Побед</div>
            </div>
            <div style={{
              background: 'linear-gradient(145deg, rgba(30, 41, 59, 0.9) 0%, rgba(15, 23, 42, 0.9) 100%)',
              border: '1px solid rgba(239, 68, 68, 0.25)',
              borderRadius: '12px',
              padding: '14px',
              textAlign: 'center'
            }}>
              <div style={{ color: '#ef4444', fontSize: '22px', fontWeight: '800' }}>{stats.winRate}%</div>
              <div style={{ color: '#64748b', fontSize: '11px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '1px', marginTop: '4px' }}>Винрейт</div>
            </div>
          </div>
        </motion.div>

        {/* АДМИН ПАНЕЛЬ (только для админов) */}
        {isAdmin && (
          <motion.button
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.5 }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => router.push('/admin')}
            style={{
              width: '100%',
              background: 'linear-gradient(145deg, rgba(239, 68, 68, 0.2) 0%, rgba(220, 38, 38, 0.15) 100%)',
              border: '2px solid rgba(239, 68, 68, 0.3)',
              borderRadius: '16px',
              padding: '16px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              boxShadow: '0 4px 12px rgba(239, 68, 68, 0.15)',
              marginBottom: '15px',
            }}
          >
            <Shield size={24} style={{ color: '#f87171' }} />
            <span style={{ color: '#f87171', fontSize: '16px', fontWeight: '700', flex: 1, textAlign: 'left' }}>
              АДМИН ПАНЕЛЬ
            </span>
          </motion.button>
        )}

        {/* КНОПКА ВЫХОДА */}
        <motion.button
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.55 }}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleLogout}
          style={{
            width: '100%',
            background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.15) 0%, rgba(220, 38, 38, 0.1) 100%)',
            border: '2px solid rgba(239, 68, 68, 0.25)',
            borderRadius: '16px',
            padding: '14px',
            color: '#ef4444',
            fontSize: '15px',
            fontWeight: '600',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '10px',
            marginBottom: '40px',
          }}
        >
          <LogOut size={18} />
          Выйти из профиля
        </motion.button>

      </div>

      {/* МОДАЛКА КОШЕЛЬКА */}
      {showModal === 'wallet' && (
        <div 
          onClick={() => setShowModal(null)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.85)',
            backdropFilter: 'blur(12px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '10px'
          }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.85, y: 40 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.85, y: 40 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            onClick={(e) => e.stopPropagation()}
            style={{
              background: 'linear-gradient(145deg, rgba(15, 23, 42, 0.98) 0%, rgba(30, 41, 59, 0.98) 100%)',
              borderRadius: '24px',
              padding: '0',
              width: '95vw',
              maxWidth: '480px',
              maxHeight: '90vh',
              overflowY: 'auto',
              border: '1px solid rgba(99, 102, 241, 0.3)',
              boxShadow: '0 25px 60px rgba(0, 0, 0, 0.5), 0 0 40px rgba(99, 102, 241, 0.1)'
            }}
          >
            {/* Хедер кошелька */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '18px 20px',
              borderBottom: '1px solid rgba(99, 102, 241, 0.15)',
              background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.1) 0%, rgba(139, 92, 246, 0.05) 100%)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Wallet size={22} style={{ color: '#818cf8' }} />
                <h3 style={{ color: '#e2e8f0', fontSize: '1.2rem', fontWeight: '700', margin: 0 }}>
                  Кошелёк
                </h3>
              </div>
              <motion.button
                whileHover={{ scale: 1.1, rotate: 90 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => setShowModal(null)}
                style={{
                  background: 'rgba(239, 68, 68, 0.15)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  borderRadius: '10px',
                  color: '#f87171',
                  width: '36px',
                  height: '36px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  fontSize: '18px',
                  fontWeight: '700',
                }}
              >
                ✕
              </motion.button>
            </div>
            {/* Содержимое кошелька */}
            <div style={{ padding: '0' }}>
              <GameWallet user={user} onBalanceUpdate={handleBalanceUpdate} />
            </div>
          </motion.div>
        </div>
      )}

      {/* Модальные окна (бонусы, рамки, колода) */}
      {showModal && showModal !== 'wallet' && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.8)',
          backdropFilter: 'blur(10px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '20px'
        }}>
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 50 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 50 }}
            style={{
              background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.95) 0%, rgba(15, 23, 42, 0.95) 100%)',
              borderRadius: '24px',
              padding: '24px',
              width: '90vw',
              maxWidth: '420px',
              maxHeight: '80vh',
              overflowY: 'auto',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              boxShadow: '0 20px 40px rgba(0, 0, 0, 0.3)'
            }}
          >
            {/* Заголовок модального окна */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '20px'
            }}>
              <h3 style={{
                color: '#e2e8f0',
                fontSize: '1.5rem',
                fontWeight: '700',
                margin: 0
              }}>
                {showModal === 'bonuses' && '🎁 БОНУСЫ'}
                {showModal === 'frames' && '🖼️ РАМКИ АВАТАРОВ'}
                {showModal === 'deck' && '🎴 МОЯ КОЛОДА'}
              </h3>
              <button
                onClick={() => setShowModal(null)}
                style={{
                  background: 'rgba(239, 68, 68, 0.8)',
                  border: '1px solid rgba(239, 68, 68, 0.4)',
                  borderRadius: '12px',
                  color: '#e2e8f0',
                  padding: '8px 16px',
                  cursor: 'pointer',
                  fontWeight: '600',
                  fontSize: '0.9rem',
                  transition: 'all 0.3s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(239, 68, 68, 1)';
                  e.currentTarget.style.transform = 'scale(1.05)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(239, 68, 68, 0.8)';
                  e.currentTarget.style.transform = 'scale(1)';
                }}
              >
                <ArrowLeft style={{ width: '16px', height: '16px', marginRight: '4px' }} />
                Назад
              </button>
            </div>

            {/* Содержимое модального окна */}
            {/* ❌ УДАЛЕНО: showModal === 'skins' */}
            {false && showModal === 'skins' && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                {cardSkins.map((skin) => (
                  <motion.div
                    key={skin.id}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => skin.unlocked && setSelectedSkin(skin.id)}
                    style={{
                      background: selectedSkin === skin.id 
                        ? 'linear-gradient(135deg, rgba(34, 197, 94, 0.8) 0%, rgba(22, 163, 74, 0.6) 100%)'
                        : skin.unlocked 
                          ? 'linear-gradient(135deg, rgba(71, 85, 105, 0.8) 0%, rgba(51, 65, 85, 0.6) 100%)'
                          : 'linear-gradient(135deg, rgba(55, 65, 81, 0.6) 0%, rgba(31, 41, 55, 0.4) 100%)',
                      border: selectedSkin === skin.id 
                        ? '2px solid rgba(34, 197, 94, 0.8)' 
                        : '1px solid rgba(255, 255, 255, 0.1)',
                      borderRadius: '16px',
                      padding: '16px',
                      cursor: skin.unlocked ? 'pointer' : 'not-allowed',
                      opacity: skin.unlocked ? 1 : 0.6,
                      position: 'relative',
                      overflow: 'hidden'
                    }}
                  >
                    {/* Индикатор редкости */}
                    <div style={{
                      position: 'absolute',
                      top: '8px',
                      right: '8px',
                      padding: '4px 8px',
                      borderRadius: '8px',
                      fontSize: '0.7rem',
                      fontWeight: '600',
                      background: skin.rarity === 'legendary' ? 'linear-gradient(135deg, #fbbf24, #f59e0b)' :
                                 skin.rarity === 'epic' ? 'linear-gradient(135deg, #a855f7, #9333ea)' :
                                 skin.rarity === 'rare' ? 'linear-gradient(135deg, #3b82f6, #2563eb)' :
                                 'linear-gradient(135deg, #6b7280, #4b5563)',
                      color: '#fff'
                    }}>
                      {skin.rarity === 'legendary' ? 'ЛЕГЕНДА' :
                       skin.rarity === 'epic' ? 'ЭПИК' :
                       skin.rarity === 'rare' ? 'РЕДКИЙ' : 'ОБЫЧНЫЙ'}
                    </div>

                    <div style={{ textAlign: 'center', marginTop: '20px' }}>
                      <div style={{ fontSize: '3rem', marginBottom: '12px' }}>{skin.preview}</div>
                      <h4 style={{ color: '#e2e8f0', fontSize: '1.1rem', fontWeight: '600', margin: '0 0 8px 0' }}>
                        {skin.name}
                      </h4>
                      <p style={{ color: '#94a3b8', fontSize: '0.9rem', margin: '0 0 12px 0' }}>
                        {skin.description}
                      </p>
                      
                      {skin.unlocked ? (
                        selectedSkin === skin.id ? (
                          <div style={{
                            background: 'rgba(34, 197, 94, 0.8)',
                            color: '#fff',
                            padding: '8px 16px',
                            borderRadius: '12px',
                            fontSize: '0.8rem',
                            fontWeight: '600'
                          }}>
                            ✅ ВЫБРАН
                          </div>
                        ) : (
                          <div style={{
                            background: 'rgba(59, 130, 246, 0.8)',
                            color: '#fff',
                            padding: '8px 16px',
                            borderRadius: '12px',
                            fontSize: '0.8rem',
                            fontWeight: '600'
                          }}>
                            👆 ВЫБРАТЬ
                          </div>
                        )
                      ) : (
                        <div style={{
                          background: 'rgba(239, 68, 68, 0.8)',
                          color: '#fff',
                          padding: '8px 16px',
                          borderRadius: '12px',
                          fontSize: '0.8rem',
                          fontWeight: '600'
                        }}>
                          🔒 {skin.price} монет
                        </div>
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>
            )}

            {/* ❌ УДАЛЕНО: showModal === 'effects' */}
            {false && showModal === 'effects' && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                {gameEffects.map((effect) => (
                  <motion.div
                    key={effect.id}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => effect.unlocked && setSelectedEffect(effect.id)}
                    style={{
                      background: selectedEffect === effect.id 
                        ? 'linear-gradient(135deg, rgba(34, 197, 94, 0.8) 0%, rgba(22, 163, 74, 0.6) 100%)'
                        : effect.unlocked 
                          ? 'linear-gradient(135deg, rgba(71, 85, 105, 0.8) 0%, rgba(51, 65, 85, 0.6) 100%)'
                          : 'linear-gradient(135deg, rgba(55, 65, 81, 0.6) 0%, rgba(31, 41, 55, 0.4) 100%)',
                      border: selectedEffect === effect.id 
                        ? '2px solid rgba(34, 197, 94, 0.8)' 
                        : '1px solid rgba(255, 255, 255, 0.1)',
                      borderRadius: '16px',
                      padding: '16px',
                      cursor: effect.unlocked ? 'pointer' : 'not-allowed',
                      opacity: effect.unlocked ? 1 : 0.6,
                      textAlign: 'center'
                    }}
                  >
                    <div style={{ fontSize: '3rem', marginBottom: '12px' }}>{effect.preview}</div>
                    <h4 style={{ color: '#e2e8f0', fontSize: '1.1rem', fontWeight: '600', margin: '0 0 8px 0' }}>
                      {effect.name}
                    </h4>
                    <p style={{ color: '#94a3b8', fontSize: '0.9rem', margin: '0 0 12px 0' }}>
                      {effect.description}
                    </p>
                    
                    {effect.unlocked ? (
                      selectedEffect === effect.id ? (
                        <div style={{
                          background: 'rgba(34, 197, 94, 0.8)',
                          color: '#fff',
                          padding: '8px 16px',
                          borderRadius: '12px',
                          fontSize: '0.8rem',
                          fontWeight: '600'
                        }}>
                          ✅ АКТИВЕН
                        </div>
                      ) : (
                        <div style={{
                          background: 'rgba(59, 130, 246, 0.8)',
                          color: '#fff',
                          padding: '8px 16px',
                          borderRadius: '12px',
                          fontSize: '0.8rem',
                          fontWeight: '600'
                        }}>
                          👆 ВЫБРАТЬ
                        </div>
                      )
                    ) : (
                      <div style={{
                        background: 'rgba(239, 68, 68, 0.8)',
                        color: '#fff',
                        padding: '8px 16px',
                        borderRadius: '12px',
                        fontSize: '0.8rem',
                        fontWeight: '600'
                      }}>
                        🔒 {effect.price} монет
                      </div>
                    )}
                  </motion.div>
                ))}
              </div>
            )}

            {showModal === 'frames' && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                {avatarFrames.map((frame) => {
                  const isPurchased = purchasedItems.includes(frame.id) || frame.unlocked;
                  const isActive = selectedFrame === frame.id;
                  const inventoryItem = inventory.find(item => item.item_id === frame.id);
                  
                  return (
                    <motion.div
                      key={frame.id}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => {
                        if (!isPurchased && user && user.coins >= frame.price) {
                          handlePurchaseItem(frame, 'frame');
                        } else if (isPurchased && !isActive && inventoryItem) {
                          handleActivateItem(inventoryItem.id, frame.id, 'frame');
                        }
                      }}
                      style={{
                        background: isActive 
                          ? 'linear-gradient(135deg, rgba(34, 197, 94, 0.8) 0%, rgba(22, 163, 74, 0.6) 100%)'
                          : isPurchased 
                            ? 'linear-gradient(135deg, rgba(71, 85, 105, 0.8) 0%, rgba(51, 65, 85, 0.6) 100%)'
                            : 'linear-gradient(135deg, rgba(55, 65, 81, 0.6) 0%, rgba(31, 41, 55, 0.4) 100%)',
                        border: isActive 
                          ? `2px solid ${getRarityColor(frame.rarity)}` 
                          : '1px solid rgba(255, 255, 255, 0.1)',
                        borderRadius: '16px',
                        padding: '16px',
                        cursor: isPurchased || (user && user.coins >= frame.price) ? 'pointer' : 'not-allowed',
                        opacity: isPurchased || (user && user.coins >= frame.price) ? 1 : 0.6,
                        position: 'relative',
                        overflow: 'hidden'
                      }}
                    >
                      {/* Индикатор редкости */}
                      <div style={{
                        position: 'absolute',
                        top: '8px',
                        right: '8px',
                        padding: '4px 8px',
                        borderRadius: '8px',
                        fontSize: '0.7rem',
                        fontWeight: '600',
                        background: getRarityColor(frame.rarity),
                        color: '#fff'
                      }}>
                        {getRarityName(frame.rarity).toUpperCase()}
                      </div>

                      <div style={{ textAlign: 'center', marginTop: '20px' }}>
                        <div style={{ fontSize: '3rem', marginBottom: '12px' }}>
                          {frame.preview.startsWith('/') ? (
                            <img src={frame.preview} alt={frame.name} style={{ width: '80px', height: '80px', borderRadius: '50%' }} />
                          ) : (
                            frame.preview
                          )}
                        </div>
                        <h4 style={{ color: '#e2e8f0', fontSize: '1.1rem', fontWeight: '600', margin: '0 0 8px 0' }}>
                          {frame.name}
                        </h4>
                        <p style={{ color: '#94a3b8', fontSize: '0.9rem', margin: '0 0 12px 0' }}>
                          {frame.description}
                        </p>
                        
                        {isPurchased ? (
                          isActive ? (
                            <div style={{
                              background: 'rgba(34, 197, 94, 0.8)',
                              color: '#fff',
                              padding: '8px 16px',
                              borderRadius: '12px',
                              fontSize: '0.8rem',
                              fontWeight: '600'
                            }}>
                              ✅ АКТИВНА
                            </div>
                          ) : (
                            <div style={{
                              background: 'rgba(59, 130, 246, 0.8)',
                              color: '#fff',
                              padding: '8px 16px',
                              borderRadius: '12px',
                              fontSize: '0.8rem',
                              fontWeight: '600'
                            }}>
                              👆 АКТИВИРОВАТЬ
                            </div>
                          )
                        ) : (
                          <div style={{
                            background: user && user.coins >= frame.price ? 'rgba(34, 197, 94, 0.8)' : 'rgba(239, 68, 68, 0.8)',
                            color: '#fff',
                            padding: '8px 16px',
                            borderRadius: '12px',
                            fontSize: '0.8rem',
                            fontWeight: '600'
                          }}>
                            {user && user.coins >= frame.price ? `💰 КУПИТЬ ${frame.price.toLocaleString()}` : `🔒 ${frame.price.toLocaleString()} монет`}
                          </div>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}

            {showModal === 'bonuses' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {bonuses.map((bonus) => (
                  <motion.div
                    key={bonus.id}
                    whileHover={{ scale: 1.02 }}
                    style={{
                      background: 'linear-gradient(135deg, rgba(71, 85, 105, 0.8) 0%, rgba(51, 65, 85, 0.6) 100%)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      borderRadius: '16px',
                      padding: '20px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '16px'
                    }}
                  >
                    <div style={{ fontSize: '3rem' }}>{bonus.icon}</div>
                    <div style={{ flex: 1 }}>
                      <h4 style={{ color: '#e2e8f0', fontSize: '1.2rem', fontWeight: '600', margin: '0 0 8px 0' }}>
                        {bonus.name}
                      </h4>
                      <p style={{ color: '#94a3b8', fontSize: '0.9rem', margin: '0 0 8px 0' }}>
                        {bonus.description}
                      </p>
                      <div style={{ color: '#fbbf24', fontSize: '0.9rem', fontWeight: '600' }}>
                        💰 {bonus.reward}
                      </div>
                      
                      {bonus.id === 'daily' && bonus.available && (
                        <div style={{ color: '#94a3b8', fontSize: '0.8rem', marginTop: '8px' }}>
                          ⏰ Следующий бонус через: {bonus.cooldown}
                        </div>
                      )}
                      
                      {bonus.id === 'referral' && (
                        <div style={{ color: '#94a3b8', fontSize: '0.8rem', marginTop: '8px' }}>
                          👥 Приглашено друзей: {bonus.referrals}
                        </div>
                      )}
                      
                      {bonus.id === 'rank_up' && !bonus.available && (
                        <div style={{ color: '#94a3b8', fontSize: '0.8rem', marginTop: '8px' }}>
                          🎯 Следующий ранг: {bonus.nextRank}
                        </div>
                      )}
                      
                      {(bonus.id === 'telegram_subscribe' || bonus.id === 'vk_subscribe') && bonus.note && (
                        <div style={{ color: '#94a3b8', fontSize: '0.8rem', marginTop: '8px' }}>
                          {bonus.note}
                        </div>
                      )}
                    </div>
                    <div>
                      {bonus.available ? (
                        <button
                          onClick={() => handleBonusClick(bonus.id)}
                          style={{
                            background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.8) 0%, rgba(22, 163, 74, 0.6) 100%)',
                            border: '1px solid rgba(34, 197, 94, 0.4)',
                            borderRadius: '12px',
                            color: '#fff',
                            padding: '12px 20px',
                            cursor: 'pointer',
                            fontWeight: '600',
                            fontSize: '0.9rem',
                            transition: 'all 0.3s ease'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.transform = 'scale(1.05)';
                            e.currentTarget.style.background = 'linear-gradient(135deg, rgba(34, 197, 94, 1) 0%, rgba(22, 163, 74, 0.8) 100%)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.transform = 'scale(1)';
                            e.currentTarget.style.background = 'linear-gradient(135deg, rgba(34, 197, 94, 0.8) 0%, rgba(22, 163, 74, 0.6) 100%)';
                          }}
                        >
                          {bonus.id === 'daily' ? '🎁 ПОЛУЧИТЬ' : 
                           bonus.id === 'referral' ? '👥 ПРИГЛАСИТЬ' :
                           (bonus.id === 'telegram_subscribe' || bonus.id === 'vk_subscribe') ? '📢 ПОДПИСАТЬСЯ' :
                           '🏆 ПОЛУЧИТЬ'}
                        </button>
                      ) : (
                        <BonusCooldownTimer 
                          bonus={bonus}
                          onCooldownEnd={() => {
                            setBonuses(prev => prev.map(b => 
                              b.id === bonus.id ? { ...b, available: true } : b
                            ));
                          }}
                        />
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>
            )}

            {/* 🎴 МОЯ КОЛОДА - МОДАЛКА */}
            {showModal === 'deck' && (
              <div style={{ 
                display: 'flex', 
                flexDirection: 'column', 
                gap: '20px',
                padding: '10px'
              }}>
                <div style={{
                  color: '#94a3b8',
                  fontSize: '0.95rem',
                  textAlign: 'center',
                  marginBottom: '10px'
                }}>
                  NFT карты, добавленные в вашу игровую колоду ({deckCards.length})
                </div>
                
                {/* ✅ ЗАГРУЗКА */}
                {isLoadingDeck && (
                  <div style={{
                    textAlign: 'center',
                    color: '#64748b',
                    padding: '40px'
                  }}>
                    ⏳ Загрузка...
                  </div>
                )}

                {/* ✅ КАРТЫ ИЗ КОЛОДЫ */}
                {!isLoadingDeck && deckCards.length > 0 && (
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
                    gap: '16px'
                  }}>
                    {deckCards.map((card: any) => {
                      const nftCard = card.nft_card || card;
                      const suitColor = (nftCard.suit === 'hearts' || nftCard.suit === 'diamonds') ? '#ef4444' : '#1e293b';
                      const suitSymbols: { [key: string]: string } = {
                        'hearts': '♥',
                        'diamonds': '♦',
                        'clubs': '♣',
                        'spades': '♠'
                      };
                      const suitSymbol = suitSymbols[nftCard.suit] || '?';

                      return (
                        <motion.div
                          key={card.id}
                          whileHover={{ scale: 1.05, y: -5 }}
                          style={{
                            background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.9) 0%, rgba(15, 23, 42, 0.95) 100%)',
                            border: '2px solid rgba(139, 92, 246, 0.4)',
                            borderRadius: '12px',
                            padding: '12px',
                            cursor: 'pointer',
                            position: 'relative',
                            overflow: 'hidden'
                          }}
                        >
                          {/* ИЗОБРАЖЕНИЕ КАРТЫ */}
                          {nftCard.image_url && (
                            <img
                              src={nftCard.image_url}
                              alt={`${nftCard.rank} of ${nftCard.suit}`}
                              style={{
                                width: '100%',
                                height: '180px',
                                objectFit: 'cover',
                                borderRadius: '8px',
                                marginBottom: '10px'
                              }}
                            />
                          )}

                          {/* ИНФОРМАЦИЯ О КАРТЕ */}
                          <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginBottom: '8px'
                          }}>
                            <span style={{
                              color: suitColor,
                              fontSize: '1.2rem',
                              fontWeight: 'bold'
                            }}>
                              {nftCard?.rank || '?'}{suitSymbol}
                            </span>
                            <span style={{
                              background: 'rgba(139, 92, 246, 0.2)',
                              color: '#a78bfa',
                              padding: '2px 8px',
                              borderRadius: '6px',
                              fontSize: '0.7rem',
                              textTransform: 'uppercase'
                            }}>
                              {nftCard.rarity || 'Common'}
                            </span>
                          </div>

                          {/* КНОПКА УДАЛЕНИЯ */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRemoveFromDeck(card.id);
                            }}
                            style={{
                              width: '100%',
                              background: 'rgba(239, 68, 68, 0.8)',
                              border: '1px solid rgba(239, 68, 68, 0.4)',
                              borderRadius: '8px',
                              color: '#fff',
                              padding: '8px',
                              fontSize: '0.85rem',
                              fontWeight: '600',
                              cursor: 'pointer',
                              transition: 'all 0.2s ease'
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.background = 'rgba(239, 68, 68, 1)';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.background = 'rgba(239, 68, 68, 0.8)';
                            }}
                          >
                            🗑️ Удалить
                          </button>
                        </motion.div>
                      );
                    })}
                  </div>
                )}

                {/* ✅ ПУСТАЯ КОЛОДА */}
                {!isLoadingDeck && deckCards.length === 0 && (
                  <div style={{
                    background: 'rgba(30, 41, 59, 0.6)',
                    border: '2px dashed rgba(100, 116, 139, 0.4)',
                    borderRadius: '12px',
                    padding: '40px 20px',
                    textAlign: 'center',
                    color: '#64748b',
                    fontSize: '0.9rem'
                  }}>
                    Пока нет карт в колоде.<br/>
                    Добавьте NFT карты из маркетплейса!
                  </div>
                )}
              </div>
            )}
          </motion.div>
        </div>
      )}

    </div>
  );
} 