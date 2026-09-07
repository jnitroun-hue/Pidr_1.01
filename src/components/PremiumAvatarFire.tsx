'use client';

import { useId } from 'react';
import styles from './PremiumAvatarFire.module.css';
import {
  getFlamePalette,
  resolvePremiumFlame,
  type PremiumFlameColorId,
} from '@/lib/premium/flame';

interface PremiumAvatarFireProps {
  children: React.ReactNode;
  size?: number;
  active?: boolean;
  color?: PremiumFlameColorId | string | null;
}

/** Исходный спрайт — красно-оранжевый огонь; палитры получаем поворотом оттенка. */
const HUE: Record<PremiumFlameColorId, string> = {
  red: 'hue-rotate(-12deg) saturate(1.25)',
  orange: 'hue-rotate(6deg) saturate(1.1)',
  gold: 'hue-rotate(20deg) saturate(1.1) brightness(1.06)',
  yellow: 'hue-rotate(34deg) saturate(1.15) brightness(1.1)',
  green: 'hue-rotate(102deg) saturate(1.2) brightness(1.04)',
  blue: 'hue-rotate(208deg) saturate(1.3) brightness(1.08)',
  cyan: 'hue-rotate(172deg) saturate(1.25) brightness(1.08)',
  purple: 'hue-rotate(258deg) saturate(1.2) brightness(1.05)',
  pink: 'hue-rotate(308deg) saturate(1.25) brightness(1.05)',
  white: 'saturate(0) brightness(1.55) contrast(1.05)',
};

const FIRE_SPEED_S = 2.8;

/** Детерминированный сдвиг анимации, чтобы несколько аватаров за столом не горели синхронно. */
function delayFromId(id: string, span: number): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return -((h % 1000) / 1000) * span;
}

export default function PremiumAvatarFire({
  children,
  size = 32,
  active = true,
  color,
}: PremiumAvatarFireProps) {
  const uid = useId();
  if (!active) return <>{children}</>;

  const flameId = resolvePremiumFlame(color);
  const palette = getFlamePalette(flameId);
  const box = Math.round(size * 2.3);
  const backDelay = delayFromId(uid, FIRE_SPEED_S);
  const frontDelay = delayFromId(`${uid}/front`, FIRE_SPEED_S);

  return (
    <div
      className={styles.wrap}
      style={{
        width: box,
        height: box,
        ['--avatar' as string]: `${size}px`,
        ['--flame-hot' as string]: palette.hot,
        ['--flame-mid' as string]: palette.mid,
        ['--flame-core' as string]: palette.core,
        ['--flame-base' as string]: palette.base,
        ['--flame-filter' as string]: HUE[flameId],
        ['--fire-speed' as string]: `${FIRE_SPEED_S}s`,
        ['--fire-delay' as string]: `${backDelay.toFixed(3)}s`,
        ['--fire-delay-front' as string]: `${frontDelay.toFixed(3)}s`,
      }}
    >
      <div className={styles.heat} aria-hidden />
      <div className={`${styles.sprite} ${styles.back}`} aria-hidden />
      <div className={styles.core} style={{ width: size, height: size }}>
        {children}
      </div>
      <div className={`${styles.sprite} ${styles.front}`} aria-hidden />
    </div>
  );
}
