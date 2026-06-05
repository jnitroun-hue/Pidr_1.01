'use client';

import { motion } from 'framer-motion';
import { Crown, Sparkles, ChevronRight, Flame, Zap } from 'lucide-react';
import { PREMIUM_PRICE_RUB, PREMIUM_PRICE_COINS } from '@/lib/premium/constants';
import type { PremiumStatus } from '@/lib/premium/premium-service';

interface PremiumPromoBannerProps {
  premium: PremiumStatus | null;
  compact?: boolean;
  onOpenPurchase: () => void;
}

export default function PremiumPromoBanner({ premium, compact = false, onOpenPurchase }: PremiumPromoBannerProps) {
  const isActive = premium?.isPremium;

  if (isActive) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        onClick={onOpenPurchase}
        style={{
          marginBottom: compact ? '12px' : '20px',
          padding: compact ? '12px 14px' : '16px 18px',
          borderRadius: '16px',
          cursor: 'pointer',
          background: 'linear-gradient(135deg, rgba(14, 165, 233, 0.18) 0%, rgba(99, 102, 241, 0.12) 100%)',
          border: '1.5px solid rgba(56, 189, 248, 0.45)',
          boxShadow: '0 0 24px rgba(56, 189, 248, 0.12)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: 44, height: 44, borderRadius: '12px',
            background: 'linear-gradient(135deg, #0ea5e9, #6366f1)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 0 16px rgba(56,189,248,0.4)',
          }}>
            <Crown size={22} color="#fff" />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ color: '#7dd3fc', fontWeight: 800, fontSize: compact ? '14px' : '16px' }}>
              Premium активен
            </div>
            <div style={{ color: '#94a3b8', fontSize: '11px', marginTop: '2px' }}>
              до {premium.expiresAt ? new Date(premium.expiresAt).toLocaleDateString('ru-RU') : '—'}
              {' · '}{premium.daysLeft} дн.
              {premium.freeRandomAvailable ? ' · 🎁 free roll доступен' : ''}
            </div>
          </div>
          <ChevronRight size={18} color="#64748b" />
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
          animation: 'none',
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
          display: 'flex', alignItems: 'center', gap: '4px',
        }}>
          Купить <ChevronRight size={14} />
        </div>
      </div>
    </motion.div>
  );
}
