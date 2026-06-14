'use client'

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaDice, FaPaintBrush, FaTimes, FaUpload, FaGift } from 'react-icons/fa';
import { useTonAddress, useTonConnectUI } from '@tonconnect/ui-react';
import { toNano } from 'ton-core';
import styles from './NFTMintModal.module.css';
import type { PremiumStatus } from '@/lib/premium/premium-service';

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
  const [premium, setPremium] = useState<PremiumStatus | null>(null);

  useEffect(() => {
    fetch('/api/premium/status', { credentials: 'include' })
      .then((r) => r.json())
      .then((d) => { if (d.success) setPremium(d.premium); })
      .catch(() => {});
  }, []);

  const ranks = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
  const suits = [
    { value: 'spades', label: '♠ Пики', emoji: '♠️' },
    { value: 'hearts', label: '♥ Червы', emoji: '♥️' },
    { value: 'diamonds', label: '♦ Бубны', emoji: '♦️' },
    { value: 'clubs', label: '♣ Трефы', emoji: '♣️' }
  ];
  const styles_list = ['classic', 'modern', 'neon', 'vintage', 'gold'];

  const handleFreeRandomMint = async () => {
    setIsProcessing(true);
    try {
      const response = await fetch('/api/nft/mint-random', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ useFreePremium: true }),
      });
      const result = await response.json();
      if (!result.success) {
        alert(result.error || result.message || 'Ошибка');
        return;
      }
      const card = result.nft || result.card;
      alert(`🎁 Premium free roll!\n\n${card.rank} ${card.suit} (${card.rarity})`);
      window.dispatchEvent(new CustomEvent('nft-collection-updated'));
      onSuccess();
      onClose();
    } catch (error: unknown) {
      alert('Ошибка: ' + (error instanceof Error ? error.message : 'Неизвестная ошибка'));
    } finally {
      setIsProcessing(false);
    }
  };

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
        alert(result.error || result.message || 'Ошибка');
        setIsProcessing(false);
        return;
      }

      if (result.isPremiumFree) {
        const card = result.nft || result.card;
        alert(`🎉 ${card.rank} ${card.suit} (${card.rarity})!`);
        onSuccess();
        onClose();
        return;
      }

      setRandomCard(result.nft || result.card);
      
      if (!result.master_wallet_address || !result.mint_price) {
        alert(result.message || 'Карта создана!');
        onSuccess();
        onClose();
        return;
      }
      
      // 2. Отправляем транзакцию через TON Connect
      const masterWallet = result.master_wallet_address;
      const amount = result.mint_price;

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

      // 2. ✅ ИСПРАВЛЕНО: Отправляем транзакцию через Telegram Wallet
      const masterWallet = result.master_wallet_address;
      const amount = result.mint_price_ton;
      const amountNano = Math.floor(amount * 1000000000);
      const comment = `NFT_MINT_${Date.now()}`;

      // Формируем ton:// URL для Telegram Wallet
      const tonUrl = `ton://transfer/${masterWallet}?amount=${amountNano}&text=${encodeURIComponent(comment)}`;
      
      console.log('💎 Открываем Telegram Wallet для минта:', tonUrl);
      
      // Открываем Telegram Wallet
      if (typeof window !== 'undefined' && (window as any).Telegram?.WebApp) {
        const tg = (window as any).Telegram.WebApp;
        tg.openTelegramLink(tonUrl);
        
        alert('⏳ Подтвердите оплату в Telegram Wallet\n\nПосле оплаты NFT будет автоматически создана');
        setIsProcessing(false);
        return; // Выходим, ждем подтверждения оплаты через webhook
      }

      // ✅ Fallback: если не в Telegram, используем старый метод (TonConnect)
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
          <p className={styles.subtitle}>
            {premium?.freeRandomAvailable
              ? '🎁 Premium: бесплатная генерация доступна (раз в 7 дней)!'
              : 'Комиссия: 0.5 TON'}
          </p>

          {premium?.freeRandomAvailable && (
            <button
              className={styles.mintBtn}
              style={{ marginBottom: '12px', background: 'linear-gradient(135deg, #0284c7, #6366f1)' }}
              onClick={handleFreeRandomMint}
              disabled={isProcessing}
            >
              <FaGift style={{ marginRight: 8 }} />
              {isProcessing ? '⏳ Генерация…' : '🎁 Бесплатная Premium генерация'}
            </button>
          )}

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

