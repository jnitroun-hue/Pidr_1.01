'use client'
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Coins, Zap, ArrowRight, Check, Copy, ExternalLink } from 'lucide-react';
import { GRAM } from '@/lib/crypto/gram-brand';
import { CRYPTO_TOKENS } from '@/lib/crypto/crypto-assets';
import CryptoIcon from './CryptoIcon';

function cryptoDisplaySymbol(symbol: string): string {
  return symbol === 'TON' ? GRAM.symbol : symbol;
}

function cryptoDisplayName(crypto: { symbol: string; name: string }): string {
  return crypto.symbol === 'TON' ? GRAM.name : crypto.name;
}

interface CryptoCurrency {
  symbol: string;
  name: string;
  icon: string;
  color: string;
  rate: number; // Сколько игровых монет за 1 крипто-монету
  minAmount: number;
  decimals: number;
}

interface CoinPackage {
  id: string;
  name: string;
  coins: number;
  bonus: number;
  popular?: boolean;
}

interface CryptoPaymentProps {
  onCoinsAdded: (amount: number) => void;
}

export default function CryptoPayment({ onCoinsAdded }: CryptoPaymentProps) {
  const [selectedCrypto, setSelectedCrypto] = useState<CryptoCurrency | null>(null);
  const [selectedPackage, setSelectedPackage] = useState<CoinPackage | null>(null);
  const [paymentStep, setPaymentStep] = useState<'select' | 'payment' | 'success'>('select');
  const [paymentAddress, setPaymentAddress] = useState('');
  const [paymentAmount, setPaymentAmount] = useState('');
  const [copied, setCopied] = useState(false);

  const cryptocurrencies: CryptoCurrency[] = [
    {
      symbol: 'USDT',
      name: 'Tether USD',
      icon: CRYPTO_TOKENS.USDT.icon,
      color: CRYPTO_TOKENS.USDT.color,
      rate: 150,
      minAmount: 1,
      decimals: 6
    },
    {
      symbol: 'TON',
      name: GRAM.name,
      icon: CRYPTO_TOKENS.GRAM.icon,
      color: CRYPTO_TOKENS.GRAM.color,
      rate: 750,
      minAmount: 0.1,
      decimals: 9
    },
    {
      symbol: 'ETH',
      name: 'Ethereum',
      icon: CRYPTO_TOKENS.ETH.icon,
      color: CRYPTO_TOKENS.ETH.color,
      rate: 375000,
      minAmount: 0.001,
      decimals: 18
    },
    {
      symbol: 'SOL',
      name: 'Solana',
      icon: CRYPTO_TOKENS.SOL.icon,
      color: CRYPTO_TOKENS.SOL.color,
      rate: 30000,
      minAmount: 0.01,
      decimals: 9
    }
  ];

  const coinPackages: CoinPackage[] = [
    { id: 'small', name: 'Стартовый', coins: 1000, bonus: 0 },
    { id: 'medium', name: 'Популярный', coins: 5000, bonus: 500, popular: true },
    { id: 'large', name: 'Выгодный', coins: 10000, bonus: 1500 },
    { id: 'mega', name: 'Мега', coins: 25000, bonus: 5000 },
    { id: 'ultimate', name: 'Ультимат', coins: 50000, bonus: 12500 }
  ];

  const calculateCryptoAmount = (coinPackage: CoinPackage, crypto: CryptoCurrency) => {
    const totalCoins = coinPackage.coins + coinPackage.bonus;
    return (totalCoins / crypto.rate).toFixed(crypto.decimals === 18 ? 6 : 4);
  };

  const generatePaymentAddress = async (crypto: CryptoCurrency, userId: string) => {
    try {
      // Получаем уникальный прокси-адрес для пользователя
      const response = await fetch('/api/wallet/proxy-addresses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ 
          coin: crypto.symbol,
          userId: userId || 'demo_user'
        })
      });
      
      const data = await response.json();
      if (data.success && data.address) {
        console.log(`✅ Получен прокси-адрес ${crypto.symbol}: ${data.address}`);
        return data.address;
      }
    } catch (error) {
      console.error('Ошибка генерации прокси-адреса:', error);
    }
    
    // Fallback - генерируем прокси-адрес на клиенте
    return generateClientSideProxyAddress(userId || 'demo_user', crypto.symbol);
  };

  const generateClientSideProxyAddress = (userId: string, coin: string): string => {
    // Простая генерация на клиенте для демо
    const seed = btoa(`${userId}_${coin}_pidr_2024`);
    
    switch (coin) {
      case 'USDT':
        return 'T' + seed.substring(0, 33).replace(/[^A-Za-z0-9]/g, '0');
      case 'TON':
        return 'EQ' + seed.substring(0, 46).replace(/[^A-Za-z0-9]/g, '0');
      case 'ETH':
        return '0x' + seed.substring(0, 40).replace(/[^A-Fa-f0-9]/g, '0');
      case 'SOL':
        return seed.substring(0, 44).replace(/[^A-Za-z0-9]/g, '1');
      default:
        return seed.substring(0, 34);
    }
  };

  const handlePackageSelect = async (coinPackage: CoinPackage, crypto: CryptoCurrency) => {
    setSelectedPackage(coinPackage);
    setSelectedCrypto(crypto);
    setPaymentStep('payment');
    
    const amount = calculateCryptoAmount(coinPackage, crypto);
    setPaymentAmount(amount);
    
    // Генерируем адрес для платежа
    const address = await generatePaymentAddress(crypto, 'current_user_id');
    setPaymentAddress(address || '');
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePaymentComplete = async () => {
    if (selectedPackage && selectedCrypto) {
      try {
        const totalCoins = selectedPackage.coins + selectedPackage.bonus;
        
        // Отправляем запрос на добавление монет в БД
        const response = await fetch('/api/shop/add-coins', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            amount: totalCoins,
            cryptoCurrency: selectedCrypto.symbol,
            cryptoAmount: paymentAmount,
            packageName: selectedPackage.name,
            transactionHash: 'demo_' + Date.now() // Демо хеш
          })
        });

        if (response.ok) {
          const data = await response.json();
          if (data.success) {
            onCoinsAdded(totalCoins);
            setPaymentStep('success');
            
            // Уведомляем о обновлении баланса
            window.dispatchEvent(new CustomEvent('coinsUpdated', {
              detail: { newBalance: data.newBalance }
            }));
          } else {
            console.error('Ошибка добавления монет:', data.message);
          }
        }
      } catch (error) {
        console.error('Ошибка обработки платежа:', error);
      }
    }
  };

  if (paymentStep === 'success') {
    return (
      <motion.div 
        className="payment-success"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
      >
        <div className="success-content">
          <motion.div 
            className="success-icon"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
          >
            <Check className="w-16 h-16 text-green-400" />
          </motion.div>
          <h3 className="success-title">Платеж получен!</h3>
          <p className="success-description">
            {selectedPackage && `${selectedPackage.coins + selectedPackage.bonus} монет добавлено на ваш счет`}
          </p>
          <button 
            className="success-btn"
            onClick={() => setPaymentStep('select')}
          >
            Продолжить покупки
          </button>
        </div>
      </motion.div>
    );
  }

  if (paymentStep === 'payment' && selectedPackage && selectedCrypto) {
    return (
      <motion.div 
        className="payment-process"
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.3 }}
      >
        <div className="payment-header">
          <button 
            className="back-btn"
            onClick={() => setPaymentStep('select')}
          >
            ← Назад
          </button>
          <h3 className="payment-title">Оплата {cryptoDisplaySymbol(selectedCrypto.symbol)}</h3>
        </div>

        <div className="payment-details">
          <div className="package-summary">
            <h4>{selectedPackage.name} пакет</h4>
            <div className="coins-breakdown">
              <div className="coins-item">
                <Coins className="w-4 h-4" />
                <span>{selectedPackage.coins} монет</span>
              </div>
              {selectedPackage.bonus > 0 && (
                <div className="coins-item bonus">
                  <Zap className="w-4 h-4" />
                  <span>+{selectedPackage.bonus} бонус</span>
                </div>
              )}
            </div>
            <div className="total-coins">
              Итого: {selectedPackage.coins + selectedPackage.bonus} монет
            </div>
          </div>

          <div className="payment-info">
            <div className="crypto-amount">
              <span className="crypto-icon">
                {selectedCrypto.icon.startsWith('/') ? (
                  <img src={selectedCrypto.icon} alt={cryptoDisplayName(selectedCrypto)} width={24} height={24} />
                ) : (
                  selectedCrypto.icon
                )}
              </span>
              <span className="amount">{paymentAmount} {cryptoDisplaySymbol(selectedCrypto.symbol)}</span>
            </div>

            <div className="payment-address">
              <label>Адрес для перевода:</label>
              <div className="address-container">
                <code className="address">{paymentAddress}</code>
                <button 
                  className={`copy-btn ${copied ? 'copied' : ''}`}
                  onClick={() => copyToClipboard(paymentAddress)}
                >
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="payment-instructions">
              <h5>Инструкция по оплате:</h5>
              <ol>
                <li>Скопируйте адрес выше</li>
                <li>Отправьте точно <strong>{paymentAmount} {cryptoDisplaySymbol(selectedCrypto.symbol)}</strong></li>
                <li>Дождитесь подтверждения транзакции</li>
                <li>Монеты будут зачислены автоматически</li>
              </ol>
            </div>

            <div className="payment-actions">
              <button 
                className="demo-complete-btn"
                onClick={handlePaymentComplete}
              >
                🎮 Демо: Симулировать платеж
              </button>
              
              <button className="explorer-btn">
                <ExternalLink className="w-4 h-4" />
                Открыть в Explorer
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <div className="crypto-payment">
      <div className="payment-header">
        <h3 className="section-title">
          <Coins className="w-6 h-6" />
          Купить монеты за криптовалюту
        </h3>
        <p className="section-subtitle">
          Выберите пакет монет и способ оплаты
        </p>
      </div>

      <div className="packages-grid">
        {coinPackages.map((coinPackage, index) => (
          <motion.div
            key={coinPackage.id}
            className={`package-card ${coinPackage.popular ? 'popular' : ''}`}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: index * 0.1 }}
            whileHover={{ scale: 1.02, y: -2 }}
          >
            {coinPackage.popular && (
              <div className="popular-badge">
                Популярный
              </div>
            )}
            
            <div className="package-header">
              <h4 className="package-name">{coinPackage.name}</h4>
              <div className="package-coins">
                <Coins className="w-5 h-5" />
                <span className="coins-amount">{coinPackage.coins.toLocaleString()}</span>
              </div>
              {coinPackage.bonus > 0 && (
                <div className="package-bonus">
                  <Zap className="w-4 h-4" />
                  <span>+{coinPackage.bonus.toLocaleString()} бонус</span>
                </div>
              )}
            </div>

            <div className="package-total">
              Итого: {(coinPackage.coins + coinPackage.bonus).toLocaleString()} монет
            </div>

            <div className="crypto-options">
              {cryptocurrencies.map((crypto) => (
                <motion.button
                  key={crypto.symbol}
                  className="crypto-option"
                  style={{ '--crypto-color': crypto.color } as React.CSSProperties}
                  onClick={() => handlePackageSelect(coinPackage, crypto)}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <span className="crypto-icon">
                    {crypto.icon.startsWith('/') ? (
                      <img src={crypto.icon} alt={cryptoDisplayName(crypto)} width={24} height={24} />
                    ) : (
                      crypto.icon
                    )}
                  </span>
                  <div className="crypto-info">
                    <span className="crypto-symbol">{cryptoDisplaySymbol(crypto.symbol)}</span>
                    <span className="crypto-amount">
                      {calculateCryptoAmount(coinPackage, crypto)}
                    </span>
                  </div>
                  <ArrowRight className="w-4 h-4 arrow-icon" />
                </motion.button>
              ))}
            </div>
          </motion.div>
        ))}
      </div>

      <style jsx>{`
        .crypto-payment {
          padding: 20px 0;
        }

        .payment-header {
          margin-bottom: 24px;
          text-align: center;
        }

        .section-title {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          font-size: 20px;
          font-weight: bold;
          color: #ffffff;
          margin-bottom: 8px;
        }

        .section-subtitle {
          color: #94a3b8;
          font-size: 14px;
        }

        .packages-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 16px;
        }

        .package-card {
          background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
          border: 1px solid #334155;
          border-radius: 16px;
          padding: 20px;
          position: relative;
          overflow: hidden;
        }

        .package-card.popular {
          border-color: #fbbf24;
          box-shadow: 0 0 20px rgba(251, 191, 36, 0.3);
        }

        .popular-badge {
          position: absolute;
          top: -1px;
          right: 20px;
          background: linear-gradient(135deg, #fbbf24, #f59e0b);
          color: #000;
          padding: 4px 12px;
          border-radius: 0 0 8px 8px;
          font-size: 12px;
          font-weight: bold;
        }

        .package-header {
          text-align: center;
          margin-bottom: 16px;
        }

        .package-name {
          font-size: 18px;
          font-weight: bold;
          color: #ffffff;
          margin-bottom: 8px;
        }

        .package-coins {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          color: #fbbf24;
          font-size: 20px;
          font-weight: bold;
          margin-bottom: 4px;
        }

        .package-bonus {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 4px;
          color: #22c55e;
          font-size: 14px;
        }

        .package-total {
          text-align: center;
          font-weight: bold;
          color: #ffffff;
          margin-bottom: 16px;
          padding: 8px;
          background: rgba(59, 130, 246, 0.1);
          border-radius: 8px;
        }

        .crypto-options {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .crypto-option {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 12px;
          color: #ffffff;
          transition: all 0.2s ease;
          cursor: pointer;
        }

        .crypto-option:hover {
          background: rgba(255, 255, 255, 0.1);
          border-color: var(--crypto-color);
          box-shadow: 0 0 12px rgba(var(--crypto-color), 0.3);
        }

        .crypto-icon {
          font-size: 20px;
        }

        .crypto-info {
          display: flex;
          flex-direction: column;
          flex: 1;
          text-align: left;
        }

        .crypto-symbol {
          font-weight: bold;
          font-size: 14px;
        }

        .crypto-amount {
          font-size: 12px;
          color: #94a3b8;
        }

        .arrow-icon {
          color: #94a3b8;
        }

        .payment-process {
          padding: 20px 0;
        }

        .payment-header {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 24px;
        }

        .back-btn {
          background: rgba(255, 255, 255, 0.1);
          border: 1px solid rgba(255, 255, 255, 0.2);
          color: #ffffff;
          padding: 8px 12px;
          border-radius: 8px;
          cursor: pointer;
        }

        .payment-title {
          font-size: 18px;
          font-weight: bold;
          color: #ffffff;
        }

        .package-summary {
          background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
          border: 1px solid #334155;
          border-radius: 12px;
          padding: 16px;
          margin-bottom: 20px;
        }

        .coins-breakdown {
          display: flex;
          flex-direction: column;
          gap: 8px;
          margin: 12px 0;
        }

        .coins-item {
          display: flex;
          align-items: center;
          gap: 6px;
          color: #ffffff;
        }

        .coins-item.bonus {
          color: #22c55e;
        }

        .total-coins {
          text-align: center;
          font-weight: bold;
          color: #fbbf24;
          margin-top: 12px;
          padding-top: 12px;
          border-top: 1px solid #334155;
        }

        .payment-info {
          background: rgba(255, 255, 255, 0.05);
          border-radius: 12px;
          padding: 20px;
        }

        .crypto-amount {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          font-size: 24px;
          font-weight: bold;
          color: #ffffff;
          margin-bottom: 20px;
        }

        .payment-address {
          margin-bottom: 20px;
        }

        .payment-address label {
          display: block;
          color: #94a3b8;
          font-size: 14px;
          margin-bottom: 8px;
        }

        .address-container {
          display: flex;
          gap: 8px;
        }

        .address {
          flex: 1;
          background: #0f172a;
          border: 1px solid #334155;
          padding: 12px;
          border-radius: 8px;
          color: #ffffff;
          font-family: 'Courier New', monospace;
          font-size: 12px;
          word-break: break-all;
        }

        .copy-btn {
          background: #3b82f6;
          border: none;
          color: #ffffff;
          padding: 12px;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .copy-btn.copied {
          background: #22c55e;
        }

        .payment-instructions {
          margin-bottom: 20px;
        }

        .payment-instructions h5 {
          color: #ffffff;
          margin-bottom: 12px;
        }

        .payment-instructions ol {
          color: #94a3b8;
          padding-left: 20px;
        }

        .payment-instructions li {
          margin-bottom: 4px;
        }

        .payment-actions {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .demo-complete-btn {
          background: linear-gradient(135deg, #22c55e, #16a34a);
          border: none;
          color: #ffffff;
          padding: 12px 20px;
          border-radius: 8px;
          font-weight: bold;
          cursor: pointer;
        }

        .explorer-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          background: rgba(255, 255, 255, 0.1);
          border: 1px solid rgba(255, 255, 255, 0.2);
          color: #ffffff;
          padding: 12px 20px;
          border-radius: 8px;
          cursor: pointer;
        }

        .payment-success {
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 300px;
        }

        .success-content {
          text-align: center;
        }

        .success-icon {
          margin-bottom: 20px;
        }

        .success-title {
          font-size: 24px;
          font-weight: bold;
          color: #22c55e;
          margin-bottom: 12px;
        }

        .success-description {
          color: #94a3b8;
          margin-bottom: 20px;
        }

        .success-btn {
          background: #3b82f6;
          border: none;
          color: #ffffff;
          padding: 12px 24px;
          border-radius: 8px;
          font-weight: bold;
          cursor: pointer;
        }
      `}</style>
    </div>
  );
}
