-- =====================================================
-- UNIFIED MASTER WALLET SCHEMA для P.I.D.R. GAME
-- Единая система управления кошельками и платежами
-- =====================================================

-- 🏦 Таблица Master кошельков
CREATE TABLE IF NOT EXISTS _pidr_master_wallets (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    network VARCHAR(20) NOT NULL, -- BTC, ETH, TON, USDT_TRC20, USDT_ERC20, SOL
    name VARCHAR(100) NOT NULL,
    address VARCHAR(255) NOT NULL,
    xpub TEXT, -- Для HD кошельков
    encrypted_private_key TEXT, -- Зашифрованный приватный ключ (опционально)
    derivation_path VARCHAR(50) NOT NULL,
    is_active BOOLEAN DEFAULT true,
    is_hd_wallet BOOLEAN DEFAULT false,
    transaction_count INTEGER DEFAULT 0,
    total_received DECIMAL(36, 18) DEFAULT 0,
    last_used_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(network, address),
    CONSTRAINT valid_network CHECK (network IN ('BTC', 'ETH', 'TON', 'USDT_TRC20', 'USDT_ERC20', 'SOL'))
);

-- 💳 Таблица пользовательских адресов
CREATE TABLE IF NOT EXISTS _pidr_user_wallet_addresses (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    network VARCHAR(20) NOT NULL,
    address VARCHAR(255) NOT NULL UNIQUE,
    derivation_index INTEGER, -- Для HD кошельков
    master_wallet_id UUID REFERENCES _pidr_master_wallets(id) ON DELETE CASCADE,
    memo VARCHAR(100), -- Уникальный memo для платежей
    is_active BOOLEAN DEFAULT true,
    balance DECIMAL(36, 18) DEFAULT 0,
    transaction_count INTEGER DEFAULT 0,
    last_checked_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(user_id, network),
    CONSTRAINT valid_network CHECK (network IN ('BTC', 'ETH', 'TON', 'USDT_TRC20', 'USDT_ERC20', 'SOL'))
);

-- 💰 Таблица транзакций (расширенная)
CREATE TABLE IF NOT EXISTS _pidr_wallet_transactions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    user_address_id UUID REFERENCES _pidr_user_wallet_addresses(id) ON DELETE CASCADE,
    master_wallet_id UUID REFERENCES _pidr_master_wallets(id) ON DELETE CASCADE,
    
    -- Детали транзакции
    tx_hash VARCHAR(255), -- Хеш транзакции в блокчейне
    network VARCHAR(20) NOT NULL,
    transaction_type VARCHAR(20) NOT NULL, -- deposit, withdrawal, internal_transfer
    status VARCHAR(20) DEFAULT 'pending', -- pending, confirmed, failed, expired
    
    -- Суммы
    amount DECIMAL(36, 18) NOT NULL,
    fee DECIMAL(36, 18) DEFAULT 0,
    net_amount DECIMAL(36, 18) NOT NULL,
    
    -- Адреса
    from_address VARCHAR(255),
    to_address VARCHAR(255) NOT NULL,
    
    -- Дополнительные данные
    memo VARCHAR(255),
    block_number BIGINT,
    confirmations INTEGER DEFAULT 0,
    required_confirmations INTEGER DEFAULT 1,
    
    -- Временные метки
    blockchain_time TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE,
    confirmed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT valid_network CHECK (network IN ('BTC', 'ETH', 'TON', 'USDT_TRC20', 'USDT_ERC20', 'SOL')),
    CONSTRAINT valid_transaction_type CHECK (transaction_type IN ('deposit', 'withdrawal', 'internal_transfer')),
    CONSTRAINT valid_status CHECK (status IN ('pending', 'confirmed', 'failed', 'expired'))
);

-- 📊 Таблица балансов пользователей
CREATE TABLE IF NOT EXISTS _pidr_user_balances (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    network VARCHAR(20) NOT NULL,
    
    -- Балансы
    available_balance DECIMAL(36, 18) DEFAULT 0,
    pending_balance DECIMAL(36, 18) DEFAULT 0,
    total_balance DECIMAL(36, 18) DEFAULT 0,
    
    -- Статистика
    total_deposits DECIMAL(36, 18) DEFAULT 0,
    total_withdrawals DECIMAL(36, 18) DEFAULT 0,
    transaction_count INTEGER DEFAULT 0,
    
    -- Временные метки
    last_updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(user_id, network),
    CONSTRAINT valid_network CHECK (network IN ('BTC', 'ETH', 'TON', 'USDT_TRC20', 'USDT_ERC20', 'SOL'))
);

-- 🔄 Таблица обменных курсов
CREATE TABLE IF NOT EXISTS _pidr_exchange_rates (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    from_currency VARCHAR(20) NOT NULL,
    to_currency VARCHAR(20) NOT NULL,
    rate DECIMAL(18, 8) NOT NULL,
    source VARCHAR(50) NOT NULL, -- coingecko, binance, etc
    is_active BOOLEAN DEFAULT true,
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(from_currency, to_currency, source)
);

-- 📝 Таблица логов системы кошельков
CREATE TABLE IF NOT EXISTS _pidr_wallet_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id VARCHAR(255),
    action VARCHAR(100) NOT NULL,
    details JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- ИНДЕКСЫ ДЛЯ ОПТИМИЗАЦИИ ПРОИЗВОДИТЕЛЬНОСТИ
-- =====================================================

-- Master кошельки
CREATE INDEX IF NOT EXISTS idx_master_wallets_network ON _pidr_master_wallets(network);
CREATE INDEX IF NOT EXISTS idx_master_wallets_active ON _pidr_master_wallets(is_active);

-- Пользовательские адреса
CREATE INDEX IF NOT EXISTS idx_user_addresses_user_id ON _pidr_user_wallet_addresses(user_id);
CREATE INDEX IF NOT EXISTS idx_user_addresses_network ON _pidr_user_wallet_addresses(network);
CREATE INDEX IF NOT EXISTS idx_user_addresses_active ON _pidr_user_wallet_addresses(is_active);
CREATE INDEX IF NOT EXISTS idx_user_addresses_master_wallet ON _pidr_user_wallet_addresses(master_wallet_id);

-- Транзакции
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON _pidr_wallet_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_network ON _pidr_wallet_transactions(network);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON _pidr_wallet_transactions(status);
CREATE INDEX IF NOT EXISTS idx_transactions_tx_hash ON _pidr_wallet_transactions(tx_hash);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON _pidr_wallet_transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_user_status ON _pidr_wallet_transactions(user_id, status);

-- Балансы
CREATE INDEX IF NOT EXISTS idx_balances_user_id ON _pidr_user_balances(user_id);
CREATE INDEX IF NOT EXISTS idx_balances_network ON _pidr_user_balances(network);

-- Курсы
CREATE INDEX IF NOT EXISTS idx_rates_currencies ON _pidr_exchange_rates(from_currency, to_currency);
CREATE INDEX IF NOT EXISTS idx_rates_active ON _pidr_exchange_rates(is_active);

-- Логи
CREATE INDEX IF NOT EXISTS idx_logs_user_id ON _pidr_wallet_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_logs_action ON _pidr_wallet_logs(action);
CREATE INDEX IF NOT EXISTS idx_logs_created_at ON _pidr_wallet_logs(created_at DESC);

-- =====================================================
-- ФУНКЦИИ ДЛЯ АВТОМАТИЗАЦИИ
-- =====================================================

-- Функция обновления баланса
CREATE OR REPLACE FUNCTION update_user_balance()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
        -- Обновляем баланс при добавлении/изменении транзакции
        INSERT INTO _pidr_user_balances (user_id, network, total_balance, last_updated_at)
        VALUES (NEW.user_id, NEW.network, NEW.net_amount, NOW())
        ON CONFLICT (user_id, network) 
        DO UPDATE SET 
            total_balance = _pidr_user_balances.total_balance + NEW.net_amount,
            transaction_count = _pidr_user_balances.transaction_count + 1,
            last_updated_at = NOW();
        
        RETURN NEW;
    END IF;
    
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Триггер для автообновления балансов
DROP TRIGGER IF EXISTS trigger_update_balance ON _pidr_wallet_transactions;
CREATE TRIGGER trigger_update_balance
    AFTER INSERT OR UPDATE ON _pidr_wallet_transactions
    FOR EACH ROW
    WHEN (NEW.status = 'confirmed')
    EXECUTE FUNCTION update_user_balance();

-- Функция обновления updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Триггеры для обновления updated_at
CREATE TRIGGER update_master_wallets_updated_at
    BEFORE UPDATE ON _pidr_master_wallets
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_addresses_updated_at
    BEFORE UPDATE ON _pidr_user_wallet_addresses
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_transactions_updated_at
    BEFORE UPDATE ON _pidr_wallet_transactions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- НАЧАЛЬНЫЕ ДАННЫЕ
-- =====================================================

-- Вставляем поддерживаемые курсы валют
INSERT INTO _pidr_exchange_rates (from_currency, to_currency, rate, source) VALUES
('BTC', 'USD', 45000.00, 'coingecko'),
('ETH', 'USD', 2500.00, 'coingecko'),
('TON', 'USD', 2.50, 'coingecko'),
('SOL', 'USD', 20.00, 'coingecko'),
('USDT', 'USD', 1.00, 'coingecko')
ON CONFLICT (from_currency, to_currency, source) DO UPDATE SET
    rate = EXCLUDED.rate,
    created_at = NOW();

-- =====================================================
-- RLS ПОЛИТИКИ (Row Level Security)
-- =====================================================

-- Включаем RLS для всех таблиц
ALTER TABLE _pidr_master_wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE _pidr_user_wallet_addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE _pidr_wallet_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE _pidr_user_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE _pidr_exchange_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE _pidr_wallet_logs ENABLE ROW LEVEL SECURITY;

-- Политики доступа (для разработки - открытый доступ)
DO $$ 
BEGIN
    -- Master кошельки - только чтение для всех
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = '_pidr_master_wallets' AND policyname = 'Enable read for all users') THEN
        CREATE POLICY "Enable read for all users" ON _pidr_master_wallets FOR SELECT USING (true);
    END IF;
    
    -- Пользовательские адреса - полный доступ
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = '_pidr_user_wallet_addresses' AND policyname = 'Enable all for all users') THEN
        CREATE POLICY "Enable all for all users" ON _pidr_user_wallet_addresses FOR ALL USING (true);
    END IF;
    
    -- Транзакции - полный доступ
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = '_pidr_wallet_transactions' AND policyname = 'Enable all for all users') THEN
        CREATE POLICY "Enable all for all users" ON _pidr_wallet_transactions FOR ALL USING (true);
    END IF;
    
    -- Балансы - полный доступ
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = '_pidr_user_balances' AND policyname = 'Enable all for all users') THEN
        CREATE POLICY "Enable all for all users" ON _pidr_user_balances FOR ALL USING (true);
    END IF;
    
    -- Курсы - только чтение для всех
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = '_pidr_exchange_rates' AND policyname = 'Enable read for all users') THEN
        CREATE POLICY "Enable read for all users" ON _pidr_exchange_rates FOR SELECT USING (true);
    END IF;
    
    -- Логи - только вставка для всех
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = '_pidr_wallet_logs' AND policyname = 'Enable insert for all users') THEN
        CREATE POLICY "Enable insert for all users" ON _pidr_wallet_logs FOR INSERT WITH CHECK (true);
    END IF;
END $$;

-- =====================================================
-- КОММЕНТАРИИ К ТАБЛИЦАМ
-- =====================================================

COMMENT ON TABLE _pidr_master_wallets IS 'Master кошельки для приема платежей';
COMMENT ON TABLE _pidr_user_wallet_addresses IS 'Уникальные адреса пользователей для каждой сети';
COMMENT ON TABLE _pidr_wallet_transactions IS 'Все транзакции в системе кошельков';
COMMENT ON TABLE _pidr_user_balances IS 'Балансы пользователей по каждой криптовалюте';
COMMENT ON TABLE _pidr_exchange_rates IS 'Актуальные курсы криптовалют';
COMMENT ON TABLE _pidr_wallet_logs IS 'Логи действий в системе кошельков';

-- =====================================================
-- ЗАВЕРШЕНО
-- =====================================================
