'use client';

import styles from './PremiumAvatarFire.module.css';

interface PremiumAvatarFireProps {
  children: React.ReactNode;
  size?: number;
  active?: boolean;
}

export default function PremiumAvatarFire({ children, size = 32, active = true }: PremiumAvatarFireProps) {
  if (!active) return <>{children}</>;

  return (
    <div className={styles.wrap} style={{ width: size + 16, height: size + 16 }}>
      <div className={styles.ring1} />
      <div className={styles.ring2} />
      <div className={styles.ring3} />
      <div className={styles.core} style={{ width: size, height: size }}>
        {children}
      </div>
    </div>
  );
}
