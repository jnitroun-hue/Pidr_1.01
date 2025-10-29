'use client'

/**
 * 🎴 NFT ГАЛЕРЕЯ - ПРОСТАЯ И ПОНЯТНАЯ
 * 4 карты в ряд + модалка с информацией
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

interface NFTCard {
  id: string;
  user_id: string;
  rank: string;
  suit: string;
  rarity: string;
  image_url: string;
  metadata?: any;
  created_at: string;
}

export default function NFTGallery() {
  const [collection, setCollection] = useState<NFTCard[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCard, setSelectedCard] = useState<NFTCard | null>(null);

  useEffect(() => {
    loadCollection();
  }, []);

  const loadCollection = async () => {
    setIsLoading(true);
    try {
      const telegramUser = typeof window !== 'undefined' && (window as any).Telegram?.WebApp?.initDataUnsafe?.user;
      const telegramId = telegramUser?.id?.toString() || '';
      const username = telegramUser?.username || telegramUser?.first_name || '';

      const response = await fetch('/api/nft/collection', {
        method: 'GET',
        credentials: 'include',
        headers: {
          'x-telegram-id': telegramId || '',
          'x-username': username || ''
        }
      });

      const result = await response.json();

      if (result.success && result.collection) {
        setCollection(result.collection || []);
      } else {
        setCollection([]);
      }
    } catch (error) {
      console.error('❌ Ошибка загрузки коллекции:', error);
      setCollection([]);
    } finally {
      setIsLoading(false);
    }
  };

  const getSuitColor = (suit: string) => {
    const colors: Record<string, string> = {
      'hearts': '#ef4444',
      'diamonds': '#f59e0b',
      'clubs': '#22c55e',
      'spades': '#3b82f6'
    };
    return colors[suit?.toLowerCase()] || '#94a3b8';
  };

  const getSuitSymbol = (suit: string) => {
    const symbols: Record<string, string> = {
      'hearts': '♥',
      'diamonds': '♦',
      'clubs': '♣',
      'spades': '♠'
    };
    return symbols[suit?.toLowerCase()] || '?';
  };

  const getRarityLabel = (rarity: string) => {
    const labels: Record<string, string> = {
      'pokemon': '⚡ Покемон',
      'halloween': '🎃 Хеллоуин',
      'starwars': '⚔️ Star Wars',
      'simple': '🎴 Простая',
      'common': 'Обычная',
      'uncommon': 'Необычная',
      'rare': 'Редкая',
      'epic': 'Эпическая',
      'legendary': 'Легендарная'
    };
    return labels[rarity?.toLowerCase()] || rarity;
  };

  const handleAddToDeck = async (card: NFTCard) => {
    try {
      const telegramUser = typeof window !== 'undefined' && (window as any).Telegram?.WebApp?.initDataUnsafe?.user;
      const telegramId = telegramUser?.id?.toString() || '';
      const username = telegramUser?.username || telegramUser?.first_name || '';

      const response = await fetch('/api/nft/add-to-deck', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-telegram-id': telegramId,
          'x-username': username
        },
        body: JSON.stringify({
          nft_card_id: card.id,
          suit: card.suit,
          rank: card.rank,
          image_url: card.image_url
        })
      });

      const result = await response.json();

      if (result.success) {
        alert('✅ Карта добавлена в колоду!');
        setSelectedCard(null);
      } else {
        alert(`❌ ${result.error}`);
      }
    } catch (error) {
      console.error('❌ Ошибка добавления в колоду:', error);
      alert('❌ Ошибка добавления в колоду');
    }
  };

  const handleSell = (card: NFTCard) => {
    // Передаём данные карты в sessionStorage для страницы магазина
    sessionStorage.setItem('nft_to_sell', JSON.stringify(card));
    // Перенаправляем на страницу магазина
    window.location.href = '/shop';
  };

  if (isLoading) {
    return (
      <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
        <div style={{ fontSize: '2rem', marginBottom: '10px' }}>🎴</div>
        <p>Загрузка коллекции...</p>
      </div>
    );
  }

  if (collection.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
        <div style={{ fontSize: '3rem', marginBottom: '10px' }}>🎴</div>
        <p style={{ fontSize: '1.2rem', fontWeight: 'bold', marginBottom: '5px' }}>
          Коллекция пуста
        </p>
        <p>Создайте свою первую NFT карту!</p>
      </div>
    );
  }

  return (
    <div style={{ width: '100%' }}>
      {/* Заголовок */}
      <div style={{ marginBottom: '20px', textAlign: 'center' }}>
        <h3 style={{ 
          color: '#ffffff', 
          fontSize: '1.2rem', 
          fontWeight: 'bold', 
          marginBottom: '8px' 
        }}>
          🎴 МОЯ NFT КОЛЛЕКЦИЯ
        </h3>
        <p style={{ color: '#94a3b8', fontSize: '0.9rem' }}>
          Всего карт: <span style={{ color: '#3b82f6', fontWeight: 'bold' }}>{collection.length}</span>
        </p>
      </div>

      {/* СЕТКА: 4 КАРТЫ В РЯД */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: '20px',
        padding: '10px'
      }}>
        {collection.map((card) => {
          const suitColor = getSuitColor(card.suit);
          
          return (
            <motion.div
              key={card.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              whileHover={{ scale: 1.05, y: -5 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setSelectedCard(card)}
              style={{
                background: 'linear-gradient(145deg, #1e293b 0%, #0f172a 100%)',
                border: `2px solid ${suitColor}`,
                borderRadius: '12px',
                padding: '12px',
                cursor: 'pointer',
                boxShadow: `0 4px 15px ${suitColor}40`,
                transition: 'all 0.3s ease',
                position: 'relative',
                overflow: 'hidden'
              }}
            >
              {/* Изображение */}
              <div style={{
                background: '#ffffff',
                borderRadius: '8px',
                padding: '8px',
                marginBottom: '10px',
                aspectRatio: '2/3',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden'
              }}>
                <img
                  src={card.image_url}
                  alt={`${card.rank} ${getSuitSymbol(card.suit)}`}
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'contain'
                  }}
                  loading="lazy"
                />
              </div>

              {/* Информация */}
              <div style={{ textAlign: 'center' }}>
                <div style={{
                  color: '#ffffff',
                  fontSize: '1.1rem',
                  fontWeight: 'bold',
                  marginBottom: '4px'
                }}>
                  {card.rank?.toUpperCase()} {getSuitSymbol(card.suit)}
                </div>
                <div style={{
                  color: suitColor,
                  fontSize: '0.85rem',
                  fontWeight: '600'
                }}>
                  {getRarityLabel(card.rarity)}
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* МОДАЛКА С ИНФОРМАЦИЕЙ */}
      <AnimatePresence>
        {selectedCard && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelectedCard(null)}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0, 0, 0, 0.9)',
              backdropFilter: 'blur(10px)',
              zIndex: 999999,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '20px'
            }}
          >
            <motion.div
              initial={{ scale: 0.8, y: 50 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.8, y: 50 }}
              onClick={(e) => e.stopPropagation()}
              style={{
                background: 'linear-gradient(145deg, #1e293b 0%, #0f172a 100%)',
                border: `3px solid ${getSuitColor(selectedCard.suit)}`,
                borderRadius: '20px',
                padding: '30px',
                maxWidth: '500px',
                width: '100%',
                maxHeight: '90vh',
                overflowY: 'auto',
                position: 'relative'
              }}
            >
              {/* Кнопка закрытия */}
              <button
                onClick={() => setSelectedCard(null)}
                style={{
                  position: 'absolute',
                  top: '15px',
                  right: '15px',
                  background: 'rgba(255, 255, 255, 0.1)',
                  border: 'none',
                  borderRadius: '50%',
                  width: '40px',
                  height: '40px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  color: '#ffffff',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)';
                  e.currentTarget.style.transform = 'scale(1.1)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                  e.currentTarget.style.transform = 'scale(1)';
                }}
              >
                <X size={24} />
              </button>

              {/* Изображение карты */}
              <div style={{
                background: '#ffffff',
                borderRadius: '12px',
                padding: '15px',
                marginBottom: '20px',
                aspectRatio: '2/3',
                maxWidth: '300px',
                margin: '0 auto 20px'
              }}>
                <img
                  src={selectedCard.image_url}
                  alt={`${selectedCard.rank} ${getSuitSymbol(selectedCard.suit)}`}
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'contain'
                  }}
                />
              </div>

              {/* Информация о карте */}
              <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                <h2 style={{
                  color: '#ffffff',
                  fontSize: '2rem',
                  fontWeight: 'bold',
                  marginBottom: '10px'
                }}>
                  {selectedCard.rank?.toUpperCase()} {getSuitSymbol(selectedCard.suit)}
                </h2>
                <p style={{
                  color: getSuitColor(selectedCard.suit),
                  fontSize: '1.2rem',
                  fontWeight: '600'
                }}>
                  {getRarityLabel(selectedCard.rarity)}
                </p>
              </div>

              {/* Дополнительная информация */}
              <div style={{
                background: 'rgba(255, 255, 255, 0.05)',
                borderRadius: '12px',
                padding: '15px',
                marginBottom: '20px'
              }}>
                <div style={{ marginBottom: '10px' }}>
                  <span style={{ color: '#94a3b8', fontSize: '0.9rem' }}>Масть: </span>
                  <span style={{ 
                    color: getSuitColor(selectedCard.suit), 
                    fontSize: '1rem', 
                    fontWeight: 'bold' 
                  }}>
                    {getSuitSymbol(selectedCard.suit)}
                  </span>
                </div>
                <div style={{ marginBottom: '10px' }}>
                  <span style={{ color: '#94a3b8', fontSize: '0.9rem' }}>Ранг: </span>
                  <span style={{ color: '#ffffff', fontSize: '1rem', fontWeight: 'bold' }}>
                    {selectedCard.rank?.toUpperCase()}
                  </span>
                </div>
                {selectedCard.metadata?.pokemonId && (
                  <div>
                    <span style={{ color: '#94a3b8', fontSize: '0.9rem' }}>Покемон ID: </span>
                    <span style={{ color: '#fbbf24', fontSize: '1rem', fontWeight: 'bold' }}>
                      #{selectedCard.metadata.pokemonId}
                    </span>
                  </div>
                )}
              </div>

              {/* Кнопки действий */}
              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  onClick={() => handleAddToDeck(selectedCard)}
                  style={{
                    flex: 1,
                    background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                    border: 'none',
                    borderRadius: '10px',
                    padding: '12px',
                    color: '#ffffff',
                    fontSize: '1rem',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'scale(1.05)';
                    e.currentTarget.style.boxShadow = '0 4px 20px rgba(59, 130, 246, 0.5)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'scale(1)';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                >
                  🎴 Добавить в колоду
                </button>
                <button
                  onClick={() => handleSell(selectedCard)}
                  style={{
                    flex: 1,
                    background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                    border: 'none',
                    borderRadius: '10px',
                    padding: '12px',
                    color: '#ffffff',
                    fontSize: '1rem',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'scale(1.05)';
                    e.currentTarget.style.boxShadow = '0 4px 20px rgba(245, 158, 11, 0.5)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'scale(1)';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                >
                  💰 Продать
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

