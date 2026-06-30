'use client';

import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import NftThemedCardCanvas from '@/components/NftThemedCardCanvas';
import type { NftThemeKey } from '@/lib/nft/theme-config';
import styles from './NFTGallery.module.css';

export type DailyOfferPreview = {
  cardTitle: string;
  themeLabel?: string;
  suit: string;
  rank: string;
  theme?: NftThemeKey | string;
  themeId?: number;
  promoImageUrl?: string | null;
  discountedCoins?: number;
  priceCoins?: number;
  canClaim: boolean;
  promoCooldownLabel: string;
};

type Props = {
  offer: DailyOfferPreview | null;
  onClose: () => void;
  onBuy: () => void;
};

export default function DailyOfferCardModal({ offer, onClose, onBuy }: Props) {
  if (typeof document === 'undefined') return null;

  const price = offer?.discountedCoins ?? offer?.priceCoins ?? 0;

  return createPortal(
    <AnimatePresence>
      {offer && (
        <motion.div
          key="daily-offer-modal"
          className={styles.cardOverlay}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className={styles.cardModal}
            style={{
              width: 'min(420px, 100%)',
              borderColor: 'rgba(251, 146, 60, 0.55)',
            }}
            initial={{ scale: 0.88, y: 28, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.88, y: 28, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 320, damping: 28 }}
            onClick={(e) => e.stopPropagation()}
          >
            <button type="button" className={styles.closeBtn} onClick={onClose} aria-label="Закрыть">
              <X size={22} />
            </button>

            <div style={{ textAlign: 'center', marginBottom: 8 }}>
              <div
                style={{
                  color: '#fed7aa',
                  fontSize: 11,
                  fontWeight: 800,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                }}
              >
                Premium · акция дня
              </div>
              <h2 style={{ color: '#fff7ed', margin: '8px 0 4px', fontSize: 22, fontWeight: 800 }}>
                {offer.cardTitle}
              </h2>
              {offer.themeLabel && (
                <span
                  style={{
                    display: 'inline-block',
                    marginTop: 4,
                    padding: '4px 12px',
                    borderRadius: 999,
                    background: 'rgba(251, 191, 36, 0.12)',
                    border: '1px solid rgba(251, 191, 36, 0.35)',
                    color: '#fde68a',
                    fontSize: 11,
                    fontWeight: 800,
                  }}
                >
                  {offer.themeLabel}
                </span>
              )}
            </div>

            <div
              style={{
                display: 'flex',
                justifyContent: 'center',
                margin: '12px 0 18px',
              }}
            >
              <motion.div
                initial={{ scale: 0.92 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.05, type: 'spring', stiffness: 280, damping: 22 }}
              >
                <NftThemedCardCanvas
                  suit={offer.suit}
                  rank={offer.rank}
                  theme={offer.theme}
                  themeId={offer.themeId}
                  fallbackImageUrl={offer.promoImageUrl}
                  width={280}
                  height={392}
                  alt={offer.cardTitle}
                />
              </motion.div>
            </div>

            <div style={{ textAlign: 'center', marginBottom: 16 }}>
              <div style={{ color: '#fde047', fontSize: 28, fontWeight: 900 }}>
                {price.toLocaleString('ru-RU')} 🪙
              </div>
              <p style={{ color: '#94a3b8', fontSize: 13, margin: '8px 0 0' }}>
                {offer.canClaim
                  ? 'Случайная карта · сразу в коллекцию · 1 раз в 24ч'
                  : `Новый шанс через ${offer.promoCooldownLabel}`}
              </p>
            </div>

            <button
              type="button"
              disabled={!offer.canClaim}
              onClick={() => {
                if (offer.canClaim) onBuy();
              }}
              style={{
                width: '100%',
                border: 'none',
                borderRadius: 14,
                padding: '14px 16px',
                background: offer.canClaim
                  ? 'linear-gradient(135deg, #f97316 0%, #ef4444 100%)'
                  : 'linear-gradient(135deg, rgba(100,116,139,0.7) 0%, rgba(71,85,105,0.7) 100%)',
                color: '#fff',
                fontWeight: 800,
                fontSize: 16,
                cursor: offer.canClaim ? 'pointer' : 'not-allowed',
              }}
            >
              {offer.canClaim ? `Купить за ${price.toLocaleString('ru-RU')} 🪙` : 'Уже куплено сегодня'}
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}
