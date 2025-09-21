-- HD Wallets Schema для P.I.D.R. игры
-- Таблица для хранения HD адресов пользователей

-- Создание таблицы HD кошельков
CREATE TABLE IF NOT EXISTS _pidr_hd_wallets (
    id BIGSERIAL PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    coin VARCHAR(10) NOT NULL,
    address VARCHAR(255) NOT NULL,
    derivation_path VARCHAR(100) NOT NULL,
    address_index INTEGER NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Уникальные индексы для предотвращения дубликатов
CREATE UNIQUE INDEX IF NOT EXISTS idx_pidr_hd_user_coin 
ON _pidr_hd_wallets (user_id, coin);

CREATE UNIQUE INDEX IF NOT EXISTS idx_pidr_hd_coin_index 
ON _pidr_hd_wallets (coin, address_index);

CREATE UNIQUE INDEX IF NOT EXISTS idx_pidr_hd_address 
ON _pidr_hd_wallets (coin, address);

-- Индексы для быстрого поиска
CREATE INDEX IF NOT EXISTS idx_pidr_hd_user_id 
ON _pidr_hd_wallets (user_id);

CREATE INDEX IF NOT EXISTS idx_pidr_hd_coin 
ON _pidr_hd_wallets (coin);

CREATE INDEX IF NOT EXISTS idx_pidr_hd_created_at 
ON _pidr_hd_wallets (created_at DESC);

-- Комментарии к таблице
COMMENT ON TABLE _pidr_hd_wallets IS 'HD кошельки пользователей P.I.D.R. игры';
COMMENT ON COLUMN _pidr_hd_wallets.user_id IS 'ID пользователя (Telegram ID или внутренний ID)';
COMMENT ON COLUMN _pidr_hd_wallets.coin IS 'Тип монеты (BTC, ETH, TON, TRC20, SOL)';
COMMENT ON COLUMN _pidr_hd_wallets.address IS 'Сгенерированный HD адрес';
COMMENT ON COLUMN _pidr_hd_wallets.derivation_path IS 'Путь деривации (например m/44\'/0\'/0\'/0/123)';
COMMENT ON COLUMN _pidr_hd_wallets.address_index IS 'Индекс адреса в HD дереве';
COMMENT ON COLUMN _pidr_hd_wallets.is_active IS 'Активен ли адрес для использования';

-- Функция для автоматического обновления updated_at
CREATE OR REPLACE FUNCTION update_pidr_hd_wallets_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Триггер для автоматического обновления updated_at
DROP TRIGGER IF EXISTS trigger_update_pidr_hd_wallets_updated_at ON _pidr_hd_wallets;
CREATE TRIGGER trigger_update_pidr_hd_wallets_updated_at
    BEFORE UPDATE ON _pidr_hd_wallets
    FOR EACH ROW
    EXECUTE FUNCTION update_pidr_hd_wallets_updated_at();

-- Таблица для отслеживания консолидации средств
CREATE TABLE IF NOT EXISTS _pidr_wallet_consolidations (
    id BIGSERIAL PRIMARY KEY,
    coin VARCHAR(10) NOT NULL,
    from_addresses TEXT[] NOT NULL,
    to_address VARCHAR(255) NOT NULL,
    total_amount DECIMAL(20, 8) NOT NULL,
    tx_hash VARCHAR(255),
    status VARCHAR(20) DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP WITH TIME ZONE
);

-- Индексы для таблицы консолидации
CREATE INDEX IF NOT EXISTS idx_pidr_consolidations_coin 
ON _pidr_wallet_consolidations (coin);

CREATE INDEX IF NOT EXISTS idx_pidr_consolidations_status 
ON _pidr_wallet_consolidations (status);

CREATE INDEX IF NOT EXISTS idx_pidr_consolidations_created_at 
ON _pidr_wallet_consolidations (created_at DESC);

-- Комментарии к таблице консолидации
COMMENT ON TABLE _pidr_wallet_consolidations IS 'Журнал консолидации средств с HD адресов';
COMMENT ON COLUMN _pidr_wallet_consolidations.from_addresses IS 'Массив адресов-источников';
COMMENT ON COLUMN _pidr_wallet_consolidations.to_address IS 'Казначейский адрес назначения';
COMMENT ON COLUMN _pidr_wallet_consolidations.total_amount IS 'Общая сумма консолидации';
COMMENT ON COLUMN _pidr_wallet_consolidations.tx_hash IS 'Хеш транзакции консолидации';
COMMENT ON COLUMN _pidr_wallet_consolidations.status IS 'Статус: pending, completed, failed';

-- Представление для статистики по HD кошелькам
CREATE OR REPLACE VIEW pidr_hd_wallet_stats AS
SELECT 
    coin,
    COUNT(*) as total_addresses,
    COUNT(DISTINCT user_id) as unique_users,
    MIN(created_at) as first_created,
    MAX(created_at) as last_created,
    MAX(address_index) as max_index
FROM _pidr_hd_wallets 
WHERE is_active = true
GROUP BY coin
ORDER BY coin;

-- Функция для получения следующего доступного индекса
CREATE OR REPLACE FUNCTION get_next_hd_index(coin_type VARCHAR(10))
RETURNS INTEGER AS $$
DECLARE
    next_index INTEGER;
BEGIN
    SELECT COALESCE(MAX(address_index), -1) + 1 
    INTO next_index
    FROM _pidr_hd_wallets 
    WHERE coin = coin_type;
    
    RETURN next_index;
END;
$$ LANGUAGE plpgsql;

-- Функция для проверки уникальности адреса
CREATE OR REPLACE FUNCTION is_address_unique(coin_type VARCHAR(10), wallet_address VARCHAR(255))
RETURNS BOOLEAN AS $$
DECLARE
    address_exists BOOLEAN;
BEGIN
    SELECT EXISTS(
        SELECT 1 FROM _pidr_hd_wallets 
        WHERE coin = coin_type AND address = wallet_address
    ) INTO address_exists;
    
    RETURN NOT address_exists;
END;
$$ LANGUAGE plpgsql;

-- Политики безопасности (RLS)
ALTER TABLE _pidr_hd_wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE _pidr_wallet_consolidations ENABLE ROW LEVEL SECURITY;

-- Политика: пользователи могут читать только свои адреса
CREATE POLICY "Users can view their own HD wallets" ON _pidr_hd_wallets
    FOR SELECT USING (user_id = current_setting('app.current_user_id', true));

-- Политика: система может создавать новые адреса
CREATE POLICY "System can insert HD wallets" ON _pidr_hd_wallets
    FOR INSERT WITH CHECK (true);

-- Политика: система может обновлять адреса
CREATE POLICY "System can update HD wallets" ON _pidr_hd_wallets
    FOR UPDATE USING (true);

-- Политика для консолидации (только система)
CREATE POLICY "System can manage consolidations" ON _pidr_wallet_consolidations
    FOR ALL USING (true);

-- Предоставление прав доступа
GRANT SELECT, INSERT, UPDATE ON _pidr_hd_wallets TO PUBLIC;
GRANT SELECT, INSERT, UPDATE ON _pidr_wallet_consolidations TO PUBLIC;
GRANT USAGE ON SEQUENCE _pidr_hd_wallets_id_seq TO PUBLIC;
GRANT USAGE ON SEQUENCE _pidr_wallet_consolidations_id_seq TO PUBLIC;

-- Начальные данные для тестирования (опционально)
-- INSERT INTO _pidr_hd_wallets (user_id, coin, address, derivation_path, address_index) VALUES
-- ('test_user_1', 'BTC', 'bc1qtest1address', 'm/44''/0''/0''/0/0', 0),
-- ('test_user_1', 'ETH', '0xtest1address', 'm/44''/60''/0''/0/0', 0);

-- Вывод информации о созданных объектах
SELECT 
    'HD Wallets Schema created successfully!' as status,
    COUNT(*) as total_tables
FROM information_schema.tables 
WHERE table_name IN ('_pidr_hd_wallets', '_pidr_wallet_consolidations');
