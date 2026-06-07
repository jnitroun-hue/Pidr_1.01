"use client";

import { useState } from 'react';
import { motion } from 'framer-motion';
import { CreditCard, Loader2 } from 'lucide-react';
import { getApiHeaders } from '@/lib/api-headers';

interface YooKassaPaymentProps {
  amount: number; // Сумма в рублях
  description: string;
  itemId?: string;
  itemType?: 'coins' | 'premium' | 'item';
  onSuccess?: (paymentId: string) => void;
  onError?: (error: string) => void;
}

export default function YooKassaPayment({
  amount,
  description,
  itemId,
  itemType,
  onSuccess,
  onError
}: YooKassaPaymentProps) {
  const [loading, setLoading] = useState(false);
  const [selectedMethod, setSelectedMethod] = useState<'bank_card' | 'sberbank' | 'yoo_money' | 'sbp' | null>(null);

  const paymentMethods = [
    { id: 'bank_card' as const, name: 'Банковская карта', icon: '💳' },
    { id: 'sberbank' as const, name: 'Сбербанк', icon: '🟢' },
    { id: 'yoo_money' as const, name: 'ЮMoney', icon: '💰' },
    { id: 'sbp' as const, name: 'СБП', icon: '📱' },
  ];

  const handlePayment = async () => {
    if (!selectedMethod) {
      onError?.('Выберите способ оплаты');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/payments/yookassa/create', {
        method: 'POST',
        headers: getApiHeaders(),
        credentials: 'include',
        body: JSON.stringify({
          amount,
          description,
          itemId,
          itemType,
          paymentMethod: selectedMethod
        })
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Ошибка создания платежа');
      }

      // Перенаправляем на страницу оплаты YooKassa
      if (data.payment?.confirmationUrl) {
        window.location.href = data.payment.confirmationUrl;
      } else {
        throw new Error('URL оплаты не получен');
      }

    } catch (error: any) {
      console.error('❌ Payment error:', error);
      onError?.(error.message || 'Ошибка создания платежа');
      setLoading(false);
    }
  };

  return (
    <div style={{
      background: 'linear-gradient(145deg, rgba(30, 41, 59, 0.95) 0%, rgba(15, 23, 42, 0.95) 100%)',
      border: '2px solid rgba(99, 102, 241, 0.3)',
      borderRadius: '16px',
      padding: '24px',
      width: '100%',
      maxWidth: '400px'
    }}>
      <div style={{ marginBottom: '20px' }}>
        <h3 style={{
          color: '#ffffff',
          fontSize: '20px',
          fontWeight: '700',
          marginBottom: '8px'
        }}>
          Оплата через YooKassa
        </h3>
        <p style={{ color: '#94a3b8', fontSize: '14px', marginBottom: '16px' }}>
          {description}
        </p>
        <div style={{
          background: 'rgba(99, 102, 241, 0.1)',
          border: '1px solid rgba(99, 102, 241, 0.3)',
          borderRadius: '12px',
          padding: '16px',
          textAlign: 'center'
        }}>
          <div style={{ color: '#94a3b8', fontSize: '14px', marginBottom: '4px' }}>
            Сумма к оплате
          </div>
          <div style={{
            color: '#ffd700',
            fontSize: '28px',
            fontWeight: '900'
          }}>
            {amount.toFixed(2)} ₽
          </div>
        </div>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <div style={{
          color: '#e2e8f0',
          fontSize: '14px',
          fontWeight: '500',
          marginBottom: '12px'
        }}>
          Выберите способ оплаты:
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {paymentMethods.map((method) => (
            <motion.button
              key={method.id}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setSelectedMethod(method.id)}
              style={{
                background: selectedMethod === method.id
                  ? 'rgba(99, 102, 241, 0.3)'
                  : 'rgba(30, 41, 59, 0.5)',
                border: `2px solid ${selectedMethod === method.id ? 'rgba(99, 102, 241, 0.6)' : 'rgba(99, 102, 241, 0.2)'}`,
                borderRadius: '12px',
                padding: '12px 16px',
                color: '#ffffff',
                fontSize: '14px',
                fontWeight: '600',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                transition: 'all 0.3s ease'
              }}
            >
              <span style={{ fontSize: '24px' }}>{method.icon}</span>
              <span style={{ flex: 1, textAlign: 'left' }}>{method.name}</span>
              {selectedMethod === method.id && (
                <div style={{
                  width: '20px',
                  height: '20px',
                  borderRadius: '50%',
                  background: '#22c55e',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#ffffff',
                  fontSize: '12px',
                  fontWeight: 'bold'
                }}>
                  ✓
                </div>
              )}
            </motion.button>
          ))}
        </div>
      </div>

      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={handlePayment}
        disabled={loading || !selectedMethod}
        style={{
          width: '100%',
          background: selectedMethod && !loading
            ? 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)'
            : 'rgba(99, 102, 241, 0.3)',
          border: 'none',
          borderRadius: '12px',
          padding: '14px',
          color: '#ffffff',
          fontSize: '16px',
          fontWeight: '700',
          cursor: loading || !selectedMethod ? 'not-allowed' : 'pointer',
          opacity: loading || !selectedMethod ? 0.6 : 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px'
        }}
      >
        {loading ? (
          <>
            <Loader2 size={20} style={{ animation: 'spin 1s linear infinite' }} />
            Создание платежа...
          </>
        ) : (
          <>
            <CreditCard size={20} />
            Оплатить
          </>
        )}
      </motion.button>

      <style jsx>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

