-- ПОЛНАЯ СХЕМА БД P.I.D.R. с правильными префиксами _pidr_

-- Пользователи
CREATE TABLE IF NOT EXISTS _pidr_users (
    id BIGSERIAL PRIMARY KEY,
    telegram_id VARCHAR(255) UNIQUE,
    username VARCHAR(255),
    first_name VARCHAR(255),
    last_name VARCHAR(255),
    coins INTEGER DEFAULT 1000,
    rating INTEGER DEFAULT 0,
    games_played INTEGER DEFAULT 0,
    games_won INTEGER DEFAULT 0,
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Комнаты
CREATE TABLE IF NOT EXISTS _pidr_rooms (
    id BIGSERIAL PRIMARY KEY,
    room_code VARCHAR(10) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    host_id VARCHAR(255) NOT NULL,
    max_players INTEGER DEFAULT 4,
    current_players INTEGER DEFAULT 1,
    status VARCHAR(20) DEFAULT 'waiting',
    is_private BOOLEAN DEFAULT false,
    password VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Игроки в комнатах
CREATE TABLE IF NOT EXISTS _pidr_room_players (
    id BIGSERIAL PRIMARY KEY,
    room_id BIGINT REFERENCES _pidr_rooms(id) ON DELETE CASCADE,
    user_id VARCHAR(255) NOT NULL,
    username VARCHAR(255) NOT NULL,
    is_host BOOLEAN DEFAULT false,
    is_ready BOOLEAN DEFAULT false,
    position INTEGER NOT NULL,
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Игры
CREATE TABLE IF NOT EXISTS _pidr_games (
    id BIGSERIAL PRIMARY KEY,
    room_id BIGINT REFERENCES _pidr_rooms(id),
    status VARCHAR(20) DEFAULT 'active',
    winner_id VARCHAR(255),
    started_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    ended_at TIMESTAMP WITH TIME ZONE
);

-- Результаты игр
CREATE TABLE IF NOT EXISTS _pidr_game_results (
    id BIGSERIAL PRIMARY KEY,
    game_id BIGINT REFERENCES _pidr_games(id) ON DELETE CASCADE,
    user_id VARCHAR(255) NOT NULL,
    position INTEGER NOT NULL,
    coins_won INTEGER DEFAULT 0,
    coins_lost INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Транзакции монет
CREATE TABLE IF NOT EXISTS _pidr_coin_transactions (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL,
    amount INTEGER NOT NULL,
    transaction_type VARCHAR(50) NOT NULL,
    description TEXT,
    balance_before INTEGER NOT NULL,
    balance_after INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- HD Кошельки
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

-- Друзья
CREATE TABLE IF NOT EXISTS _pidr_friends (
    id BIGSERIAL PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    friend_id VARCHAR(255) NOT NULL,
    status VARCHAR(20) DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Достижения
CREATE TABLE IF NOT EXISTS _pidr_achievements (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    icon VARCHAR(255),
    condition_type VARCHAR(50),
    condition_value INTEGER,
    reward_coins INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Достижения пользователей
CREATE TABLE IF NOT EXISTS _pidr_user_achievements (
    id BIGSERIAL PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    achievement_id BIGINT REFERENCES _pidr_achievements(id),
    unlocked_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Настройки пользователей
CREATE TABLE IF NOT EXISTS _pidr_user_settings (
    id BIGSERIAL PRIMARY KEY,
    user_id VARCHAR(255) UNIQUE NOT NULL,
    sound_enabled BOOLEAN DEFAULT true,
    notifications_enabled BOOLEAN DEFAULT true,
    theme VARCHAR(20) DEFAULT 'dark',
    language VARCHAR(10) DEFAULT 'ru',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ИНДЕКСЫ

-- Уникальные индексы для HD кошельков
CREATE UNIQUE INDEX IF NOT EXISTS idx_pidr_hd_user_coin 
ON _pidr_hd_wallets (user_id, coin);

CREATE UNIQUE INDEX IF NOT EXISTS idx_pidr_hd_address 
ON _pidr_hd_wallets (coin, address);

-- Индексы для быстрого поиска
CREATE INDEX IF NOT EXISTS idx_pidr_users_telegram_id ON _pidr_users (telegram_id);
CREATE INDEX IF NOT EXISTS idx_pidr_rooms_code ON _pidr_rooms (room_code);
CREATE INDEX IF NOT EXISTS idx_pidr_rooms_status ON _pidr_rooms (status);
CREATE INDEX IF NOT EXISTS idx_pidr_room_players_room_id ON _pidr_room_players (room_id);
CREATE INDEX IF NOT EXISTS idx_pidr_room_players_user_id ON _pidr_room_players (user_id);
CREATE INDEX IF NOT EXISTS idx_pidr_hd_wallets_user_id ON _pidr_hd_wallets (user_id);
CREATE INDEX IF NOT EXISTS idx_pidr_coin_transactions_user_id ON _pidr_coin_transactions (user_id);

-- RLS ПОЛИТИКИ

-- Включаем RLS для всех таблиц
ALTER TABLE _pidr_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE _pidr_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE _pidr_room_players ENABLE ROW LEVEL SECURITY;
ALTER TABLE _pidr_games ENABLE ROW LEVEL SECURITY;
ALTER TABLE _pidr_game_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE _pidr_coin_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE _pidr_hd_wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE _pidr_friends ENABLE ROW LEVEL SECURITY;
ALTER TABLE _pidr_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE _pidr_user_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE _pidr_user_settings ENABLE ROW LEVEL SECURITY;

-- Политики доступа (пока открытые для разработки)
CREATE POLICY "Enable all for all users" ON _pidr_users FOR ALL USING (true);
CREATE POLICY "Enable all for all users" ON _pidr_rooms FOR ALL USING (true);
CREATE POLICY "Enable all for all users" ON _pidr_room_players FOR ALL USING (true);
CREATE POLICY "Enable all for all users" ON _pidr_games FOR ALL USING (true);
CREATE POLICY "Enable all for all users" ON _pidr_game_results FOR ALL USING (true);
CREATE POLICY "Enable all for all users" ON _pidr_coin_transactions FOR ALL USING (true);
CREATE POLICY "Enable all for all users" ON _pidr_hd_wallets FOR ALL USING (true);
CREATE POLICY "Enable all for all users" ON _pidr_friends FOR ALL USING (true);
CREATE POLICY "Enable all for all users" ON _pidr_achievements FOR ALL USING (true);
CREATE POLICY "Enable all for all users" ON _pidr_user_achievements FOR ALL USING (true);
CREATE POLICY "Enable all for all users" ON _pidr_user_settings FOR ALL USING (true);
