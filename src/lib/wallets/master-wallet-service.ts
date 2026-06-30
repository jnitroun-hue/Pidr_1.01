import {
  buildDepositMemo,
  normalizeDepositCoin,
  resolveMasterAddress,
  type DepositCoinKey,
} from '@/lib/wallets/master-addresses';

/** @deprecated Используйте /api/wallet/deposit-info на клиенте */
export class MasterWalletService {
  getPaymentAddress(userId: string, coin: string) {
    if (typeof window !== 'undefined') {
      throw new Error('MasterWalletService нельзя вызывать в браузере — используйте /api/wallet/deposit-info');
    }

    const normalized = normalizeDepositCoin(coin);
    if (!normalized) {
      throw new Error(`Unsupported coin: ${coin}`);
    }

    const resolved = resolveMasterAddress(normalized);
    if (!resolved) {
      throw new Error(`Master address not configured for ${normalized}`);
    }

    const memo = buildDepositMemo(userId, normalized);

    return {
      address: resolved.address,
      memo: memo ?? '',
      tag: memo ?? '',
      note: `Платёж пользователя ${userId}`,
      coin: normalized as DepositCoinKey,
    };
  }
}

export function getPaymentInfo(userId: string, coin: string) {
  return new MasterWalletService().getPaymentAddress(userId, coin);
}
