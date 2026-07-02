'use client'

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { PidrCoinAmount } from '@/components/PidrCoinIcon';

const SUITS = [
  { value: 'hearts', label: '♥', color: '#ef4444' },
  { value: 'diamonds', label: '♦', color: '#ef4444' },
  { value: 'clubs', label: '♣', color: '#1f2937' },
  { value: 'spades', label: '♠', color: '#000000' }
];

const RANKS = [
  { value: '2', display: '2', cost: 1000 },
  { value: '3', display: '3', cost: 1000 },
  { value: '4', display: '4', cost: 1000 },
  { value: '5', display: '5', cost: 1000 },
  { value: '6', display: '6', cost: 1000 },
  { value: '7', display: '7', cost: 1000 },
  { value: '8', display: '8', cost: 1000 },
  { value: '9', display: '9', cost: 1000 },
  { value: '10', display: '10', cost: 2500 },
  { value: 'j', display: 'J', cost: 2500 },
  { value: 'q', display: 'Q', cost: 5000 },
  { value: 'k', display: 'K', cost: 5000 },
  { value: 'a', display: 'A', cost: 8000 }
];

// ✅ СИСТЕМА ЦЕНЫ: Ранг + Масть
const SUIT_COSTS: Record<string, number> = {
  'hearts': 500,
  'diamonds': 500,
  'clubs': 500,
  'spades': 1000
};

interface NFTCanvasGeneratorProps {
  userCoins: number;
  onBalanceUpdate: (newBalance: number) => void;
}

export default function NFTCanvasGenerator({ userCoins, onBalanceUpdate }: NFTCanvasGeneratorProps) {
  const [selectedSuit, setSelectedSuit] = useState('hearts');
  const [selectedRank, setSelectedRank] = useState('a');
  const [isGenerating, setIsGenerating] = useState(false);
  const [userCards, setUserCards] = useState<any[]>([]);

  // ✅ Вычисляем цену: Ранг + Масть
  const rankCost = RANKS.find(r => r.value === selectedRank)?.cost || 1000;
  const suitCost = SUIT_COSTS[selectedSuit] || 500;
  const currentCost = rankCost + suitCost;

  useEffect(() => {
    fetchUserCards();
  }, []);

  const fetchUserCards = async () => {
    try {
      const response = await fetch('/api/nft/generate-canvas', {
        method: 'GET',
        credentials: 'include'
      });
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setUserCards(data.cards || []);
        }
      }
    } catch (error) {
      console.error('Ошибка загрузки карт:', error);
    }
  };

  const generateCardImage = (suit: string, rank: string) => {
    const canvas = document.createElement('canvas');
    canvas.width = 300;
    canvas.height = 420;
    const ctx = canvas.getContext('2d');
    
    if (!ctx) return '';

    // ✅ Темно-зеленый фон
    const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    gradient.addColorStop(0, '#064e3b'); // dark green
    gradient.addColorStop(1, '#022c22'); // darker green
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Рамка
    ctx.strokeStyle = '#10b981'; // green
    ctx.lineWidth = 8;
    ctx.strokeRect(10, 10, canvas.width - 20, canvas.height - 20);

    // Ранг
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 100px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(rank.toUpperCase(), canvas.width / 2, canvas.height / 2 - 30);

    // Масть
    const suitSymbol = SUITS.find(s => s.value === suit)?.label || '♠';
    ctx.font = 'bold 80px Arial';
    ctx.fillText(suitSymbol, canvas.width / 2, canvas.height / 2 + 70);

    return canvas.toDataURL('image/png');
  };

  const handleGenerate = async () => {
    if (userCoins < currentCost) {
      alert(`Недостаточно монет! Требуется: ${currentCost}, доступно: ${userCoins}`);
      return;
    }

    setIsGenerating(true);

    try {
      console.log('🎨 Генерация изображения карты...');
      const imageDataUrl = generateCardImage(selectedSuit, selectedRank);
      console.log('✅ Изображение сгенерировано, отправляем на сервер...');

      const response = await fetch('/api/nft/generate-canvas', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json'
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
        alert(`✅ Карта сгенерирована за ${currentCost} монет!`);
        onBalanceUpdate(data.balance);
        
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
        
        await fetchUserCards();
      } else {
        alert(`❌ Ошибка: ${data.error}`);
      }
    } catch (error: any) {
      console.error('❌ Ошибка генерации:', error);
      alert('Ошибка генерации карты');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div style={{
      background: 'linear-gradient(145deg, #064e3b, #022c22)', // ✅ Темно-зеленый!
      borderRadius: '16px',
      padding: '20px',
      border: '2px solid #10b981', // ✅ Зеленая рамка
      boxShadow: '0 8px 24px rgba(16, 185, 129, 0.3)' // ✅ Зеленая тень
    }}>
      <h3 style={{ 
        color: '#10b981', // ✅ Зеленый заголовок
        fontSize: '18px', 
        fontWeight: 'bold', 
        marginBottom: '20px',
        textShadow: '0 0 10px rgba(16, 185, 129, 0.5)'
      }}>
        ✨ Генератор NFT карт
      </h3>

      {/* Масть + Ранг */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '16px', marginBottom: '16px' }}>
        
        {/* Масть */}
        <div>
          <label style={{ 
            display: 'block', 
            fontSize: '11px', 
            color: '#6ee7b7', // ✅ Светло-зеленый
            marginBottom: '8px', 
            fontWeight: 'bold', 
            textTransform: 'uppercase',
            letterSpacing: '1px'
          }}>
            МАСТЬ
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
            {SUITS.map((suit) => (
              <button
                key={suit.value}
                onClick={() => setSelectedSuit(suit.value)}
                disabled={isGenerating}
                style={{
                  padding: '12px',
                  borderRadius: '10px',
                  background: selectedSuit === suit.value 
                    ? 'linear-gradient(135deg, #10b981, #059669)' // ✅ Зеленый градиент
                    : 'rgba(6, 78, 59, 0.6)',
                  border: selectedSuit === suit.value 
                    ? '3px solid #34d399' 
                    : '2px solid rgba(16, 185, 129, 0.3)',
                  cursor: 'pointer',
                  fontSize: '28px',
                  textAlign: 'center',
                  color: selectedSuit === suit.value ? '#fff' : suit.color,
                  transition: 'all 0.3s',
                  transform: selectedSuit === suit.value ? 'scale(1.1)' : 'scale(1)',
                  boxShadow: selectedSuit === suit.value 
                    ? '0 4px 16px rgba(16, 185, 129, 0.5)' 
                    : 'none'
                }}
              >
                {suit.label}
              </button>
            ))}
          </div>
        </div>

        {/* Ранг - 2 ряда */}
        <div>
          <label style={{ 
            display: 'block', 
            fontSize: '11px', 
            color: '#6ee7b7',
            marginBottom: '6px', 
            fontWeight: 'bold', 
            textTransform: 'uppercase',
            letterSpacing: '1px'
          }}>
            РАНГ
          </label>
          {/* ✅ 2 РЯДА: Первый ряд (2-8), Второй ряд (9-A) */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {/* Первый ряд: 2-8 */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '3px' }}>
              {RANKS.slice(0, 7).map((rank) => (
                <button
                  key={rank.value}
                  onClick={() => setSelectedRank(rank.value)}
                  disabled={isGenerating}
                  style={{
                    padding: '6px 3px',
                    borderRadius: '6px',
                    background: selectedRank === rank.value 
                      ? 'linear-gradient(135deg, #10b981, #059669)'
                      : 'rgba(6, 78, 59, 0.6)',
                    border: selectedRank === rank.value 
                      ? '2px solid #34d399' 
                      : '1px solid rgba(16, 185, 129, 0.3)',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: 'bold',
                    color: selectedRank === rank.value ? '#fff' : '#6ee7b7',
                    transition: 'all 0.2s',
                    transform: selectedRank === rank.value ? 'scale(1.1)' : 'scale(1)',
                    boxShadow: selectedRank === rank.value 
                      ? '0 3px 12px rgba(16, 185, 129, 0.5)' 
                      : 'none'
                  }}
                >
                  {rank.display}
                </button>
              ))}
            </div>
            {/* Второй ряд: 9-A */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '3px' }}>
              {RANKS.slice(7).map((rank) => (
                <button
                  key={rank.value}
                  onClick={() => setSelectedRank(rank.value)}
                  disabled={isGenerating}
                  style={{
                    padding: '6px 3px',
                    borderRadius: '6px',
                    background: selectedRank === rank.value 
                      ? 'linear-gradient(135deg, #10b981, #059669)'
                      : 'rgba(6, 78, 59, 0.6)',
                    border: selectedRank === rank.value 
                      ? '2px solid #34d399' 
                      : '1px solid rgba(16, 185, 129, 0.3)',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: 'bold',
                    color: selectedRank === rank.value ? '#fff' : '#6ee7b7',
                    transition: 'all 0.2s',
                    transform: selectedRank === rank.value ? 'scale(1.1)' : 'scale(1)',
                    boxShadow: selectedRank === rank.value 
                      ? '0 3px 12px rgba(16, 185, 129, 0.5)' 
                      : 'none'
                  }}
                >
                  {rank.display}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ✅ ЦЕНООБРАЗОВАНИЕ - КОМПАКТНАЯ ВЕРСИЯ */}
      <div style={{
        marginBottom: '14px',
        background: 'rgba(6, 78, 59, 0.4)',
        borderRadius: '10px',
        padding: '12px',
        border: '1px solid rgba(16, 185, 129, 0.3)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <div style={{ display: 'flex', gap: '12px', fontSize: '12px' }}>
            <div>
              <span style={{ color: '#6ee7b7', fontSize: '10px' }}>РАНГ:</span>
              <span style={{ color: '#10b981', fontWeight: 'bold', marginLeft: '4px' }}>
                <PidrCoinAmount value={rankCost} size={12} />
              </span>
            </div>
            <div>
              <span style={{ color: '#6ee7b7', fontSize: '10px' }}>МАСТЬ:</span>
              <span style={{ color: '#10b981', fontWeight: 'bold', marginLeft: '4px' }}>
                <PidrCoinAmount value={`+${suitCost}`} size={12} />
              </span>
            </div>
          </div>
        </div>
        
        {/* Итого - более компактный */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.2), rgba(5, 150, 105, 0.2))',
          padding: '10px 12px',
          borderRadius: '8px',
          border: '1px solid #10b981',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#6ee7b7' }}>ИТОГО:</span>
          <PidrCoinAmount value={currentCost} size={18} amountClassName="text-lg font-bold text-emerald-400" />
        </div>
      </div>

      {/* Кнопки - КОМПАКТНАЯ ВЕРСИЯ */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '10px', marginBottom: '14px' }}>
        <motion.button
          onClick={handleGenerate}
          disabled={isGenerating || userCoins < currentCost}
          whileHover={!isGenerating && userCoins >= currentCost ? { scale: 1.03 } : {}}
          whileTap={!isGenerating && userCoins >= currentCost ? { scale: 0.97 } : {}}
          style={{
            padding: '12px 16px',
            borderRadius: '10px',
            background: isGenerating || userCoins < currentCost
              ? 'rgba(75, 85, 99, 0.6)'
              : 'linear-gradient(135deg, #10b981, #059669)',
            border: '2px solid rgba(16, 185, 129, 0.5)',
            cursor: isGenerating || userCoins < currentCost ? 'not-allowed' : 'pointer',
            fontSize: '14px',
            fontWeight: 'bold',
            color: '#fff',
            opacity: isGenerating || userCoins < currentCost ? 0.5 : 1,
            transition: 'all 0.2s',
            boxShadow: isGenerating || userCoins < currentCost 
              ? 'none' 
              : '0 4px 16px rgba(16, 185, 129, 0.4)'
          }}
        >
          {isGenerating ? '⏳ Генерация...' : '🎴 СГЕНЕРИРОВАТЬ'}
        </motion.button>

        <div style={{
          padding: '12px',
          borderRadius: '10px',
          background: 'rgba(16, 185, 129, 0.1)',
          border: '2px solid rgba(16, 185, 129, 0.4)',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '9px', color: '#6ee7b7', marginBottom: '2px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.5px' }}>БАЛАНС</div>
          <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#10b981' }}>{userCoins.toLocaleString()}</div>
        </div>
      </div>

      {/* Список карт */}
      {userCards.length > 0 && (
        <div>
          <div style={{ fontSize: '12px', color: '#6ee7b7', marginBottom: '10px', fontWeight: 'bold' }}>
            ✅ Сгенерировано: {userCards.length} карт
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '8px' }}>
            {userCards.slice(0, 6).map((card, index) => (
              <div
                key={index}
                style={{
                  aspectRatio: '2/3',
                  borderRadius: '8px',
                  background: 'linear-gradient(135deg, #064e3b, #022c22)',
                  border: '2px solid #10b981',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '24px',
                  boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)'
                }}
              >
                {SUITS.find(s => s.value === card.suit)?.label}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
