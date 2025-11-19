'use client'

/**
 * 🔗 SOLANA WALLET CONNECT
 * Подключение Solana кошелька (Phantom, Solflare и т.д.)
 * ✅ Поддержка мобильных устройств через deep linking
 */

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

interface SolanaWalletConnectProps {
  onConnect?: (address: string) => void;
  onDisconnect?: () => void;
}

// ✅ Определяем, является ли устройство мобильным
const isMobile = () => {
  if (typeof window === 'undefined') return false;
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
};

export default function SolanaWalletConnect({ onConnect, onDisconnect }: SolanaWalletConnectProps) {
  const [connected, setConnected] = useState(false);
  const [address, setAddress] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    checkConnection();
  }, []);

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
        
        // Сохраняем состояние ожидания подключения
        sessionStorage.setItem('solana_connect_pending', 'true');
        
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
        width: '100%',
        marginTop: '12px'
      }}
    >
      {connected && address ? (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '12px 16px',
          borderRadius: '12px',
          background: 'linear-gradient(135deg, rgba(220, 38, 255, 0.1) 0%, rgba(138, 43, 226, 0.1) 100%)',
          border: '2px solid rgba(220, 38, 255, 0.3)'
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
            color: '#dc26ff',
            fontSize: '14px',
            fontWeight: '600'
          }}>
            {formatAddress(address)}
          </span>
          <button
            onClick={disconnectWallet}
            style={{
              padding: '6px 12px',
              borderRadius: '8px',
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
            width: '100%',
            padding: '14px 20px',
            borderRadius: '12px',
            border: '2px solid rgba(220, 38, 255, 0.3)',
            background: 'linear-gradient(135deg, rgba(220, 38, 255, 0.2) 0%, rgba(138, 43, 226, 0.1) 100%)',
            color: '#dc26ff',
            fontSize: '15px',
            fontWeight: '700',
            cursor: loading ? 'not-allowed' : 'pointer',
            transition: 'all 0.2s',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            opacity: loading ? 0.6 : 1
          }}
        >
          <span style={{ fontSize: '20px' }}>◎</span>
          {loading ? 'Подключение...' : 'Подключить Solana'}
        </button>
      )}
    </motion.div>
  );
}

