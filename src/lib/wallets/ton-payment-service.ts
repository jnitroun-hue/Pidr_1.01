/**
 * ============================================================
 * TON PAYMENT SERVICE - TONCENTER API
 * ============================================================
 * Система приема TON платежей через TonCenter API
 * Поддержка MEMO для идентификации пользователей
 */

import { getSupabaseAdmin } from '../supabase';

interface TonTransaction {
  hash: string;
  from: string;
  to: string;
  value: string; // в nanoton
  comment?: string; // memo
  timestamp: number;
}

export class TonPaymentService {
  private apiKey: string;
  private masterAddress: string;
  private apiEndpoint = 'https://toncenter.com/api/v2';

  constructor() {
    this.apiKey = process.env.TONCENTER_API_KEY || '';
    this.masterAddress = process.env.MASTER_TON_ADDRESS || '';
    
    if (!this.apiKey) {
      console.warn('⚠️ TONCENTER_API_KEY не настроен');
    }
    
    if (!this.masterAddress) {
      console.warn('⚠️ MASTER_TON_ADDRESS не настроен');
    }
  }

  /**
   * Получить последние транзакции на мастер-адрес
   */
  async getRecentTransactions(limit: number = 100): Promise<TonTransaction[]> {
    try {
      const url = `${this.apiEndpoint}/getTransactions?address=${this.masterAddress}&limit=${limit}&api_key=${this.apiKey}`;
      
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
          transactions.push({
            hash: tx.transaction_id.hash,
            from: tx.in_msg.source || 'unknown',
            to: tx.in_msg.destination || this.masterAddress,
            value: tx.in_msg.value,
            comment: tx.in_msg.message || undefined,
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
   */
  private async findUserByMemo(memo: string): Promise<string | null> {
    try {
      const supabase = getSupabaseAdmin();
      
      // Ищем в таблице payment_addresses где хранятся memo пользователей
      const { data, error } = await supabase
        .from('_pidr_payment_addresses')
        .select('user_id')
        .eq('memo', memo)
        .eq('coin', 'TON')
        .single();

      if (error || !data) {
        console.log(`⚠️ Пользователь с memo ${memo} не найден`);
        return null;
      }

      console.log(`✅ Найден пользователь для memo ${memo}: ${data.user_id}`);
      return data.user_id;
      
    } catch (error) {
      console.error('❌ Ошибка поиска пользователя по memo:', error);
      return null;
    }
  }

  /**
   * Проверить была ли транзакция уже обработана
   */
  private async isTransactionProcessed(txHash: string): Promise<boolean> {
    try {
      const supabase = getSupabaseAdmin();
      
      const { data, error } = await supabase
        .from('_pidr_transactions')
        .select('id')
        .eq('tx_hash', txHash)
        .single();

      return !!data && !error;
      
    } catch (error) {
      return false;
    }
  }

  /**
   * Сохранить транзакцию в БД и зачислить монеты
   */
  private async processPayment(tx: TonTransaction, userId: string, tonAmount: number, coinsAmount: number): Promise<boolean> {
    try {
      const supabase = getSupabaseAdmin();

      // 1. Сохраняем транзакцию
      const { error: txError } = await supabase
        .from('_pidr_transactions')
        .insert({
          user_id: userId,
          type: 'deposit',
          amount: coinsAmount,
          coin: 'TON',
          coin_amount: tonAmount,
          tx_hash: tx.hash,
          from_address: tx.from,
          to_address: tx.to,
          memo: tx.comment || '',
          status: 'completed',
          created_at: new Date(tx.timestamp).toISOString()
        });

      if (txError) {
        console.error('❌ Ошибка сохранения транзакции:', txError);
        return false;
      }

      // 2. Зачисляем монеты пользователю
      const { error: updateError } = await supabase.rpc('increment_user_balance', {
        p_user_id: userId,
        p_amount: coinsAmount
      });

      if (updateError) {
        console.error('❌ Ошибка зачисления монет:', updateError);
        return false;
      }

      console.log(`✅ Пользователю ${userId} зачислено ${coinsAmount} монет (${tonAmount} TON)`);
      
      return true;
      
    } catch (error: any) {
      console.error('❌ Ошибка обработки платежа:', error);
      return false;
    }
  }

  /**
   * Конвертировать TON в игровые монеты (1 TON = 1000 монет)
   */
  private tonToCoins(tonAmount: number): number {
    return Math.floor(tonAmount * 1000); // 1 TON = 1000 монет
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

        // Ищем пользователя по MEMO
        const userId = await this.findUserByMemo(tx.comment);
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

        const coinsAmount = this.tonToCoins(tonAmount);

        // Обрабатываем платеж
        const processed = await this.processPayment(tx, userId, tonAmount, coinsAmount);
        
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
   */
  async getPaymentInfo(userId: string): Promise<{
    address: string;
    memo: string;
    amount_ton: number;
    amount_coins: number;
    qr_url?: string;
  }> {
    try {
      const supabase = getSupabaseAdmin();
      
      // Проверяем есть ли уже memo для этого пользователя
      let { data: existingAddress } = await supabase
        .from('_pidr_payment_addresses')
        .select('*')
        .eq('user_id', userId)
        .eq('coin', 'TON')
        .single();

      let memo: string;

      if (existingAddress) {
        memo = existingAddress.memo;
      } else {
        // Генерируем новый memo
        memo = this.generateUserMemo(userId);
        
        // Сохраняем в БД
        const { error } = await supabase
          .from('_pidr_payment_addresses')
          .insert({
            user_id: userId,
            coin: 'TON',
            address: this.masterAddress,
            memo: memo,
            is_active: true
          });

        if (error) {
          console.error('❌ Ошибка сохранения memo:', error);
        }
      }

      return {
        address: this.masterAddress,
        memo: memo,
        amount_ton: 1.0, // Рекомендуемая сумма
        amount_coins: 1000, // Сколько монет получит за 1 TON
        qr_url: this.generateTonQrUrl(this.masterAddress, memo, 1.0)
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

