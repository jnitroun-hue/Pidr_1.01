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

export default function PremiumAvatarFire({
  children,
  size = 32,
  active = true,
  color,
}: PremiumAvatarFireProps) {
  if (!active) return <>{children}</>;

  const palette = getFlamePalette(resolvePremiumFlame(color));
  const pad = Math.max(22, Math.round(size * 0.85));

  return (
    <div
      className={styles.wrap}
      style={{
        width: size + pad,
        height: size + pad,
        ['--flame-hot' as string]: palette.hot,
        ['--flame-mid' as string]: palette.mid,
        ['--flame-core' as string]: palette.core,
        ['--flame-base' as string]: palette.base,
      }}
    >
      <div className={styles.halo} />
      <div className={styles.flames} aria-hidden>
        {Array.from({ length: 8 }, (_, i) => (
          <span key={i} className={styles.tongue} />
        ))}
      </div>
      <div className={styles.embers} aria-hidden>
        <span className={styles.ember} />
        <span className={styles.ember} />
        <span className={styles.ember} />
        <span className={styles.ember} />
        <span className={styles.ember} />
      </div>
      <div className={styles.core} style={{ width: size, height: size }}>
        {children}
      </div>
    </div>
  );
}
