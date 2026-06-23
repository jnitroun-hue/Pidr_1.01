'use client';

import { useCallback, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Crown, Gift, Sparkles, Loader2 } from 'lucide-react';
import type { PremiumStatus } from '@/lib/premium/premium-service';
import { fetchPremiumStatus, isPremiumUsable } from '@/lib/premium/refresh-premium';
import { formatCountdownLabel } from '@/lib/premium/countdown';
import { useFreeRollCountdown } from '@/hooks/useFreeRollCountdown';
import { PREMIUM_FREE_ROLL_COOLDOWN_DAYS } from '@/lib/premium/constants';
import { appAlert } from '@/lib/app-notice';
import { getApiHeaders } from '@/lib/api-headers';
import { parseJsonResponse } from '@/lib/api/parse-json-response';
import { openNftCardModal } from '@/lib/nft/open-card-modal';

interface PremiumFreeRollBannerProps {
  onGenerated?: () => void;
}

function CountdownCell({ value, label }: { value: string; label: string }) {
  return (
    <div
      style={{
        flex: 1,
        minWidth: 0,
        textAlign: 'center',
        padding: '10px 6px',
        borderRadius: '12px',
        background: 'rgba(0,0,0,0.35)',
        border: '1px solid rgba(251, 191, 36, 0.25)',
      }}
    >
      <div
        style={{
          color: '#fde68a',
          fontSize: '20px',
          fontWeight: 900,
          fontFamily: 'monospace',
          lineHeight: 1.1,
        }}
      >
        {value}
      </div>
      <div
        style={{
          color: '#64748b',
          fontSize: '9px',
          marginTop: 4,
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
        }}
      >
        {label}
      </div>
    </div>
  );
}

export default function PremiumFreeRollBanner({ onGenerated }: PremiumFreeRollBannerProps) {
  const [premium, setPremium] = useState<PremiumStatus | null>(null);
  const [loadingStatus, setLoadingStatus] = useState(true);
  const [generating, setGenerating] = useState(false);

  const refreshPremium = useCallback(async () => {
    const status = await fetchPremiumStatus();
    setPremium(status);
    setLoadingStatus(false);
    return status;
  }, []);

  useEffect(() => {
    void refreshPremium();
  }, [refreshPremium]);

  const countdown = useFreeRollCountdown(premium?.freeRandomNextAt);

  useEffect(() => {
    if (countdown.expired && premium && !premium.freeRandomAvailable && premium.freeRandomNextAt) {
      void refreshPremium();
    }
  }, [countdown.expired, premium, refreshPremium]);

  if (loadingStatus || !isPremiumUsable(premium)) {
    return null;
  }

  const pad = (n: number) => String(n).padStart(2, '0');
  const available = premium.freeRandomAvailable;

  const handleGenerate = async () => {
    if (!available || generating) return;

    setGenerating(true);
    try {
      const response = await fetch('/api/nft/mint-random', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          ...getApiHeaders(),
        },
        body: JSON.stringify({ useFreePremium: true }),
      });

      const parsed = await parseJsonResponse<{ success?: boolean; error?: string; message?: string; nft?: Record<string, unknown>; card?: Record<string, unknown>; theme?: string; theme_id?: number }>(response);
      if (parsed.error && !parsed.data) {
        await appAlert(parsed.error, { title: 'Ошибка', type: 'error' });
        return;
      }

      const result = parsed.data;
      if (!result?.success) {
        await appAlert(result?.error || result?.message || 'Не удалось сгенерировать карту', {
          title: 'Ошибка',
          type: 'error',
        });
        await refreshPremium();
        return;
      }

      const card = (result.nft || result.card) as {
        id: number;
        rank: string;
        suit: string;
        rarity?: string;
        image_url?: string;
      };

      window.dispatchEvent(new CustomEvent('nft-collection-updated'));
      onGenerated?.();
      await refreshPremium();

      if (!card?.id) {
        await appAlert('Карта создана, но не удалось открыть превью', { title: 'Готово', type: 'success' });
        return;
      }

      openNftCardModal({
        id: card.id,
        rank: card.rank,
        suit: card.suit,
        rarity: card.rarity ?? result.theme ?? 'common',
        image_url: card.image_url ?? '',
        metadata: {
          theme: result.theme,
          theme_id: result.theme_id,
          mint_type: 'random_premium_free',
        },
      });
    } catch (error) {
      await appAlert(error instanceof Error ? error.message : 'Неизвестная ошибка', {
        title: 'Ошибка',
        type: 'error',
      });
    } finally {
      setGenerating(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      style={{
        marginBottom: '20px',
        padding: '18px',
        borderRadius: '20px',
        position: 'relative',
        overflow: 'hidden',
        background:
          'linear-gradient(135deg, rgba(234, 179, 8, 0.22) 0%, rgba(99, 102, 241, 0.18) 45%, rgba(15, 23, 42, 0.96) 100%)',
        border: '2px solid rgba(251, 191, 36, 0.55)',
        boxShadow: '0 0 40px rgba(251, 191, 36, 0.18), inset 0 1px 0 rgba(255,255,255,0.06)',
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: -40,
          right: -20,
          width: 140,
          height: 140,
          background: 'radial-gradient(circle, rgba(251,191,36,0.35) 0%, transparent 70%)',
          pointerEvents: 'none',
        }}
      />
      <div
        style={{
          position: 'absolute',
          bottom: -30,
          left: -30,
          width: 100,
          height: 100,
          background: 'radial-gradient(circle, rgba(99,102,241,0.25) 0%, transparent 70%)',
          pointerEvents: 'none',
        }}
      />

      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px', position: 'relative' }}>
        <motion.div
          animate={
            available
              ? {
                  boxShadow: [
                    '0 0 16px rgba(251,191,36,0.45)',
                    '0 0 32px rgba(251,191,36,0.75)',
                    '0 0 16px rgba(251,191,36,0.45)',
                  ],
                }
              : undefined
          }
          transition={{ duration: 2.2, repeat: Infinity }}
          style={{
            width: 52,
            height: 52,
            borderRadius: '16px',
            flexShrink: 0,
            background: 'linear-gradient(135deg, #f59e0b 0%, #eab308 50%, #6366f1 100%)',
            display: 'grid',
            placeItems: 'center',
          }}
        >
          <Crown size={26} color="#fff" />
        </motion.div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
            <Sparkles size={14} color="#fde68a" />
            <span
              style={{
                color: '#fde68a',
                fontWeight: 900,
                fontSize: '15px',
                letterSpacing: '0.04em',
                textTransform: 'uppercase',
              }}
            >
              Premium · бесплатная генерация
            </span>
          </div>
          <p style={{ margin: 0, color: '#cbd5e1', fontSize: '12px', lineHeight: 1.5 }}>
            {available
              ? `Раз в ${PREMIUM_FREE_ROLL_COOLDOWN_DAYS} дней — случайная NFT-карта бесплатно. Сохраняется в коллекцию и в папку premium-free.`
              : `Следующая бесплатная генерация через ${formatCountdownLabel(countdown)}.`}
          </p>
        </div>

        {available && (
          <div
            style={{
              flexShrink: 0,
              fontSize: '10px',
              padding: '5px 10px',
              borderRadius: '999px',
              background: 'rgba(34,197,94,0.2)',
              color: '#86efac',
              fontWeight: 800,
              border: '1px solid rgba(34,197,94,0.35)',
            }}
          >
            Доступно
          </div>
        )}
      </div>

      {available ? (
        <motion.button
          type="button"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => void handleGenerate()}
          disabled={generating}
          style={{
            width: '100%',
            marginTop: '16px',
            minHeight: '52px',
            border: 'none',
            borderRadius: '14px',
            cursor: generating ? 'wait' : 'pointer',
            fontFamily: 'inherit',
            fontSize: '15px',
            fontWeight: 900,
            color: '#0f172a',
            background: 'linear-gradient(135deg, #fde68a 0%, #fbbf24 45%, #f59e0b 100%)',
            boxShadow: '0 10px 32px rgba(251, 191, 36, 0.35)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 10,
          }}
        >
          {generating ? (
            <>
              <Loader2 size={20} style={{ animation: 'premiumFreeRollSpin 0.9s linear infinite' }} />
              Генерация…
            </>
          ) : (
            <>
              <Gift size={20} />
              Сгенерировать бесплатную карту
            </>
          )}
        </motion.button>
      ) : (
        <div style={{ marginTop: '16px' }}>
          <div
            style={{
              textAlign: 'center',
              color: '#94a3b8',
              fontSize: '11px',
              marginBottom: 10,
              fontWeight: 600,
            }}
          >
            До следующей бесплатной генерации
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {countdown.days > 0 && <CountdownCell value={String(countdown.days)} label="дней" />}
            <CountdownCell value={pad(countdown.hours)} label="час" />
            <CountdownCell value={pad(countdown.minutes)} label="мин" />
            <CountdownCell value={pad(countdown.seconds)} label="сек" />
          </div>
          {premium.freeRandomUsedAt && (
            <div
              style={{
                marginTop: 10,
                textAlign: 'center',
                fontSize: '10px',
                color: '#64748b',
              }}
            >
              Использовано:{' '}
              {new Date(premium.freeRandomUsedAt).toLocaleString('ru-RU', {
                day: 'numeric',
                month: 'short',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </div>
          )}
        </div>
      )}
      <style jsx global>{`
        @keyframes premiumFreeRollSpin {
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </motion.div>
  );
}
