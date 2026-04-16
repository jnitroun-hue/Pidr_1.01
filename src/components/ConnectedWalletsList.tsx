'use client'

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FaCheckCircle, FaPlus, FaWallet, FaExclamationTriangle } from 'react-icons/fa';

interface Wallet {
  id: number;
  wallet_address: string;
  wallet_type: 'ton' | 'sol' | 'eth';
  is_active: boolean;
  is_primary?: boolean;
}

interface ConnectedWalletsListProps {
  onWalletSelect?: (wallet: Wallet) => void;
  selectedWalletId?: number | null;
  showAddButton?: boolean;
}

export default function ConnectedWalletsList({ 
  onWalletSelect, 
  selectedWalletId = null,
  showAddButton = true 
}: ConnectedWalletsListProps) {
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadWallets();
    
    // ✅ СЛУШАЕМ СОБЫТИЯ ОБНОВЛЕНИЯ КОШЕЛЬКОВ
    const handleWalletUpdate = () => {
      loadWallets();
    };
    
    window.addEventListener('wallet-updated', handleWalletUpdate);
    return () => {
      window.removeEventListener('wallet-updated', handleWalletUpdate);
    };
  }, []);

  const loadWallets = async () => {
    try {
      const response = await fetch('/api/nft/connect-wallet', {
        method: 'GET',
        credentials: 'include'
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          setWallets(result.wallets || []);
        }
      }
    } catch (error) {
      console.error('Ошибка загрузки кошельков:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatAddress = (address: string) => {
    if (!address) return '';
    if (address.length <= 12) return address;
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const getWalletIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case 'ton':
        return '💎';
      case 'sol':
        return '◎';
      case 'eth':
        return 'Ξ';
      default:
        return '💳';
    }
  };

  const getWalletColor = (type: string) => {
    switch (type.toLowerCase()) {
      case 'ton':
        return '#0098ea';
      case 'sol':
        return '#dc26ff';
      case 'eth':
        return '#627eea';
      default:
        return '#94a3b8';
    }
  };

  const getWalletName = (type: string) => {
    switch (type.toLowerCase()) {
      case 'ton':
        return 'TON';
      case 'sol':
        return 'Solana';
      case 'eth':
        return 'Ethereum';
      default:
        return type.toUpperCase();
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '20px', color: '#94a3b8' }}>
        Загрузка кошельков...
      </div>
    );
  }

  if (wallets.length === 0) {
    return (
      <div style={{
        padding: '20px',
        textAlign: 'center',
        color: '#94a3b8',
        fontSize: '14px'
      }}>
        <div style={{ marginBottom: '12px', fontSize: '32px' }}>💳</div>
        <div style={{ marginBottom: '8px', fontWeight: '600' }}>Нет подключенных кошельков</div>
        <div style={{ fontSize: '12px', color: '#64748b' }}>
          Для пополнения и вывода подключите один из ваших кошельков
        </div>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => {
            window.location.href = '/nft-collection';
          }}
          style={{
            marginTop: '14px',
            width: '100%',
            padding: '12px 14px',
            borderRadius: '10px',
            border: '1px solid rgba(59, 130, 246, 0.55)',
            background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.22), rgba(14, 165, 233, 0.16))',
            color: '#dbeafe',
            fontSize: '13px',
            fontWeight: 700,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px'
          }}
        >
          <FaWallet />
          Подключить кошелек
        </motion.button>
      </div>
    );
  }

  return (
    <div style={{ width: '100%' }}>
      {/* ✅ ПРЕДУПРЕЖДЕНИЕ */}
      <div style={{
        padding: '10px 12px',
        borderRadius: '8px',
        background: 'rgba(239, 68, 68, 0.1)',
        border: '2px solid rgba(239, 68, 68, 0.3)',
        marginBottom: '16px',
        fontSize: '12px',
        color: '#fca5a5',
        display: 'flex',
        alignItems: 'flex-start',
        gap: '8px'
      }}>
        <FaExclamationTriangle style={{ marginTop: '2px', flexShrink: 0 }} />
        <div>
          <div style={{ fontWeight: '700', marginBottom: '4px', color: '#ef4444' }}>
            ВНИМАНИЕ!
          </div>
          Убедитесь, что ваши кошельки могут принимать платежи и адреса корректны!
        </div>
      </div>

      {/* ✅ СПИСОК КОШЕЛЬКОВ */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {wallets.map((wallet) => {
          const isSelected = selectedWalletId === wallet.id;
          const walletColor = getWalletColor(wallet.wallet_type);
          
          return (
            <motion.div
              key={wallet.id}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => onWalletSelect?.(wallet)}
              style={{
                padding: '14px 16px',
                borderRadius: '10px',
                background: isSelected 
                  ? `linear-gradient(135deg, ${walletColor}20 0%, ${walletColor}10 100%)`
                  : 'rgba(30, 41, 59, 0.6)',
                border: `2px solid ${isSelected ? walletColor : 'rgba(148, 163, 184, 0.3)'}`,
                cursor: onWalletSelect ? 'pointer' : 'default',
                transition: 'all 0.2s',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '12px'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
                {/* ИКОНКА КОШЕЛЬКА */}
                <div style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '10px',
                  background: `linear-gradient(135deg, ${walletColor} 0%, ${walletColor}dd 100%)`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '20px',
                  fontWeight: 'bold',
                  color: '#ffffff',
                  boxShadow: `0 4px 12px ${walletColor}40`
                }}>
                  {getWalletIcon(wallet.wallet_type)}
                </div>

                {/* ИНФОРМАЦИЯ О КОШЕЛЬКЕ */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    marginBottom: '4px'
                  }}>
                    <span style={{
                      color: '#ffffff',
                      fontSize: '14px',
                      fontWeight: '700'
                    }}>
                      {getWalletName(wallet.wallet_type)}
                    </span>
                    {wallet.is_primary && (
                      <span style={{
                        background: 'rgba(34, 197, 94, 0.2)',
                        color: '#22c55e',
                        padding: '2px 6px',
                        borderRadius: '4px',
                        fontSize: '10px',
                        fontWeight: '600'
                      }}>
                        Основной
                      </span>
                    )}
                  </div>
                  <div style={{
                    color: '#94a3b8',
                    fontSize: '12px',
                    fontFamily: 'monospace',
                    wordBreak: 'break-all'
                  }}>
                    {formatAddress(wallet.wallet_address)}
                  </div>
                </div>
              </div>

              {/* ✅ ГАЛОЧКА/ПЛЮСИК */}
              {onWalletSelect && (
                <div style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  background: isSelected 
                    ? `linear-gradient(135deg, ${walletColor} 0%, ${walletColor}dd 100%)`
                    : 'rgba(148, 163, 184, 0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  transition: 'all 0.2s'
                }}>
                  {isSelected ? (
                    <FaCheckCircle style={{ color: '#ffffff', fontSize: '18px' }} />
                  ) : (
                    <FaPlus style={{ color: '#94a3b8', fontSize: '14px' }} />
                  )}
                </div>
              )}
            </motion.div>
          );
        })}
      </div>

      {/* ✅ КНОПКА ДОБАВЛЕНИЯ */}
      {showAddButton && (
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => {
            // Переходим в NFT коллекцию для добавления кошелька
            window.location.href = '/nft-collection';
          }}
          style={{
            width: '100%',
            marginTop: '16px',
            padding: '12px 16px',
            borderRadius: '10px',
            border: '2px dashed rgba(148, 163, 184, 0.3)',
            background: 'transparent',
            color: '#94a3b8',
            fontSize: '14px',
            fontWeight: '600',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            transition: 'all 0.2s'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = 'rgba(59, 130, 246, 0.5)';
            e.currentTarget.style.color = '#3b82f6';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = 'rgba(148, 163, 184, 0.3)';
            e.currentTarget.style.color = '#94a3b8';
          }}
        >
          <FaWallet /> Добавить кошелек в NFT коллекции
        </motion.button>
      )}
    </div>
  );
}

