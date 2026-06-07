'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Crown, Sparkles, Zap, Flame, Gift, Percent, Check } from 'lucide-react';
import { PREMIUM_BENEFITS } from '@/lib/premium/constants';
import { formatCountdownLabel } from '@/lib/premium/countdown';
import { usePremiumCountdown } from '@/hooks/usePremiumCountdown';
import type { PremiumStatus } from '@/lib/premium/premium-service';

interface PremiumSuccessModalProps {
  open: boolean;
  onClose: () => void;
  premium: PremiumStatus | null;
}

export default function PremiumSuccessModal({ open, onClose, premium }: PremiumSuccessModalProps) {
  const countdown = usePremiumCountdown(premium?.expiresAt, premium?.startedAt);

  if (!open || !premium?.expiresAt) return null;

  const expiresLabel = premium.expiresAt
    ? new Date(premium.expiresAt).toLocaleString('ru-RU', {
        day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit',
      })
    : '—';

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, zIndex: 10000,
          background: 'rgba(2, 6, 23, 0.88)', backdropFilter: 'blur(10px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px',
        }}
      >
        <motion.div
          initial={{ scale: 0.85, y: 30, opacity: 0 }}
          animate={{ scale: 1, y: 0, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          transition={{ type: 'spring', damping: 22, stiffness: 280 }}
          onClick={(e) => e.stopPropagation()}
          style={{
            width: '100%', maxWidth: '400px',
            background: 'linear-gradient(165deg, #0c4a6e 0%, #1e1b4b 45%, #0f172a 100%)',
            borderRadius: '24px',
            border: '2px solid rgba(56, 189, 248, 0.5)',
            boxShadow: '0 0 60px rgba(56, 189, 248, 0.25), 0 24px 80px rgba(0,0,0,0.5)',
            padding: '28px 24px 24px',
            textAlign: 'center',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <div style={{
            position: 'absolute', inset: 0, pointerEvents: 'none',
            background: 'radial-gradient(circle at 50% 0%, rgba(56,189,248,0.2) 0%, transparent 55%)',
          }} />

          <motion.div
            animate={{ scale: [1, 1.08, 1], rotate: [0, 5, -5, 0] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            style={{
              width: 72, height: 72, margin: '0 auto 16px', borderRadius: '20px',
              background: 'linear-gradient(135deg, #0ea5e9, #6366f1)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 0 32px rgba(56,189,248,0.6)',
            }}
          >
            <Crown size={36} color="#fff" />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginBottom: 8 }}>
              <Sparkles size={18} color="#fde68a" />
              <span style={{ color: '#e0f2fe', fontSize: '22px', fontWeight: 900 }}>Premium активирован!</span>
              <Sparkles size={18} color="#fde68a" />
            </div>
            <p style={{ color: '#94a3b8', fontSize: '14px', lineHeight: 1.5, margin: '0 0 20px' }}>
              Поздравляем! Все бонусы Premium уже работают.
            </p>
          </motion.div>

          <div style={{
            background: 'rgba(0,0,0,0.35)', borderRadius: '14px', padding: '14px', marginBottom: '16px',
            border: '1px solid rgba(56,189,248,0.25)',
          }}>
            <div style={{ color: '#64748b', fontSize: '11px', marginBottom: 6 }}>Осталось Premium</div>
            <div style={{
              color: '#7dd3fc', fontSize: '28px', fontWeight: 900, fontFamily: 'monospace',
              letterSpacing: '1px',
            }}>
              {formatCountdownLabel(countdown)}
            </div>
            <div style={{ color: '#64748b', fontSize: '11px', marginTop: 8 }}>
              до {expiresLabel}
            </div>
          </div>

          <div style={{
            textAlign: 'left', display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20,
          }}>
            {[
              { icon: Zap, text: PREMIUM_BENEFITS[0] },
              { icon: Flame, text: PREMIUM_BENEFITS[1] },
              { icon: Gift, text: PREMIUM_BENEFITS[2] },
              { icon: Percent, text: PREMIUM_BENEFITS[3] },
            ].map(({ icon: Icon, text }) => (
              <div key={text} style={{ display: 'flex', alignItems: 'center', gap: 10, color: '#cbd5e1', fontSize: '13px' }}>
                <Check size={14} color="#22c55e" />
                <Icon size={14} color="#38bdf8" />
                {text}
              </div>
            ))}
          </div>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={onClose}
            style={{
              width: '100%', padding: '14px', borderRadius: '14px', border: 'none', cursor: 'pointer',
              background: 'linear-gradient(135deg, #0ea5e9, #6366f1)',
              color: '#fff', fontWeight: 800, fontSize: '15px',
            }}
          >
            Отлично!
          </motion.button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
