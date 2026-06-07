'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Crown, Sparkles } from 'lucide-react';

type PaymentState = {
  status: 'loading' | 'succeeded' | 'pending' | 'canceled' | 'error';
  message: string;
  itemType?: string;
};

export default function PaymentSuccessClient({ orderId, paymentId }: { orderId?: string; paymentId?: string }) {
  const [state, setState] = useState<PaymentState>({
    status: 'loading',
    message: 'Проверяем статус платежа...'
  });

  useEffect(() => {
    let cancelled = false;
    const query = paymentId
      ? `payment_id=${encodeURIComponent(paymentId)}`
      : orderId
        ? `order_id=${encodeURIComponent(orderId)}`
        : '';

    if (!query) {
      setState({ status: 'pending', message: 'Платеж отправлен в обработку. Баланс обновится после webhook от YooKassa.' });
      return;
    }

    const check = async () => {
      try {
        const response = await fetch(`/api/payments/yookassa/status?${query}`, {
          credentials: 'include',
          cache: 'no-store'
        });
        const data = await response.json();
        if (cancelled) return;

        const status = data.payment?.status;
        const itemType = data.payment?.itemType || 'coins';
        const isPremium = itemType === 'premium';

        if (status === 'succeeded') {
          if (isPremium) {
            sessionStorage.setItem('show_premium_success', '1');
          }
          setState({
            status: 'succeeded',
            itemType,
            message: isPremium
              ? 'Premium активирован! Все бонусы уже работают.'
              : 'Оплата прошла. Монеты будут начислены webhook-обработчиком.',
          });
        } else if (status === 'canceled') {
          setState({ status: 'canceled', message: 'Платеж отменен или не завершен.', itemType });
        } else if (response.ok) {
          setState({ status: 'pending', message: 'Платеж еще обрабатывается. Обновите страницу через несколько секунд.', itemType });
        } else {
          setState({ status: 'pending', message: data.message || 'Статус пока недоступен, но платеж может быть в обработке.', itemType });
        }
      } catch {
        if (!cancelled) {
          setState({ status: 'error', message: 'Не удалось проверить статус. Проверьте баланс чуть позже.' });
        }
      }
    };

    void check();
    const interval = window.setInterval(check, 5000);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [orderId, paymentId]);

  const isPremiumSuccess = state.status === 'succeeded' && state.itemType === 'premium';
  const accent = state.status === 'succeeded'
    ? isPremiumSuccess ? '#38bdf8' : '#22c55e'
    : state.status === 'canceled' || state.status === 'error'
      ? '#ef4444'
      : '#fbbf24';

  return (
    <main style={{
      minHeight: '100dvh',
      display: 'grid',
      placeItems: 'center',
      padding: '24px',
      background: isPremiumSuccess
        ? 'radial-gradient(circle at top, rgba(56,189,248,0.22), transparent 34%), #070b14'
        : 'radial-gradient(circle at top, rgba(251,191,36,0.18), transparent 34%), #070b14',
      color: '#e2e8f0'
    }}>
      <section style={{
        width: 'min(460px, 100%)',
        padding: '34px',
        borderRadius: '24px',
        background: isPremiumSuccess
          ? 'linear-gradient(160deg, rgba(14,165,233,0.15), rgba(30,41,59,0.94), rgba(15,23,42,0.98))'
          : 'linear-gradient(160deg, rgba(30,41,59,0.94), rgba(15,23,42,0.98))',
        border: `1px solid ${accent}44`,
        boxShadow: isPremiumSuccess ? '0 0 48px rgba(56,189,248,0.2), 0 24px 80px rgba(0,0,0,0.55)' : '0 24px 80px rgba(0,0,0,0.55)',
        textAlign: 'center'
      }}>
        <div style={{
          width: 58,
          height: 58,
          borderRadius: 18,
          margin: '0 auto 18px',
          display: 'grid',
          placeItems: 'center',
          background: `${accent}22`,
          border: `1px solid ${accent}66`,
          color: accent,
          fontSize: 28,
          fontWeight: 900
        }}>
          {isPremiumSuccess ? <Crown size={28} /> : '₽'}
        </div>
        <h1 style={{ margin: '0 0 10px', fontSize: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
          {isPremiumSuccess && <Sparkles size={22} color="#fde68a" />}
          {isPremiumSuccess ? 'Premium активирован!' : 'Оплата YooKassa'}
        </h1>
        <p style={{ margin: '0 0 24px', color: '#94a3b8', lineHeight: 1.55 }}>{state.message}</p>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
          {isPremiumSuccess ? (
            <>
              <Link href="/profile" style={{
                padding: '12px 18px',
                borderRadius: 12,
                background: 'linear-gradient(135deg, #0ea5e9, #6366f1)',
                color: '#fff',
                fontWeight: 800,
                textDecoration: 'none'
              }}>
                Открыть профиль
              </Link>
              <Link href="/shop" style={{
                padding: '12px 18px',
                borderRadius: 12,
                border: '1px solid rgba(148,163,184,0.35)',
                color: '#cbd5e1',
                textDecoration: 'none'
              }}>
                В магазин
              </Link>
            </>
          ) : (
            <>
              <Link href="/wallet" style={{
                padding: '12px 18px',
                borderRadius: 12,
                background: 'linear-gradient(135deg, #fbbf24, #f59e0b)',
                color: '#0f172a',
                fontWeight: 800,
                textDecoration: 'none'
              }}>
                Открыть кошелек
              </Link>
              <Link href="/" style={{
                padding: '12px 18px',
                borderRadius: 12,
                border: '1px solid rgba(148,163,184,0.35)',
                color: '#cbd5e1',
                textDecoration: 'none'
              }}>
                На главную
              </Link>
            </>
          )}
        </div>
      </section>
    </main>
  );
}
