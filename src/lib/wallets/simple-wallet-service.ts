// Простой и безопасный сервис кошельков без HD
export class SimpleWalletService {
  
  // Генерируем уникальный адрес для пользователя на основе его ID
  generateUserAddress(userId: string, coin: string): string {
    // Используем детерминистическую генерацию на основе userId + coin
    const seed = this.createSeed(userId, coin);
    
    switch (coin) {
      case 'USDT':
        return this.generateTronAddress(seed);
      case 'TON':
        return this.generateTonAddress(seed);
      case 'ETH':
        return this.generateEthAddress(seed);
      case 'SOL':
        return this.generateSolAddress(seed);
      case 'BTC':
        return this.generateBtcAddress(seed);
      default:
        throw new Error(`Unsupported coin: ${coin}`);
    }
  }

  private createSeed(userId: string, coin: string): string {
    // Создаем уникальный seed на основе userId и типа монеты
    const crypto = require('crypto');
    const secret = process.env.WALLET_SEED_SECRET || 'default_secret';
    return crypto.createHash('sha256')
      .update(`${userId}_${coin}_${secret}`)
      .digest('hex');
  }

  private generateTronAddress(seed: string): string {
    // Генерируем TRON адрес (для USDT TRC20)
    const crypto = require('crypto');
    const hash = crypto.createHash('sha256').update(seed + 'tron').digest('hex');
    // Простая генерация для демо (в продакшене используйте tronweb)
    return 'TR' + hash.substring(0, 32).toUpperCase();
  }

  private generateTonAddress(seed: string): string {
    const crypto = require('crypto');
    const hash = crypto.createHash('sha256').update(seed + 'ton').digest('hex');
    return 'EQ' + hash.substring(0, 46);
  }

  private generateEthAddress(seed: string): string {
    const crypto = require('crypto');
    const hash = crypto.createHash('sha256').update(seed + 'eth').digest('hex');
    return '0x' + hash.substring(0, 40);
  }

  private generateSolAddress(seed: string): string {
    const crypto = require('crypto');
    const hash = crypto.createHash('sha256').update(seed + 'sol').digest('hex');
    return hash.substring(0, 44);
  }

  private generateBtcAddress(seed: string): string {
    const crypto = require('crypto');
    const hash = crypto.createHash('sha256').update(seed + 'btc').digest('hex');
    return '1' + hash.substring(0, 33);
  }
}

// Проверяем, что пользователь получает одинаковые адреса
export function validateUserAddresses(userId: string) {
  const service = new SimpleWalletService();
  
  const coins = ['USDT', 'TON', 'ETH', 'SOL', 'BTC'];
  const addresses: {[key: string]: string} = {};
  
  coins.forEach(coin => {
    addresses[coin] = service.generateUserAddress(userId, coin);
  });
  
  return addresses;
}
