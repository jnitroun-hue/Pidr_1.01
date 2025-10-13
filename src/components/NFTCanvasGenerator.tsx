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
  { value: '2', label: '2', display: '2' },
  { value: '3', label: '3', display: '3' },
  { value: '4', label: '4', display: '4' },
  { value: '5', label: '5', display: '5' },
  { value: '6', label: '6', display: '6' },
  { value: '7', label: '7', display: '7' },
  { value: '8', label: '8', display: '8' },
  { value: '9', label: '9', display: '9' },
  { value: '10', label: '10', display: '10' },
  { value: 'jack', label: 'Валет', display: 'J' },
  { value: 'queen', label: 'Дама', display: 'Q' },
  { value: 'king', label: 'Король', display: 'K' },
  { value: 'ace', label: 'Туз', display: 'A' }
];

const RARITIES = [
  { value: 'common', label: 'Common', emoji: '⚪', color: '#94a3b8', gradient: 'linear-gradient(135deg, #cbd5e1 0%, #94a3b8 100%)', cost: 1000 },
  { value: 'rare', label: 'Rare', emoji: '🔵', color: '#3b82f6', gradient: 'linear-gradient(135deg, #60a5fa 0%, #3b82f6 100%)', cost: 2000 },
  { value: 'epic', label: 'Epic', emoji: '🟣', color: '#a855f7', gradient: 'linear-gradient(135deg, #c084fc 0%, #a855f7 100%)', cost: 3500 },
  { value: 'legendary', label: 'Legendary', emoji: '🟡', color: '#f59e0b', gradient: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)', cost: 5000 },
  { value: 'mythic', label: 'Mythic', emoji: '🔴', color: '#ef4444', gradient: 'linear-gradient(135deg, #ff6b6b 0%, #ee5a6f 100%)', cost: 10000 }
];

const FULL_DECK_COST = 20000;

interface NFTCanvasGeneratorProps {
  userCoins: number;
  onBalanceUpdate: (newBalance: number) => void;
}

export default function NFTCanvasGenerator({ userCoins, onBalanceUpdate }: NFTCanvasGeneratorProps) {
  const [selectedSuit, setSelectedSuit] = useState<string>('hearts');
  const [selectedRank, setSelectedRank] = useState<string>('ace');
  const [selectedRarity, setSelectedRarity] = useState<string>('common');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedCard, setGeneratedCard] = useState<any>(null);
  const [userCards, setUserCards] = useState<any[]>([]);
  const [showSuccess, setShowSuccess] = useState(false);

  const currentRarity = RARITIES.find(r => r.value === selectedRarity);
  const currentCost = currentRarity?.cost || 100;

  // Загрузка карт пользователя
  useEffect(() => {
    fetchUserCards();
  }, []);

  const fetchUserCards = async () => {
    try {
      const response = await fetch('/api/nft/generate-canvas', {
        credentials: 'include'
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
   * Генерация изображения карты через Canvas
   */
  const generateCardImage = (suit: string, rank: string, rarity: string): string => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas не поддерживается');

    const CARD_WIDTH = 500;
    const CARD_HEIGHT = 700;
    const CARD_RADIUS = 30;

    canvas.width = CARD_WIDTH;
    canvas.height = CARD_HEIGHT;

    const rarityConfig = RARITIES.find(r => r.value === rarity) || RARITIES[0];

    // Фон карты
    ctx.fillStyle = '#1e293b';
    roundRect(ctx, 0, 0, CARD_WIDTH, CARD_HEIGHT, CARD_RADIUS);
    ctx.fill();

    // Градиент для редкости
    if (rarityConfig.value !== 'common') {
      const gradient = ctx.createLinearGradient(0, 0, CARD_WIDTH, CARD_HEIGHT);
      gradient.addColorStop(0, `${rarityConfig.color}33`);
      gradient.addColorStop(1, `${rarityConfig.color}11`);
      ctx.fillStyle = gradient;
      roundRect(ctx, 0, 0, CARD_WIDTH, CARD_HEIGHT, CARD_RADIUS);
      ctx.fill();
    }

    // Рамка
    ctx.strokeStyle = rarityConfig.color;
    ctx.lineWidth = rarityConfig.value === 'common' ? 4 : 8;
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
    const suitSymbol = getSuitSymbol(suit);
    ctx.fillStyle = getSuitColor(suit);
    ctx.fillText(suitSymbol, CARD_WIDTH / 2, CARD_HEIGHT / 2 + 80);

    // Редкость внизу
    ctx.font = 'bold 24px Arial';
    ctx.fillStyle = rarityConfig.color;
    ctx.fillText(rarityConfig.label, CARD_WIDTH / 2, CARD_HEIGHT - 40);

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
      
      // Генерируем изображение через Canvas
      const imageDataUrl = generateCardImage(selectedSuit, selectedRank, selectedRarity);
      
      console.log('✅ Изображение сгенерировано, отправляем на сервер...');

      const response = await fetch('/api/nft/generate-canvas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          action: 'single',
          suit: selectedSuit,
          rank: selectedRank,
          rarity: selectedRarity,
          imageDataUrl
        })
      });

      const data = await response.json();

      if (data.success) {
        setGeneratedCard(data.card);
        setShowSuccess(true);
        onBalanceUpdate(data.balance);
        
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
            
            // Генерируем изображение
            const imageDataUrl = generateCardImage(suit, rank, selectedRarity);
            
            // Отправляем на сервер
            const response = await fetch('/api/nft/generate-canvas', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              credentials: 'include',
              body: JSON.stringify({
                action: isFirstCard ? 'full_deck' : 'deck_card', // Первая карта списывает 20000, остальные бесплатно
                suit,
                rank,
                rarity: selectedRarity,
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
    <div className="space-y-6">
      {/* Заголовок */}
      <div className="text-center">
        <h2 className="text-2xl font-bold text-white mb-2">
          🎴 Генератор NFT Карт
        </h2>
        <p className="text-gray-400 text-sm">
          Создавайте уникальные NFT карты через Canvas для дальнейшего минта в блокчейн
        </p>
      </div>

      {/* Выбор параметров */}
      <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl p-6 border border-slate-700">
        <h3 className="text-lg font-bold text-white mb-4">Параметры карты</h3>

        {/* Масть */}
        <div className="mb-6">
          <label className="block text-sm font-bold text-white mb-3 flex items-center gap-2">
            <span className="text-2xl">🎴</span> Выберите масть
          </label>
          <div className="grid grid-cols-2 gap-3">
            {SUITS.map((suit) => (
              <motion.button
                key={suit.value}
                onClick={() => setSelectedSuit(suit.value)}
                disabled={isGenerating}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="relative overflow-hidden rounded-xl transition-all"
                style={{ 
                  background: selectedSuit === suit.value ? suit.gradient : 'rgba(51, 65, 85, 0.8)',
                  border: selectedSuit === suit.value ? `3px solid ${suit.color}` : '2px solid rgba(71, 85, 105, 0.5)',
                  boxShadow: selectedSuit === suit.value ? `0 0 20px ${suit.color}50` : 'none'
                }}
              >
                <div className="p-4 flex flex-col items-center gap-2">
                  <span 
                    className="text-5xl" 
                    style={{ 
                      color: selectedSuit === suit.value ? 'white' : suit.color,
                      filter: selectedSuit === suit.value ? 'drop-shadow(0 0 10px rgba(255,255,255,0.5))' : 'none'
                    }}
                  >
                    {suit.symbol}
                  </span>
                  <span 
                    className="text-sm font-bold"
                    style={{ color: selectedSuit === suit.value ? 'white' : '#cbd5e1' }}
                  >
                    {suit.label}
                  </span>
                </div>
              </motion.button>
            ))}
          </div>
        </div>

        {/* Ранг */}
        <div className="mb-6">
          <label className="block text-sm font-bold text-white mb-3 flex items-center gap-2">
            <span className="text-2xl">🎯</span> Выберите ранг карты
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
                  whileHover={{ scale: 1.1, y: -5 }}
                  whileTap={{ scale: 0.9 }}
                  className="aspect-[2/3] rounded-lg font-bold text-lg transition-all relative overflow-hidden"
                  style={{
                    background: isSelected 
                      ? `linear-gradient(135deg, ${suitColor}20 0%, ${suitColor}40 100%)`
                      : 'rgba(51, 65, 85, 0.6)',
                    border: isSelected ? `2px solid ${suitColor}` : '1px solid rgba(71, 85, 105, 0.8)',
                    color: isSelected ? suitColor : '#cbd5e1',
                    boxShadow: isSelected ? `0 0 15px ${suitColor}50` : 'none'
                  }}
                  title={rank.label}
                >
                  <div className="flex flex-col items-center justify-center h-full">
                    <span className="text-xl">{rank.display}</span>
                  </div>
                  {isSelected && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="absolute top-1 right-1"
                    >
                      <span className="text-xs">✓</span>
                    </motion.div>
                  )}
                </motion.button>
              );
            })}
          </div>
        </div>

        {/* Редкость */}
        <div className="mb-6">
          <label className="block text-sm font-bold text-white mb-3 flex items-center gap-2">
            <span className="text-2xl">💎</span> Выберите редкость
          </label>
          <div className="space-y-2">
            {RARITIES.map((rarity) => {
              const isSelected = selectedRarity === rarity.value;
              return (
                <motion.button
                  key={rarity.value}
                  onClick={() => setSelectedRarity(rarity.value)}
                  disabled={isGenerating}
                  whileHover={{ scale: 1.02, x: 5 }}
                  whileTap={{ scale: 0.98 }}
                  className="w-full p-4 rounded-xl font-bold transition-all flex justify-between items-center relative overflow-hidden"
                  style={{
                    background: isSelected ? rarity.gradient : 'rgba(51, 65, 85, 0.6)',
                    border: isSelected ? `2px solid ${rarity.color}` : '1px solid rgba(71, 85, 105, 0.8)',
                    color: isSelected ? 'white' : '#cbd5e1',
                    boxShadow: isSelected ? `0 0 20px ${rarity.color}60, inset 0 0 20px ${rarity.color}20` : 'none'
                  }}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{rarity.emoji}</span>
                    <span className="text-base">{rarity.label}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span 
                      className="font-extrabold text-lg px-3 py-1 rounded-lg"
                      style={{
                        background: isSelected ? 'rgba(0,0,0,0.3)' : 'rgba(0,0,0,0.2)',
                        color: isSelected ? '#fbbf24' : '#94a3b8'
                      }}
                    >
                      {rarity.cost} 🪙
                    </span>
                  </div>
                  {isSelected && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="absolute inset-0 pointer-events-none"
                      style={{
                        background: `radial-gradient(circle at center, ${rarity.color}15 0%, transparent 70%)`
                      }}
                    />
                  )}
                </motion.button>
              );
            })}
          </div>
        </div>

        {/* Кнопки генерации */}
        <div className="space-y-3 mt-6">
          <motion.button
            onClick={handleGenerate}
            disabled={isGenerating || userCoins < currentCost}
            whileHover={!isGenerating && userCoins >= currentCost ? { scale: 1.03, y: -2 } : {}}
            whileTap={!isGenerating && userCoins >= currentCost ? { scale: 0.98 } : {}}
            className="w-full py-4 px-6 rounded-xl font-bold text-white transition-all relative overflow-hidden"
            style={{
              background: isGenerating || userCoins < currentCost
                ? 'rgba(75, 85, 99, 0.6)'
                : 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)',
              boxShadow: isGenerating || userCoins < currentCost
                ? 'none'
                : '0 4px 20px rgba(251, 191, 36, 0.4), inset 0 1px 0 rgba(255,255,255,0.2)',
              opacity: isGenerating || userCoins < currentCost ? 0.5 : 1,
              cursor: isGenerating || userCoins < currentCost ? 'not-allowed' : 'pointer'
            }}
          >
            <div className="flex items-center justify-center gap-3">
              <span className="text-2xl">{isGenerating ? '⏳' : '🎴'}</span>
              <span className="text-lg">
                {isGenerating ? 'Генерация...' : 'Сгенерировать карту'}
              </span>
              {!isGenerating && (
                <span className="px-3 py-1 rounded-lg bg-black/20 font-extrabold">
                  {currentCost} 🪙
                </span>
              )}
            </div>
          </motion.button>

          <motion.button
            onClick={handleGenerateFullDeck}
            disabled={isGenerating || userCoins < FULL_DECK_COST}
            whileHover={!isGenerating && userCoins >= FULL_DECK_COST ? { scale: 1.03, y: -2 } : {}}
            whileTap={!isGenerating && userCoins >= FULL_DECK_COST ? { scale: 0.98 } : {}}
            className="w-full py-4 px-6 rounded-xl font-bold text-white transition-all relative overflow-hidden"
            style={{
              background: isGenerating || userCoins < FULL_DECK_COST
                ? 'rgba(75, 85, 99, 0.6)'
                : 'linear-gradient(135deg, #a855f7 0%, #8b5cf6 100%)',
              boxShadow: isGenerating || userCoins < FULL_DECK_COST
                ? 'none'
                : '0 4px 20px rgba(168, 85, 247, 0.4), inset 0 1px 0 rgba(255,255,255,0.2)',
              opacity: isGenerating || userCoins < FULL_DECK_COST ? 0.5 : 1,
              cursor: isGenerating || userCoins < FULL_DECK_COST ? 'not-allowed' : 'pointer'
            }}
          >
            <div className="flex items-center justify-center gap-3">
              <span className="text-2xl">{isGenerating ? '⏳' : '🎴'}</span>
              <span className="text-lg">
                {isGenerating ? 'Генерация колоды...' : 'Полная колода (52 карты)'}
              </span>
              {!isGenerating && (
                <span className="px-3 py-1 rounded-lg bg-black/20 font-extrabold">
                  {FULL_DECK_COST} 🪙
                </span>
              )}
            </div>
          </motion.button>
        </div>

        {/* Баланс */}
        <motion.div 
          className="mt-6 p-4 rounded-xl text-center relative overflow-hidden"
          style={{
            background: 'linear-gradient(135deg, rgba(251, 191, 36, 0.1) 0%, rgba(245, 158, 11, 0.1) 100%)',
            border: '2px solid rgba(251, 191, 36, 0.3)',
            boxShadow: '0 0 20px rgba(251, 191, 36, 0.1)'
          }}
        >
          <div className="flex items-center justify-center gap-3">
            <span className="text-3xl">🪙</span>
            <div>
              <p className="text-gray-400 text-xs uppercase tracking-wider">Ваш баланс</p>
              <p className="text-2xl font-extrabold text-yellow-500">{userCoins.toLocaleString()}</p>
            </div>
          </div>
        </motion.div>
      </div>

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
                {generatedCard.rank.toUpperCase()} of {generatedCard.suit} ({generatedCard.rarity})
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
                  border: `2px solid ${RARITIES.find(r => r.value === card.rarity)?.color || '#94a3b8'}`,
                  padding: '4px',
                  background: 'rgba(15, 23, 42, 0.8)'
                }}
              >
                <div className="aspect-[5/7] bg-slate-700 rounded-md flex items-center justify-center">
                  <div className="text-center">
                    <div className="text-2xl mb-1">
                      {card.suit === 'hearts' || card.suit === 'diamonds' ? '♥' : '♠'}
                    </div>
                    <div className="text-xs font-bold text-white">
                      {card.rank.toUpperCase()}
                    </div>
                  </div>
                </div>
                
                {/* Редкость */}
                <div 
                  className="absolute -top-2 -right-2 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold border-2 border-slate-900"
                  style={{
                    backgroundColor: RARITIES.find(r => r.value === card.rarity)?.color || '#94a3b8'
                  }}
                >
                  {card.rarity[0].toUpperCase()}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

