'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';

const SUITS = [
  { value: 'hearts', label: 'Червы', symbol: '♥', color: '#ef4444', gradient: 'linear-gradient(135deg, #ff6b6b 0%, #ee5a6f 100%)' },
  { value: 'diamonds', label: 'Бубны', symbol: '♦', color: '#ef4444', gradient: 'linear-gradient(135deg, #ff8787 0%, #ff5c5c 100%)' },
  { value: 'clubs', label: 'Трефы', symbol: '♣', color: '#1f2937', gradient: 'linear-gradient(135deg, #4b5563 0%, #1f2937 100%)' },
  { value: 'spades', label: 'Пики', symbol: '♠', color: '#000000', gradient: 'linear-gradient(135deg, #374151 0%, #111827 100%)' }
];

const RANKS = [
  { value: '2', label: '2', display: '2', cost: 1000 },
  { value: '3', label: '3', display: '3', cost: 1000 },
  { value: '4', label: '4', display: '4', cost: 1000 },
  { value: '5', label: '5', display: '5', cost: 1000 },
  { value: '6', label: '6', display: '6', cost: 1000 },
  { value: '7', label: '7', display: '7', cost: 1000 },
  { value: '8', label: '8', display: '8', cost: 1000 },
  { value: '9', label: '9', display: '9', cost: 1000 },
  { value: '10', label: '10', display: '10', cost: 2500 },
  { value: 'jack', label: 'Валет', display: 'J', cost: 2500 },
  { value: 'queen', label: 'Дама', display: 'Q', cost: 5000 },
  { value: 'king', label: 'Король', display: 'K', cost: 5000 },
  { value: 'ace', label: 'Туз', display: 'A', cost: 8000 }
];

// ✅ НОВАЯ СИСТЕМА: Цена = Ранг + Масть
// Цены по мастям (добавляются к цене ранга):
// ♥️♦️♣️ = +500 монет
// ♠️ = +1000 монет
const SUIT_COSTS: Record<string, number> = {
  'hearts': 500,
  'diamonds': 500,
  'clubs': 500,
  'spades': 1000
};

const FULL_DECK_COST = 150000;

interface NFTCanvasGeneratorProps {
  userCoins: number;
  onBalanceUpdate: (newBalance: number) => void;
}

export default function NFTCanvasGenerator({ userCoins, onBalanceUpdate }: NFTCanvasGeneratorProps) {
  const [selectedSuit, setSelectedSuit] = useState<string>('hearts');
  const [selectedRank, setSelectedRank] = useState<string>('ace');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedCard, setGeneratedCard] = useState<any>(null);
  const [userCards, setUserCards] = useState<any[]>([]);
  const [showSuccess, setShowSuccess] = useState(false);

  // ✅ Вычисляем цену на основе ранга и масти
  const currentRank = RANKS.find(r => r.value === selectedRank);
  const rankCost = currentRank?.cost || 1000;
  const suitCost = SUIT_COSTS[selectedSuit] || 500;
  const currentCost = rankCost + suitCost;

  // Загрузка карт пользователя
  useEffect(() => {
    fetchUserCards();
  }, []);

  const fetchUserCards = async () => {
    try {
      // Получаем данные пользователя из localStorage
      // ✅ ИСПРАВЛЕНО: Берём telegramId из Telegram WebApp напрямую
      const telegramUser = typeof window !== 'undefined' && (window as any).Telegram?.WebApp?.initDataUnsafe?.user;
      const telegramId = telegramUser?.id?.toString() || '';
      const username = telegramUser?.username || telegramUser?.first_name || '';
      
      console.log('🎴 [NFT] Отправляем запрос с headers:', { telegramId, username });

      const response = await fetch('/api/nft/generate-canvas', {
        credentials: 'include',
        headers: {
          'x-telegram-id': telegramId || '',
          'x-username': username || ''
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setUserCards(data.cards || []);
        }
      }
    } catch (error) {
      console.error('❌ Ошибка загрузки карт:', error);
    }
  };

  /**
   * ✅ Генерация изображения карты через Canvas (БЕЗ редкости)
   */
  const generateCardImage = (suit: string, rank: string): string => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas не поддерживается');

    const CARD_WIDTH = 500;
    const CARD_HEIGHT = 700;
    const CARD_RADIUS = 30;

    canvas.width = CARD_WIDTH;
    canvas.height = CARD_HEIGHT;

    const suitColor = getSuitColor(suit);
    const suitSymbol = getSuitSymbol(suit);

    // Фон карты
    ctx.fillStyle = '#1e293b';
    roundRect(ctx, 0, 0, CARD_WIDTH, CARD_HEIGHT, CARD_RADIUS);
    ctx.fill();

    // Градиент в зависимости от масти
    const gradient = ctx.createLinearGradient(0, 0, CARD_WIDTH, CARD_HEIGHT);
    if (suit === 'spades') {
      // Пики - более темные и дорогие
      gradient.addColorStop(0, '#37415133');
      gradient.addColorStop(1, '#11182711');
    } else {
      // Остальные масти
      gradient.addColorStop(0, `${suitColor}22`);
      gradient.addColorStop(1, `${suitColor}11`);
    }
    ctx.fillStyle = gradient;
    roundRect(ctx, 0, 0, CARD_WIDTH, CARD_HEIGHT, CARD_RADIUS);
    ctx.fill();

    // Рамка
    ctx.strokeStyle = suitColor;
    ctx.lineWidth = suit === 'spades' ? 8 : 4; // Пики с более толстой рамкой
    roundRect(ctx, 10, 10, CARD_WIDTH - 20, CARD_HEIGHT - 20, CARD_RADIUS - 5);
    ctx.stroke();

    // Масть и ранг (большой текст по центру)
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 120px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    const rankDisplay = rank.toUpperCase();
    ctx.fillText(rankDisplay, CARD_WIDTH / 2, CARD_HEIGHT / 2 - 50);

    // Символ масти
    ctx.font = 'bold 80px Arial';
    ctx.fillStyle = suitColor;
    ctx.fillText(suitSymbol, CARD_WIDTH / 2, CARD_HEIGHT / 2 + 80);

    // Цена внизу
    const rankInfo = RANKS.find(r => r.value === rank);
    const totalCost = (rankInfo?.cost || 1000) + (SUIT_COSTS[suit] || 500);
    ctx.font = 'bold 24px Arial';
    ctx.fillStyle = '#fbbf24';
    ctx.fillText(`${totalCost} монет`, CARD_WIDTH / 2, CARD_HEIGHT - 40);

    // Маленькие символы по углам
    ctx.font = 'bold 40px Arial';
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'left';
    ctx.fillText(rankDisplay, 30, 50);
    ctx.textAlign = 'right';
    ctx.fillText(rankDisplay, CARD_WIDTH - 30, CARD_HEIGHT - 30);

    return canvas.toDataURL('image/png');
  };

  const roundRect = (ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number) => {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
  };

  const getSuitSymbol = (suit: string): string => {
    const symbols: Record<string, string> = {
      hearts: '♥',
      diamonds: '♦',
      clubs: '♣',
      spades: '♠'
    };
    return symbols[suit] || '?';
  };

  const getSuitColor = (suit: string): string => {
    return (suit === 'hearts' || suit === 'diamonds') ? '#ef4444' : '#000000';
  };

  const handleGenerate = async () => {
    if (userCoins < currentCost) {
      alert(`Недостаточно монет! Требуется: ${currentCost}, доступно: ${userCoins}`);
      return;
    }

    setIsGenerating(true);
    setGeneratedCard(null);

    try {
      console.log('🎨 Генерация изображения карты...');
      
      // ✅ Генерируем изображение через Canvas (БЕЗ rarity)
      const imageDataUrl = generateCardImage(selectedSuit, selectedRank);
      
      console.log('✅ Изображение сгенерировано, отправляем на сервер...');

      // Получаем данные пользователя из localStorage
      // ✅ ИСПРАВЛЕНО: Берём telegramId из Telegram WebApp напрямую
      const telegramUser = typeof window !== 'undefined' && (window as any).Telegram?.WebApp?.initDataUnsafe?.user;
      const telegramId = telegramUser?.id?.toString() || '';
      const username = telegramUser?.username || telegramUser?.first_name || '';
      
      console.log('🎴 [NFT] Отправляем запрос с headers:', { telegramId, username });

      const response = await fetch('/api/nft/generate-canvas', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-telegram-id': telegramId || '',
          'x-username': username || ''
        },
        credentials: 'include',
        body: JSON.stringify({
          action: 'single',
          suit: selectedSuit,
          rank: selectedRank,
          imageDataUrl
        })
      });

      const data = await response.json();

      if (data.success) {
        setGeneratedCard(data.card);
        setShowSuccess(true);
        onBalanceUpdate(data.balance);
        
        // ✅ ОБНОВЛЯЕМ КОЛЛЕКЦИЮ NFT ПОСЛЕ ГЕНЕРАЦИИ (с задержкой для обновления БД)
        setTimeout(() => {
          window.dispatchEvent(new CustomEvent('nft-collection-updated'));
          window.dispatchEvent(new CustomEvent('transaction-created')); // ✅ Триггерим обновление истории
        }, 500);
        
        // Обновляем список карт
        await fetchUserCards();

        setTimeout(() => setShowSuccess(false), 3000);
      } else {
        alert(data.error || 'Ошибка генерации карты');
      }
    } catch (error: any) {
      console.error('❌ Ошибка генерации:', error);
      alert('Ошибка генерации карты');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGenerateFullDeck = async () => {
    if (userCoins < FULL_DECK_COST) {
      alert(`Недостаточно монет для полной колоды! Требуется: ${FULL_DECK_COST}, доступно: ${userCoins}`);
      return;
    }

    if (!confirm(`Сгенерировать полную колоду (52 карты) за ${FULL_DECK_COST} монет?\n\nЭто займет несколько минут...`)) {
      return;
    }

    setIsGenerating(true);

    try {
      console.log('🎴 Начинаем генерацию полной колоды...');
      
      const suits = ['hearts', 'diamonds', 'clubs', 'spades'];
      const ranks = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'jack', 'queen', 'king', 'ace'];
      
      let successCount = 0;
      let failureCount = 0;
      
      // Генерируем каждую карту последовательно
      let isFirstCard = true;
      
      for (const suit of suits) {
        for (const rank of ranks) {
          try {
            console.log(`🎨 Генерация ${rank} of ${suit}...`);
            
            // ✅ Генерируем изображение (БЕЗ rarity)
            const imageDataUrl = generateCardImage(suit, rank);
            
            // ✅ ИСПРАВЛЕНО: Берём telegramId из Telegram WebApp напрямую
            const telegramUser = typeof window !== 'undefined' && (window as any).Telegram?.WebApp?.initDataUnsafe?.user;
            const telegramId = telegramUser?.id?.toString() || '';
            const username = telegramUser?.username || telegramUser?.first_name || '';
            
            console.log('🎴 [NFT Full Deck] Отправляем запрос с headers:', { telegramId, username });
            
            // Отправляем на сервер
            const response = await fetch('/api/nft/generate-canvas', {
              method: 'POST',
              headers: { 
                'Content-Type': 'application/json',
                'x-telegram-id': telegramId || '',
                'x-username': username || ''
              },
              credentials: 'include',
              body: JSON.stringify({
                action: isFirstCard ? 'full_deck' : 'deck_card', // Первая карта списывает 150000, остальные бесплатно
                suit,
                rank,
                imageDataUrl
              })
            });

            const data = await response.json();

            if (data.success) {
              successCount++;
              if (isFirstCard) {
                // Обновляем баланс только после первой карты (когда деньги списались)
                onBalanceUpdate(data.balance);
                isFirstCard = false;
              }
              console.log(`✅ ${rank} of ${suit} сгенерирована (${successCount}/52)`);
            } else {
              failureCount++;
              console.error(`❌ Ошибка генерации ${rank} of ${suit}:`, data.error);
              // Если ошибка на первой карте - прерываем (деньги не списались или вернулись)
              if (isFirstCard) {
                throw new Error(data.error || 'Ошибка оплаты');
              }
            }
            
            // Небольшая задержка между запросами
            await new Promise(resolve => setTimeout(resolve, 100));
            
          } catch (error) {
            failureCount++;
            console.error(`❌ Ошибка генерации ${rank} of ${suit}:`, error);
            // Если ошибка на первой карте - прерываем весь процесс
            if (isFirstCard) {
              throw error;
            }
          }
        }
      }
      
      // ✅ ОБНОВЛЯЕМ КОЛЛЕКЦИЮ NFT ПОСЛЕ ГЕНЕРАЦИИ КОЛОДЫ (с задержкой для обновления БД)
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('nft-collection-updated'));
        window.dispatchEvent(new CustomEvent('transaction-created')); // ✅ Триггерим обновление истории
      }, 1000);
      
      // Обновляем список карт
      await fetchUserCards();
      
      alert(`Колода сгенерирована!\nУспешно: ${successCount}\nОшибок: ${failureCount}`);
      
    } catch (error: any) {
      console.error('❌ Ошибка генерации колоды:', error);
      alert('Ошибка генерации колоды');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Компактный контейнер */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        style={{
          background: 'linear-gradient(145deg, rgba(30, 41, 59, 0.9) 0%, rgba(15, 23, 42, 0.9) 100%)',
          backdropFilter: 'blur(10px)',
          borderRadius: '16px',
          padding: '20px',
          border: '1px solid rgba(251, 191, 36, 0.15)',
          boxShadow: '0 8px 24px rgba(0, 0, 0, 0.3)'
        }}
      >
        <h3 
          className="text-lg font-bold text-white mb-4"
          style={{
            color: '#fbbf24'
          }}
        >
          ⚡ ГЕНЕРАТОР NFT
        </h3>

        {/* Масть */}
        <div className="mb-4">
          
          {/* Масть */}
          <div>
            <label className="block text-xs font-bold text-gray-300 mb-2 uppercase tracking-wide">
              Масть
            </label>
              {SUITS.map((suit) => {
                const isSelected = selectedSuit === suit.value;
                return (
                  <button
                    key={suit.value}
                    onClick={() => setSelectedSuit(suit.value)}
                    disabled={isGenerating}
                    className="relative p-3 rounded-lg transition-all"
                    style={{ 
                      background: isSelected ? `${suit.color}20` : 'rgba(30, 41, 59, 0.6)',
                      border: isSelected ? `2px solid ${suit.color}` : '1px solid rgba(71, 85, 105, 0.4)',
                      cursor: 'pointer'
                    }}
                  >
                    <div className="text-center">
                      <div className="text-3xl mb-1" style={{ color: isSelected ? suit.color : '#64748b' }}>
                        {suit.symbol}
                      </div>
                      <div className="text-xs font-bold" style={{ color: isSelected ? '#fff' : '#64748b' }}>
                        {suit.label}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

        {/* Ранг */}
        <div className="mb-8">
          <label className="block text-lg font-extrabold text-white mb-4 flex items-center gap-3">
            <span className="text-3xl">🎯</span> 
            <span style={{
              background: 'linear-gradient(135deg, #fff 0%, #cbd5e1 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent'
            }}>
              Выберите ранг карты
            </span>
          </label>
          <div className="grid grid-cols-7 gap-2">
            {RANKS.map((rank) => {
              const isSelected = selectedRank === rank.value;
              const suitColor = SUITS.find(s => s.value === selectedSuit)?.color || '#fbbf24';
              
              return (
                <motion.button
                  key={rank.value}
                  onClick={() => setSelectedRank(rank.value)}
                  disabled={isGenerating}
                  whileHover={{ scale: 1.15, y: -8 }}
                  whileTap={{ scale: 0.9 }}
                  className="aspect-[2/3] font-bold text-2xl transition-all relative overflow-hidden"
                  style={{
                    background: isSelected 
                      ? `linear-gradient(145deg, ${suitColor}25, ${suitColor}40)`
                      : 'linear-gradient(145deg, #1e293b, #0f172a)',
                    border: isSelected ? `3px solid ${suitColor}` : '1px solid rgba(71, 85, 105, 0.4)',
                    borderRadius: '12px',
                    color: isSelected ? suitColor : '#64748b',
                    boxShadow: isSelected 
                      ? `0 8px 24px ${suitColor}50, inset 0 1px 0 rgba(255,255,255,0.1)`
                      : '4px 4px 8px rgba(0, 0, 0, 0.4), -2px -2px 6px rgba(255, 255, 255, 0.02)',
                    textShadow: isSelected ? `0 0 20px ${suitColor}80` : 'none',
                    cursor: 'pointer'
                  }}
                  title={rank.label}
                >
                  <div className="flex flex-col items-center justify-center h-full">
                    <motion.span
                      animate={isSelected ? { scale: [1, 1.2, 1] } : {}}
                      transition={{ duration: 0.3 }}
                    >
                      {rank.display}
                    </motion.span>
                  </div>
                  {isSelected && (
                    <motion.div
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className="absolute -top-1 -right-1"
                      style={{
                        width: '20px',
                        height: '20px',
                        borderRadius: '50%',
                        background: `linear-gradient(135deg, ${suitColor} 0%, ${suitColor}dd 100%)`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: `0 2px 8px ${suitColor}80`,
                        border: '2px solid white'
                      }}
                    >
                      <span className="text-white text-xs font-bold">✓</span>
                    </motion.div>
                  )}
                </motion.button>
              );
            })}
          </div>
        </div>

        {/* ✅ Информация о ценах */}
        <div className="mb-8 bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-6 border-2 border-amber-500/30">
          <div className="mb-4">
            <span className="text-xl font-extrabold text-amber-400 block">
              💰 Система Ценообразования
            </span>
          </div>
          
          <div className="space-y-4">
            {/* Цены по рангам */}
            <div className="bg-slate-900/50 rounded-xl p-4">
              <h3 className="text-md font-bold text-amber-300 mb-2">📊 По рангу:</h3>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="flex justify-between"><span className="text-slate-300">2-9:</span><span className="font-bold text-green-400">1,000🪙</span></div>
                <div className="flex justify-between"><span className="text-slate-300">10-J:</span><span className="font-bold text-blue-400">2,500🪙</span></div>
                <div className="flex justify-between"><span className="text-slate-300">Q-K:</span><span className="font-bold text-purple-400">5,000🪙</span></div>
                <div className="flex justify-between"><span className="text-slate-300">A:</span><span className="font-bold text-red-400">8,000🪙</span></div>
              </div>
            </div>

            {/* Цены по мастям */}
            <div className="bg-slate-900/50 rounded-xl p-4">
              <h3 className="text-md font-bold text-amber-300 mb-2">🃏 По масти:</h3>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="flex justify-between"><span className="text-slate-300">♥️♦️♣️:</span><span className="font-bold text-green-400">+500🪙</span></div>
                <div className="flex justify-between"><span className="text-slate-300">♠️:</span><span className="font-bold text-purple-400">+1,000🪙</span></div>
              </div>
            </div>

            {/* Итоговая цена */}
            <div className="bg-gradient-to-r from-amber-500/20 to-orange-500/20 rounded-xl p-3 border border-amber-500/50">
              <div className="flex justify-between items-center">
                <span className="text-sm font-bold text-white">Итого:</span>
                <span className="text-xl font-extrabold text-amber-400">{currentCost}🪙</span>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                {rankCost} + {suitCost} = {currentCost} монет
              </p>
            </div>
          </div>
        </div>

        {/* Кнопки генерации */}
        <div className="space-y-4 mt-8">
          <motion.button
            onClick={handleGenerate}
            disabled={isGenerating || userCoins < currentCost}
            whileHover={!isGenerating && userCoins >= currentCost ? { scale: 1.02, y: -4 } : {}}
            whileTap={!isGenerating && userCoins >= currentCost ? { scale: 0.98 } : {}}
            className="w-full rounded-2xl font-extrabold text-white transition-all relative overflow-hidden"
            style={{
              background: isGenerating || userCoins < currentCost
                ? 'linear-gradient(145deg, #4b5563, #374151)'
                : 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 50%, #ea580c 100%)',
              padding: '24px 32px',
              boxShadow: isGenerating || userCoins < currentCost
                ? '4px 4px 8px rgba(0, 0, 0, 0.4)'
                : '0 12px 40px rgba(251, 191, 36, 0.6), inset 0 2px 0 rgba(255,255,255,0.3), 0 0 0 4px rgba(251, 191, 36, 0.2)',
              opacity: isGenerating || userCoins < currentCost ? 0.6 : 1,
              cursor: isGenerating || userCoins < currentCost ? 'not-allowed' : 'pointer',
              border: '3px solid rgba(251, 191, 36, 0.5)'
            }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <motion.span 
                  className="text-4xl"
                  animate={isGenerating ? { rotate: 360 } : {}}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                >
                  {isGenerating ? '⏳' : '🎴'}
                </motion.span>
                <span className="text-xl">
                  {isGenerating ? 'Генерация...' : 'СГЕНЕРИРОВАТЬ КАРТУ'}
                </span>
              </div>
              {!isGenerating && (
                <div
                  className="font-extrabold text-2xl px-5 py-2 rounded-xl"
                  style={{
                    background: 'rgba(0,0,0,0.3)',
                    color: '#fff',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.2)',
                    border: '2px solid rgba(255,255,255,0.3)'
                  }}
                >
                  {currentCost} 🪙
                </div>
              )}
            </div>
          </motion.button>

          <motion.button
            onClick={handleGenerateFullDeck}
            disabled={isGenerating || userCoins < FULL_DECK_COST}
            whileHover={!isGenerating && userCoins >= FULL_DECK_COST ? { scale: 1.02, y: -4 } : {}}
            whileTap={!isGenerating && userCoins >= FULL_DECK_COST ? { scale: 0.98 } : {}}
            className="w-full rounded-2xl font-extrabold text-white transition-all relative overflow-hidden"
            style={{
              background: isGenerating || userCoins < FULL_DECK_COST
                ? 'linear-gradient(145deg, #4b5563, #374151)'
                : 'linear-gradient(135deg, #a855f7 0%, #8b5cf6 50%, #7c3aed 100%)',
              padding: '24px 32px',
              boxShadow: isGenerating || userCoins < FULL_DECK_COST
                ? '4px 4px 8px rgba(0, 0, 0, 0.4)'
                : '0 12px 40px rgba(168, 85, 247, 0.6), inset 0 2px 0 rgba(255,255,255,0.3), 0 0 0 4px rgba(168, 85, 247, 0.2)',
              opacity: isGenerating || userCoins < FULL_DECK_COST ? 0.6 : 1,
              cursor: isGenerating || userCoins < FULL_DECK_COST ? 'not-allowed' : 'pointer',
              border: '3px solid rgba(168, 85, 247, 0.5)'
            }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <motion.span 
                  className="text-4xl"
                  animate={isGenerating ? { rotate: 360 } : {}}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                >
                  {isGenerating ? '⏳' : '🎴'}
                </motion.span>
                <div className="text-left">
                  <span className="text-xl block">
                    {isGenerating ? 'ГЕНЕРАЦИЯ КОЛОДЫ...' : 'ПОЛНАЯ КОЛОДА'}
                  </span>
                  {!isGenerating && (
                    <span className="text-sm opacity-80 block">52 КАРТЫ В КОМПЛЕКТЕ</span>
                  )}
                </div>
              </div>
              {!isGenerating && (
                <div
                  className="font-extrabold text-2xl px-5 py-2 rounded-xl"
                  style={{
                    background: 'rgba(0,0,0,0.3)',
                    color: '#fff',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.2)',
                    border: '2px solid rgba(255,255,255,0.3)'
                  }}
                >
                  {FULL_DECK_COST} 🪙
                </div>
              )}
            </div>
          </motion.button>
        </div>

        {/* Баланс */}
        <motion.div 
          className="mt-8 rounded-2xl text-center relative overflow-hidden"
          style={{
            background: 'linear-gradient(135deg, rgba(251, 191, 36, 0.2) 0%, rgba(245, 158, 11, 0.15) 100%)',
            border: '3px solid rgba(251, 191, 36, 0.4)',
            boxShadow: '0 8px 32px rgba(251, 191, 36, 0.3), inset 0 1px 0 rgba(255,255,255,0.1)',
            padding: '24px'
          }}
        >
          <div className="flex items-center justify-center gap-4">
            <motion.span 
              className="text-5xl"
              animate={{ rotate: [0, 5, -5, 0] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            >
              🪙
            </motion.span>
            <div>
              <p 
                className="text-sm uppercase tracking-widest font-bold mb-1"
                style={{
                  color: '#fbbf24',
                  textShadow: '0 2px 4px rgba(0,0,0,0.3)'
                }}
              >
                ВАШ БАЛАНС
              </p>
              <p 
                className="text-4xl font-black"
                style={{
                  color: '#fff',
                  textShadow: '0 0 20px rgba(251, 191, 36, 0.8), 0 4px 8px rgba(0,0,0,0.3)'
                }}
              >
                {userCoins.toLocaleString()}
              </p>
            </div>
          </div>
        </motion.div>
      </motion.div>

      {/* Успешная генерация */}
      <AnimatePresence>
        {showSuccess && generatedCard && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="bg-gradient-to-br from-green-800 to-green-900 rounded-xl p-6 border-2 border-green-500"
          >
            <div className="text-center">
              <div className="text-4xl mb-2">✅</div>
              <h3 className="text-xl font-bold text-white mb-2">
                Карта успешно сгенерирована!
              </h3>
              <p className="text-green-300">
                {generatedCard.rank.toUpperCase()} of {generatedCard.suit}
              </p>
              <p className="text-amber-400 font-bold mt-2">
                💰 Стоимость: {currentCost} монет
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Список сгенерированных карт */}
      <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl p-6 border border-slate-700">
        <h3 className="text-lg font-bold text-white mb-4">
          Мои сгенерированные карты ({userCards.length})
        </h3>

        {userCards.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            <p>У вас пока нет сгенерированных карт</p>
            <p className="text-sm mt-2">Создайте свою первую NFT карту!</p>
          </div>
        ) : (
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
            {userCards.map((card, index) => (
              <div
                key={card.id || index}
                className="relative group cursor-pointer hover:scale-105 transition-transform"
                style={{
                  borderRadius: '8px',
                  border: card.suit === 'spades' ? '3px solid #a855f7' : '2px solid #3b82f6',
                  padding: '4px',
                  background: 'rgba(15, 23, 42, 0.8)'
                }}
              >
                <div className="aspect-[5/7] bg-slate-700 rounded-md flex items-center justify-center">
                  <div className="text-center">
                    <div className="text-2xl mb-1">
                      {card.suit === 'hearts' ? '♥️' : card.suit === 'diamonds' ? '♦️' : card.suit === 'clubs' ? '♣️' : '♠️'}
                    </div>
                    <div className="text-xs font-bold text-white">
                      {card.rank.toUpperCase()}
                    </div>
                  </div>
                </div>
                
                {/* Цена карты */}
                <div 
                  className="absolute -top-2 -right-2 px-2 py-1 rounded-full flex items-center justify-center text-xs font-bold border-2 border-amber-500 bg-amber-600"
                >
                  💰
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

