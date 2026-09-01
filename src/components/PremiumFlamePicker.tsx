'use client';

import { useEffect, useState } from 'react';
import { Flame, Lock } from 'lucide-react';
import { getApiHeaders } from '@/lib/api-headers';
import PremiumAvatarFire from '@/components/PremiumAvatarFire';
import {
  PREMIUM_FLAME_COLORS,
  readStoredFlameColor,
  resolvePremiumFlame,
  storeFlameColor,
  type PremiumFlameColorId,
} from '@/lib/premium/flame';

interface PremiumFlamePickerProps {
  isPremium?: boolean;
  compact?: boolean;
  onChanged?: (color: PremiumFlameColorId) => void;
}

export default function PremiumFlamePicker({
  isPremium = false,
  compact = false,
  onChanged,
}: PremiumFlamePickerProps) {
  const [color, setColor] = useState<PremiumFlameColorId>(readStoredFlameColor);
  const [premiumOk, setPremiumOk] = useState(isPremium);

  useEffect(() => {
    setPremiumOk(isPremium);
  }, [isPremium]);

  useEffect(() => {
    setColor(readStoredFlameColor());
    void fetch('/api/user/premium-flame', {
      credentials: 'include',
      headers: getApiHeaders(),
      cache: 'no-store',
    })
      .then((r) => r.json())
      .then((data) => {
        if (data?.isPremium) setPremiumOk(true);
        if (data?.success && data.color) {
          const next = resolvePremiumFlame(data.color);
          setColor(next);
          storeFlameColor(next);
        }
      })
      .catch(() => {});
  }, []);

  const select = (id: PremiumFlameColorId) => {
    if (!premiumOk) return;
    setColor(id);
    storeFlameColor(id);
    onChanged?.(id);
    void fetch('/api/user/premium-flame', {
      method: 'POST',
      credentials: 'include',
      headers: { ...getApiHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ color: id }),
    }).catch(() => {});
  };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: compact ? 8 : 12 }}>
        <Flame size={16} color="var(--menu-accent, #fbbf24)" />
        <div>
          <div style={{ color: 'var(--menu-text, #e2e8f0)', fontWeight: 800, fontSize: 13 }}>
            Цвет пламени
          </div>
          {!compact && (
            <div style={{ color: 'var(--menu-text-muted, #94a3b8)', fontSize: 12 }}>
              {premiumOk
                ? 'Огонь вокруг аватара за столом — только ваш цвет'
                : 'Доступно с Premium'}
            </div>
          )}
        </div>
      </div>
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: compact ? 10 : 14 }}>
        <PremiumAvatarFire size={compact ? 36 : 48} active color={color}>
          <div
            style={{
              width: '100%',
              height: '100%',
              borderRadius: '50%',
              background: 'linear-gradient(180deg, #1e293b, #0f172a)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#e2e8f0',
              fontWeight: 800,
              fontSize: compact ? 14 : 18,
            }}
          >
            P
          </div>
        </PremiumAvatarFire>
      </div>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(5, minmax(0, 1fr))',
          gap: 8,
          opacity: premiumOk ? 1 : 0.45,
          pointerEvents: premiumOk ? 'auto' : 'none',
        }}
      >
        {PREMIUM_FLAME_COLORS.map((c) => {
          const selected = color === c.id;
          return (
            <button
              key={c.id}
              type="button"
              onClick={() => select(c.id)}
              title={c.labelRu}
              aria-label={c.labelRu}
              style={{
                height: compact ? 36 : 42,
                borderRadius: 12,
                border: selected ? `2px solid ${c.hot}` : '1px solid rgba(255,255,255,0.12)',
                background: `radial-gradient(circle at 50% 70%, ${c.hot}, ${c.core} 55%, ${c.base})`,
                boxShadow: selected ? `0 0 14px ${c.core}` : 'none',
                cursor: premiumOk ? 'pointer' : 'not-allowed',
                position: 'relative',
              }}
            >
              {selected && (
                <span style={{
                  position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#0f172a', fontWeight: 900, fontSize: 14, textShadow: '0 0 8px #fff',
                }}>
                  ✓
                </span>
              )}
            </button>
          );
        })}
      </div>
      {!premiumOk && (
        <div style={{
          marginTop: 10,
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          color: 'var(--menu-text-muted, #94a3b8)',
          fontSize: 12,
        }}>
          <Lock size={12} /> Нужен Premium, чтобы выбрать цвет огня
        </div>
      )}
    </div>
  );
}
