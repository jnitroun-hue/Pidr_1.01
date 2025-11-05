'use client'
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Trophy, Medal, Users, User, Star, Award, Target, Camera, Upload, Wallet, Palette, Sparkles, Gift, Frame } from 'lucide-react';
import GameWallet from '../../components/GameWallet';
import { useLanguage } from '../../components/LanguageSwitcher';
import { useTranslations } from '../../lib/i18n/translations';
import { avatarFrames, getRarityColor, getRarityName } from '../../data/avatar-frames';
import TonWalletConnect from '../../components/TonWalletConnect';
import NFTGallery from '../../components/NFTGallery';
import NFTThemeGenerator from '../../components/NFTThemeGenerator';

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
  const { language } = useLanguage();
  const t = useTranslations(language);
  
  // ✅ Telegram WebApp Headers Helper
  const getTelegramWebAppHeaders = (): Record<string, string> => {
    if (typeof window !== 'undefined' && window.Telegram?.WebApp) {
      const user = window.Telegram.WebApp.initDataUnsafe?.user;
      if (user) {
        return {
          'x-telegram-id': user.id.toString(),
          'x-username': user.username || user.first_name || 'User'
        };
      }
    }
    return {
      'x-telegram-id': '',
      'x-username': ''
    };
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

  const [avatarUrl, setAvatarUrl] = useState('😎');

  const loadNFTCollection = async () => {
    try {
      console.log('🎴 Загружаем NFT коллекцию...');
      
      // ✅ Получаем headers из Telegram WebApp
      const telegramUser = window.Telegram?.WebApp?.initDataUnsafe?.user;
      const headers: HeadersInit = {
        'Content-Type': 'application/json'
      };
      
      if (telegramUser?.id) {
        headers['x-telegram-id'] = String(telegramUser.id);
      }
      if (telegramUser?.username) {
        headers['x-username'] = telegramUser.username;
      }
      
      const response = await fetch('/api/nft/collection', {
        method: 'GET',
        headers,
        credentials: 'include'
      });
      
      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          console.log('✅ NFT коллекция загружена:', result.nfts);
        }
      }
    } catch (error) {
      console.warn('⚠️ Не удалось загрузить NFT коллекцию:', error);
    }
  };

  // ✅ ИСПРАВЛЕНО: Загружаем ВСЕ данные пользователя из Supabase БД
  useEffect(() => {
    const loadUserData = async () => {
      try {
        console.log('👤 Загружаем данные пользователя из Supabase БД...');
        
        // Получаем данные пользователя из API (Supabase)
        const response = await fetch('/api/auth', {
          method: 'GET',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          }
        });
        
        if (!response.ok) {
          console.error('❌ Ошибка получения данных пользователя:', response.status);
          return;
        }
        
        const result = await response.json();
        
        if (result.success && result.user) {
          console.log('✅ Данные пользователя загружены из БД:', result.user);
          
          const userData = {
            id: result.user.id,
            username: result.user.username,
            firstName: result.user.firstName,
            lastName: result.user.lastName,
            telegramId: result.user.telegramId,
            coins: result.user.coins,
            rating: result.user.rating,
            gamesPlayed: result.user.gamesPlayed,
            wins: result.user.wins,        // ✅ ИСПРАВЛЕНО: wins вместо gamesWon!
            losses: result.user.losses,    // ✅ ДОБАВЛЕНО: losses из API
            status: result.user.status,
            avatar_url: result.user.avatar_url
          };
          
          setUser(userData);
          setAvatarUrl(userData.avatar_url || '😎');
          
          // Обновляем статистику
          setStats(prev => ({
            ...prev,
            rating: userData.rating || 0,
            gamesPlayed: userData.gamesPlayed || 0,
            wins: userData.wins || 0,        // ✅ ИСПРАВЛЕНО: wins вместо gamesWon!
            losses: userData.losses || 0,    // ✅ ИСПРАВЛЕНО: losses напрямую из БД!
            winRate: userData.gamesPlayed > 0 
              ? Math.round(((userData.wins || 0) / userData.gamesPlayed) * 100)  // ✅ ИСПРАВЛЕНО!
              : 0
          }));
          
          console.log('✅ Статистика обновлена из БД');
        } else {
          console.error('❌ Пользователь не авторизован');
        }
        
        // Загружаем актуальный баланс
        const balanceResponse = await fetch('/api/user/balance', {
          method: 'GET',
          credentials: 'include'
        });
        
        if (balanceResponse.ok) {
          const balanceResult = await balanceResponse.json();
          if (balanceResult.success) {
            const { balance } = balanceResult.data;
            console.log('💰 Актуальный баланс из БД:', balance);
            
            setUser((prev: any) => prev ? { ...prev, coins: balance } : null);
          }
        }
        
      } catch (error) {
        console.error('❌ Ошибка загрузки данных пользователя:', error);
      }
    };

    const loadBonuses = async () => {
      try {
        console.log('🎁 Загружаем доступные бонусы...');
        const response = await fetch('/api/bonus', {
          method: 'GET',
          credentials: 'include'
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
        
        // ✅ Получаем headers из Telegram WebApp
        const telegramUser = window.Telegram?.WebApp?.initDataUnsafe?.user;
        const headers: HeadersInit = {
          'Content-Type': 'application/json'
        };
        
        if (telegramUser?.id) {
          headers['x-telegram-id'] = String(telegramUser.id);
        }
        if (telegramUser?.username) {
          headers['x-username'] = telegramUser.username;
        }
        
        const response = await fetch('/api/shop/inventory', {
          method: 'GET',
          headers,
          credentials: 'include'
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
    
    loadUserData();
    loadBonuses();
    loadInventory();
  }, []);
  const [activeSection, setActiveSection] = useState('stats'); // 'stats', 'achievements', 'wallet'
  const [showModal, setShowModal] = useState<'skins' | 'effects' | 'bonuses' | 'frames' | 'nft' | 'deck' | null>(null);
  const [selectedSkin, setSelectedSkin] = useState('classic');
  const [selectedEffect, setSelectedEffect] = useState('none');
  const [selectedFrame, setSelectedFrame] = useState('default');
  const [purchasedItems, setPurchasedItems] = useState<string[]>([]);
  const [inventory, setInventory] = useState<any[]>([]);

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
      reward: '100 монет за друга',
      icon: '👥',
      available: true,
      referrals: 0
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
      // ✅ Получаем headers из Telegram WebApp
      const telegramUser = window.Telegram?.WebApp?.initDataUnsafe?.user;
      const inventoryHeaders: HeadersInit = {
        'Content-Type': 'application/json'
      };
      
      if (telegramUser?.id) {
        inventoryHeaders['x-telegram-id'] = String(telegramUser.id);
      }
      if (telegramUser?.username) {
        inventoryHeaders['x-username'] = telegramUser.username;
      }
      
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
      // ✅ Получаем headers из Telegram WebApp
      const telegramUser = window.Telegram?.WebApp?.initDataUnsafe?.user;
      const inventoryHeaders: HeadersInit = {
        'Content-Type': 'application/json'
      };
      
      if (telegramUser?.id) {
        inventoryHeaders['x-telegram-id'] = String(telegramUser.id);
      }
      if (telegramUser?.username) {
        inventoryHeaders['x-username'] = telegramUser.username;
      }
      
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
          headers: getTelegramWebAppHeaders()
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
      
      // Перезагружаем NFT коллекцию
      await loadNFTCollection();
      
      alert(`🔥 Поздравляем! Вы получили ${result.nft.rarity} карту:\n${result.nft.rank} ${getSuitEmoji(result.nft.suit)}\n\nОгонь: ${result.nft.burningParams.fireColor}\nИнтенсивность: ${result.nft.burningParams.intensity}\n\n${wallet_address ? `✅ Привязана к кошельку: ${wallet_address.slice(0, 8)}...` : '📦 Сохранена в аккаунте'}`);
      
    } catch (error: any) {
      console.error('❌ Ошибка генерации горящей NFT:', error);
      alert(`❌ ${error.message}`);
    }
  };

  function getSuitEmoji(suit: string): string {
    switch (suit) {
      case 'hearts': return '♥️';
      case 'diamonds': return '♦️';
      case 'clubs': return '♣️';
      case 'spades': return '♠️';
      default: return suit;
    }
  }

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
  
  const handleBalanceUpdate = (newBalance: number) => {
    // Обновляем баланс в состоянии пользователя (БД обновляется через API)
    if (user) {
      const updatedUser = { ...user, coins: newBalance };
      setUser(updatedUser);
    }
  };

  return (
    <div className="main-menu-container">
      <div className="main-menu-inner">
        {/* Header */}
        <div className="menu-header">
          <button onClick={() => window.history.back()} className="px-3 py-1 rounded-lg border border-red-400 text-red-200 font-semibold text-base hover:bg-red-400/10 transition-all">
            <ArrowLeft className="inline w-4 h-4 mr-1" />
            {t.profile.back}
          </button>
          <span className="menu-title">{t.profile.title}</span>
          <div className="w-6"></div>
        </div>

        {/* Profile Card */}
        <motion.div 
          className="profile-card"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="profile-avatar">
            {avatarUrl.startsWith('data:') || avatarUrl.startsWith('http') ? (
              <img src={avatarUrl} alt="Avatar" className="profile-avatar-image" />
            ) : (
              <span className="profile-avatar-emoji">{avatarUrl}</span>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center' }}>
            <h2 className="profile-name" style={{ margin: 0 }}>{user?.username || 'Игрок'}</h2>
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
                borderRadius: '8px',
                padding: '6px 8px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.3s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(59, 130, 246, 0.4)';
                e.currentTarget.style.transform = 'scale(1.05)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(59, 130, 246, 0.2)';
                e.currentTarget.style.transform = 'scale(1)';
              }}
              title="Редактировать имя"
            >
              <span style={{ fontSize: '16px' }}>✏️</span>
            </button>
          </div>
          <p className="profile-status">🟢 {t.profile.online}</p>
          
          {/* ИГРОВЫЕ МОНЕТЫ НАД КНОПКОЙ ДРУЗЬЯ */}
          <div style={{
            background: 'linear-gradient(135deg, #fbbf24, #f59e0b)',
            padding: '8px 16px',
            borderRadius: '12px',
            margin: '12px 0',
            textAlign: 'center',
            fontWeight: '600',
            color: '#1f2937'
          }}>
            💰 {(user?.coins || 0).toLocaleString()} {t.profile.coins}
          </div>
          
          {/* Avatar and Friends Buttons */}
          <div className="profile-buttons">
            {/* Friends Button */}
            <motion.button 
              className="friends-button"
              onClick={() => window.location.href = '/friends'}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Users className="friends-icon" />
              <span>ДРУЗЬЯ</span>
            </motion.button>

            {/* Change Avatar Button */}
            <motion.div className="avatar-change-container">
              <input
                type="file"
                accept="image/*"
                onChange={handleAvatarChange}
                style={{ display: 'none' }}
                id="avatar-upload"
              />
              <motion.label
                htmlFor="avatar-upload"
                className="avatar-change-button"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Camera className="avatar-change-icon" />
                <span>{t.profile.avatar}</span>
              </motion.label>
            </motion.div>
          </div>
        </motion.div>

        {/* Customization Buttons */}
        <motion.div 
          className="customization-section"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          style={{
            width: '100%',
            margin: '20px 0',
            padding: '0 20px'
          }}
        >
          <h3 style={{
            color: '#b0b0b0',
            fontSize: '1.1rem',
            fontWeight: '700',
            margin: '0 0 15px 0',
            letterSpacing: '1px',
            textAlign: 'center'
          }}>
            КАСТОМИЗАЦИЯ
          </h3>
          
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr 1fr',
            gap: '12px',
            width: '100%'
          }}>
            {/* ❌ КНОПКИ "СКИНЫ" И "ЭФФЕКТЫ" УДАЛЕНЫ */}
            
            {/* РАМКА АВАТАР */}
            <motion.button
              onClick={() => setShowModal('frames')}
              whileHover={{ scale: 1.05, y: -2 }}
              whileTap={{ scale: 0.95 }}
              style={{
                background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.8) 0%, rgba(22, 163, 74, 0.6) 100%)',
                border: '1px solid rgba(34, 197, 94, 0.4)',
                borderRadius: '16px',
                padding: '16px 12px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '8px',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                backdropFilter: 'blur(10px)',
                boxShadow: '0 4px 20px rgba(0, 0, 0, 0.2)'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'rgba(255, 215, 0, 0.6)';
                e.currentTarget.style.background = 'linear-gradient(135deg, rgba(22, 163, 74, 0.9) 0%, rgba(21, 128, 61, 0.8) 100%)';
                e.currentTarget.style.boxShadow = '0 8px 32px rgba(0, 0, 0, 0.3), 0 0 20px rgba(255, 215, 0, 0.1)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'rgba(34, 197, 94, 0.4)';
                e.currentTarget.style.background = 'linear-gradient(135deg, rgba(34, 197, 94, 0.8) 0%, rgba(22, 163, 74, 0.6) 100%)';
                e.currentTarget.style.boxShadow = '0 4px 20px rgba(0, 0, 0, 0.2)';
              }}
            >
              <Frame style={{ fontSize: '1.5rem', color: '#e2e8f0', filter: 'drop-shadow(0 2px 4px rgba(34, 197, 94, 0.3))' }} />
              <span style={{ 
                color: '#e2e8f0', 
                fontSize: '0.8rem', 
                fontWeight: '600', 
                letterSpacing: '0.5px',
                textAlign: 'center'
              }}>
                РАМКА АВАТАР
              </span>
            </motion.button>

            {/* МОЯ КОЛОДА - НОВАЯ КНОПКА! */}
            <motion.button
              onClick={() => setShowModal('deck')}
              whileHover={{ scale: 1.05, y: -2 }}
              whileTap={{ scale: 0.95 }}
              style={{
                background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.8) 0%, rgba(124, 58, 237, 0.6) 100%)',
                border: '1px solid rgba(139, 92, 246, 0.4)',
                borderRadius: '16px',
                padding: '16px 12px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '8px',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                backdropFilter: 'blur(10px)',
                boxShadow: '0 4px 20px rgba(0, 0, 0, 0.2)'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'rgba(168, 85, 247, 0.6)';
                e.currentTarget.style.background = 'linear-gradient(135deg, rgba(124, 58, 237, 0.9) 0%, rgba(109, 40, 217, 0.8) 100%)';
                e.currentTarget.style.boxShadow = '0 8px 32px rgba(0, 0, 0, 0.3), 0 0 20px rgba(139, 92, 246, 0.2)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'rgba(139, 92, 246, 0.4)';
                e.currentTarget.style.background = 'linear-gradient(135deg, rgba(139, 92, 246, 0.8) 0%, rgba(124, 58, 237, 0.6) 100%)';
                e.currentTarget.style.boxShadow = '0 4px 20px rgba(0, 0, 0, 0.2)';
              }}
            >
              <Sparkles style={{ fontSize: '1.5rem', color: '#e2e8f0', filter: 'drop-shadow(0 2px 4px rgba(139, 92, 246, 0.3))' }} />
              <span style={{ 
                color: '#e2e8f0', 
                fontSize: '0.8rem', 
                fontWeight: '600', 
                letterSpacing: '0.5px',
                textAlign: 'center'
              }}>
                МОЯ КОЛОДА
              </span>
            </motion.button>
          </div>

          {/* БОНУСЫ - ВЫТЯНУТАЯ КНОПКА ПОД ТРЕМЯ */}
          <motion.button
            onClick={() => setShowModal('bonuses')}
            whileHover={{ scale: 1.02, y: -2 }}
            whileTap={{ scale: 0.98 }}
            style={{
              width: '100%',
              marginTop: '12px',
              background: 'linear-gradient(135deg, rgba(251, 146, 60, 0.8) 0%, rgba(249, 115, 22, 0.6) 100%)',
              border: '1px solid rgba(251, 146, 60, 0.4)',
              borderRadius: '16px',
              padding: '16px 20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '12px',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              backdropFilter: 'blur(10px)',
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.2)'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = 'rgba(255, 215, 0, 0.6)';
              e.currentTarget.style.background = 'linear-gradient(135deg, rgba(249, 115, 22, 0.9) 0%, rgba(234, 88, 12, 0.8) 100%)';
              e.currentTarget.style.boxShadow = '0 8px 32px rgba(0, 0, 0, 0.3), 0 0 20px rgba(255, 215, 0, 0.1)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'rgba(251, 146, 60, 0.4)';
              e.currentTarget.style.background = 'linear-gradient(135deg, rgba(251, 146, 60, 0.8) 0%, rgba(249, 115, 22, 0.6) 100%)';
              e.currentTarget.style.boxShadow = '0 4px 20px rgba(0, 0, 0, 0.2)';
            }}
          >
            <Gift style={{ fontSize: '1.8rem', color: '#e2e8f0', filter: 'drop-shadow(0 2px 4px rgba(251, 146, 60, 0.3))' }} />
            <span style={{ 
              color: '#e2e8f0', 
              fontSize: '1rem', 
              fontWeight: '700', 
              letterSpacing: '1px',
              textAlign: 'center'
            }}>
              БОНУСЫ
            </span>
          </motion.button>

          {/* NFT СЕКЦИЯ - НОВАЯ КНОПКА */}
          <motion.button
            onClick={() => setShowModal('nft')}
            whileHover={{ scale: 1.02, y: -2 }}
            whileTap={{ scale: 0.98 }}
            style={{
              width: '100%',
              marginTop: '12px',
              background: 'linear-gradient(135deg, rgba(0, 136, 204, 0.8) 0%, rgba(0, 85, 128, 0.6) 100%)',
              border: '2px solid rgba(0, 136, 204, 0.4)',
              borderRadius: '16px',
              padding: '16px 20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '12px',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              backdropFilter: 'blur(10px)',
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.2)'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = 'rgba(0, 153, 221, 0.6)';
              e.currentTarget.style.background = 'linear-gradient(135deg, rgba(0, 153, 221, 0.9) 0%, rgba(0, 102, 144, 0.8) 100%)';
              e.currentTarget.style.boxShadow = '0 8px 32px rgba(0, 0, 0, 0.3), 0 0 20px rgba(0, 136, 204, 0.2)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'rgba(0, 136, 204, 0.4)';
              e.currentTarget.style.background = 'linear-gradient(135deg, rgba(0, 136, 204, 0.8) 0%, rgba(0, 85, 128, 0.6) 100%)';
              e.currentTarget.style.boxShadow = '0 4px 20px rgba(0, 0, 0, 0.2)';
            }}
          >
            <Wallet style={{ fontSize: '1.8rem', color: '#e2e8f0', filter: 'drop-shadow(0 2px 4px rgba(0, 136, 204, 0.3))' }} />
            <span style={{ 
              color: '#e2e8f0', 
              fontSize: '1rem', 
              fontWeight: '700', 
              letterSpacing: '1px',
              textAlign: 'center'
            }}>
              NFT КОЛЛЕКЦИЯ
            </span>
          </motion.button>
        </motion.div>

        {/* Navigation Tabs */}
        <motion.div 
          className="profile-nav"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          style={{
            display: 'flex',
            justifyContent: 'center',
            gap: '12px',
            margin: '20px 0',
            padding: '0 20px'
          }}
        >
          <button
            onClick={() => setActiveSection('stats')}
            className={`nav-tab ${activeSection === 'stats' ? 'active' : ''}`}
            style={{
              background: activeSection === 'stats' ? 
                'linear-gradient(135deg, rgba(34, 197, 94, 0.8) 0%, rgba(22, 163, 74, 0.6) 100%)' : 
                'linear-gradient(135deg, rgba(15, 23, 42, 0.8) 0%, rgba(30, 41, 59, 0.6) 100%)',
              border: '1px solid',
              borderColor: activeSection === 'stats' ? 'rgba(34, 197, 94, 0.4)' : 'rgba(100, 116, 139, 0.3)',
              borderRadius: '12px',
              padding: '8px 16px',
              color: activeSection === 'stats' ? '#e2e8f0' : '#94a3b8',
              fontSize: '0.9rem',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <Target size={16} />
            Статистика
          </button>
          
          <button
            onClick={() => setActiveSection('achievements')}
            className={`nav-tab ${activeSection === 'achievements' ? 'active' : ''}`}
            style={{
              background: activeSection === 'achievements' ? 
                'linear-gradient(135deg, rgba(139, 92, 246, 0.8) 0%, rgba(124, 58, 237, 0.6) 100%)' : 
                'linear-gradient(135deg, rgba(15, 23, 42, 0.8) 0%, rgba(30, 41, 59, 0.6) 100%)',
              border: '1px solid',
              borderColor: activeSection === 'achievements' ? 'rgba(139, 92, 246, 0.4)' : 'rgba(100, 116, 139, 0.3)',
              borderRadius: '12px',
              padding: '8px 16px',
              color: activeSection === 'achievements' ? '#e2e8f0' : '#94a3b8',
              fontSize: '0.9rem',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <Award size={16} />
            Достижения
          </button>
          
          <button
            onClick={() => setActiveSection('wallet')}
            className={`nav-tab ${activeSection === 'wallet' ? 'active' : ''}`}
            style={{
              background: activeSection === 'wallet' ? 
                'linear-gradient(135deg, rgba(59, 130, 246, 0.8) 0%, rgba(37, 99, 235, 0.6) 100%)' : 
                'linear-gradient(135deg, rgba(15, 23, 42, 0.8) 0%, rgba(30, 41, 59, 0.6) 100%)',
              border: '1px solid',
              borderColor: activeSection === 'wallet' ? 'rgba(59, 130, 246, 0.4)' : 'rgba(100, 116, 139, 0.3)',
              borderRadius: '12px',
              padding: '8px 16px',
              color: activeSection === 'wallet' ? '#e2e8f0' : '#94a3b8',
              fontSize: '0.9rem',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <Wallet size={16} />
            Кошелек
          </button>
        </motion.div>

        {/* Content Sections */}
        {activeSection === 'stats' && (
          <motion.div 
            className="stats-container"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <h3 className="stats-title">СТАТИСТИКА</h3>
            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-value rating">{stats.rating}</div>
                <div className="stat-label">Рейтинг</div>
              </div>
              <div className="stat-card">
                <div className="stat-value games">{stats.gamesPlayed}</div>
                <div className="stat-label">Игр сыграно</div>
              </div>
              <div className="stat-card">
                <div className="stat-value wins">{stats.wins}</div>
                <div className="stat-label">Побед</div>
              </div>
              <div className="stat-card">
                <div className="stat-value losses">{stats.losses}</div>
                <div className="stat-label">Поражений</div>
              </div>
              <div className="stat-card full-width">
                <div className="stat-value winrate">{stats.winRate}%</div>
                <div className="stat-label">Процент побед</div>
              </div>
            </div>
          </motion.div>
        )}

        {activeSection === 'achievements' && (
          <motion.div 
            className="achievements-container"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <div className="achievements-header">
              <h3 className="achievements-title">ДОСТИЖЕНИЯ</h3>
            </div>
            
            <div className="achievements-grid">
              {stats.achievements.map((achievement, index) => {
                const IconComponent = achievement.icon;
                return (
                  <motion.div 
                    key={achievement.id}
                    className={`achievement-card ${achievement.unlocked ? 'unlocked' : 'locked'}`}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3, delay: 0.1 * index }}
                  >
                    <div className="achievement-icon">
                      <IconComponent className="achievement-icon-svg" />
                    </div>
                    <div className="achievement-info">
                      <h4 className="achievement-name">{achievement.name}</h4>
                      <p className="achievement-description">{achievement.description}</p>
                    </div>
                    {achievement.unlocked && (
                      <div className="achievement-badge">✓</div>
                    )}
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        )}

        {activeSection === 'wallet' && (
          <motion.div 
            className="wallet-section"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            style={{ padding: '0 20px', marginBottom: '100px' }}
          >
            <GameWallet user={user} onBalanceUpdate={handleBalanceUpdate} />
          </motion.div>
        )}

      </div>

      {/* Модальные окна */}
      {showModal && (
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
              maxWidth: '500px',
              width: '100%',
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
                {showModal === 'nft' && '🎴 NFT КОЛЛЕКЦИЯ'}
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

            {/* NFT КОЛЛЕКЦИЯ МОДАЛЬНОЕ ОКНО */}
            {showModal === 'nft' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {/* TON Wallet Connect */}
                <div style={{
                  background: 'rgba(30, 41, 59, 0.6)',
                  border: '2px solid rgba(0, 136, 204, 0.3)',
                  borderRadius: '16px',
                  padding: '20px'
                }}>
                  <h4 style={{ 
                    color: '#e2e8f0', 
                    fontSize: '1.1rem', 
                    fontWeight: '700', 
                    margin: '0 0 16px 0',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px'
                  }}>
                    <Wallet size={24} /> Подключение TON кошелька
                  </h4>
                  <div style={{ 
                    color: '#94a3b8', 
                    fontSize: '0.9rem', 
                    marginBottom: '16px',
                    lineHeight: '1.6'
                  }}>
                    Подключите свой TON кошелек для владения NFT картами. Все NFT будут минтиться напрямую в ваш кошелек.
                  </div>
                  <TonWalletConnect 
                    onConnect={(address) => {
                      console.log('✅ TON кошелек подключен:', address);
                      setConnectedWallets(prev => ({ ...prev, ton: address }));
                      loadNFTCollection();
                    }}
                    onDisconnect={() => {
                      console.log('❌ TON кошелек отключен');
                      setConnectedWallets(prev => ({ ...prev, ton: undefined }));
                    }}
                  />
                </div>

                {/* NFT Theme Generator - ГЕНЕРАТОР ТЕМАТИЧЕСКИХ КАРТ */}
                <div style={{
                  background: 'rgba(30, 41, 59, 0.6)',
                  border: '2px solid rgba(251, 191, 36, 0.3)',
                  borderRadius: '16px',
                  padding: '20px'
                }}>
                  <NFTThemeGenerator 
                    userCoins={user?.coins || 0}
                    onBalanceUpdate={(newBalance) => {
                      if (user) {
                        setUser({...user, coins: newBalance});
                      }
                    }}
                  />
                </div>

                {/* NFT Gallery - КОМПАКТНАЯ ГАЛЕРЕЯ */}
                <div style={{
                  background: 'rgba(30, 41, 59, 0.6)',
                  border: '2px solid rgba(0, 136, 204, 0.3)',
                  borderRadius: '16px',
                  padding: '20px'
                }}>
                  <NFTGallery />
                </div>

                {/* Индикатор подключенного кошелька */}
                {(connectedWallets.ton || connectedWallets.solana) && (
                  <div style={{
                    background: 'rgba(16, 185, 129, 0.2)',
                    border: '1px solid rgba(16, 185, 129, 0.4)',
                    borderRadius: '12px',
                    padding: '12px',
                    marginBottom: '16px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px'
                  }}>
                    <div style={{ fontSize: '24px' }}>✅</div>
                    <div>
                      <div style={{ fontSize: '0.9rem', fontWeight: '600', color: '#10b981' }}>
                        Кошелек подключен
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '4px' }}>
                        {connectedWallets.ton && `TON: ${connectedWallets.ton.slice(0, 8)}...${connectedWallets.ton.slice(-6)}`}
                        {connectedWallets.solana && `SOL: ${connectedWallets.solana.slice(0, 8)}...${connectedWallets.solana.slice(-6)}`}
                      </div>
                    </div>
                  </div>
                )}


                {/* Информация о NFT */}
                <div style={{
                  background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(0, 136, 204, 0.05) 100%)',
                  border: '1px solid rgba(59, 130, 246, 0.2)',
                  borderRadius: '12px',
                  padding: '16px'
                }}>
                  <h5 style={{ 
                    color: '#3b82f6', 
                    fontSize: '0.9rem', 
                    fontWeight: '700', 
                    margin: '0 0 12px 0',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px'
                  }}>
                    ℹ️ О NFT картах
                  </h5>
                  <ul style={{ 
                    color: '#94a3b8', 
                    fontSize: '0.85rem', 
                    margin: 0, 
                    paddingLeft: '20px',
                    lineHeight: '1.8'
                  }}>
                    <li>Каждая карта — уникальный NFT в блокчейне TON</li>
                    <li>Вы полностью владеете своими картами</li>
                    <li>Можно торговать на маркетплейсах</li>
                    <li>Рандомный минт: 2-10 = 95%, J-K = 4%, A = 1%</li>
                    <li>Кастомный минт: выберите масть, ранг и стиль</li>
                  </ul>
                </div>
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
                  Здесь отображаются NFT карты, добавленные в вашу игровую колоду
                </div>
                
                {/* ✅ ЗАГРУЗКА КОЛОДЫ БУДЕТ ДОБАВЛЕНА ПОЗЖЕ */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
                  gap: '16px'
                }}>
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
                </div>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </div>
  );
} 