-- ============================================
-- NFT СИСТЕМА ДЛЯ КАРТОЧНОЙ ИГРЫ P.I.D.R
-- ============================================

-- 1. ТАБЛИЦА PLAYER WALLETS (TON кошельки игроков для NFT)
CREATE TABLE IF NOT EXISTS _pidr_player_wallets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id BIGINT NOT NULL REFERENCES _pidr_users(id) ON DELETE CASCADE,
  wallet_address TEXT NOT NULL UNIQUE, -- TON адрес кошелька игрока
  wallet_type TEXT DEFAULT 'ton', -- ton, tonkeeper, tonhub
  is_primary BOOLEAN DEFAULT TRUE,
  connected_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_used_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb,
  UNIQUE(user_id, wallet_address)
);

CREATE INDEX IF NOT EXISTS idx_player_wallets_user_id ON _pidr_player_wallets(user_id);
CREATE INDEX IF NOT EXISTS idx_player_wallets_address ON _pidr_player_wallets(wallet_address);
CREATE INDEX IF NOT EXISTS idx_player_wallets_primary ON _pidr_player_wallets(user_id, is_primary);

-- 2. ТАБЛИЦА NFT КОЛЛЕКЦИИ (52 карты)
CREATE TABLE IF NOT EXISTS _pidr_nft_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  card_id TEXT NOT NULL UNIQUE, -- "ace_of_spades", "2_of_hearts" и т.д.
  card_rank TEXT NOT NULL, -- "A", "2", "3", ..., "K"
  card_suit TEXT NOT NULL, -- "spades", "hearts", "diamonds", "clubs"
  card_name TEXT NOT NULL, -- "Туз Пик", "Двойка Червей"
  rarity TEXT NOT NULL, -- "common", "rare", "epic", "legendary", "mythic"
  mint_price_ton DECIMAL(10, 2) DEFAULT 0.5, -- Цена минта в TON
  image_url TEXT NOT NULL, -- URL изображения в Supabase Storage
  metadata_url TEXT, -- IPFS или Supabase URL для метаданных
  nft_contract_address TEXT, -- Адрес смарт-контракта NFT
  total_minted INTEGER DEFAULT 0, -- Сколько раз заминчена эта карта
  max_supply INTEGER DEFAULT NULL, -- NULL = неограниченно
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_nft_cards_rarity ON _pidr_nft_cards(rarity);
CREATE INDEX IF NOT EXISTS idx_nft_cards_suit ON _pidr_nft_cards(card_suit);
CREATE INDEX IF NOT EXISTS idx_nft_cards_rank ON _pidr_nft_cards(card_rank);

-- 3. ТАБЛИЦА ВЛАДЕНИЯ NFT
CREATE TABLE IF NOT EXISTS _pidr_nft_ownership (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id BIGINT NOT NULL REFERENCES _pidr_users(id) ON DELETE CASCADE,
  wallet_address TEXT NOT NULL, -- Кошелек владельца
  card_id TEXT NOT NULL REFERENCES _pidr_nft_cards(card_id) ON DELETE CASCADE,
  nft_address TEXT NOT NULL UNIQUE, -- Уникальный адрес NFT в блокчейне
  token_id TEXT, -- ID токена в коллекции
  mint_transaction_hash TEXT, -- Хеш транзакции минта
  mint_type TEXT DEFAULT 'random', -- "random" (0.5 TON) или "custom" (3 TON)
  custom_style TEXT, -- Стиль для кастомной генерации
  custom_image_url TEXT, -- URL кастомного изображения
  minted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  acquired_via TEXT DEFAULT 'mint', -- "mint", "purchase", "reward", "trade"
  is_active BOOLEAN DEFAULT TRUE, -- Активен ли NFT (не сожжен, не передан)
  can_withdraw BOOLEAN DEFAULT TRUE, -- Может ли быть выведен на другой кошелек
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_nft_ownership_user_id ON _pidr_nft_ownership(user_id);
CREATE INDEX IF NOT EXISTS idx_nft_ownership_wallet ON _pidr_nft_ownership(wallet_address);
CREATE INDEX IF NOT EXISTS idx_nft_ownership_card_id ON _pidr_nft_ownership(card_id);
CREATE INDEX IF NOT EXISTS idx_nft_ownership_active ON _pidr_nft_ownership(user_id, is_active);

-- 4. ТАБЛИЦА ИСТОРИИ МИНТОВ
CREATE TABLE IF NOT EXISTS _pidr_nft_mint_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id BIGINT NOT NULL REFERENCES _pidr_users(id) ON DELETE CASCADE,
  card_id TEXT NOT NULL REFERENCES _pidr_nft_cards(card_id) ON DELETE CASCADE,
  wallet_address TEXT NOT NULL,
  nft_address TEXT NOT NULL,
  mint_type TEXT NOT NULL, -- "random" или "custom"
  mint_price_ton DECIMAL(10, 2) NOT NULL,
  commission_paid_ton DECIMAL(10, 2) NOT NULL, -- Комиссия на мастер-кошелек
  transaction_hash TEXT NOT NULL,
  master_wallet_address TEXT, -- Адрес мастер-кошелька для комиссии
  status TEXT DEFAULT 'pending', -- "pending", "confirmed", "failed"
  error_message TEXT,
  minted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  confirmed_at TIMESTAMP WITH TIME ZONE,
  metadata JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_mint_history_user_id ON _pidr_nft_mint_history(user_id);
CREATE INDEX IF NOT EXISTS idx_mint_history_status ON _pidr_nft_mint_history(status);
CREATE INDEX IF NOT EXISTS idx_mint_history_card_id ON _pidr_nft_mint_history(card_id);
CREATE INDEX IF NOT EXISTS idx_mint_history_mint_type ON _pidr_nft_mint_history(mint_type);

-- 4.5. ТАБЛИЦА ВЫВОДА NFT НА ДРУГИЕ КОШЕЛЬКИ
CREATE TABLE IF NOT EXISTS _pidr_nft_withdrawals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id BIGINT NOT NULL REFERENCES _pidr_users(id) ON DELETE CASCADE,
  nft_ownership_id UUID NOT NULL REFERENCES _pidr_nft_ownership(id) ON DELETE CASCADE,
  from_wallet_address TEXT NOT NULL, -- Откуда выводим
  to_wallet_address TEXT NOT NULL, -- Куда выводим
  nft_address TEXT NOT NULL,
  transaction_hash TEXT,
  status TEXT DEFAULT 'pending', -- "pending", "processing", "completed", "failed"
  error_message TEXT,
  requested_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  metadata JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_withdrawals_user_id ON _pidr_nft_withdrawals(user_id);
CREATE INDEX IF NOT EXISTS idx_withdrawals_status ON _pidr_nft_withdrawals(status);
CREATE INDEX IF NOT EXISTS idx_withdrawals_nft ON _pidr_nft_withdrawals(nft_ownership_id);

-- 5. ТАБЛИЦА ДОСТИЖЕНИЙ ДЛЯ РАЗБЛОКИРОВКИ NFT
CREATE TABLE IF NOT EXISTS _pidr_nft_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  achievement_id TEXT NOT NULL UNIQUE,
  achievement_name TEXT NOT NULL,
  achievement_description TEXT,
  card_id TEXT REFERENCES _pidr_nft_cards(card_id) ON DELETE SET NULL,
  requirement_type TEXT NOT NULL, -- "wins", "games_played", "coins_earned", "streak"
  requirement_value INTEGER NOT NULL,
  reward_type TEXT DEFAULT 'free_mint', -- "free_mint", "discount", "exclusive"
  discount_percent INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_achievements_card_id ON _pidr_nft_achievements(card_id);
CREATE INDEX IF NOT EXISTS idx_achievements_active ON _pidr_nft_achievements(is_active);

-- 6. ТАБЛИЦА ПРОГРЕССА ДОСТИЖЕНИЙ ИГРОКОВ
CREATE TABLE IF NOT EXISTS _pidr_user_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id BIGINT NOT NULL REFERENCES _pidr_users(id) ON DELETE CASCADE,
  achievement_id TEXT NOT NULL REFERENCES _pidr_nft_achievements(achievement_id) ON DELETE CASCADE,
  current_progress INTEGER DEFAULT 0,
  is_completed BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMP WITH TIME ZONE,
  claimed BOOLEAN DEFAULT FALSE,
  claimed_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(user_id, achievement_id)
);

CREATE INDEX IF NOT EXISTS idx_user_achievements_user_id ON _pidr_user_achievements(user_id);

-- Удаляем старый индекс если он существует с неправильной колонкой
DROP INDEX IF EXISTS idx_user_achievements_completed;

-- Создаем новый индекс с правильной колонкой
CREATE INDEX idx_user_achievements_completed ON _pidr_user_achievements(user_id, is_completed);

-- ============================================
-- ФУНКЦИИ ДЛЯ РАБОТЫ С NFT
-- ============================================

-- Функция для подключения кошелька
CREATE OR REPLACE FUNCTION connect_player_wallet(
  p_user_id BIGINT,
  p_wallet_address TEXT,
  p_wallet_type TEXT DEFAULT 'ton'
)
RETURNS JSONB AS $$
DECLARE
  v_wallet_id UUID;
BEGIN
  -- Деактивируем все другие кошельки пользователя
  UPDATE _pidr_player_wallets
  SET is_primary = FALSE
  WHERE user_id = p_user_id;

  -- Добавляем или обновляем кошелек
  INSERT INTO _pidr_player_wallets (user_id, wallet_address, wallet_type, is_primary)
  VALUES (p_user_id, p_wallet_address, p_wallet_type, TRUE)
  ON CONFLICT (user_id, wallet_address) 
  DO UPDATE SET 
    is_primary = TRUE,
    last_used_at = NOW()
  RETURNING id INTO v_wallet_id;

  RETURN jsonb_build_object(
    'success', TRUE,
    'wallet_id', v_wallet_id,
    'message', 'Кошелек успешно подключен'
  );
END;
$$ LANGUAGE plpgsql;

-- Функция для резервирования NFT перед минтом
CREATE OR REPLACE FUNCTION reserve_nft_mint(
  p_user_id BIGINT,
  p_card_id TEXT,
  p_wallet_address TEXT
)
RETURNS JSONB AS $$
DECLARE
  v_card RECORD;
  v_mint_id UUID;
BEGIN
  -- Получаем информацию о карте
  SELECT * INTO v_card FROM _pidr_nft_cards WHERE card_id = p_card_id;

  IF v_card IS NULL THEN
    RETURN jsonb_build_object('success', FALSE, 'message', 'Карта не найдена');
  END IF;

  -- Проверяем лимит
  IF v_card.max_supply IS NOT NULL AND v_card.total_minted >= v_card.max_supply THEN
    RETURN jsonb_build_object('success', FALSE, 'message', 'Достигнут лимит минта для этой карты');
  END IF;

  -- Создаем запись в истории минтов
  INSERT INTO _pidr_nft_mint_history (user_id, card_id, wallet_address, nft_address, mint_price_ton, status)
  VALUES (p_user_id, p_card_id, p_wallet_address, '', v_card.mint_price_ton, 'pending')
  RETURNING id INTO v_mint_id;

  RETURN jsonb_build_object(
    'success', TRUE,
    'mint_id', v_mint_id,
    'card', row_to_json(v_card),
    'mint_price_ton', v_card.mint_price_ton
  );
END;
$$ LANGUAGE plpgsql;

-- Функция для подтверждения минта
CREATE OR REPLACE FUNCTION confirm_nft_mint(
  p_mint_id UUID,
  p_nft_address TEXT,
  p_transaction_hash TEXT,
  p_token_id TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_mint RECORD;
BEGIN
  -- Получаем информацию о минте
  SELECT * INTO v_mint FROM _pidr_nft_mint_history WHERE id = p_mint_id;

  IF v_mint IS NULL THEN
    RETURN jsonb_build_object('success', FALSE, 'message', 'Минт не найден');
  END IF;

  -- Обновляем статус минта
  UPDATE _pidr_nft_mint_history
  SET 
    status = 'confirmed',
    nft_address = p_nft_address,
    transaction_hash = p_transaction_hash,
    confirmed_at = NOW()
  WHERE id = p_mint_id;

  -- Создаем запись владения
  INSERT INTO _pidr_nft_ownership (
    user_id, wallet_address, card_id, nft_address, token_id, 
    mint_transaction_hash, acquired_via
  )
  VALUES (
    v_mint.user_id, v_mint.wallet_address, v_mint.card_id, 
    p_nft_address, p_token_id, p_transaction_hash, 'mint'
  );

  -- Увеличиваем счетчик минтов
  UPDATE _pidr_nft_cards
  SET total_minted = total_minted + 1
  WHERE card_id = v_mint.card_id;

  RETURN jsonb_build_object(
    'success', TRUE,
    'message', 'NFT успешно заминчен'
  );
END;
$$ LANGUAGE plpgsql;

-- Функция для получения NFT коллекции игрока
CREATE OR REPLACE FUNCTION get_user_nft_collection(p_user_id BIGINT)
RETURNS JSONB AS $$
DECLARE
  v_result JSONB;
BEGIN
  SELECT jsonb_agg(
    jsonb_build_object(
      'nft_id', o.id,
      'nft_address', o.nft_address,
      'token_id', o.token_id,
      'card_id', c.card_id,
      'card_name', c.card_name,
      'card_rank', c.card_rank,
      'card_suit', c.card_suit,
      'rarity', c.rarity,
      'image_url', c.image_url,
      'minted_at', o.minted_at,
      'acquired_via', o.acquired_via
    )
  ) INTO v_result
  FROM _pidr_nft_ownership o
  JOIN _pidr_nft_cards c ON o.card_id = c.card_id
  WHERE o.user_id = p_user_id AND o.is_active = TRUE;

  RETURN COALESCE(v_result, '[]'::jsonb);
END;
$$ LANGUAGE plpgsql;

-- Функция для обновления прогресса достижений
CREATE OR REPLACE FUNCTION update_achievement_progress(
  p_user_id BIGINT,
  p_achievement_id TEXT,
  p_increment INTEGER DEFAULT 1
)
RETURNS JSONB AS $$
DECLARE
  v_achievement RECORD;
  v_new_progress INTEGER;
  v_is_completed BOOLEAN;
BEGIN
  -- Получаем достижение
  SELECT * INTO v_achievement FROM _pidr_nft_achievements WHERE achievement_id = p_achievement_id;

  IF v_achievement IS NULL THEN
    RETURN jsonb_build_object('success', FALSE, 'message', 'Достижение не найдено');
  END IF;

  -- Обновляем или создаем прогресс
  INSERT INTO _pidr_user_achievements (user_id, achievement_id, current_progress)
  VALUES (p_user_id, p_achievement_id, p_increment)
  ON CONFLICT (user_id, achievement_id)
  DO UPDATE SET current_progress = _pidr_user_achievements.current_progress + p_increment
  RETURNING current_progress, is_completed INTO v_new_progress, v_is_completed;

  -- Проверяем завершение
  IF v_new_progress >= v_achievement.requirement_value AND NOT v_is_completed THEN
    UPDATE _pidr_user_achievements
    SET is_completed = TRUE, completed_at = NOW()
    WHERE user_id = p_user_id AND achievement_id = p_achievement_id;

    RETURN jsonb_build_object(
      'success', TRUE,
      'completed', TRUE,
      'achievement', row_to_json(v_achievement)
    );
  END IF;

  RETURN jsonb_build_object(
    'success', TRUE,
    'completed', FALSE,
    'progress', v_new_progress,
    'required', v_achievement.requirement_value
  );
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- НАЧАЛЬНЫЕ ДАННЫЕ: 52 КАРТЫ
-- ============================================

-- Вставляем все 52 карты с разными редкостями
INSERT INTO _pidr_nft_cards (card_id, card_rank, card_suit, card_name, rarity, mint_price_ton, image_url) VALUES
-- ПИКИ (Spades) - Легендарные
('ace_of_spades', 'A', 'spades', 'Туз Пик', 'legendary', 3.0, '/img/cards/ace_of_spades.png'),
('king_of_spades', 'K', 'spades', 'Король Пик', 'epic', 2.0, '/img/cards/king_of_spades.png'),
('queen_of_spades', 'Q', 'spades', 'Дама Пик', 'epic', 2.0, '/img/cards/queen_of_spades.png'),
('jack_of_spades', 'J', 'spades', 'Валет Пик', 'rare', 1.0, '/img/cards/jack_of_spades.png'),
('10_of_spades', '10', 'spades', 'Десятка Пик', 'rare', 1.0, '/img/cards/10_of_spades.png'),
('9_of_spades', '9', 'spades', 'Девятка Пик', 'common', 0.5, '/img/cards/9_of_spades.png'),
('8_of_spades', '8', 'spades', 'Восьмерка Пик', 'common', 0.5, '/img/cards/8_of_spades.png'),
('7_of_spades', '7', 'spades', 'Семерка Пик', 'common', 0.5, '/img/cards/7_of_spades.png'),
('6_of_spades', '6', 'spades', 'Шестерка Пик', 'common', 0.5, '/img/cards/6_of_spades.png'),
('5_of_spades', '5', 'spades', 'Пятерка Пик', 'common', 0.5, '/img/cards/5_of_spades.png'),
('4_of_spades', '4', 'spades', 'Четверка Пик', 'common', 0.5, '/img/cards/4_of_spades.png'),
('3_of_spades', '3', 'spades', 'Тройка Пик', 'common', 0.5, '/img/cards/3_of_spades.png'),
('2_of_spades', '2', 'spades', 'Двойка Пик', 'common', 0.5, '/img/cards/2_of_spades.png'),

-- ЧЕРВЫ (Hearts) - Мифические
('ace_of_hearts', 'A', 'hearts', 'Туз Червей', 'mythic', 2.5, '/img/cards/ace_of_hearts.png'),
('king_of_hearts', 'K', 'hearts', 'Король Червей', 'epic', 2.0, '/img/cards/king_of_hearts.png'),
('queen_of_hearts', 'Q', 'hearts', 'Дама Червей', 'epic', 2.0, '/img/cards/queen_of_hearts.png'),
('jack_of_hearts', 'J', 'hearts', 'Валет Червей', 'rare', 1.0, '/img/cards/jack_of_hearts.png'),
('10_of_hearts', '10', 'hearts', 'Десятка Червей', 'rare', 1.0, '/img/cards/10_of_hearts.png'),
('9_of_hearts', '9', 'hearts', 'Девятка Червей', 'common', 0.5, '/img/cards/9_of_hearts.png'),
('8_of_hearts', '8', 'hearts', 'Восьмерка Червей', 'common', 0.5, '/img/cards/8_of_hearts.png'),
('7_of_hearts', '7', 'hearts', 'Семерка Червей', 'common', 0.5, '/img/cards/7_of_hearts.png'),
('6_of_hearts', '6', 'hearts', 'Шестерка Червей', 'common', 0.5, '/img/cards/6_of_hearts.png'),
('5_of_hearts', '5', 'hearts', 'Пятерка Червей', 'common', 0.5, '/img/cards/5_of_hearts.png'),
('4_of_hearts', '4', 'hearts', 'Четверка Червей', 'common', 0.5, '/img/cards/4_of_hearts.png'),
('3_of_hearts', '3', 'hearts', 'Тройка Червей', 'common', 0.5, '/img/cards/3_of_hearts.png'),
('2_of_hearts', '2', 'hearts', 'Двойка Червей', 'common', 0.5, '/img/cards/2_of_hearts.png'),

-- БУБНЫ (Diamonds) - Эпические
('ace_of_diamonds', 'A', 'diamonds', 'Туз Бубен', 'epic', 2.0, '/img/cards/ace_of_diamonds.png'),
('king_of_diamonds', 'K', 'diamonds', 'Король Бубен', 'rare', 1.5, '/img/cards/king_of_diamonds.png'),
('queen_of_diamonds', 'Q', 'diamonds', 'Дама Бубен', 'rare', 1.5, '/img/cards/queen_of_diamonds.png'),
('jack_of_diamonds', 'J', 'diamonds', 'Валет Бубен', 'rare', 1.0, '/img/cards/jack_of_diamonds.png'),
('10_of_diamonds', '10', 'diamonds', 'Десятка Бубен', 'rare', 1.0, '/img/cards/10_of_diamonds.png'),
('9_of_diamonds', '9', 'diamonds', 'Девятка Бубен', 'common', 0.5, '/img/cards/9_of_diamonds.png'),
('8_of_diamonds', '8', 'diamonds', 'Восьмерка Бубен', 'common', 0.5, '/img/cards/8_of_diamonds.png'),
('7_of_diamonds', '7', 'diamonds', 'Семерка Бубен', 'common', 0.5, '/img/cards/7_of_diamonds.png'),
('6_of_diamonds', '6', 'diamonds', 'Шестерка Бубен', 'common', 0.5, '/img/cards/6_of_diamonds.png'),
('5_of_diamonds', '5', 'diamonds', 'Пятерка Бубен', 'common', 0.5, '/img/cards/5_of_diamonds.png'),
('4_of_diamonds', '4', 'diamonds', 'Четверка Бубен', 'common', 0.5, '/img/cards/4_of_diamonds.png'),
('3_of_diamonds', '3', 'diamonds', 'Тройка Бубен', 'common', 0.5, '/img/cards/3_of_diamonds.png'),
('2_of_diamonds', '2', 'diamonds', 'Двойка Бубен', 'common', 0.5, '/img/cards/2_of_diamonds.png'),

-- ТРЕФЫ (Clubs) - Редкие
('ace_of_clubs', 'A', 'clubs', 'Туз Треф', 'rare', 1.5, '/img/cards/ace_of_clubs.png'),
('king_of_clubs', 'K', 'clubs', 'Король Треф', 'rare', 1.0, '/img/cards/king_of_clubs.png'),
('queen_of_clubs', 'Q', 'clubs', 'Дама Треф', 'rare', 1.0, '/img/cards/queen_of_clubs.png'),
('jack_of_clubs', 'J', 'clubs', 'Валет Треф', 'common', 0.5, '/img/cards/jack_of_clubs.png'),
('10_of_clubs', '10', 'clubs', 'Десятка Треф', 'common', 0.5, '/img/cards/10_of_clubs.png'),
('9_of_clubs', '9', 'clubs', 'Девятка Треф', 'common', 0.5, '/img/cards/9_of_clubs.png'),
('8_of_clubs', '8', 'clubs', 'Восьмерка Треф', 'common', 0.5, '/img/cards/8_of_clubs.png'),
('7_of_clubs', '7', 'clubs', 'Семерка Треф', 'common', 0.5, '/img/cards/7_of_clubs.png'),
('6_of_clubs', '6', 'clubs', 'Шестерка Треф', 'common', 0.5, '/img/cards/6_of_clubs.png'),
('5_of_clubs', '5', 'clubs', 'Пятерка Треф', 'common', 0.5, '/img/cards/5_of_clubs.png'),
('4_of_clubs', '4', 'clubs', 'Четверка Треф', 'common', 0.5, '/img/cards/4_of_clubs.png'),
('3_of_clubs', '3', 'clubs', 'Тройка Треф', 'common', 0.5, '/img/cards/3_of_clubs.png'),
('2_of_clubs', '2', 'clubs', 'Двойка Треф', 'common', 0.5, '/img/cards/2_of_clubs.png')
ON CONFLICT (card_id) DO NOTHING;

-- Примеры достижений для разблокировки NFT
INSERT INTO _pidr_nft_achievements (achievement_id, achievement_name, achievement_description, card_id, requirement_type, requirement_value, reward_type) VALUES
('first_win', 'Первая победа', 'Выиграйте свою первую игру', 'ace_of_spades', 'wins', 1, 'free_mint'),
('win_streak_5', 'Серия из 5 побед', 'Выиграйте 5 игр подряд', 'king_of_hearts', 'streak', 5, 'free_mint'),
('games_100', '100 игр сыграно', 'Сыграйте 100 игр', 'queen_of_diamonds', 'games_played', 100, 'discount'),
('coins_10000', 'Заработано 10000 монет', 'Заработайте 10000 игровых монет', 'jack_of_clubs', 'coins_earned', 10000, 'discount')
ON CONFLICT (achievement_id) DO NOTHING;

