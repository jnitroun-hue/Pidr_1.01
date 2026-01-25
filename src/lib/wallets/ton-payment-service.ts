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
    // ✅ ИСПРАВЛЕНО: Проверяем все возможные варианты имен переменных
    this.apiKey = process.env.TONCENTER_API_KEY || 
                  process.env.TON_CENTER_API || 
                  process.env.TONCENTER_API || 
                  '';
    this.masterAddress = process.env.MASTER_TON_ADDRESS || 
                         process.env.TON_MASTER_ADDRESS || 
                         '';
    
    // Нормализуем адрес (конвертируем UQ в EQ если нужно)
    if (this.masterAddress && this.masterAddress.startsWith('UQ')) {
      this.masterAddress = 'EQ' + this.masterAddress.substring(2);
      console.log('✅ Конвертирован UQ адрес в EQ:', this.masterAddress);
    }
    
    // ✅ Показываем предупреждения только если переменные действительно отсутствуют
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
   * ✅ УПРОЩЕНО: Memo больше не используется - транзакции идут через TonConnect
   */
  private async findUserByMemo(memo: string): Promise<string | null> {
    try {
      // ✅ УПРОЩЕНО: Парсим telegram_id из memo формата "deposit_TELEGRAM_ID"
      if (memo && memo.startsWith('deposit_')) {
        const userId = memo.replace('deposit_', '');
        console.log(`✅ Извлечён userId из memo: ${userId}`);
        return userId;
      }
      
      console.log(`⚠️ Memo не распознан: ${memo}`);
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
  private async processPayment(tx: TonTransaction, userId: string, tonAmount: number, coinsAmount: number): Promise<boolean> {
    try {
      const supabase = getSupabaseAdmin();

      // 1. Сохраняем транзакцию в _pidr_crypto_transactions
      const { error: txError } = await supabase
        .from('_pidr_crypto_transactions')
        .insert({
          user_id: parseInt(userId) || 0,
          crypto_type: 'TON',
          transaction_hash: tx.hash,
          wallet_address: tx.from,
          amount: tonAmount,
          purpose: `Deposit: ${coinsAmount} coins`,
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

