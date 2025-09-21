-- =====================================================
-- ТРАНЗАКЦИИ И ПЛАТЕЖИ ДЛЯ P.I.D.R. GAME
-- =====================================================

-- Таблица типов валют
CREATE TABLE IF NOT EXISTS currency_types (
  id SERIAL PRIMARY KEY,
  code VARCHAR(10) UNIQUE NOT NULL, -- 'COINS', 'TON', 'ETH', 'SOL', 'USDT'
  name VARCHAR(50) NOT NULL,
  symbol VARCHAR(10) NOT NULL,
  decimals INTEGER DEFAULT 0,
  is_crypto BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  exchange_rate DECIMAL(18, 8) DEFAULT 1.0, -- Курс к базовой валюте (USDT)
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Вставляем основные валюты
INSERT INTO currency_types (code, name, symbol, decimals, is_crypto, exchange_rate) VALUES
('COINS', 'Game Coins', '🪙', 0, false, 0.002), -- 500 монет = 1 USDT
('USDT', 'Tether USD', 'USDT', 6, true, 1.0),
('TON', 'Toncoin', 'TON', 9, true, 2.5),
('ETH', 'Ethereum', 'ETH', 18, true, 2500.0),
('SOL', 'Solana', 'SOL', 9, true, 20.0),
('RUB', 'Russian Ruble', '₽', 2, false, 0.011)
ON CONFLICT (code) DO UPDATE SET
  exchange_rate = EXCLUDED.exchange_rate,
  updated_at = NOW();

-- Таблица кошельков пользователей
CREATE TABLE IF NOT EXISTS user_wallets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  currency_code VARCHAR(10) REFERENCES currency_types(code),
  wallet_address VARCHAR(200), -- Адрес криптокошелька
  balance DECIMAL(18, 8) DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, currency_code)
);

-- Индексы для кошельков
CREATE INDEX IF NOT EXISTS idx_user_wallets_user_id ON user_wallets(user_id);
CREATE INDEX IF NOT EXISTS idx_user_wallets_currency ON user_wallets(currency_code);

-- Таблица транзакций
CREATE TABLE IF NOT EXISTS transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  transaction_type VARCHAR(20) NOT NULL, -- 'deposit', 'withdrawal', 'exchange', 'game_win', 'game_loss', 'referral_bonus'
  status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'completed', 'failed', 'cancelled'
  
  -- Валюта и сумма
  currency_code VARCHAR(10) REFERENCES currency_types(code),
  amount DECIMAL(18, 8) NOT NULL,
  fee DECIMAL(18, 8) DEFAULT 0,
  net_amount DECIMAL(18, 8) NOT NULL, -- amount - fee
  
  -- Обменные операции
  from_currency VARCHAR(10) REFERENCES currency_types(code),
  to_currency VARCHAR(10) REFERENCES currency_types(code),
  from_amount DECIMAL(18, 8),
  to_amount DECIMAL(18, 8),
  exchange_rate DECIMAL(18, 8),
  
  -- Внешние данные
  external_id VARCHAR(200), -- ID транзакции в блокчейне или платежной системе
  wallet_address VARCHAR(200), -- Адрес отправителя/получателя
  blockchain_hash VARCHAR(200), -- Хеш транзакции в блокчейне
  
  -- Метаданные
  description TEXT,
  metadata JSONB, -- Дополнительные данные
  
  -- Временные метки
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Индексы для транзакций
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(transaction_type);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(status);
CREATE INDEX IF NOT EXISTS idx_transactions_currency ON transactions(currency_code);
CREATE INDEX IF NOT EXISTS idx_transactions_external_id ON transactions(external_id);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON transactions(created_at DESC);

-- Таблица истории балансов
CREATE TABLE IF NOT EXISTS balance_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  currency_code VARCHAR(10) REFERENCES currency_types(code),
  transaction_id UUID REFERENCES transactions(id) ON DELETE CASCADE,
  
  balance_before DECIMAL(18, 8) NOT NULL,
  balance_after DECIMAL(18, 8) NOT NULL,
  change_amount DECIMAL(18, 8) NOT NULL,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Индексы для истории балансов
CREATE INDEX IF NOT EXISTS idx_balance_history_user_id ON balance_history(user_id);
CREATE INDEX IF NOT EXISTS idx_balance_history_currency ON balance_history(currency_code);
CREATE INDEX IF NOT EXISTS idx_balance_history_transaction ON balance_history(transaction_id);

-- Таблица лимитов и настроек
CREATE TABLE IF NOT EXISTS payment_settings (
  id SERIAL PRIMARY KEY,
  setting_key VARCHAR(50) UNIQUE NOT NULL,
  setting_value TEXT NOT NULL,
  description TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Вставляем настройки лимитов
INSERT INTO payment_settings (setting_key, setting_value, description) VALUES
('min_deposit_usdt', '1.0', 'Минимальная сумма депозита в USDT'),
('max_deposit_usdt', '10000.0', 'Максимальная сумма депозита в USDT'),
('min_withdrawal_usdt', '5.0', 'Минимальная сумма вывода в USDT'),
('max_withdrawal_usdt', '5000.0', 'Максимальная сумма вывода в USDT'),
('withdrawal_fee_percent', '2.0', 'Комиссия за вывод в процентах'),
('min_withdrawal_fee_usdt', '0.5', 'Минимальная комиссия за вывод в USDT'),
('exchange_fee_percent', '1.0', 'Комиссия за обмен валют в процентах'),
('daily_withdrawal_limit_usdt', '1000.0', 'Дневной лимит вывода в USDT')
ON CONFLICT (setting_key) DO NOTHING;

-- Таблица платежных методов
CREATE TABLE IF NOT EXISTS payment_methods (
  id SERIAL PRIMARY KEY,
  code VARCHAR(20) UNIQUE NOT NULL, -- 'ton_wallet', 'eth_wallet', 'stripe', 'yoomoney'
  name VARCHAR(100) NOT NULL,
  type VARCHAR(20) NOT NULL, -- 'crypto', 'card', 'bank', 'ewallet'
  is_deposit_enabled BOOLEAN DEFAULT true,
  is_withdrawal_enabled BOOLEAN DEFAULT true,
  min_amount DECIMAL(18, 8) DEFAULT 0,
  max_amount DECIMAL(18, 8) DEFAULT 999999,
  fee_percent DECIMAL(5, 2) DEFAULT 0,
  fee_fixed DECIMAL(18, 8) DEFAULT 0,
  processing_time_minutes INTEGER DEFAULT 30,
  supported_currencies TEXT[], -- Массив поддерживаемых валют
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Вставляем платежные методы
INSERT INTO payment_methods (code, name, type, supported_currencies, fee_percent, processing_time_minutes) VALUES
('ton_wallet', 'TON Wallet', 'crypto', ARRAY['TON', 'USDT'], 1.0, 5),
('eth_wallet', 'Ethereum Wallet', 'crypto', ARRAY['ETH', 'USDT'], 2.0, 15),
('sol_wallet', 'Solana Wallet', 'crypto', ARRAY['SOL', 'USDT'], 1.5, 10),
('stripe', 'Credit Card (Stripe)', 'card', ARRAY['USDT'], 3.5, 5),
('yoomoney', 'ЮMoney', 'ewallet', ARRAY['RUB'], 2.5, 10),
('qiwi', 'QIWI Wallet', 'ewallet', ARRAY['RUB'], 2.0, 5),
('paypal', 'PayPal', 'ewallet', ARRAY['USDT'], 3.0, 10)
ON CONFLICT (code) DO NOTHING;

-- Функция для обновления баланса пользователя
CREATE OR REPLACE FUNCTION update_user_balance(
  p_user_id UUID,
  p_currency_code VARCHAR(10),
  p_amount DECIMAL(18, 8),
  p_transaction_id UUID
) RETURNS DECIMAL(18, 8) AS $$
DECLARE
  old_balance DECIMAL(18, 8) := 0;
  new_balance DECIMAL(18, 8);
BEGIN
  -- Получаем текущий баланс
  SELECT balance INTO old_balance 
  FROM user_wallets 
  WHERE user_id = p_user_id AND currency_code = p_currency_code;
  
  -- Если кошелек не существует, создаем его
  IF old_balance IS NULL THEN
    INSERT INTO user_wallets (user_id, currency_code, balance)
    VALUES (p_user_id, p_currency_code, p_amount)
    ON CONFLICT (user_id, currency_code) DO UPDATE SET
      balance = user_wallets.balance + p_amount,
      updated_at = NOW();
    old_balance := 0;
  ELSE
    -- Обновляем баланс
    UPDATE user_wallets 
    SET balance = balance + p_amount, updated_at = NOW()
    WHERE user_id = p_user_id AND currency_code = p_currency_code;
  END IF;
  
  new_balance := old_balance + p_amount;
  
  -- Записываем историю изменения баланса
  INSERT INTO balance_history (user_id, currency_code, transaction_id, balance_before, balance_after, change_amount)
  VALUES (p_user_id, p_currency_code, p_transaction_id, old_balance, new_balance, p_amount);
  
  RETURN new_balance;
END;
$$ LANGUAGE plpgsql;

-- Функция для создания транзакции депозита
CREATE OR REPLACE FUNCTION create_deposit_transaction(
  p_user_id UUID,
  p_currency_code VARCHAR(10),
  p_amount DECIMAL(18, 8),
  p_wallet_address VARCHAR(200) DEFAULT NULL,
  p_external_id VARCHAR(200) DEFAULT NULL,
  p_description TEXT DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  transaction_id UUID;
  fee_amount DECIMAL(18, 8) := 0;
  net_amount DECIMAL(18, 8);
BEGIN
  -- Вычисляем комиссию (для депозитов обычно 0)
  net_amount := p_amount - fee_amount;
  
  -- Создаем транзакцию
  INSERT INTO transactions (
    user_id, transaction_type, status, currency_code, 
    amount, fee, net_amount, wallet_address, external_id, description
  ) VALUES (
    p_user_id, 'deposit', 'pending', p_currency_code,
    p_amount, fee_amount, net_amount, p_wallet_address, p_external_id, p_description
  ) RETURNING id INTO transaction_id;
  
  RETURN transaction_id;
END;
$$ LANGUAGE plpgsql;

-- Функция для подтверждения транзакции
CREATE OR REPLACE FUNCTION confirm_transaction(
  p_transaction_id UUID,
  p_blockchain_hash VARCHAR(200) DEFAULT NULL
) RETURNS BOOLEAN AS $$
DECLARE
  t_record RECORD;
  new_balance DECIMAL(18, 8);
BEGIN
  -- Получаем данные транзакции
  SELECT * INTO t_record FROM transactions WHERE id = p_transaction_id AND status = 'pending';
  
  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;
  
  -- Обновляем баланс пользователя
  IF t_record.transaction_type IN ('deposit', 'game_win', 'referral_bonus') THEN
    new_balance := update_user_balance(t_record.user_id, t_record.currency_code, t_record.net_amount, p_transaction_id);
  ELSIF t_record.transaction_type IN ('withdrawal', 'game_loss') THEN
    new_balance := update_user_balance(t_record.user_id, t_record.currency_code, -t_record.net_amount, p_transaction_id);
  END IF;
  
  -- Обновляем статус транзакции
  UPDATE transactions 
  SET status = 'completed', 
      completed_at = NOW(),
      blockchain_hash = COALESCE(p_blockchain_hash, blockchain_hash),
      updated_at = NOW()
  WHERE id = p_transaction_id;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Представление для статистики пользователя
CREATE OR REPLACE VIEW user_payment_stats AS
SELECT 
  u.id as user_id,
  u.username,
  
  -- Балансы по валютам
  COALESCE(coins.balance, 0) as coins_balance,
  COALESCE(usdt.balance, 0) as usdt_balance,
  COALESCE(ton.balance, 0) as ton_balance,
  COALESCE(eth.balance, 0) as eth_balance,
  COALESCE(sol.balance, 0) as sol_balance,
  
  -- Статистика транзакций
  COALESCE(deposits.total_deposited, 0) as total_deposited_usdt,
  COALESCE(deposits.deposit_count, 0) as deposit_count,
  COALESCE(withdrawals.total_withdrawn, 0) as total_withdrawn_usdt,
  COALESCE(withdrawals.withdrawal_count, 0) as withdrawal_count,
  
  -- Последние операции
  last_deposit.created_at as last_deposit_at,
  last_withdrawal.created_at as last_withdrawal_at

FROM users u

-- Балансы
LEFT JOIN user_wallets coins ON u.id = coins.user_id AND coins.currency_code = 'COINS'
LEFT JOIN user_wallets usdt ON u.id = usdt.user_id AND usdt.currency_code = 'USDT'
LEFT JOIN user_wallets ton ON u.id = ton.user_id AND ton.currency_code = 'TON'
LEFT JOIN user_wallets eth ON u.id = eth.user_id AND eth.currency_code = 'ETH'
LEFT JOIN user_wallets sol ON u.id = sol.user_id AND sol.currency_code = 'SOL'

-- Статистика депозитов
LEFT JOIN (
  SELECT user_id, 
         SUM(net_amount) as total_deposited, 
         COUNT(*) as deposit_count
  FROM transactions 
  WHERE transaction_type = 'deposit' AND status = 'completed'
  GROUP BY user_id
) deposits ON u.id = deposits.user_id

-- Статистика выводов
LEFT JOIN (
  SELECT user_id, 
         SUM(net_amount) as total_withdrawn, 
         COUNT(*) as withdrawal_count
  FROM transactions 
  WHERE transaction_type = 'withdrawal' AND status = 'completed'
  GROUP BY user_id
) withdrawals ON u.id = withdrawals.user_id

-- Последний депозит
LEFT JOIN (
  SELECT DISTINCT ON (user_id) user_id, created_at
  FROM transactions
  WHERE transaction_type = 'deposit' AND status = 'completed'
  ORDER BY user_id, created_at DESC
) last_deposit ON u.id = last_deposit.user_id

-- Последний вывод
LEFT JOIN (
  SELECT DISTINCT ON (user_id) user_id, created_at
  FROM transactions
  WHERE transaction_type = 'withdrawal' AND status = 'completed'
  ORDER BY user_id, created_at DESC
) last_withdrawal ON u.id = last_withdrawal.user_id;

-- Создаем политики RLS (Row Level Security)
ALTER TABLE user_wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE balance_history ENABLE ROW LEVEL SECURITY;

-- Политики для кошельков пользователей
CREATE POLICY "Users can view their own wallets" ON user_wallets
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own wallets" ON user_wallets
  FOR UPDATE USING (auth.uid() = user_id);

-- Политики для транзакций
CREATE POLICY "Users can view their own transactions" ON transactions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own transactions" ON transactions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Политики для истории балансов
CREATE POLICY "Users can view their own balance history" ON balance_history
  FOR SELECT USING (auth.uid() = user_id);

-- Создаем индексы для производительности
CREATE INDEX IF NOT EXISTS idx_transactions_user_status ON transactions(user_id, status);
CREATE INDEX IF NOT EXISTS idx_transactions_type_status ON transactions(transaction_type, status);
CREATE INDEX IF NOT EXISTS idx_user_wallets_active ON user_wallets(user_id, is_active);

-- Комментарии к таблицам
COMMENT ON TABLE currency_types IS 'Типы валют в системе';
COMMENT ON TABLE user_wallets IS 'Кошельки пользователей для разных валют';
COMMENT ON TABLE transactions IS 'Все транзакции в системе';
COMMENT ON TABLE balance_history IS 'История изменений балансов';
COMMENT ON TABLE payment_settings IS 'Настройки платежной системы';
COMMENT ON TABLE payment_methods IS 'Доступные способы пополнения и вывода';

-- Триггеры для автоматического обновления updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_currency_types_updated_at BEFORE UPDATE ON currency_types FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_user_wallets_updated_at BEFORE UPDATE ON user_wallets FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_transactions_updated_at BEFORE UPDATE ON transactions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
