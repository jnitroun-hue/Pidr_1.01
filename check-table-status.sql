-- Проверяем структуру таблицы _pidr_users
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = '_pidr_users' 
ORDER BY ordinal_position;

-- Проверяем количество записей
SELECT COUNT(*) as total_users FROM _pidr_users;

-- Проверяем примеры записей (если есть)
SELECT id, telegram_id, username, first_name, status, created_at 
FROM _pidr_users 
LIMIT 5;
