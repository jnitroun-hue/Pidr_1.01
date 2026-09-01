/**
 * ============================================================
 * TON PAYMENT SERVICE - TONCENTER API
 * ============================================================
 * Система приема TON платежей через TonCenter API
 * Поддержка MEMO для идентификации пользователей
 */

import { Cell } from '@ton/core';
import { getSupabaseAdmin } from '../supabase';
import { resolveMasterAddress, tonAddressForTransfer } from '@/lib/wallets/master-addresses';
import { coinsFromCrypto, getExchangeRates } from '@/lib/pricing/exchange-rates';

export interface TonTransaction {
  hash: string;
  from: string;
  to: string;
  value: string; // в nanoton
  comment?: string; // memo
  timestamp: number;
}

type DepositIntent = {
  id: string;
  user_id: string | number;
  destination: string;
  expected_amount_nano: string | number;
  memo: string;
  status: string;
  created_at: string;
  expires_at: string;
};

function sameTonAddress(left: string, right: string): boolean {
  try {
    return tonAddressForTransfer(left) === tonAddressForTransfer(right);
  } catch {
    return left.trim() === right.trim();
  }
}

function normalizeComment(raw: string | undefined | null): string | undefined {
  if (!raw) return undefined;
  let text = raw.trim();
  if (!text) return undefined;
  try {
    text = decodeURIComponent(text.replace(/\+/g, ' ')).trim();
  } catch {
    /* keep raw */
  }
  return text || undefined;
}

function extractTonComment(inMsg: Record<string, unknown> | null | undefined): string | undefined {
  if (!inMsg) return undefined;

  const candidates: unknown[] = [
    inMsg.message,
    inMsg.comment,
    inMsg.memo,
  ];

  const msgData = inMsg.msg_data as Record<string, unknown> | undefined;
  if (msgData) {
    candidates.push(msgData.text, msgData.comment, msgData.message);
  }

  for (const candidate of candidates) {
    if (typeof candidate === 'string') {
      const text = normalizeComment(candidate);
      if (text) return text;
    }
  }

  const body = msgData?.body;
  if (typeof body === 'string' && body.length > 0) {
    try {
      const cell = Cell.fromBase64(body);
      const slice = cell.beginParse();
      if (slice.remainingBits >= 32) {
        const op = slice.loadUint(32);
        if (op === 0 && slice.remainingBits >= 8) {
          return normalizeComment(slice.loadStringTail());
        }
      }
    } catch {
      /* not a text-comment payload */
    }
  }

  return undefined;
}

function nanoClose(actual: bigint, expected: bigint): boolean {
  if (actual === expected) return true;
  const delta = actual > expected ? actual - expected : expected - actual;
  const pct = expected / BigInt(50); // 2%
  const floor = BigInt(30_000_000); // 0.03 TON
  const allowance = pct > floor ? pct : floor;
  return delta <= allowance;
}

function intentWindow(intent: DepositIntent, txTs: number): boolean {
  const created = new Date(intent.created_at).getTime() - 180_000;
  const expires = new Date(intent.expires_at).getTime() + 60_000;
  return txTs >= created && txTs <= expires;
}

export type TonReconcileOptions = {
  preferUserId?: string;
  intentId?: string;
};

export class TonPaymentService {
  private apiKey: string;
  private masterAddress: string;
  private apiEndpoint = 'https://toncenter.com/api/v2';

  constructor() {
    // ✅ ИСПРАВЛЕНО: Проверяем все возможные варианты имен переменных
    this.apiKey = process.env.TONCENTER_API_KEY || 
                  process.env.TON_CENTER_API || 
                  process.env.TONCENTER_API || 
                  '';
    this.masterAddress = resolveMasterAddress('TON')?.address || '';
    // И только во время сборки (build time), не в runtime
    const isBuildTime = typeof window === 'undefined' && process.env.NODE_ENV === 'production';
    if (isBuildTime) {
      if (!this.apiKey) {
        console.warn('⚠️ TONCENTER_API_KEY не настроен');
      }
      
      if (!this.masterAddress) {
        console.warn('⚠️ MASTER_TON_ADDRESS не настроен');
      }
    }
  }

  /**
   * Получить последние транзакции на мастер-адрес
   */
  async getRecentTransactions(limit: number = 100): Promise<TonTransaction[]> {
    try {
      const queryAddress = tonAddressForTransfer(this.masterAddress);
      const keyQ = this.apiKey ? `&api_key=${this.apiKey}` : '';
      const urls = [
        `${this.apiEndpoint}/getTransactions?address=${encodeURIComponent(queryAddress)}&limit=${limit}&archival=true${keyQ}`,
        `${this.apiEndpoint}/getTransactions?address=${encodeURIComponent(queryAddress)}&limit=${limit}${keyQ}`,
      ];

      console.log('🔍 Запрашиваем TON транзакции...');

      let data: { ok?: boolean; result?: unknown; error?: string } | null = null;
      let lastError: Error | null = null;
      for (const url of urls) {
        try {
          const response = await fetch(url, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
          });
          if (!response.ok) {
            lastError = new Error(`TonCenter API error: ${response.status}`);
            continue;
          }
          data = await response.json();
          if (data?.ok && Array.isArray(data.result)) break;
          lastError = new Error(typeof data?.error === 'string' ? data.error : 'Invalid TonCenter response');
          data = null;
        } catch (err) {
          lastError = err instanceof Error ? err : new Error(String(err));
        }
      }

      if (!data?.ok || !Array.isArray(data.result)) {
        throw lastError || new Error('Invalid TonCenter response');
      }

      // Парсим транзакции
      const transactions: TonTransaction[] = [];
      
      const rows = data.result as Array<{
        in_msg?: { value?: string; source?: string; destination?: string } & Record<string, unknown>;
        transaction_id?: { hash?: string };
        utime?: number | string;
      }>;

      for (const tx of rows) {
        if (tx.in_msg && tx.in_msg.value && tx.in_msg.value !== '0') {
          const comment = extractTonComment(tx.in_msg as Record<string, unknown>);
          transactions.push({
            hash: tx.transaction_id?.hash || '',
            from: tx.in_msg.source || 'unknown',
            to: tx.in_msg.destination || this.masterAddress,
            value: String(tx.in_msg.value),
            comment,
            timestamp: parseInt(String(tx.utime), 10) * 1000
          });
        }
      }

      console.log(`✅ Найдено ${transactions.length} входящих TON транзакций`);
      
      return transactions;
      
    } catch (error: any) {
      console.error('❌ Ошибка получения TON транзакций:', error);
      throw error;
    }
  }

  /**
   * Конвертировать nanoton в TON
   */
  private nanotonToTon(nanoton: string): number {
    return parseInt(nanoton) / 1_000_000_000;
  }

  /**
   * Найти пользователя по MEMO
   * ✅ УПРОЩЕНО: Memo больше не используется - транзакции идут через TonConnect
   */
  private async findUserByMemo(memo: string): Promise<string | null> {
    try {
      if (!memo || !memo.startsWith('deposit_')) {
        console.log(`⚠️ Memo не распознан: ${memo}`);
        return null;
      }

      const idPart = memo.replace('deposit_', '').trim();
      if (!idPart) return null;

      const supabase = getSupabaseAdmin();

      const { data: byDbId } = await supabase
        .from('_pidr_users')
        .select('id')
        .eq('id', idPart)
        .maybeSingle();
      if (byDbId?.id) {
        return String(byDbId.id);
      }

      const { data: byTelegram } = await supabase
        .from('_pidr_users')
        .select('id')
        .eq('telegram_id', idPart)
        .maybeSingle();
      if (byTelegram?.id) {
        return String(byTelegram.id);
      }

      console.log(`⚠️ Пользователь для memo ${memo} не найден`);
      return null;
    } catch (error) {
      console.error('❌ Ошибка парсинга memo:', error);
      return null;
    }
  }

  /**
   * Проверить была ли транзакция уже обработана
   * ✅ ИСПРАВЛЕНО: Используем _pidr_crypto_transactions
   */
  private async isTransactionProcessed(txHash: string): Promise<boolean> {
    try {
      const supabase = getSupabaseAdmin();
      
      const { data, error } = await supabase
        .from('_pidr_crypto_transactions')
        .select('id')
        .eq('transaction_hash', txHash)
        .single();

      return !!data && !error;
      
    } catch (error) {
      return false;
    }
  }

  /**
   * Сохранить транзакцию в БД и зачислить монеты.
   * Сначала пробуем привязать intent (если сумма/адрес совпали), иначе зачисляем без intent
   * и помечаем его credited — так не теряем перевод, если Telegram Wallet не приложил memo
   * или RPC сравнивает адрес в другом формате.
   */
  private async processPayment(
    tx: TonTransaction,
    userId: string,
    tonAmount: number,
    coinsAmount: number,
    intent: DepositIntent | null = null
  ): Promise<boolean> {
    try {
      const supabase = getSupabaseAdmin();
      const destination = intent?.destination || tonAddressForTransfer(tx.to);
      const tryCredit = async (intentId: string | null) => {
        const { data, error } = await supabase.rpc('credit_verified_ton_deposit', {
          p_intent_id: intentId,
          p_user_id: userId,
          p_tx_hash: tx.hash,
          p_from_address: tx.from,
          p_destination: destination,
          p_amount_nano: tx.value,
          p_coins: coinsAmount,
          p_chain_timestamp: new Date(tx.timestamp).toISOString(),
        });
        if (error) {
          console.error('❌ Атомарное зачисление TON не выполнено:', error.message || error);
          return false;
        }
        const result = Array.isArray(data) ? data[0] : data;
        return Boolean(result?.credited);
      };

      const amountMatches =
        intent != null && nanoClose(BigInt(tx.value), BigInt(intent.expected_amount_nano));
      const destMatches = intent != null && sameTonAddress(tx.to, intent.destination);

      let credited = false;
      if (intent && amountMatches && destMatches) {
        credited = await tryCredit(intent.id);
      }
      if (!credited) {
        credited = await tryCredit(null);
        if (credited && intent) {
          const { error: markError } = await supabase
            .from('_pidr_deposit_intents')
            .update({
              status: 'credited',
              tx_hash: tx.hash,
              actual_amount_nano: tx.value,
              coins_credited: coinsAmount,
              credited_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            })
            .eq('id', intent.id)
            .in('status', ['pending', 'submitted', 'ambiguous', 'expired']);
          if (markError) {
            console.warn('[TON] Intent не помечен credited:', markError.message);
          }
        }
      }

      return credited;
    } catch (error: unknown) {
      console.error('❌ Ошибка обработки платежа:', error);
      return false;
    }
  }

  /**
   * Конвертировать TON/GRAM в игровые монеты по актуальному курсу
   */
  private async tonToCoins(tonAmount: number): Promise<number> {
    try {
      const rates = await getExchangeRates();
      const coins = coinsFromCrypto('TON', tonAmount, rates);
      if (coins > 0) return coins;
    } catch {
      /* fallback below */
    }
    return Math.floor(tonAmount * 1000);
  }

  private matchIntentToTx(
    tx: TonTransaction,
    intents: DepositIntent[],
    usedIntentIds: Set<string>,
    options?: TonReconcileOptions
  ): DepositIntent | null {
    const comment = normalizeComment(tx.comment);
    if (comment) {
      const byMemo = intents.find((intent) => intent.memo === comment && !usedIntentIds.has(intent.id));
      if (byMemo && sameTonAddress(tx.to, byMemo.destination) && intentWindow(byMemo, tx.timestamp)) {
        return byMemo;
      }
    }

    const candidates = intents.filter((intent) => {
      if (usedIntentIds.has(intent.id)) return false;
      if (!sameTonAddress(tx.to, intent.destination)) return false;
      if (!intentWindow(intent, tx.timestamp)) return false;
      try {
        return nanoClose(BigInt(tx.value), BigInt(intent.expected_amount_nano));
      } catch {
        return false;
      }
    });

    if (candidates.length === 0) return null;

    if (options?.intentId) {
      const preferred = candidates.find((intent) => intent.id === options.intentId);
      if (preferred) return preferred;
    }

    if (options?.preferUserId) {
      const mine = candidates.filter((intent) => String(intent.user_id) === options.preferUserId);
      if (mine.length === 1) return mine[0];
      if (mine.length > 1) {
        return mine.sort(
          (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        )[0];
      }
    }

    if (candidates.length === 1) return candidates[0];
    return candidates.sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )[0];
  }

  /**
   * ОСНОВНАЯ ФУНКЦИЯ: Проверить и обработать новые платежи
   */
  async checkAndProcessPayments(options?: TonReconcileOptions): Promise<{
    success: boolean;
    processed: number;
    error?: string;
    newPayments: Array<{
      userId: string;
      amount: number;
      tonAmount: number;
      txHash: string;
    }>;
  }> {
    try {
      console.log('🔍 Начинаем проверку новых TON/GRAM платежей...');

      const transactions = await this.getRecentTransactions(100);

      if (transactions.length === 0) {
        console.log('ℹ️ Входящих транзакций не найдено');
        return { success: true, processed: 0, newPayments: [] };
      }

      const supabase = getSupabaseAdmin();
      const now = new Date().toISOString();
      await supabase
        .from('_pidr_deposit_intents')
        .update({ status: 'expired', updated_at: now })
        .in('status', ['pending', 'submitted', 'ambiguous'])
        .lt('expires_at', now);
      const { data: intentRows, error: intentError } = await supabase
        .from('_pidr_deposit_intents')
        .select('id, user_id, destination, expected_amount_nano, memo, status, created_at, expires_at')
        .in('status', ['pending', 'submitted', 'ambiguous'])
        .gte('expires_at', now)
        .order('created_at', { ascending: false })
        .limit(500);
      if (intentError) {
        console.warn('[TON] Deposit intents unavailable; legacy memo reconciliation remains active:', intentError.message);
      }
      const intents = (intentRows || []) as DepositIntent[];

      if (options?.intentId) {
        const already = intents.some((intent) => intent.id === options.intentId);
        if (!already) {
          const { data: specific } = await supabase
            .from('_pidr_deposit_intents')
            .select('id, user_id, destination, expected_amount_nano, memo, status, created_at, expires_at')
            .eq('id', options.intentId)
            .in('status', ['pending', 'submitted', 'ambiguous', 'expired'])
            .maybeSingle();
          if (specific) intents.unshift(specific as DepositIntent);
        }
      }
      const usedIntentIds = new Set<string>();

      const newPayments = [];
      let processedCount = 0;

      for (const tx of transactions) {
        if (!tx.hash) continue;
        const alreadyProcessed = await this.isTransactionProcessed(tx.hash);
        if (alreadyProcessed) continue;

        const tonAmount = this.nanotonToTon(tx.value);
        if (tonAmount < 0.1) continue;

        const matchedIntent = this.matchIntentToTx(tx, intents, usedIntentIds, options);
        const userId = matchedIntent
          ? String(matchedIntent.user_id)
          : await this.findUserByMemo(tx.comment || '');

        if (!userId) {
          if (tx.comment) {
            console.log(`⚠️ Пользователь для memo ${tx.comment} не найден`);
          }
          continue;
        }

        const coinsAmount = await this.tonToCoins(tonAmount);
        const processed = await this.processPayment(tx, userId, tonAmount, coinsAmount, matchedIntent);

        if (processed) {
          if (matchedIntent) usedIntentIds.add(matchedIntent.id);
          processedCount++;
          newPayments.push({
            userId,
            amount: coinsAmount,
            tonAmount,
            txHash: tx.hash,
          });
        }
      }

      console.log(`✅ Обработано ${processedCount} новых платежей`);

      return {
        success: true,
        processed: processedCount,
        newPayments,
      };
    } catch (error: unknown) {
      console.error('❌ Ошибка проверки платежей:', error);
      return {
        success: false,
        processed: 0,
        newPayments: [],
        error: error instanceof Error ? error.message : 'Ошибка проверки платежей',
      };
    }
  }

  /**
   * Получить информацию для платежа (адрес + memo пользователя)
   * ✅ УПРОЩЕНО: Memo генерируется на лету, не сохраняем в БД
   */
  async getPaymentInfo(userId: string): Promise<{
    address: string;
    memo: string;
    amount_ton: number;
    amount_coins: number;
    qr_url?: string;
  }> {
    try {
      // ✅ УПРОЩЕНО: Memo = "deposit_TELEGRAM_ID" - парсится при получении транзакции
      const memo = `deposit_${userId}`;

      const addr = (this.masterAddress || '').trim();
      if (!addr) {
        const err = new Error('MASTER_TON_ADDRESS_NOT_SET');
        (err as Error & { code?: string }).code = 'MASTER_TON_ADDRESS_NOT_SET';
        throw err;
      }

      return {
        address: addr,
        memo: memo,
        amount_ton: 1.0, // Рекомендуемая сумма
        amount_coins: 1000, // Сколько монет получит за 1 TON
        qr_url: this.generateTonQrUrl(addr, memo, 1.0)
      };
      
    } catch (error: any) {
      console.error('❌ Ошибка получения payment info:', error);
      throw error;
    }
  }

  /**
   * Генерировать уникальный memo для пользователя
   */
  private generateUserMemo(userId: string): string {
    const crypto = require('crypto');
    const hash = crypto.createHash('sha256')
      .update(`${userId}_TON_${process.env.MEMO_SECRET || 'ton_secret'}`)
      .digest('hex');
    
    return hash.substring(0, 8).toUpperCase();
  }

  /**
   * Генерировать TON QR URL для удобной оплаты
   */
  private generateTonQrUrl(address: string, memo: string, amount: number): string {
    // Формат: ton://transfer/{address}?amount={nanoton}&text={memo}
    const nanoton = amount * 1_000_000_000;
    return `ton://transfer/${address}?amount=${nanoton}&text=${memo}`;
  }
}

// Экспорт singleton instance
export const tonPaymentService = new TonPaymentService();

