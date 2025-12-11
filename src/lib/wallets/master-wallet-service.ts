// Самый простой подход - один адрес на валюту с memo/tag
export class MasterWalletService {
  
  // Мастер адреса (замените на свои реальные)
  private masterAddresses = {
    USDT: process.env.MASTER_USDT_ADDRESS || 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t',
    TON: process.env.MASTER_TON_ADDRESS || 'EQBvW8Z5huBkMJYdnfAEM5JqTNkuWX3diqYENkWsIL0XggGG',
    ETH: process.env.MASTER_ETH_ADDRESS || '0x742d35Cc6639C0532fba96b9f8b1B8F4D3c8b3a1',
    SOL: process.env.MASTER_SOL_ADDRESS || '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgHPv',
    BTC: process.env.MASTER_BTC_ADDRESS || '1BvBMSEYstWetqTFn5Au4m4GFg7xJaNVN2'
  };

  // Получить адрес для платежа с уникальным memo
  getPaymentAddress(userId: string, coin: string) {
    const address = this.masterAddresses[coin as keyof typeof this.masterAddresses];
    if (!address) {
      throw new Error(`Unsupported coin: ${coin}`);
    }

    // Генерируем уникальный memo/tag для пользователя
    const memo = this.generateUserMemo(userId, coin);

    return {
      address: address,
      memo: memo, // Для TON, SOL
      tag: memo,  // Для некоторых бирж
      note: `Платеж пользователя ${userId}`,
      coin: coin
    };
  }

  private generateUserMemo(userId: string, coin: string): string {
    // Создаем короткий уникальный memo
    const crypto = require('crypto');
    const hash = crypto.createHash('sha256')
      .update(`${userId}_${coin}_${process.env.MEMO_SECRET || 'memo_secret'}`)
      .digest('hex');
    
    // Берем первые 8 символов для memo
    return hash.substring(0, 8).toUpperCase();
  }

  // Проверить платеж по memo
  findUserByMemo(memo: string, coin: string): string | null {
    // В реальном приложении здесь будет поиск в БД
    // Пока возвращаем null - нужна реализация
    return null;
  }
}

// Пример использования
export function getPaymentInfo(userId: string, coin: string) {
  const service = new MasterWalletService();
  return service.getPaymentAddress(userId, coin);
}
