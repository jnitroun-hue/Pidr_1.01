/**
 * GET /api/wallet/deposit-info
 * Master-адреса для пополнения — только с сервера (Vercel env).
 */
import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-utils';
import {
  buildDepositMemo,
  normalizeDepositCoin,
  resolveAllMasterAddresses,
  resolveMasterAddress,
} from '@/lib/wallets/master-addresses';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function noStoreJson(body: unknown, init?: ResponseInit) {
  const response = NextResponse.json(body, init);
  response.headers.set('Cache-Control', 'private, no-store, no-cache, must-revalidate');
  return response;
}

export async function GET(req: NextRequest) {
  try {
    const auth = requireAuth(req);
    if (auth.error || !auth.userId) {
      return noStoreJson({ success: false, message: auth.error || 'Требуется авторизация' }, { status: 401 });
    }

    const url = new URL(req.url);
    const coinParam = url.searchParams.get('coin');

    if (coinParam) {
      const normalized = normalizeDepositCoin(coinParam);
      const resolved = resolveMasterAddress(coinParam);
      if (!resolved) {
        return noStoreJson(
          {
            success: false,
            code: 'ADDRESS_NOT_CONFIGURED',
            message: `Адрес для ${normalized ?? coinParam} не настроен на сервере. Добавьте переменную окружения в Vercel (MASTER_TON_ADDRESS, MASTER_TRX_ADDRESS и т.д.).`,
          },
          { status: 503 }
        );
      }

      const memo = buildDepositMemo(auth.userId, coinParam);
      return noStoreJson({
        success: true,
        coin: resolved.coin,
        apiKey: resolved.apiKey,
        network: resolved.network,
        address: resolved.address,
        memo: memo ?? null,
        envKey: resolved.envKey,
        telegramWallet: ['GRAM', 'TON', 'USDT', 'TRX', 'ETH', 'SOL'].includes(resolved.coin),
      });
    }

    const all = resolveAllMasterAddresses();
    const addresses = all.map((item) => ({
      coin: item.coin,
      apiKey: item.apiKey,
      network: item.network,
      address: item.address,
      memo: buildDepositMemo(auth.userId, item.coin) ?? null,
      envKey: item.envKey,
      telegramWallet: ['GRAM', 'TON', 'USDT', 'TRX', 'ETH', 'SOL'].includes(item.coin),
    }));

    return noStoreJson({
      success: true,
      addresses,
      configured: addresses.length,
      userId: auth.userId,
    });
  } catch (error) {
    console.error('❌ [deposit-info]', error);
    return noStoreJson(
      {
        success: false,
        message: error instanceof Error ? error.message : 'Ошибка получения адресов',
      },
      { status: 500 }
    );
  }
}
