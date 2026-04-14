'use client'

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FaCoins, 
  FaPlus, 
  FaMinus, 
  FaShoppingCart, 
  FaHistory,
  FaWallet,
  FaExchangeAlt,
  FaCreditCard,
  FaGift,
  FaTrophy,
  FaArrowUp,
  FaArrowDown,
  FaKey,
  FaDatabase,
  FaBars,
  FaBolt,
  FaMoneyBillWave
} from 'react-icons/fa';
import { SiVisa, SiMastercard } from 'react-icons/si';
import { MasterWalletService } from '@/lib/wallets/master-wallet-service';
import styles from './GameWallet.module.css';
import ConnectedWalletsList from './ConnectedWalletsList';

interface User {
  id: string;
  username: string;
  firstName: string;
  coins: number;
  rating: number;
}

interface Transaction {
  id: string;
  amount: number;
  type: 'deposit' | 'withdrawal' | 'purchase' | 'game_win' | 'game_loss' | 'bonus';
  description: string;
  created_at: string;
  balance_after: number;
}

interface GameWalletProps {
  user?: User;
  onBalanceUpdate?: (newBalance: number) => void;
}

type ModalType = 'deposit' | 'withdraw' | 'buy' | null;
type DepositMethod = 'crypto' | 'rub';
type PurchaseMode = 'coins' | 'balance';
type CurrencyMode = 'RUB' | 'USD';
type WithdrawMethod = 'crypto' | 'bank_card' | 'sberbank' | 'yoo_money' | 'sbp';

const CRYPTO_OPTIONS = [
  { id: 'TON', icon: '💎', name: 'TON', color: '#0098EA', net: 'TON Network', eta: '~5 сек' },
  { id: 'ETH', icon: '⟠', name: 'ETH', color: '#627EEA', net: 'Ethereum (ERC-20)', eta: '2-15 мин' },
  { id: 'SOL', icon: '◎', name: 'SOL', color: '#9945FF', net: 'Solana (SPL)', eta: '~30 сек' },
  { id: 'USDT', icon: '₮', name: 'USDT', color: '#26A17B', net: 'Tether (USDT)', eta: '2-15 мин' },
  { id: 'BTC', icon: '₿', name: 'BTC', color: '#F7931A', net: 'Bitcoin', eta: '10-60 мин' },
] as const;

const PAYMENT_METHODS = [
  { id: 'bank_card' as const, name: 'Visa / MC', accent: '#ffd700' },
  { id: 'sberbank' as const, name: 'СберПей', accent: '#22c55e' },
  { id: 'yoo_money' as const, name: 'ЮMoney', accent: '#8b5cf6' },
  { id: 'sbp' as const, name: 'СБП', accent: '#f59e0b' },
] as const;

export default function GameWallet({ user, onBalanceUpdate }: GameWalletProps) {
  // ✅ УНИВЕРСАЛЬНО: Получаем данные пользователя из всех платформ
  const getCurrentUser = () => {
    if (user) return user;
    
    // Для Telegram WebApp
    if (typeof window !== 'undefined' && window.Telegram?.WebApp) {
      const telegramUser = (window as any).Telegram?.WebApp?.initDataUnsafe?.user;
      if (telegramUser) {
        return {
          id: telegramUser.id?.toString() || '',
          username: telegramUser.username || telegramUser.first_name || '',
          firstName: telegramUser.first_name || ''
        };
      }
    }
    
    // Для веб-версии данные будут загружены через API
    return null;
  };
  
  const [activeTab, setActiveTab] = useState<'main' | 'history' | 'exchange'>('main');
  const [balance, setBalance] = useState(user?.coins || 0);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [depositAmount, setDepositAmount] = useState('');
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [activeModal, setActiveModal] = useState<ModalType>(null);
  const [withdrawAddress, setWithdrawAddress] = useState('');
  const [withdrawMethod, setWithdrawMethod] = useState<WithdrawMethod>('crypto');
  const [withdrawRecipient, setWithdrawRecipient] = useState('');
  const [selectedCrypto, setSelectedCrypto] = useState('TON');
  const [depositMethod, setDepositMethod] = useState<DepositMethod>('rub');
  const [rubAmount, setRubAmount] = useState('');
  const [selectedPayMethod, setSelectedPayMethod] = useState<'bank_card' | 'sberbank' | 'yoo_money' | 'sbp'>('bank_card');
  const [yookassaLoading, setYookassaLoading] = useState(false);
  const [masterAddresses, setMasterAddresses] = useState<any[]>([]);
  const [isGeneratingAddress, setIsGeneratingAddress] = useState(false);
  const [isMonitoringPayments, setIsMonitoringPayments] = useState(false);
  const [bonusAvailable, setBonusAvailable] = useState(true); // Состояние доступности бонуса
  const [isCryptoMenuOpen, setIsCryptoMenuOpen] = useState(false); // Состояние бургер-меню криптовалют
  const [cryptoBalances, setCryptoBalances] = useState<Record<string, number>>({
    TON: 0,
    ETH: 0,
    USDT: 0,
    BTC: 0,
    SOL: 0
  });
  const [hasLoadedCryptoBalances, setHasLoadedCryptoBalances] = useState(false);
  const [selectedWalletForDeposit, setSelectedWalletForDeposit] = useState<any>(null);
  const [purchaseMode, setPurchaseMode] = useState<PurchaseMode>('coins');
  const [currencyMode, setCurrencyMode] = useState<CurrencyMode>('RUB');
  const [usdAmount, setUsdAmount] = useState('');
  const masterWalletService = new MasterWalletService();

  // Загружаем данные пользователя и транзакции
  // ✅ НОВОЕ: Кеш для истории транзакций
  const lastTransactionsUpdate = useRef(0);
  const transactionsUpdateInterval = 10 * 60 * 1000; // 10 минут

  useEffect(() => {
    console.log('🔄 GameWallet: инициализация компонента', { user: !!user, userId: user?.id });
    loadUserData();
    
    // ✅ ВСЕГДА загружаем транзакции при первой загрузке
    loadTransactions();
    lastTransactionsUpdate.current = Date.now();
    
    loadMasterAddresses();
    loadCryptoBalances();
    checkBonusStatus(); // Проверяем статус бонуса
    
    // Диагностика кошельков
    if (user?.id) {
      console.log('🔍 GameWallet: проверяем доступность API кошельков...');
      fetch('/api/wallet/unified?action=validate_config')
        .then(res => res.json())
        .then(data => {
          console.log('🏦 GameWallet: конфигурация кошельков:', data);
        })
        .catch(err => {
          console.error('❌ GameWallet: ошибка проверки конфигурации:', err);
        });
    }
    
    // Запрашиваем разрешение на уведомления
    if (window.Notification && Notification.permission === 'default') {
      Notification.requestPermission().then(permission => {
        if (permission === 'granted') {
          console.log('✅ Разрешение на уведомления получено');
        }
      });
    }
  }, [user]);

  // ✅ НОВОЕ: Автообновление истории транзакций каждые 10 минут
  useEffect(() => {
    if (!user?.id) return;

    const intervalId = setInterval(() => {
      console.log('⏰ Автообновление истории транзакций (каждые 10 минут)');
      loadTransactions();
      lastTransactionsUpdate.current = Date.now();
    }, transactionsUpdateInterval);

    return () => clearInterval(intervalId);
  }, [user?.id]);

  // ✅ НОВОЕ: Слушаем события новых транзакций
  useEffect(() => {
    const handleNewTransaction = () => {
      console.log('💸 Новая транзакция - обновляем историю');
      loadTransactions();
      lastTransactionsUpdate.current = Date.now();
    };

    const handleWalletUpdate = () => {
      console.log('👛 Кошельки обновлены - перезагружаем балансы');
      loadCryptoBalances();
    };

    window.addEventListener('transaction-created', handleNewTransaction);
    window.addEventListener('wallet-updated', handleWalletUpdate);
    
    return () => {
      window.removeEventListener('transaction-created', handleNewTransaction);
      window.removeEventListener('wallet-updated', handleWalletUpdate);
    };
  }, []);

  // Автоматический мониторинг платежей каждые 30 секунд
  useEffect(() => {
    if (!user?.id) return;

    const interval = setInterval(async () => {
      try {
        // Используем cookies через API (не localStorage!)
        // Token передается автоматически через HTTP-only cookies

        const response = await fetch('/api/wallet/check-payments', {
          method: 'POST',
          credentials: 'include', // Автоматически отправляет cookies
          headers: {
            'Content-Type': 'application/json'
          }
        });

        if (response.ok) {
          const result = await response.json();
          if (result.success && result.newPayments && result.newPayments.length > 0) {
            console.log('🎉 Автоматически найдены новые платежи:', result.newPayments);
            
            // Обновляем данные
            await loadUserData();
            await loadTransactions();
            
            // Уведомляем пользователя
            const totalAmount = result.newPayments.reduce((sum: number, payment: any) => sum + payment.amount, 0);
            
            // Показываем уведомление в интерфейсе вместо alert
            if (window.Notification && Notification.permission === 'granted') {
              new Notification('💰 Новое пополнение!', {
                body: `Получено ${result.newPayments.length} платежей на сумму ${totalAmount} монет`,
                icon: '/favicon.ico'
              });
            }

            // Обновляем баланс в родительском компоненте
            if (onBalanceUpdate && result.newBalance) {
              onBalanceUpdate(result.newBalance);
            }
          }
        }
      } catch (error) {
        console.warn('⚠️ Ошибка автоматической проверки платежей:', error);
      }
    }, 30000); // Каждые 30 секунд

    return () => clearInterval(interval);
  }, [user?.id, onBalanceUpdate]);

  // Загрузка мастер адресов пользователя
  const loadMasterAddresses = async () => {
    if (!user?.id) return;

    try {
      console.log('🏦 Загружаем мастер адреса для пользователя:', user.id);
      
      // Создаем адреса для всех поддерживаемых монет
      const coins = ['USDT', 'TON', 'ETH', 'SOL', 'BTC'];
      const addresses = [];
      
      for (const coin of coins) {
        try {
          const paymentInfo = masterWalletService.getPaymentAddress(user.id, coin);
          addresses.push({
            id: `master-${coin}-${user.id}`,
            coin: coin,
            address: paymentInfo.address,
            memo: paymentInfo.memo,
            note: paymentInfo.note,
            isActive: true,
            createdAt: new Date().toISOString()
          });
          console.log(`✅ ${coin} мастер адрес создан:`, paymentInfo.address);
        } catch (error) {
          console.error(`❌ Ошибка создания ${coin} адреса:`, error);
        }
      }
      
      setMasterAddresses(addresses);
      console.log('🏦 Мастер адреса загружены:', addresses.length);
    } catch (error) {
      console.error('❌ Ошибка загрузки мастер адресов:', error);
    }
  };

  const loadCryptoBalances = async () => {
    try {
      const response = await fetch('/api/nft/connect-wallet', {
        method: 'GET',
        credentials: 'include'
      });

      if (!response.ok) {
        setHasLoadedCryptoBalances(true);
        return;
      }

      const result = await response.json();
      const nextBalances: Record<string, number> = {
        TON: 0,
        ETH: 0,
        USDT: 0,
        BTC: 0,
        SOL: 0
      };

      if (result.success && Array.isArray(result.wallets)) {
        result.wallets.forEach((wallet: any) => {
          const walletType = String(wallet.wallet_type || wallet.coin_type || '').toUpperCase();
          const rawBalance = wallet.balance ?? wallet.available_balance ?? 0;
          const parsedBalance = typeof rawBalance === 'number' ? rawBalance : parseFloat(String(rawBalance));

          if (walletType in nextBalances && !Number.isNaN(parsedBalance)) {
            nextBalances[walletType] = parsedBalance;
          }
        });
      }

      setCryptoBalances(nextBalances);
    } catch (error) {
      console.error('❌ Ошибка загрузки крипто-балансов:', error);
    } finally {
      setHasLoadedCryptoBalances(true);
    }
  };

  const formatCryptoBalance = (crypto: string) => {
    if (!hasLoadedCryptoBalances) {
      return '...';
    }

    return (cryptoBalances[crypto] || 0).toFixed(6);
  };

  const loadUserData = async () => {
    try {
      // ✅ УНИВЕРСАЛЬНО: Используем универсальные headers для всех платформ
      const { getApiHeaders } = await import('@/lib/api-headers');
      const headers = getApiHeaders() as Record<string, string>;
      
      // Получаем данные пользователя из API (не из localStorage!)
      const authResponse = await fetch('/api/auth', {
        method: 'GET',
        credentials: 'include',
        headers
      });
      
      if (!authResponse.ok) {
        console.error('❌ Пользователь не авторизован');
        return;
      }
      
      const authResult = await authResponse.json();
      if (!authResult.success || !authResult.user) {
        console.error('❌ Нет данных пользователя');
        return;
      }
      
      const parsedUser = authResult.user;
        
      // Получаем актуальный баланс из базы данных
      const balanceResponse = await fetch('/api/pidr-db', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'get_user_balance',
          userId: parsedUser.telegramId || parsedUser.id
        })
      });

      if (balanceResponse.ok) {
        const data = await balanceResponse.json();
        if (data.success) {
          const actualBalance = data.balance || 0;
          setBalance(actualBalance);
          onBalanceUpdate?.(actualBalance);
          console.log('✅ Баланс загружен из БД:', actualBalance);
        } else {
          // Используем баланс из auth API
          setBalance(parsedUser.coins || 0);
        }
      } else {
        // Используем баланс из auth API
        setBalance(parsedUser.coins || 0);
      }
    } catch (error) {
      console.error('❌ Ошибка загрузки данных пользователя:', error);
      setBalance(0);
    }
  };

  // Проверяем активность сессии в БД
  const checkDatabaseSession = async () => {
    try {
      // ✅ УНИВЕРСАЛЬНО: Используем универсальные headers для всех платформ
      const { getApiHeaders } = await import('@/lib/api-headers');
      const headers = getApiHeaders() as Record<string, string>;
      
      const response = await fetch('/api/auth', {
        method: 'GET',
        credentials: 'include', // Важно для отправки cookies
        headers
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          console.log('✅ Сессия активна в БД');
          return true;
        }
      }
      
      console.log('❌ Сессия неактивна в БД');
      return false;
    } catch (error) {
      console.error('❌ Ошибка проверки сессии в БД:', error);
      return false;
    }
  };

  const loadTransactions = async () => {
    if (!user?.id) return;

    try {
      // ✅ НЕ ПОКАЗЫВАЕМ ЗАГРУЗКУ если есть кешированные данные
      if (transactions.length === 0) {
        setLoading(true);
      }
      
      // Проверяем сессию в БД
      const sessionActive = await checkDatabaseSession();
      if (!sessionActive) {
        console.warn('⚠️ Сессия неактивна для загрузки транзакций');
        return;
      }

      const response = await fetch('/api/wallet/transactions?limit=50', {
        credentials: 'include', // Отправляем cookies вместо токена
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success && result.transactions) {
          // Преобразуем транзакции в нужный формат
          const formattedTransactions = result.transactions
            .filter((tx: any) => 
              // ✅ ТОЛЬКО ПОКУПКИ И ГЕНЕРАЦИИ!
              tx.type === 'nft_purchase' || 
              tx.type === 'nft_generation' || 
              tx.type === 'shop_purchase' ||
              tx.type === 'item_purchase' ||
              tx.description?.includes('Покупка') ||
              tx.description?.includes('Генерация')
            )
            .slice(0, 10) // ✅ ТОЛЬКО 10 ПОСЛЕДНИХ!
            .map((tx: any) => ({
              id: tx.id,
              amount: tx.amount,
              type: tx.type,
              description: tx.description,
              created_at: tx.createdAt,
              balance_after: tx.amount // Приблизительно
            }));

          setTransactions(formattedTransactions);
          console.log('✅ Транзакции загружены из нового API:', formattedTransactions.length);
        } else {
          console.error('Ошибка получения транзакций:', result.message);
        }
      } else {
        console.warn(`⚠️ Ошибка API ${response.status}, используем fallback`);
        
        // Fallback к старому API
        const currentUser = getCurrentUser();
        if (currentUser && currentUser.id) {
          
          const fallbackResponse = await fetch('/api/pidr-db', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'get_user_transactions',
              userId: currentUser.id
            })
          });

          if (fallbackResponse.ok) {
            const data = await fallbackResponse.json();
            if (data.success) {
              setTransactions(data.transactions || []);
              console.log('✅ Транзакции загружены через fallback API');
            }
          }
        }
      }
    } catch (error) {
      console.error('❌ Ошибка загрузки транзакций:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeposit = async () => {
    const amount = parseInt(depositAmount);
    if (!amount || amount <= 0) {
      alert('Введите корректную сумму для пополнения');
      return;
    }

    try {
      setLoading(true);
      
      // ✅ УНИВЕРСАЛЬНО: Получаем пользователя из всех платформ
      const currentUser = getCurrentUser();
      if (!currentUser || !currentUser.id) {
        alert('Пользователь не найден');
        return;
      }
      
      // Создаем транзакцию через API
      const response = await fetch('/api/pidr-db', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create_transaction',
          userId: currentUser.id,
          amount: amount,
          transactionType: 'deposit',
          description: 'Пополнение баланса'
        })
      });

      const result = await response.json();
      
      if (result.success) {
        const newBalance = result.newBalance;
        setBalance(newBalance);
        setDepositAmount('');
        
        // ✅ ИСПРАВЛЕНО: НЕ сохраняем в localStorage, баланс уже в БД
        
        onBalanceUpdate?.(newBalance);
        
        // Перезагружаем транзакции
        loadTransactions();
        
        alert(`Баланс успешно пополнен на ${amount} монет!`);
      } else {
        throw new Error(result.error || 'Ошибка пополнения');
      }
      
    } catch (error) {
      console.error('Ошибка пополнения:', error);
      alert('Ошибка пополнения баланса: ' + (error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  // ✅ НОВОЕ: Пополнение через подключенный кошелёк (TonConnect/Phantom/MetaMask)
  const handleDepositViaWallet = async () => {
    if (!selectedWalletForDeposit) {
      alert('Выберите кошелёк для пополнения');
      return;
    }

    const amount = parseFloat(depositAmount);
    if (!amount || amount <= 0) {
      alert('Введите корректную сумму для пополнения');
      return;
    }

    const walletType = selectedWalletForDeposit.wallet_type?.toLowerCase() || selectedCrypto.toLowerCase();
    
    try {
      setLoading(true);
      console.log(`💳 Пополнение через ${walletType}:`, { amount, crypto: selectedCrypto });

      // ✅ Получаем MASTER_WALLET адрес для выбранной криптовалюты
      const masterAddressResponse = await fetch(`/api/wallet/unified?action=get_master_address&network=${selectedCrypto}`);
      const masterAddressData = await masterAddressResponse.json();
      
      if (!masterAddressData.success || !masterAddressData.address) {
        throw new Error('Не удалось получить адрес для пополнения');
      }

      const masterAddress = masterAddressData.address;
      console.log(`📬 MASTER_WALLET адрес для ${selectedCrypto}:`, masterAddress);

      // ✅ Открываем кошелёк с готовой транзакцией
      if (walletType === 'ton') {
        // TonConnect - открываем через tonkeeper/tonhub
        const tonAmountNano = Math.floor(amount * 1e9); // TON в nanoTON
        const currentUser = getCurrentUser();
        const tonLink = `ton://transfer/${masterAddress}?amount=${tonAmountNano}&text=deposit_${currentUser?.id || user?.id || 'unknown'}`;
        
        // Пробуем открыть через Telegram WebApp
        if ((window as any).Telegram?.WebApp?.openLink) {
          (window as any).Telegram.WebApp.openLink(tonLink);
        } else {
          window.open(tonLink, '_blank');
        }
        
        alert(`✅ Откройте кошелёк и подтвердите транзакцию на ${amount} TON.\n\nПосле подтверждения баланс обновится автоматически.`);
        
      } else if (walletType === 'sol' || walletType === 'solana') {
        // Solana - открываем через Phantom
        const solLink = `https://phantom.app/ul/v1/signAndSendTransaction?network=mainnet-beta`;
        
        // Попытка через Phantom deeplink
        const phantomLink = `phantom://send?recipient=${masterAddress}&amount=${amount}`;
        
        if ((window as any).solana?.isPhantom) {
          // Если Phantom установлен как расширение
          try {
            const provider = (window as any).solana;
            if (!provider.isConnected) {
              await provider.connect();
            }
            // Создаём транзакцию
            alert(`✅ Подготовка транзакции Solana...\n\nОтправьте ${amount} SOL на адрес:\n${masterAddress}`);
          } catch (err) {
            console.error('Phantom error:', err);
            window.open(phantomLink, '_blank');
          }
        } else {
          // Открываем через deeplink
          if ((window as any).Telegram?.WebApp?.openLink) {
            (window as any).Telegram.WebApp.openLink(phantomLink);
          } else {
            window.open(phantomLink, '_blank');
          }
        }
        
        alert(`✅ Откройте Phantom и подтвердите транзакцию на ${amount} SOL.\n\nПосле подтверждения баланс обновится автоматически.`);
        
      } else if (walletType === 'eth' || walletType === 'ethereum') {
        // Ethereum - открываем через MetaMask
        const ethAmountWei = BigInt(Math.floor(amount * 1e18)).toString(16);
        
        if ((window as any).ethereum) {
          try {
            await (window as any).ethereum.request({
              method: 'eth_sendTransaction',
              params: [{
                to: masterAddress,
                value: '0x' + ethAmountWei,
                from: selectedWalletForDeposit.wallet_address
              }]
            });
            alert(`✅ Транзакция отправлена!\n\nПосле подтверждения баланс обновится автоматически.`);
          } catch (err: any) {
            if (err.code === 4001) {
              alert('❌ Транзакция отклонена пользователем');
            } else {
              throw err;
            }
          }
        } else {
          // Открываем MetaMask deeplink
          const mmLink = `https://metamask.app.link/send/${masterAddress}@1?value=${ethAmountWei}`;
          window.open(mmLink, '_blank');
          alert(`✅ Откройте MetaMask и подтвердите транзакцию на ${amount} ETH.`);
        }
      } else {
        alert(`⚠️ Пополнение через ${walletType} пока не поддерживается.\n\nСкопируйте адрес выше и отправьте вручную.`);
      }

      // Закрываем модалку
      setActiveModal(null);
      setDepositAmount('');
      
    } catch (error: any) {
      console.error('❌ Ошибка пополнения через кошелёк:', error);
      alert('Ошибка: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleWithdraw = async () => {
    const amount = Math.floor(Number(withdrawAmount));
    if (!amount || amount <= 0) {
      alert('Введите корректную сумму для вывода');
      return;
    }

    if (amount > balance) {
      alert('Недостаточно средств на балансе');
      return;
    }

    try {
      setLoading(true);
      
      // ✅ УНИВЕРСАЛЬНО: Получаем пользователя из всех платформ
      const currentUser = getCurrentUser();
      if (!currentUser || !currentUser.id) {
        alert('Пользователь не найден');
        return;
      }

      const selectedWithdrawMethod = withdrawMethod === 'crypto'
        ? `crypto:${selectedCrypto}`
        : withdrawMethod;

      const payoutTarget = withdrawMethod === 'crypto' ? withdrawAddress.trim() : withdrawRecipient.trim();
      if (!payoutTarget) {
        alert(withdrawMethod === 'crypto' ? 'Введите адрес кошелька' : 'Введите реквизиты для вывода');
        return;
      }

      const methodLabel = withdrawMethod === 'crypto'
        ? `${selectedCrypto} wallet`
        : PAYMENT_METHODS.find((method) => method.id === withdrawMethod)?.name || 'Способ вывода';

      const rubEquivalent = Math.floor(amount / 50);
      const description = [
        `Заявка на вывод через ${methodLabel}`,
        `Сумма: ${amount.toLocaleString('ru-RU')} монет`,
        rubEquivalent > 0 ? `(≈ ${rubEquivalent.toLocaleString('ru-RU')} ₽)` : '',
        `Реквизиты: ${payoutTarget}`,
        `Канал: ${selectedWithdrawMethod}`
      ].filter(Boolean).join(' | ');
      
      // Создаем транзакцию через API
      const response = await fetch('/api/pidr-db', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create_transaction',
          userId: currentUser.id,
          amount: -amount, // Отрицательное значение для вывода
          transactionType: 'withdrawal',
          description
        })
      });

      const result = await response.json();
      
      if (result.success) {
        const newBalance = result.newBalance;
        setBalance(newBalance);
        setWithdrawAmount('');
        setWithdrawAddress('');
        setWithdrawRecipient('');
        setActiveModal(null);
        
        // ✅ ИСПРАВЛЕНО: НЕ сохраняем в localStorage, баланс уже в БД
        
        onBalanceUpdate?.(newBalance);
        
        // Перезагружаем транзакции
        loadTransactions();
        
        alert(`Заявка на вывод создана: ${amount.toLocaleString('ru-RU')} монет через ${methodLabel}.`);
      } else {
        throw new Error(result.error || 'Ошибка вывода');
      }
      
    } catch (error) {
      console.error('Ошибка вывода:', error);
      alert('Ошибка вывода средств: ' + (error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'deposit': return <FaArrowUp className="text-green-400" />;
      case 'withdrawal': return <FaArrowDown className="text-red-400" />;
      case 'purchase': return <FaShoppingCart className="text-blue-400" />;
      case 'game_win': return <FaTrophy className="text-yellow-400" />;
      case 'game_loss': return <FaMinus className="text-red-400" />;
      case 'bonus': return <FaGift className="text-purple-400" />;
      default: return <FaCoins className="text-yellow-400" />;
    }
  };

  const getTransactionColor = (amount: number) => {
    return amount > 0 ? 'text-green-400' : 'text-red-400';
  };

  const getWithdrawMethodLabel = (method: WithdrawMethod) => {
    if (method === 'crypto') {
      return 'Криптовалюта';
    }

    return PAYMENT_METHODS.find((item) => item.id === method)?.name || 'Способ вывода';
  };

  const getWithdrawRecipientLabel = () => {
    switch (withdrawMethod) {
      case 'bank_card':
        return 'Номер карты';
      case 'sbp':
      case 'sberbank':
        return 'Телефон получателя';
      case 'yoo_money':
        return 'ЮMoney кошелек или номер';
      default:
        return 'Адрес кошелька';
    }
  };
  
  const handleDailyBonus = async () => {
    try {
      setLoading(true);
      
      console.log('🎁 Получение ежедневного бонуса через новый API...');
      
      // Используем новый API для получения бонусов
      const response = await fetch('/api/bonus', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json' 
        },
        credentials: 'include', // Включаем cookies для авторизации
        body: JSON.stringify({
          bonusType: 'daily'
        })
      });

      const result = await response.json();
      
      if (!response.ok) {
        // Обработка ошибок (например, таймер не истек)
        if (response.status === 400 && result.data?.hoursLeft) {
          alert(`⏰ Ежедневный бонус уже получен!\n\nСледующий бонус через: ${result.data.hoursLeft} ч.\n\nПоследний бонус: +${result.data.lastBonusAmount || 0} монет`);
          return;
        }
        throw new Error(result.message || 'Ошибка получения бонуса');
      }
      
      if (result.success) {
        const newBalance = result.data.newBalance;
        const bonusAmount = result.data.bonusAmount;
        
        setBalance(newBalance);
        setBonusAvailable(false); // КРИТИЧЕСКОЕ ИСПРАВЛЕНИЕ: Отключаем бонус после получения
        
        // ✅ ИСПРАВЛЕНО: НЕ сохраняем в localStorage, баланс уже в БД
        
        onBalanceUpdate?.(newBalance);
        
        // Перезагружаем транзакции
        loadTransactions();
        
        alert(`🎉 ${result.message || `Получен ежедневный бонус +${bonusAmount} монет!`}\n\n💡 Если вас пригласил друг, он получит бонус +500 монет!`);
      } else {
        throw new Error(result.message || 'Ошибка получения бонуса');
      }
      
    } catch (error) {
      console.error('Ошибка получения бонуса:', error);
      alert('Ошибка получения бонуса: ' + (error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleInviteFriend = async () => {
    try {
      // ✅ УНИВЕРСАЛЬНО: Получаем пользователя из всех платформ
      const currentUser = getCurrentUser();
      if (!currentUser || !currentUser.id) {
        alert('Пользователь не найден');
        return;
      }
      
      // ✅ ИСПРАВЛЕНО: Генерируем реферальную ссылку на Telegram бота
      const referralCode = currentUser.id || 'player_' + Date.now();
      const botUsername = 'NotPidrBot';
      const inviteUrl = `https://t.me/${botUsername}?start=ref_${referralCode}`;
      
      // Если мы в Telegram WebApp, используем Telegram Share API
      if (typeof window !== 'undefined' && window.Telegram?.WebApp) {
        const tg = window.Telegram.WebApp;
        const inviteText = `🎮 Присоединяйся к игре The Must!\n\n` +
                          `Получи +500 монет за регистрацию по моей ссылке!\n\n` +
                          `${inviteUrl}`;
        
        if (typeof tg.openTelegramLink === 'function') {
          tg.openTelegramLink(`https://t.me/share/url?url=${encodeURIComponent(inviteUrl)}&text=${encodeURIComponent(inviteText)}`);
        } else {
          // Fallback для старых версий Telegram
          window.open(`https://t.me/share/url?url=${encodeURIComponent(inviteUrl)}&text=${encodeURIComponent(inviteText)}`, '_blank');
        }
      } else {
        // Fallback - копируем в буфер обмена
        if (navigator.clipboard) {
          await navigator.clipboard.writeText(inviteUrl);
          alert(`Реферальная ссылка скопирована в буфер обмена!\n\n${inviteUrl}\n\nПоделитесь ей с друзьями и получите +500 монет за каждого!`);
        } else {
          // Показываем ссылку для ручного копирования
          prompt('Скопируйте эту ссылку и поделитесь с друзьями:', inviteUrl);
        }
      }
      
    } catch (error) {
      console.error('Ошибка создания приглашения:', error);
      alert('Ошибка создания приглашения: ' + (error as Error).message);
    }
  };

  // КРИТИЧЕСКОЕ ИСПРАВЛЕНИЕ: Проверяем статус бонуса через API
  const checkBonusStatus = async () => {
    try {
      const response = await fetch('/api/bonus', {
        method: 'GET',
        credentials: 'include'
      });
      
      if (response.ok) {
        const result = await response.json();
        const dailyBonus = result.bonuses?.find((b: any) => b.id === 'daily');
        setBonusAvailable(dailyBonus?.available || false);
      }
    } catch (error) {
      console.error('Ошибка проверки статуса бонуса:', error);
      setBonusAvailable(false); // По умолчанию недоступен при ошибке
    }
  };

  const checkBonusAvailability = () => {
    // КРИТИЧЕСКОЕ ИСПРАВЛЕНИЕ: Не полагаемся только на localStorage
    // Проверяем состояние бонуса через API при каждой проверке
    return bonusAvailable;
  };

  // ✅ ОПЛАТА РУБЛЯМИ ЧЕРЕЗ ЮКАССУ
  const handleRubPayment = async () => {
    const amount = parseFloat(rubAmount);
    if (!amount || amount < 100) {
      alert('Минимальная сумма пополнения: 100 руб.');
      return;
    }
    setYookassaLoading(true);
    try {
      const coins = Math.round(amount * 50); // 100 руб = 5000 монет => 1 руб = 50 монет
      const response = await fetch('/api/payments/yookassa/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          amount,
          description: `Пополнение баланса: ${coins.toLocaleString()} монет`,
          itemType: 'coins',
          paymentMethod: selectedPayMethod,
        })
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Ошибка создания платежа');
      }
      if (data.payment?.confirmationUrl) {
        window.location.href = data.payment.confirmationUrl;
      } else {
        throw new Error('URL оплаты не получен');
      }
    } catch (error: any) {
      console.error('❌ YooKassa error:', error);
      alert(error.message || 'Ошибка создания платежа');
    } finally {
      setYookassaLoading(false);
    }
  };

  // 🔥 ИСПРАВЛЕННАЯ генерация адреса через Unified Master Wallet API
  const generateDepositAddress = async (crypto: string, userId: string): Promise<string> => {
    console.log(`🎯 generateDepositAddress вызвана для ${crypto}, userId: ${userId}`);
    
    if (!userId) {
      console.log('❌ generateDepositAddress: нет userId');
      return 'Ошибка: нет ID пользователя';
    }

    try {
      setIsGeneratingAddress(true);
      console.log(`🔄 generateDepositAddress: начинаем генерацию для ${crypto}`);
      
      // Сначала проверяем, есть ли уже адрес для этой монеты
      let existingAddress = masterAddresses.find(addr => addr.coin === crypto.toUpperCase());
      console.log(`🔍 generateDepositAddress: проверяем существующие адреса`, { 
        crypto: crypto.toUpperCase(), 
        masterAddresses: masterAddresses.length,
        existingAddress: !!existingAddress 
      });
      
      if (existingAddress) {
        console.log(`✅ generateDepositAddress: используем существующий адрес для ${crypto}:`, existingAddress.address);
        return existingAddress.address;
      }

      // 🔥 ИСПОЛЬЗУЕМ MASTER АДРЕС НАПРЯМУЮ (без HD деривации)
      console.log(`🔄 Получаем Master адрес для ${crypto}...`);
      
      const response = await fetch(`/api/wallet/unified?action=get_master_address&network=${crypto.toUpperCase()}`, {
        method: 'GET',
        credentials: 'include'
      });

      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.message || 'Ошибка API');
      }
      
      if (result.success && result.address) {
        const newAddress = {
          id: `master-${crypto}-${userId}`,
          coin: crypto.toUpperCase(),
          address: result.address,
          memo: result.memo || '',
          note: `Master адрес для ${crypto} (${result.memo ? 'с memo' : 'без memo'})`,
          isActive: true,
          createdAt: new Date().toISOString()
        };
        
        // Добавляем в локальный массив
        setMasterAddresses(prev => [...prev, newAddress]);
        console.log(`✅ Master адрес получен для ${crypto}:`, result.address);
        if (result.memo) {
          console.log(`📝 Memo для ${crypto}:`, result.memo);
        }
        
        return result.address;
      } else {
        throw new Error(result.message || 'Не удалось получить адрес');
      }
    } catch (error) {
      console.error(`❌ Ошибка генерации адреса для ${crypto}:`, error);
      
      // FALLBACK: Используем старый MasterWalletService
      try {
        console.log(`🔄 Fallback: используем MasterWalletService для ${crypto}...`);
        const paymentInfo = masterWalletService.getPaymentAddress(userId, crypto.toUpperCase());
        
        const fallbackAddress = {
          id: `fallback-${crypto}-${userId}`,
          coin: crypto.toUpperCase(),
          address: paymentInfo.address,
          memo: paymentInfo.memo,
          note: paymentInfo.note,
          isActive: true,
          createdAt: new Date().toISOString()
        };
        
        setMasterAddresses(prev => [...prev, fallbackAddress]);
        console.log(`✅ Fallback адрес создан для ${crypto}:`, paymentInfo.address);
        
        return paymentInfo.address;
      } catch (fallbackError) {
        console.error(`❌ Fallback также не сработал:`, fallbackError);
        return `Ошибка: ${error}`;
      }
    } finally {
      setIsGeneratingAddress(false);
    }
  };

  // Функция для мониторинга и обновления баланса
  const checkPaymentsAndUpdateBalance = async () => {
    if (!user?.id) return;

    try {
      setIsMonitoringPayments(true);
      
      // ✅ УНИВЕРСАЛЬНО: Получаем пользователя из всех платформ
      const currentUser = getCurrentUser();
      if (!currentUser || !currentUser.id) {
        alert('Пользователь не найден');
        return;
      }

      // Проверяем новые платежи
      const response = await fetch('/api/wallet/check-payments', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const result = await response.json();
      if (result.success) {
        console.log('✅ Проверка платежей завершена:', result);
        
        // Если найдены новые платежи, обновляем баланс
        if (result.newPayments && result.newPayments.length > 0) {
          // Перезагружаем данные пользователя
          await loadUserData();
          await loadTransactions();
          
          // Уведомляем о новых платежах
          const totalAmount = result.newPayments.reduce((sum: number, payment: any) => sum + payment.amount, 0);
          alert(`🎉 Найдено новых платежей: ${result.newPayments.length}\n💰 Общая сумма: ${totalAmount} монет`);
          
          // Обновляем баланс в родительском компоненте
          if (onBalanceUpdate && result.newBalance) {
            onBalanceUpdate(result.newBalance);
          }
        } else {
          alert('📊 Новых платежей не найдено');
        }
      } else {
        throw new Error(result.message || 'Ошибка проверки платежей');
      }
    } catch (error) {
      console.error('❌ Ошибка мониторинга платежей:', error);
      // Показываем более дружественное сообщение
      alert('Временная ошибка при проверке платежей. Попробуйте позже.');
    } finally {
      setIsMonitoringPayments(false);
    }
  };

  return (
    <div className={styles['game-wallet-container']}>
      {/* Баланс - главная карточка */}
      <motion.div 
        className={styles['balance-card']}
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="balance-header">
          <FaWallet className="balance-icon" />
          <span className="balance-title">Игровой кошелек</span>
          <button 
            className="crypto-burger-btn"
            onClick={() => setIsCryptoMenuOpen(!isCryptoMenuOpen)}
            title="Криптовалютные балансы"
          >
            <FaBars />
          </button>
        </div>
        
        {/* БУРГЕР-МЕНЮ С КРИПТОВАЛЮТАМИ */}
        <AnimatePresence>
          {isCryptoMenuOpen && (
            <motion.div 
              className="crypto-menu"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
            >
              <div className="crypto-menu-header">💰 Реальные балансы</div>
              <div className="crypto-list">
                {['TON', 'ETH', 'USDT', 'BTC', 'SOL'].map((crypto) => (
                  <div key={crypto} className="crypto-item">
                    <span className="crypto-name">{crypto}</span>
                    <span className="crypto-balance">{formatCryptoBalance(crypto)}</span>
                    <button 
                      className="crypto-action-btn"
                      onClick={() => {
                        setSelectedCrypto(crypto);
                        setActiveModal('deposit');
                        setIsCryptoMenuOpen(false);
                      }}
                    >
                      Пополнить
                    </button>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        
        {/* БАЛАНС ИГРОВЫХ МОНЕТ */}
        <div className="balance-amount">
          <FaCoins className="coin-icon" />
          <span className="amount-text">{balance.toLocaleString()}</span>
          <span className="currency">монет</span>
        </div>
        
        <div className="wallet-id">
          <span>ID кошелька: #{user?.id ? String(user.id).slice(-8) : 'XXXXXXXX'}</span>
        </div>
      </motion.div>

      {/* Навигационные вкладки */}
      <motion.div 
        className={styles['wallet-tabs']}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
      >
        <button
          onClick={() => setActiveTab('main')}
          className={`${styles['tab-button']} ${activeTab === 'main' ? styles['active'] : ''}`}
        >
          <FaWallet />
        </button>
        
        <button
          onClick={() => setActiveTab('history')}
          className={`${styles['tab-button']} ${activeTab === 'history' ? styles['active'] : ''}`}
        >
          <FaHistory />
          <span>История</span>
        </button>
        
        <button
          onClick={() => setActiveTab('exchange')}
          className={`${styles['tab-button']} ${activeTab === 'exchange' ? styles['active'] : ''}`}
        >
          <FaExchangeAlt />
          <span>Обмен</span>
        </button>
      </motion.div>

      {/* Основной контент */}
      <AnimatePresence mode="wait">
        {activeTab === 'main' && (
          <motion.div
            key="main"
            className="tab-content"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.3 }}
          >
            {/* Кнопки действий */}
            <div className={styles['action-buttons']}>
              <motion.button
                className={`${styles['action-button']} ${styles['deposit']}`}
                whileHover={{ scale: 1.02, y: -2 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setActiveModal('deposit')}
                disabled={loading}
              >
                <div className="button-glow"></div>
                <FaPlus className="action-icon" />
                <span>Пополнить</span>
              </motion.button>

              <motion.button
                className="action-button withdraw"
                whileHover={{ scale: 1.02, y: -2 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setActiveModal('withdraw')}
                disabled={loading}
              >
                <div className="button-glow"></div>
                <FaMinus className="action-icon" />
                <span>Вывод</span>
              </motion.button>

              <motion.button
                className="action-button monitor"
                whileHover={{ scale: 1.02, y: -2 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setActiveTab('history')}
                disabled={loading}
              >
                <div className="button-glow"></div>
                <FaHistory className="action-icon" />
                <span>История</span>
              </motion.button>
            </div>

            {/* Быстрые действия */}
            <div className="quick-actions">
              <h3 className="section-title">Быстрые действия</h3>
              
              <div className="quick-action-item" style={{
                flexDirection: 'column',
                alignItems: 'stretch',
                gap: '12px',
                padding: '20px',
                background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.15) 0%, rgba(16, 185, 129, 0.15) 100%)',
                border: '2px solid rgba(59, 130, 246, 0.4)',
                borderRadius: '16px',
                backdropFilter: 'blur(10px)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                  <FaTrophy className="quick-icon" style={{ fontSize: '24px', color: '#ffd700' }} />
                  <div style={{ flex: 1 }}>
                    <span className="quick-title" style={{ fontSize: '18px', fontWeight: '700', color: '#3b82f6' }}>
                      Реферальная ссылка
                    </span>
                    <div className="quick-desc" style={{ fontSize: '14px', color: '#94a3b8', marginTop: '4px' }}>
                      +500 монет за активного друга
                    </div>
                  </div>
                </div>
                {/* ✅ УЛУЧШЕННЫЙ контейнер с реферальной ссылкой */}
                <div style={{ 
                  marginTop: '8px', 
                  padding: '14px 16px', 
                  background: 'rgba(15, 23, 42, 0.8)', 
                  borderRadius: '12px',
                  border: '1px solid rgba(59, 130, 246, 0.3)',
                  fontFamily: 'monospace',
                  fontSize: '13px',
                  color: '#3b82f6',
                  wordBreak: 'break-all',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  position: 'relative'
                }}>
                  <span style={{ 
                    flex: 1,
                    lineHeight: '1.5',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis'
                  }}>
                    {(() => {
                      const currentUser = getCurrentUser();
                      const referralCode = currentUser?.id || user?.id || 'player_' + Date.now();
                      const botUsername = 'NotPidrBot';
                      return `https://t.me/${botUsername}?start=ref_${referralCode}`;
                    })()}
                  </span>
                  <button
                    onClick={async () => {
                      const currentUser = getCurrentUser();
                      const referralCode = currentUser?.id || user?.id || 'player_' + Date.now();
                      const botUsername = 'NotPidrBot';
                      const inviteUrl = `https://t.me/${botUsername}?start=ref_${referralCode}`;
                      try {
                        await navigator.clipboard.writeText(inviteUrl);
                        alert('✅ Реферальная ссылка скопирована!\n\nПоделитесь ей с друзьями и получите +500 монет за каждого активного друга!');
                      } catch (error) {
                        alert(`Реферальная ссылка:\n\n${inviteUrl}\n\nСкопируйте её вручную`);
                      }
                    }}
                    disabled={loading}
                    style={{
                      padding: '8px 12px',
                      background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                      border: '1px solid #ffd700',
                      borderRadius: '8px',
                      color: 'white',
                      fontSize: '12px',
                      fontWeight: '700',
                      cursor: 'pointer',
                      transition: 'all 0.3s',
                      flexShrink: 0,
                      whiteSpace: 'nowrap'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'scale(1.05)';
                      e.currentTarget.style.boxShadow = '0 4px 12px rgba(59, 130, 246, 0.4)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'scale(1)';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                  >
                    📋 Копировать
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === 'history' && (
          <motion.div
            key="history"
            className="tab-content"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.3 }}
          >
            <h3 className="section-title">История транзакций</h3>
            
            {loading ? (
              <div className="loading">Загрузка...</div>
            ) : transactions.length === 0 ? (
              <div className="empty-state">
                <FaHistory className="empty-icon" />
                <p>Пока нет транзакций</p>
              </div>
            ) : (
              <div className="transactions-list">
                {transactions.map((transaction) => (
                  <motion.div
                    key={transaction.id}
                    className="transaction-item"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <div className="transaction-icon">
                      {getTransactionIcon(transaction.type)}
                    </div>
                    
                    <div className="transaction-info">
                      <span className="transaction-desc">{transaction.description}</span>
                      <span className="transaction-date">
                        {new Date(transaction.created_at).toLocaleString()}
                      </span>
                    </div>
                    
                    <div className={`transaction-amount ${getTransactionColor(transaction.amount)}`}>
                      {transaction.amount > 0 ? '+' : ''}{transaction.amount.toLocaleString()}
                      <FaCoins className="mini-coin" />
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {activeTab === 'exchange' && (
          <motion.div
            key="exchange"
            className="tab-content"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.3 }}
          >
            <h3 className="section-title">Криптообмен</h3>
            
            <div className="exchange-rates">
              <div className="rate-item">
                <span>1 TON = 1000 монет</span>
                <button className="exchange-button">Обменять</button>
              </div>
              
              <div className="rate-item">
                <span>1 USDT = 800 монет</span>
                <button className="exchange-button">Обменять</button>
              </div>
              
              <div className="rate-item">
                <span>0.001 ETH = 1200 монет</span>
                <button className="exchange-button">Обменять</button>
              </div>
            </div>
            
            <div className="exchange-info">
              <p>Минимальная сумма обмена: 100 монет</p>
              <p>Комиссия: 2% от суммы</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Модальные окна */}
      <AnimatePresence>
        {activeModal && (
          <motion.div
            className="modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setActiveModal(null)}
          >
            <motion.div
              className="modal-content"
              initial={{ opacity: 0, scale: 0.8, y: 50 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.8, y: 50 }}
              onClick={e => e.stopPropagation()}
            >
              {activeModal === 'deposit' && (
                <div className="modal-inner">
                  <div className="modal-header">
                    <h3 style={{ margin: 0, fontSize: '16px' }}>Пополнение баланса</h3>
                    <button className="close-btn" onClick={() => {
                      setActiveModal(null);
                      setSelectedWalletForDeposit(null);
                    }}>×</button>
                  </div>

                  {/* ✅ ПЕРЕКЛЮЧАТЕЛЬ: Рубли / Крипта - с золотым переливом */}
                  <div style={{
                    display: 'flex', gap: '4px', marginBottom: '16px',
                    background: 'rgba(0,0,0,0.3)', borderRadius: '12px', padding: '4px',
                    border: '1px solid rgba(255,215,0,0.15)',
                  }}>
                    {([
                      { key: 'rub' as DepositMethod, label: '💳 Рубли / $', icon: '🏦' },
                      { key: 'crypto' as DepositMethod, label: '🪙 Криптовалюта', icon: '⛓️' },
                    ]).map(m => (
                      <button key={m.key} onClick={() => setDepositMethod(m.key)} style={{
                        flex: 1, padding: '10px 8px', border: 'none', borderRadius: '10px', cursor: 'pointer',
                        fontSize: '13px', fontWeight: depositMethod === m.key ? '700' : '500',
                        background: depositMethod === m.key
                          ? 'linear-gradient(135deg, rgba(255,215,0,0.25) 0%, rgba(6,182,212,0.2) 100%)'
                          : 'transparent',
                        color: depositMethod === m.key ? '#ffd700' : '#64748b',
                        transition: 'all 0.3s ease',
                        boxShadow: depositMethod === m.key ? '0 2px 12px rgba(255,215,0,0.15)' : 'none',
                        letterSpacing: '0.3px',
                      }}>
                        {m.label}
                      </button>
                    ))}
                  </div>

                  {depositMethod === 'rub' ? (
                    /* ========== ОПЛАТА РУБЛЯМИ / ДОЛЛАРАМИ (YuKassa) ========== */
                    <div>
                      {/* Переключатель валюты: RUB / USD */}
                      <div style={{
                        display: 'flex', gap: '4px', marginBottom: '12px',
                        background: 'rgba(0,0,0,0.15)', borderRadius: '8px', padding: '3px',
                      }}>
                        <button onClick={() => { setCurrencyMode('RUB'); setUsdAmount(''); }} style={{
                          flex: 1, padding: '8px', border: 'none', borderRadius: '6px', cursor: 'pointer',
                          fontSize: '12px', fontWeight: currencyMode === 'RUB' ? '700' : '500',
                          background: currencyMode === 'RUB' ? 'rgba(255,255,255,0.1)' : 'transparent',
                          color: currencyMode === 'RUB' ? '#e2e8f0' : '#64748b',
                          transition: 'all 0.2s',
                        }}>🇷🇺 Рубли (₽)</button>
                        <button onClick={() => { setCurrencyMode('USD'); setRubAmount(''); }} style={{
                          flex: 1, padding: '8px', border: 'none', borderRadius: '6px', cursor: 'pointer',
                          fontSize: '12px', fontWeight: currencyMode === 'USD' ? '700' : '500',
                          background: currencyMode === 'USD' ? 'rgba(255,255,255,0.1)' : 'transparent',
                          color: currencyMode === 'USD' ? '#e2e8f0' : '#64748b',
                          transition: 'all 0.2s',
                        }}>🇺🇸 Доллары ($)</button>
                      </div>

                      {/* Курс */}
                      <div style={{
                        padding: '10px 14px', borderRadius: '10px', marginBottom: '14px',
                        background: 'linear-gradient(135deg, rgba(255,215,0,0.08) 0%, rgba(6,182,212,0.06) 100%)',
                        border: '1px solid rgba(255,215,0,0.2)',
                        fontSize: '12px', color: '#ffd700', textAlign: 'center',
                      }}>
                        {currencyMode === 'RUB' 
                          ? '100 руб. = 5 000 монет  |  1₽ = 50 монет'
                          : '1$ ≈ 80 руб.  |  1$ = 4 000 монет'}
                      </div>

                      {/* Быстрые суммы */}
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '6px', marginBottom: '12px' }}>
                        {(currencyMode === 'RUB' ? [
                          { val: '100', coins: '5 000', display: '100 ₽' },
                          { val: '300', coins: '15 000', display: '300 ₽' },
                          { val: '500', coins: '25 000', display: '500 ₽' },
                          { val: '1000', coins: '50 000', display: '1 000 ₽' },
                          { val: '2000', coins: '100 000', display: '2 000 ₽' },
                          { val: '5000', coins: '250 000', display: '5 000 ₽' },
                        ] : [
                          { val: '1', coins: '4 000', display: '$1' },
                          { val: '5', coins: '20 000', display: '$5' },
                          { val: '10', coins: '40 000', display: '$10' },
                          { val: '25', coins: '100 000', display: '$25' },
                          { val: '50', coins: '200 000', display: '$50' },
                          { val: '100', coins: '400 000', display: '$100' },
                        ]).map(p => {
                          const isActive = currencyMode === 'RUB' ? rubAmount === p.val : usdAmount === p.val;
                          return (
                            <button key={p.val} onClick={() => {
                              if (currencyMode === 'RUB') { setRubAmount(p.val); }
                              else { setUsdAmount(p.val); setRubAmount(String(Math.round(parseFloat(p.val) * 80))); }
                            }} style={{
                              padding: '10px 4px', borderRadius: '10px', cursor: 'pointer',
                              background: isActive
                                ? 'linear-gradient(135deg, rgba(255,215,0,0.2) 0%, rgba(6,182,212,0.15) 100%)'
                                : 'rgba(100, 116, 139, 0.1)',
                              border: isActive ? '1.5px solid rgba(255,215,0,0.6)' : '1.5px solid rgba(100, 116, 139, 0.15)',
                              color: isActive ? '#ffd700' : '#94a3b8',
                              fontSize: '11px', fontWeight: '600', transition: 'all 0.25s ease',
                              boxShadow: isActive ? '0 2px 12px rgba(255,215,0,0.15), inset 0 1px 0 rgba(255,255,255,0.1)' : 'none',
                            }}>
                              <div style={{ fontSize: '15px', fontWeight: '700', color: isActive ? '#ffd700' : '#e2e8f0' }}>
                                {p.display}
                              </div>
                              <div style={{ marginTop: '2px', opacity: 0.7, fontSize: '10px' }}>{p.coins} монет</div>
                            </button>
                          );
                        })}
                      </div>

                      {/* Своя сумма */}
                      <div style={{ display: 'flex', gap: '6px', marginBottom: '14px' }}>
                        <input
                          type="number"
                          value={currencyMode === 'USD' ? usdAmount : rubAmount}
                          onChange={e => {
                            if (currencyMode === 'USD') {
                              setUsdAmount(e.target.value);
                              setRubAmount(e.target.value ? String(Math.round(parseFloat(e.target.value) * 80)) : '');
                            } else {
                              setRubAmount(e.target.value);
                            }
                          }}
                          placeholder={currencyMode === 'USD' ? 'Сумма в долларах' : 'Сумма в рублях'}
                          min={currencyMode === 'USD' ? '1' : '100'} step={currencyMode === 'USD' ? '1' : '50'}
                          style={{
                            flex: 1, padding: '12px', borderRadius: '10px',
                            border: '1.5px solid rgba(255,215,0,0.2)', background: 'rgba(0,0,0,0.3)',
                            color: '#fff', fontSize: '16px', fontWeight: '600',
                          }}
                        />
                        <span style={{
                          padding: '12px 14px', borderRadius: '10px',
                          background: 'linear-gradient(135deg, rgba(255,215,0,0.15), rgba(6,182,212,0.1))',
                          color: '#ffd700', fontWeight: '700', fontSize: '14px', display: 'flex', alignItems: 'center',
                          border: '1px solid rgba(255,215,0,0.2)',
                        }}>{currencyMode === 'USD' ? '$' : '₽'}</span>
                      </div>

                      {/* Итого монет */}
                      {rubAmount && parseFloat(rubAmount) >= 100 && (
                        <div style={{
                          padding: '10px', borderRadius: '10px', marginBottom: '14px',
                          background: 'linear-gradient(135deg, rgba(255,215,0,0.06), rgba(6,182,212,0.04))',
                          border: '1px solid rgba(255,215,0,0.15)',
                          textAlign: 'center', fontSize: '13px', color: '#fbbf24',
                        }}>
                          Вы получите: <strong style={{ color: '#ffd700', fontSize: '16px' }}>{(parseFloat(rubAmount) * 50).toLocaleString()}</strong> монет
                          {currencyMode === 'USD' && usdAmount && (
                            <span style={{ display: 'block', fontSize: '11px', opacity: 0.7, marginTop: '2px' }}>
                              ≈ {rubAmount} ₽ по курсу 1$ = 80₽
                            </span>
                          )}
                        </div>
                      )}

                      {/* Способы оплаты с НАСТОЯЩИМИ иконками */}
                      <div style={{ marginBottom: '14px' }}>
                        <div style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '8px', fontWeight: '600' }}>Способ оплаты:</div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '6px' }}>
                          {PAYMENT_METHODS.map(m => (
                            <button key={m.id} onClick={() => setSelectedPayMethod(m.id)} style={{
                              padding: '11px 10px', borderRadius: '10px', cursor: 'pointer',
                              background: selectedPayMethod === m.id
                                ? 'linear-gradient(135deg, rgba(255,215,0,0.15) 0%, rgba(6,182,212,0.12) 100%)'
                                : 'rgba(100,116,139,0.06)',
                              border: selectedPayMethod === m.id
                                ? '1.5px solid rgba(255,215,0,0.5)' : '1.5px solid rgba(100,116,139,0.12)',
                              color: selectedPayMethod === m.id ? '#ffd700' : '#94a3b8',
                              fontSize: '12px', fontWeight: selectedPayMethod === m.id ? '700' : '500',
                              transition: 'all 0.25s ease',
                              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                              minWidth: 0,
                              whiteSpace: 'nowrap',
                              lineHeight: 1.15,
                              boxShadow: selectedPayMethod === m.id
                                ? '0 2px 12px rgba(255,215,0,0.12), inset 0 1px 0 rgba(255,255,255,0.08)' : 'none',
                            }}>
                              {m.id === 'bank_card' ? (
                                <span style={{ display: 'flex', alignItems: 'center', gap: '2px', flexShrink: 0 }}>
                                  <SiVisa size={18} />
                                  <SiMastercard size={14} />
                                </span>
                              ) : m.id === 'sberbank' ? (
                                <FaMoneyBillWave size={16} style={{ color: selectedPayMethod === m.id ? m.accent : '#64748b', flexShrink: 0 }} />
                              ) : m.id === 'yoo_money' ? (
                                <FaWallet size={15} style={{ color: selectedPayMethod === m.id ? m.accent : '#64748b', flexShrink: 0 }} />
                              ) : (
                                <FaBolt size={15} style={{ color: selectedPayMethod === m.id ? m.accent : '#64748b', flexShrink: 0 }} />
                              )}
                              {m.name}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Кнопка оплаты */}
                      <button
                        onClick={handleRubPayment}
                        disabled={yookassaLoading || !rubAmount || parseFloat(rubAmount) < 100}
                        style={{
                          width: '100%', padding: '14px', border: '1.5px solid rgba(255,215,0,0.4)', borderRadius: '12px',
                          cursor: yookassaLoading || !rubAmount || parseFloat(rubAmount) < 100 ? 'not-allowed' : 'pointer',
                          background: yookassaLoading || !rubAmount || parseFloat(rubAmount) < 100
                            ? 'rgba(100,100,100,0.3)'
                            : 'linear-gradient(135deg, rgba(255,215,0,0.2) 0%, rgba(6,182,212,0.15) 50%, rgba(255,215,0,0.2) 100%)',
                          color: '#fff', fontSize: '15px', fontWeight: '700',
                          opacity: yookassaLoading || !rubAmount || parseFloat(rubAmount) < 100 ? 0.5 : 1,
                          boxShadow: yookassaLoading || !rubAmount || parseFloat(rubAmount) < 100
                            ? 'none' : '0 4px 20px rgba(255,215,0,0.15), 0 0 40px rgba(6,182,212,0.08)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                          transition: 'all 0.3s ease',
                        }}
                      >
                        {yookassaLoading ? '⏳ Создание платежа...' : <><FaCreditCard size={16} /> Оплатить {rubAmount ? parseFloat(rubAmount).toLocaleString() : '0'} ₽</>}
                      </button>

                      <div style={{
                        marginTop: '10px', fontSize: '10px', color: '#475569', textAlign: 'center',
                      }}>
                        Безопасная оплата через ЮKassa. Мин. сумма: 100 руб.
                      </div>
                    </div>
                  ) : (
                    /* ========== ОПЛАТА КРИПТОЙ — ОБНОВЛЁННЫЙ ДИЗАЙН ========== */
                    <div>
                      {/* Выбор криптовалюты — стильные карточки */}
                      <div style={{ marginBottom: '16px' }}>
                        <div style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '8px', fontWeight: '600' }}>Криптовалюта:</div>
                        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' as const }}>
                          {CRYPTO_OPTIONS.map(c => (
                            <button key={c.id} onClick={() => setSelectedCrypto(c.id)} style={{
                              flex: '1 1 0', minWidth: '56px', padding: '10px 4px', borderRadius: '12px', cursor: 'pointer',
                              background: selectedCrypto === c.id
                                ? `linear-gradient(135deg, ${c.color}30 0%, rgba(255,215,0,0.12) 100%)`
                                : 'rgba(100,116,139,0.06)',
                              border: selectedCrypto === c.id
                                ? `2px solid ${c.color}90` : '1.5px solid rgba(100,116,139,0.12)',
                              color: selectedCrypto === c.id ? '#fff' : '#94a3b8',
                              fontSize: '11px', fontWeight: '700', transition: 'all 0.25s ease',
                              display: 'flex', flexDirection: 'column' as const, alignItems: 'center', gap: '3px',
                              boxShadow: selectedCrypto === c.id ? `0 4px 15px ${c.color}25` : 'none',
                            }}>
                              <span style={{ fontSize: '22px', lineHeight: '1' }}>{c.icon}</span>
                              <span>{c.name}</span>
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Сеть + время */}
                      <div style={{
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        padding: '10px 14px', borderRadius: '10px', marginBottom: '14px',
                        background: 'linear-gradient(135deg, rgba(255,215,0,0.06), rgba(6,182,212,0.04))',
                        border: '1px solid rgba(255,215,0,0.12)',
                      }}>
                        <span style={{ fontSize: '12px', color: '#ffd700', fontWeight: '600' }}>
                          {CRYPTO_OPTIONS.find((option) => option.id === selectedCrypto)?.net || selectedCrypto}
                        </span>
                        <span style={{ fontSize: '11px', color: '#64748b' }}>
                          {CRYPTO_OPTIONS.find((option) => option.id === selectedCrypto)?.eta || '~'}
                        </span>
                      </div>

                      {/* Кошелёк для оплаты */}
                      <div style={{ marginBottom: '14px' }}>
                        <div style={{ fontSize: '12px', fontWeight: '600', color: '#e2e8f0', marginBottom: '8px' }}>
                          Оплата через кошелёк:
                        </div>
                        <ConnectedWalletsList
                          onWalletSelect={(wallet) => {
                            setSelectedWalletForDeposit(wallet);
                            setSelectedCrypto(wallet.wallet_type.toUpperCase());
                          }}
                          selectedWalletId={selectedWalletForDeposit?.id || null}
                          showAddButton={true}
                        />
                      </div>
                      
                      {selectedWalletForDeposit && (
                        <div style={{
                          padding: '8px 12px', borderRadius: '8px',
                          background: 'linear-gradient(135deg, rgba(34,197,94,0.08), rgba(255,215,0,0.06))',
                          border: '1px solid rgba(34,197,94,0.3)',
                          marginBottom: '12px', fontSize: '12px', color: '#22c55e',
                          display: 'flex', alignItems: 'center', gap: '6px',
                        }}>
                          <span style={{ fontSize: '14px' }}>✓</span>
                          {selectedWalletForDeposit.wallet_type.toUpperCase()} — {selectedWalletForDeposit.wallet_address.slice(0, 8)}...{selectedWalletForDeposit.wallet_address.slice(-4)}
                        </div>
                      )}

                      {/* Адрес для пополнения — compact */}
                      <div style={{
                        padding: '12px', borderRadius: '12px', marginBottom: '14px',
                        background: 'rgba(0,0,0,0.25)', border: '1px solid rgba(255,215,0,0.1)',
                      }}>
                        <label style={{ display: 'block', fontSize: '11px', color: '#94a3b8', marginBottom: '6px', fontWeight: '600' }}>
                          Адрес для пополнения ({selectedCrypto})
                        </label>
                        <HDAddressDisplay 
                          crypto={selectedCrypto} 
                          userId={user?.id || ''} 
                          generateAddress={generateDepositAddress}
                          isGenerating={isGeneratingAddress}
                        />
                      </div>
                  
                      {/* Сумма */}
                      <div style={{ marginBottom: '12px' }}>
                        <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#ffd700', marginBottom: '8px' }}>
                          Сумма ({selectedCrypto})
                        </label>
                        <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                          <input
                            type="number" value={depositAmount}
                            onChange={(e) => setDepositAmount(e.target.value)}
                            placeholder={selectedCrypto === 'TON' ? '1.0' : selectedCrypto === 'SOL' ? '0.1' : '0.01'}
                            step="0.01" min="0"
                            style={{
                              flex: 1, padding: '12px', borderRadius: '10px',
                              border: '1.5px solid rgba(255,215,0,0.2)', background: 'rgba(0,0,0,0.3)',
                              color: '#fff', fontSize: '16px', fontWeight: '600',
                            }}
                          />
                          <span style={{
                            padding: '12px 14px', borderRadius: '10px',
                            background: 'linear-gradient(135deg, rgba(255,215,0,0.15), rgba(6,182,212,0.1))',
                            color: '#ffd700', fontWeight: '700', fontSize: '14px',
                            border: '1px solid rgba(255,215,0,0.2)', display: 'flex', alignItems: 'center',
                          }}>{selectedCrypto}</span>
                        </div>
                    
                        {/* Быстрые суммы */}
                        <div style={{ display: 'flex', gap: '6px', marginBottom: '12px' }}>
                          {(selectedCrypto === 'TON' ? ['1', '5', '10', '25'] : 
                            selectedCrypto === 'SOL' ? ['0.1', '0.5', '1', '5'] :
                            selectedCrypto === 'BTC' ? ['0.001', '0.005', '0.01', '0.05'] :
                            ['5', '10', '25', '50']).map((amount) => (
                            <button key={amount} onClick={() => setDepositAmount(amount)} style={{
                              flex: 1, padding: '8px', borderRadius: '8px',
                              border: depositAmount === amount ? '1.5px solid rgba(255,215,0,0.5)' : '1px solid rgba(255,255,255,0.1)',
                              background: depositAmount === amount
                                ? 'linear-gradient(135deg, rgba(255,215,0,0.15), rgba(6,182,212,0.1))'
                                : 'rgba(255,255,255,0.03)',
                              color: depositAmount === amount ? '#ffd700' : '#94a3b8',
                              fontSize: '12px', fontWeight: '600', cursor: 'pointer', transition: 'all 0.2s',
                            }}>
                              {amount}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Кнопка пополнения */}
                      {selectedWalletForDeposit ? (
                        <button
                          onClick={() => handleDepositViaWallet()}
                          disabled={loading || !depositAmount || parseFloat(depositAmount) <= 0}
                          style={{
                            width: '100%', padding: '14px', borderRadius: '12px',
                            border: '1.5px solid rgba(255,215,0,0.4)',
                            background: loading ? 'rgba(100,100,100,0.4)'
                              : 'linear-gradient(135deg, rgba(255,215,0,0.2) 0%, rgba(6,182,212,0.15) 50%, rgba(255,215,0,0.2) 100%)',
                            color: '#fff', fontSize: '15px', fontWeight: '700',
                            cursor: loading ? 'not-allowed' : 'pointer',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                            boxShadow: loading ? 'none' : '0 4px 20px rgba(255,215,0,0.15)',
                            transition: 'all 0.3s ease',
                          }}
                        >
                          {loading ? '⏳ Обработка...' : <><FaWallet size={14} /> Пополнить через {selectedWalletForDeposit.wallet_type === 'ton' ? 'TON Wallet' : selectedWalletForDeposit.wallet_type === 'sol' ? 'Phantom' : 'MetaMask'}</>}
                        </button>
                      ) : (
                        <div style={{
                          padding: '12px', borderRadius: '10px',
                          background: 'rgba(255,215,0,0.04)', border: '1px dashed rgba(255,215,0,0.2)',
                          color: '#94a3b8', fontSize: '12px', textAlign: 'center',
                        }}>
                          Подключите кошелёк выше или отправьте {selectedCrypto} на адрес вручную
                        </div>
                      )}

                      <div style={{
                        marginTop: '10px', fontSize: '10px', color: '#475569', textAlign: 'center',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px',
                      }}>
                        <FaKey size={10} /> Баланс обновится автоматически после подтверждения сети
                      </div>
                    </div>
                  )}
                </div>
              )}

              {activeModal === 'withdraw' && (
                <div className="modal-inner">
                  <div className="modal-header">
                    <h3 style={{ margin: 0, fontSize: '16px' }}>Вывод средств</h3>
                    <button className="close-btn" onClick={() => setActiveModal(null)}>×</button>
                  </div>

                  <div style={{
                    display: 'flex',
                    gap: '4px',
                    marginBottom: '16px',
                    background: 'rgba(0,0,0,0.3)',
                    borderRadius: '12px',
                    padding: '4px',
                    border: '1px solid rgba(255,215,0,0.15)',
                  }}>
                    {([
                      { key: 'crypto' as WithdrawMethod, label: '🪙 Крипта' },
                      { key: 'bank_card' as WithdrawMethod, label: '💳 YooKassa / карта' },
                    ]).map((option) => (
                      <button
                        key={option.key}
                        onClick={() => setWithdrawMethod(option.key === 'crypto' ? 'crypto' : 'bank_card')}
                        style={{
                          flex: 1,
                          padding: '10px 8px',
                          border: 'none',
                          borderRadius: '10px',
                          cursor: 'pointer',
                          fontSize: '13px',
                          fontWeight: (option.key === 'crypto' ? withdrawMethod === 'crypto' : withdrawMethod !== 'crypto') ? '700' : '500',
                          background: (option.key === 'crypto' ? withdrawMethod === 'crypto' : withdrawMethod !== 'crypto')
                            ? 'linear-gradient(135deg, rgba(255,215,0,0.25) 0%, rgba(6,182,212,0.2) 100%)'
                            : 'transparent',
                          color: (option.key === 'crypto' ? withdrawMethod === 'crypto' : withdrawMethod !== 'crypto') ? '#ffd700' : '#64748b',
                          transition: 'all 0.3s ease',
                          boxShadow: (option.key === 'crypto' ? withdrawMethod === 'crypto' : withdrawMethod !== 'crypto') ? '0 2px 12px rgba(255,215,0,0.15)' : 'none',
                        }}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>

                  {withdrawMethod === 'crypto' ? (
                    <div style={{ marginBottom: '16px' }}>
                      <div style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '8px', fontWeight: '600' }}>Криптовалюта для вывода:</div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '6px' }}>
                        {CRYPTO_OPTIONS.map(c => (
                          <button key={c.id} onClick={() => setSelectedCrypto(c.id)} style={{
                            padding: '12px 6px', borderRadius: '12px', cursor: 'pointer',
                            background: selectedCrypto === c.id
                              ? `linear-gradient(135deg, ${c.color}25 0%, rgba(255,215,0,0.1) 100%)`
                              : 'rgba(100,116,139,0.06)',
                            border: selectedCrypto === c.id
                              ? `2px solid ${c.color}80` : '1.5px solid rgba(100,116,139,0.12)',
                            color: selectedCrypto === c.id ? '#fff' : '#94a3b8',
                            fontSize: '12px', fontWeight: '700', transition: 'all 0.25s ease',
                            display: 'flex', flexDirection: 'column' as const, alignItems: 'center', gap: '4px',
                            minWidth: 0,
                            boxShadow: selectedCrypto === c.id ? `0 4px 15px ${c.color}20` : 'none',
                          }}>
                            <span style={{ fontSize: '20px' }}>{c.icon}</span>
                            {c.name}
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div style={{ marginBottom: '16px' }}>
                      <div style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '8px', fontWeight: '600' }}>Способ выплаты:</div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '6px' }}>
                        {PAYMENT_METHODS.map((method) => (
                          <button
                            key={method.id}
                            onClick={() => setWithdrawMethod(method.id)}
                            style={{
                              padding: '11px 10px',
                              borderRadius: '10px',
                              cursor: 'pointer',
                              background: withdrawMethod === method.id
                                ? 'linear-gradient(135deg, rgba(255,215,0,0.15) 0%, rgba(6,182,212,0.12) 100%)'
                                : 'rgba(100,116,139,0.06)',
                              border: withdrawMethod === method.id
                                ? '1.5px solid rgba(255,215,0,0.5)'
                                : '1.5px solid rgba(100,116,139,0.12)',
                              color: withdrawMethod === method.id ? '#ffd700' : '#94a3b8',
                              fontSize: '12px',
                              fontWeight: withdrawMethod === method.id ? '700' : '500',
                              transition: 'all 0.25s ease',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '6px',
                              minWidth: 0,
                              whiteSpace: 'nowrap',
                              lineHeight: 1.15,
                            }}
                          >
                            {method.id === 'bank_card' ? (
                              <span style={{ display: 'flex', alignItems: 'center', gap: '2px', flexShrink: 0 }}>
                                <SiVisa size={18} />
                                <SiMastercard size={14} />
                              </span>
                            ) : method.id === 'sberbank' ? (
                              <FaMoneyBillWave size={16} style={{ color: withdrawMethod === method.id ? method.accent : '#64748b', flexShrink: 0 }} />
                            ) : method.id === 'yoo_money' ? (
                              <FaWallet size={15} style={{ color: withdrawMethod === method.id ? method.accent : '#64748b', flexShrink: 0 }} />
                            ) : (
                              <FaBolt size={15} style={{ color: withdrawMethod === method.id ? method.accent : '#64748b', flexShrink: 0 }} />
                            )}
                            {method.name}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <div style={{ marginBottom: '14px' }}>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#e2e8f0', marginBottom: '8px' }}>
                      {getWithdrawRecipientLabel()}
                    </label>
                    <input
                      type="text"
                      value={withdrawMethod === 'crypto' ? withdrawAddress : withdrawRecipient}
                      onChange={(e) => withdrawMethod === 'crypto' ? setWithdrawAddress(e.target.value) : setWithdrawRecipient(e.target.value)}
                      placeholder={withdrawMethod === 'crypto' ? 'Введите адрес кошелька' : 'Введите реквизиты для выплаты'}
                      style={{
                        width: '100%',
                        padding: '13px',
                        borderRadius: '10px',
                        border: '1.5px solid rgba(255,215,0,0.2)',
                        background: 'rgba(0,0,0,0.3)',
                        color: '#fff',
                        fontSize: '14px',
                        fontWeight: '500',
                        boxSizing: 'border-box' as const,
                      }}
                    />
                  </div>

                  <div style={{ marginBottom: '14px' }}>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#e2e8f0', marginBottom: '8px' }}>
                      Сумма вывода
                    </label>
                    <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                      <input
                        type="number"
                        value={withdrawAmount}
                        onChange={(e) => setWithdrawAmount(e.target.value)}
                        placeholder="0"
                        style={{
                          flex: 1,
                          padding: '13px',
                          borderRadius: '10px',
                          border: '1.5px solid rgba(255,215,0,0.2)',
                          background: 'rgba(0,0,0,0.3)',
                          color: '#fff',
                          fontSize: '17px',
                          fontWeight: '600',
                        }}
                      />
                      <span style={{
                        padding: '13px 14px',
                        borderRadius: '10px',
                        background: 'linear-gradient(135deg, rgba(255,215,0,0.15), rgba(6,182,212,0.1))',
                        color: '#ffd700',
                        fontWeight: '700',
                        fontSize: '15px',
                        border: '1px solid rgba(255,215,0,0.2)',
                      }}>монет</span>
                    </div>
                    <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '8px' }}>
                      Доступно: {balance.toLocaleString('ru-RU')} монет
                      {balance > 0 ? ` (≈ ${Math.floor(balance / 50).toLocaleString('ru-RU')} ₽)` : ''}
                    </div>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      {['25%', '50%', '100%'].map(pct => {
                        const mult = pct === '25%' ? 0.25 : pct === '50%' ? 0.5 : 1;
                        return (
                          <button key={pct} onClick={() => setWithdrawAmount(String(Math.floor(balance * mult)))} style={{
                            flex: 1,
                            padding: '9px',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            border: '1px solid rgba(255,215,0,0.2)',
                            fontSize: '13px',
                            fontWeight: '600',
                            background: 'linear-gradient(135deg, rgba(255,215,0,0.08), rgba(6,182,212,0.05))',
                            color: '#ffd700',
                            transition: 'all 0.2s',
                            opacity: balance <= 0 ? 0.5 : 1,
                          }}>
                            {pct}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {withdrawAmount && Number(withdrawAmount) > 0 && (
                    <div style={{
                      padding: '10px 12px',
                      borderRadius: '10px',
                      marginBottom: '14px',
                      background: 'linear-gradient(135deg, rgba(255,215,0,0.06), rgba(6,182,212,0.04))',
                      border: '1px solid rgba(255,215,0,0.15)',
                      fontSize: '12px',
                      color: '#f8fafc',
                    }}>
                      <div style={{ fontWeight: '700', color: '#ffd700', marginBottom: '4px' }}>
                        {getWithdrawMethodLabel(withdrawMethod)}
                      </div>
                      <div>
                        {Math.floor(Number(withdrawAmount)).toLocaleString('ru-RU')} монет
                        {Number(withdrawAmount) > 0 ? ` (≈ ${Math.floor(Number(withdrawAmount) / 50).toLocaleString('ru-RU')} ₽)` : ''}
                      </div>
                    </div>
                  )}

                  <button onClick={handleWithdraw} disabled={loading || !(withdrawMethod === 'crypto' ? withdrawAddress : withdrawRecipient) || !withdrawAmount} style={{
                    width: '100%', padding: '14px', borderRadius: '12px',
                    border: '1.5px solid rgba(255,215,0,0.4)',
                    background: loading || !(withdrawMethod === 'crypto' ? withdrawAddress : withdrawRecipient) || !withdrawAmount
                      ? 'rgba(100,100,100,0.3)'
                      : 'linear-gradient(135deg, rgba(255,215,0,0.2) 0%, rgba(6,182,212,0.15) 50%, rgba(255,215,0,0.2) 100%)',
                    color: '#fff', fontSize: '15px', fontWeight: '700',
                    cursor: loading || !(withdrawMethod === 'crypto' ? withdrawAddress : withdrawRecipient) || !withdrawAmount ? 'not-allowed' : 'pointer',
                    opacity: loading || !(withdrawMethod === 'crypto' ? withdrawAddress : withdrawRecipient) || !withdrawAmount ? 0.5 : 1,
                    boxShadow: loading ? 'none' : '0 4px 20px rgba(255,215,0,0.15)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                    transition: 'all 0.3s ease',
                  }}>
                    <FaArrowUp size={14} /> Оформить вывод через {getWithdrawMethodLabel(withdrawMethod)}
                  </button>

                  <div style={{ marginTop: '10px', fontSize: '10px', color: '#475569', textAlign: 'center' }}>
                    Вывод создаётся как заявка. Для крипты укажите адрес, для YooKassa/карт укажите корректные реквизиты.
                  </div>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>


      <style jsx global>{`
        .game-wallet-container {
          width: 100%;
          max-width: 420px;
          margin: 0 auto;
          padding: 20px;
          font-family: inherit;
        }

        .balance-card {
          background: linear-gradient(135deg, #1e3a8a 0%, #1e293b 50%, #0f172a 100%);
          border: 2px solid #ffd700;
          border-radius: 12px;
          padding: 12px 16px;
          margin-bottom: 16px;
          box-shadow: 0 4px 16px rgba(255, 215, 0, 0.2), 0 0 20px rgba(30, 58, 138, 0.3);
          position: relative;
          overflow: hidden;
          max-width: 280px;
          margin-left: auto;
          margin-right: auto;
        }

        .balance-card::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: linear-gradient(45deg, transparent 30%, rgba(255, 215, 0, 0.1) 50%, transparent 70%);
          pointer-events: none;
        }

        .balance-header {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 8px;
          position: relative;
        }

        .balance-icon {
          font-size: 16px;
          color: #3b82f6;
        }

        .balance-title {
          font-size: 14px;
          font-weight: 600;
          color: #e2e8f0;
          flex: 1;
        }
        
        .crypto-burger-btn {
          background: rgba(59, 130, 246, 0.2);
          border: 1px solid rgba(59, 130, 246, 0.4);
          border-radius: 8px;
          padding: 6px 8px;
          color: #3b82f6;
          cursor: pointer;
          transition: all 0.3s ease;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 14px;
        }
        
        .crypto-burger-btn:hover {
          background: rgba(59, 130, 246, 0.4);
          transform: scale(1.05);
        }
        
        .crypto-menu {
          background: rgba(15, 23, 42, 0.95);
          border: 1px solid rgba(59, 130, 246, 0.3);
          border-radius: 12px;
          padding: 12px;
          margin: 12px 0;
          overflow: hidden;
        }
        
        .crypto-menu-header {
          font-size: 12px;
          font-weight: 700;
          color: #3b82f6;
          margin-bottom: 10px;
          text-align: center;
          text-transform: uppercase;
          letter-spacing: 1px;
        }
        
        .crypto-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        
        .crypto-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          background: rgba(30, 41, 59, 0.6);
          border: 1px solid rgba(59, 130, 246, 0.2);
          border-radius: 8px;
          padding: 8px 10px;
          transition: all 0.3s ease;
        }
        
        .crypto-item:hover {
          background: rgba(30, 41, 59, 0.8);
          border-color: rgba(59, 130, 246, 0.4);
        }
        
        .crypto-name {
          font-weight: 700;
          color: #3b82f6;
          font-size: 13px;
          min-width: 50px;
        }
        
        .crypto-balance {
          font-family: monospace;
          color: #10b981;
          font-size: 11px;
          flex: 1;
          text-align: center;
        }
        
        .crypto-action-btn {
          background: linear-gradient(135deg, #10b981, #059669);
          border: 1px solid rgba(16, 185, 129, 0.4);
          border-radius: 6px;
          padding: 4px 8px;
          color: white;
          font-size: 10px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        
        .crypto-action-btn:hover {
          background: linear-gradient(135deg, #059669, #047857);
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
        }

        .balance-amount {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 8px;
        }

        .coin-icon {
          font-size: 18px;
          color: #3b82f6;
          filter: drop-shadow(0 0 5px rgba(59, 130, 246, 0.5));
        }

        .amount-text {
          font-size: 20px;
          font-weight: 700;
          color: #3b82f6;
          text-shadow: 0 0 10px rgba(59, 130, 246, 0.5);
        }

        .currency {
          font-size: 14px;
          color: #94a3b8;
          margin-left: auto;
        }

        .wallet-id {
          font-size: 12px;
          color: #64748b;
          text-align: center;
        }

        .wallet-tabs {
          display: flex;
          background: linear-gradient(135deg, rgba(30, 58, 138, 0.6) 0%, rgba(15, 23, 42, 0.8) 100%);
          border: 1px solid rgba(255, 215, 0, 0.2);
          border-radius: 12px;
          padding: 4px;
          margin-bottom: 16px;
          backdrop-filter: blur(10px);
          max-width: 320px;
          margin-left: auto;
          margin-right: auto;
        }

        .tab-button {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 12px 16px;
          background: transparent;
          border: none;
          border-radius: 12px;
          color: #94a3b8;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .tab-button.active {
          background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
          color: white;
          transform: translateY(-2px);
          box-shadow: 0 4px 20px rgba(59, 130, 246, 0.4);
          border: 1px solid #ffd700;
        }

        .tab-button:hover:not(.active) {
          background: rgba(59, 130, 246, 0.1);
          color: #3b82f6;
        }

        .tab-content {
          min-height: 300px;
        }

        .action-buttons {
          display: flex;
          gap: 16px;
          margin-bottom: 32px;
          justify-content: center;
          flex-wrap: wrap;
        }

        .action-button {
          flex: 1;
          min-width: 140px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 12px;
          padding: 20px 16px;
          border-radius: 16px;
          border: 3px solid #ffd700;
          cursor: pointer;
          font-weight: 800;
          font-size: 14px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          position: relative;
          overflow: hidden;
          background: linear-gradient(135deg, #0f4c75 0%, #1e3a8a 30%, #065f46 70%, #064e3b 100%);
          color: white;
          box-shadow: 
            0 8px 25px rgba(255, 215, 0, 0.3),
            0 15px 35px rgba(30, 58, 138, 0.4),
            inset 0 2px 0 rgba(255, 255, 255, 0.2),
            inset 0 -2px 0 rgba(0, 0, 0, 0.3);
        }

        .action-button::before {
          content: '';
          position: absolute;
          top: 0;
          left: -100%;
          width: 100%;
          height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255, 215, 0, 0.3), rgba(255, 255, 255, 0.2), transparent);
          transition: left 0.6s;
        }

        .action-button:hover::before {
          left: 100%;
        }

        .action-button::after {
          content: '';
          position: absolute;
          top: 50%;
          left: 50%;
          width: 0;
          height: 0;
          background: radial-gradient(circle, rgba(255, 215, 0, 0.4), transparent 70%);
          border-radius: 50%;
          transform: translate(-50%, -50%);
          transition: width 0.3s, height 0.3s;
        }

        .action-button:hover::after {
          width: 120px;
          height: 120px;
        }

        .button-glow {
          position: absolute;
          top: -4px;
          left: -4px;
          right: -4px;
          bottom: -4px;
          background: linear-gradient(45deg, #ffd700, #ffed4a, #10b981, #065f46, #ffd700);
          background-size: 300% 300%;
          border-radius: 20px;
          z-index: -1;
          opacity: 0;
          transition: opacity 0.4s ease;
          animation: gradientShift 3s ease infinite;
        }

        @keyframes gradientShift {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }

        .action-button:hover .button-glow {
          opacity: 1;
        }

        .action-button:hover {
          transform: translateY(-5px) scale(1.02);
          box-shadow: 
            0 12px 35px rgba(255, 215, 0, 0.5),
            0 20px 60px rgba(30, 58, 138, 0.6),
            inset 0 3px 0 rgba(255, 255, 255, 0.3),
            inset 0 -3px 0 rgba(0, 0, 0, 0.4);
        }

        .action-button:active {
          transform: translateY(-2px) scale(0.98);
        }

        .action-button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
          transform: none !important;
        }

        .action-icon {
          font-size: 24px;
          filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.3));
          z-index: 2;
          position: relative;
        }

        .action-button span {
          z-index: 2;
          position: relative;
          text-shadow: 0 2px 4px rgba(0, 0, 0, 0.5);
          font-weight: 900;
        }

        .quick-actions {
          background: rgba(15, 23, 42, 0.6);
          border-radius: 16px;
          padding: 20px;
          backdrop-filter: blur(10px);
        }

        .section-title {
          font-size: 16px;
          font-weight: 600;
          color: #3b82f6;
          margin-bottom: 16px;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .quick-action-item {
          display: flex;
          align-items: center;
          gap: 16px;
          padding: 16px 0;
          border-bottom: 1px solid rgba(100, 116, 139, 0.2);
        }

        .quick-action-item:last-child {
          border-bottom: none;
        }

        .quick-icon {
          font-size: 20px;
          color: #3b82f6;
        }

        .quick-text {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .quick-title {
          font-weight: 600;
          color: #e2e8f0;
        }

        .quick-desc {
          font-size: 14px;
          color: #94a3b8;
        }

        .quick-button {
          padding: 8px 16px;
          background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
          color: white;
          border: 1px solid #ffd700;
          border-radius: 8px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .quick-button:hover:not(.disabled) {
          transform: translateY(-2px);
          box-shadow: 0 4px 20px rgba(59, 130, 246, 0.4);
        }

        .quick-button.disabled {
          opacity: 0.5;
          cursor: not-allowed;
          background: linear-gradient(135deg, #64748b 0%, #475569 100%);
        }

        .transactions-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .transaction-item {
          display: flex;
          align-items: center;
          gap: 16px;
          padding: 16px;
          background: rgba(15, 23, 42, 0.6);
          border-radius: 12px;
          backdrop-filter: blur(10px);
        }

        .transaction-icon {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 40px;
          height: 40px;
          border-radius: 10px;
          background: rgba(255, 215, 0, 0.1);
        }

        .transaction-info {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .transaction-desc {
          font-weight: 600;
          color: #e2e8f0;
        }

        .transaction-date {
          font-size: 12px;
          color: #94a3b8;
        }

        .transaction-amount {
          display: flex;
          align-items: center;
          gap: 4px;
          font-weight: 700;
          font-size: 16px;
        }

        .mini-coin {
          font-size: 14px;
          color: #ffd700;
        }

        .empty-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 16px;
          padding: 60px 20px;
          color: #94a3b8;
        }

        .empty-icon {
          font-size: 48px;
          opacity: 0.5;
        }

        .loading {
          text-align: center;
          padding: 40px;
          color: #94a3b8;
        }

        .exchange-rates {
          display: flex;
          flex-direction: column;
          gap: 16px;
          margin-bottom: 24px;
        }

        .rate-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 16px;
          background: rgba(15, 23, 42, 0.6);
          border-radius: 12px;
          backdrop-filter: blur(10px);
        }

        .exchange-button {
          padding: 8px 16px;
          background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
          color: white;
          border: none;
          border-radius: 8px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .exchange-button:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 20px rgba(59, 130, 246, 0.3);
        }

        .exchange-info {
          padding: 16px;
          background: rgba(59, 130, 246, 0.1);
          border-radius: 12px;
          border-left: 4px solid #3b82f6;
        }

        .exchange-info p {
          margin: 4px 0;
          color: #e2e8f0;
          font-size: 14px;
        }

        /* Модальные окна */
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.8);
          backdrop-filter: blur(10px);
          z-index: 1000;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
        }

        .modal-content {
          background: linear-gradient(135deg, #1e3a8a 0%, #1e293b 50%, #0f172a 100%);
          border: 2px solid #ffd700;
          border-radius: 20px;
          width: 100%;
          max-width: 400px;
          max-height: 80vh;
          overflow-y: auto;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5), 0 0 40px rgba(255, 215, 0, 0.2);
        }

        .modal-inner {
          padding: 24px;
        }

        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 24px;
          padding-bottom: 16px;
          border-bottom: 1px solid rgba(255, 215, 0, 0.2);
        }

        .modal-header h3 {
          color: #3b82f6;
          font-size: 18px;
          font-weight: 700;
          margin: 0;
        }

        .close-btn {
          background: none;
          border: none;
          color: #e2e8f0;
          font-size: 24px;
          cursor: pointer;
          padding: 4px;
          border-radius: 50%;
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.3s ease;
        }

        .close-btn:hover {
          background: rgba(59, 130, 246, 0.1);
          color: #3b82f6;
        }

        .crypto-select, .input-section {
          margin-bottom: 20px;
        }

        .crypto-select label, .input-section label {
          display: block;
          color: #e2e8f0;
          font-weight: 600;
          margin-bottom: 8px;
          font-size: 14px;
        }

        .crypto-select select, .input-section input {
          width: 100%;
          padding: 12px 16px;
          background: rgba(15, 23, 42, 0.8);
          border: 1px solid rgba(255, 215, 0, 0.3);
          border-radius: 12px;
          color: #e2e8f0;
          font-size: 14px;
          transition: all 0.3s ease;
        }

        .crypto-select select:focus, .input-section input:focus {
          outline: none;
          border-color: #ffd700;
          box-shadow: 0 0 0 3px rgba(255, 215, 0, 0.1);
        }

        .qr-section {
          text-align: center;
          margin: 24px 0;
        }

        .qr-placeholder {
          background: rgba(15, 23, 42, 0.6);
          border: 2px dashed rgba(255, 215, 0, 0.3);
          border-radius: 16px;
          padding: 40px 20px;
        }

        .qr-code {
          font-size: 48px;
          margin-bottom: 12px;
        }

        .address-section {
          margin: 24px 0;
        }

        .address-container {
          display: flex;
          gap: 8px;
        }

        .address-container input {
          flex: 1;
          font-family: monospace;
          font-size: 12px;
          background: rgba(30, 41, 59, 0.8);
          color: #e2e8f0;
          border: 1px solid rgba(99, 102, 241, 0.3);
          border-radius: 8px;
          padding: 12px 16px;
          outline: none;
          min-height: 44px; /* Минимальная высота для мобильных */
          word-break: break-all;
        }
        
        .address-container input:focus {
          border-color: rgba(99, 102, 241, 0.6);
          box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.2);
        }

        .copy-btn {
          padding: 12px;
          background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
          border: 1px solid #ffd700;
          border-radius: 12px;
          cursor: pointer;
          transition: all 0.3s ease;
          color: white;
        }

        .copy-btn:hover {
          transform: scale(1.05);
          box-shadow: 0 4px 20px rgba(59, 130, 246, 0.4);
        }

        .warning {
          background: rgba(255, 193, 7, 0.1);
          border: 1px solid rgba(255, 193, 7, 0.3);
          border-radius: 12px;
          padding: 12px;
          margin-top: 16px;
          color: #ffc107;
          font-size: 13px;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        
        .warning-critical {
          background: rgba(239, 68, 68, 0.15);
          border: 2px solid rgba(239, 68, 68, 0.5);
          border-radius: 12px;
          padding: 14px;
          margin-top: 16px;
          color: #fca5a5;
          font-size: 13px;
          line-height: 1.5;
        }
        
        .warning-critical strong {
          color: #ef4444;
          font-weight: 700;
        }
        
        .network-info-card {
          background: linear-gradient(135deg, rgba(59, 130, 246, 0.15) 0%, rgba(16, 185, 129, 0.15) 100%);
          border: 2px solid rgba(59, 130, 246, 0.4);
          border-radius: 16px;
          padding: 16px;
          margin: 20px 0;
          backdrop-filter: blur(10px);
        }
        
        .network-info-header {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 12px;
          padding-bottom: 12px;
          border-bottom: 1px solid rgba(59, 130, 246, 0.2);
        }
        
        .network-icon {
          font-size: 24px;
          filter: drop-shadow(0 2px 8px rgba(59, 130, 246, 0.5));
        }
        
        .network-name {
          font-size: 16px;
          font-weight: 700;
          color: #3b82f6;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        
        .network-info-body {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        
        .network-warning {
          color: #fbbf24;
          font-size: 13px;
          line-height: 1.5;
          margin: 0;
        }
        
        .network-warning strong {
          color: #fbbf24;
          font-weight: 700;
        }
        
        .network-desc, .network-time {
          color: #e2e8f0;
          font-size: 13px;
          line-height: 1.5;
          margin: 0;
        }
        
        .crypto-selector {
          width: 100%;
          padding: 14px 16px;
          background: rgba(15, 23, 42, 0.9);
          border: 2px solid rgba(59, 130, 246, 0.4);
          border-radius: 12px;
          color: #e2e8f0;
          font-size: 15px;
          font-weight: 600;
          transition: all 0.3s ease;
          cursor: pointer;
        }
        
        .crypto-selector:hover {
          border-color: rgba(59, 130, 246, 0.6);
          background: rgba(15, 23, 42, 1);
        }
        
        .crypto-selector:focus {
          outline: none;
          border-color: #3b82f6;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.2);
        }
        
        .crypto-selector option {
          background: #0f172a;
          padding: 12px;
          font-weight: 600;
        }

        .amount-container {
          position: relative;
        }

        .amount-container .currency {
          position: absolute;
          right: 16px;
          top: 50%;
          transform: translateY(-50%);
          color: #94a3b8;
          font-weight: 600;
        }

        .balance-info {
          color: #94a3b8;
          font-size: 13px;
          margin-top: 8px;
        }

        .percentage-buttons {
          display: flex;
          gap: 8px;
          margin-top: 12px;
        }

        .percentage-buttons button {
          flex: 1;
          padding: 8px;
          background: rgba(59, 130, 246, 0.2);
          border: 1px solid rgba(59, 130, 246, 0.3);
          border-radius: 8px;
          color: #3b82f6;
          cursor: pointer;
          font-weight: 600;
          transition: all 0.3s ease;
        }

        .percentage-buttons button:hover {
          background: rgba(59, 130, 246, 0.3);
          border-color: #3b82f6;
        }

        .withdraw-btn, .buy-btn {
          width: 100%;
          padding: 16px;
          background: linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%);
          border: 2px solid #ffd700;
          border-radius: 12px;
          color: white;
          font-weight: 700;
          font-size: 16px;
          cursor: pointer;
          transition: all 0.3s ease;
          margin: 20px 0;
        }

        .withdraw-btn:hover, .buy-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 25px rgba(255, 215, 0, 0.3);
        }

        .withdraw-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .buy-description {
          color: #94a3b8;
          font-size: 14px;
          line-height: 1.5;
          margin-bottom: 24px;
        }

        .buy-amount {
          margin-bottom: 20px;
        }

        .amount-input {
          display: flex;
          align-items: center;
          gap: 16px;
          background: rgba(15, 23, 42, 0.8);
          border: 1px solid rgba(255, 215, 0, 0.3);
          border-radius: 12px;
          padding: 16px;
        }

        .amount-input .amount {
          font-size: 24px;
          font-weight: 700;
          color: #3b82f6;
        }

        .amount-input select {
          background: transparent;
          border: none;
          color: #e2e8f0;
          font-weight: 600;
        }

        .provider {
          margin-bottom: 20px;
        }

        .provider-info {
          background: rgba(124, 58, 237, 0.2);
          border: 1px solid rgba(124, 58, 237, 0.3);
          border-radius: 12px;
          padding: 12px 16px;
          color: #a855f7;
          font-weight: 600;
        }

        .buy-warning {
          background: rgba(59, 130, 246, 0.1);
          border: 1px solid rgba(59, 130, 246, 0.3);
          border-radius: 12px;
          padding: 12px;
          color: #3b82f6;
          font-size: 13px;
          display: flex;
          align-items: flex-start;
          gap: 8px;
        }

        .hd-info {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-top: 12px;
          padding: 8px 12px;
          background: rgba(59, 130, 246, 0.1);
          border: 1px solid rgba(59, 130, 246, 0.3);
          border-radius: 8px;
          font-size: 12px;
          color: #3b82f6;
        }

        .hd-icon {
          font-size: 14px;
          color: #ffd700;
        }

        .hd-address-container {
          position: relative;
        }

        .hd-generating {
          opacity: 0.6;
          pointer-events: none;
        }

        .hd-spinner {
          position: absolute;
          right: 50px;
          top: 50%;
          transform: translateY(-50%);
          width: 16px;
          height: 16px;
          border: 2px solid rgba(59, 130, 246, 0.3);
          border-top: 2px solid #3b82f6;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          0% { transform: translateY(-50%) rotate(0deg); }
          100% { transform: translateY(-50%) rotate(360deg); }
        }
        
        /* 📱 УЛУЧШЕННАЯ МОБИЛЬНАЯ АДАПТАЦИЯ */
        @media (max-width: 768px) {
          .modal-inner {
            padding: 16px;
            max-height: 85vh;
            overflow-y: auto;
          }
          
          .address-container {
            flex-direction: column;
            gap: 12px;
          }
          
          .address-container input {
            font-size: 14px !important;
            padding: 16px !important;
            min-height: 48px !important;
            line-height: 1.4;
            width: 100%;
            box-sizing: border-box;
          }
          
          .copy-btn {
            width: 100% !important;
            min-height: 48px !important;
            font-size: 16px !important;
            padding: 16px !important;
          }
          
          .crypto-selector {
            font-size: 16px;
            padding: 16px;
          }
          
          .modal-content {
            margin: 10px;
            max-width: calc(100vw - 20px);
          }
        }
        
        @media (max-width: 480px) {
          .address-container input {
            font-size: 13px !important;
            padding: 14px !important;
          }
        }
      `}</style>
    </div>
  );
}

// HD Address Display Component
interface HDAddressDisplayProps {
  crypto?: string;
  userId?: string;
  generateAddress?: (crypto: string, userId: string) => Promise<string>;
  isGenerating?: boolean;
}

function HDAddressDisplay({ crypto = 'TON', userId = '', generateAddress, isGenerating = false }: HDAddressDisplayProps) {
  const [address, setAddress] = useState('Генерируется HD адрес...');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (generateAddress && userId && crypto) {
      loadAddress();
    }
  }, [crypto, userId, generateAddress]);

  const loadAddress = async () => {
    if (!generateAddress || !userId) {
      console.log('❌ HDAddressDisplay: отсутствуют параметры', { generateAddress: !!generateAddress, userId });
      return;
    }
    
    console.log(`🔄 HDAddressDisplay: загружаем адрес для ${crypto}, userId: ${userId}`);
    setIsLoading(true);
    try {
      const addr = await generateAddress(crypto, userId);
      console.log(`✅ HDAddressDisplay: получен адрес для ${crypto}:`, addr);
      setAddress(addr);
    } catch (error) {
      console.error('❌ HDAddressDisplay: ошибка загрузки адреса:', error);
      setAddress('Ошибка генерации адреса');
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = () => {
    if (address && address !== 'Генерируется HD адрес...' && !address.startsWith('Ошибка')) {
      navigator.clipboard?.writeText(address);
    }
  };

  return (
    <div className={`address-container hd-address-container ${isLoading || isGenerating ? 'hd-generating' : ''}`}>
      <input 
        type="text" 
        value={address}
        readOnly 
        placeholder="Генерируется уникальный HD адрес..."
      />
      {(isLoading || isGenerating) && <div className="hd-spinner"></div>}
      <button 
        className="copy-btn" 
        onClick={copyToClipboard}
        disabled={isLoading || isGenerating || address.startsWith('Ошибка')}
      >
        {isLoading || isGenerating ? <FaDatabase /> : '📋'}
      </button>
    </div>
  );
}
