import { create } from 'zustand';
import { tonConnector } from '../lib/wallets/ton-connector';
import { solanaConnector } from '../lib/wallets/solana-connector';
import { ethereumConnector } from '../lib/wallets/ethereum-connector';
import { walletService, CryptoType, DepositTransaction, ExchangeRate } from '../lib/wallets/wallet-service';

interface WalletState {
  // TON
  tonAddress: string | null;
  tonBalance: number;
  isTonConnected: boolean;
  
  // Solana
  solanaAddress: string | null;
  solanaBalance: number;
  isSolanaConnected: boolean;
  
  // Ethereum
  ethereumAddress: string | null;
  ethereumBalance: number;
  isEthereumConnected: boolean;
  ethereumNetwork: string | null;
  
  // Общее
  isConnecting: boolean;
  error: string | null;
  
  // Депозиты и обмен
  exchangeRates: ExchangeRate[];
  transactions: DepositTransaction[];
  isExchanging: boolean;
  
  // Actions
  connectTonWallet: () => Promise<void>;
  disconnectTonWallet: () => Promise<void>;
  connectSolanaWallet: () => Promise<void>;
  disconnectSolanaWallet: () => Promise<void>;
  connectEthereumWallet: () => Promise<void>;
  disconnectEthereumWallet: () => Promise<void>;
  updateBalances: () => Promise<void>;
  clearError: () => void;
  
  // Новые actions для обмена
  loadExchangeRates: () => void;
  exchangeCryptoToCoins: (crypto: CryptoType, amount: number) => Promise<{ success: boolean; gameCoinsAdded: number; txId: string }>;
  loadUserTransactions: (userId: string) => void;
  calculateGameCoins: (crypto: CryptoType, amount: number) => number;
}

export const useWalletStore = create<WalletState>((set, get) => ({
  // Initial state
  tonAddress: null,
  tonBalance: 0,
  isTonConnected: false,
  
  solanaAddress: null,
  solanaBalance: 0,
  isSolanaConnected: false,
  
  ethereumAddress: null,
  ethereumBalance: 0,
  isEthereumConnected: false,
  ethereumNetwork: null,
  
  isConnecting: false,
  error: null,
  
  // Депозиты и обмен
  exchangeRates: [],
  transactions: [],
  isExchanging: false,
  
  // TON Actions
  connectTonWallet: async () => {
    set({ isConnecting: true, error: null });
    try {
      const wallet = await tonConnector.connect();
      set({
        tonAddress: wallet.address,
        isTonConnected: true,
        isConnecting: false,
      });
      // TODO: Получить баланс TON
    } catch (error: any) {
      set({
        error: error.message || 'Failed to connect TON wallet',
        isConnecting: false,
      });
    }
  },
  
  disconnectTonWallet: async () => {
    try {
      await tonConnector.disconnect();
      set({
        tonAddress: null,
        tonBalance: 0,
        isTonConnected: false,
      });
    } catch (error: any) {
      set({ error: error.message || 'Failed to disconnect TON wallet' });
    }
  },
  
  // Solana Actions
  connectSolanaWallet: async () => {
    set({ isConnecting: true, error: null });
    try {
      const wallet = await solanaConnector.connect();
      set({
        solanaAddress: wallet.address,
        solanaBalance: wallet.balance,
        isSolanaConnected: true,
        isConnecting: false,
      });
    } catch (error: any) {
      // ✅ Обрабатываем специальный случай для мобильных устройств
      if (error.message === 'MOBILE_DEEP_LINK') {
        // На мобильных устройствах deep link уже открыт, просто выходим
        console.log('📱 Deep link открыт для Phantom на мобильном устройстве');
        set({ isConnecting: false });
        return;
      }
      set({
        error: error.message || 'Failed to connect Solana wallet',
        isConnecting: false,
      });
    }
  },
  
  disconnectSolanaWallet: async () => {
    try {
      await solanaConnector.disconnect();
      set({
        solanaAddress: null,
        solanaBalance: 0,
        isSolanaConnected: false,
      });
    } catch (error: any) {
      set({ error: error.message || 'Failed to disconnect Solana wallet' });
    }
  },
  
  // Ethereum Actions
  connectEthereumWallet: async () => {
    set({ isConnecting: true, error: null });
    try {
      const wallet = await ethereumConnector.connect();
      set({
        ethereumAddress: wallet.address,
        ethereumBalance: wallet.balance,
        ethereumNetwork: wallet.network,
        isEthereumConnected: true,
        isConnecting: false,
      });
    } catch (error: any) {
      set({
        error: error.message || 'Failed to connect Ethereum wallet',
        isConnecting: false,
      });
    }
  },
  
  disconnectEthereumWallet: async () => {
    try {
      await ethereumConnector.disconnect();
      set({
        ethereumAddress: null,
        ethereumBalance: 0,
        ethereumNetwork: null,
        isEthereumConnected: false,
      });
    } catch (error: any) {
      set({ error: error.message || 'Failed to disconnect Ethereum wallet' });
    }
  },
  
  // Обновление балансов
  updateBalances: async () => {
    const state = get();
    
    // Обновляем баланс Solana
    if (state.isSolanaConnected && state.solanaAddress) {
      const balance = await solanaConnector.getBalance(state.solanaAddress);
      set({ solanaBalance: balance });
    }
    
    // Обновляем баланс Ethereum
    if (state.isEthereumConnected && state.ethereumAddress) {
      const balance = await ethereumConnector.getBalance(state.ethereumAddress);
      set({ ethereumBalance: balance });
    }
    
    // TODO: Обновить баланс TON
  },
  
  clearError: () => set({ error: null }),
  
  // Новые actions для обмена
  loadExchangeRates: () => {
    const rates = walletService.getExchangeRates();
    set({ exchangeRates: rates });
  },
  
  exchangeCryptoToCoins: async (crypto: CryptoType, amount: number) => {
    set({ isExchanging: true, error: null });
    try {
      // ✅ ИСПРАВЛЕНО: Получаем telegramId из Telegram WebApp
      const telegramUser = typeof window !== 'undefined' && (window as any).Telegram?.WebApp?.initDataUnsafe?.user;
      const telegramId = telegramUser?.id?.toString() || '';
      
      if (!telegramId) {
        throw new Error('User not logged in');
      }
      
      const result = await walletService.exchangeToGameCoins(telegramId, crypto, amount);
      
      // Обновляем транзакции
      const transactions = walletService.getUserTransactions(telegramId);
      set({ transactions, isExchanging: false });
      
      return result;
    } catch (error: any) {
      set({ 
        error: error.message || 'Exchange failed', 
        isExchanging: false 
      });
      throw error;
    }
  },
  
  loadUserTransactions: (userId: string) => {
    const transactions = walletService.getUserTransactions(userId);
    set({ transactions });
  },
  
  calculateGameCoins: (crypto: CryptoType, amount: number) => {
    return walletService.calculateGameCoins(crypto, amount);
  },
}));
