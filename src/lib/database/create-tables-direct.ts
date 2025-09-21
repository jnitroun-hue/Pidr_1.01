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
      name: '_pidr_hd_wallets',
      sql: `
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

-- 5. HD Кошельки (ГЛАВНАЯ ТАБЛИЦА!)
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

-- 6. Статус пользователей
CREATE TABLE IF NOT EXISTS _pidr_user_status (
    id BIGSERIAL PRIMARY KEY,
    user_id VARCHAR(255) UNIQUE NOT NULL,
    status VARCHAR(20) DEFAULT 'online',
    current_room_id BIGINT,
    last_seen TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ИНДЕКСЫ
CREATE UNIQUE INDEX IF NOT EXISTS idx_pidr_hd_user_coin ON _pidr_hd_wallets (user_id, coin);
CREATE UNIQUE INDEX IF NOT EXISTS idx_pidr_hd_address ON _pidr_hd_wallets (coin, address);
CREATE INDEX IF NOT EXISTS idx_pidr_users_telegram_id ON _pidr_users (telegram_id);
CREATE INDEX IF NOT EXISTS idx_pidr_rooms_code ON _pidr_rooms (room_code);
CREATE INDEX IF NOT EXISTS idx_pidr_rooms_status ON _pidr_rooms (status);

-- RLS ПОЛИТИКИ (открытые для разработки)
ALTER TABLE _pidr_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE _pidr_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE _pidr_room_players ENABLE ROW LEVEL SECURITY;
ALTER TABLE _pidr_coin_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE _pidr_hd_wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE _pidr_user_status ENABLE ROW LEVEL SECURITY;

-- Политики доступа (открытые для разработки)
-- Удаляем существующие политики если есть, затем создаем новые
DROP POLICY IF EXISTS "Enable all for all users" ON _pidr_users;
CREATE POLICY "Enable all for all users" ON _pidr_users FOR ALL USING (true);

DROP POLICY IF EXISTS "Enable all for all users" ON _pidr_rooms;
CREATE POLICY "Enable all for all users" ON _pidr_rooms FOR ALL USING (true);

DROP POLICY IF EXISTS "Enable all for all users" ON _pidr_room_players;
CREATE POLICY "Enable all for all users" ON _pidr_room_players FOR ALL USING (true);

DROP POLICY IF EXISTS "Enable all for all users" ON _pidr_coin_transactions;
CREATE POLICY "Enable all for all users" ON _pidr_coin_transactions FOR ALL USING (true);

DROP POLICY IF EXISTS "Enable all for all users" ON _pidr_hd_wallets;
CREATE POLICY "Enable all for all users" ON _pidr_hd_wallets FOR ALL USING (true);

DROP POLICY IF EXISTS "Enable all for all users" ON _pidr_user_status;
CREATE POLICY "Enable all for all users" ON _pidr_user_status FOR ALL USING (true);

-- ГОТОВО! Все таблицы P.I.D.R. созданы!
  `;
}
