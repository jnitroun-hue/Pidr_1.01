'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Crown, Sparkles, Zap, Flame, Gift, Percent } from 'lucide-react';
import YooKassaPayment from './YooKassaPayment';
import { getApiHeaders } from '@/lib/api-headers';
import { PREMIUM_BENEFITS, PREMIUM_PRICE_COINS, PREMIUM_PRICE_RUB } from '@/lib/premium/constants';
import type { PremiumStatus } from '@/lib/premium/premium-service';

interface PremiumPurchaseModalProps {
  open: boolean;
  onClose: () => void;
  userCoins: number;
  premium: PremiumStatus | null;
  onSuccess: (premium: PremiumStatus) => void;
}

export default function PremiumPurchaseModal({
  open,
  onClose,
  userCoins,
  premium,
  onSuccess,
}: PremiumPurchaseModalProps) {
  const [tab, setTab] = useState<'coins' | 'rub'>('rub');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const buyWithCoins = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/premium/purchase', {
        method: 'POST',
        headers: getApiHeaders(),
        credentials: 'include',
        body: JSON.stringify({ method: 'coins' }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Ошибка покупки');
      if (!data.premium?.isPremium || !data.premium?.expiresAt) {
        throw new Error(
          data.error || 'Premium не активировался. Проверьте миграцию БД (0008_premium.sql) или обратитесь в поддержку.'
        );
      }
      onSuccess(data.premium);
      onClose();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Ошибка');
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, zIndex: 9999,
          background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px',
        }}
      >
        <motion.div
          initial={{ scale: 0.92, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.92, y: 20 }}
          onClick={(e) => e.stopPropagation()}
          style={{
            width: '100%', maxWidth: '440px', maxHeight: '90vh', overflowY: 'auto',
            background: 'linear-gradient(160deg, #0c1929 0%, #111827 40%, #1e1b4b 100%)',
            border: '2px solid rgba(56, 189, 248, 0.35)',
            borderRadius: '20px', padding: '24px',
            boxShadow: '0 0 40px rgba(56, 189, 248, 0.15)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                <Crown size={22} color="#38bdf8" />
                <span style={{ color: '#e0f2fe', fontSize: '20px', fontWeight: 800 }}>Premium</span>
              </div>
              <div style={{ color: '#94a3b8', fontSize: '12px' }}>30 дней · все бонусы</div>
            </div>
            <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer' }}>
              <X size={22} />
            </button>
          </div>

          {premium?.isPremium && (
            <div style={{
              marginBottom: '14px', padding: '10px 12px', borderRadius: '10px',
              background: 'rgba(34, 197, 94, 0.12)', border: '1px solid rgba(34, 197, 94, 0.3)',
              color: '#86efac', fontSize: '12px',
            }}>
              Активен до {premium.expiresAt ? new Date(premium.expiresAt).toLocaleString('ru-RU') : '—'}
              {' '}({premium.daysLeft} дн.)
            </div>
          )}

          {premium && !premium.canPurchase && (
            <div style={{
              marginBottom: '14px', padding: '12px', borderRadius: '10px',
              background: 'rgba(251, 191, 36, 0.12)', border: '1px solid rgba(251, 191, 36, 0.35)',
              color: '#fde68a', fontSize: '13px', lineHeight: 1.5,
            }}>
              Premium уже активен. Повторная покупка будет доступна после окончания текущего месяца.
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '18px' }}>
            {[
              { icon: Zap, text: PREMIUM_BENEFITS[0] },
              { icon: Flame, text: PREMIUM_BENEFITS[1] },
              { icon: Gift, text: PREMIUM_BENEFITS[2] },
              { icon: Percent, text: PREMIUM_BENEFITS[3] },
            ].map(({ icon: Icon, text }) => (
              <div key={text} style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#cbd5e1', fontSize: '13px' }}>
                <Icon size={16} color="#38bdf8" />
                {text}
              </div>
            ))}
          </div>

          {premium?.canPurchase !== false ? (
            <>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '14px' }}>
            {(['rub', 'coins'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                style={{
                  flex: 1, padding: '10px', borderRadius: '10px', cursor: 'pointer', fontWeight: 700, fontSize: '13px',
                  background: tab === t ? 'rgba(56, 189, 248, 0.2)' : 'rgba(15, 23, 42, 0.6)',
                  border: `1.5px solid ${tab === t ? '#38bdf8' : 'rgba(100,116,139,0.3)'}`,
                  color: tab === t ? '#7dd3fc' : '#94a3b8',
                }}
              >
                {t === 'rub' ? `${PREMIUM_PRICE_RUB} ₽` : `${PREMIUM_PRICE_COINS.toLocaleString('ru-RU')} 🪙`}
              </button>
            ))}
          </div>

          {error && (
            <div style={{ color: '#f87171', fontSize: '12px', marginBottom: '10px' }}>{error}</div>
          )}

          {tab === 'rub' ? (
            <YooKassaPayment
              amount={PREMIUM_PRICE_RUB}
              description="Premium P.I.D.R. — 30 дней"
              itemType="premium"
              itemId="premium_month"
            />
          ) : (
            <motion.button
              whileTap={{ scale: 0.97 }}
              disabled={loading || userCoins < PREMIUM_PRICE_COINS}
              onClick={buyWithCoins}
              style={{
                width: '100%', padding: '14px', borderRadius: '12px', border: 'none', cursor: 'pointer',
                background: userCoins >= PREMIUM_PRICE_COINS
                  ? 'linear-gradient(135deg, #0284c7 0%, #6366f1 100%)'
                  : 'rgba(100,116,139,0.3)',
                color: '#fff', fontWeight: 800, fontSize: '15px',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
              }}
            >
              <Sparkles size={18} />
              {loading ? 'Обработка…' : `Купить за ${PREMIUM_PRICE_COINS.toLocaleString('ru-RU')} монет`}
            </motion.button>
          )}
            </>
          ) : null}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
