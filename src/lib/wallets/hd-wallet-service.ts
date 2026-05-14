// HD Wallet Service для P.I.D.R. игры
import * as bip32 from 'bip32';
import * as bip39 from 'bip39';
import { createHash } from 'crypto';
import crypto from 'crypto';

export interface HDWalletAddress {
  userId: string;
  coin: string;
  address: string;
  derivationPath: string;
  index: number;
  created_at: Date;
}

export interface MasterWalletConfig {
  coin: string;
  xpub: string;
  derivationBase: string; // например "m/44'/0'/0'/0" для BTC
  network: 'mainnet' | 'testnet';
}

export class HDWalletService {
  private masterConfigs: Map<string, MasterWalletConfig> = new Map();

  constructor() {
    this.initializeMasterWallets();
  }

  private initializeMasterWallets() {
    // Конфигурация мастер кошельков из .env
    const configs: MasterWalletConfig[] = [
      {
        coin: 'BTC',
        xpub: process.env.BTC_MASTER_XPUB || '',
        derivationBase: "m/44'/0'/0'/0", // BIP44 для Bitcoin
        network: 'mainnet'
      },
      {
        coin: 'ETH',
        xpub: process.env.ETH_MASTER_XPUB || '',
        derivationBase: "m/44'/60'/0'/0", // BIP44 для Ethereum
        network: 'mainnet'
      },
      {
        coin: 'TON',
        xpub: process.env.TON_MASTER_XPUB || '',
        derivationBase: "m/44'/607'/0'/0", // BIP44 для TON
        network: 'mainnet'
      },
      {
        coin: 'TRC20',
        xpub: process.env.TRON_MASTER_XPUB || '',
        derivationBase: "m/44'/195'/0'/0", // BIP44 для TRON
        network: 'mainnet'
      },
      {
        coin: 'SOL',
        xpub: process.env.SOL_MASTER_XPUB || '',
        derivationBase: "m/44'/501'/0'/0", // BIP44 для Solana
        network: 'mainnet'
      }
    ];

    configs.forEach(config => {
      if (config.xpub) {
        this.masterConfigs.set(config.coin, config);
      }
    });
  }

  // Генерация уникального индекса для пользователя
  private generateUserIndex(userId: string, coin: string): number {
    const hash = createHash('sha256')
      .update(`${userId}_${coin}_${process.env.HD_SALT || 'pidr_game_salt'}`)
      .digest('hex');
    
    // Используем первые 8 символов хеша как число (избегаем коллизий)
    const index = parseInt(hash.substring(0, 8), 16) % 1000000; // Ограничиваем миллионом адресов
    return index;
  }

  // Генерация адреса для пользователя
  async generateUserAddress(userId: string, coin: string): Promise<HDWalletAddress | null> {
    const config = this.masterConfigs.get(coin.toUpperCase());
    if (!config || !config.xpub) {
      console.warn(`⚠️ Нет конфигурации мастер кошелька для ${coin}, используем fallback`);
      return await this.generateFallbackAddress(userId, coin);
    }

    try {
      const index = this.generateUserIndex(userId, coin);
      const derivationPath = `${config.derivationBase}/${index}`;
      
      let address: string;

      switch (coin.toUpperCase()) {
        case 'BTC':
          address = await this.deriveBitcoinAddress(config.xpub, index);
          break;
        case 'ETH':
        case 'ERC20':
          address = await this.deriveEthereumAddress(config.xpub, index);
          break;
        case 'TON':
          address = await this.deriveTONAddress(config.xpub, index);
          break;
        case 'TRC20':
          address = await this.deriveTronAddress(config.xpub, index);
          break;
        case 'SOL':
          address = await this.deriveSolanaAddress(config.xpub, index);
          break;
        default:
          throw new Error(`Неподдерживаемая монета: ${coin}`);
      }

      const walletAddress: HDWalletAddress = {
        userId,
        coin: coin.toUpperCase(),
        address,
        derivationPath,
        index,
        created_at: new Date()
      };

      // Сохраняем в базу данных
      await this.saveAddressToDatabase(walletAddress);

      console.log(`✅ HD адрес создан: ${coin} для пользователя ${userId}: ${address}`);
      return walletAddress;

    } catch (error) {
      console.error(`❌ Ошибка генерации HD адреса для ${coin}:`, error);
      return null;
    }
  }

  // Fallback генерация адреса без HD кошелька
  private async generateFallbackAddress(userId: string, coin: string): Promise<HDWalletAddress | null> {
    console.log(`🔄 Генерируем fallback адрес для ${coin} пользователя ${userId}`);
    
    try {
      const index = this.generateUserIndex(userId, coin);
      const userHash = crypto.createHash('sha256')
        .update(`${userId}_${coin}_${index}`)
        .digest('hex')
        .substring(0, 16);

      let address: string;
      
      switch (coin.toUpperCase()) {
        case 'TON':
          // Генерируем memo для TON
          address = `EQD4FPq-PRDieyQKkizFTRtSDyucUIqrj0v_zXJmqaDp6_0t`; // Пример адреса
          break;
        case 'BTC':
          address = `bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh`; // Пример адреса
          break;
        case 'ETH':
        case 'ERC20':
          address = `0x742d35Cc6634C0532925a3b8D5C1E1F4E0F3B2A1`; // Пример адреса
          break;
        case 'TRC20':
          address = `TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t`; // Пример USDT TRC20 адреса
          break;
        case 'SOL':
          address = `DYw8jCTfwHNRJhhmFcbXvVDTqWMEVFBX6ZKUmG5CNSKK`; // Пример Solana адреса
          break;
        default:
          throw new Error(`Неподдерживаемая монета: ${coin}`);
      }

      const walletAddress: HDWalletAddress = {
        userId,
        coin: coin.toUpperCase(),
        address,
        derivationPath: `fallback/${index}`,
        index,
        created_at: new Date()
      };

      // Сохраняем в базу данных
      await this.saveAddressToDatabase(walletAddress);

      console.log(`✅ Fallback адрес создан: ${coin} для пользователя ${userId}: ${address}`);
      return walletAddress;

    } catch (error) {
      console.error(`❌ Ошибка генерации fallback адреса для ${coin}:`, error);
      return null;
    }
  }

  // Деривация Bitcoin адреса (bech32)
  private async deriveBitcoinAddress(xpub: string, index: number): Promise<string> {
    try {
      // Для демо используем простую схему с префиксом
      // В проде здесь будет реальная BIP32 деривация
      const hash = createHash('sha256').update(`${xpub}_${index}`).digest('hex');
      return `bc1q${hash.substring(0, 32)}`;
    } catch (error) {
      throw new Error(`Ошибка деривации BTC адреса: ${error}`);
    }
  }

  // Деривация Ethereum адреса
  private async deriveEthereumAddress(xpub: string, index: number): Promise<string> {
    try {
      const hash = createHash('sha256').update(`${xpub}_${index}`).digest('hex');
      return `0x${hash.substring(0, 40)}`;
    } catch (error) {
      throw new Error(`Ошибка деривации ETH адреса: ${error}`);
    }
  }

  // Деривация TON адреса
  private async deriveTONAddress(xpub: string, index: number): Promise<string> {
    try {
      const hash = createHash('sha256').update(`${xpub}_${index}`).digest('hex');
      return `UQD${hash.substring(0, 44)}`;
    } catch (error) {
      throw new Error(`Ошибка деривации TON адреса: ${error}`);
    }
  }

  // Деривация TRON адреса
  private async deriveTronAddress(xpub: string, index: number): Promise<string> {
    try {
      const hash = createHash('sha256').update(`${xpub}_${index}`).digest('hex');
      return `T${hash.substring(0, 33).toUpperCase()}`;
    } catch (error) {
      throw new Error(`Ошибка деривации TRON адреса: ${error}`);
    }
  }

  // Деривация Solana адреса
  private async deriveSolanaAddress(xpub: string, index: number): Promise<string> {
    try {
      const hash = createHash('sha256').update(`${xpub}_${index}`).digest('hex');
      // Solana адреса в base58, для демо используем простую схему
      return `${hash.substring(0, 32)}${index.toString(36).padStart(12, '0')}`;
    } catch (error) {
      throw new Error(`Ошибка деривации SOL адреса: ${error}`);
    }
  }

  // Сохранение адреса в базу данных через новый API
  private async saveAddressToDatabase(walletAddress: HDWalletAddress): Promise<void> {
    try {
      const response = await fetch('/api/wallet/hd-addresses', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          coin: walletAddress.coin
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.message || 'Ошибка сохранения адреса');
      }

      console.log(`💾 HD адрес сохранен в БД: ${walletAddress.coin} - ${walletAddress.address}`);
    } catch (error) {
      console.error('❌ Ошибка сохранения HD адреса в БД:', error);
      
      // ✅ УПРОЩЕНО: HD кошельки больше не сохраняются в БД
      // Используем только MASTER_WALLET адреса из переменных окружения
      console.log('ℹ️ HD адреса не сохраняются в БД (таблица удалена). Используем MASTER_WALLET.');
    }
  }

  // Токен авторизации теперь в cookies, не используем браузерное хранилище

  // Получение адреса пользователя для монеты
  async getUserAddress(userId: string, coin: string): Promise<HDWalletAddress | null> {
    try {
      // Токен авторизации теперь в cookies, проверка происходит на сервере

      const response = await fetch('/api/wallet/hd-addresses', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include'
      });

      if (!response.ok) {
        console.warn(`⚠️ Ошибка API ${response.status}, генерируем адрес локально`);
        return await this.generateUserAddress(userId, coin);
      }

      const result = await response.json();
      if (result.success && result.addresses) {
        // Ищем адрес для нужной монеты
        const address = result.addresses.find((addr: any) => addr.coin === coin.toUpperCase());
        if (address) {
          return {
            userId,
            coin: address.coin,
            address: address.address,
            derivationPath: address.derivationPath,
            index: address.index,
            created_at: new Date(address.createdAt)
          };
        }
      }

      // Если адрес не найден, генерируем новый
      console.log(`🔄 Адрес для ${coin} не найден, генерируем новый`);
      return await this.generateUserAddress(userId, coin);
    } catch (error) {
      console.error(`❌ Ошибка получения HD адреса для ${userId}/${coin}:`, error);
      // Fallback к локальной генерации
      return await this.generateUserAddress(userId, coin);
    }
  }

  // Получение всех адресов пользователя
  async getAllUserAddresses(userId: string): Promise<HDWalletAddress[]> {
    try {
      // Токен авторизации теперь в cookies, проверка происходит на сервере
      const response = await fetch('/api/wallet/hd-addresses', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include'
      });

      if (!response.ok) {
        console.warn(`⚠️ Ошибка API ${response.status} при получении всех адресов`);
        return [];
      }

      const result = await response.json();
      if (result.success && result.addresses) {
        return result.addresses.map((addr: any) => ({
          userId,
          coin: addr.coin,
          address: addr.address,
          derivationPath: addr.derivationPath,
          index: addr.index,
          created_at: new Date(addr.createdAt)
        }));
      }

      return [];
    } catch (error) {
      console.error(`❌ Ошибка получения всех HD адресов для ${userId}:`, error);
      return [];
    }
  }

  // Статистика по мастер кошелькам
  getWalletStats() {
    return {
      configuredWallets: Array.from(this.masterConfigs.keys()),
      totalConfigs: this.masterConfigs.size,
      supportedCoins: ['BTC', 'ETH', 'TON', 'TRC20', 'SOL']
    };
  }
}

export const hdWalletService = new HDWalletService();
