'use client'

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FaWallet, FaCheckCircle, FaTimes, FaExclamationTriangle } from 'react-icons/fa';

interface ManualWalletInputProps {
  walletType: 'ton' | 'sol';
  onWalletAdded?: (address: string, type: string) => void;
  savedWallets?: any[];
}

export default function ManualWalletInput({ walletType, onWalletAdded, savedWallets = [] }: ManualWalletInputProps) {
  const [showInput, setShowInput] = useState(false);
  const [walletAddress, setWalletAddress] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Проверка формата адреса
  const validateAddress = (address: string, type: 'ton' | 'sol'): boolean => {
    if (!address || address.trim().length === 0) return false;
    
    if (type === 'ton') {
      // TON адреса обычно начинаются с 0: или EQ и имеют длину ~48 символов
      const tonRegex = /^(0:|EQ)[A-Za-z0-9_-]{40,}$/;
      return tonRegex.test(address.trim());
    } else if (type === 'sol') {
      // Solana адреса - base58, обычно 32-44 символа
      const solRegex = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
      return solRegex.test(address.trim());
    }
    
    return false;
  };

  const handleSave = async () => {
    const address = walletAddress.trim();
    
    if (!address) {
      setError('Введите адрес кошелька');
      return;
    }

    if (!validateAddress(address, walletType)) {
      setError(`Неверный формат ${walletType.toUpperCase()} адреса`);
      return;
    }

    // Проверяем, не добавлен ли уже этот кошелек
    if (savedWallets.some(w => w.wallet_address.toLowerCase() === address.toLowerCase())) {
      setError('Этот кошелек уже добавлен');
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const response = await fetch('/api/nft/connect-wallet', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          wallet_address: address,
          wallet_type: walletType
        })
      });

      const result = await response.json();

      if (result.success) {
        console.log('✅ Кошелек добавлен вручную:', address);
        setWalletAddress('');
        setShowInput(false);
        onWalletAdded?.(address, walletType);
        
        // ✅ ОТПРАВЛЯЕМ СОБЫТИЕ ОБНОВЛЕНИЯ КОШЕЛЬКОВ ДЛЯ СИНХРОНИЗАЦИИ
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('wallet-updated'));
        }
      } else {
        setError(result.message || 'Ошибка сохранения кошелька');
      }
    } catch (error: any) {
      console.error('Ошибка сохранения кошелька:', error);
      setError('Ошибка сохранения кошелька');
    } finally {
      setIsSaving(false);
    }
  };

  const formatAddress = (address: string) => {
    if (!address) return '';
    if (address.length <= 12) return address;
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  return (
    <div style={{ marginTop: '8px' }}>
      {!showInput ? (
        <button
          onClick={() => setShowInput(true)}
          style={{
            width: '100%',
            padding: '10px 16px',
            borderRadius: '8px',
            border: `2px dashed ${walletType === 'ton' ? 'rgba(0, 152, 234, 0.3)' : 'rgba(220, 38, 255, 0.3)'}`,
            background: 'transparent',
            color: walletType === 'ton' ? '#0098ea' : '#dc26ff',
            fontSize: '13px',
            fontWeight: '600',
            cursor: 'pointer',
            transition: 'all 0.2s',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px'
          }}
        >
          <FaWallet style={{ fontSize: '12px' }} />
          Ввести {walletType.toUpperCase()} кошелек вручную
        </button>
      ) : (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          style={{
            padding: '12px',
            borderRadius: '8px',
            background: 'rgba(15, 23, 42, 0.8)',
            border: `2px solid ${walletType === 'ton' ? 'rgba(0, 152, 234, 0.3)' : 'rgba(220, 38, 255, 0.3)'}`
          }}
        >
          <div style={{ marginBottom: '8px' }}>
            <label style={{
              display: 'block',
              color: '#cbd5e1',
              fontSize: '12px',
              marginBottom: '6px',
              fontWeight: '600'
            }}>
              Адрес {walletType.toUpperCase()} кошелька:
            </label>
            <input
              type="text"
              value={walletAddress}
              onChange={(e) => {
                setWalletAddress(e.target.value);
                setError(null);
              }}
              placeholder={walletType === 'ton' ? '0:... или EQ...' : 'Введите Solana адрес'}
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: '6px',
                border: error ? '2px solid #ef4444' : '2px solid rgba(148, 163, 184, 0.3)',
                background: 'rgba(30, 41, 59, 0.8)',
                color: '#ffffff',
                fontSize: '13px',
                fontFamily: 'monospace'
              }}
            />
            {error && (
              <div style={{
                marginTop: '6px',
                color: '#ef4444',
                fontSize: '11px',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}>
                <FaExclamationTriangle /> {error}
              </div>
            )}
          </div>
          
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={handleSave}
              disabled={isSaving || !walletAddress.trim()}
              style={{
                flex: 1,
                padding: '10px 16px',
                borderRadius: '6px',
                border: 'none',
                background: isSaving || !walletAddress.trim() 
                  ? 'rgba(148, 163, 184, 0.3)' 
                  : walletType === 'ton' 
                    ? 'linear-gradient(135deg, #0098ea 0%, #0077b6 100%)'
                    : 'linear-gradient(135deg, #dc26ff 0%, #a855f7 100%)',
                color: '#ffffff',
                fontSize: '13px',
                fontWeight: '700',
                cursor: isSaving || !walletAddress.trim() ? 'not-allowed' : 'pointer',
                opacity: isSaving || !walletAddress.trim() ? 0.6 : 1,
                transition: 'all 0.2s',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px'
              }}
            >
              {isSaving ? 'Сохранение...' : (
                <>
                  <FaCheckCircle /> Готово
                </>
              )}
            </button>
            <button
              onClick={() => {
                setShowInput(false);
                setWalletAddress('');
                setError(null);
              }}
              style={{
                padding: '10px 16px',
                borderRadius: '6px',
                border: '2px solid rgba(148, 163, 184, 0.3)',
                background: 'transparent',
                color: '#94a3b8',
                fontSize: '13px',
                fontWeight: '600',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <FaTimes />
            </button>
          </div>
        </motion.div>
      )}
    </div>
  );
}

