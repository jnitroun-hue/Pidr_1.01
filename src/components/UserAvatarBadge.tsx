'use client';

import AuthMethodBadge from './AuthMethodBadge';
import type { AuthMethod } from '@/lib/user/resolve-auth-method';
import styles from './UserAvatarBadge.module.css';

interface UserAvatarBadgeProps {
  username?: string | null;
  avatarUrl?: string | null;
  authMethod: AuthMethod;
  size?: 'sm' | 'md' | 'lg';
  showAuthBadge?: boolean;
}

export default function UserAvatarBadge({
  username,
  avatarUrl,
  authMethod,
  size = 'sm',
  showAuthBadge = true,
}: UserAvatarBadgeProps) {
  const label = username || '?';
  const initial = label.trim().charAt(0).toUpperCase() || '?';
  const hasImage = Boolean(avatarUrl && (avatarUrl.startsWith('http') || avatarUrl.startsWith('data:')));
  const emojiAvatar = Boolean(avatarUrl && !hasImage && avatarUrl.length <= 8 && !avatarUrl.includes('/'));

  return (
    <div className={styles.wrap}>
      <div className={`${styles.avatar} ${styles[size]}`}>
        {hasImage ? (
          <img src={avatarUrl!} alt="" />
        ) : emojiAvatar ? (
          <span style={{ fontSize: size === 'lg' ? '40px' : size === 'md' ? '22px' : '16px' }}>{avatarUrl}</span>
        ) : (
          initial
        )}
      </div>
      {showAuthBadge && (
        <span className={styles.authBadge}>
          <AuthMethodBadge method={authMethod} size="sm" />
        </span>
      )}
    </div>
  );
}
