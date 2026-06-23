export type AuthMethod = 'telegram' | 'vk' | 'google' | 'web';

export interface UserAuthFields {
  auth_method?: string | null;
  telegram_id?: string | number | null;
  vk_id?: string | number | null;
}

export function resolveAuthMethod(user: UserAuthFields | null | undefined): AuthMethod {
  if (!user) return 'web';

  const raw = String(user.auth_method || '').toLowerCase().trim();
  if (raw === 'telegram' || raw === 'vk' || raw === 'google' || raw === 'web') {
    return raw;
  }

  if (user.vk_id != null && String(user.vk_id).length > 0) return 'vk';
  if (user.telegram_id != null && String(user.telegram_id).length > 0) return 'telegram';
  return 'web';
}

export function authMethodLabel(method: AuthMethod): string {
  switch (method) {
    case 'telegram':
      return 'Telegram';
    case 'vk':
      return 'ВКонтакте';
    case 'google':
      return 'Google';
    default:
      return 'WEB';
  }
}
