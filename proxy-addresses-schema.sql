-- Таблица для прокси-адресов пользователей
CREATE TABLE IF NOT EXISTS _pidr_user_proxy_addresses (
    id BIGSERIAL PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    coin VARCHAR(10) NOT NULL,
    proxy_address VARCHAR(255) NOT NULL,
    master_address VARCHAR(255) NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Индексы для быстрого поиска
CREATE UNIQUE INDEX IF NOT EXISTS idx_pidr_proxy_user_coin 
ON _pidr_user_proxy_addresses (user_id, coin);

CREATE UNIQUE INDEX IF NOT EXISTS idx_pidr_proxy_address 
ON _pidr_user_proxy_addresses (proxy_address);

CREATE INDEX IF NOT EXISTS idx_pidr_proxy_user_id 
ON _pidr_user_proxy_addresses (user_id);

CREATE INDEX IF NOT EXISTS idx_pidr_proxy_coin 
ON _pidr_user_proxy_addresses (coin);

-- RLS политики
ALTER TABLE _pidr_user_proxy_addresses ENABLE ROW LEVEL SECURITY;

-- Политика доступа (пока открытая для разработки)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = '_pidr_user_proxy_addresses' AND policyname = 'Enable all for all users') THEN
        CREATE POLICY "Enable all for all users" ON _pidr_user_proxy_addresses FOR ALL USING (true);
    END IF;
END $$;

-- Функция для обновления updated_at
CREATE OR REPLACE FUNCTION update_proxy_addresses_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Триггер для автообновления updated_at
DROP TRIGGER IF EXISTS update_proxy_addresses_updated_at ON _pidr_user_proxy_addresses;
CREATE TRIGGER update_proxy_addresses_updated_at
    BEFORE UPDATE ON _pidr_user_proxy_addresses
    FOR EACH ROW
    EXECUTE FUNCTION update_proxy_addresses_updated_at();
