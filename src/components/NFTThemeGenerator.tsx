'use client'

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Sparkles, Ghost, Swords, Zap } from 'lucide-react';
import { useTonConnectUI, useTonAddress } from '@tonconnect/ui-react';
import { toNano } from '@ton/core';

interface NFTThemeGeneratorProps {
  userCoins: number;
  onBalanceUpdate?: (newBalance: number) => void;
}

// Типы тем
type ThemeType = 'pokemon' | 'halloween' | 'starwars' | 'legendary' | 'deck';

// Конфигурация тем
const THEMES = {
  pokemon: {
    name: 'Покемон',
    icon: '⚡',
    color: '#fbbf24',
    gradient: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)',
    singleCost: 10000,
    deckCost: 400000,
    cryptoCost: { ton: 0.5, sol: 5, eth: 0.0002 },
    total: 52,
    folder: 'pokemon',
    prefix: '' // Файлы: 1.png, 2.png, ...
  },
  halloween: {
    name: 'Хеллоуин',
    icon: '🎃',
    color: '#f97316',
    gradient: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
    singleCost: 5000,
    deckCost: 200000,
    cryptoCost: { ton: 0.3, sol: 3, eth: 0.0001 },
    total: 10,
    folder: 'halloween',
    prefix: 'hel_'
  },
  starwars: {
    name: 'Звездные войны',
    icon: '⚔️',
    color: '#3b82f6',
    gradient: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
    singleCost: 5000,
    deckCost: 200000,
    cryptoCost: { ton: 0.3, sol: 3, eth: 0.0001 },
    total: 7,
    folder: 'starwars',
    prefix: 'star_'
  },
  legendary: {
    name: 'Легендарная',
    icon: '👑',
    color: '#a855f7',
    gradient: 'linear-gradient(135deg, #a855f7 0%, #7c3aed 100%)',
    singleCost: 50000, // ✅ Очень дорого!
    deckCost: 1000000, // ✅ Миллион!
    cryptoCost: { ton: 2, sol: 20, eth: 0.001 },
    total: 5, // ✅ Всего 5 легендарных картинок
    folder: 'legendary',
    prefix: 'leg_', // ✅ Файлы: leg_1.png, leg_2.png, ...
    rarityWeights: { // ✅ Вероятности выпадения
      leg_1: 10, // 10%
      leg_2: 15, // 15%
      leg_3: 25, // 25%
      leg_4: 30, // 30%
      leg_5: 20  // 20%
    }
  }
};

const SUITS = ['spades', 'hearts', 'diamonds', 'clubs'];
const RANKS = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'j', 'q', 'k', 'a'];

export default function NFTThemeGenerator({ userCoins, onBalanceUpdate }: NFTThemeGeneratorProps) {
  const [showModal, setShowModal] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [selectedTheme, setSelectedTheme] = useState<ThemeType | null>(null);
  const [showCryptoModal, setShowCryptoModal] = useState(false);
  const [cryptoTheme, setCryptoTheme] = useState<keyof typeof THEMES | null>(null);
  const [tonConnectUI] = useTonConnectUI();
  const userTonAddress = useTonAddress();

  // ✅ ОПЛАТА ЗА КРИПТУ (TON)
  const handleCryptoPayment = async (crypto: 'TON' | 'SOL' | 'ETH') => {
    if (!cryptoTheme) return;

    const themeConfig = THEMES[cryptoTheme];
    const cost = themeConfig.cryptoCost?.[crypto.toLowerCase() as 'ton' | 'sol' | 'eth'];
    
    if (!cost) {
      alert('❌ Стоимость не указана для этой валюты');
      return;
    }

    // ✅ TON ОПЛАТА
    if (crypto === 'TON') {
      try {
        // Получаем адрес получателя из БД (подключенный Telegram Wallet)
        const response = await fetch('/api/wallet/ton/payment-info', {
          method: 'GET',
          credentials: 'include'
        });

        if (!response.ok) {
          throw new Error('Не удалось получить адрес для оплаты');
        }

        const data = await response.json();
        if (!data.success) {
          throw new Error(data.message || 'Ошибка получения адреса');
        }

        const receiverAddress = data.data.address;
        const amountNano = Math.floor(cost * 1000000000); // TON в наноTON
        const comment = `NFT_${cryptoTheme}_${Date.now()}`;

        // ✅ ИСПРАВЛЕНО: Используем Telegram Wallet вместо TonConnect
        // Формируем ton:// URL для Telegram Wallet
        const tonUrl = `ton://transfer/${receiverAddress}?amount=${amountNano}&text=${encodeURIComponent(comment)}`;
        
        console.log('💎 Открываем Telegram Wallet:', tonUrl);
        
        // Открываем Telegram Wallet через Telegram WebApp API
        if (typeof window !== 'undefined' && (window as any).Telegram?.WebApp) {
          const tg = (window as any).Telegram.WebApp;
          
          // Используем openTelegramLink для ton:// протокола
          tg.openTelegramLink(tonUrl);
          
          console.log('✅ Telegram Wallet открыт');
        } else {
          // Fallback для тестирования вне Telegram
          alert(`💎 Откройте Telegram Wallet для оплаты ${cost} TON\n\nАдрес: ${receiverAddress}\nСумма: ${cost} TON`);
        }

        // ✅ ВАЖНО: Не генерируем карту сразу, ждем подтверждения оплаты
        alert('⏳ Ожидаем подтверждения оплаты...\n\nПосле успешной оплаты карта будет автоматически сгенерирована (до 5 минут)');
        
        // Закрываем модалку
        setShowCryptoModal(false);
        setCryptoTheme(null);

        // ✅ TODO: Добавить polling для проверки статуса оплаты
        // const txResult = await waitForTransaction(receiverAddress, amountNano);

      } catch (error: any) {
        console.error('❌ Ошибка TON оплаты:', error);
        if (error.message?.includes('User rejected')) {
          alert('❌ Оплата отменена');
        } else {
          alert(`❌ Ошибка оплаты: ${error.message || 'Неизвестная ошибка'}`);
        }
      }
    } else {
      alert(`💎 ${crypto} оплата будет доступна в ближайшее время!`);
    }
  };

  // Генерация одной карты
  const handleGenerateSingle = async (theme: keyof typeof THEMES) => {
    if (generating) return;
    
    const themeConfig = THEMES[theme];
    
    if (userCoins < themeConfig.singleCost) {
      alert(`❌ Недостаточно монет!\n\nТребуется: ${themeConfig.singleCost.toLocaleString()}\nУ вас: ${userCoins.toLocaleString()}`);
      return;
    }

    if (!confirm(`Сгенерировать случайную карту ${themeConfig.name}?\n\nСтоимость: ${themeConfig.singleCost.toLocaleString()} монет`)) {
      return;
    }

    setGenerating(true);
    setSelectedTheme(theme);

    try {
      // Случайная масть и ранг
      const randomSuit = SUITS[Math.floor(Math.random() * SUITS.length)];
      const randomRank = RANKS[Math.floor(Math.random() * RANKS.length)];
      const randomId = Math.floor(Math.random() * themeConfig.total) + 1;

      // ✅ ГЕНЕРИРУЕМ ИЗОБРАЖЕНИЕ НА КЛИЕНТЕ С РЕАЛЬНЫМИ PNG!
      console.log(`🎨 [Client] Генерируем карту: ${theme}, ID: ${randomId}`);
      const imageData = await generateThemeCardImage(randomSuit, randomRank, randomId, theme);
      
      const telegramUser = typeof window !== 'undefined' && (window as any).Telegram?.WebApp?.initDataUnsafe?.user;
      
      const response = await fetch('/api/nft/generate-theme', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'x-telegram-id': telegramUser?.id?.toString() || '',
          'x-username': telegramUser?.username || 'User'
        },
        body: JSON.stringify({
          suit: randomSuit,
          rank: randomRank,
          imageData,
          theme,
          themeId: randomId,
          action: `random_${theme}`,
          skipCoinDeduction: false
        })
      });

      const result = await response.json();

        if (response.ok && result.success) {
        // ✅ ОБНОВЛЯЕМ КОЛЛЕКЦИЮ NFT ПОСЛЕ ГЕНЕРАЦИИ (мгновенно с retry)
        window.dispatchEvent(new CustomEvent('nft-collection-updated'));
        window.dispatchEvent(new CustomEvent('nft-deck-updated')); // ✅ Обновляем колоду
        window.dispatchEvent(new CustomEvent('transaction-created')); // ✅ Триггерим обновление истории
        
        // ✅ Retry механизм: повторяем обновление через 1 и 3 секунды для надежности
        setTimeout(() => {
          window.dispatchEvent(new CustomEvent('nft-collection-updated'));
          window.dispatchEvent(new CustomEvent('nft-deck-updated'));
        }, 1000);
        setTimeout(() => {
          window.dispatchEvent(new CustomEvent('nft-collection-updated'));
          window.dispatchEvent(new CustomEvent('nft-deck-updated'));
        }, 3000);
        
        // ✅ ОБНОВЛЯЕМ БАЛАНС НА КЛИЕНТЕ
        if (result.newBalance !== undefined) {
          if (onBalanceUpdate) {
            onBalanceUpdate(result.newBalance);
          }
          // ✅ ОТПРАВЛЯЕМ СОБЫТИЕ ДЛЯ ОБНОВЛЕНИЯ БАЛАНСА В ПРОФИЛЕ
          window.dispatchEvent(new CustomEvent('balance-updated'));
        } else {
          // ✅ ЕСЛИ newBalance НЕ ПРИШЕЛ - ЗАГРУЖАЕМ ИЗ БД
          console.warn('⚠️ newBalance не получен, загружаем из БД...');
          const telegramUser = typeof window !== 'undefined' && (window as any).Telegram?.WebApp?.initDataUnsafe?.user;
          if (telegramUser?.id && onBalanceUpdate) {
            try {
              const balanceResponse = await fetch('/api/user/me', {
                method: 'GET',
                credentials: 'include',
                cache: 'no-store', // ✅ ОТКЛЮЧАЕМ КЭШИРОВАНИЕ
                headers: {
                  'Content-Type': 'application/json',
                  'x-telegram-id': telegramUser.id.toString(),
                  'x-username': telegramUser.username || 'User'
                }
              });
              if (balanceResponse.ok) {
                const balanceData = await balanceResponse.json();
                if (balanceData.user?.coins !== undefined) {
                  onBalanceUpdate(balanceData.user.coins);
                  window.dispatchEvent(new CustomEvent('balance-updated'));
                }
              }
            } catch (err) {
              console.error('❌ Ошибка загрузки баланса:', err);
            }
          }
        }
        
        alert(`✅ Карта ${themeConfig.name} создана!\n\n${randomRank.toUpperCase()} ${getSuitSymbol(randomSuit)}\n\nСохранено в коллекцию!`);
        
        setShowModal(false);
      } else {
        throw new Error(result.error || 'Ошибка генерации');
      }
    } catch (error: any) {
      console.error('Ошибка генерации:', error);
      alert(`❌ Ошибка: ${error.message}`);
    } finally {
      setGenerating(false);
      setSelectedTheme(null);
    }
  };

  // Генерация полной колоды
  const handleGenerateDeck = async (theme: keyof typeof THEMES) => {
    if (generating) return;
    
    const themeConfig = THEMES[theme];
    
    if (userCoins < themeConfig.deckCost) {
      alert(`❌ Недостаточно монет!\n\nТребуется: ${themeConfig.deckCost.toLocaleString()}\nУ вас: ${userCoins.toLocaleString()}`);
      return;
    }

    if (!confirm(`Сгенерировать полную колоду ${themeConfig.name}?\n\n52 уникальные карты\nСтоимость: ${themeConfig.deckCost.toLocaleString()} монет`)) {
      return;
    }

    setGenerating(true);
    setSelectedTheme(theme);

    try {
      let successCount = 0;
      const themeConfig = THEMES[theme];

      // ✅ Генерируем все 52 карты с РАНДОМНЫМИ картинками темы
      for (const suit of SUITS) {
        for (const rank of RANKS) {
          // 🎲 ЖЕСТКИЙ РАНДОМ: случайная картинка из темы (1 → total)
          const themeId = Math.floor(Math.random() * themeConfig.total) + 1;
          
          // ✅ ГЕНЕРИРУЕМ ИЗОБРАЖЕНИЕ НА КЛИЕНТЕ!
          const imageData = await generateThemeCardImage(suit, rank, themeId, theme);
          
          const telegramUser = typeof window !== 'undefined' && (window as any).Telegram?.WebApp?.initDataUnsafe?.user;
          
          const response = await fetch('/api/nft/generate-theme', {
            method: 'POST',
            credentials: 'include',
            headers: {
              'Content-Type': 'application/json',
              'x-telegram-id': telegramUser?.id?.toString() || '',
              'x-username': telegramUser?.username || 'User'
            },
            body: JSON.stringify({
              suit,
              rank,
              imageData,
              theme,
              themeId,
              action: `deck_${theme}`,
              skipCoinDeduction: true // Списываем монеты только 1 раз в конце
            })
          });

          const result = await response.json();

          if (response.ok && result.success) {
            successCount++;
          }
        }
      }

      // Списываем монеты 1 раз
      const telegramUser = typeof window !== 'undefined' && (window as any).Telegram?.WebApp?.initDataUnsafe?.user;
      
      const deductResponse = await fetch('/api/user/add-coins', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'x-telegram-id': telegramUser?.id?.toString() || '',
          'x-username': telegramUser?.username || 'User'
        },
        body: JSON.stringify({
          amount: -themeConfig.deckCost
        })
      });

      const deductResult = await deductResponse.json();

      if (deductResponse.ok && deductResult.success) {
        // ✅ ОБНОВЛЯЕМ КОЛЛЕКЦИЮ NFT ПОСЛЕ ГЕНЕРАЦИИ КОЛОДЫ (мгновенно с retry)
        window.dispatchEvent(new CustomEvent('nft-collection-updated'));
        window.dispatchEvent(new CustomEvent('nft-deck-updated')); // ✅ Обновляем колоду
        window.dispatchEvent(new CustomEvent('transaction-created')); // ✅ Триггерим обновление истории
        
        // ✅ Retry механизм: повторяем обновление через 1 и 3 секунды для надежности
        setTimeout(() => {
          window.dispatchEvent(new CustomEvent('nft-collection-updated'));
          window.dispatchEvent(new CustomEvent('nft-deck-updated'));
        }, 1000);
        setTimeout(() => {
          window.dispatchEvent(new CustomEvent('nft-collection-updated'));
          window.dispatchEvent(new CustomEvent('nft-deck-updated'));
        }, 3000);
        
        alert(`✅ Колода ${themeConfig.name} создана!\n\n${successCount} уникальных карт\nСохранено в коллекцию!`);
        
        if (onBalanceUpdate && deductResult.newBalance !== undefined) {
          onBalanceUpdate(deductResult.newBalance);
        }
        
        // ✅ ОТПРАВЛЯЕМ СОБЫТИЕ ДЛЯ ОБНОВЛЕНИЯ БАЛАНСА В ПРОФИЛЕ
        window.dispatchEvent(new CustomEvent('balance-updated'));
        
        setShowModal(false);
      } else {
        throw new Error('Ошибка списания монет');
      }
    } catch (error: any) {
      console.error('Ошибка генерации колоды:', error);
      alert(`❌ Ошибка: ${error.message}`);
    } finally {
      setGenerating(false);
      setSelectedTheme(null);
    }
  };

  // ✅ КЛИЕНТСКАЯ ГЕНЕРАЦИЯ С ПРАВИЛЬНОЙ ЗАГРУЗКОЙ ИЗОБРАЖЕНИЙ!
  const generateThemeCardImage = (suit: string, rank: string, themeId: number, theme: keyof typeof THEMES): Promise<string> => {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas');
      canvas.width = 300;
      canvas.height = 420;
      const ctx = canvas.getContext('2d')!;

      const themeConfig = THEMES[theme];
      const fileName = `${themeConfig.prefix}${themeId}.png`;
      const imagePath = `/${themeConfig.folder}/${fileName}`;

      console.log(`🖼️ [Client] Загружаем изображение: ${imagePath}`);

      // Загружаем изображение темы
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.src = imagePath;

      img.onload = () => {
        try {
          // 👑 ЛЕГЕНДАРНАЯ: PNG на ВСЮ КАРТУ!
          const isLegendary = theme === 'legendary';

          if (isLegendary) {
            // ✅ РИСУЕМ PNG НА ВСЮ КАРТУ (300x420)
            ctx.drawImage(img, 0, 0, 300, 420);

            // Черная рамка ПОВЕРХ
            ctx.strokeStyle = '#000000';
            ctx.lineWidth = 8;
            ctx.strokeRect(4, 4, 292, 412);
          } else {
            // Обычные темы: белый фон
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, 300, 420);

            // Черная рамка
            ctx.strokeStyle = '#000000';
            ctx.lineWidth = 8;
            ctx.strokeRect(4, 4, 292, 412);

            // Изображение в центре (200x200)
            const imgWidth = 200;
            const imgHeight = 200;
            const imgX = (300 - imgWidth) / 2;
            const imgY = 110;
            ctx.drawImage(img, imgX, imgY, imgWidth, imgHeight);
          }

          // Цвет масти
          const suitColor = (suit === 'hearts' || suit === 'diamonds') ? '#ef4444' : '#000000';
          const suitSymbol = { hearts: '♥', diamonds: '♦', clubs: '♣', spades: '♠' }[suit] || suit;

          // ✅ РАНГ И МАСТЬ ПОВЕРХ ИЗОБРАЖЕНИЯ!
          // Добавляем белый контур для лучшей видимости на легендарной
          if (isLegendary) {
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 3;
            ctx.font = 'bold 40px Arial';
            ctx.strokeText(rank.toUpperCase(), 20, 50);
            ctx.strokeText(rank.toUpperCase(), 260, 400);
            
            ctx.font = 'bold 36px Arial';
            ctx.strokeText(suitSymbol, 20, 90);
            ctx.strokeText(suitSymbol, 260, 360);
          }

          // Ранг и масть в углах (основной цвет)
          ctx.fillStyle = suitColor;
          ctx.font = 'bold 40px Arial';
          ctx.fillText(rank.toUpperCase(), 20, 50);
          ctx.fillText(rank.toUpperCase(), 260, 400);

          ctx.font = 'bold 36px Arial';
          ctx.fillText(suitSymbol, 20, 90);
          ctx.fillText(suitSymbol, 260, 360);

          console.log(`✅ [Client] Изображение нарисовано: ${imagePath} (legendary: ${isLegendary})`);
          resolve(canvas.toDataURL('image/png'));
        } catch (error) {
          console.error(`❌ [Client] Ошибка рисования:`, error);
          reject(error);
        }
      };

      img.onerror = (error) => {
        console.error(`❌ [Client] Не удалось загрузить: ${imagePath}`, error);
        // Возвращаем canvas без изображения
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, 300, 420);
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 8;
        ctx.strokeRect(4, 4, 292, 412);
        
        ctx.fillStyle = '#ff0000';
        ctx.font = 'bold 16px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('Image not found', 150, 210);
        ctx.fillText(imagePath, 150, 230);
        
        resolve(canvas.toDataURL('image/png'));
      };
    });
  };

  const getSuitSymbol = (suit: string) => {
    const symbols: Record<string, string> = {
      hearts: '♥',
      diamonds: '♦',
      clubs: '♣',
      spades: '♠'
    };
    return symbols[suit] || suit;
  };

  return (
    <>
      {/* ГЛАВНАЯ КНОПКА */}
      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={() => setShowModal(true)}
        style={{
          width: '100%',
          padding: '20px',
          borderRadius: '16px',
          border: '2px solid rgba(251, 191, 36, 0.3)',
          background: 'linear-gradient(135deg, rgba(251, 191, 36, 0.1) 0%, rgba(245, 158, 11, 0.1) 100%)',
          color: '#fbbf24',
          fontWeight: 'bold',
          fontSize: '18px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '12px'
        }}
      >
        <Sparkles size={24} />
        ГЕНЕРАТОР NFT КАРТ
        <Sparkles size={24} />
      </motion.button>

      {/* МОДАЛЬНОЕ ОКНО */}
      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => !generating && setShowModal(false)}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0, 0, 0, 0.92)',
              backdropFilter: 'blur(20px)',
              zIndex: 999999,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '20px'
            }}
          >
            <motion.div
              initial={{ scale: 0.9, y: 50 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 50 }}
              onClick={(e) => e.stopPropagation()}
              style={{
                background: 'linear-gradient(145deg, rgba(15, 23, 42, 0.98) 0%, rgba(30, 41, 59, 0.98) 100%)',
                borderRadius: '24px',
                border: '2px solid rgba(251, 191, 36, 0.3)',
                padding: '30px',
                maxWidth: '600px',
                width: '100%',
                maxHeight: '90vh',
                overflowY: 'auto'
              }}
            >
              {/* ЗАГОЛОВОК */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <h2 style={{ fontSize: '28px', fontWeight: 'bold', color: '#fbbf24', display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <Sparkles size={32} />
                  Выберите тему
                </h2>
                <button
                  onClick={() => setShowModal(false)}
                  disabled={generating}
                  style={{
                    background: 'rgba(239, 68, 68, 0.2)',
                    border: '2px solid rgba(239, 68, 68, 0.5)',
                    borderRadius: '50%',
                    width: '40px',
                    height: '40px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: generating ? 'not-allowed' : 'pointer',
                    color: '#ef4444'
                  }}
                >
                  <X size={24} />
                </button>
              </div>

              {/* СЕТКА ТЕМАТИЧЕСКИХ КНОПОК */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
                {/* ПОКЕМОН */}
                <ThemeCard
                  theme="pokemon"
                  themeConfig={THEMES.pokemon}
                  generating={generating && selectedTheme === 'pokemon'}
                  onGenerateSingle={() => handleGenerateSingle('pokemon')}
                  onGenerateDeck={() => handleGenerateDeck('pokemon')}
                  onCryptoClick={() => { setCryptoTheme('pokemon'); setShowCryptoModal(true); }}
                  disabled={generating}
                />

                {/* ХЕЛЛОУИН */}
                <ThemeCard
                  theme="halloween"
                  themeConfig={THEMES.halloween}
                  generating={generating && selectedTheme === 'halloween'}
                  onGenerateSingle={() => handleGenerateSingle('halloween')}
                  onGenerateDeck={() => handleGenerateDeck('halloween')}
                  onCryptoClick={() => { setCryptoTheme('halloween'); setShowCryptoModal(true); }}
                  disabled={generating}
                />

                {/* ЗВЕЗДНЫЕ ВОЙНЫ */}
                <ThemeCard
                  theme="starwars"
                  themeConfig={THEMES.starwars}
                  generating={generating && selectedTheme === 'starwars'}
                  onGenerateSingle={() => handleGenerateSingle('starwars')}
                  onGenerateDeck={() => handleGenerateDeck('starwars')}
                  onCryptoClick={() => { setCryptoTheme('starwars'); setShowCryptoModal(true); }}
                  disabled={generating}
                />

                {/* ЛЕГЕНДАРНАЯ 👑 */}
                <ThemeCard
                  theme="legendary"
                  themeConfig={THEMES.legendary}
                  generating={generating && selectedTheme === 'legendary'}
                  onGenerateSingle={() => handleGenerateSingle('legendary')}
                  onGenerateDeck={() => handleGenerateDeck('legendary')}
                  onCryptoClick={() => { setCryptoTheme('legendary'); setShowCryptoModal(true); }}
                  disabled={generating}
                  isLegendary={true}
                />
              </div>

              {/* БАЛАНС */}
              <div style={{
                padding: '16px',
                borderRadius: '12px',
                background: 'rgba(251, 191, 36, 0.1)',
                border: '1px solid rgba(251, 191, 36, 0.3)',
                textAlign: 'center'
              }}>
                <p style={{ color: '#94a3b8', fontSize: '14px', marginBottom: '4px' }}>Ваш баланс:</p>
                <p style={{ color: '#fbbf24', fontSize: '24px', fontWeight: 'bold' }}>
                  💰 {userCoins.toLocaleString()}
                </p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* МОДАЛКА ВЫБОРА КРИПТОВАЛЮТЫ */}
      <AnimatePresence>
        {showCryptoModal && cryptoTheme && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowCryptoModal(false)}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(0, 0, 0, 0.85)',
              backdropFilter: 'blur(10px)',
              zIndex: 999999,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '20px'
            }}
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              style={{
                background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
                borderRadius: '24px',
                border: '2px solid rgba(16, 185, 129, 0.4)',
                padding: '32px',
                maxWidth: '500px',
                width: '100%',
                boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)'
              }}
            >
              {/* Заголовок */}
              <div style={{
                textAlign: 'center',
                marginBottom: '24px'
              }}>
                <h2 style={{
                  fontSize: '28px',
                  fontWeight: 'bold',
                  color: '#fbbf24',
                  marginBottom: '8px'
                }}>
                  💎 Оплата криптовалютой
                </h2>
                <p style={{ color: '#94a3b8', fontSize: '16px' }}>
                  {THEMES[cryptoTheme].name}
                </p>
              </div>

              {/* Кнопки криптовалют */}
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '16px',
                marginBottom: '24px'
              }}>
                {/* TON */}
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handleCryptoPayment('TON')}
                  disabled={!userTonAddress}
                  style={{
                    padding: '16px 20px',
                    borderRadius: '16px',
                    border: '2px solid rgba(0, 136, 204, 0.4)',
                    background: userTonAddress 
                      ? 'linear-gradient(135deg, #0088cc 0%, #005580 100%)'
                      : 'linear-gradient(135deg, #6b7280 0%, #4b5563 100%)',
                    color: '#ffffff',
                    fontSize: '18px',
                    fontWeight: 'bold',
                    cursor: userTonAddress ? 'pointer' : 'not-allowed',
                    opacity: userTonAddress ? 1 : 0.6,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    boxShadow: '0 4px 16px rgba(0, 136, 204, 0.3)'
                  }}
                >
                  <span>💎 TON</span>
                  <span>{THEMES[cryptoTheme].cryptoCost?.ton || 0}</span>
                </motion.button>
                {!userTonAddress && (
                  <div style={{ fontSize: '12px', color: '#94a3b8', textAlign: 'center', marginTop: '-8px' }}>
                    Подключите TON кошелек
                  </div>
                )}

                {/* SOLANA */}
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => alert(`☀️ SOLANA\n\nСтоимость: ${THEMES[cryptoTheme].cryptoCost?.sol || 0} SOL\n\n(Скоро будет доступна оплата!)`)}
                  style={{
                    padding: '16px 20px',
                    borderRadius: '16px',
                    border: '2px solid rgba(153, 69, 255, 0.4)',
                    background: 'linear-gradient(135deg, #9945ff 0%, #6a26cd 100%)',
                    color: '#ffffff',
                    fontSize: '18px',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    boxShadow: '0 4px 16px rgba(153, 69, 255, 0.3)'
                  }}
                >
                  <span>☀️ SOLANA</span>
                  <span>{THEMES[cryptoTheme].cryptoCost?.sol || 0}</span>
                </motion.button>

                {/* ETHEREUM */}
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => alert(`💠 ETHEREUM\n\nСтоимость: ${THEMES[cryptoTheme].cryptoCost?.eth || 0} ETH\n\n(Скоро будет доступна оплата!)`)}
                  style={{
                    padding: '16px 20px',
                    borderRadius: '16px',
                    border: '2px solid rgba(98, 126, 234, 0.4)',
                    background: 'linear-gradient(135deg, #627eea 0%, #4a5fd8 100%)',
                    color: '#ffffff',
                    fontSize: '18px',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    boxShadow: '0 4px 16px rgba(98, 126, 234, 0.3)'
                  }}
                >
                  <span>💠 ETHEREUM</span>
                  <span>{THEMES[cryptoTheme].cryptoCost?.eth || 0}</span>
                </motion.button>
              </div>

              {/* Кнопка закрыть */}
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setShowCryptoModal(false)}
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: '12px',
                  border: '2px solid rgba(239, 68, 68, 0.4)',
                  background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.2) 0%, rgba(220, 38, 38, 0.2) 100%)',
                  color: '#ef4444',
                  fontSize: '16px',
                  fontWeight: 'bold',
                  cursor: 'pointer'
                }}
              >
                ← НАЗАД
              </motion.button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

// Компонент карточки темы
interface ThemeCardProps {
  theme: keyof typeof THEMES;
  themeConfig: typeof THEMES[keyof typeof THEMES];
  generating: boolean;
  onGenerateSingle: () => void;
  onGenerateDeck: () => void;
  disabled: boolean;
  isLegendary?: boolean;
  onCryptoClick: () => void;
}

function ThemeCard({ theme, themeConfig, generating, onGenerateSingle, onGenerateDeck, disabled, isLegendary, onCryptoClick }: ThemeCardProps) {

  return (
    <div style={{
      position: 'relative',
      background: 'rgba(30, 41, 59, 0.6)',
      borderRadius: '16px',
      border: `2px solid ${themeConfig.color}40`,
      padding: '16px',
      display: 'flex',
      flexDirection: 'column',
      gap: '8px',
      overflow: 'hidden'
    }}>
      {/* 🔥 АНИМАЦИЯ ОГНЯ ДЛЯ ЛЕГЕНДАРНОЙ */}
      {isLegendary && (
        <>
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '4px',
            background: 'linear-gradient(90deg, #ff0000, #ff7f00, #ffff00, #ff7f00, #ff0000)',
            backgroundSize: '200% 100%',
            animation: 'fireMove 2s linear infinite',
            filter: 'blur(2px)',
            zIndex: 1
          }} />
          <div style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: '4px',
            background: 'linear-gradient(90deg, #ff0000, #ff7f00, #ffff00, #ff7f00, #ff0000)',
            backgroundSize: '200% 100%',
            animation: 'fireMove 2s linear infinite',
            filter: 'blur(2px)',
            zIndex: 1
          }} />
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            bottom: 0,
            width: '4px',
            background: 'linear-gradient(180deg, #ff0000, #ff7f00, #ffff00, #ff7f00, #ff0000)',
            backgroundSize: '100% 200%',
            animation: 'fireMove 2s linear infinite',
            filter: 'blur(2px)',
            zIndex: 1
          }} />
          <div style={{
            position: 'absolute',
            top: 0,
            right: 0,
            bottom: 0,
            width: '4px',
            background: 'linear-gradient(180deg, #ff0000, #ff7f00, #ffff00, #ff7f00, #ff0000)',
            backgroundSize: '100% 200%',
            animation: 'fireMove 2s linear infinite',
            filter: 'blur(2px)',
            zIndex: 1
          }} />
          <style>{`
            @keyframes fireMove {
              0% { background-position: 0% 0%; }
              100% { background-position: 200% 0%; }
            }
          `}</style>
        </>
      )}

      {/* ЗАГОЛОВОК ТЕМЫ */}
      <div style={{ textAlign: 'center', marginBottom: '4px', position: 'relative', zIndex: 2 }}>
        <div style={{ fontSize: '36px', marginBottom: '4px' }}>{themeConfig.icon}</div>
        <h3 style={{ fontSize: '16px', fontWeight: 'bold', color: themeConfig.color }}>
          {themeConfig.name}
        </h3>
      </div>

      {/* КНОПКА: ОДНА КАРТА - УМЕНЬШЕНА В 2 РАЗА */}
      <motion.button
        whileHover={{ scale: disabled ? 1 : 1.03 }}
        whileTap={{ scale: disabled ? 1 : 0.97 }}
        onClick={onGenerateSingle}
        disabled={disabled}
        style={{
          padding: '6px',
          borderRadius: '8px',
          border: 'none',
          background: generating ? '#64748b' : themeConfig.gradient,
          color: '#ffffff',
          fontWeight: 'bold',
          fontSize: '11px',
          cursor: disabled ? 'not-allowed' : 'pointer',
          opacity: disabled ? 0.6 : 1,
          position: 'relative',
          zIndex: 2
        }}
      >
        {generating ? '⏳' : `🎴 Карта (${(themeConfig.singleCost / 1000).toFixed(0)}K)`}
      </motion.button>

      {/* КНОПКА: КОЛОДА - УМЕНЬШЕНА В 2 РАЗА */}
      <motion.button
        whileHover={{ scale: disabled ? 1 : 1.03 }}
        whileTap={{ scale: disabled ? 1 : 0.97 }}
        onClick={onGenerateDeck}
        disabled={disabled}
        style={{
          padding: '6px',
          borderRadius: '8px',
          border: 'none',
          background: generating ? '#64748b' : themeConfig.gradient,
          color: '#ffffff',
          fontWeight: 'bold',
          fontSize: '11px',
          cursor: disabled ? 'not-allowed' : 'pointer',
          opacity: disabled ? 0.6 : 1,
          position: 'relative',
          zIndex: 2
        }}
      >
        {generating ? '⏳' : `🎴 Колода (${(themeConfig.deckCost / 1000).toFixed(0)}K)`}
      </motion.button>

      {/* КНОПКА: ЗА КРИПТУ - НОВАЯ! */}
      <motion.button
        whileHover={{ scale: disabled ? 1 : 1.03 }}
        whileTap={{ scale: disabled ? 1 : 0.97 }}
        onClick={onCryptoClick}
        disabled={disabled}
        style={{
          width: '100%',
          padding: '6px',
          borderRadius: '8px',
          border: 'none',
          background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
          color: '#ffffff',
          fontWeight: 'bold',
          fontSize: '11px',
          cursor: disabled ? 'not-allowed' : 'pointer',
          opacity: disabled ? 0.6 : 1,
          position: 'relative',
          zIndex: 2
        }}
      >
        💎 ЗА КРИПТУ
      </motion.button>
    </div>
  );
}

