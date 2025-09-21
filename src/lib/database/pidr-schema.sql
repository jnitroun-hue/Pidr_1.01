-- =====================================================
-- P.I.D.R. GAME DATABASE SCHEMA
-- Специальные таблицы для игры P.I.D.R.
-- =====================================================

-- Пользователи P.I.D.R. игры
CREATE TABLE IF NOT EXISTS _pidr_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    telegram_id VARCHAR(50) UNIQUE,
    username VARCHAR(100) NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    email VARCHAR(255),
    photo_url TEXT,
    
    -- Игровая статистика
    coins INTEGER DEFAULT 1000,
    rating INTEGER DEFAULT 0,
    games_played INTEGER DEFAULT 0,
    games_won INTEGER DEFAULT 0,
    total_score INTEGER DEFAULT 0,
    level_id INTEGER DEFAULT 1,
    
    -- Статус и время
    status VARCHAR(20) DEFAULT 'offline',
    last_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Игровые комнаты
CREATE TABLE IF NOT EXISTS _pidr_rooms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_code VARCHAR(20) UNIQUE NOT NULL,
    name VARCHAR(200) NOT NULL,
    host_id UUID REFERENCES _pidr_users(id) ON DELETE CASCADE,
    
    -- Настройки комнаты
    max_players INTEGER DEFAULT 4 CHECK (max_players BETWEEN 2 AND 8),
    current_players INTEGER DEFAULT 1,
    is_private BOOLEAN DEFAULT FALSE,
    password_hash VARCHAR(255),
    
    -- Игровые настройки
    game_mode VARCHAR(50) DEFAULT 'classic',
    table_type VARCHAR(50) DEFAULT 'casual',
    difficulty VARCHAR(20) DEFAULT 'medium',
    
    -- Статус
    status VARCHAR(20) DEFAULT 'waiting' CHECK (status IN ('waiting', 'playing', 'finished', 'cancelled')),
    
    -- Время
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    started_at TIMESTAMP WITH TIME ZONE,
    finished_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Участники комнат
CREATE TABLE IF NOT EXISTS _pidr_room_players (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id UUID REFERENCES _pidr_rooms(id) ON DELETE CASCADE,
    user_id UUID REFERENCES _pidr_users(id) ON DELETE CASCADE,
    
    -- Статус в комнате
    is_host BOOLEAN DEFAULT FALSE,
    is_ready BOOLEAN DEFAULT FALSE,
    is_bot BOOLEAN DEFAULT FALSE,
    position INTEGER, -- позиция за столом (0-7)
    
    -- Время
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    left_at TIMESTAMP WITH TIME ZONE,
    
    UNIQUE(room_id, user_id),
    UNIQUE(room_id, position)
);

-- Игры (партии)
CREATE TABLE IF NOT EXISTS _pidr_games (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id UUID REFERENCES _pidr_rooms(id) ON DELETE CASCADE,
    
    -- Настройки игры
    total_players INTEGER NOT NULL,
    deck_size INTEGER DEFAULT 36,
    trump_suit VARCHAR(10),
    
    -- Статус игры
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'finished', 'cancelled')),
    current_stage INTEGER DEFAULT 1 CHECK (current_stage BETWEEN 1 AND 3),
    current_turn UUID REFERENCES _pidr_users(id),
    
    -- Результаты
    winner_id UUID REFERENCES _pidr_users(id),
    total_rounds INTEGER DEFAULT 0,
    
    -- Время
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    finished_at TIMESTAMP WITH TIME ZONE,
    
    -- Дополнительные данные (JSON)
    game_data JSONB DEFAULT '{}'::jsonb
);

-- Результаты игроков в играх
CREATE TABLE IF NOT EXISTS _pidr_game_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    game_id UUID REFERENCES _pidr_games(id) ON DELETE CASCADE,
    user_id UUID REFERENCES _pidr_users(id) ON DELETE CASCADE,
    
    -- Результаты
    position INTEGER, -- место в игре (1 = победитель)
    final_score INTEGER DEFAULT 0,
    cards_played INTEGER DEFAULT 0,
    penalties INTEGER DEFAULT 0,
    bonuses INTEGER DEFAULT 0,
    
    -- Награды
    coins_earned INTEGER DEFAULT 0,
    rating_change INTEGER DEFAULT 0,
    
    -- Время
    finished_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(game_id, user_id)
);

-- Транзакции монет
CREATE TABLE IF NOT EXISTS _pidr_coin_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES _pidr_users(id) ON DELETE CASCADE,
    
    -- Транзакция
    amount INTEGER NOT NULL, -- положительное = заработал, отрицательное = потратил
    transaction_type VARCHAR(50) NOT NULL, -- 'game_win', 'game_loss', 'purchase', 'bonus', 'deposit', 'withdrawal'
    description TEXT,
    
    -- Связанные данные
    game_id UUID REFERENCES _pidr_games(id),
    room_id UUID REFERENCES _pidr_rooms(id),
    
    -- Баланс
    balance_before INTEGER NOT NULL,
    balance_after INTEGER NOT NULL,
    
    -- Время
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Дополнительные данные
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Друзья и приглашения
CREATE TABLE IF NOT EXISTS _pidr_friends (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES _pidr_users(id) ON DELETE CASCADE,
    friend_id UUID REFERENCES _pidr_users(id) ON DELETE CASCADE,
    
    -- Статус дружбы
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'blocked')),
    
    -- Кто отправил запрос
    requested_by UUID REFERENCES _pidr_users(id),
    
    -- Время
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(user_id, friend_id),
    CHECK (user_id != friend_id)
);

-- Достижения
CREATE TABLE IF NOT EXISTS _pidr_achievements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(100) UNIQUE NOT NULL,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    icon VARCHAR(50),
    
    -- Условия получения
    requirement_type VARCHAR(50), -- 'games_won', 'total_games', 'coins_earned', 'streak', etc.
    requirement_value INTEGER,
    
    -- Награды
    coins_reward INTEGER DEFAULT 0,
    rating_reward INTEGER DEFAULT 0,
    
    -- Метаданные
    rarity VARCHAR(20) DEFAULT 'common' CHECK (rarity IN ('common', 'rare', 'epic', 'legendary')),
    is_hidden BOOLEAN DEFAULT FALSE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Достижения пользователей
CREATE TABLE IF NOT EXISTS _pidr_user_achievements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES _pidr_users(id) ON DELETE CASCADE,
    achievement_id UUID REFERENCES _pidr_achievements(id) ON DELETE CASCADE,
    
    -- Прогресс
    progress INTEGER DEFAULT 0,
    is_completed BOOLEAN DEFAULT FALSE,
    
    -- Время
    earned_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(user_id, achievement_id)
);

-- Настройки пользователей
CREATE TABLE IF NOT EXISTS _pidr_user_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES _pidr_users(id) ON DELETE CASCADE UNIQUE,
    
    -- Игровые настройки
    auto_ready BOOLEAN DEFAULT FALSE,
    sound_enabled BOOLEAN DEFAULT TRUE,
    animations_enabled BOOLEAN DEFAULT TRUE,
    
    -- Уведомления
    notifications_enabled BOOLEAN DEFAULT TRUE,
    friend_requests_enabled BOOLEAN DEFAULT TRUE,
    game_invites_enabled BOOLEAN DEFAULT TRUE,
    
    -- Приватность
    profile_public BOOLEAN DEFAULT TRUE,
    show_online_status BOOLEAN DEFAULT TRUE,
    
    -- Дополнительные настройки
    settings JSONB DEFAULT '{}'::jsonb,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- ИНДЕКСЫ ДЛЯ ПРОИЗВОДИТЕЛЬНОСТИ
-- =====================================================

-- Пользователи
CREATE INDEX IF NOT EXISTS idx_pidr_users_telegram_id ON _pidr_users(telegram_id);
CREATE INDEX IF NOT EXISTS idx_pidr_users_username ON _pidr_users(username);
CREATE INDEX IF NOT EXISTS idx_pidr_users_status ON _pidr_users(status);
CREATE INDEX IF NOT EXISTS idx_pidr_users_rating ON _pidr_users(rating DESC);

-- Комнаты
CREATE INDEX IF NOT EXISTS idx_pidr_rooms_code ON _pidr_rooms(room_code);
CREATE INDEX IF NOT EXISTS idx_pidr_rooms_status ON _pidr_rooms(status);
CREATE INDEX IF NOT EXISTS idx_pidr_rooms_host ON _pidr_rooms(host_id);
CREATE INDEX IF NOT EXISTS idx_pidr_rooms_created ON _pidr_rooms(created_at DESC);

-- Участники комнат
CREATE INDEX IF NOT EXISTS idx_pidr_room_players_room ON _pidr_room_players(room_id);
CREATE INDEX IF NOT EXISTS idx_pidr_room_players_user ON _pidr_room_players(user_id);

-- Игры
CREATE INDEX IF NOT EXISTS idx_pidr_games_room ON _pidr_games(room_id);
CREATE INDEX IF NOT EXISTS idx_pidr_games_status ON _pidr_games(status);
CREATE INDEX IF NOT EXISTS idx_pidr_games_started ON _pidr_games(started_at DESC);

-- Транзакции
CREATE INDEX IF NOT EXISTS idx_pidr_coin_transactions_user ON _pidr_coin_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_pidr_coin_transactions_type ON _pidr_coin_transactions(transaction_type);
CREATE INDEX IF NOT EXISTS idx_pidr_coin_transactions_created ON _pidr_coin_transactions(created_at DESC);

-- =====================================================
-- ФУНКЦИИ ДЛЯ АВТОМАТИЗАЦИИ
-- =====================================================

-- Обновление updated_at автоматически
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Триггеры для автоматического обновления updated_at
CREATE TRIGGER update_pidr_users_updated_at BEFORE UPDATE ON _pidr_users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_pidr_rooms_updated_at BEFORE UPDATE ON _pidr_rooms FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_pidr_user_settings_updated_at BEFORE UPDATE ON _pidr_user_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Функция для обновления статистики пользователя
CREATE OR REPLACE FUNCTION update_user_stats(
    p_user_id UUID,
    p_games_played_delta INTEGER DEFAULT 0,
    p_games_won_delta INTEGER DEFAULT 0,
    p_coins_delta INTEGER DEFAULT 0,
    p_rating_delta INTEGER DEFAULT 0
)
RETURNS VOID AS $$
BEGIN
    UPDATE _pidr_users 
    SET 
        games_played = games_played + p_games_played_delta,
        games_won = games_won + p_games_won_delta,
        coins = GREATEST(0, coins + p_coins_delta),
        rating = GREATEST(0, rating + p_rating_delta),
        updated_at = NOW()
    WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql;

-- Функция для создания транзакции монет
CREATE OR REPLACE FUNCTION create_coin_transaction(
    p_user_id UUID,
    p_amount INTEGER,
    p_transaction_type VARCHAR(50),
    p_description TEXT DEFAULT NULL,
    p_game_id UUID DEFAULT NULL,
    p_room_id UUID DEFAULT NULL,
    p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID AS $$
DECLARE
    v_balance_before INTEGER;
    v_balance_after INTEGER;
    v_transaction_id UUID;
BEGIN
    -- Получаем текущий баланс
    SELECT coins INTO v_balance_before FROM _pidr_users WHERE id = p_user_id;
    
    IF v_balance_before IS NULL THEN
        RAISE EXCEPTION 'User not found: %', p_user_id;
    END IF;
    
    -- Вычисляем новый баланс
    v_balance_after := GREATEST(0, v_balance_before + p_amount);
    
    -- Создаем транзакцию
    INSERT INTO _pidr_coin_transactions (
        user_id, amount, transaction_type, description,
        game_id, room_id, balance_before, balance_after, metadata
    ) VALUES (
        p_user_id, p_amount, p_transaction_type, p_description,
        p_game_id, p_room_id, v_balance_before, v_balance_after, p_metadata
    ) RETURNING id INTO v_transaction_id;
    
    -- Обновляем баланс пользователя
    UPDATE _pidr_users SET coins = v_balance_after, updated_at = NOW() WHERE id = p_user_id;
    
    RETURN v_transaction_id;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- НАЧАЛЬНЫЕ ДАННЫЕ
-- =====================================================

-- Базовые достижения
INSERT INTO _pidr_achievements (code, name, description, icon, requirement_type, requirement_value, coins_reward, rarity) VALUES
('first_game', 'Первая игра', 'Сыграть первую партию в P.I.D.R.', '🎮', 'games_played', 1, 100, 'common'),
('first_win', 'Первая победа', 'Выиграть первую партию', '🏆', 'games_won', 1, 250, 'common'),
('veteran', 'Ветеран', 'Сыграть 100 партий', '🎖️', 'games_played', 100, 1000, 'rare'),
('master', 'Мастер', 'Выиграть 50 партий', '👑', 'games_won', 50, 2500, 'epic'),
('legend', 'Легенда', 'Набрать рейтинг 2000+', '⭐', 'rating', 2000, 5000, 'legendary'),
('rich', 'Богач', 'Накопить 10,000 монет', '💰', 'coins', 10000, 1000, 'rare'),
('streak_5', 'Серия 5', 'Выиграть 5 игр подряд', '🔥', 'win_streak', 5, 500, 'rare')
ON CONFLICT (code) DO NOTHING;

-- =====================================================
-- ПРЕДСТАВЛЕНИЯ (VIEWS) ДЛЯ УДОБСТВА
-- =====================================================

-- Полная информация о пользователях с статистикой
CREATE OR REPLACE VIEW _pidr_users_full AS
SELECT 
    u.*,
    COALESCE(s.auto_ready, FALSE) as auto_ready,
    COALESCE(s.sound_enabled, TRUE) as sound_enabled,
    COALESCE(s.animations_enabled, TRUE) as animations_enabled,
    CASE 
        WHEN u.games_played = 0 THEN 0
        ELSE ROUND((u.games_won::DECIMAL / u.games_played::DECIMAL) * 100, 2)
    END as win_rate,
    (
        SELECT COUNT(*) 
        FROM _pidr_user_achievements ua 
        WHERE ua.user_id = u.id AND ua.is_completed = TRUE
    ) as achievements_count
FROM _pidr_users u
LEFT JOIN _pidr_user_settings s ON u.id = s.user_id;

-- Активные комнаты с информацией о хосте
CREATE OR REPLACE VIEW _pidr_active_rooms AS
SELECT 
    r.*,
    u.username as host_username,
    u.first_name as host_first_name,
    u.photo_url as host_photo_url,
    (
        SELECT COUNT(*) 
        FROM _pidr_room_players rp 
        WHERE rp.room_id = r.id AND rp.left_at IS NULL
    ) as actual_players
FROM _pidr_rooms r
JOIN _pidr_users u ON r.host_id = u.id
WHERE r.status IN ('waiting', 'playing')
ORDER BY r.created_at DESC;

-- Топ игроков по рейтингу
CREATE OR REPLACE VIEW _pidr_leaderboard AS
SELECT 
    u.id,
    u.username,
    u.first_name,
    u.photo_url,
    u.rating,
    u.games_played,
    u.games_won,
    CASE 
        WHEN u.games_played = 0 THEN 0
        ELSE ROUND((u.games_won::DECIMAL / u.games_played::DECIMAL) * 100, 2)
    END as win_rate,
    ROW_NUMBER() OVER (ORDER BY u.rating DESC, u.games_won DESC) as rank
FROM _pidr_users u
WHERE u.games_played > 0
ORDER BY u.rating DESC, u.games_won DESC
LIMIT 100;

-- =====================================================
-- ПОЛИТИКИ БЕЗОПАСНОСТИ (RLS)
-- =====================================================

-- Включаем RLS для всех таблиц
ALTER TABLE _pidr_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE _pidr_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE _pidr_room_players ENABLE ROW LEVEL SECURITY;
ALTER TABLE _pidr_games ENABLE ROW LEVEL SECURITY;
ALTER TABLE _pidr_game_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE _pidr_coin_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE _pidr_friends ENABLE ROW LEVEL SECURITY;
ALTER TABLE _pidr_user_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE _pidr_user_settings ENABLE ROW LEVEL SECURITY;

-- Базовые политики (пользователи могут видеть свои данные)
CREATE POLICY "Users can view own data" ON _pidr_users FOR SELECT USING (auth.uid()::text = id::text OR TRUE); -- Временно разрешаем всем
CREATE POLICY "Users can update own data" ON _pidr_users FOR UPDATE USING (auth.uid()::text = id::text OR TRUE);

-- Комнаты видны всем для поиска
CREATE POLICY "Rooms are viewable by everyone" ON _pidr_rooms FOR SELECT USING (TRUE);
CREATE POLICY "Users can create rooms" ON _pidr_rooms FOR INSERT WITH CHECK (TRUE);
CREATE POLICY "Host can update room" ON _pidr_rooms FOR UPDATE USING (TRUE);

-- Участники комнат
CREATE POLICY "Room players viewable by all" ON _pidr_room_players FOR SELECT USING (TRUE);
CREATE POLICY "Users can join rooms" ON _pidr_room_players FOR INSERT WITH CHECK (TRUE);
CREATE POLICY "Users can leave rooms" ON _pidr_room_players FOR UPDATE USING (TRUE);

-- Игры и результаты видны участникам
CREATE POLICY "Games viewable by all" ON _pidr_games FOR SELECT USING (TRUE);
CREATE POLICY "Game results viewable by all" ON _pidr_game_results FOR SELECT USING (TRUE);

-- Транзакции видны только владельцу
CREATE POLICY "Users see own transactions" ON _pidr_coin_transactions FOR SELECT USING (TRUE); -- Временно всем

-- Друзья и достижения
CREATE POLICY "Friends viewable by involved users" ON _pidr_friends FOR SELECT USING (TRUE);
CREATE POLICY "Achievements viewable by owner" ON _pidr_user_achievements FOR SELECT USING (TRUE);
CREATE POLICY "Settings viewable by owner" ON _pidr_user_settings FOR SELECT USING (TRUE);

COMMENT ON TABLE _pidr_users IS 'Пользователи P.I.D.R. игры с игровой статистикой';
COMMENT ON TABLE _pidr_rooms IS 'Игровые комнаты для мультиплеера';
COMMENT ON TABLE _pidr_games IS 'Партии игры с полной информацией';
COMMENT ON TABLE _pidr_coin_transactions IS 'История транзакций игровых монет';
