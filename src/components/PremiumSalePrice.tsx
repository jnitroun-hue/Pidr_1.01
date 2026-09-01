'use client';

import { PidrCoinAmount } from '@/components/PidrCoinIcon';
import {
  PREMIUM_PRICE_COINS,
  PREMIUM_PRICE_COINS_OLD,
  PREMIUM_PRICE_RUB,
  PREMIUM_PRICE_RUB_OLD,
} from '@/lib/premium/constants';

interface PremiumSalePriceProps {
  mode?: 'rub' | 'coins' | 'both';
  size?: 'sm' | 'md';
}

export default function PremiumSalePrice({ mode = 'both', size = 'md' }: PremiumSalePriceProps) {
  const mainSize = size === 'sm' ? 16 : 20;
  const oldSize = size === 'sm' ? 11 : 12;

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'baseline', gap: mode === 'both' ? 8 : 6 }}>
      {(mode === 'rub' || mode === 'both') && (
        <span style={{ display: 'inline-flex', alignItems: 'baseline', gap: 6 }}>
          <span
            style={{
              color: '#94a3b8',
              fontSize: oldSize,
              fontWeight: 600,
              textDecoration: 'line-through',
              textDecorationThickness: 2,
            }}
          >
            {PREMIUM_PRICE_RUB_OLD} ₽
          </span>
          <span style={{ color: '#fde68a', fontWeight: 900, fontSize: mainSize }}>{PREMIUM_PRICE_RUB} ₽</span>
        </span>
      )}
      {mode === 'both' && (
        <span style={{ color: '#64748b', fontSize: oldSize, fontWeight: 700 }}>или</span>
      )}
      {(mode === 'coins' || mode === 'both') && (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <span
            style={{
              color: '#94a3b8',
              fontSize: oldSize,
              fontWeight: 600,
              textDecoration: 'line-through',
              textDecorationThickness: 2,
            }}
          >
            {PREMIUM_PRICE_COINS_OLD.toLocaleString('ru-RU')}
          </span>
          <PidrCoinAmount value={PREMIUM_PRICE_COINS} size={size === 'sm' ? 14 : 16} />
        </span>
      )}
    </div>
  );
}
