-- Применяем обновленную схему БД для P.I.D.R.

-- Добавляем недостающие поля в таблицу _pidr_users если их нет
DO $$ 
BEGIN
    -- Добавляем поле status если его нет
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='_pidr_users' AND column_name='status') THEN
        ALTER TABLE _pidr_users ADD COLUMN status VARCHAR(20) DEFAULT 'offline';
    END IF;
    
    -- Добавляем поле last_seen если его нет
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='_pidr_users' AND column_name='last_seen') THEN
        ALTER TABLE _pidr_users ADD COLUMN last_seen TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;
    END IF;
END $$;

-- Обновляем существующие записи
UPDATE _pidr_users SET status = 'offline' WHERE status IS NULL;
UPDATE _pidr_users SET last_seen = created_at WHERE last_seen IS NULL;
