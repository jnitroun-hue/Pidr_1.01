'use client'

import { useState, useEffect } from 'react';
import { useTonConnectUI, useTonAddress } from '@tonconnect/ui-react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaWallet, FaCheckCircle, FaTimes, FaExternalLinkAlt } from 'react-icons/fa';
import styles from './TonWalletConnect.module.css';

interface TonWalletConnectProps {
  onConnect?: (address: string) => void;
  onDisconnect?: () => void;
}

export default function TonWalletConnect({ onConnect, onDisconnect }: TonWalletConnectProps) {
  const [tonConnectUI] = useTonConnectUI();
  const userFriendlyAddress = useTonAddress();
  const [isConnecting, setIsConnecting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [savedWallets, setSavedWallets] = useState<any[]>([]);
  const [showSuccess, setShowSuccess] = useState(false);

  // Загружаем сохраненные кошельки
  useEffect(() => {
    loadSavedWallets();
  }, []);

  // Отслеживаем подключение кошелька
  useEffect(() => {
    if (userFriendlyAddress && !isSaving) {
      handleWalletConnected(userFriendlyAddress);
    }
  }, [userFriendlyAddress]);

  const loadSavedWallets = async () => {
    try {
      // ✅ ИСПРАВЛЕНО: Берём telegramId из Telegram WebApp напрямую
      const telegramUser = typeof window !== 'undefined' && (window as any).Telegram?.WebApp?.initDataUnsafe?.user;
      const telegramId = telegramUser?.id?.toString() || '';
      const username = telegramUser?.username || telegramUser?.first_name || '';

      const response = await fetch('/api/nft/connect-wallet', {
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
          setSavedWallets(result.wallets || []);
        }
      }
    } catch (error) {
      console.error('Ошибка загрузки кошельков:', error);
    }
  };

  const handleWalletConnected = async (address: string) => {
    // Проверяем, не сохранен ли уже этот кошелек
    if (savedWallets.some(w => w.wallet_address === address)) {
      console.log('Кошелек уже сохранен');
      onConnect?.(address);
      return;
    }

    setIsSaving(true);
    try {
      // ✅ ИСПРАВЛЕНО: Берём telegramId из Telegram WebApp напрямую
      const telegramUser = typeof window !== 'undefined' && (window as any).Telegram?.WebApp?.initDataUnsafe?.user;
      const telegramId = telegramUser?.id?.toString() || '';
      const username = telegramUser?.username || telegramUser?.first_name || '';

      const response = await fetch('/api/nft/connect-wallet', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-telegram-id': telegramId || '',
          'x-username': username || ''
        },
        credentials: 'include',
        body: JSON.stringify({
          wallet_address: address,
          wallet_type: 'ton'
        })
      });

      const result = await response.json();
      if (result.success) {
        console.log('✅ Кошелек сохранен:', address);
        await loadSavedWallets();
        setShowSuccess(true);
        setTimeout(() => setShowSuccess(false), 3000);
        onConnect?.(address);
      } else {
        console.error('Ошибка сохранения кошелька:', result.message);
      }
    } catch (error) {
      console.error('Ошибка сохранения кошелька:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleConnect = async () => {
    setIsConnecting(true);
    try {
      await tonConnectUI.openModal();
    } catch (error) {
      console.error('Ошибка подключения кошелька:', error);
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    try {
      await tonConnectUI.disconnect();
      onDisconnect?.();
    } catch (error) {
      console.error('Ошибка отключения кошелька:', error);
    }
  };

  const formatAddress = (address: string) => {
    if (!address) return '';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  return (
    <div className={styles.container}>
      <AnimatePresence>
        {showSuccess && (
          <motion.div
            className={styles.successBanner}
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <FaCheckCircle /> Кошелек успешно подключен!
          </motion.div>
        )}
      </AnimatePresence>

      {!userFriendlyAddress ? (
        <motion.button
          className={styles.connectButton}
          onClick={handleConnect}
          disabled={isConnecting}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <FaWallet />
          {isConnecting ? 'Подключение...' : 'Подключить TON кошелек'}
        </motion.button>
      ) : (
        <div className={styles.connectedWallet}>
          <div className={styles.walletInfo}>
            <FaCheckCircle className={styles.checkIcon} />
            <div className={styles.walletDetails}>
              <span className={styles.walletLabel}>TON кошелек подключен</span>
              <span className={styles.walletAddress}>{formatAddress(userFriendlyAddress)}</span>
            </div>
            <button
              className={styles.viewButton}
              onClick={() => window.open(`https://tonscan.org/address/${userFriendlyAddress}`, '_blank')}
              title="Посмотреть в TON Scan"
            >
              <FaExternalLinkAlt />
            </button>
          </div>
          <button
            className={styles.disconnectButton}
            onClick={handleDisconnect}
          >
            <FaTimes /> Отключить
          </button>
        </div>
      )}

      {savedWallets.length > 0 && (
        <div className={styles.savedWallets}>
          <h4>Сохраненные кошельки:</h4>
          {savedWallets.map((wallet) => (
            <div key={wallet.id} className={styles.savedWalletItem}>
              <span className={styles.savedAddress}>{formatAddress(wallet.wallet_address)}</span>
              {wallet.is_primary && <span className={styles.primaryBadge}>Основной</span>}
              <span className={styles.walletType}>{wallet.wallet_type.toUpperCase()}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

