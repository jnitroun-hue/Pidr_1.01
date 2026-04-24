export interface MiniAppContext {
  isTelegramMiniApp: boolean;
  isVKMiniApp: boolean;
}

export function detectMiniAppContext(): MiniAppContext {
  if (typeof window === 'undefined') {
    return {
      isTelegramMiniApp: false,
      isVKMiniApp: false,
    };
  }

  const isTelegramMiniApp = Boolean(window.Telegram?.WebApp?.initDataUnsafe?.user);
  const query = new URLSearchParams(window.location.search);
  const isVKMiniApp = query.has('vk_user_id') && query.has('sign');

  return {
    isTelegramMiniApp,
    isVKMiniApp,
  };
}

export function getTelegramBotUsername(): string {
  return process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME || 'NotPdr_1_01_bot';
}

export function buildVkOAuthUrl(redirectUri: string): string | null {
  const clientId = process.env.NEXT_PUBLIC_VK_CLIENT_ID;
  if (!clientId) return null;

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    v: '5.199',
    scope: 'email',
  });

  return `https://oauth.vk.com/authorize?${params.toString()}`;
}
