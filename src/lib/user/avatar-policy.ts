/** Пользователь задал свой аватар — не перезаписываем фото из Telegram/VK. */
export function isUserCustomAvatar(url: string | null | undefined): boolean {
  if (!url || typeof url !== 'string') return false;
  const trimmed = url.trim();
  if (trimmed.startsWith('data:')) return true;
  if (trimmed.includes('/avatars/user-')) return true;
  if (trimmed.includes('/avatars/characters/')) return true;
  if (trimmed.includes('supabase.co/storage') && trimmed.includes('/avatars/')) return true;
  return false;
}

/** URL картинки аватара (http, data, локальный SVG-персонаж). */
export function isAvatarImageUrl(url: string | null | undefined): boolean {
  if (!url || typeof url !== 'string') return false;
  const trimmed = url.trim();
  return (
    trimmed.startsWith('http') ||
    trimmed.startsWith('data:') ||
    trimmed.startsWith('/avatars/') ||
    trimmed.startsWith('/img/')
  );
}

export function shouldSyncPlatformPhoto(
  currentAvatarUrl: string | null | undefined,
  platformPhotoUrl: string | null | undefined
): boolean {
  if (!platformPhotoUrl || !platformPhotoUrl.startsWith('http')) return false;
  if (isUserCustomAvatar(currentAvatarUrl)) return false;
  return platformPhotoUrl !== currentAvatarUrl;
}
