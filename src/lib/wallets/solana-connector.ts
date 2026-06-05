import { Connection, PublicKey, clusterApiUrl } from '@solana/web3.js';
import { appConfirm } from '@/lib/app-notice';

// ✅ Определяем, является ли устройство мобильным
const isMobile = () => {
  if (typeof window === 'undefined') return false;
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
};

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

    // ✅ ПРОВЕРЯЕМ МОБИЛЬНОЕ УСТРОЙСТВО
    if (isMobile()) {
      console.log('📱 Обнаружено мобильное устройство, используем deep linking для Phantom...');
      
      // ✅ ИСПРАВЛЕНО: Используем правильный способ открытия для Telegram WebApp
      const appUrl = encodeURIComponent(window.location.href);
      const redirectLink = encodeURIComponent(window.location.href);
      
      // ✅ Используем phantom:// URL scheme вместо https://
      // Это напрямую откроет приложение если оно установлено
      const deepLink = `phantom://v1/connect?app_url=${appUrl}&redirect_link=${redirectLink}`;
      
      console.log('🔗 Открываем deep link для Phantom:', deepLink);
      
      // ✅ Используем Telegram WebApp API если доступен
      if ((window as any).Telegram?.WebApp?.openLink) {
        console.log('📱 Открываем через Telegram WebApp API');
        (window as any).Telegram.WebApp.openLink(deepLink);
      } else {
        // Fallback - пробуем прямой deep link
        window.location.href = deepLink;
        
        // Если Phantom не установлен, через 2 секунды предложим скачать
        setTimeout(() => {
          void appConfirm('Phantom кошелек не установлен.\n\nСкачать Phantom?', { confirmText: 'Скачать' }).then((ok) => {
            if (ok) {
              if ((window as any).Telegram?.WebApp?.openLink) {
                (window as any).Telegram.WebApp.openLink('https://phantom.app/download');
              } else {
                window.open('https://phantom.app/download', '_blank');
              }
            }
          });
        }, 2000);
      }
      
      // На мобильных устройствах мы не можем сразу получить ответ
      // Пользователь должен будет вернуться в приложение после подключения
      throw new Error('MOBILE_DEEP_LINK'); // Специальная ошибка для обработки
    }

    // ✅ ДЕСКТОПНАЯ ВЕРСИЯ
    // Проверяем наличие Phantom
    const provider = (window as any).phantom?.solana || (window as any).solana;
    
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
