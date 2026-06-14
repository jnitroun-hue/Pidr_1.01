'use client';

import { useCallback, useState } from 'react';
import { createPortal } from 'react-dom';
import Image from 'next/image';
import { X, Copy, Check, Smartphone, QrCode, Wallet } from 'lucide-react';
import { marketplaceTheme as T } from '@/lib/ui/marketplaceTheme';
import { CRYPTO_OPTIONS, fiatMethodLabel } from '@/lib/marketplace/payment-meta';
import styles from './BuyPaymentModal.module.css';

export interface BuyPaymentListing {
  id: number;
  price_ton?: number | null;
  price_sol?: number | null;
  price_rub?: number | null;
  fiat_payment_method?: string | null;
  seller_wallet_address?: string | null;
  seller_wallet_network?: string | null;
  seller_fiat_phone?: string | null;
  seller_fiat_qr_url?: string | null;
  nft_card?: {
    rank: string;
    suit: string;
    image_url?: string;
  };
}

interface BuyPaymentModalProps {
  listing: BuyPaymentListing;
  mode: 'crypto' | 'fiat_p2p';
  onClose: () => void;
  onProceed: () => void;
  getRankDisplay?: (rank: string) => string;
  getSuitSymbol?: (suit: string) => string;
}

export function BuyPaymentModal({
  listing,
  mode,
  onClose,
  onProceed,
  getRankDisplay = (r) => r,
  getSuitSymbol = (s) => s,
}: BuyPaymentModalProps) {
  const [copied, setCopied] = useState<string | null>(null);

  const copyText = useCallback(async (text: string, key: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      /* ignore */
    }
  }, []);

  const currency = listing.price_ton ? 'TON' : listing.price_sol ? 'SOL' : null;
  const cryptoAmount = listing.price_ton ?? listing.price_sol;
  const cryptoMeta = CRYPTO_OPTIONS.find((c) => c.id === currency);
  const wallet = listing.seller_wallet_address?.trim();
  const rubAmount = listing.price_rub != null ? Number(listing.price_rub) : 0;

  if (typeof document === 'undefined') return null;

  return createPortal(
    <div className={styles.overlay} onClick={onClose} role="dialog" aria-modal="true">
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h3 className={styles.title}>
            {mode === 'crypto' ? 'Оплата криптой' : 'Перевод продавцу'}
          </h3>
          <button type="button" className={styles.closeBtn} onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {listing.nft_card && (
          <div className={styles.cardLine}>
            {getRankDisplay(listing.nft_card.rank)} {getSuitSymbol(listing.nft_card.suit)}
          </div>
        )}

        {mode === 'crypto' && currency && cryptoAmount != null && (
          <>
            <div className={styles.amountRow}>
              {cryptoMeta && (
                <Image src={cryptoMeta.icon} alt={currency} width={32} height={32} />
              )}
              <span className={styles.amount}>
                {cryptoAmount} {currency}
              </span>
            </div>
            {wallet ? (
              <div className={styles.block}>
                <div className={styles.blockLabel}>
                  <Wallet size={16} />
                  Кошелёк продавца
                </div>
                <div className={styles.copyRow}>
                  <code className={styles.mono}>{wallet}</code>
                  <button
                    type="button"
                    className={styles.copyBtn}
                    onClick={() => void copyText(wallet, 'wallet')}
                  >
                    {copied === 'wallet' ? <Check size={16} /> : <Copy size={16} />}
                    {copied === 'wallet' ? 'Скопировано' : 'Копировать'}
                  </button>
                </div>
                <p className={styles.hint}>Переведите точную сумму на этот адрес, затем подтвердите оплату.</p>
              </div>
            ) : (
              <p className={styles.hint}>Откроется кошелёk для оплаты.</p>
            )}
          </>
        )}

        {mode === 'fiat_p2p' && rubAmount > 0 && (
          <>
            <div className={styles.amountRow}>
              <span className={styles.amountRub}>{rubAmount.toLocaleString('ru-RU')} ₽</span>
              <span className={styles.badge}>{fiatMethodLabel(listing.fiat_payment_method)}</span>
            </div>

            {listing.seller_fiat_phone && (
              <div className={styles.block}>
                <div className={styles.blockLabel}>
                  <Smartphone size={16} />
                  Телефон для СБП
                </div>
                <div className={styles.copyRow}>
                  <code className={styles.mono}>{listing.seller_fiat_phone}</code>
                  <button
                    type="button"
                    className={styles.copyBtn}
                    onClick={() => void copyText(listing.seller_fiat_phone!, 'phone')}
                  >
                    {copied === 'phone' ? <Check size={16} /> : <Copy size={16} />}
                    {copied === 'phone' ? 'Скопировано' : 'Копировать'}
                  </button>
                </div>
              </div>
            )}

            {listing.seller_fiat_qr_url && (
              <div className={styles.block}>
                <div className={styles.blockLabel}>
                  <QrCode size={16} />
                  QR-код для оплаты
                </div>
                <img src={listing.seller_fiat_qr_url} alt="QR оплаты" className={styles.qrImg} />
              </div>
            )}

            <p className={styles.hint}>
              Переведите {rubAmount.toLocaleString('ru-RU')} ₽ продавцу, затем нажмите «Я оплатил» — продавец подтвердит
              сделку.
            </p>
          </>
        )}

        <div className={styles.actions}>
          <button type="button" className={styles.btnSecondary} onClick={onClose}>
            Отмена
          </button>
          <button type="button" className={styles.btnPrimary} onClick={onProceed}>
            {mode === 'crypto' ? 'Перейти к оплате' : 'Я оплатил'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
