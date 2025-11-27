'use client'

/**
 * 🎴 NFT ГАЛЕРЕЯ - ПРОСТАЯ И ПОНЯТНАЯ
 * 4 карты в ряд + модалка с информацией
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { TonConnectButton } from '@tonconnect/ui-react';
import SolanaWalletConnect from './SolanaWalletConnect';

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
  const [showReplaceModal, setShowReplaceModal] = useState(false);
  const [duplicateInfo, setDuplicateInfo] = useState<{
    existingCard: any;
    newCard: NFTCard;
  } | null>(null);

  useEffect(() => {
    loadCollection();
    
    // ✅ СЛУШАЕМ СОБЫТИЯ ОБНОВЛЕНИЯ КОЛЛЕКЦИИ
    const handleCollectionUpdate = () => {
      console.log('🔄 [NFTGallery] Обновляем коллекцию...');
      loadCollection();
    };
    
    window.addEventListener('nft-collection-updated', handleCollectionUpdate);
    
    return () => {
      window.removeEventListener('nft-collection-updated', handleCollectionUpdate);
    };
  }, []);

  const loadCollection = async (retryCount = 0) => {
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
          'x-username': username || '',
          'Cache-Control': 'no-cache' // ✅ ДОПОЛНИТЕЛЬНО ОТКЛЮЧАЕМ КЭШИРОВАНИЕ
        },
        cache: 'no-store' // ✅ ОТКЛЮЧАЕМ КЭШИРОВАНИЕ
      });

      const result = await response.json();

      if (result.success && result.collection) {
        setCollection(result.collection || []);
      } else {
        setCollection([]);
        // ✅ RETRY: Повторяем запрос если не получили данные (максимум 2 попытки)
        if (retryCount < 2) {
          console.log(`🔄 [NFTGallery] Retry загрузки коллекции (попытка ${retryCount + 1})...`);
          setTimeout(() => loadCollection(retryCount + 1), 1000 * (retryCount + 1));
        }
      }
    } catch (error) {
      console.error('❌ Ошибка загрузки коллекции:', error);
      setCollection([]);
      // ✅ RETRY: Повторяем запрос при ошибке (максимум 2 попытки)
      if (retryCount < 2) {
        console.log(`🔄 [NFTGallery] Retry после ошибки (попытка ${retryCount + 1})...`);
        setTimeout(() => loadCollection(retryCount + 1), 1000 * (retryCount + 1));
      }
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

  const handleAddToDeck = async (card: NFTCard, forceReplace: boolean = false) => {
    try {
      const telegramUser = typeof window !== 'undefined' && (window as any).Telegram?.WebApp?.initDataUnsafe?.user;
      const telegramId = telegramUser?.id?.toString() || '';
      const username = telegramUser?.username || telegramUser?.first_name || '';

      // Если это принудительная замена
      if (forceReplace && duplicateInfo) {
        const response = await fetch('/api/nft/replace-deck-card', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-telegram-id': telegramId,
            'x-username': username
          },
          body: JSON.stringify({
            existingCardId: duplicateInfo.existingCard.id,
            newCardId: card.id,
            suit: card.suit,
            rank: card.rank,
            image_url: card.image_url
          })
        });

        const result = await response.json();

        if (result.success) {
          // ✅ ОБНОВЛЯЕМ КОЛЛЕКЦИЮ И КОЛОДУ ПОСЛЕ ЗАМЕНЫ
          loadCollection();
          window.dispatchEvent(new CustomEvent('deck-updated')); // ✅ Обновляем колоду в профиле
          
          setShowReplaceModal(false);
          setDuplicateInfo(null);
          setSelectedCard(null);
          
          // Показываем уведомление через Telegram WebApp
          if ((window as any).Telegram?.WebApp?.showAlert) {
            (window as any).Telegram.WebApp.showAlert('✅ Карта заменена в колоде!');
          } else {
            alert('✅ Карта заменена в колоде!');
          }
        } else {
          alert(`❌ ${result.error}`);
        }
        return;
      }

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
        // ✅ ОБНОВЛЯЕМ КОЛЛЕКЦИЮ И КОЛОДУ ПОСЛЕ ДОБАВЛЕНИЯ
        loadCollection();
        window.dispatchEvent(new CustomEvent('nft-deck-updated')); // ✅ Обновляем колоду везде
        window.dispatchEvent(new CustomEvent('deck-updated')); // ✅ Обновляем колоду в профиле (старое событие для совместимости)
        
        setSelectedCard(null);
        
        // Показываем уведомление через Telegram WebApp
        if ((window as any).Telegram?.WebApp?.showAlert) {
          (window as any).Telegram.WebApp.showAlert('✅ Карта добавлена в колоду!');
        } else {
          alert('✅ Карта добавлена в колоду!');
        }
      } else if (result.error === 'DUPLICATE_CARD') {
        // ✅ ПОКАЗЫВАЕМ МОДАЛЬНОЕ ОКНО С ПОДТВЕРЖДЕНИЕМ ЗАМЕНЫ
        setDuplicateInfo({
          existingCard: result.existingCard,
          newCard: card
        });
        setShowReplaceModal(true);
      } else {
        alert(`❌ ${result.error || result.message}`);
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

  const handleDelete = async (card: NFTCard) => {
    if (!confirm(`⚠️ Вы уверены, что хотите УДАЛИТЬ эту карту?\n\n${card.rank.toUpperCase()} ${getSuitSymbol(card.suit)}\nТема: ${getRarityLabel(card.rarity)}\n\nЭто действие НЕОБРАТИМО!`)) {
      return;
    }

    try {
      const telegramUser = typeof window !== 'undefined' && (window as any).Telegram?.WebApp?.initDataUnsafe?.user;
      const telegramId = telegramUser?.id?.toString() || '';

      const response = await fetch('/api/nft/delete', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'x-telegram-id': telegramId
        },
        body: JSON.stringify({
          nftId: card.id
        })
      });

      const result = await response.json();

      if (result.success) {
        alert('✅ Карта успешно удалена!');
        setSelectedCard(null);
        // Перезагружаем коллекцию
        loadCollection();
      } else {
        alert(`❌ ${result.error}`);
      }
    } catch (error) {
      console.error('❌ Ошибка удаления карты:', error);
      alert('❌ Ошибка удаления карты');
    }
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
      <div style={{ marginBottom: '30px', textAlign: 'center' }}>
        <h3 style={{ 
          color: '#ffffff', 
          fontSize: '2rem', 
          fontWeight: 'black', 
          marginBottom: '12px',
          textShadow: '0 0 20px rgba(59, 130, 246, 0.5)'
        }}>
          🎴 МОЯ NFT КОЛЛЕКЦИЯ
        </h3>
        <p style={{ color: '#94a3b8', fontSize: '1.1rem', marginBottom: '20px' }}>
          Всего карт: <span style={{ color: '#3b82f6', fontWeight: 'bold', fontSize: '1.3rem' }}>{collection.length}</span>
        </p>

        {/* ✅ ПОДКЛЮЧЕНИЕ КОШЕЛЬКОВ */}
        <div style={{
          maxWidth: '500px',
          margin: '0 auto',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px'
        }}>
          {/* ✅ ПРЕДУПРЕЖДЕНИЕ О БЕЗОПАСНОСТИ */}
          <div style={{
            padding: '12px 16px',
            borderRadius: '8px',
            background: 'rgba(239, 68, 68, 0.1)',
            border: '2px solid rgba(239, 68, 68, 0.3)',
            marginBottom: '8px'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '10px'
            }}>
              <span style={{ fontSize: '18px', color: '#ef4444' }}>⚠️</span>
              <div style={{ flex: 1 }}>
                <div style={{
                  color: '#ef4444',
                  fontSize: '13px',
                  fontWeight: '700',
                  marginBottom: '4px'
                }}>
                  ВНИМАНИЕ!
                </div>
                <div style={{
                  color: '#fca5a5',
                  fontSize: '12px',
                  lineHeight: '1.5'
                }}>
                  Убедитесь, что ваши кошельки могут принимать NFT и адреса корректно прописаны! Потерянные средства или NFT мы вернуть не сможем!
                </div>
              </div>
            </div>
          </div>
          
          <TonConnectButton />
          <SolanaWalletConnect />
        </div>
      </div>

      {/* СЕТКА КАРТ - КАК В МАГАЗИНЕ */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
        gap: '12px',
        padding: '12px'
      }}>
        {collection.map((card, index) => {
          const suitColor = getSuitColor(card.suit);
          
          return (
            <motion.div
              key={card.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.03 }}
              onClick={() => setSelectedCard(card)}
              style={{
                background: 'rgba(30, 41, 59, 0.8)',
                borderRadius: '8px',
                border: `2px solid ${suitColor}40`,
                padding: '8px',
                textAlign: 'center',
                cursor: 'pointer'
              }}
            >
              {/* ИЗОБРАЖЕНИЕ КАРТЫ - ОПТИМИЗИРОВАНО ДЛЯ МОБИЛЬНЫХ */}
              <div style={{
                width: '100%',
                aspectRatio: '0.7',
                position: 'relative',
                borderRadius: '6px',
                overflow: 'hidden',
                marginBottom: '8px',
                background: '#ffffff',
                border: '1px solid rgba(255,255,255,0.1)',
                pointerEvents: 'none'
              }}>
                {card.image_url ? (
                  <>
                    {/* ✅ PLACEHOLDER ПРИ ЗАГРУЗКЕ */}
                    <div 
                      className="card-placeholder"
                      style={{
                        position: 'absolute',
                        inset: 0,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: suitColor,
                        fontSize: '24px',
                        fontWeight: 'bold',
                        background: '#f8f9fa',
                        zIndex: 1
                      }}
                    >
                      <div>{getSuitSymbol(card.suit)}</div>
                      <div style={{ fontSize: '16px', marginTop: '4px' }}>{card.rank?.toUpperCase()}</div>
                    </div>
                    
                    {/* ✅ ОПТИМИЗИРОВАННОЕ ИЗОБРАЖЕНИЕ */}
                    <img
                      src={card.image_url}
                      alt={`${card.rank} of ${card.suit}`}
                      loading="lazy"
                      decoding="async"
                      style={{ 
                        width: '100%', 
                        height: '100%', 
                        objectFit: 'contain',
                        display: 'block',
                        position: 'relative',
                        zIndex: 2,
                        opacity: 0,
                        transition: 'opacity 0.3s ease-in-out'
                      }}
                      onLoad={(e) => {
                        // ✅ Скрываем placeholder когда изображение загрузилось
                        const img = e.currentTarget;
                        img.style.opacity = '1';
                        const placeholder = img.parentElement?.querySelector('.card-placeholder') as HTMLElement;
                        if (placeholder) {
                          placeholder.style.display = 'none';
                        }
                      }}
                      onError={(e) => {
                        // ✅ При ошибке показываем placeholder
                        const img = e.currentTarget;
                        img.style.display = 'none';
                        const placeholder = img.parentElement?.querySelector('.card-placeholder') as HTMLElement;
                        if (placeholder) {
                          placeholder.style.display = 'flex';
                        }
                      }}
                    />
                  </>
                ) : (
                  <div style={{
                    width: '100%',
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: suitColor,
                    fontSize: '24px',
                    fontWeight: 'bold'
                  }}>
                    <div>{getSuitSymbol(card.suit)}</div>
                    <div style={{ fontSize: '16px', marginTop: '4px' }}>{card.rank?.toUpperCase()}</div>
                  </div>
                )}
              </div>

              {/* Rank and Suit Info */}
              <div style={{
                fontSize: '12px',
                fontWeight: 'bold',
                color: suitColor,
                marginBottom: '6px'
              }}>
                {card.rank?.toUpperCase()} {getSuitSymbol(card.suit)}
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
                padding: '20px',
                maxWidth: '340px',
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
                padding: '10px',
                marginBottom: '15px',
                aspectRatio: '2/3',
                maxWidth: '200px',
                margin: '0 auto 15px'
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
              <div style={{ textAlign: 'center', marginBottom: '30px' }}>
                <h2 style={{
                  color: '#ffffff',
                  fontSize: '2.5rem',
                  fontWeight: 'black',
                  marginBottom: '15px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '15px'
                }}>
                  <span style={{ 
                    color: getSuitColor(selectedCard.suit),
                    fontSize: '3rem',
                    textShadow: `0 0 20px ${getSuitColor(selectedCard.suit)}aa`
                  }}>
                    {getSuitSymbol(selectedCard.suit)}
                  </span>
                  <span>{selectedCard.rank?.toUpperCase()}</span>
                </h2>
                <p style={{
                  color: getSuitColor(selectedCard.suit),
                  fontSize: '1.3rem',
                  fontWeight: '700',
                  textTransform: 'uppercase',
                  letterSpacing: '2px'
                }}>
                  {getRarityLabel(selectedCard.rarity)}
                </p>
                {selectedCard.metadata?.themeId && (
                  <p style={{
                    color: '#94a3b8',
                    fontSize: '1rem',
                    marginTop: '10px'
                  }}>
                    ID персонажа: <span style={{ color: '#fbbf24', fontWeight: 'bold' }}>#{selectedCard.metadata.themeId}</span>
                  </p>
                )}
              </div>

              {/* Кнопки действий */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {/* Первый ряд кнопок */}
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
                
                {/* Второй ряд - кнопка удаления */}
                <button
                  onClick={() => handleDelete(selectedCard)}
                  style={{
                    width: '100%',
                    background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
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
                    e.currentTarget.style.boxShadow = '0 4px 20px rgba(239, 68, 68, 0.5)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'scale(1)';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                >
                  🗑️ Удалить карту
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}

        {/* ✅ МОДАЛЬНОЕ ОКНО ПОДТВЕРЖДЕНИЯ ЗАМЕНЫ КАРТЫ */}
        <AnimatePresence>
          {showReplaceModal && duplicateInfo && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: 'rgba(0, 0, 0, 0.8)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 999999,
                padding: '20px'
              }}
              onClick={() => {
                setShowReplaceModal(false);
                setDuplicateInfo(null);
              }}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
                style={{
                  background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.95) 0%, rgba(30, 41, 59, 0.98) 100%)',
                  border: '2px solid rgba(139, 92, 246, 0.5)',
                  borderRadius: '20px',
                  padding: '30px',
                  maxWidth: '500px',
                  width: '100%',
                  boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)'
                }}
              >
                <h3 style={{
                  color: '#ffffff',
                  fontSize: '1.5rem',
                  fontWeight: 'bold',
                  marginBottom: '20px',
                  textAlign: 'center'
                }}>
                  ⚠️ Замена карты
                </h3>

                <p style={{
                  color: '#94a3b8',
                  fontSize: '1rem',
                  marginBottom: '25px',
                  textAlign: 'center',
                  lineHeight: '1.6'
                }}>
                  У вас уже есть карта <strong style={{ color: '#fbbf24' }}>{duplicateInfo.newCard.rank}{getSuitSymbol(duplicateInfo.newCard.suit)}</strong> в колоде.
                  <br />
                  Заменить на новую?
                </p>

                {/* Сравнение карт */}
                <div style={{
                  display: 'flex',
                  gap: '15px',
                  marginBottom: '25px',
                  justifyContent: 'center'
                }}>
                  {/* Текущая карта в колоде */}
                  <div style={{
                    flex: 1,
                    textAlign: 'center'
                  }}>
                    <p style={{ color: '#64748b', fontSize: '0.85rem', marginBottom: '8px' }}>Текущая</p>
                    {duplicateInfo.existingCard.image_url && (
                      <img
                        src={duplicateInfo.existingCard.image_url}
                        alt="Current card"
                        style={{
                          width: '100%',
                          maxWidth: '120px',
                          borderRadius: '12px',
                          background: '#ffffff',
                          padding: '8px',
                          margin: '0 auto'
                        }}
                      />
                    )}
                  </div>

                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    fontSize: '2rem',
                    color: '#fbbf24'
                  }}>
                    →
                  </div>

                  {/* Новая карта */}
                  <div style={{
                    flex: 1,
                    textAlign: 'center'
                  }}>
                    <p style={{ color: '#64748b', fontSize: '0.85rem', marginBottom: '8px' }}>Новая</p>
                    {duplicateInfo.newCard.image_url && (
                      <img
                        src={duplicateInfo.newCard.image_url}
                        alt="New card"
                        style={{
                          width: '100%',
                          maxWidth: '120px',
                          borderRadius: '12px',
                          background: '#ffffff',
                          padding: '8px',
                          margin: '0 auto'
                        }}
                      />
                    )}
                  </div>
                </div>

                {/* Кнопки */}
                <div style={{
                  display: 'flex',
                  gap: '12px'
                }}>
                  <button
                    onClick={() => {
                      setShowReplaceModal(false);
                      setDuplicateInfo(null);
                    }}
                    style={{
                      flex: 1,
                      background: 'rgba(100, 116, 139, 0.3)',
                      border: '1px solid rgba(100, 116, 139, 0.5)',
                      borderRadius: '12px',
                      padding: '14px',
                      color: '#e2e8f0',
                      fontSize: '1rem',
                      fontWeight: '600',
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'rgba(100, 116, 139, 0.5)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'rgba(100, 116, 139, 0.3)';
                    }}
                  >
                    Отмена
                  </button>
                  <button
                    onClick={() => handleAddToDeck(duplicateInfo.newCard, true)}
                    style={{
                      flex: 1,
                      background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                      border: 'none',
                      borderRadius: '12px',
                      padding: '14px',
                      color: '#ffffff',
                      fontSize: '1rem',
                      fontWeight: '600',
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'scale(1.02)';
                      e.currentTarget.style.boxShadow = '0 4px 20px rgba(59, 130, 246, 0.5)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'scale(1)';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                  >
                    ✅ Заменить
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </AnimatePresence>
    </div>
  );
}

