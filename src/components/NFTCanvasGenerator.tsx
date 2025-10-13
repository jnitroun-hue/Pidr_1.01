'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';

const SUITS = [
  { value: 'hearts', label: '♥ Червы', color: '#ef4444' },
  { value: 'diamonds', label: '♦ Бубны', color: '#ef4444' },
  { value: 'clubs', label: '♣ Трефы', color: '#000000' },
  { value: 'spades', label: '♠ Пики', color: '#000000' }
];

const RANKS = [
  { value: '2', label: '2' },
  { value: '3', label: '3' },
  { value: '4', label: '4' },
  { value: '5', label: '5' },
  { value: '6', label: '6' },
  { value: '7', label: '7' },
  { value: '8', label: '8' },
  { value: '9', label: '9' },
  { value: '10', label: '10' },
  { value: 'jack', label: 'J (Валет)' },
  { value: 'queen', label: 'Q (Дама)' },
  { value: 'king', label: 'K (Король)' },
  { value: 'ace', label: 'A (Туз)' }
];

const RARITIES = [
  { value: 'common', label: 'Common', color: '#94a3b8', cost: 1000 },
  { value: 'rare', label: 'Rare', color: '#3b82f6', cost: 2000 },
  { value: 'epic', label: 'Epic', color: '#a855f7', cost: 3500 },
  { value: 'legendary', label: 'Legendary', color: '#f59e0b', cost: 5000 },
  { value: 'mythic', label: 'Mythic', color: '#ef4444', cost: 10000 }
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
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Масть:
          </label>
          <div className="grid grid-cols-2 gap-2">
            {SUITS.map((suit) => (
              <button
                key={suit.value}
                onClick={() => setSelectedSuit(suit.value)}
                disabled={isGenerating}
                className={`p-3 rounded-lg font-medium transition-all ${
                  selectedSuit === suit.value
                    ? 'bg-yellow-500 text-white scale-105'
                    : 'bg-slate-700 text-gray-300 hover:bg-slate-600'
                }`}
                style={{ 
                  borderColor: selectedSuit === suit.value ? suit.color : 'transparent',
                  borderWidth: '2px'
                }}
              >
                {suit.label}
              </button>
            ))}
          </div>
        </div>

        {/* Ранг */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Ранг:
          </label>
          <select
            value={selectedRank}
            onChange={(e) => setSelectedRank(e.target.value)}
            disabled={isGenerating}
            className="w-full p-3 rounded-lg bg-slate-700 text-white border border-slate-600 focus:border-yellow-500 focus:outline-none"
          >
            {RANKS.map((rank) => (
              <option key={rank.value} value={rank.value}>
                {rank.label}
              </option>
            ))}
          </select>
        </div>

        {/* Редкость */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Редкость:
          </label>
          <div className="space-y-2">
            {RARITIES.map((rarity) => (
              <button
                key={rarity.value}
                onClick={() => setSelectedRarity(rarity.value)}
                disabled={isGenerating}
                className={`w-full p-3 rounded-lg font-medium transition-all flex justify-between items-center ${
                  selectedRarity === rarity.value
                    ? 'scale-105'
                    : 'hover:scale-102'
                }`}
                style={{
                  backgroundColor: selectedRarity === rarity.value 
                    ? `${rarity.color}33` 
                    : '#334155',
                  borderColor: selectedRarity === rarity.value 
                    ? rarity.color 
                    : 'transparent',
                  borderWidth: '2px',
                  color: selectedRarity === rarity.value ? rarity.color : '#cbd5e1'
                }}
              >
                <span>{rarity.label}</span>
                <span className="font-bold">{rarity.cost} 🪙</span>
              </button>
            ))}
          </div>
        </div>

        {/* Кнопки генерации */}
        <div className="space-y-3 mt-6">
          <button
            onClick={handleGenerate}
            disabled={isGenerating || userCoins < currentCost}
            className={`w-full py-3 px-6 rounded-lg font-bold text-white transition-all ${
              isGenerating || userCoins < currentCost
                ? 'bg-gray-600 cursor-not-allowed opacity-50'
                : 'bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 hover:scale-105'
            }`}
          >
            {isGenerating ? '⏳ Генерация...' : `🎴 Сгенерировать карту (${currentCost} 🪙)`}
          </button>

          <button
            onClick={handleGenerateFullDeck}
            disabled={isGenerating || userCoins < FULL_DECK_COST}
            className={`w-full py-3 px-6 rounded-lg font-bold text-white transition-all ${
              isGenerating || userCoins < FULL_DECK_COST
                ? 'bg-gray-600 cursor-not-allowed opacity-50'
                : 'bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 hover:scale-105'
            }`}
          >
            {isGenerating ? '⏳ Генерация...' : `🎴 Полная колода (${FULL_DECK_COST} 🪙)`}
          </button>
        </div>

        {/* Баланс */}
        <div className="mt-4 p-3 bg-slate-700/50 rounded-lg text-center">
          <span className="text-gray-300 text-sm">
            Ваш баланс: <span className="font-bold text-yellow-500">{userCoins} 🪙</span>
          </span>
        </div>
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

