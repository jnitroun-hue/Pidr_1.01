'use client'

/**
 * ✅ БЕЗОПАСНАЯ галерея NFT карт
 * 
 * ПРИНЦИПЫ БЕЗОПАСНОСТИ:
 * 1. NFT загружаются из блокчейна через TON Connect
 * 2. Приватные ключи НИКОГДА не используются
 * 3. Supabase - только для UI кеша публичных метаданных
 * 4. Владение проверяется в блокчейне
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import { FaGem, FaTimes, FaExternalLinkAlt, FaFire, FaShieldAlt } from 'react-icons/fa';
import { useTonAddress } from '@tonconnect/ui-react';
import { nftBlockchainService } from '../lib/nft/nft-blockchain-service';
import styles from './NFTGallery.module.css';

interface NFTCard {
  nft_id: string;
  nft_address: string;
  token_id: string;
  card_id: string;
  card_name: string;
  card_rank: string;
  card_suit: string;
  rarity: string;
  image_url: string;
  minted_at: string;
  acquired_via: string;
}

export default function NFTGallery() {
  const userAddress = useTonAddress();
  const [collection, setCollection] = useState<NFTCard[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCard, setSelectedCard] = useState<NFTCard | null>(null);
  const [filter, setFilter] = useState<string>('all');

  useEffect(() => {
    if (userAddress) {
      loadCollection();
    }
  }, [userAddress]);

  /**
   * ✅ БЕЗОПАСНАЯ загрузка NFT из блокчейна
   * Сначала загружаем из блокчейна, затем синхронизируем с Supabase для UI
   */
  const loadCollection = async () => {
    setIsLoading(true);
    try {
      if (!userAddress) {
        setIsLoading(false);
        return;
      }

      console.log('🔍 Загружаем NFT из блокчейна для:', userAddress);

      // 1. Загружаем NFT напрямую из блокчейна (источник истины)
      const blockchainNFTs = await nftBlockchainService.getUserNFTs(userAddress);
      
      // 2. Синхронизируем с Supabase для быстрого UI
      if (blockchainNFTs.length > 0) {
        await nftBlockchainService.syncNFTsToSupabase(userAddress, blockchainNFTs);
      }

      // Получаем данные пользователя из localStorage
      const sessionStr = localStorage.getItem('pidr_session');
      const session = sessionStr ? JSON.parse(sessionStr) : null;
      const telegramId = session?.telegramId || session?.userId;
      const username = session?.username;

      // 3. Загружаем из Supabase для отображения
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
        if (result.success) {
          setCollection(result.collection || []);
        }
      }

      console.log(`✅ Загружено ${blockchainNFTs.length} NFT из блокчейна`);
    } catch (error) {
      console.error('❌ Ошибка загрузки коллекции:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getRarityColor = (rarity: string) => {
    const colors: Record<string, string> = {
      common: '#94a3b8',
      rare: '#3b82f6',
      epic: '#a855f7',
      legendary: '#f59e0b',
      mythic: '#ec4899'
    };
    return colors[rarity.toLowerCase()] || '#94a3b8';
  };

  const getRarityGradient = (rarity: string) => {
    const gradients: Record<string, string> = {
      common: 'linear-gradient(135deg, #64748b, #475569)',
      rare: 'linear-gradient(135deg, #3b82f6, #2563eb)',
      epic: 'linear-gradient(135deg, #a855f7, #9333ea)',
      legendary: 'linear-gradient(135deg, #f59e0b, #d97706)',
      mythic: 'linear-gradient(135deg, #ec4899, #db2777)'
    };
    return gradients[rarity.toLowerCase()] || gradients.common;
  };

  const filteredCollection = filter === 'all' 
    ? collection 
    : collection.filter(card => card.rarity.toLowerCase() === filter);

  if (!userAddress) {
    return (
      <div className={styles.emptyState}>
        <FaGem className={styles.emptyIcon} />
        <h3>Подключите TON кошелек</h3>
        <p>Чтобы увидеть свою NFT коллекцию, подключите кошелек</p>
      </div>
    );
  }

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
      {/* Фильтры */}
      <div className={styles.filters}>
        <button
          className={`${styles.filterBtn} ${filter === 'all' ? styles.active : ''}`}
          onClick={() => setFilter('all')}
        >
          Все ({collection.length})
        </button>
        {['common', 'rare', 'epic', 'legendary', 'mythic'].map((rarity) => {
          const count = collection.filter(c => c.rarity.toLowerCase() === rarity).length;
          if (count === 0) return null;
          return (
            <button
              key={rarity}
              className={`${styles.filterBtn} ${filter === rarity ? styles.active : ''}`}
              onClick={() => setFilter(rarity)}
              style={{ borderColor: getRarityColor(rarity) }}
            >
              {rarity.charAt(0).toUpperCase() + rarity.slice(1)} ({count})
            </button>
          );
        })}
      </div>

      {/* Сетка карт */}
      <div className={styles.grid}>
        {filteredCollection.map((card, index) => (
          <motion.div
            key={card.nft_id}
            className={styles.cardWrapper}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.05 }}
            onClick={() => setSelectedCard(card)}
          >
            <div 
              className={styles.card}
              style={{ 
                borderColor: getRarityColor(card.rarity),
                boxShadow: `0 4px 20px ${getRarityColor(card.rarity)}40`
              }}
            >
              <div className={styles.cardImage}>
                <Image
                  src={card.image_url}
                  alt={card.card_name}
                  width={200}
                  height={300}
                  className={styles.image}
                />
                <div 
                  className={styles.rarityBadge}
                  style={{ background: getRarityGradient(card.rarity) }}
                >
                  <FaGem /> {card.rarity}
                </div>
              </div>
              <div className={styles.cardInfo}>
                <h3 className={styles.cardName}>{card.card_name}</h3>
                <p className={styles.cardDetails}>
                  {card.card_rank} of {card.card_suit}
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
              style={{ borderColor: getRarityColor(selectedCard.rarity) }}
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
                    alt={selectedCard.card_name}
                    width={300}
                    height={450}
                    className={styles.image}
                  />
                  <div 
                    className={styles.modalRarityBadge}
                    style={{ background: getRarityGradient(selectedCard.rarity) }}
                  >
                    <FaGem /> {selectedCard.rarity.toUpperCase()}
                  </div>
                </div>

                <div className={styles.modalInfo}>
                  <h2 className={styles.modalTitle}>{selectedCard.card_name}</h2>
                  <p className={styles.modalSubtitle}>
                    {selectedCard.card_rank} of {selectedCard.card_suit}
                  </p>

                  <div className={styles.modalStats}>
                    <div className={styles.statItem}>
                      <span className={styles.statLabel}>NFT Address:</span>
                      <span className={styles.statValue}>
                        {selectedCard.nft_address.slice(0, 8)}...{selectedCard.nft_address.slice(-6)}
                      </span>
                    </div>
                    <div className={styles.statItem}>
                      <span className={styles.statLabel}>Minted:</span>
                      <span className={styles.statValue}>
                        {new Date(selectedCard.minted_at).toLocaleDateString()}
                      </span>
                    </div>
                    <div className={styles.statItem}>
                      <span className={styles.statLabel}>Acquired via:</span>
                      <span className={styles.statValue}>
                        {selectedCard.acquired_via}
                      </span>
                    </div>
                  </div>

                  <button
                    className={styles.viewOnChainBtn}
                    onClick={() => window.open(`https://tonscan.org/nft/${selectedCard.nft_address}`, '_blank')}
                  >
                    <FaExternalLinkAlt /> View on TON Scan
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

