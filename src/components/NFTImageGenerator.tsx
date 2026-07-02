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

interface NFTImageGeneratorProps {
  userCoins: number;
  onBalanceUpdate: (newBalance: number) => void;
}

export default function NFTImageGenerator({ userCoins, onBalanceUpdate }: NFTImageGeneratorProps) {
  const [selectedSuit, setSelectedSuit] = useState('hearts');
  const [selectedRank, setSelectedRank] = useState('a');
  const [isGenerating, setIsGenerating] = useState(false);
  const [userCards, setUserCards] = useState<any[]>([]);
  const [previewImage, setPreviewImage] = useState<string>('');

  // ✅ Вычисляем цену: Ранг + Масть
  const rankCost = RANKS.find(r => r.value === selectedRank)?.cost || 1000;
  const suitCost = SUIT_COSTS[selectedSuit] || 500;
  const currentCost = rankCost + suitCost;

  // ✅ Обновляем превью при изменении выбора
  useEffect(() => {
    const imagePath = `/cards/${selectedSuit}/${selectedRank}.png`;
    setPreviewImage(imagePath);
  }, [selectedSuit, selectedRank]);

  useEffect(() => {
    fetchUserCards();
  }, []);

  const fetchUserCards = async () => {
    try {
      const response = await fetch('/api/nft/generate-image', {
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

  const handleGenerateSingle = async () => {
    if (userCoins < currentCost) {
      alert(`❌ Недостаточно монет!\n\nТребуется: ${currentCost.toLocaleString()}\nУ вас: ${userCoins.toLocaleString()}`);
      return;
    }

    try {
      setIsGenerating(true);
      console.log('🎨 Генерация NFT карты с готовым изображением...');

      // ✅ Получаем изображение из public/cards/
      const imagePath = `/cards/${selectedSuit}/${selectedRank}.png`;
      
      // Загружаем изображение как blob
      const imageResponse = await fetch(imagePath);
      if (!imageResponse.ok) {
        throw new Error(`Изображение не найдено: ${imagePath}`);
      }
      const imageBlob = await imageResponse.blob();

      // Конвертируем в base64
      const reader = new FileReader();
      const imageDataUrl = await new Promise<string>((resolve, reject) => {
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(imageBlob);
      });

      console.log('✅ Изображение загружено, отправляем на сервер...');

      const response = await fetch('/api/nft/generate-image', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: 'single',
          suit: selectedSuit,
          rank: selectedRank,
          rankCost,
          suitCost,
          totalCost: currentCost,
          imageData: imageDataUrl
        })
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Ошибка генерации NFT');
      }

      console.log('✅ NFT карта успешно создана!');
      
      // Обновляем баланс
      if (result.newBalance !== undefined) {
        onBalanceUpdate(result.newBalance);
      }

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

      // Перезагружаем список карт
      await fetchUserCards();

      alert(`✅ NFT карта создана!\n\n${RANKS.find(r => r.value === selectedRank)?.display} ${SUITS.find(s => s.value === selectedSuit)?.label}\n\nСпискано: ${currentCost.toLocaleString()} монет\nОстаток: ${result.newBalance?.toLocaleString()} монет`);

    } catch (error: any) {
      console.error('❌ Ошибка генерации NFT:', error);
      alert(`❌ Ошибка генерации NFT:\n${error.message}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGenerateRandom = async () => {
    const randomSuit = SUITS[Math.floor(Math.random() * SUITS.length)].value;
    const randomRank = RANKS[Math.floor(Math.random() * RANKS.length)].value;
    
    setSelectedSuit(randomSuit);
    setSelectedRank(randomRank);
    
    // Небольшая задержка для визуального эффекта
    setTimeout(() => {
      handleGenerateSingle();
    }, 300);
  };

  return (
    <div style={{
      background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.95) 0%, rgba(15, 23, 42, 0.95) 100%)',
      borderRadius: '16px',
      padding: '20px',
      color: '#e2e8f0'
    }}>
      <h3 style={{
        fontSize: '1.2rem',
        fontWeight: '700',
        marginBottom: '20px',
        textAlign: 'center'
      }}>
        🎴 Генератор NFT карт
      </h3>

      {/* ПРЕВЬЮ КАРТЫ */}
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        marginBottom: '20px'
      }}>
        <div style={{
          width: '200px',
          height: '280px',
          background: 'linear-gradient(135deg, #064e3b 0%, #022c22 100%)',
          borderRadius: '16px',
          border: '3px solid #10b981',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
          boxShadow: '0 10px 40px rgba(0, 0, 0, 0.5)'
        }}>
          {previewImage ? (
            <img 
              src={previewImage} 
              alt={`${selectedRank} of ${selectedSuit}`}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover'
              }}
              onError={(e) => {
                // Если изображение не найдено, показываем placeholder
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
          ) : (
            <div style={{ textAlign: 'center', color: '#94a3b8' }}>
              <div style={{ fontSize: '48px', marginBottom: '10px' }}>
                {SUITS.find(s => s.value === selectedSuit)?.label}
              </div>
              <div style={{ fontSize: '32px', fontWeight: 'bold' }}>
                {RANKS.find(r => r.value === selectedRank)?.display}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ВЫБОР МАСТИ */}
      <div style={{ marginBottom: '20px' }}>
        <h4 style={{ fontSize: '0.9rem', marginBottom: '10px', color: '#94a3b8' }}>Масть ({suitCost.toLocaleString()} монет)</h4>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px' }}>
          {SUITS.map((suit) => (
            <motion.button
              key={suit.value}
              onClick={() => setSelectedSuit(suit.value)}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              style={{
                padding: '15px',
                borderRadius: '12px',
                border: selectedSuit === suit.value ? '2px solid #10b981' : '1px solid rgba(255, 255, 255, 0.1)',
                background: selectedSuit === suit.value ? 'rgba(16, 185, 129, 0.2)' : 'rgba(55, 65, 81, 0.6)',
                cursor: 'pointer',
                fontSize: '24px',
                transition: 'all 0.3s ease'
              }}
            >
              {suit.label}
            </motion.button>
          ))}
        </div>
      </div>

      {/* ВЫБОР РАНГА */}
      <div style={{ marginBottom: '20px' }}>
        <h4 style={{ fontSize: '0.9rem', marginBottom: '10px', color: '#94a3b8' }}>Ранг ({rankCost.toLocaleString()} монет)</h4>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '8px' }}>
          {RANKS.map((rank) => (
            <motion.button
              key={rank.value}
              onClick={() => setSelectedRank(rank.value)}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              style={{
                padding: '10px',
                borderRadius: '8px',
                border: selectedRank === rank.value ? '2px solid #10b981' : '1px solid rgba(255, 255, 255, 0.1)',
                background: selectedRank === rank.value ? 'rgba(16, 185, 129, 0.2)' : 'rgba(55, 65, 81, 0.6)',
                cursor: 'pointer',
                fontSize: '16px',
                fontWeight: '600',
                color: '#e2e8f0',
                transition: 'all 0.3s ease'
              }}
            >
              {rank.display}
            </motion.button>
          ))}
        </div>
      </div>

      {/* ЦЕНА */}
      <div style={{
        background: 'rgba(251, 191, 36, 0.1)',
        border: '1px solid rgba(251, 191, 36, 0.3)',
        borderRadius: '12px',
        padding: '16px',
        marginBottom: '20px',
        textAlign: 'center'
      }}>
        <div style={{ fontSize: '0.9rem', color: '#94a3b8', marginBottom: '5px' }}>Итоговая стоимость:</div>
        <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#fbbf24', display: 'flex', justifyContent: 'center' }}>
          <PidrCoinAmount value={currentCost} size={22} showLabel />
        </div>
        <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '5px' }}>
          У вас: {userCoins.toLocaleString()} монет
        </div>
      </div>

      {/* КНОПКИ */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
        <motion.button
          onClick={handleGenerateSingle}
          disabled={isGenerating || userCoins < currentCost}
          whileHover={userCoins >= currentCost && !isGenerating ? { scale: 1.02 } : {}}
          whileTap={userCoins >= currentCost && !isGenerating ? { scale: 0.98 } : {}}
          style={{
            padding: '16px',
            borderRadius: '12px',
            border: 'none',
            background: userCoins >= currentCost && !isGenerating
              ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
              : 'rgba(55, 65, 81, 0.6)',
            color: '#fff',
            fontSize: '1rem',
            fontWeight: '700',
            cursor: userCoins >= currentCost && !isGenerating ? 'pointer' : 'not-allowed',
            opacity: userCoins >= currentCost && !isGenerating ? 1 : 0.6,
            transition: 'all 0.3s ease'
          }}
        >
          {isGenerating ? '⏳ Генерация...' : '✅ Создать карту'}
        </motion.button>

        <motion.button
          onClick={handleGenerateRandom}
          disabled={isGenerating || userCoins < 1000}
          whileHover={userCoins >= 1000 && !isGenerating ? { scale: 1.02 } : {}}
          whileTap={userCoins >= 1000 && !isGenerating ? { scale: 0.98 } : {}}
          style={{
            padding: '16px',
            borderRadius: '12px',
            border: 'none',
            background: userCoins >= 1000 && !isGenerating
              ? 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)'
              : 'rgba(55, 65, 81, 0.6)',
            color: '#fff',
            fontSize: '1rem',
            fontWeight: '700',
            cursor: userCoins >= 1000 && !isGenerating ? 'pointer' : 'not-allowed',
            opacity: userCoins >= 1000 && !isGenerating ? 1 : 0.6,
            transition: 'all 0.3s ease'
          }}
        >
          🎲 Случайная карта
        </motion.button>
      </div>

      {/* ВАШИ КАРТЫ */}
      {userCards.length > 0 && (
        <div style={{ marginTop: '20px' }}>
          <h4 style={{ fontSize: '0.9rem', marginBottom: '10px', color: '#94a3b8' }}>
            Ваши NFT карты ({userCards.length})
          </h4>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))',
            gap: '10px',
            maxHeight: '200px',
            overflowY: 'auto'
          }}>
            {userCards.map((card: any, index: number) => (
              <div
                key={index}
                style={{
                  aspectRatio: '2/3',
                  borderRadius: '8px',
                  overflow: 'hidden',
                  border: '2px solid #10b981',
                  boxShadow: '0 4px 10px rgba(0, 0, 0, 0.3)'
                }}
              >
                <img
                  src={card.image_url}
                  alt={`${card.card_rank} of ${card.card_suit}`}
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover'
                  }}
                />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

