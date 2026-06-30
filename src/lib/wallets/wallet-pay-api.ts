/**
 * Telegram Wallet Pay — https://pay.wallet.tg
 * Серверный клиент (Store API Key только на backend).
 */

const WALLET_PAY_BASE = process.env.WALLET_PAY_BASE_URL || 'https://pay.wallet.tg';

export type WalletPayCreateOrderParams = {
  amount: { currencyCode: string; amount: string };
  description: string;
  externalId: string;
  timeoutSeconds: number;
  customerTelegramUserId: number;
  returnUrl?: string;
  failReturnUrl?: string;
  customData?: string;
  autoConversionCurrency?: 'TON' | 'USDT' | 'BTC';
};

export type WalletPayOrderData = {
  id: string;
  status: string;
  payLink?: string;
  directPayLink?: string;
  amount?: { currencyCode: string; amount: string };
};

type WalletPayResponse = {
  status: string;
  message?: string;
  data?: WalletPayOrderData;
};

function getApiKey(): string | null {
  return process.env.WALLET_PAY_API_KEY || process.env.WPAY_STORE_API_KEY || null;
}

export function isWalletPayConfigured(): boolean {
  return Boolean(getApiKey());
}

export async function createWalletPayOrder(
  params: WalletPayCreateOrderParams
): Promise<{ ok: true; order: WalletPayOrderData; payLink: string } | { ok: false; error: string }> {
  const apiKey = getApiKey();
  if (!apiKey) {
    return { ok: false, error: 'Wallet Pay не настроен (WALLET_PAY_API_KEY)' };
  }

  const body: Record<string, unknown> = {
    amount: {
      currencyCode: params.amount.currencyCode,
      amount: params.amount.amount,
    },
    description: params.description.slice(0, 100),
    externalId: params.externalId.slice(0, 255),
    timeoutSeconds: params.timeoutSeconds,
    customerTelegramUserId: params.customerTelegramUserId,
  };

  if (params.returnUrl) body.returnUrl = params.returnUrl;
  if (params.failReturnUrl) body.failReturnUrl = params.failReturnUrl;
  if (params.customData) body.customData = params.customData.slice(0, 255);
  if (params.autoConversionCurrency) {
    body.autoConversionCurrency = params.autoConversionCurrency;
  }

  try {
    const resp = await fetch(`${WALLET_PAY_BASE}/wpay/store-api/v1/order`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'Wpay-Store-Api-Key': apiKey,
      },
      body: JSON.stringify(body),
    });

    const json = (await resp.json()) as WalletPayResponse;

    if (!resp.ok || (json.status !== 'SUCCESS' && json.status !== 'ALREADY')) {
      return {
        ok: false,
        error: json.message || `Wallet Pay HTTP ${resp.status}`,
      };
    }

    const order = json.data;
    if (!order) {
      return { ok: false, error: 'Пустой ответ Wallet Pay' };
    }

    const payLink = order.payLink || order.directPayLink || '';
    if (!payLink) {
      return { ok: false, error: 'Wallet Pay не вернул payLink' };
    }

    return { ok: true, order, payLink };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { ok: false, error: message };
  }
}

/** HMAC-SHA256 проверка webhook Wallet Pay */
export async function verifyWalletPayWebhook(params: {
  method: string;
  path: string;
  timestamp: string;
  rawBody: string;
  signature: string;
}): Promise<boolean> {
  const apiKey = getApiKey();
  if (!apiKey) return false;

  const bodyBase64 = Buffer.from(params.rawBody, 'utf8').toString('base64');
  const stringToSign = `${params.method}.${params.path}.${params.timestamp}.${bodyBase64}`;

  const crypto = await import('crypto');
  const expected = crypto
    .createHmac('sha256', apiKey)
    .update(stringToSign)
    .digest('base64');

  return expected === params.signature;
}
