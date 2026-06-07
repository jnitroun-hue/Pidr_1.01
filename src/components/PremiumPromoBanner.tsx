'use client';

import { motion } from 'framer-motion';
import { Crown, Gift, Flame, Zap, Sparkles } from 'lucide-react';
import { PREMIUM_PRICE_RUB, PREMIUM_PRICE_COINS } from '@/lib/premium/constants';
import { formatCountdownLabel } from '@/lib/premium/countdown';
import { usePremiumCountdown } from '@/hooks/usePremiumCountdown';
import type { PremiumStatus } from '@/lib/premium/premium-service';

interface PremiumPromoBannerProps {
  premium: PremiumStatus | null;
  compact?: boolean;
  onOpenPurchase: () => void;
}

function CountdownBox({ value, label }: { value: string; label: string }) {
  return (
    <div style={{
      flex: 1, minWidth: 0, textAlign: 'center',
      background: 'rgba(0,0,0,0.35)', borderRadius: '10px',
      padding: '8px 4px', border: '1px solid rgba(56,189,248,0.2)',
    }}>
      <div style={{
        color: '#e0f2fe', fontSize: '18px', fontWeight: 900, fontFamily: 'monospace', lineHeight: 1.1,
      }}>
        {value}
      </div>
      <div style={{ color: '#64748b', fontSize: '9px', marginTop: 2, textTransform: 'uppercase' }}>{label}</div>
    </div>
  );
}

export default function PremiumPromoBanner({ premium, compact = false, onOpenPurchase }: PremiumPromoBannerProps) {
  const isActive = premium?.isPremium;
  const countdown = usePremiumCountdown(premium?.expiresAt, premium?.startedAt);

  if (isActive && premium) {
    const pad = (n: number) => String(n).padStart(2, '0');
    const expiresDate = premium.expiresAt
      ? new Date(premium.expiresAt).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })
      : '—';

    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        style={{
          marginBottom: compact ? '12px' : '20px',
          padding: compact ? '14px' : '18px',
          borderRadius: '18px',
          position: 'relative',
          overflow: 'hidden',
          background: 'linear-gradient(135deg, rgba(14, 165, 233, 0.15) 0%, rgba(99, 102, 241, 0.1) 50%, rgba(15, 23, 42, 0.95) 100%)',
          border: '2px solid rgba(56, 189, 248, 0.45)',
          boxShadow: '0 0 28px rgba(56, 189, 248, 0.15)',
        }}
      >
        <div style={{
          position: 'absolute', top: -30, right: -30, width: 100, height: 100,
          background: 'radial-gradient(circle, rgba(56,189,248,0.2) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px' }}>
          <motion.div
            animate={{ boxShadow: ['0 0 12px rgba(56,189,248,0.4)', '0 0 24px rgba(56,189,248,0.7)', '0 0 12px rgba(56,189,248,0.4)'] }}
            transition={{ duration: 2.5, repeat: Infinity }}
            style={{
              width: compact ? 40 : 48, height: compact ? 40 : 48, borderRadius: '14px', flexShrink: 0,
              background: 'linear-gradient(135deg, #0ea5e9, #6366f1)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <Crown size={compact ? 20 : 24} color="#fff" />
          </motion.div>
          <div style={{ flex: 1 }}>
            <div style={{ color: '#7dd3fc', fontWeight: 900, fontSize: compact ? '15px' : '17px' }}>
              ✨ Premium активен
            </div>
            <div style={{ color: '#64748b', fontSize: '11px', marginTop: 2 }}>
              до {expiresDate}
            </div>
          </div>
          {premium.freeRandomAvailable && (
            <div style={{
              fontSize: '10px', padding: '4px 8px', borderRadius: '999px',
              background: 'rgba(34,197,94,0.15)', color: '#86efac', fontWeight: 700,
              display: 'flex', alignItems: 'center', gap: 4,
            }}>
              <Gift size={11} /> Free roll
            </div>
          )}
        </div>

        {/* Progress bar */}
        <div style={{
          height: 4, borderRadius: 999, background: 'rgba(255,255,255,0.08)', marginBottom: 12, overflow: 'hidden',
        }}>
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${100 - countdown.progressPercent}%` }}
            style={{
              height: '100%', borderRadius: 999,
              background: 'linear-gradient(90deg, #0ea5e9, #818cf8)',
            }}
          />
        </div>

        {/* Countdown */}
        <div style={{ marginBottom: 10 }}>
          <div style={{ color: '#64748b', fontSize: '10px', marginBottom: 8, textAlign: 'center' }}>
            Осталось Premium
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            {countdown.days > 0 && (
              <CountdownBox value={String(countdown.days)} label="дней" />
            )}
            <CountdownBox value={pad(countdown.hours)} label="час" />
            <CountdownBox value={pad(countdown.minutes)} label="мин" />
            <CountdownBox value={pad(countdown.seconds)} label="сек" />
          </div>
          <div style={{
            textAlign: 'center', marginTop: 8, color: '#38bdf8',
            fontSize: '12px', fontWeight: 700, fontFamily: 'monospace',
          }}>
            {formatCountdownLabel(countdown)}
          </div>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, justifyContent: 'center' }}>
          {[
            { icon: Zap, label: '×2 рейтинг' },
            { icon: Flame, label: 'Огонь' },
            { icon: Gift, label: 'Скидки' },
          ].map(({ icon: Icon, label }) => (
            <span key={label} style={{
              fontSize: '10px', padding: '3px 8px', borderRadius: '999px',
              background: 'rgba(56,189,248,0.12)', color: '#94a3b8',
              display: 'inline-flex', alignItems: 'center', gap: 4,
            }}>
              <Icon size={10} color="#38bdf8" /> {label}
            </span>
          ))}
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.01 }}
      onClick={onOpenPurchase}
      style={{
        marginBottom: compact ? '12px' : '20px',
        padding: compact ? '14px' : '18px',
        borderRadius: '18px',
        cursor: 'pointer',
        position: 'relative',
        overflow: 'hidden',
        background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #0c4a6e 100%)',
        border: '2px solid rgba(56, 189, 248, 0.35)',
        boxShadow: '0 8px 32px rgba(14, 165, 233, 0.2)',
      }}
    >
      <div style={{
        position: 'absolute', top: -20, right: -20, width: 120, height: 120,
        background: 'radial-gradient(circle, rgba(56,189,248,0.25) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />

      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px', position: 'relative' }}>
        <div style={{
          width: 52, height: 52, borderRadius: '14px', flexShrink: 0,
          background: 'linear-gradient(135deg, #0284c7 0%, #818cf8 100%)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 0 20px rgba(56,189,248,0.5)',
        }}>
          <Crown size={26} color="#fff" />
        </div>

        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
            <Sparkles size={14} color="#fde68a" />
            <span style={{
              color: '#e0f2fe', fontWeight: 900, fontSize: compact ? '15px' : '17px',
              letterSpacing: '0.5px',
            }}>
              PREMIUM АККАУНТ
            </span>
          </div>
          <div style={{ color: '#94a3b8', fontSize: '11px', lineHeight: 1.5, marginBottom: '10px' }}>
            Рейтинг ×2 · голубое пламя · free roll · скидки до 35%
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            <span style={{ fontSize: '10px', padding: '3px 8px', borderRadius: '999px', background: 'rgba(56,189,248,0.15)', color: '#7dd3fc', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Zap size={10} /> ×2 рейтинг
            </span>
            <span style={{ fontSize: '10px', padding: '3px 8px', borderRadius: '999px', background: 'rgba(56,189,248,0.15)', color: '#7dd3fc', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Flame size={10} /> огонь
            </span>
          </div>
        </div>
      </div>

      <div style={{
        marginTop: '14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '10px 14px', borderRadius: '12px',
        background: 'rgba(0,0,0,0.25)', border: '1px solid rgba(56,189,248,0.2)',
      }}>
        <div>
          <div style={{ color: '#64748b', fontSize: '10px' }}>от</div>
          <div style={{ color: '#fde68a', fontWeight: 800, fontSize: '18px' }}>
            {PREMIUM_PRICE_RUB} ₽
            <span style={{ color: '#64748b', fontSize: '11px', fontWeight: 500 }}> / мес</span>
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ color: '#64748b', fontSize: '10px' }}>или</div>
          <div style={{ color: '#eab308', fontWeight: 700, fontSize: '13px' }}>
            {PREMIUM_PRICE_COINS.toLocaleString('ru-RU')} 🪙
          </div>
        </div>
        <div style={{
          padding: '8px 14px', borderRadius: '10px',
          background: 'linear-gradient(135deg, #0ea5e9, #6366f1)',
          color: '#fff', fontWeight: 800, fontSize: '12px',
        }}>
          Купить →
        </div>
      </div>
    </motion.div>
  );
}
