// MetaMask/Ethereum интеграция

declare global {
  interface Window {
    ethereum?: any;
  }
}

export class EthereumWalletConnector {
  private isConnected: boolean = false;
  private connectedAddress: string | null = null;

  async connect() {
    if (typeof window === 'undefined') {
      throw new Error('Window is undefined');
    }

    // Проверяем наличие MetaMask
    if (!window.ethereum) {
      window.open('https://metamask.io/download/', '_blank');
      throw new Error('MetaMask not found! Please install it.');
    }

    try {
      // Запрашиваем подключение
      const accounts = await window.ethereum.request({
        method: 'eth_requestAccounts',
      });

      if (accounts.length === 0) {
        throw new Error('No accounts found');
      }

      this.connectedAddress = accounts[0];
      this.isConnected = true;

      // Получаем баланс
      const balance = await this.getBalance(this.connectedAddress!);

      // Получаем сеть
      const chainId = await window.ethereum.request({
        method: 'eth_chainId',
      });

      return {
        address: this.connectedAddress,
        balance: balance,
        chainId: parseInt(chainId, 16),
        network: this.getNetworkName(parseInt(chainId, 16)),
      };
    } catch (error) {
      console.error('Failed to connect MetaMask:', error);
      throw error;
    }
  }

  async disconnect() {
    this.isConnected = false;
    this.connectedAddress = null;
  }

  async getBalance(address: string): Promise<number> {
    if (!window.ethereum) return 0;

    try {
      const balance = await window.ethereum.request({
        method: 'eth_getBalance',
        params: [address, 'latest'],
      });

      // Конвертируем из wei в ETH
      return parseInt(balance, 16) / Math.pow(10, 18);
    } catch (error) {
      console.error('Failed to get balance:', error);
      return 0;
    }
  }

  getNetworkName(chainId: number): string {
    const networks: { [key: number]: string } = {
      1: 'Ethereum Mainnet',
      5: 'Goerli Testnet',
      11155111: 'Sepolia Testnet',
      137: 'Polygon Mainnet',
      80001: 'Polygon Mumbai',
      56: 'BSC Mainnet',
      97: 'BSC Testnet',
    };

    return networks[chainId] || `Chain ID: ${chainId}`;
  }

  isWalletConnected(): boolean {
    return this.isConnected;
  }

  getConnectedAddress(): string | null {
    return this.connectedAddress;
  }

  // Переключение сети
  async switchToMainnet() {
    if (!window.ethereum) return;

    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: '0x1' }], // 0x1 = 1 (mainnet)
      });
    } catch (error: any) {
      console.error('Failed to switch network:', error);
      throw error;
    }
  }

  // Подписка на изменения аккаунта
  onAccountChange(callback: (accounts: string[]) => void) {
    if (window.ethereum) {
      window.ethereum.on('accountsChanged', callback);
    }
  }

  // Подписка на изменения сети
  onChainChange(callback: (chainId: string) => void) {
    if (window.ethereum) {
      window.ethereum.on('chainChanged', callback);
    }
  }

  // Отписка от событий
  removeListeners() {
    if (window.ethereum) {
      window.ethereum.removeAllListeners('accountsChanged');
      window.ethereum.removeAllListeners('chainChanged');
    }
  }
}

export const ethereumConnector = new EthereumWalletConnector();
