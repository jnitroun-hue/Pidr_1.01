'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { getApiHeaders } from '@/lib/api-headers';
import { normalizePromoCode, type PromoRewardType } from '@/lib/promo/promo-rewards';
import styles from './PromoCodeCard.module.css';

export interface PromoRedeemResult {
  code: string;
  rewardType: PromoRewardType;
  rewardValue: number;
  rewardText: string;
  newBalance: number | null;
  premiumExpiresAt: string | null;
  newRating: number | null;
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

  const loadHistory = async () => {
    try {
      const res = await fetch('/api/promocode', {
        credentials: 'include',
        headers: getApiHeaders(),
        cache: 'no-store',
      });
      const data = await res.json();
      if (data?.success && Array.isArray(data.redemptions)) setHistory(data.redemptions);
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
    } catch {
      setFeedback({ kind: 'err', text: 'Сеть недоступна, попробуйте ещё раз' });
    } finally {
      setBusy(false);
    }
  };

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
    </article>
  );
}
