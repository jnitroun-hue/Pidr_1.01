// Генератор адресов для разных блокчейн сетей
import crypto from 'crypto';

interface WalletAddress {
  address: string;
  network: string;
  userId: string;
  memo?: string; // Для некоторых сетей нужен memo/tag
}

export class AddressGenerator {
  private masterWallets = {
    // ВАЖНО: Эти адреса должны быть вашими реальными кошельками!
    TON: process.env.MASTER_TON_WALLET || '',
    BTC: process.env.MASTER_BTC_WALLET || '',
    ETH: process.env.MASTER_ETH_WALLET || '', 
    TRC20: process.env.MASTER_TRON_WALLET || '', // Для USDT TRC20
    SOL: process.env.MASTER_SOLANA_WALLET || '',
  };

  // Генерируем уникальный адрес для пользователя
  async generateAddress(userId: string, network: string): Promise<WalletAddress> {
    const userHash = crypto.createHash('sha256')
      .update(`${userId}_${network}_${Date.now()}`)
      .digest('hex')
      .substring(0, 16);

    switch (network.toUpperCase()) {
      case 'TON':
        return await this.generateTONAddress(userId, userHash);
      
      case 'BTC':
        return await this.generateBTCAddress(userId, userHash);
      
      case 'ETH':
        return await this.generateETHAddress(userId, userHash);
      
      case 'USDT_TRC20':
        return await this.generateTRC20Address(userId, userHash);
      
      case 'USDT_ERC20':
        return await this.generateERC20Address(userId, userHash);
      
      case 'SOL':
        return await this.generateSOLAddress(userId, userHash);
      
      default:
        throw new Error(`Сеть ${network} не поддерживается`);
    }
  }

  private async generateTONAddress(userId: string, hash: string): Promise<WalletAddress> {
    // TON использует memo для идентификации платежей
    const memo = `pidr_${hash}`;
    
    return {
      address: this.masterWallets.TON,
      network: 'TON',
      userId,
      memo
    };
  }

  private async generateBTCAddress(userId: string, hash: string): Promise<WalletAddress> {
    // Для BTC можно использовать HD кошелек или один адрес с memo
    // Здесь используем один адрес - все платежи идут на мастер кошелек
    // В реальности лучше использовать HD Wallet для генерации уникальных адресов
    
    return {
      address: this.masterWallets.BTC,
      network: 'BTC', 
      userId,
      memo: hash // Используем как reference
    };
  }

  private async generateETHAddress(userId: string, hash: string): Promise<WalletAddress> {
    // Ethereum - можно создать уникальный адрес или использовать мастер адрес
    return {
      address: this.masterWallets.ETH,
      network: 'ETH',
      userId
    };
  }

  private async generateTRC20Address(userId: string, hash: string): Promise<WalletAddress> {
    // TRON TRC20 (USDT)
    return {
      address: this.masterWallets.TRC20,
      network: 'TRC20',
      userId
    };
  }

  private async generateERC20Address(userId: string, hash: string): Promise<WalletAddress> {
    // Ethereum ERC20 (USDT)
    return {
      address: this.masterWallets.ETH, // Тот же адрес что и для ETH
      network: 'ERC20',
      userId
    };
  }

  private async generateSOLAddress(userId: string, hash: string): Promise<WalletAddress> {
    // Solana
    return {
      address: this.masterWallets.SOL,
      network: 'SOL',
      userId
    };
  }

  // Валидация адреса
  validateAddress(address: string, network: string): boolean {
    switch (network.toUpperCase()) {
      case 'TON':
        return /^[A-Za-z0-9_-]{48}$/.test(address);
      case 'BTC':
        return /^[13][a-km-zA-HJ-NP-Z1-9]{25,34}$|^bc1[a-z0-9]{39,59}$/.test(address);
      case 'ETH':
      case 'ERC20':
        return /^0x[a-fA-F0-9]{40}$/.test(address);
      case 'TRC20':
        return /^T[A-Za-z1-9]{33}$/.test(address);
      case 'SOL':
        return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(address);
      default:
        return false;
    }
  }
}

export const addressGenerator = new AddressGenerator();
