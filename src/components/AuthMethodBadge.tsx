'use client';

import { FaTelegram, FaVk, FaGlobe, FaGoogle } from 'react-icons/fa';
import type { AuthMethod } from '@/lib/user/resolve-auth-method';
import { authMethodLabel } from '@/lib/user/resolve-auth-method';
import styles from './AuthMethodBadge.module.css';

interface AuthMethodBadgeProps {
  method: AuthMethod;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export default function AuthMethodBadge({
  method,
  size = 'sm',
  className = '',
}: AuthMethodBadgeProps) {
  const Icon =
    method === 'telegram' ? FaTelegram
      : method === 'vk' ? FaVk
        : method === 'google' ? FaGoogle
          : FaGlobe;

  return (
    <span
      className={`${styles.badge} ${styles[size]} ${styles[method]} ${className}`.trim()}
      title={authMethodLabel(method)}
      aria-label={authMethodLabel(method)}
    >
      <Icon aria-hidden />
    </span>
  );
}
