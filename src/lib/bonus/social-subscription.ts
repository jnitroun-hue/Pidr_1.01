export type SocialBonusType = 'telegram_subscribe' | 'vk_subscribe';

interface BonusUserIdentity {
  telegram_id?: string | number | null;
  vk_id?: string | number | null;
}

export interface SubscriptionVerification {
  ok: boolean;
  configured: boolean;
  provider: 'telegram' | 'vk';
  subjectId?: string;
  error?: string;
  details?: Record<string, unknown>;
}

export function socialBonusConfig(type: SocialBonusType) {
  if (type === 'telegram_subscribe') {
    const link = process.env.NEXT_PUBLIC_TELEGRAM_CHANNEL_LINK?.trim() || '';
    return {
      configured: Boolean(
        link &&
        process.env.TELEGRAM_BOT_TOKEN?.trim() &&
        process.env.TELEGRAM_BONUS_CHANNEL_ID?.trim()
      ),
      link: link || null,
    };
  }

  const link = process.env.NEXT_PUBLIC_VK_GROUP_LINK?.trim() || '';
  return {
    configured: Boolean(
      link &&
      process.env.VK_BONUS_GROUP_ID?.trim() &&
      (process.env.VK_SERVICE_TOKEN?.trim() || process.env.VK_ACCESS_TOKEN?.trim())
    ),
    link: link || null,
  };
}

async function verifyTelegram(user: BonusUserIdentity): Promise<SubscriptionVerification> {
  const config = socialBonusConfig('telegram_subscribe');
  if (!config.configured) {
    return {
      ok: false,
      configured: false,
      provider: 'telegram',
      error: 'Проверка Telegram-подписки пока не настроена администратором.',
    };
  }

  const telegramId = String(user.telegram_id || '').trim();
  if (!telegramId) {
    return {
      ok: false,
      configured: true,
      provider: 'telegram',
      error: 'Привяжите Telegram-аккаунт к профилю, чтобы подтвердить подписку.',
    };
  }

  try {
    const token = process.env.TELEGRAM_BOT_TOKEN!.trim();
    const chatId = process.env.TELEGRAM_BONUS_CHANNEL_ID!.trim();
    const response = await fetch(
      `https://api.telegram.org/bot${token}/getChatMember?chat_id=${encodeURIComponent(chatId)}&user_id=${encodeURIComponent(telegramId)}`,
      { cache: 'no-store' }
    );
    const payload = await response.json();
    const status = String(payload?.result?.status || '');
    const member =
      payload?.ok === true &&
      ['creator', 'administrator', 'member'].includes(status);

    return {
      ok: member,
      configured: true,
      provider: 'telegram',
      subjectId: telegramId,
      error: member ? undefined : 'Подписка на Telegram-канал не найдена. Подпишитесь и повторите проверку.',
      details: { chatId, status },
    };
  } catch {
    return {
      ok: false,
      configured: true,
      provider: 'telegram',
      subjectId: telegramId,
      error: 'Telegram временно недоступен. Повторите проверку позже.',
    };
  }
}

async function verifyVk(user: BonusUserIdentity): Promise<SubscriptionVerification> {
  const config = socialBonusConfig('vk_subscribe');
  if (!config.configured) {
    return {
      ok: false,
      configured: false,
      provider: 'vk',
      error: 'Проверка подписки ВКонтакте пока не настроена администратором.',
    };
  }

  const vkId = String(user.vk_id || '').trim();
  if (!vkId) {
    return {
      ok: false,
      configured: true,
      provider: 'vk',
      error: 'Войдите через ВКонтакте или привяжите VK-аккаунт для проверки подписки.',
    };
  }

  try {
    const token = (process.env.VK_SERVICE_TOKEN || process.env.VK_ACCESS_TOKEN)!.trim();
    const groupId = process.env.VK_BONUS_GROUP_ID!.trim().replace(/^-/, '');
    const query = new URLSearchParams({
      group_id: groupId,
      user_id: vkId,
      access_token: token,
      v: '5.199',
    });
    const response = await fetch(`https://api.vk.com/method/groups.isMember?${query}`, {
      cache: 'no-store',
    });
    const payload = await response.json();
    const member = Number(payload?.response) === 1 || Number(payload?.response?.member) === 1;

    return {
      ok: member,
      configured: true,
      provider: 'vk',
      subjectId: vkId,
      error: member ? undefined : 'Подписка на сообщество ВКонтакте не найдена. Подпишитесь и повторите проверку.',
      details: { groupId, member },
    };
  } catch {
    return {
      ok: false,
      configured: true,
      provider: 'vk',
      subjectId: vkId,
      error: 'ВКонтакте временно недоступен. Повторите проверку позже.',
    };
  }
}

export function verifySocialSubscription(
  type: SocialBonusType,
  user: BonusUserIdentity
): Promise<SubscriptionVerification> {
  return type === 'telegram_subscribe' ? verifyTelegram(user) : verifyVk(user);
}
