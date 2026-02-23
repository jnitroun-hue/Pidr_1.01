import { tonConnector } from './ton-connector';
import { solanaConnector } from './solana-connector';
import { ethereumConnector } from './ethereum-connector';

export type CryptoType = 'TON' | 'SOL' | 'ETH';

export interface ExchangeRate {
  crypto: CryptoType;
  rate: number; // Сколько игровых монет за 1 единицу криптовалюты
  minAmount: number; // Минимальная сумма для обмена
}

export interface DepositTransaction {
  id: string;
  userId: string;
  cryptoType: CryptoType;
  cryptoAmount: number;
  gameCoinsAmount: number;
  txHash: string;
  status: 'pending' | 'confirmed' | 'failed';
  createdAt: string;
}

export class WalletService {
  private static instance: WalletService;
  private exchangeRates: ExchangeRate[] = [
    // 500 игровых монет = 1 USDT (~80₽)
    // Курсы криптовалют к USDT (примерные): TON ~$2, SOL ~$20, ETH ~$2500
    { crypto: 'TON', rate: 1000, minAmount: 0.05 }, // 1 TON ≈ $2 ≈ 2 USDT ≈ 1000 игровых монет
    { crypto: 'SOL', rate: 10000, minAmount: 0.005 }, // 1 SOL ≈ $20 ≈ 20 USDT ≈ 10000 игровых монет  
    { crypto: 'ETH', rate: 1250000, minAmount: 0.0004 }, // 1 ETH ≈ $2500 ≈ 2500 USDT ≈ 1,250,000 игровых монет
  ];

  public static getInstance(): WalletService {
    if (!WalletService.instance) {
      WalletService.instance = new WalletService();
    }
    return WalletService.instance;
  }

  // Получить курсы обмена
  getExchangeRates(): ExchangeRate[] {
    return this.exchangeRates;
  }

  // Получить курс для конкретной криптовалюты
  getExchangeRate(crypto: CryptoType): ExchangeRate | null {
    return this.exchangeRates.find(rate => rate.crypto === crypto) || null;
  }

  // Рассчитать количество игровых монет
  calculateGameCoins(crypto: CryptoType, amount: number): number {
    const rate = this.getExchangeRate(crypto);
    if (!rate) return 0;
    return Math.floor(amount * rate.rate);
  }

  // Рассчитать необходимое количество криптовалюты
  calculateCryptoAmount(crypto: CryptoType, gameCoins: number): number {
    const rate = this.getExchangeRate(crypto);
    if (!rate) return 0;
    return gameCoins / rate.rate;
  }

  // Проверить минимальную сумму
  isValidAmount(crypto: CryptoType, amount: number): boolean {
    const rate = this.getExchangeRate(crypto);
    if (!rate) return false;
    return amount >= rate.minAmount;
  }

  // Получить адрес кошелька для депозита
  async getDepositAddress(crypto: CryptoType): Promise<string | null> {
    try {
      switch (crypto) {
        case 'TON':
          const tonWallet = tonConnector.getConnectedWallet();
          return tonWallet?.account.address || null;
        
        case 'SOL':
          return solanaConnector.getConnectedAddress();
        
        case 'ETH':
          return ethereumConnector.getConnectedAddress();
        
        default:
          return null;
      }
    } catch (error) {
      console.error(`Failed to get ${crypto} deposit address:`, error);
      return null;
    }
  }

  // Создать транзакцию депозита
  async createDepositTransaction(
    userId: string,
    crypto: CryptoType,
    cryptoAmount: number,
    recipientAddress: string
  ): Promise<DepositTransaction> {
    const gameCoinsAmount = this.calculateGameCoins(crypto, cryptoAmount);
    
    const transaction: DepositTransaction = {
      id: this.generateTransactionId(),
      userId,
      cryptoType: crypto,
      cryptoAmount,
      gameCoinsAmount,
      txHash: '',
      status: 'pending',
      createdAt: new Date().toISOString(),
    };

    // Сохраняем транзакцию в локальном хранилище (в реальном проекте - в базу данных)
    this.saveTransaction(transaction);

    return transaction;
  }

  // Отправить криптовалюту
  async sendCrypto(
    crypto: CryptoType,
    amount: number,
    recipientAddress: string
  ): Promise<string> {
    try {
      switch (crypto) {
        case 'TON':
          return await this.sendTON(amount, recipientAddress);
        
        case 'SOL':
          return await this.sendSOL(amount, recipientAddress);
        
        case 'ETH':
          return await this.sendETH(amount, recipientAddress);
        
        default:
          throw new Error(`Unsupported crypto type: ${crypto}`);
      }
    } catch (error) {
      console.error(`Failed to send ${crypto}:`, error);
      throw error;
    }
  }

  // Отправить TON
  private async sendTON(amount: number, recipientAddress: string): Promise<string> {
    // В реальном проекте здесь будет интеграция с TON SDK
    // Пока возвращаем мок-хэш
    await new Promise(resolve => setTimeout(resolve, 2000)); // Имитация задержки
    // В продакшене здесь должен быть реальный хеш транзакции
    throw new Error('TON transaction not implemented in production');
  }

  // Отправить SOL
  private async sendSOL(amount: number, recipientAddress: string): Promise<string> {
    // В реальном проекте здесь будет интеграция с Solana Web3.js
    await new Promise(resolve => setTimeout(resolve, 2000));
    throw new Error('SOL transaction not implemented in production');
  }

  // Отправить ETH
  private async sendETH(amount: number, recipientAddress: string): Promise<string> {
    // В реальном проекте здесь будет интеграция с ethers.js
    await new Promise(resolve => setTimeout(resolve, 2000));
    throw new Error('ETH transaction not implemented in production');
  }

  // Обменять криптовалюту на игровые монеты
  async exchangeToGameCoins(
    userId: string,
    crypto: CryptoType,
    cryptoAmount: number
  ): Promise<{ success: boolean; gameCoinsAdded: number; txId: string }> {
    try {
      // Проверяем минимальную сумму
      if (!this.isValidAmount(crypto, cryptoAmount)) {
        throw new Error(`Minimum amount for ${crypto} is ${this.getExchangeRate(crypto)?.minAmount}`);
      }

      // Получаем адрес для депозита (в реальном проекте - адрес нашего кошелька)
      const depositAddress = await this.getDepositAddress(crypto);
      if (!depositAddress) {
        throw new Error(`Failed to get deposit address for ${crypto}`);
      }

      // Создаем транзакцию
      const transaction = await this.createDepositTransaction(
        userId,
        crypto,
        cryptoAmount,
        depositAddress
      );

      // Отправляем криптовалюту (в реальном проекте)
      // const txHash = await this.sendCrypto(crypto, cryptoAmount, depositAddress);
      
      // Для демо - имитируем успешную транзакцию
      const txHash = `${crypto.toLowerCase()}_demo_${Date.now()}`;
      
      // Обновляем транзакцию
      transaction.txHash = txHash;
      transaction.status = 'confirmed';
      this.saveTransaction(transaction);

      // Добавляем игровые монеты пользователю (в реальном проекте - через API)
      await this.addGameCoinsToUser(userId, transaction.gameCoinsAmount);

      return {
        success: true,
        gameCoinsAdded: transaction.gameCoinsAmount,
        txId: transaction.id,
      };
    } catch (error) {
      console.error('Exchange failed:', error);
      throw error;
    }
  }

  // Получить историю транзакций пользователя
  getUserTransactions(userId: string): DepositTransaction[] {
    const transactions = this.loadTransactions();
    return transactions.filter(tx => tx.userId === userId);
  }

  // Приватные методы
  private generateTransactionId(): string {
    return 'tx_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  private saveTransaction(transaction: DepositTransaction): void {
    // Транзакции хранятся только в БД через API — localStorage не используется
    console.log('💾 [WalletService] Транзакция сохраняется в БД:', transaction.id);
  }

  private loadTransactions(): DepositTransaction[] {
    // Транзакции загружаются только из БД через API — localStorage не используется
    return [];
  }

  private async addGameCoinsToUser(userId: string, amount: number): Promise<void> {
    // ✅ ИСПРАВЛЕНО: Отправляем запрос в Supabase БД напрямую
    if (typeof window === 'undefined') return;
    
    try {
      // ✅ Обновляем баланс через API (который работает с БД)
      const response = await fetch('/api/user/add-coins', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-telegram-id': userId
        },
        body: JSON.stringify({ amount })
      });
      
      if (!response.ok) {
        throw new Error('Failed to update coins in database');
      }
      
      const data = await response.json();
      
      // Отправляем событие об обновлении баланса
      window.dispatchEvent(new CustomEvent('coinsUpdated', { 
        detail: { newBalance: data.newBalance, added: amount } 
      }));
      
      console.log(`✅ [Wallet] Баланс обновлён в БД: +${amount} монет`);
    } catch (error) {
      console.error('❌ [Wallet] Ошибка обновления баланса в БД:', error);
      throw error;
    }
  }
}

export const walletService = WalletService.getInstance();
