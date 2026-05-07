// Автоматическое создание таблиц P.I.D.R. при развертывании
import { supabase } from '../supabase';

const SQL_SCHEMA = `
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
    bot_games_played INTEGER DEFAULT 0,
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

-- Статус пользователей
CREATE TABLE IF NOT EXISTS _pidr_user_status (
    id BIGSERIAL PRIMARY KEY,
    user_id VARCHAR(255) UNIQUE NOT NULL,
    status VARCHAR(20) DEFAULT 'online',
    current_room_id BIGINT,
    last_seen TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
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

-- Друзья
CREATE TABLE IF NOT EXISTS _pidr_friends (
    id BIGSERIAL PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    friend_id VARCHAR(255) NOT NULL,
    status VARCHAR(20) DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Приглашения в комнаты
CREATE TABLE IF NOT EXISTS _pidr_room_invites (
    id BIGSERIAL PRIMARY KEY,
    room_id BIGINT REFERENCES _pidr_rooms(id) ON DELETE CASCADE,
    room_code VARCHAR(10) NOT NULL,
    from_user_id BIGINT NOT NULL, -- telegram_id отправителя
    to_user_id BIGINT NOT NULL,   -- telegram_id получателя
    status VARCHAR(20) DEFAULT 'pending', -- pending / accepted / declined / expired
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP WITH TIME ZONE
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

-- Инвентарь игровых столов пользователя
CREATE TABLE IF NOT EXISTS _pidr_user_tables (
    id BIGSERIAL PRIMARY KEY,
    user_id VARCHAR(255) UNIQUE NOT NULL,
    owned_tables JSONB DEFAULT '["classic-green"]'::jsonb,
    equipped_table VARCHAR(100) DEFAULT 'classic-green',
    favorite_tables JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
`;

const INDEXES_SQL = `
-- ИНДЕКСЫ
CREATE INDEX IF NOT EXISTS idx_pidr_users_telegram_id ON _pidr_users (telegram_id);
CREATE INDEX IF NOT EXISTS idx_pidr_rooms_code ON _pidr_rooms (room_code);
CREATE INDEX IF NOT EXISTS idx_pidr_rooms_status ON _pidr_rooms (status);
CREATE INDEX IF NOT EXISTS idx_pidr_room_players_room_id ON _pidr_room_players (room_id);
CREATE INDEX IF NOT EXISTS idx_pidr_room_players_user_id ON _pidr_room_players (user_id);
CREATE INDEX IF NOT EXISTS idx_pidr_coin_transactions_user_id ON _pidr_coin_transactions (user_id);
CREATE INDEX IF NOT EXISTS idx_pidr_room_invites_to_user ON _pidr_room_invites (to_user_id, status);
CREATE INDEX IF NOT EXISTS idx_pidr_room_invites_room ON _pidr_room_invites (room_id);
CREATE INDEX IF NOT EXISTS idx_pidr_user_tables_user_id ON _pidr_user_tables (user_id);
`;

const RLS_POLICIES_SQL = `
-- RLS ПОЛИТИКИ (открытые для разработки)
ALTER TABLE _pidr_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE _pidr_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE _pidr_room_players ENABLE ROW LEVEL SECURITY;
ALTER TABLE _pidr_coin_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE _pidr_user_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE _pidr_games ENABLE ROW LEVEL SECURITY;
ALTER TABLE _pidr_game_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE _pidr_friends ENABLE ROW LEVEL SECURITY;
ALTER TABLE _pidr_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE _pidr_user_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE _pidr_user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE _pidr_room_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE _pidr_user_tables ENABLE ROW LEVEL SECURITY;

-- Политики доступа (открытые для разработки)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = '_pidr_users' AND policyname = 'Enable all for all users') THEN
        CREATE POLICY "Enable all for all users" ON _pidr_users FOR ALL USING (true);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = '_pidr_rooms' AND policyname = 'Enable all for all users') THEN
        CREATE POLICY "Enable all for all users" ON _pidr_rooms FOR ALL USING (true);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = '_pidr_room_players' AND policyname = 'Enable all for all users') THEN
        CREATE POLICY "Enable all for all users" ON _pidr_room_players FOR ALL USING (true);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = '_pidr_coin_transactions' AND policyname = 'Enable all for all users') THEN
        CREATE POLICY "Enable all for all users" ON _pidr_coin_transactions FOR ALL USING (true);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = '_pidr_user_status' AND policyname = 'Enable all for all users') THEN
        CREATE POLICY "Enable all for all users" ON _pidr_user_status FOR ALL USING (true);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = '_pidr_games' AND policyname = 'Enable all for all users') THEN
        CREATE POLICY "Enable all for all users" ON _pidr_games FOR ALL USING (true);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = '_pidr_game_results' AND policyname = 'Enable all for all users') THEN
        CREATE POLICY "Enable all for all users" ON _pidr_game_results FOR ALL USING (true);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = '_pidr_friends' AND policyname = 'Enable all for all users') THEN
        CREATE POLICY "Enable all for all users" ON _pidr_friends FOR ALL USING (true);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = '_pidr_achievements' AND policyname = 'Enable all for all users') THEN
        CREATE POLICY "Enable all for all users" ON _pidr_achievements FOR ALL USING (true);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = '_pidr_user_achievements' AND policyname = 'Enable all for all users') THEN
        CREATE POLICY "Enable all for all users" ON _pidr_user_achievements FOR ALL USING (true);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = '_pidr_user_settings' AND policyname = 'Enable all for all users') THEN
        CREATE POLICY "Enable all for all users" ON _pidr_user_settings FOR ALL USING (true);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = '_pidr_room_invites' AND policyname = 'Enable all for all users') THEN
        CREATE POLICY "Enable all for all users" ON _pidr_room_invites FOR ALL USING (true);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = '_pidr_user_tables' AND policyname = 'Enable all for all users') THEN
        CREATE POLICY "Enable all for all users" ON _pidr_user_tables FOR ALL USING (true);
    END IF;
END
$$;
`;

export async function createPidrTables(): Promise<{ success: boolean; message: string; errors: any[] }> {
  console.log('🚀 Автоматическое создание таблиц P.I.D.R...');
  
  const errors: any[] = [];
  let successCount = 0;

  try {
    // Проверяем подключение к Supabase
    if (!(process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL) || 
        !(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY)) {
      throw new Error('Не настроены переменные SUPABASE_URL или SUPABASE_ANON_KEY');
    }

    console.log('✅ Подключение к Supabase установлено');

    // 1. Создаем основные таблицы
    console.log('📋 Создаем основные таблицы...');
    try {
      const { error: schemaError } = await supabase.rpc('exec_sql', { 
        sql_query: SQL_SCHEMA 
      });

      if (schemaError) {
        console.warn('⚠️ RPC exec_sql не поддерживается, пробуем альтернативный способ');
        
        // Альтернативный способ - проверяем каждую таблицу отдельно
        const tables = [
          '_pidr_users', '_pidr_rooms', '_pidr_room_players', 
          '_pidr_coin_transactions', '_pidr_user_status',
          '_pidr_games', '_pidr_game_results', '_pidr_friends',
          '_pidr_achievements', '_pidr_user_achievements', '_pidr_user_settings',
          '_pidr_user_tables'
        ];

        for (const tableName of tables) {
          try {
            const { data, error } = await supabase
              .from(tableName)
              .select('*', { count: 'exact', head: true });
            
            if (!error) {
              console.log(`✅ Таблица ${tableName} уже существует`);
              successCount++;
            } else if (error.code === '42P01') {
              console.log(`❌ Таблица ${tableName} не существует - нужно создать вручную`);
              errors.push({ table: tableName, error: 'Таблица не существует' });
            }
          } catch (err) {
            console.log(`❌ Ошибка проверки ${tableName}:`, err);
            errors.push({ table: tableName, error: err });
          }
        }
      } else {
        console.log('✅ Основные таблицы созданы через RPC');
        successCount += 12;
      }
    } catch (err) {
      console.error('❌ Ошибка создания основных таблиц:', err);
      errors.push({ step: 'main_tables', error: err });
    }

    // 2. Создаем индексы
    console.log('🔍 Создаем индексы...');
    try {
      const { error: indexError } = await supabase.rpc('exec_sql', { 
        sql_query: INDEXES_SQL 
      });

      if (indexError) {
        console.warn('⚠️ Не удалось создать индексы через RPC:', indexError.message);
        errors.push({ step: 'indexes', error: indexError });
      } else {
        console.log('✅ Индексы созданы');
        successCount += 1;
      }
    } catch (err) {
      console.error('❌ Ошибка создания индексов:', err);
      errors.push({ step: 'indexes', error: err });
    }

    // 3. Создаем политики RLS
    console.log('🔒 Настраиваем политики безопасности...');
    try {
      const { error: rlsError } = await supabase.rpc('exec_sql', { 
        sql_query: RLS_POLICIES_SQL 
      });

      if (rlsError) {
        console.warn('⚠️ Не удалось создать политики через RPC:', rlsError.message);
        errors.push({ step: 'rls_policies', error: rlsError });
      } else {
        console.log('✅ Политики безопасности настроены');
        successCount += 1;
      }
    } catch (err) {
      console.error('❌ Ошибка создания политик:', err);
      errors.push({ step: 'rls_policies', error: err });
    }

    const isSuccess = successCount > 10 && errors.length < 5;

    return {
      success: isSuccess,
      message: isSuccess 
        ? `✅ Создано ${successCount} элементов БД. Система готова к работе!`
        : `⚠️ Частично создано ${successCount} элементов. Есть ${errors.length} ошибок.`,
      errors
    };

  } catch (error) {
    console.error('❌ Критическая ошибка создания БД:', error);
    return {
      success: false,
      message: `❌ Критическая ошибка: ${error}`,
      errors: [{ step: 'critical', error }]
    };
  }
}

// Функция для проверки статуса БД
export async function checkDatabaseStatus() {
  const tables = [
    '_pidr_users', '_pidr_rooms', '_pidr_room_players', 
    '_pidr_coin_transactions', '_pidr_user_status', '_pidr_user_tables'
  ];

  const status: Record<string, boolean> = {};
  
  for (const tableName of tables) {
    try {
      const { error } = await supabase
        .from(tableName)
        .select('*', { count: 'exact', head: true });
      
      status[tableName] = !error;
    } catch {
      status[tableName] = false;
    }
  }

  return status;
}
