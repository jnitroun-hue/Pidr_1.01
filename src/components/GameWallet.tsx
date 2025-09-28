'use client'

import { useState, useEffect } from 'react';
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
  FaDatabase
} from 'react-icons/fa';
import { MasterWalletService } from '@/lib/wallets/master-wallet-service';
import styles from './GameWallet.module.css';

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

export default function GameWallet({ user, onBalanceUpdate }: GameWalletProps) {
  const [activeTab, setActiveTab] = useState<'main' | 'history' | 'exchange'>('main');
  const [balance, setBalance] = useState(user?.coins || 0);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [depositAmount, setDepositAmount] = useState('');
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [activeModal, setActiveModal] = useState<ModalType>(null);
  const [withdrawAddress, setWithdrawAddress] = useState('');
  const [selectedCrypto, setSelectedCrypto] = useState('TON');
  const [masterAddresses, setMasterAddresses] = useState<any[]>([]);
  const [isGeneratingAddress, setIsGeneratingAddress] = useState(false);
  const [isMonitoringPayments, setIsMonitoringPayments] = useState(false);
  const [bonusAvailable, setBonusAvailable] = useState(true); // Состояние доступности бонуса
  const masterWalletService = new MasterWalletService();

  // Загружаем данные пользователя и транзакции
  useEffect(() => {
    console.log('🔄 GameWallet: инициализация компонента', { user: !!user, userId: user?.id });
    loadUserData();
    loadTransactions();
    loadMasterAddresses();
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

  // Автоматический мониторинг платежей каждые 30 секунд
  useEffect(() => {
    if (!user?.id) return;

    const interval = setInterval(async () => {
      try {
        const token = localStorage.getItem('auth_token');
        if (!token) return;

        const response = await fetch('/api/wallet/check-payments', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
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

  const loadUserData = async () => {
    try {
      const userData = localStorage.getItem('user');
      if (userData) {
        const parsedUser = JSON.parse(userData);
        
        // Получаем актуальный баланс из базы данных
        const response = await fetch('/api/pidr-db', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'get_user_balance',
            userId: parsedUser.telegramId || parsedUser.id
          })
        });

        if (response.ok) {
          const data = await response.json();
          if (data.success) {
            const actualBalance = data.balance || 0;
            setBalance(actualBalance);
            
            // Обновляем localStorage с актуальным балансом
            parsedUser.coins = actualBalance;
            localStorage.setItem('user', JSON.stringify(parsedUser));
            
            onBalanceUpdate?.(actualBalance);
          } else {
            // Fallback к данным из localStorage
            setBalance(parsedUser.coins || 0);
          }
        } else {
          // Fallback к данным из localStorage
          setBalance(parsedUser.coins || 0);
        }
      }
    } catch (error) {
      console.error('Ошибка загрузки данных пользователя:', error);
      // Fallback к данным из localStorage
      const userData = localStorage.getItem('user');
      if (userData) {
        const parsedUser = JSON.parse(userData);
        setBalance(parsedUser.coins || 0);
      }
    }
  };

  // Проверяем активность сессии в БД
  const checkDatabaseSession = async () => {
    try {
      const response = await fetch('/api/auth', {
        method: 'GET',
        credentials: 'include' // Важно для отправки cookies
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
      setLoading(true);
      
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
          const formattedTransactions = result.transactions.map((tx: any) => ({
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
        const userData = localStorage.getItem('user');
        if (userData) {
          const user = JSON.parse(userData);
          
          const fallbackResponse = await fetch('/api/pidr-db', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'get_user_transactions',
              userId: user.telegramId || user.id
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
      
      const userData = localStorage.getItem('user');
      if (!userData) {
        alert('Пользователь не найден');
        return;
      }
      
      const currentUser = JSON.parse(userData);
      
      // Создаем транзакцию через API
      const response = await fetch('/api/pidr-db', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create_transaction',
          userId: currentUser.telegramId || currentUser.id,
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
        
        // Обновляем данные в localStorage
        currentUser.coins = newBalance;
        localStorage.setItem('user', JSON.stringify(currentUser));
        
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

  const handleWithdraw = async () => {
    const amount = parseInt(withdrawAmount);
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
      
      const userData = localStorage.getItem('user');
      if (!userData) {
        alert('Пользователь не найден');
        return;
      }
      
      const currentUser = JSON.parse(userData);
      
      // Создаем транзакцию через API
      const response = await fetch('/api/pidr-db', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create_transaction',
          userId: currentUser.telegramId || currentUser.id,
          amount: -amount, // Отрицательное значение для вывода
          transactionType: 'withdrawal',
          description: 'Вывод средств'
        })
      });

      const result = await response.json();
      
      if (result.success) {
        const newBalance = result.newBalance;
        setBalance(newBalance);
        setWithdrawAmount('');
        
        // Обновляем данные в localStorage
        currentUser.coins = newBalance;
        localStorage.setItem('user', JSON.stringify(currentUser));
        
        onBalanceUpdate?.(newBalance);
        
        // Перезагружаем транзакции
        loadTransactions();
        
        alert(`Успешно выведено ${amount} монет!`);
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
        
        // Обновляем данные в localStorage
        const userData = localStorage.getItem('user');
        if (userData) {
          const currentUser = JSON.parse(userData);
          currentUser.coins = newBalance;
          localStorage.setItem('user', JSON.stringify(currentUser));
        }
        
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
      const userData = localStorage.getItem('user');
      if (!userData) {
        alert('Пользователь не найден');
        return;
      }
      
      const currentUser = JSON.parse(userData);
      
      // Генерируем реферальную ссылку
      const referralCode = currentUser.id || 'player_' + Date.now();
      const gameUrl = window.location.origin;
      const inviteUrl = `${gameUrl}?ref=${referralCode}`;
      
      // Если мы в Telegram WebApp, используем Telegram Share API
      if (typeof window !== 'undefined' && window.Telegram?.WebApp) {
        const tg = window.Telegram.WebApp;
        const inviteText = `🎮 Присоединяйся к игре P.I.D.R.!\n\n` +
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
      
      const token = localStorage.getItem('auth_token');
      if (!token) {
        alert('Нет токена авторизации');
        return;
      }

      // Проверяем новые платежи
      const response = await fetch('/api/wallet/check-payments', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
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
        </div>
        
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
                className="action-button buy"
                whileHover={{ scale: 1.02, y: -2 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setActiveModal('buy')}
                disabled={loading}
              >
                <div className="button-glow"></div>
                <FaShoppingCart className="action-icon" />
                <span>Купить</span>
              </motion.button>

              <motion.button
                className="action-button monitor"
                whileHover={{ scale: 1.02, y: -2 }}
                whileTap={{ scale: 0.98 }}
                onClick={checkPaymentsAndUpdateBalance}
                disabled={isMonitoringPayments}
                style={{ 
                  backgroundColor: isMonitoringPayments ? '#666' : '#00d2d3',
                  opacity: isMonitoringPayments ? 0.6 : 1
                }}
              >
                <div className="button-glow"></div>
                <FaArrowDown className="action-icon" />
                <span>{isMonitoringPayments ? 'Проверка...' : '📊 Обновить'}</span>
              </motion.button>
            </div>

            {/* Быстрые действия */}
            <div className="quick-actions">
              <h3 className="section-title">Быстрые действия</h3>
              
              <div className="quick-action-item">
                <FaGift className="quick-icon" />
                <div className="quick-text">
                  <span className="quick-title">Ежедневный бонус</span>
                  <span className="quick-desc">+100 монет каждый день</span>
                </div>
                <button 
                  className={`quick-button ${!checkBonusAvailability() ? 'disabled' : ''}`}
                  onClick={handleDailyBonus}
                  disabled={loading || !checkBonusAvailability()}
                >
                  {checkBonusAvailability() ? 'Получить' : 'Получено'}
                </button>
              </div>

              <div className="quick-action-item">
                <FaTrophy className="quick-icon" />
                <div className="quick-text">
                  <span className="quick-title">Пригласить друга</span>
                  <span className="quick-desc">+500 монет за приглашение</span>
                </div>
                <button 
                  className="quick-button"
                  onClick={handleInviteFriend}
                  disabled={loading}
                >
                  Пригласить
                </button>
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
                    <h3>💰 Пополнение через кондиционер</h3>
                    <button className="close-btn" onClick={() => setActiveModal(null)}>×</button>
                  </div>
                  
                  <div className="crypto-select">
                    <label>Выбрать валюту</label>
                    <select value={selectedCrypto} onChange={(e) => setSelectedCrypto(e.target.value)}>
                      <option value="TON">TONHA</option>
                      <option value="USDT">USDT</option>
                      <option value="BTC">Bitcoin</option>
                    </select>
                  </div>

                  <div className="qr-section">
                    <div className="qr-placeholder">
                      <div className="qr-code">📱</div>
                      <p>QR-код для пополнения</p>
                    </div>
                  </div>

                  <div className="address-section">
                    <label>🔐 Ваш персональный HD адрес {selectedCrypto} для пополнения</label>
                    <HDAddressDisplay 
                      crypto={selectedCrypto} 
                      userId={user?.id || ''} 
                      generateAddress={generateDepositAddress}
                      isGenerating={isGeneratingAddress}
                    />
                    <div className="hd-info">
                      <FaKey className="hd-icon" />
                      <span>HD Wallet: уникальный адрес из вашего мастер-кошелька</span>
                    </div>
                    <div className="warning">⚠️ Пожалуйста, внимательно проверьте адрес депозита кошелька!</div>
                  </div>
                </div>
              )}

              {activeModal === 'withdraw' && (
                <div className="modal-inner">
                  <div className="modal-header">
                    <h3>💸 Вывод через Блокчейн</h3>
                    <button className="close-btn" onClick={() => setActiveModal(null)}>×</button>
                  </div>
                  
                  <div className="crypto-select">
                    <label>Выбрать валюту</label>
                    <select value={selectedCrypto} onChange={(e) => setSelectedCrypto(e.target.value)}>
                      <option value="TON">TON</option>
                      <option value="USDT">USDT</option>
                      <option value="BTC">Bitcoin</option>
                    </select>
                  </div>

                  <div className="input-section">
                    <label>Адрес для вывода</label>
                    <input 
                      type="text" 
                      value={withdrawAddress}
                      onChange={(e) => setWithdrawAddress(e.target.value)}
                      placeholder="Введите адрес получателя"
                    />
                  </div>

                  <div className="input-section">
                    <label>Сумма вывода</label>
                    <div className="amount-container">
                      <input 
                        type="number" 
                        value={withdrawAmount}
                        onChange={(e) => setWithdrawAmount(e.target.value)}
                        placeholder="0.00"
                      />
                      <span className="currency">{selectedCrypto}</span>
                    </div>
                    <div className="balance-info">Доступно: 0.0431 USDT</div>
                    <div className="percentage-buttons">
                      <button onClick={() => setWithdrawAmount((balance * 0.25).toString())}>25%</button>
                      <button onClick={() => setWithdrawAmount((balance * 0.5).toString())}>50%</button>
                      <button onClick={() => setWithdrawAmount(balance.toString())}>100%</button>
                    </div>
                  </div>

                  <button className="withdraw-btn" onClick={handleWithdraw} disabled={loading}>
                    💸 Вывод
                  </button>

                  <div className="warning">⚠️ Мы не применяем мемо/таг!</div>
                </div>
              )}

              {activeModal === 'buy' && (
                <div className="modal-inner">
                  <div className="modal-header">
                    <h3>💳 Купить Криптовалюту</h3>
                    <button className="close-btn" onClick={() => setActiveModal(null)}>×</button>
                  </div>

                  <div className="buy-description">
                    <p>Мгновенно купайте криптовалюту и автоматически переводите ее на свой кошелек Whale. Услуги, связанные с платежами, предоставляются отдельной платформой, с обратной стороны.</p>
                  </div>

                  <div className="buy-amount">
                    <label>Вы Платите</label>
                    <div className="amount-input">
                      <span className="amount">50</span>
                      <select>
                        <option>евро</option>
                        <option>USD</option>
                        <option>RUB</option>
                      </select>
                    </div>
                  </div>

                  <div className="provider">
                    <label>Провайдер</label>
                    <div className="provider-info">💜 swapped.com</div>
                  </div>

                  <button className="buy-btn">
                    💳 Купить криптовалюту
                  </button>

                  <div className="buy-warning">
                    ⚠️ В зависимости от сети стационара покупка может быть оставлена на несколько минут.
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
        }

        .balance-icon {
          font-size: 16px;
          color: #3b82f6;
        }

        .balance-title {
          font-size: 14px;
          font-weight: 600;
          color: #e2e8f0;
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
