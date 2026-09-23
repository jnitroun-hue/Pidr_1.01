'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { createPortal } from 'react-dom';
import { getApiHeaders } from '@/lib/api-headers';
import { normalizePromoCode, type PromoRewardType } from '@/lib/promo/promo-rewards';
import { formatNftCardName } from '@/lib/nft/card-display';
import NftCardFace from '@/components/NftCardFace';
import PidrCoinIcon from '@/components/PidrCoinIcon';
import styles from './PromoCodeCard.module.css';

export interface PromoRedeemResult {
  code: string;
  rewardType: PromoRewardType;
  rewardValue: number;
  rewardText: string;
  newBalance: number | null;
  premiumExpiresAt: string | null;
  newRating: number | null;
  coinsGranted?: number;
  premiumDays?: number;
  freeNftPending?: boolean;
}

interface MintedCard {
  id: number;
  rank: string;
  suit: string;
  rarity: string;
  image_url: string;
}

interface Redemption {
  code: string;
  rewardText: string;
  redeemedAt: string;
}

interface Props {
  onRedeemed?: (result: PromoRedeemResult) => void;
}

export default function PromoCodeCard({ onRedeemed }: Props) {
  const [value, setValue] = useState('');
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);
  const [history, setHistory] = useState<Redemption[]>([]);
  const [pendingNft, setPendingNft] = useState(false);
  const [nftOpen, setNftOpen] = useState(false);
  const [minting, setMinting] = useState(false);
  const [minted, setMinted] = useState<MintedCard | null>(null);
  const [mintError, setMintError] = useState<string | null>(null);
  const [giftCoins, setGiftCoins] = useState(5000);

  const loadHistory = async () => {
    try {
      const res = await fetch('/api/promocode', {
        credentials: 'include',
        headers: getApiHeaders(),
        cache: 'no-store',
      });
      const data = await res.json();
      if (data?.success && Array.isArray(data.redemptions)) setHistory(data.redemptions);
      if (data?.success) setPendingNft(Boolean(data.pendingFreeNft));
    } catch {
      /* история — не критично */
    }
  };

  useEffect(() => {
    void loadHistory();
  }, []);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (busy) return;
    const code = normalizePromoCode(value);
    if (!code) {
      setFeedback({ kind: 'err', text: 'Код: 3–32 символа, латиница и цифры' });
      return;
    }
    setBusy(true);
    setFeedback(null);
    try {
      const res = await fetch('/api/promocode', {
        method: 'POST',
        credentials: 'include',
        headers: { ...getApiHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      });
      const data = await res.json();
      if (!res.ok || !data?.success) {
        setFeedback({ kind: 'err', text: data?.message || 'Не удалось активировать промокод' });
        return;
      }
      const result = data.data as PromoRedeemResult;
      setFeedback({ kind: 'ok', text: `Готово: ${result.rewardText}` });
      setValue('');
      setHistory((prev) => [
        { code: result.code, rewardText: result.rewardText, redeemedAt: new Date().toISOString() },
        ...prev,
      ]);
      onRedeemed?.(result);
      if (typeof window !== 'undefined' && result.newBalance != null) {
        window.dispatchEvent(new CustomEvent('coinsUpdated', { detail: { coins: result.newBalance } }));
      }
      if (result.freeNftPending) {
        setGiftCoins(result.coinsGranted || result.rewardValue || 5000);
        setMinted(null);
        setMintError(null);
        setPendingNft(true);
        setNftOpen(true);
      }
    } catch {
      setFeedback({ kind: 'err', text: 'Сеть недоступна, попробуйте ещё раз' });
    } finally {
      setBusy(false);
    }
  };

  const claimNft = async () => {
    if (minting || minted) return;
    setMinting(true);
    setMintError(null);
    try {
      const res = await fetch('/api/promocode/claim-nft', {
        method: 'POST',
        credentials: 'include',
        headers: { ...getApiHeaders(), 'Content-Type': 'application/json' },
      });
      const data = await res.json();
      if (!res.ok || !data?.success || !data.card) {
        setMintError(data?.message || 'Не удалось сгенерировать карту');
        return;
      }
      setMinted(data.card);
      setPendingNft(false);
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('nft-collection-updated'));
      }
    } catch {
      setMintError('Сеть недоступна, попробуйте ещё раз');
    } finally {
      setMinting(false);
    }
  };

  const nftModal = nftOpen && typeof document !== 'undefined'
    ? createPortal(
        <div className={styles.overlay} role="dialog" aria-modal="true" onClick={() => !minting && setNftOpen(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalKicker}>Промокод активирован</div>
            <h3 className={styles.modalTitle}>Вам начислено {giftCoins.toLocaleString('ru-RU')} монет</h3>
            <p className={styles.modalText}>
              И ещё одна бесплатная NFT. Нажмите кнопку — карта выпадет случайной и сразу появится в коллекции.
            </p>
            <div className={styles.coinLine}>
              <PidrCoinIcon size={28} alt="" />
              <span>+{giftCoins.toLocaleString('ru-RU')}</span>
            </div>
            {minted ? (
              <div className={styles.minted}>
                <NftCardFace
                  suit={minted.suit}
                  rank={minted.rank}
                  rarity={minted.rarity}
                  imageUrl={minted.image_url}
                  style={{ width: 148, height: 210, borderRadius: 12 }}
                />
                <div className={styles.mintedName}>{formatNftCardName(minted.rank, minted.suit, 'ru')}</div>
              </div>
            ) : (
              <button type="button" className={styles.mintBtn} onClick={() => void claimNft()} disabled={minting}>
                {minting ? 'Генерируем…' : 'Сгенерировать бесплатную карту'}
              </button>
            )}
            {mintError && <div className={`${styles.feedback} ${styles.err}`}>{mintError}</div>}
            <button type="button" className={styles.laterBtn} onClick={() => setNftOpen(false)} disabled={minting}>
              {minted ? 'Отлично' : 'Позже'}
            </button>
          </div>
        </div>,
        document.body
      )
    : null;

  return (
    <article className={styles.card}>
      <div className={styles.top}>
        <div className={styles.icon}>🎟️</div>
        <div>
          <h4 className={styles.name}>Промокод</h4>
          <p className={styles.description}>
            Введите код из розыгрышей, каналов и акций — награда начислится сразу.
          </p>
        </div>
      </div>

      <form className={styles.form} onSubmit={submit}>
        <input
          className={styles.input}
          value={value}
          onChange={(e) => {
            setValue(e.target.value.toUpperCase());
            if (feedback) setFeedback(null);
          }}
          placeholder="НАПРИМЕР: PIDR2026"
          autoCapitalize="characters"
          autoCorrect="off"
          spellCheck={false}
          maxLength={32}
          disabled={busy}
          aria-label="Промокод"
        />
        <button type="submit" className={styles.button} disabled={busy || !value.trim()}>
          {busy ? 'Проверяем…' : 'Активировать'}
        </button>
      </form>

      {feedback && (
        <div className={`${styles.feedback} ${feedback.kind === 'ok' ? styles.ok : styles.err}`} role="status">
          {feedback.text}
        </div>
      )}

      {pendingNft && !nftOpen && (
        <button type="button" className={styles.mintBtn} onClick={() => setNftOpen(true)}>
          Забрать бесплатную NFT
        </button>
      )}

      {history.length > 0 && (
        <div className={styles.history}>
          <div className={styles.historyTitle}>Активировано</div>
          <ul className={styles.historyList}>
            {history.slice(0, 5).map((item, i) => (
              <li key={`${item.code}-${item.redeemedAt}-${i}`} className={styles.historyItem}>
                <span className={styles.historyCode}>{item.code}</span>
                <span className={styles.historyReward}>{item.rewardText}</span>
                <span className={styles.historyDate}>
                  {new Date(item.redeemedAt).toLocaleDateString('ru-RU')}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
      {nftModal}
    </article>
  );
}
