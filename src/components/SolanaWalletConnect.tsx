'use client'

/**
 * 🔗 SOLANA WALLET CONNECT
 * Подключение Solana кошелька (Phantom, Solflare и т.д.)
 * ✅ Поддержка мобильных устройств через deep linking
 */

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import ManualWalletInput from './ManualWalletInput';
import { getApiHeaders } from '@/lib/api-headers';

interface SolanaWalletConnectProps {
  onConnect?: (address: string) => void;
  onDisconnect?: () => void;
  /** Компактная «пилюля» как у TON Connect в коллекции */
  compact?: boolean;
}

// ✅ Определяем, является ли устройство мобильным
const isMobile = () => {
  if (typeof window === 'undefined') return false;
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
};

export default function SolanaWalletConnect({ onConnect, onDisconnect, compact = false }: SolanaWalletConnectProps) {
  const [connected, setConnected] = useState(false);
  const [address, setAddress] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [savedWallets, setSavedWallets] = useState<any[]>([]);

  useEffect(() => {
    checkConnection();
    loadSavedWallets();
  }, []);

  const loadSavedWallets = async () => {
    try {
      const response = await fetch('/api/nft/connect-wallet', {
        method: 'GET',
        credentials: 'include',
        headers: getApiHeaders(),
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          const solWallets = (result.wallets || []).filter((w: any) => w.wallet_type === 'sol');
          setSavedWallets(solWallets);
        }
      }
    } catch (error) {
      console.error('Ошибка загрузки кошельков:', error);
    }
  };

  const checkConnection = async () => {
    try {
      const { solana } = window as any;
      if (solana && solana.isPhantom && solana.isConnected) {
        const publicKey = solana.publicKey?.toString();
        if (publicKey) {
          setAddress(publicKey);
          setConnected(true);
          onConnect?.(publicKey);
        }
      }
    } catch (error) {
      console.error('❌ Ошибка проверки подключения Solana:', error);
    }
  };

  const connectWallet = async () => {
    try {
      setLoading(true);
      
      // ✅ ПРОВЕРЯЕМ МОБИЛЬНОЕ УСТРОЙСТВО
      if (isMobile()) {
        console.log('📱 Обнаружено мобильное устройство, используем deep linking для Phantom...');
        
        // ✅ ИСПРАВЛЕНО: Используем phantom:// URL scheme
        const appUrl = encodeURIComponent(window.location.href);
        const redirectLink = encodeURIComponent(window.location.href);
        const deepLink = `phantom://v1/connect?app_url=${appUrl}&redirect_link=${redirectLink}`;
        
        console.log('🔗 Открываем deep link для Phantom:', deepLink);
        
        // ✅ Используем Telegram WebApp API если доступен
        const telegramWebApp = (window as any).Telegram?.WebApp;
        if (telegramWebApp?.openLink) {
          console.log('📱 Открываем через Telegram WebApp API');
          telegramWebApp.openLink(deepLink);
          
          // Показываем сообщение
          setTimeout(() => {
            alert('📱 Откройте Phantom кошелек для подключения.\n\nЕсли Phantom не открылся - установите приложение из App Store или Google Play.');
          }, 500);
        } else {
          // Fallback - пробуем прямой deep link
          window.location.href = deepLink;
          
          // Если Phantom не установлен, через 2 секунды предложим скачать
          setTimeout(() => {
            if (confirm('Phantom кошелек не установлен.\n\nСкачать Phantom?')) {
              window.open('https://phantom.app/download', '_blank');
            }
          }, 2000);
        }
        
        return;
      }
      
      // ✅ ДЕСКТОПНАЯ ВЕРСИЯ
      const { solana } = window as any;

      if (!solana) {
        alert('Phantom кошелек не установлен! Установите расширение Phantom.');
        window.open('https://phantom.app/', '_blank');
        return;
      }

      const response = await solana.connect();
      const publicKey = response.publicKey.toString();

      setAddress(publicKey);
      setConnected(true);
      onConnect?.(publicKey);

      console.log('✅ Solana кошелек подключен:', publicKey);
    } catch (error: any) {
      console.error('❌ Ошибка подключения Solana:', error);
      
      // На мобильных устройствах ошибка может быть нормальной (deep link открылся)
      if (!isMobile()) {
        alert('Ошибка подключения кошелька');
      }
    } finally {
      setLoading(false);
    }
  };

  const disconnectWallet = async () => {
    try {
      const { solana } = window as any;
      if (solana) {
        await solana.disconnect();
      }
      setAddress(null);
      setConnected(false);
      onDisconnect?.();
      console.log('✅ Solana кошелек отключен');
    } catch (error) {
      console.error('❌ Ошибка отключения Solana:', error);
    }
  };

  const formatAddress = (addr: string) => {
    return `${addr.slice(0, 4)}...${addr.slice(-4)}`;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      style={{
        width: compact ? 'auto' : '100%',
        maxWidth: compact ? 200 : undefined,
        marginTop: compact ? 0 : 12,
        alignSelf: compact ? 'center' : undefined,
      }}
    >
      {connected && address ? (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: compact ? 6 : 8,
          padding: compact ? '8px 12px' : '12px 16px',
          borderRadius: 999,
          background: 'linear-gradient(135deg, rgba(0, 136, 204, 0.12) 0%, rgba(153, 69, 255, 0.08) 100%)',
          border: '1px solid rgba(0, 136, 204, 0.35)'
        }}>
          <div style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            background: '#10b981',
            boxShadow: '0 0 8px rgba(16, 185, 129, 0.6)'
          }} />
          <span style={{
            flex: 1,
            color: '#e2e8f0',
            fontSize: compact ? '12px' : '14px',
            fontWeight: '600',
            fontFamily: 'ui-monospace, monospace',
          }}>
            {formatAddress(address)}
          </span>
          <button
            onClick={disconnectWallet}
            style={{
              padding: compact ? '4px 10px' : '6px 12px',
              borderRadius: 999,
              border: 'none',
              background: 'rgba(239, 68, 68, 0.2)',
              color: '#ef4444',
              fontSize: '12px',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            Отключить
          </button>
        </div>
      ) : (
        <button
          onClick={connectWallet}
          disabled={loading}
          style={{
            width: compact ? 'auto' : '100%',
            padding: compact ? '9px 16px' : '14px 20px',
            borderRadius: 999,
            border: '1px solid rgba(0, 136, 204, 0.45)',
            background: 'linear-gradient(135deg, #0088cc 0%, #006699 100%)',
            color: '#fff',
            fontSize: compact ? '13px' : '15px',
            fontWeight: '700',
            cursor: loading ? 'not-allowed' : 'pointer',
            transition: 'all 0.2s',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: compact ? 6 : 8,
            opacity: loading ? 0.6 : 1,
            boxShadow: compact ? '0 2px 12px rgba(0,136,204,0.25)' : undefined,
          }}
        >
          <span style={{ fontSize: compact ? '15px' : '18px' }}>◎</span>
          {loading ? '…' : compact ? 'SOL' : 'Подключить Solana'}
        </button>
      )}
      
      {/* ✅ РУЧНОЙ ВВОД КОШЕЛЬКА */}
      <ManualWalletInput 
        walletType="sol" 
        onWalletAdded={loadSavedWallets}
        savedWallets={savedWallets}
      />
    </motion.div>
  );
}

