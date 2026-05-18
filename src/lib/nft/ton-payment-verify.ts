/**
 * TON payment verification via TonCenter (incoming transfers to an address).
 */

export interface TonVerifyOptions {
  /** Receiver address (master or seller) */
  toAddress: string;
  /** Minimum amount in TON */
  minAmountTon: number;
  /** Comment must contain this substring (payment_id / memo) */
  commentContains: string;
  /** Optional exact tx hash from TonConnect */
  txHash?: string;
  /** Only consider txs after this unix timestamp (seconds) */
  sinceUnix?: number;
}

export interface TonVerifyResult {
  ok: boolean;
  txHash?: string;
  amountTon?: number;
  from?: string;
  error?: string;
}

function getMasterAddress(): string {
  let addr =
    process.env.MASTER_TON_ADDRESS ||
    process.env.TON_MASTER_ADDRESS ||
    process.env.MASTER_TON_WALLET ||
    '';
  if (addr.startsWith('UQ')) {
    addr = 'EQ' + addr.slice(2);
  }
  return addr.trim();
}

function getApiKey(): string {
  return (
    process.env.TONCENTER_API_KEY ||
    process.env.NEXT_PUBLIC_TONCENTER_API_KEY ||
    process.env.NEXT_PUBLIC_TON_API_KEY ||
    ''
  );
}

function nanotonToTon(nanoton: string): number {
  return parseInt(nanoton, 10) / 1_000_000_000;
}

function normalizeAddress(addr: string): string {
  const a = (addr || '').trim();
  if (a.startsWith('UQ')) return 'EQ' + a.slice(2);
  return a;
}

function extractComment(inMsg: Record<string, unknown> | undefined): string {
  if (!inMsg) return '';
  const msg = inMsg.message;
  if (typeof msg === 'string') return msg;
  if (msg && typeof msg === 'object' && 'message' in (msg as object)) {
    return String((msg as { message?: string }).message || '');
  }
  return '';
}

/**
 * Verify an incoming TON transfer to `toAddress` with expected comment and amount.
 */
export async function verifyTonIncomingPayment(
  options: TonVerifyOptions
): Promise<TonVerifyResult> {
  const apiKey = getApiKey();
  const toAddress = normalizeAddress(options.toAddress);
  if (!toAddress) {
    return { ok: false, error: 'TON receiver address not configured' };
  }

  const endpoint = process.env.NEXT_PUBLIC_TON_API_URL || 'https://toncenter.com/api/v2';
  const limit = 50;
  const url = `${endpoint}/getTransactions?address=${encodeURIComponent(toAddress)}&limit=${limit}${apiKey ? `&api_key=${apiKey}` : ''}`;

  try {
    const response = await fetch(url, { method: 'GET', headers: { Accept: 'application/json' } });
    if (!response.ok) {
      return { ok: false, error: `TonCenter HTTP ${response.status}` };
    }

    const data = await response.json();
    if (!data.ok || !Array.isArray(data.result)) {
      return { ok: false, error: 'Invalid TonCenter response' };
    }

    const since = options.sinceUnix || Math.floor(Date.now() / 1000) - 900;

    for (const tx of data.result) {
      const inMsg = tx.in_msg as Record<string, unknown> | undefined;
      if (!inMsg?.value || inMsg.value === '0') continue;

      const utime = parseInt(String(tx.utime || 0), 10);
      if (utime < since) continue;

      const txId = tx.transaction_id as { hash?: string } | undefined;
      const hash = txId?.hash || '';

      if (options.txHash && hash && hash !== options.txHash) continue;

      const comment = extractComment(inMsg);
      if (!comment.includes(options.commentContains)) continue;

      const amountTon = nanotonToTon(String(inMsg.value));
      if (amountTon + 1e-9 < options.minAmountTon) continue;

      return {
        ok: true,
        txHash: hash,
        amountTon,
        from: String(inMsg.source || ''),
      };
    }

    return { ok: false, error: 'Payment not found yet' };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : String(e),
    };
  }
}

export function getNftGenerationPaymentId(dbUserId: number, theme: string): string {
  return `nftgen_${dbUserId}_${theme}_${Date.now()}`;
}

export function getMarketplacePaymentId(listingId: number, buyerUserId: number): string {
  return `nftbuy_${listingId}_${buyerUserId}`;
}

export { getMasterAddress };
