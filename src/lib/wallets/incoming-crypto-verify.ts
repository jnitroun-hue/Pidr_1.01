/**
 * Проверка входящих платежей за генерацию NFT: GRAM/TON, SOL, TRX, USDT (TRC-20).
 */
import { Cell } from '@ton/core';
import { resolveMasterAddress } from '@/lib/wallets/master-addresses';
import { getMasterAddress, verifyTonIncomingPayment, type TonVerifyResult } from '@/lib/nft/ton-payment-verify';
import { isTonFamily } from '@/lib/nft/crypto-gen-costs';

const USDT_TRC20 = 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t';

function isTonConnectBoc(value?: string): boolean {
  if (!value) return false;
  return value.length > 80 || /^te6/i.test(value);
}

function extractComment(inMsg: Record<string, unknown> | undefined): string {
  if (!inMsg) return '';
  const msgData = inMsg.msg_data as Record<string, unknown> | undefined;
  const raw = [inMsg.message, inMsg.comment, msgData?.text, msgData?.comment];
  for (const item of raw) {
    if (typeof item === 'string' && item.trim()) return item.trim();
  }
  const body = msgData?.body;
  if (typeof body === 'string' && body.length > 0) {
    try {
      const cell = Cell.fromBase64(body);
      const slice = cell.beginParse();
      if (slice.remainingBits >= 32 && slice.loadUint(32) === 0) {
        return slice.loadStringTail().trim();
      }
    } catch {
      /* ignore */
    }
  }
  return '';
}

async function verifyTonFamily(options: {
  minAmount: number;
  commentContains: string;
  txHash?: string;
  sinceUnix?: number;
}): Promise<TonVerifyResult> {
  const toAddress = getMasterAddress();
  const result = await verifyTonIncomingPayment({
    toAddress,
    minAmountTon: options.minAmount * 0.98,
    commentContains: options.commentContains,
    txHash: isTonConnectBoc(options.txHash) ? undefined : options.txHash,
    sinceUnix: options.sinceUnix,
  });
  if (result.ok) return result;

  // Telegram Wallet часто отправляет без memo — принимаем уникальную сумму в окне времени.
  if (!toAddress) return result;
  const apiKey =
    process.env.TONCENTER_API_KEY ||
    process.env.NEXT_PUBLIC_TONCENTER_API_KEY ||
    process.env.NEXT_PUBLIC_TON_API_KEY ||
    '';
  const endpoint = process.env.NEXT_PUBLIC_TON_API_URL || 'https://toncenter.com/api/v2';
  const url = `${endpoint}/getTransactions?address=${encodeURIComponent(toAddress)}&limit=50${apiKey ? `&api_key=${apiKey}` : ''}`;
  try {
    const response = await fetch(url, { headers: { Accept: 'application/json' } });
    if (!response.ok) return result;
    const data = await response.json();
    if (!data.ok || !Array.isArray(data.result)) return result;
    const since = options.sinceUnix || Math.floor(Date.now() / 1000) - 1200;
    for (const tx of data.result) {
      const inMsg = tx.in_msg as Record<string, unknown> | undefined;
      if (!inMsg?.value || inMsg.value === '0') continue;
      const utime = parseInt(String(tx.utime || 0), 10);
      if (utime < since) continue;
      const amountTon = parseInt(String(inMsg.value), 10) / 1_000_000_000;
      if (amountTon + 1e-9 < options.minAmount * 0.98) continue;
      const comment = extractComment(inMsg);
      if (comment && !comment.includes(options.commentContains)) continue;
      const hash = (tx.transaction_id as { hash?: string } | undefined)?.hash || '';
      return { ok: true, txHash: hash, amountTon, from: String(inMsg.source || '') };
    }
  } catch {
    /* keep original result */
  }
  return result;
}

async function solanaRpc(method: string, params: unknown[]): Promise<unknown> {
  const endpoint =
    process.env.SOLANA_RPC_URL ||
    process.env.HELIUS_RPC_URL ||
    'https://api.mainnet-beta.solana.com';
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
  });
  if (!response.ok) throw new Error(`Solana RPC HTTP ${response.status}`);
  const data = await response.json();
  if (data.error) throw new Error(data.error.message || 'Solana RPC error');
  return data.result;
}

async function verifySol(options: {
  toAddress: string;
  minAmount: number;
  commentContains: string;
  sinceUnix?: number;
}): Promise<TonVerifyResult> {
  const since = options.sinceUnix || Math.floor(Date.now() / 1000) - 1200;
  const sigs = (await solanaRpc('getSignaturesForAddress', [
    options.toAddress,
    { limit: 30 },
  ])) as Array<{ signature: string; blockTime?: number; err?: unknown }>;

  for (const sig of sigs || []) {
    if (sig.err) continue;
    if ((sig.blockTime || 0) < since) continue;
    const tx = (await solanaRpc('getTransaction', [
      sig.signature,
      { encoding: 'jsonParsed', maxSupportedTransactionVersion: 0 },
    ])) as {
      meta?: { preBalances?: number[]; postBalances?: number[]; err?: unknown };
      transaction?: { message?: { accountKeys?: Array<string | { pubkey?: string }>; instructions?: Array<Record<string, unknown>> } };
    } | null;
    if (!tx || tx.meta?.err) continue;

    const keys = (tx.transaction?.message?.accountKeys || []).map((k) =>
      typeof k === 'string' ? k : String(k?.pubkey || '')
    );
    const destIdx = keys.findIndex((k) => k === options.toAddress);
    if (destIdx < 0) continue;
    const lamports = (tx.meta?.postBalances?.[destIdx] || 0) - (tx.meta?.preBalances?.[destIdx] || 0);
    const amount = lamports / 1_000_000_000;
    if (amount + 1e-9 < options.minAmount * 0.98) continue;

    const instructions = tx.transaction?.message?.instructions || [];
    const memo = instructions
      .map((ix) => {
        const parsed = ix.parsed as { type?: string; info?: { memo?: string } } | string | undefined;
        if (typeof parsed === 'string') return parsed;
        if (parsed && typeof parsed === 'object' && parsed.info?.memo) return String(parsed.info.memo);
        if (typeof ix.data === 'string') return ix.data;
        return '';
      })
      .filter(Boolean)
      .join(' ');

    if (memo && !memo.includes(options.commentContains) && options.commentContains) {
      continue;
    }

    return {
      ok: true,
      txHash: sig.signature,
      amountTon: amount,
      from: keys[0] || '',
    };
  }

  return { ok: false, error: 'SOL payment not found yet' };
}

function tronHeaders(): Record<string, string> {
  const key = process.env.TRONGRID_API_KEY || process.env.TRON_GRID_API || process.env.TRON_API_KEY || '';
  return key ? { 'TRON-PRO-API-KEY': key } : {};
}

function hexToUtf8(hex: string): string {
  try {
    const clean = hex.startsWith('0x') ? hex.slice(2) : hex;
    return Buffer.from(clean, 'hex').toString('utf8').replace(/\0/g, '').trim();
  } catch {
    return '';
  }
}

async function verifyTrx(options: {
  toAddress: string;
  minAmount: number;
  commentContains: string;
  sinceUnix?: number;
}): Promise<TonVerifyResult> {
  const sinceMs = (options.sinceUnix || Math.floor(Date.now() / 1000) - 1200) * 1000;
  const url = `https://api.trongrid.io/v1/accounts/${encodeURIComponent(options.toAddress)}/transactions?only_to=true&limit=50`;
  const response = await fetch(url, { headers: { Accept: 'application/json', ...tronHeaders() } });
  if (!response.ok) return { ok: false, error: `TronGrid HTTP ${response.status}` };
  const data = await response.json();
  const rows = Array.isArray(data?.data) ? data.data : [];

  for (const row of rows) {
    const ts = Number(row.block_timestamp || 0);
    if (ts < sinceMs) continue;
    const contracts = row.raw_data?.contract || [];
    for (const contract of contracts) {
      const value = contract?.parameter?.value;
      if (!value) continue;
      const amountSun = Number(value.amount || 0);
      const amount = amountSun / 1_000_000;
      if (amount + 1e-9 < options.minAmount * 0.98) continue;
      const memo = hexToUtf8(String(row.raw_data?.data || ''));
      if (memo && options.commentContains && !memo.includes(options.commentContains)) continue;
      return {
        ok: true,
        txHash: String(row.txID || row.transaction_id || ''),
        amountTon: amount,
        from: String(value.owner_address || ''),
      };
    }
  }
  return { ok: false, error: 'TRX payment not found yet' };
}

async function verifyUsdt(options: {
  toAddress: string;
  minAmount: number;
  commentContains: string;
  sinceUnix?: number;
}): Promise<TonVerifyResult> {
  const sinceMs = (options.sinceUnix || Math.floor(Date.now() / 1000) - 1200) * 1000;
  const url = `https://api.trongrid.io/v1/accounts/${encodeURIComponent(options.toAddress)}/transactions/trc20?only_to=true&limit=50&contract_address=${USDT_TRC20}`;
  const response = await fetch(url, { headers: { Accept: 'application/json', ...tronHeaders() } });
  if (!response.ok) return { ok: false, error: `TronGrid HTTP ${response.status}` };
  const data = await response.json();
  const rows = Array.isArray(data?.data) ? data.data : [];

  for (const row of rows) {
    const ts = Number(row.block_timestamp || 0);
    if (ts < sinceMs) continue;
    if (String(row.to || '').toLowerCase() !== options.toAddress.toLowerCase()) continue;
    const decimals = Number(row.token_info?.decimals ?? 6);
    const amount = Number(row.value || 0) / 10 ** decimals;
    if (amount + 1e-9 < options.minAmount * 0.98) continue;
    return {
      ok: true,
      txHash: String(row.transaction_id || ''),
      amountTon: amount,
      from: String(row.from || ''),
    };
  }
  return { ok: false, error: 'USDT payment not found yet' };
}

export async function verifyGenerationCryptoPayment(params: {
  coin: string;
  minAmount: number;
  commentContains: string;
  txHash?: string;
  sinceUnix?: number;
}): Promise<TonVerifyResult & { coin: string; masterAddress?: string }> {
  const coin = params.coin.toUpperCase();
  if (isTonFamily(coin)) {
    const verified = await verifyTonFamily({
      minAmount: params.minAmount,
      commentContains: params.commentContains,
      txHash: params.txHash,
      sinceUnix: params.sinceUnix,
    });
    return { ...verified, coin: 'GRAM', masterAddress: getMasterAddress() };
  }

  const master = resolveMasterAddress(coin);
  if (!master?.address) {
    return { ok: false, error: `MASTER_${coin}_ADDRESS не настроен`, coin };
  }

  try {
    if (coin === 'SOL') {
      const verified = await verifySol({
        toAddress: master.address,
        minAmount: params.minAmount,
        commentContains: params.commentContains,
        sinceUnix: params.sinceUnix,
      });
      return { ...verified, coin, masterAddress: master.address };
    }
    if (coin === 'TRX') {
      const verified = await verifyTrx({
        toAddress: master.address,
        minAmount: params.minAmount,
        commentContains: params.commentContains,
        sinceUnix: params.sinceUnix,
      });
      return { ...verified, coin, masterAddress: master.address };
    }
    if (coin === 'USDT') {
      const verified = await verifyUsdt({
        toAddress: master.address,
        minAmount: params.minAmount,
        commentContains: params.commentContains,
        sinceUnix: params.sinceUnix,
      });
      return { ...verified, coin, masterAddress: master.address };
    }
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'Ошибка проверки сети',
      coin,
      masterAddress: master.address,
    };
  }

  return { ok: false, error: `Сеть ${coin} не поддерживается`, coin };
}
