import { Connection, PublicKey, clusterApiUrl } from '@solana/web3.js';

export class SolanaWalletConnector {
  private connection: Connection;
  private connectedWallet: any = null;

  constructor() {
    // Используем devnet для тестирования, можно поменять на mainnet-beta
    this.connection = new Connection(clusterApiUrl('devnet'), 'confirmed');
  }

  async connect() {
    if (typeof window === 'undefined') {
      throw new Error('Window is undefined');
    }

    // Проверяем наличие Phantom
    const provider = (window as any).phantom?.solana;
    
    if (!provider?.isPhantom) {
      window.open('https://phantom.app/', '_blank');
      throw new Error('Phantom wallet not found! Please install it.');
    }

    try {
      // Запрашиваем подключение
      const resp = await provider.connect();
      this.connectedWallet = provider;
      
      const publicKey = resp.publicKey.toString();
      
      // Получаем баланс
      const balance = await this.connection.getBalance(resp.publicKey);
      
      return {
        address: publicKey,
        balance: balance / 1e9, // Конвертируем lamports в SOL
        network: 'devnet',
      };
    } catch (error) {
      console.error('Failed to connect Phantom wallet:', error);
      throw error;
    }
  }

  async disconnect() {
    if (this.connectedWallet) {
      await this.connectedWallet.disconnect();
      this.connectedWallet = null;
    }
  }

  async getBalance(address: string) {
    try {
      const publicKey = new PublicKey(address);
      const balance = await this.connection.getBalance(publicKey);
      return balance / 1e9; // Конвертируем в SOL
    } catch (error) {
      console.error('Failed to get balance:', error);
      return 0;
    }
  }

  isConnected() {
    return !!this.connectedWallet?.isConnected;
  }

  getConnectedAddress() {
    if (!this.connectedWallet) return null;
    return this.connectedWallet.publicKey?.toString();
  }

  // Подписка на изменения аккаунта
  onAccountChange(callback: (publicKey: PublicKey | null) => void) {
    if (this.connectedWallet) {
      this.connectedWallet.on('accountChanged', callback);
    }
  }

  // Отписка от изменений
  removeAccountChangeListener(callback: (publicKey: PublicKey | null) => void) {
    if (this.connectedWallet) {
      this.connectedWallet.removeListener('accountChanged', callback);
    }
  }
}

export const solanaConnector = new SolanaWalletConnector();
