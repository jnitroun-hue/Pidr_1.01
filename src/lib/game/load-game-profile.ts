import { getApiHeaders } from '@/lib/api-headers';
import { fetchPremiumStatus, isPremiumUsable } from '@/lib/premium/refresh-premium';

export interface GameUserProfile {
  coins: number;
  avatar: string;
  username: string;
  telegramId: string;
  userId?: number;
  isPremium: boolean;
}

function resolvePremium(
  premiumStatus: Awaited<ReturnType<typeof fetchPremiumStatus>>,
  user: Record<string, unknown>
): boolean {
  return (
    isPremiumUsable(premiumStatus) ||
    (typeof user.premium_expires_at === 'string' &&
      new Date(user.premium_expires_at).getTime() > Date.now()) ||
    !!user.is_premium
  );
}

/** Единая загрузка профиля для игры — cookies/Telegram/VK, баланс и Premium с сервера */
export async function loadGameUserProfile(): Promise<GameUserProfile | null> {
  try {
    const meRes = await fetch('/api/user/me', {
      method: 'GET',
      credentials: 'include',
      headers: getApiHeaders(),
      cache: 'no-store',
    });

    if (!meRes.ok) return null;

    const me = await meRes.json();
    if (!me.success || !me.user) return null;

    const user = me.user as Record<string, unknown>;
    let coins = Number(user.coins) || 0;

    try {
      const balRes = await fetch('/api/user/balance', {
        method: 'GET',
        credentials: 'include',
        headers: getApiHeaders(),
        cache: 'no-store',
      });
      if (balRes.ok) {
        const bal = await balRes.json();
        if (bal.success && bal.data?.balance != null) {
          coins = Number(bal.data.balance) || coins;
        }
      }
    } catch {
      /* balance optional */
    }

    const premiumStatus = await fetchPremiumStatus();
    const isPremium = resolvePremium(premiumStatus, user);

    const username =
      (user.username as string) ||
      (user.firstName as string) ||
      (user.first_name as string) ||
      'Игрок';

    return {
      coins,
      avatar: (user.avatar_url as string) || '',
      username,
      telegramId: String(user.telegramId || user.telegram_id || ''),
      userId: user.id != null ? Number(user.id) : undefined,
      isPremium,
    };
  } catch {
    return null;
  }
}
