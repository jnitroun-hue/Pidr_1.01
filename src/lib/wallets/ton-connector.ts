import { TonConnectUI, THEME } from '@tonconnect/ui-react';

// Манифест для TON Connect
const manifestUrl = 'https://not-pdr-yhkt.vercel.app/tonconnect-manifest.json';

export class TonWalletConnector {
  private tonConnectUI: TonConnectUI | null = null;

  async init() {
    if (typeof window === 'undefined') return;
    
    // TonConnectUI принимает manifestUrl и options отдельно
    this.tonConnectUI = new TonConnectUI({
      manifestUrl,
      buttonRootId: 'ton-connect-button',
      uiPreferences: {
        theme: THEME.DARK,
      },
      walletsListConfiguration: {
        includeWallets: []
      }
    });
    
    // Подписка на изменения состояния
    this.tonConnectUI.onStatusChange((wallet) => {
      if (wallet) {
        console.log('TON wallet connected:', wallet.account.address);
      }
    });
  }

  async connect() {
    if (!this.tonConnectUI) await this.init();
    
    try {
      const connectedWallet = await this.tonConnectUI!.connectWallet();
      return {
        address: connectedWallet.account.address,
        network: connectedWallet.account.chain,
        publicKey: connectedWallet.account.publicKey,
      };
    } catch (error) {
      console.error('Failed to connect TON wallet:', error);
      throw error;
    }
  }

  async disconnect() {
    if (this.tonConnectUI) {
      await this.tonConnectUI.disconnect();
    }
  }

  getConnectedWallet() {
    if (!this.tonConnectUI) return null;
    return this.tonConnectUI.wallet;
  }

  isConnected() {
    return !!this.getConnectedWallet();
  }
}

export const tonConnector = new TonWalletConnector();
