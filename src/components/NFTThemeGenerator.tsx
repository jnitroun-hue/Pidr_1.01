'use client'

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Sparkles, Ghost, Swords, Zap } from 'lucide-react';

interface NFTThemeGeneratorProps {
  userCoins: number;
  onBalanceUpdate?: (newBalance: number) => void;
}

// Типы тем
type ThemeType = 'pokemon' | 'halloween' | 'starwars' | 'deck';

// Конфигурация тем
const THEMES = {
  pokemon: {
    name: 'Покемон',
    icon: '⚡',
    color: '#fbbf24',
    gradient: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)',
    singleCost: 10000,
    deckCost: 400000,
    total: 52,
    folder: 'pokemon',
    prefix: '' // Файлы: 1.png, 2.png, ...
  },
  halloween: {
    name: 'Хеллоуин',
    icon: '🎃',
    color: '#f97316',
    gradient: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
    singleCost: 5000, // ✅ Дешевле т.к. меньше картинок
    deckCost: 200000,
    total: 10, // ✅ Всего 10 картинок
    folder: 'halloween',
    prefix: 'hel_' // ✅ Файлы: hel_1.png, hel_2.png, ...
  },
  starwars: {
    name: 'Звездные войны',
    icon: '⚔️',
    color: '#3b82f6',
    gradient: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
    singleCost: 5000, // ✅ Дешевле т.к. меньше картинок
    deckCost: 200000,
    total: 7, // ✅ Всего 7 картинок
    folder: 'starwars',
    prefix: 'star_' // ✅ Файлы: star_1.png, star_2.png, ...
  }
};

const SUITS = ['spades', 'hearts', 'diamonds', 'clubs'];
const RANKS = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'j', 'q', 'k', 'a'];

export default function NFTThemeGenerator({ userCoins, onBalanceUpdate }: NFTThemeGeneratorProps) {
  const [showModal, setShowModal] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [selectedTheme, setSelectedTheme] = useState<ThemeType | null>(null);

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

      // ✅ КРИТИЧНО: Генерируем изображение АСИНХРОННО с ожиданием загрузки!
      const imageData = await generateThemeCardImage(randomSuit, randomRank, randomId, theme);

      // Отправляем на сервер
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
          action: `random_${theme}`
        })
      });

      const result = await response.json();

      if (response.ok && result.success) {
        alert(`✅ Карта ${themeConfig.name} создана!\n\n${randomRank.toUpperCase()} ${getSuitSymbol(randomSuit)}\n\nСохранено в коллекцию!`);
        
        if (onBalanceUpdate && result.newBalance !== undefined) {
          onBalanceUpdate(result.newBalance);
        }
        
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
          
          // ✅ КРИТИЧНО: Ждем загрузки изображения!
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
        alert(`✅ Колода ${themeConfig.name} создана!\n\n${successCount} уникальных карт\nСохранено в коллекцию!`);
        
        if (onBalanceUpdate && deductResult.newBalance !== undefined) {
          onBalanceUpdate(deductResult.newBalance);
        }
        
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

  // ✅ КРИТИЧНО: Генерация изображения карты с темой АСИНХРОННО!
  const generateThemeCardImage = (suit: string, rank: string, themeId: number, theme: keyof typeof THEMES): Promise<string> => {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas');
      canvas.width = 300;
      canvas.height = 420;
      const ctx = canvas.getContext('2d')!;

      // Белый фон
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, 300, 420);

      // Черная рамка
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 8;
      ctx.strokeRect(4, 4, 292, 412);

      const themeConfig = THEMES[theme];

      // Ранг и масть в углах
      ctx.fillStyle = getSuitColor(suit);
      ctx.font = 'bold 40px Arial';
      ctx.fillText(rank.toUpperCase(), 20, 50);
      ctx.fillText(rank.toUpperCase(), 260, 400);

      ctx.font = 'bold 36px Arial';
      ctx.fillText(getSuitSymbol(suit), 20, 90);
      ctx.fillText(getSuitSymbol(suit), 260, 360);

      // ✅ ВАЖНО: Загружаем РЕАЛЬНОЕ изображение из public/
      const fileName = `${themeConfig.prefix}${themeId}.png`;
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.src = `/${themeConfig.folder}/${fileName}`;
      
      // ✅ КРИТИЧНО: Ждем загрузки изображения, ЗАТЕМ возвращаем dataURL!
      img.onload = () => {
        try {
          const imgWidth = 200;
          const imgHeight = 200;
          const imgX = (300 - imgWidth) / 2;
          const imgY = 110;
          
          // Рисуем изображение в центре
          ctx.drawImage(img, imgX, imgY, imgWidth, imgHeight);
          
          // ✅ ВОЗВРАЩАЕМ dataURL ПОСЛЕ загрузки!
          resolve(canvas.toDataURL('image/png'));
        } catch (error) {
          console.error('❌ Ошибка при рисовании изображения:', error);
          reject(error);
        }
      };

      img.onerror = (error) => {
        console.error(`❌ Не удалось загрузить изображение: /${themeConfig.folder}/${fileName}`, error);
        // Возвращаем canvas без изображения (только текст)
        resolve(canvas.toDataURL('image/png'));
      };
    });
  };

  const getSuitColor = (suit: string) => {
    if (suit === 'hearts' || suit === 'diamonds') return '#ef4444';
    return '#000000';
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
                  disabled={generating}
                />

                {/* ХЕЛЛОУИН */}
                <ThemeCard
                  theme="halloween"
                  themeConfig={THEMES.halloween}
                  generating={generating && selectedTheme === 'halloween'}
                  onGenerateSingle={() => handleGenerateSingle('halloween')}
                  onGenerateDeck={() => handleGenerateDeck('halloween')}
                  disabled={generating}
                />

                {/* ЗВЕЗДНЫЕ ВОЙНЫ */}
                <ThemeCard
                  theme="starwars"
                  themeConfig={THEMES.starwars}
                  generating={generating && selectedTheme === 'starwars'}
                  onGenerateSingle={() => handleGenerateSingle('starwars')}
                  onGenerateDeck={() => handleGenerateDeck('starwars')}
                  disabled={generating}
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
}

function ThemeCard({ theme, themeConfig, generating, onGenerateSingle, onGenerateDeck, disabled }: ThemeCardProps) {
  return (
    <div style={{
      background: 'rgba(30, 41, 59, 0.6)',
      borderRadius: '16px',
      border: `2px solid ${themeConfig.color}40`,
      padding: '20px',
      display: 'flex',
      flexDirection: 'column',
      gap: '12px'
    }}>
      {/* ЗАГОЛОВОК ТЕМЫ */}
      <div style={{ textAlign: 'center', marginBottom: '8px' }}>
        <div style={{ fontSize: '48px', marginBottom: '8px' }}>{themeConfig.icon}</div>
        <h3 style={{ fontSize: '20px', fontWeight: 'bold', color: themeConfig.color }}>
          {themeConfig.name}
        </h3>
      </div>

      {/* КНОПКА: ОДНА КАРТА */}
      <motion.button
        whileHover={{ scale: disabled ? 1 : 1.03 }}
        whileTap={{ scale: disabled ? 1 : 0.97 }}
        onClick={onGenerateSingle}
        disabled={disabled}
        style={{
          padding: '12px',
          borderRadius: '10px',
          border: 'none',
          background: generating ? '#64748b' : themeConfig.gradient,
          color: '#ffffff',
          fontWeight: 'bold',
          fontSize: '14px',
          cursor: disabled ? 'not-allowed' : 'pointer',
          opacity: disabled ? 0.6 : 1
        }}
      >
        {generating ? '⏳ Генерация...' : `🎴 Карта (${(themeConfig.singleCost / 1000).toFixed(0)}K)`}
      </motion.button>

      {/* КНОПКА: КОЛОДА */}
      <motion.button
        whileHover={{ scale: disabled ? 1 : 1.03 }}
        whileTap={{ scale: disabled ? 1 : 0.97 }}
        onClick={onGenerateDeck}
        disabled={disabled}
        style={{
          padding: '12px',
          borderRadius: '10px',
          border: 'none',
          background: generating ? '#64748b' : themeConfig.gradient,
          color: '#ffffff',
          fontWeight: 'bold',
          fontSize: '14px',
          cursor: disabled ? 'not-allowed' : 'pointer',
          opacity: disabled ? 0.6 : 1
        }}
      >
        {generating ? '⏳ Генерация...' : `🎴 Колода (${(themeConfig.deckCost / 1000).toFixed(0)}K)`}
      </motion.button>
    </div>
  );
}

