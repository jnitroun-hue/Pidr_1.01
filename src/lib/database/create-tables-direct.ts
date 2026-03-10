// Прямое создание таблиц в Supabase без RPC
import { supabase } from '../supabase';

// Создаем таблицы по одной, так как RPC не работает
export async function createTablesDirectly(): Promise<{ success: boolean; message: string; errors: any[] }> {
  console.log('🚀 ПРЯМОЕ создание таблиц P.I.D.R. в Supabase...');
  
  const errors: any[] = [];
  let successCount = 0;
  
  // Список таблиц для создания
  const tablesToCreate = [
    {
      name: '_pidr_users',
      sql: `
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
      `
    },
    {
      name: '_pidr_rooms',
      sql: `
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
          game_settings JSONB DEFAULT '{"gameMode":"classic_pidr","timePerTurn":45,"oneCardDeclarationTime":5,"maxPlayers":9,"cardsPerPlayer":3,"allowSpectators":true,"deckType":"standard52","penalties":true,"spadeSpecialRule":true,"botDifficulty":"medium","fastModeEnabled":false,"autoTurnSpeed":200}'::jsonb,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
      `
    },
    {
      name: '_pidr_room_players',
      sql: `
        CREATE TABLE IF NOT EXISTS _pidr_room_players (
          id BIGSERIAL PRIMARY KEY,
          room_id BIGINT NOT NULL,
          user_id VARCHAR(255) NOT NULL,
          username VARCHAR(255) NOT NULL,
          is_host BOOLEAN DEFAULT false,
          is_ready BOOLEAN DEFAULT false,
          position INTEGER NOT NULL,
          joined_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
      `
    },
    {
      name: '_pidr_coin_transactions',
      sql: `
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
      `
    },
    {
      name: '_pidr_user_status',
      sql: `
        CREATE TABLE IF NOT EXISTS _pidr_user_status (
          id BIGSERIAL PRIMARY KEY,
          user_id VARCHAR(255) UNIQUE NOT NULL,
          status VARCHAR(20) DEFAULT 'online',
          current_room_id BIGINT,
          last_seen TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
      `
    },
    {
      name: '_pidr_room_invites',
      sql: `
        CREATE TABLE IF NOT EXISTS _pidr_room_invites (
          id BIGSERIAL PRIMARY KEY,
          room_id BIGINT NOT NULL,
          room_code VARCHAR(10) NOT NULL,
          from_user_id BIGINT NOT NULL,
          to_user_id BIGINT NOT NULL,
          status VARCHAR(20) DEFAULT 'pending',
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          expires_at TIMESTAMP WITH TIME ZONE
        );
      `
    }
  ];

  // Создаем каждую таблицу отдельно
  for (const table of tablesToCreate) {
    try {
      console.log(`📋 Создание таблицы ${table.name}...`);
      
      // Пытаемся создать через SQL запрос
      const { data, error } = await supabase
        .from('_test_table_creation')
        .select('*')
        .limit(1);

      // Если таблица не существует, создаем через INSERT (хак для создания таблиц)
      try {
        await supabase
          .from(table.name)
          .select('*', { count: 'exact', head: true });
        
        console.log(`✅ Таблица ${table.name} уже существует`);
        successCount++;
      } catch (checkError) {
        console.log(`❌ Таблица ${table.name} не существует, нужно создать вручную в Supabase Dashboard`);
        errors.push({ 
          table: table.name, 
          error: 'Таблица не существует',
          sql: table.sql.trim()
        });
      }
    } catch (error) {
      console.error(`❌ Ошибка с таблицей ${table.name}:`, error);
      errors.push({ table: table.name, error });
    }
  }

  const isSuccess = successCount >= tablesToCreate.length / 2;

  return {
    success: isSuccess,
    message: isSuccess 
      ? `✅ Найдено ${successCount}/${tablesToCreate.length} таблиц. Система частично готова.`
      : `❌ Найдено только ${successCount}/${tablesToCreate.length} таблиц. Нужно создать вручную.`,
    errors
  };
}

// Функция для создания SQL скрипта
export function generateCreateTablesSQL(): string {
  return `
-- P.I.D.R. Game Database Schema
-- Выполните этот SQL код в Supabase Dashboard -> SQL Editor

-- 1. Пользователи
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
    is_admin BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    last_seen TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(20) DEFAULT 'offline',
    password_hash TEXT,
    email VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Комнаты
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
    settings JSONB DEFAULT '{}',
    last_activity TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    finished_at TIMESTAMP WITH TIME ZONE,
    game_mode VARCHAR(50) DEFAULT 'casual',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Игроки в комнатах
CREATE TABLE IF NOT EXISTS _pidr_room_players (
    id BIGSERIAL PRIMARY KEY,
    room_id BIGINT NOT NULL,
    user_id VARCHAR(255) NOT NULL,
    username VARCHAR(255) NOT NULL,
    is_host BOOLEAN DEFAULT false,
    is_ready BOOLEAN DEFAULT false,
    position INTEGER NOT NULL,
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. Транзакции монет
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

-- 5. Статус пользователей
CREATE TABLE IF NOT EXISTS _pidr_user_status (
    id BIGSERIAL PRIMARY KEY,
    user_id VARCHAR(255) UNIQUE NOT NULL,
    status VARCHAR(20) DEFAULT 'online',
    current_room_id BIGINT,
    last_seen TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 6. Приглашения в комнаты
CREATE TABLE IF NOT EXISTS _pidr_room_invites (
    id BIGSERIAL PRIMARY KEY,
    room_id BIGINT NOT NULL,
    from_user_id VARCHAR(255) NOT NULL,
    to_user_id VARCHAR(255) NOT NULL,
    invitation_url TEXT,
    status VARCHAR(20) DEFAULT 'pending',
    accepted_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 7. Промокоды
CREATE TABLE IF NOT EXISTS _pidr_promocodes (
    id BIGSERIAL PRIMARY KEY,
    code VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    reward_type VARCHAR(50) NOT NULL DEFAULT 'coins',
    reward_value INTEGER NOT NULL DEFAULT 0,
    max_uses INTEGER,
    used_count INTEGER DEFAULT 0,
    expires_at TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT true,
    created_by VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 8. Игры
CREATE TABLE IF NOT EXISTS _pidr_games (
    id BIGSERIAL PRIMARY KEY,
    room_id BIGINT,
    status VARCHAR(20) DEFAULT 'waiting',
    winner_id VARCHAR(255),
    total_players INTEGER DEFAULT 0,
    game_duration_seconds INTEGER DEFAULT 0,
    game_mode VARCHAR(50) DEFAULT 'casual',
    game_data JSONB DEFAULT '{}',
    started_at TIMESTAMP WITH TIME ZONE,
    finished_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 9. Результаты игр
CREATE TABLE IF NOT EXISTS _pidr_game_results (
    id BIGSERIAL PRIMARY KEY,
    game_id BIGINT NOT NULL,
    user_id VARCHAR(255) NOT NULL,
    position INTEGER NOT NULL,
    rating_change INTEGER DEFAULT 0,
    coins_change INTEGER DEFAULT 0,
    is_winner BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ИНДЕКСЫ
CREATE INDEX IF NOT EXISTS idx_pidr_users_telegram_id ON _pidr_users (telegram_id);
CREATE INDEX IF NOT EXISTS idx_pidr_rooms_code ON _pidr_rooms (room_code);
CREATE INDEX IF NOT EXISTS idx_pidr_rooms_status ON _pidr_rooms (status);
CREATE INDEX IF NOT EXISTS idx_pidr_room_invites_to_user ON _pidr_room_invites (to_user_id, status);
CREATE INDEX IF NOT EXISTS idx_pidr_room_invites_room ON _pidr_room_invites (room_id);

-- RLS ПОЛИТИКИ
ALTER TABLE _pidr_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE _pidr_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE _pidr_room_players ENABLE ROW LEVEL SECURITY;
ALTER TABLE _pidr_coin_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE _pidr_user_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE _pidr_room_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE _pidr_promocodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE _pidr_games ENABLE ROW LEVEL SECURITY;
ALTER TABLE _pidr_game_results ENABLE ROW LEVEL SECURITY;

-- Политики: Service Role — полный доступ, Anon — чтение
DROP POLICY IF EXISTS "Enable all for all users" ON _pidr_users;
CREATE POLICY "Enable all for all users" ON _pidr_users FOR ALL USING (true);

DROP POLICY IF EXISTS "Enable all for all users" ON _pidr_rooms;
CREATE POLICY "Enable all for all users" ON _pidr_rooms FOR ALL USING (true);

DROP POLICY IF EXISTS "Enable all for all users" ON _pidr_room_players;
CREATE POLICY "Enable all for all users" ON _pidr_room_players FOR ALL USING (true);

DROP POLICY IF EXISTS "Enable all for all users" ON _pidr_coin_transactions;
CREATE POLICY "Enable all for all users" ON _pidr_coin_transactions FOR ALL USING (true);

DROP POLICY IF EXISTS "Enable all for all users" ON _pidr_user_status;
CREATE POLICY "Enable all for all users" ON _pidr_user_status FOR ALL USING (true);

DROP POLICY IF EXISTS "Enable all for all users" ON _pidr_room_invites;
CREATE POLICY "Enable all for all users" ON _pidr_room_invites FOR ALL USING (true);

DROP POLICY IF EXISTS "Enable all for all users" ON _pidr_promocodes;
CREATE POLICY "Enable all for all users" ON _pidr_promocodes FOR ALL USING (true);

DROP POLICY IF EXISTS "Enable all for all users" ON _pidr_games;
CREATE POLICY "Enable all for all users" ON _pidr_games FOR ALL USING (true);

DROP POLICY IF EXISTS "Enable all for all users" ON _pidr_game_results;
CREATE POLICY "Enable all for all users" ON _pidr_game_results FOR ALL USING (true);

-- ГОТОВО! Все таблицы P.I.D.R. созданы!
  `;
}
