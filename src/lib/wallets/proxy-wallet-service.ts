import { resolveMasterAddress } from '@/lib/wallets/master-addresses';

/** @deprecated Используйте resolveMasterAddress из master-addresses.ts */
export function getProxyMasterAddress(coin: string): string {
  const resolved = resolveMasterAddress(coin);
  if (!resolved) {
    throw new Error(`Master address not configured for ${coin}`);
  }
  return resolved.address;
}
