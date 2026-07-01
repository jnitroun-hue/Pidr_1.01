'use client';

import { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Wallet, CreditCard, Zap } from 'lucide-react';
import { type FiatMethod } from '@/lib/marketplace/payment-meta';
import { gramDisplayFromApi } from '@/lib/crypto/gram-brand';
import styles from './BuyPaymentModal.module.css';

export interface CheckoutListing {
  id: number;
  price_ton?: number | null;
  price_sol?: number | null;
  price_rub?: number | null;
  nft_card?: {
    rank: string;
    suit: string;
  };
}

export type CheckoutMethod = 'wallet_pay' | FiatMethod | 'crypto_wallet';

interface MarketplaceCheckoutModalProps {
  listing: CheckoutListing;
  variant: 'rub' | 'crypto';
  walletPayEnabled: boolean;
  loading?: boolean;
  onClose: () => void;
  onPay: (method: CheckoutMethod) => void;
  getRankDisplay?: (rank: string) => string;
  getSuitSymbol?: (suit: string) => string;
}

export function MarketplaceCheckoutModal({
  listing,
  variant,
  walletPayEnabled,
  loading = false,
  onClose,
  onPay,
  getRankDisplay = (r) => r,
  getSuitSymbol = (s) => s,
}: MarketplaceCheckoutModalProps) {
  const [selected, setSelected] = useState<CheckoutMethod>(
    variant === 'rub' ? 'sbp' : walletPayEnabled ? 'wallet_pay' : 'crypto_wallet'
  );

  const rubAmount = listing.price_rub != null ? Number(listing.price_rub) : 0;
  const cryptoCurrency = listing.price_ton ? 'TON' : listing.price_sol ? 'SOL' : null;
  const cryptoAmount = listing.price_ton ?? listing.price_sol;

  if (typeof document === 'undefined') return null;

  const rubMethods: { id: CheckoutMethod; label: string; icon: React.ReactNode }[] = [
    { id: 'sbp', label: 'СБП', icon: <Zap size={16} /> },
    { id: 'sberbank', label: 'SberPay', icon: <CreditCard size={16} /> },
    { id: 'bank_card', label: 'Карта', icon: <CreditCard size={16} /> },
    { id: 'yoo_money', label: 'ЮMoney', icon: <Wallet size={16} /> },
  ];

  return createPortal(
    <div className={styles.overlay} onClick={onClose} role="dialog" aria-modal="true">
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h3 className={styles.title}>Способ оплаты</h3>
          <button type="button" className={styles.closeBtn} onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {listing.nft_card && (
          <div className={styles.cardLine}>
            {getRankDisplay(listing.nft_card.rank)} {getSuitSymbol(listing.nft_card.suit)}
          </div>
        )}

        <div className={styles.amountRow}>
          {variant === 'rub' ? (
            <span className={styles.amountRub}>{rubAmount.toLocaleString('ru-RU')} ₽</span>
          ) : cryptoAmount != null && cryptoCurrency ? (
            <span className={styles.amount}>
              {cryptoAmount} {gramDisplayFromApi(cryptoCurrency)}
            </span>
          ) : null}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
          {walletPayEnabled && (
            <button
              type="button"
              onClick={() => setSelected('wallet_pay')}
              style={methodBtnStyle(selected === 'wallet_pay')}
            >
              <span>👛 Telegram Wallet Pay</span>
              <span style={{ fontSize: 11, opacity: 0.75 }}>одно подтверждение</span>
            </button>
          )}

          {variant === 'rub' &&
            rubMethods.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => setSelected(m.id)}
                style={methodBtnStyle(selected === m.id)}
              >
                {m.icon}
                <span>{m.label} через ЮKassa</span>
              </button>
            ))}

          {variant === 'crypto' && (
            <button
              type="button"
              onClick={() => setSelected('crypto_wallet')}
              style={methodBtnStyle(selected === 'crypto_wallet')}
            >
              <Wallet size={16} />
              <span>Оплата в кошельке (TON/SOL)</span>
            </button>
          )}
        </div>

        <p className={styles.hint}>
          {selected === 'wallet_pay'
            ? 'Откроется @wallet — подтвердите оплату одним нажатием. NFT передаётся автоматически.'
            : variant === 'rub'
              ? 'Оплата через ваш магазин ЮKassa. После успешной оплаты карта появится в коллекции.'
              : 'Откроется Tonkeeper или другой кошелёк для перевода.'}
        </p>

        <div className={styles.actions}>
          <button type="button" className={styles.btnSecondary} onClick={onClose} disabled={loading}>
            Отмена
          </button>
          <button
            type="button"
            className={styles.btnPrimary}
            disabled={loading}
            onClick={() => onPay(selected)}
          >
            {loading ? 'Создание…' : 'Оплатить'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

function methodBtnStyle(active: boolean): React.CSSProperties {
  return {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '12px 14px',
    borderRadius: 12,
    cursor: 'pointer',
    border: active ? '1.5px solid rgba(245, 197, 24, 0.55)' : '1px solid rgba(148, 163, 184, 0.18)',
    background: active ? 'rgba(245, 197, 24, 0.12)' : 'rgba(18, 26, 40, 0.92)',
    color: active ? '#f5c518' : '#e8edf5',
    fontWeight: 700,
    fontSize: 13,
    textAlign: 'left',
    flexWrap: 'wrap',
  };
}
