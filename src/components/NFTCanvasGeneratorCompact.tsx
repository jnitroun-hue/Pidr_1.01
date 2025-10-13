'use client'

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

const SUITS = [
  { value: 'hearts', label: '♥', color: '#ef4444' },
  { value: 'diamonds', label: '♦', color: '#ef4444' },
  { value: 'clubs', label: '♣', color: '#1f2937' },
  { value: 'spades', label: '♠', color: '#000000' }
];

const RANKS = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];

const RARITIES = [
  { value: 'common', label: 'Common', cost: 1000, color: '#94a3b8' },
  { value: 'rare', label: 'Rare', cost: 2000, color: '#3b82f6' },
  { value: 'epic', label: 'Epic', cost: 3500, color: '#a855f7' },
  { value: 'legendary', label: 'Legendary', cost: 5000, color: '#f59e0b' },
  { value: 'mythic', label: 'Mythic', cost: 10000, color: '#ef4444' }
];

const FULL_DECK_COST = 20000;

interface NFTCanvasGeneratorProps {
  userCoins: number;
  onBalanceUpdate: (newBalance: number) => void;
}

export default function NFTCanvasGenerator({ userCoins, onBalanceUpdate }: NFTCanvasGeneratorProps) {
  const [selectedSuit, setSelectedSuit] = useState('hearts');
  const [selectedRank, setSelectedRank] = useState('ace');
  const [selectedRarity, setSelectedRarity] = useState('common');
  const [isGenerating, setIsGenerating] = useState(false);
  const [userCards, setUserCards] = useState<any[]>([]);

  const currentCost = RARITIES.find(r => r.value === selectedRarity)?.cost || 1000;

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

  const generateCardImage = (suit: string, rank: string, rarity: string) => {
    const canvas = document.createElement('canvas');
    canvas.width = 300;
    canvas.height = 420;
    const ctx = canvas.getContext('2d');
    
    if (!ctx) return '';

    // Фон
    const rarityColors: any = {
      common: '#94a3b8',
      rare: '#3b82f6',
      epic: '#a855f7',
      legendary: '#f59e0b',
      mythic: '#ef4444'
    };
    
    ctx.fillStyle = rarityColors[rarity] || '#94a3b8';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Текст
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 80px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(rank.toUpperCase(), canvas.width / 2, canvas.height / 2);

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
        alert('Карта успешно сгенерирована!');
        onBalanceUpdate(data.balance);
        await fetchUserCards();
      } else {
        alert(`Ошибка: ${data.error}`);
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
      background: 'linear-gradient(145deg, rgba(30, 41, 59, 0.9), rgba(15, 23, 42, 0.9))',
      borderRadius: '12px',
      padding: '16px',
      border: '1px solid rgba(251, 191, 36, 0.15)',
      boxShadow: '0 4px 16px rgba(0, 0, 0, 0.3)'
    }}>
      <h3 style={{ color: '#fbbf24', fontSize: '16px', fontWeight: 'bold', marginBottom: '16px' }}>
        ⚡ ГЕНЕРАТОР NFT
      </h3>

      {/* Масть + Ранг */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '12px', marginBottom: '12px' }}>
        
        {/* Масть */}
        <div>
          <label style={{ display: 'block', fontSize: '10px', color: '#9ca3af', marginBottom: '8px', fontWeight: 'bold', textTransform: 'uppercase' }}>
            МАСТЬ
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px' }}>
            {SUITS.map((suit) => (
              <button
                key={suit.value}
                onClick={() => setSelectedSuit(suit.value)}
                disabled={isGenerating}
                style={{
                  padding: '8px',
                  borderRadius: '8px',
                  background: selectedSuit === suit.value ? `${suit.color}30` : 'rgba(30, 41, 59, 0.6)',
                  border: selectedSuit === suit.value ? `2px solid ${suit.color}` : '1px solid rgba(71, 85, 105, 0.4)',
                  cursor: 'pointer',
                  fontSize: '24px',
                  textAlign: 'center',
                  color: selectedSuit === suit.value ? suit.color : '#64748b',
                  transition: 'all 0.2s'
                }}
              >
                {suit.label}
              </button>
            ))}
          </div>
        </div>

        {/* Ранг */}
        <div>
          <label style={{ display: 'block', fontSize: '10px', color: '#9ca3af', marginBottom: '8px', fontWeight: 'bold', textTransform: 'uppercase' }}>
            РАНГ
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px' }}>
            {RANKS.map((rank) => (
              <button
                key={rank}
                onClick={() => setSelectedRank(rank.toLowerCase())}
                disabled={isGenerating}
                style={{
                  padding: '6px 4px',
                  borderRadius: '6px',
                  background: selectedRank === rank.toLowerCase() ? 'rgba(251, 191, 36, 0.2)' : 'rgba(30, 41, 59, 0.6)',
                  border: selectedRank === rank.toLowerCase() ? '2px solid #fbbf24' : '1px solid rgba(71, 85, 105, 0.4)',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: 'bold',
                  color: selectedRank === rank.toLowerCase() ? '#fbbf24' : '#64748b',
                  transition: 'all 0.2s'
                }}
              >
                {rank}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Редкость */}
      <div style={{ marginBottom: '12px' }}>
        <label style={{ display: 'block', fontSize: '10px', color: '#9ca3af', marginBottom: '8px', fontWeight: 'bold', textTransform: 'uppercase' }}>
          РЕДКОСТЬ
        </label>
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          {RARITIES.map((rarity) => (
            <button
              key={rarity.value}
              onClick={() => setSelectedRarity(rarity.value)}
              disabled={isGenerating}
              style={{
                padding: '8px 12px',
                borderRadius: '8px',
                background: selectedRarity === rarity.value ? `${rarity.color}30` : 'rgba(30, 41, 59, 0.6)',
                border: selectedRarity === rarity.value ? `2px solid ${rarity.color}` : '1px solid rgba(71, 85, 105, 0.4)',
                cursor: 'pointer',
                fontSize: '11px',
                fontWeight: 'bold',
                color: selectedRarity === rarity.value ? rarity.color : '#64748b',
                transition: 'all 0.2s',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <span>{rarity.label}</span>
              <span style={{ opacity: 0.7 }}>{rarity.cost}🪙</span>
            </button>
          ))}
        </div>
      </div>

      {/* Кнопки */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '8px', marginBottom: '12px' }}>
        <button
          onClick={handleGenerate}
          disabled={isGenerating || userCoins < currentCost}
          style={{
            padding: '12px 16px',
            borderRadius: '10px',
            background: isGenerating || userCoins < currentCost
              ? 'rgba(75, 85, 99, 0.6)'
              : 'linear-gradient(135deg, #fbbf24, #f59e0b)',
            border: '2px solid rgba(251, 191, 36, 0.5)',
            cursor: isGenerating || userCoins < currentCost ? 'not-allowed' : 'pointer',
            fontSize: '14px',
            fontWeight: 'bold',
            color: '#fff',
            opacity: isGenerating || userCoins < currentCost ? 0.6 : 1,
            transition: 'all 0.2s'
          }}
        >
          {isGenerating ? '⏳ Генерация...' : `🎴 СГЕНЕРИРОВАТЬ (${currentCost}🪙)`}
        </button>

        <div style={{
          padding: '12px',
          borderRadius: '10px',
          background: 'rgba(251, 191, 36, 0.1)',
          border: '2px solid rgba(251, 191, 36, 0.3)',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '10px', color: '#fbbf24', marginBottom: '2px' }}>БАЛАНС</div>
          <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#fff' }}>{userCoins.toLocaleString()}</div>
        </div>
      </div>

      {/* Список карт */}
      {userCards.length > 0 && (
        <div>
          <div style={{ fontSize: '12px', color: '#9ca3af', marginBottom: '8px' }}>
            Сгенерировано: {userCards.length} карт
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '6px' }}>
            {userCards.slice(0, 6).map((card, index) => (
              <div
                key={index}
                style={{
                  aspectRatio: '2/3',
                  borderRadius: '6px',
                  background: 'rgba(30, 41, 59, 0.8)',
                  border: `1px solid ${RARITIES.find(r => r.value === card.rarity)?.color || '#64748b'}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '20px'
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

