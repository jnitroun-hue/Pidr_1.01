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

function extractTonComment(inMsg: Record<string, unknown> | null | undefined): string | undefined {
  if (!inMsg) return undefined;

  const plain = inMsg.message;
  if (typeof plain === 'string' && plain.trim()) {
    return plain.trim();
  }

  const msgData = inMsg.msg_data as Record<string, unknown> | undefined;
  if (msgData?.text && typeof msgData.text === 'string') {
    return msgData.text.trim();
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
      /* not a text-comment payload */
    }
  }

  return undefined;
}

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
      const url = `${this.apiEndpoint}/getTransactions?address=${encodeURIComponent(queryAddress)}&limit=${limit}&archival=true${this.apiKey ? `&api_key=${this.apiKey}` : ''}`;
      
      console.log('🔍 Запрашиваем TON транзакции...');
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`TonCenter API error: ${response.status}`);
      }

      const data = await response.json();
      
      if (!data.ok || !data.result) {
        throw new Error('Invalid TonCenter response');
      }

      // Парсим транзакции
      const transactions: TonTransaction[] = [];
      
      for (const tx of data.result) {
        // Проверяем что это входящая транзакция
        if (tx.in_msg && tx.in_msg.value && tx.in_msg.value !== '0') {
          const comment = extractTonComment(tx.in_msg as Record<string, unknown>);
          transactions.push({
            hash: tx.transaction_id.hash,
            from: tx.in_msg.source || 'unknown',
            to: tx.in_msg.destination || this.masterAddress,
            value: tx.in_msg.value,
            comment,
            timestamp: parseInt(tx.utime) * 1000 // конвертируем в миллисекунды
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
   * Сохранить транзакцию в БД и зачислить монеты
   * ✅ ИСПРАВЛЕНО: Используем _pidr_crypto_transactions
   */
  private async processPayment(
    tx: TonTransaction,
    userId: string,
    tonAmount: number,
    coinsAmount: number,
    intentId: string | null = null
  ): Promise<boolean> {
    try {
      const supabase = getSupabaseAdmin();
      const { data, error } = await supabase.rpc('credit_verified_ton_deposit', {
        p_intent_id: intentId,
        p_user_id: userId,
        p_tx_hash: tx.hash,
        p_from_address: tx.from,
        p_destination: tonAddressForTransfer(tx.to),
        p_amount_nano: tx.value,
        p_coins: coinsAmount,
        p_chain_timestamp: new Date(tx.timestamp).toISOString(),
      });
      if (error) {
        console.error('❌ Атомарное зачисление TON не выполнено:', error);
        return false;
      }
      const result = Array.isArray(data) ? data[0] : data;
      return Boolean(result?.credited);
      
    } catch (error: any) {
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

  /**
   * ОСНОВНАЯ ФУНКЦИЯ: Проверить и обработать новые платежи
   */
  async checkAndProcessPayments(): Promise<{
    success: boolean;
    processed: number;
    newPayments: Array<{
      userId: string;
      amount: number;
      tonAmount: number;
      txHash: string;
    }>;
  }> {
    try {
      console.log('🔍 Начинаем проверку новых TON платежей...');
      
      // Получаем последние 100 транзакций
      const transactions = await this.getRecentTransactions(100);
      
      if (transactions.length === 0) {
        console.log('ℹ️ Новых транзакций не найдено');
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
      const intentsByMemo = new Map(intents.map((intent) => [intent.memo, intent]));

      const newPayments = [];
      let processedCount = 0;

      for (const tx of transactions) {
        // Проверяем была ли уже обработана
        const alreadyProcessed = await this.isTransactionProcessed(tx.hash);
        if (alreadyProcessed) {
          continue;
        }

        // Проверяем есть ли MEMO (comment)
        if (!tx.comment) {
          console.log(`⚠️ Транзакция ${tx.hash} без MEMO - пропускаем`);
          continue;
        }

        const intent = intentsByMemo.get(tx.comment);
        if (
          intent &&
          (!sameTonAddress(tx.to, intent.destination) ||
            BigInt(tx.value) !== BigInt(intent.expected_amount_nano) ||
            tx.timestamp < new Date(intent.created_at).getTime() - 120_000 ||
            tx.timestamp > new Date(intent.expires_at).getTime())
        ) {
          console.warn(`[TON] Транзакция ${tx.hash} не совпала с параметрами intent ${intent.id}`);
          continue;
        }

        // Уникальный intent имеет приоритет; старые deposit_<userId> остаются совместимыми.
        const userId = intent ? String(intent.user_id) : await this.findUserByMemo(tx.comment);
        if (!userId) {
          console.log(`⚠️ Пользователь для memo ${tx.comment} не найден`);
          continue;
        }

        // Конвертируем сумму
        const tonAmount = this.nanotonToTon(tx.value);
        
        // Минимальная сумма 0.1 TON
        if (tonAmount < 0.1) {
          console.log(`⚠️ Сумма ${tonAmount} TON меньше минимальной (0.1 TON)`);
          continue;
        }

        const coinsAmount = await this.tonToCoins(tonAmount);

        // Обрабатываем платеж
        const processed = await this.processPayment(tx, userId, tonAmount, coinsAmount, intent?.id || null);
        
        if (processed) {
          processedCount++;
          newPayments.push({
            userId,
            amount: coinsAmount,
            tonAmount,
            txHash: tx.hash
          });
        }
      }

      console.log(`✅ Обработано ${processedCount} новых платежей`);
      
      return {
        success: true,
        processed: processedCount,
        newPayments
      };
      
    } catch (error: any) {
      console.error('❌ Ошибка проверки платежей:', error);
      return {
        success: false,
        processed: 0,
        newPayments: []
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

