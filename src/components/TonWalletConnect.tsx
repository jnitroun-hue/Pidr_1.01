'use client'

import { useState, useEffect, useCallback, useRef } from 'react';
import { useTonConnectUI, useTonAddress } from '@tonconnect/ui-react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaWallet, FaCheckCircle, FaTimes, FaExternalLinkAlt } from 'react-icons/fa';
import styles from './TonWalletConnect.module.css';
import ManualWalletInput from './ManualWalletInput';
import { getApiHeaders } from '@/lib/api-headers';
import { GRAM } from '@/lib/crypto/gram-brand';

interface TonWalletConnectProps {
  onConnect?: (address: string) => void;
  onDisconnect?: () => void;
}

function normalizeTonAddr(raw: string) {
  return raw.trim().replace(/^UQ/i, 'EQ');
}

export default function TonWalletConnect({ onConnect, onDisconnect }: TonWalletConnectProps) {
  const [tonConnectUI] = useTonConnectUI();
  const userFriendlyAddress = useTonAddress();
  const [isConnecting, setIsConnecting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [savedWallets, setSavedWallets] = useState<any[]>([]);
  const [showSuccess, setShowSuccess] = useState(false);
  const persistStartedFor = useRef<string>('');
  const onConnectRef = useRef(onConnect);

  useEffect(() => {
    onConnectRef.current = onConnect;
  }, [onConnect]);

  const refreshSavedWallets = useCallback(async (): Promise<any[]> => {
    try {
      const response = await fetch('/api/nft/connect-wallet', {
        method: 'GET',
        credentials: 'include',
        headers: getApiHeaders()
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          const list = result.wallets || [];
          setSavedWallets(list);
          return list;
        }
      }
    } catch (error) {
      console.error('Ошибка загрузки кошельков:', error);
    }
    setSavedWallets([]);
    return [];
  }, []);

  useEffect(() => {
    void refreshSavedWallets();
  }, [refreshSavedWallets]);

  useEffect(() => {
    if (!userFriendlyAddress) {
      persistStartedFor.current = '';
      return;
    }

    const addrRaw = userFriendlyAddress.trim();
    if (!addrRaw) return;

    let cancelled = false;

    void (async () => {
      const wallets = await refreshSavedWallets();
      if (cancelled) return;

      const needle = normalizeTonAddr(addrRaw);
      const exists = wallets.some((w: any) => {
        const a = normalizeTonAddr(String(w.wallet_address || ''));
        return a === needle || String(w.wallet_address || '').trim() === addrRaw;
      });

      if (exists) {
        onConnectRef.current?.(addrRaw);
        return;
      }

      if (persistStartedFor.current === needle) return;
      persistStartedFor.current = needle;

      setIsSaving(true);
      try {
        const response = await fetch('/api/nft/connect-wallet', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...getApiHeaders()
          },
          credentials: 'include',
          body: JSON.stringify({
            wallet_address: addrRaw,
            wallet_type: 'ton'
          })
        });

        const result = await response.json();
        if (result.success) {
          console.log('✅ Кошелек сохранен:', addrRaw);
          await refreshSavedWallets();
          setShowSuccess(true);
          setTimeout(() => setShowSuccess(false), 3000);
          onConnectRef.current?.(addrRaw);
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('wallet-updated'));
          }
        } else {
          console.error('Ошибка сохранения кошелька:', result.message);
          persistStartedFor.current = '';
        }
      } catch (error) {
        console.error('Ошибка сохранения кошелька:', error);
        persistStartedFor.current = '';
      } finally {
        setIsSaving(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [userFriendlyAddress, refreshSavedWallets]);

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
      persistStartedFor.current = '';
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
          type="button"
          className={styles.connectButton}
          onClick={handleConnect}
          disabled={isConnecting}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <FaWallet />
          {isConnecting ? 'Подключение...' : `Подключить ${GRAM.walletLabel}`}
        </motion.button>
      ) : (
        <div className={styles.connectedWallet}>
          <div className={styles.walletInfo}>
            <FaCheckCircle className={styles.checkIcon} />
            <div className={styles.walletDetails}>
              <span className={styles.walletLabel}>{GRAM.walletLabel} подключен</span>
              <span className={styles.walletAddress}>{formatAddress(userFriendlyAddress)}</span>
            </div>
            <button
              type="button"
              className={styles.viewButton}
              onClick={() => window.open(`https://tonscan.org/address/${userFriendlyAddress}`, '_blank')}
              title={`Посмотреть в ${GRAM.networkLabel} explorer`}
            >
              <FaExternalLinkAlt />
            </button>
          </div>
          <button type="button" className={styles.disconnectButton} onClick={handleDisconnect}>
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

      <ManualWalletInput
        walletType="ton"
        onWalletAdded={() => refreshSavedWallets()}
        savedWallets={savedWallets}
      />
    </div>
  );
}
