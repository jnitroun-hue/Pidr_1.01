'use client';

import type { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { FaCreditCard } from 'react-icons/fa';
import { SiVisa, SiMastercard, SiBitcoin, SiEthereum, SiSolana } from 'react-icons/si';
import type { ExchangeRateSnapshot } from '@/lib/pricing/types';
import { COINS_PER_USD } from '@/lib/pricing/constants';
import { coinsFromRub, formatRateUpdatedAt, formatCryptoDepositRateLine, coinsPerUnitForDeposit } from '@/lib/pricing/exchange-rates';
import { TELEGRAM_WALLET_POPULAR } from '@/lib/wallets/wallet-pay-currencies';
import { getCryptoToken } from '@/lib/crypto/crypto-assets';
import CryptoIcon from '@/components/CryptoIcon';
import PidrCoinIcon, { PidrCoinAmount } from '@/components/PidrCoinIcon';
import styles from './CoinTopUpSection.module.css';

type RubPayMethod = 'bank_card' | 'sberbank' | 'yoo_money' | 'sbp';

type Props = {
  rates: ExchangeRateSnapshot | null;
  yookassaEnabled: boolean;
  loading?: boolean;
  onBuyRub: (method: RubPayMethod) => void;
  onBuyCrypto: (coin: string) => void;
};

const RUB_METHODS: { id: RubPayMethod; label: string; icon: ReactNode; accent: string }[] = [
  { id: 'bank_card', label: 'Visa / MC', icon: <><SiVisa /><SiMastercard /></>, accent: '#ffd700' },
  { id: 'sbp', label: 'СБП', icon: '⚡', accent: '#f59e0b' },
  { id: 'sberbank', label: 'СберPay', icon: '💚', accent: '#22c55e' },
  { id: 'yoo_money', label: 'ЮMoney', icon: '🟣', accent: '#8b5cf6' },
];

function formatCoins(n: number): string {
  return n.toLocaleString('ru-RU');
}

export default function CoinTopUpSection({
  rates,
  yookassaEnabled,
  loading,
  onBuyRub,
  onBuyCrypto,
}: Props) {
  const coinsPerRub = rates?.coinsPerRub ?? COINS_PER_USD / 80;
  const usdRub = rates?.usdRub ?? 80;
  const sample100Rub = rates ? coinsFromRub(100, rates) : Math.floor(100 * (COINS_PER_USD / 80));
  const sample1Usd = COINS_PER_USD;

  return (
    <section className={styles.section}>
      <div className={styles.header}>
        <div className={styles.headerIconWrap}>
          <PidrCoinIcon size={48} spin alt="Монета P.I.D.R." />
        </div>
        <div>
          <h3 className={styles.title}>Пополнить монеты</h3>
          <p className={styles.subtitle}>
            1 $ = {formatCoins(COINS_PER_USD)} · 80 ₽ ≈ {formatCoins(COINS_PER_USD)} монет
          </p>
        </div>
      </div>

      <div className={styles.rateBar}>
        <PidrCoinIcon size={14} alt="" />
        <span>1 ₽ ≈ {coinsPerRub.toFixed(1)} монет</span>
        <span>·</span>
        <span>$1 = {usdRub.toFixed(2)} ₽</span>
        {rates?.updatedAt && (
          <>
            <span>·</span>
            <span className={styles.rateUpdated}>курс {formatRateUpdatedAt(rates.updatedAt)}</span>
          </>
        )}
      </div>

      {yookassaEnabled && (
        <div className={styles.block}>
          <div className={styles.blockLabel}>
            <FaCreditCard className={styles.blockIcon} />
            <span>Рубли · ЮKassa</span>
          </div>
          <p className={styles.blockHint}>
            от 100 ₽ → <PidrCoinAmount value={sample100Rub} size={16} showLabel />
          </p>
          <div className={styles.methodGrid}>
            {RUB_METHODS.map((m) => (
              <motion.button
                key={m.id}
                type="button"
                className={styles.methodBtn}
                style={{ '--accent': m.accent } as React.CSSProperties}
                whileHover={{ scale: 1.03, y: -2 }}
                whileTap={{ scale: 0.97 }}
                disabled={loading}
                onClick={() => onBuyRub(m.id)}
              >
                <span className={styles.methodIcon}>{m.icon}</span>
                <span>{m.label}</span>
              </motion.button>
            ))}
          </div>
        </div>
      )}

      <div className={styles.block}>
        <div className={styles.blockLabel}>
          <SiBitcoin className={styles.blockIcon} />
          <span>Криптовалюта</span>
        </div>
        <p className={styles.blockHint}>
          {rates ? (
            <>
              {formatCryptoDepositRateLine('USDT', rates)} · $1 ={' '}
              <PidrCoinAmount value={sample1Usd} size={16} />
            </>
          ) : (
            <>
              1 USDT ≈ <PidrCoinAmount value={COINS_PER_USD} size={16} /> · $1 ={' '}
              <PidrCoinAmount value={sample1Usd} size={16} />
            </>
          )}
        </p>
        <div className={styles.cryptoGrid}>
          {TELEGRAM_WALLET_POPULAR.map((coin) => {
            const meta = getCryptoToken(coin);
            const perUnit = rates ? coinsPerUnitForDeposit(coin, rates) : COINS_PER_USD;
            return (
              <motion.button
                key={coin}
                type="button"
                className={styles.cryptoBtn}
                style={{ '--coin-color': meta.color } as React.CSSProperties}
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.96 }}
                disabled={loading}
                onClick={() => onBuyCrypto(coin)}
              >
                <CryptoIcon src={meta.icon} size={28} alt={meta.symbol} />
                <span className={styles.cryptoSymbol}>{meta.symbol}</span>
                <span className={styles.cryptoRate}>{formatCoins(perUnit)}/шт</span>
              </motion.button>
            );
          })}
        </div>
        <p className={styles.cryptoNote}>
          <SiEthereum size={12} /> ETH · <SiSolana size={12} /> SOL — курс в $ · USDT — в ₽
          {rates?.updatedAt ? ` · ${formatRateUpdatedAt(rates.updatedAt)}` : ''}
        </p>
      </div>
    </section>
  );
}
