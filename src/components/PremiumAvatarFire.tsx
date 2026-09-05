'use client';

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

const HUE: Record<string, string> = {
  red: 'hue-rotate(-8deg) saturate(1.25)',
  orange: 'hue-rotate(0deg) saturate(1.15)',
  gold: 'hue-rotate(8deg) saturate(1.2) brightness(1.08)',
  yellow: 'hue-rotate(22deg) saturate(1.25) brightness(1.12)',
  green: 'hue-rotate(95deg) saturate(1.3)',
  blue: 'hue-rotate(198deg) saturate(1.35)',
  cyan: 'hue-rotate(168deg) saturate(1.3)',
  purple: 'hue-rotate(255deg) saturate(1.25)',
  pink: 'hue-rotate(300deg) saturate(1.3)',
  white: 'saturate(0.15) brightness(1.35)',
};

export default function PremiumAvatarFire({
  children,
  size = 32,
  active = true,
  color,
}: PremiumAvatarFireProps) {
  if (!active) return <>{children}</>;

  const palette = getFlamePalette(resolvePremiumFlame(color));
  const flameId = resolvePremiumFlame(color);
  const box = Math.round(size * 2.15);

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
        ['--flame-filter' as string]: HUE[flameId] ?? HUE.gold,
      }}
    >
      <div className={styles.heat} aria-hidden />
      <div className={styles.wreath} aria-hidden>
        <img src="/fx/premium-flame-a.png" alt="" className={`${styles.tongue} ${styles.leftOuter}`} />
        <img src="/fx/premium-flame-b.png" alt="" className={`${styles.tongue} ${styles.leftInner}`} />
        <img src="/fx/premium-flame-a.png" alt="" className={`${styles.tongue} ${styles.rightInner}`} />
        <img src="/fx/premium-flame-b.png" alt="" className={`${styles.tongue} ${styles.rightOuter}`} />
      </div>
      <div className={styles.crown} aria-hidden>
        <img src="/fx/premium-flame-a.png" alt="" className={styles.crownTall} />
        <img src="/fx/premium-flame-b.png" alt="" className={styles.crownWide} />
      </div>
      <div className={styles.core} style={{ width: size, height: size }}>
        {children}
      </div>
    </div>
  );
}
