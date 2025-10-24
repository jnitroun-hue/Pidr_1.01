'use client'

/**
 * 🎴 ГАЛЕРЕЯ NFT КАРТ P.I.D.R.
 * Отображает заминченные карты игрока
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import { FaGem, FaTimes, FaCoins, FaWallet } from 'react-icons/fa';
import styles from './NFTGallery.module.css';

interface NFTCard {
  id: string;
  user_id: string;
  card_rank: string;
  card_suit: string;
  image_url: string;
  cost: number;
  payment_method: string; // 'coins' или 'crypto'
  created_at: string;
}

export default function NFTGallery() {
  const [collection, setCollection] = useState<NFTCard[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCard, setSelectedCard] = useState<NFTCard | null>(null);

  useEffect(() => {
    loadCollection();
  }, []);

  /**
   * 📦 Загружаем коллекцию NFT карт пользователя
   */
  const loadCollection = async () => {
    setIsLoading(true);
    try {
      // Получаем данные пользователя из Telegram WebApp
      const telegramUser = typeof window !== 'undefined' && (window as any).Telegram?.WebApp?.initDataUnsafe?.user;
      const telegramId = telegramUser?.id?.toString() || '';
      const username = telegramUser?.username || telegramUser?.first_name || '';

      console.log('🔍 [NFT Gallery] Загружаем коллекцию для:', telegramId);

      // Загружаем из Supabase
      const response = await fetch('/api/nft/collection', {
        method: 'GET',
        credentials: 'include',
        headers: {
          'x-telegram-id': telegramId || '',
          'x-username': username || ''
        }
      });

      if (response.ok) {
        const result = await response.json();
        console.log('📦 [NFT Gallery] Результат:', result);
        if (result.success) {
          setCollection(result.collection || []);
          console.log(`✅ [NFT Gallery] Загружено ${result.collection?.length || 0} карт`);
        } else {
          console.error('❌ [NFT Gallery] Ошибка:', result.message);
        }
      } else {
        console.error('❌ [NFT Gallery] HTTP ошибка:', response.status);
      }
    } catch (error) {
      console.error('❌ [NFT Gallery] Ошибка загрузки коллекции:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // 🎨 Цвета для мастей
  const getSuitColor = (suit: string) => {
    const colors: Record<string, string> = {
      'hearts': '#ef4444',
      'diamonds': '#f59e0b',
      'clubs': '#22c55e',
      'spades': '#3b82f6'
    };
    return colors[suit.toLowerCase()] || '#94a3b8';
  };

  const getSuitGradient = (suit: string) => {
    const gradients: Record<string, string> = {
      'hearts': 'linear-gradient(135deg, #ef4444, #dc2626)',
      'diamonds': 'linear-gradient(135deg, #f59e0b, #d97706)',
      'clubs': 'linear-gradient(135deg, #22c55e, #16a34a)',
      'spades': 'linear-gradient(135deg, #3b82f6, #2563eb)'
    };
    return gradients[suit.toLowerCase()] || 'linear-gradient(135deg, #64748b, #475569)';
  };

  const getSuitSymbol = (suit: string) => {
    const symbols: Record<string, string> = {
      'hearts': '♥',
      'diamonds': '♦',
      'clubs': '♣',
      'spades': '♠'
    };
    return symbols[suit.toLowerCase()] || '?';
  };

  if (isLoading) {
    return (
      <div className={styles.loading}>
        <div className={styles.spinner}></div>
        <p>Загружаем вашу коллекцию...</p>
      </div>
    );
  }

  if (collection.length === 0) {
    return (
      <div className={styles.emptyState}>
        <FaGem className={styles.emptyIcon} />
        <h3>Коллекция пуста</h3>
        <p>У вас пока нет NFT карт. Заминтите свою первую карту!</p>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {/* Заголовок коллекции */}
      <div className={styles.header}>
        <h2>🎴 Моя NFT Коллекция</h2>
        <p>Всего карт: {collection.length}</p>
      </div>

      {/* Сетка карт */}
      <div className={styles.grid}>
        {collection.map((card, index) => (
          <motion.div
            key={card.id}
            className={styles.cardWrapper}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.05 }}
            onClick={() => setSelectedCard(card)}
          >
            <div 
              className={styles.card}
              style={{ 
                borderColor: getSuitColor(card.card_suit),
                boxShadow: `0 4px 20px ${getSuitColor(card.card_suit)}40`
              }}
            >
              <div className={styles.cardImage}>
                <Image
                  src={card.image_url}
                  alt={`${card.card_rank} ${getSuitSymbol(card.card_suit)}`}
                  width={200}
                  height={300}
                  className={styles.image}
                />
                <div 
                  className={styles.suitBadge}
                  style={{ background: getSuitGradient(card.card_suit) }}
                >
                  {getSuitSymbol(card.card_suit)}
                </div>
              </div>
              <div className={styles.cardInfo}>
                <h3 className={styles.cardName}>
                  {card.card_rank} {getSuitSymbol(card.card_suit)}
                </h3>
                <p className={styles.cardDetails}>
                  {card.payment_method === 'coins' ? '💰 За монеты' : '💎 За крипту'}
                </p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Модальное окно с деталями карты */}
      <AnimatePresence>
        {selectedCard && (
          <motion.div
            className={styles.modal}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelectedCard(null)}
          >
            <motion.div
              className={styles.modalContent}
              initial={{ scale: 0.8, y: 50 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.8, y: 50 }}
              onClick={(e) => e.stopPropagation()}
              style={{ 
                borderColor: getSuitColor(selectedCard.card_suit),
                boxShadow: `0 0 40px ${getSuitColor(selectedCard.card_suit)}60`
              }}
            >
              <button 
                className={styles.closeBtn}
                onClick={() => setSelectedCard(null)}
              >
                <FaTimes />
              </button>

              <div className={styles.modalBody}>
                <div className={styles.modalImage}>
                  <Image
                    src={selectedCard.image_url}
                    alt={`${selectedCard.card_rank} ${getSuitSymbol(selectedCard.card_suit)}`}
                    width={300}
                    height={450}
                    className={styles.image}
                  />
                  <div 
                    className={styles.modalSuitBadge}
                    style={{ background: getSuitGradient(selectedCard.card_suit) }}
                  >
                    {getSuitSymbol(selectedCard.card_suit)}
                  </div>
                </div>

                <div className={styles.modalInfo}>
                  <h2 className={styles.modalTitle}>
                    {selectedCard.card_rank} {getSuitSymbol(selectedCard.card_suit)}
                  </h2>
                  <p className={styles.modalSubtitle} style={{ color: getSuitColor(selectedCard.card_suit) }}>
                    {selectedCard.card_suit.toUpperCase()}
                  </p>

                  <div className={styles.modalStats}>
                    <div className={styles.statItem}>
                      <span className={styles.statLabel}>🎴 Ранг:</span>
                      <span className={styles.statValue}>
                        {selectedCard.card_rank}
                      </span>
                    </div>
                    <div className={styles.statItem}>
                      <span className={styles.statLabel}>🃏 Масть:</span>
                      <span className={styles.statValue}>
                        {selectedCard.card_suit} {getSuitSymbol(selectedCard.card_suit)}
                      </span>
                    </div>
                    <div className={styles.statItem}>
                      <span className={styles.statLabel}>💰 Стоимость:</span>
                      <span className={styles.statValue}>
                        {selectedCard.cost} монет
                      </span>
                    </div>
                    <div className={styles.statItem}>
                      <span className={styles.statLabel}>💎 Заминчена:</span>
                      <span className={styles.statValue}>
                        {selectedCard.payment_method === 'coins' ? '💰 За монеты' : '💎 За крипту (TON)'}
                      </span>
                    </div>
                    <div className={styles.statItem}>
                      <span className={styles.statLabel}>📅 Дата:</span>
                      <span className={styles.statValue}>
                        {new Date(selectedCard.created_at).toLocaleDateString('ru-RU')}
                      </span>
                    </div>
                  </div>

                  {selectedCard.payment_method === 'crypto' && (
                    <div className={styles.cryptoNote}>
                      <FaWallet /> Карта заминчена за криптовалюту TON
                    </div>
                  )}
                  {selectedCard.payment_method === 'coins' && (
                    <div className={styles.coinsNote}>
                      <FaCoins /> Карта заминчена за игровые монеты
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

