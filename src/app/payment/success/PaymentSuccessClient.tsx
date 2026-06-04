'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

type PaymentState = {
  status: 'loading' | 'succeeded' | 'pending' | 'canceled' | 'error';
  message: string;
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
        if (status === 'succeeded') {
          setState({ status: 'succeeded', message: 'Оплата прошла. Монеты будут начислены webhook-обработчиком.' });
        } else if (status === 'canceled') {
          setState({ status: 'canceled', message: 'Платеж отменен или не завершен.' });
        } else if (response.ok) {
          setState({ status: 'pending', message: 'Платеж еще обрабатывается. Обновите страницу через несколько секунд.' });
        } else {
          setState({ status: 'pending', message: data.message || 'Статус пока недоступен, но платеж может быть в обработке.' });
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

  const accent = state.status === 'succeeded'
    ? '#22c55e'
    : state.status === 'canceled' || state.status === 'error'
      ? '#ef4444'
      : '#fbbf24';

  return (
    <main style={{
      minHeight: '100dvh',
      display: 'grid',
      placeItems: 'center',
      padding: '24px',
      background: 'radial-gradient(circle at top, rgba(251,191,36,0.18), transparent 34%), #070b14',
      color: '#e2e8f0'
    }}>
      <section style={{
        width: 'min(460px, 100%)',
        padding: '34px',
        borderRadius: '24px',
        background: 'linear-gradient(160deg, rgba(30,41,59,0.94), rgba(15,23,42,0.98))',
        border: '1px solid rgba(251,191,36,0.18)',
        boxShadow: '0 24px 80px rgba(0,0,0,0.55)',
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
          ₽
        </div>
        <h1 style={{ margin: '0 0 10px', fontSize: 28 }}>Оплата YooKassa</h1>
        <p style={{ margin: '0 0 24px', color: '#94a3b8', lineHeight: 1.55 }}>{state.message}</p>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
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
        </div>
      </section>
    </main>
  );
}
