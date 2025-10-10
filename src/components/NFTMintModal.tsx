'use client'

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaDice, FaPaintBrush, FaTimes, FaUpload } from 'react-icons/fa';
import { useTonAddress, useTonConnectUI } from '@tonconnect/ui-react';
import { toNano } from 'ton-core';
import styles from './NFTMintModal.module.css';

interface NFTMintModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

export default function NFTMintModal({ onClose, onSuccess }: NFTMintModalProps) {
  const userAddress = useTonAddress();
  const [tonConnectUI] = useTonConnectUI();
  
  const [mintType, setMintType] = useState<'random' | 'custom' | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Для кастомной генерации
  const [selectedRank, setSelectedRank] = useState('A');
  const [selectedSuit, setSelectedSuit] = useState('spades');
  const [customStyle, setCustomStyle] = useState('classic');
  const [customImageUrl, setCustomImageUrl] = useState('');
  
  // Результат рандомной генерации
  const [randomCard, setRandomCard] = useState<any>(null);

  const ranks = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
  const suits = [
    { value: 'spades', label: '♠ Пики', emoji: '♠️' },
    { value: 'hearts', label: '♥ Червы', emoji: '♥️' },
    { value: 'diamonds', label: '♦ Бубны', emoji: '♦️' },
    { value: 'clubs', label: '♣ Трефы', emoji: '♣️' }
  ];
  const styles_list = ['classic', 'modern', 'neon', 'vintage', 'gold'];

  const handleRandomMint = async () => {
    if (!userAddress) {
      alert('Подключите TON кошелек!');
      return;
    }

    setIsProcessing(true);
    try {
      // 1. Резервируем рандомную карту
      const response = await fetch('/api/nft/mint-random', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ wallet_address: userAddress })
      });

      const result = await response.json();
      if (!result.success) {
        alert(result.message);
        setIsProcessing(false);
        return;
      }

      setRandomCard(result.card);
      
      // 2. Отправляем транзакцию через TON Connect
      const masterWallet = result.master_wallet_address;
      const amount = result.mint_price_ton;

      const transaction = {
        validUntil: Math.floor(Date.now() / 1000) + 600,
        messages: [
          {
            address: masterWallet,
            amount: toNano(amount).toString(),
            payload: '' // Можно добавить комментарий
          }
        ]
      };

      const txResult = await tonConnectUI.sendTransaction(transaction);
      
      // 3. Подтверждаем минт
      const confirmResponse = await fetch('/api/nft/mint', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          mint_id: result.mint_id,
          nft_address: `nft_${Date.now()}`, // Временный адрес
          transaction_hash: txResult.boc
        })
      });

      const confirmResult = await confirmResponse.json();
      if (confirmResult.success) {
        alert(`🎉 NFT заминчен! Вам выпала: ${result.card.card_name}`);
        onSuccess();
        onClose();
      }

    } catch (error: any) {
      console.error('Ошибка минта:', error);
      alert('Ошибка минта: ' + (error.message || 'Неизвестная ошибка'));
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCustomMint = async () => {
    if (!userAddress) {
      alert('Подключите TON кошелек!');
      return;
    }

    setIsProcessing(true);
    try {
      // 1. Резервируем кастомную карту
      const response = await fetch('/api/nft/mint-custom', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          wallet_address: userAddress,
          card_rank: selectedRank,
          card_suit: selectedSuit,
          custom_style: customStyle,
          custom_image_url: customImageUrl || null
        })
      });

      const result = await response.json();
      if (!result.success) {
        alert(result.message);
        setIsProcessing(false);
        return;
      }

      // 2. Отправляем транзакцию через TON Connect
      const masterWallet = result.master_wallet_address;
      const amount = result.mint_price_ton;

      const transaction = {
        validUntil: Math.floor(Date.now() / 1000) + 600,
        messages: [
          {
            address: masterWallet,
            amount: toNano(amount).toString(),
            payload: ''
          }
        ]
      };

      const txResult = await tonConnectUI.sendTransaction(transaction);
      
      // 3. Подтверждаем минт
      const confirmResponse = await fetch('/api/nft/mint', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          mint_id: result.mint_id,
          nft_address: `nft_custom_${Date.now()}`,
          transaction_hash: txResult.boc
        })
      });

      const confirmResult = await confirmResponse.json();
      if (confirmResult.success) {
        alert(`🎉 Кастомный NFT заминчен: ${result.card.card_name}!`);
        onSuccess();
        onClose();
      }

    } catch (error: any) {
      console.error('Ошибка кастомного минта:', error);
      alert('Ошибка минта: ' + (error.message || 'Неизвестная ошибка'));
    } finally {
      setIsProcessing(false);
    }
  };

  if (!mintType) {
    return (
      <div className={styles.modal} onClick={onClose}>
        <motion.div
          className={styles.modalContent}
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          onClick={(e) => e.stopPropagation()}
        >
          <button className={styles.closeBtn} onClick={onClose}>
            <FaTimes />
          </button>

          <h2 className={styles.title}>🎴 Генерация NFT карты</h2>
          <p className={styles.subtitle}>Выберите способ генерации</p>

          <div className={styles.optionsGrid}>
            {/* Рандомная генерация */}
            <motion.div
              className={styles.option}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setMintType('random')}
            >
              <FaDice className={styles.optionIcon} />
              <h3>🎲 Рандомная</h3>
              <p className={styles.optionPrice}>0.5 TON</p>
              <ul className={styles.optionFeatures}>
                <li>Случайная карта</li>
                <li>2-10: 95% шанс</li>
                <li>J-K: 4% шанс</li>
                <li>A: 1% шанс</li>
              </ul>
            </motion.div>

            {/* Кастомная генерация */}
            <motion.div
              className={styles.option}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setMintType('custom')}
            >
              <FaPaintBrush className={styles.optionIcon} />
              <h3>🎨 Кастомная</h3>
              <p className={styles.optionPrice}>3 TON</p>
              <ul className={styles.optionFeatures}>
                <li>Выбор масти и ранга</li>
                <li>Кастомный стиль</li>
                <li>Своё изображение</li>
                <li>Уникальный NFT</li>
              </ul>
            </motion.div>
          </div>
        </motion.div>
      </div>
    );
  }

  if (mintType === 'random') {
    return (
      <div className={styles.modal} onClick={onClose}>
        <motion.div
          className={styles.modalContent}
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          onClick={(e) => e.stopPropagation()}
        >
          <button className={styles.closeBtn} onClick={onClose}>
            <FaTimes />
          </button>

          <h2 className={styles.title}>🎲 Рандомная генерация</h2>
          <p className={styles.subtitle}>Комиссия: 0.5 TON</p>

          {randomCard && (
            <div className={styles.cardPreview}>
              <h3>{randomCard.card_name}</h3>
              <p>Редкость: {randomCard.rarity}</p>
            </div>
          )}

          <div className={styles.infoBox}>
            <h4>ℹ️ Вероятности выпадения:</h4>
            <ul>
              <li>2-10: 95% шанс</li>
              <li>J, Q, K: 4% шанс</li>
              <li>A: 1% шанс</li>
            </ul>
          </div>

          <button
            className={styles.mintBtn}
            onClick={handleRandomMint}
            disabled={isProcessing || !userAddress}
          >
            {isProcessing ? '⏳ Обработка...' : '🎲 Сгенерировать NFT'}
          </button>

          <button className={styles.backBtn} onClick={() => setMintType(null)}>
            ← Назад
          </button>
        </motion.div>
      </div>
    );
  }

  if (mintType === 'custom') {
    return (
      <div className={styles.modal} onClick={onClose}>
        <motion.div
          className={styles.modalContent}
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          onClick={(e) => e.stopPropagation()}
        >
          <button className={styles.closeBtn} onClick={onClose}>
            <FaTimes />
          </button>

          <h2 className={styles.title}>🎨 Кастомная генерация</h2>
          <p className={styles.subtitle}>Комиссия: 3 TON</p>

          <div className={styles.customForm}>
            {/* Выбор ранга */}
            <div className={styles.formGroup}>
              <label>Ранг карты:</label>
              <select value={selectedRank} onChange={(e) => setSelectedRank(e.target.value)}>
                {ranks.map(rank => (
                  <option key={rank} value={rank}>{rank}</option>
                ))}
              </select>
            </div>

            {/* Выбор масти */}
            <div className={styles.formGroup}>
              <label>Масть:</label>
              <div className={styles.suitsGrid}>
                {suits.map(suit => (
                  <button
                    key={suit.value}
                    className={`${styles.suitBtn} ${selectedSuit === suit.value ? styles.active : ''}`}
                    onClick={() => setSelectedSuit(suit.value)}
                  >
                    {suit.emoji} {suit.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Выбор стиля */}
            <div className={styles.formGroup}>
              <label>Стиль:</label>
              <select value={customStyle} onChange={(e) => setCustomStyle(e.target.value)}>
                {styles_list.map(style => (
                  <option key={style} value={style}>{style}</option>
                ))}
              </select>
            </div>

            {/* URL кастомного изображения */}
            <div className={styles.formGroup}>
              <label>Кастомное изображение (опционально):</label>
              <input
                type="text"
                placeholder="https://example.com/image.png"
                value={customImageUrl}
                onChange={(e) => setCustomImageUrl(e.target.value)}
              />
              <small>Или загрузите через Supabase Storage</small>
            </div>
          </div>

          <button
            className={styles.mintBtn}
            onClick={handleCustomMint}
            disabled={isProcessing || !userAddress}
          >
            {isProcessing ? '⏳ Обработка...' : '🎨 Создать NFT за 3 TON'}
          </button>

          <button className={styles.backBtn} onClick={() => setMintType(null)}>
            ← Назад
          </button>
        </motion.div>
      </div>
    );
  }

  return null;
}

