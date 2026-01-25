# Миграции базы данных P.I.D.R.

## Порядок применения миграций

### 1. Начальная схема (0001_pidr_init.sql)
Создает основные таблицы проекта:
- `_pidr_users` - пользователи
- `_pidr_rooms` - игровые комнаты
- `_pidr_room_players` - игроки в комнатах
- `_pidr_transactions` - транзакции монет
- NFT таблицы
- Криптовалютные таблицы
- Реферальная система
- История игр и достижения

**Применение:**
```bash
# Через Supabase Dashboard
1. Откройте Supabase Dashboard → SQL Editor
2. Скопируйте содержимое файла 0001_pidr_init.sql
3. Выполните SQL

# Или через Supabase CLI
supabase db push
```

### 2. Обновление системы авторизации (0002_auth_system_update_fixed.sql) ⚠️ ИСПОЛЬЗУЙТЕ ИСПРАВЛЕННУЮ ВЕРСИЮ
Добавляет поддержку множественных методов авторизации:
- Добавляет поля `email`, `phone`, `password_hash`
- Добавляет поля `vk_id`, `google_id` для OAuth
- Добавляет поле `auth_method` (telegram, vk, google, local)
- Создает индексы для быстрого поиска
- **Включает RLS (Row Level Security) для всех таблиц**
- Создает политики доступа для безопасности данных

**Применение:**
```bash
# Через Supabase Dashboard (РЕКОМЕНДУЕТСЯ)
1. Откройте Supabase Dashboard → SQL Editor
2. Скопируйте содержимое файла 0002_auth_system_update_fixed.sql
3. Выполните SQL

# Или через Supabase CLI
supabase db push
```

⚠️ **ВАЖНО:** Используйте `0002_auth_system_update_fixed.sql`, а не `0002_auth_system_update.sql`!

**Если получили ошибку:** Смотрите `FIX_MIGRATION_ERROR.md` для инструкций по исправлению.

## Важные замечания

### RLS (Row Level Security)
После применения миграции `0002_auth_system_update.sql`:
- ✅ Все таблицы защищены RLS политиками
- ✅ Пользователи могут читать только свои данные
- ✅ Service role имеет полный доступ (для API)
- ✅ Публичные данные (комнаты, маркетплейс) доступны всем

### Проверка применения миграций

```sql
-- Проверить, что поля добавлены
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = '_pidr_users' 
  AND column_name IN ('email', 'phone', 'auth_method', 'vk_id', 'google_id');

-- Проверить, что RLS включен
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename LIKE '_pidr_%';

-- Проверить политики
SELECT tablename, policyname, cmd 
FROM pg_policies 
WHERE schemaname = 'public';
```

## Откат миграций

Если нужно откатить изменения:

```sql
-- Откат 0002_auth_system_update.sql
ALTER TABLE public._pidr_users 
DROP COLUMN IF EXISTS email,
DROP COLUMN IF EXISTS phone,
DROP COLUMN IF EXISTS password_hash,
DROP COLUMN IF EXISTS auth_method,
DROP COLUMN IF EXISTS vk_id,
DROP COLUMN IF EXISTS google_id,
DROP COLUMN IF EXISTS email_verified,
DROP COLUMN IF EXISTS phone_verified,
DROP COLUMN IF EXISTS is_active,
DROP COLUMN IF EXISTS last_login_at,
DROP COLUMN IF EXISTS login_count;

-- Отключить RLS (НЕ РЕКОМЕНДУЕТСЯ в production)
ALTER TABLE public._pidr_users DISABLE ROW LEVEL SECURITY;
-- ... повторить для всех таблиц
```

## Поддержка

Если возникли проблемы с миграциями:
1. Проверьте логи Supabase Dashboard → Database → Logs
2. Убедитесь, что `SUPABASE_SERVICE_ROLE_KEY` настроен в переменных окружения
3. Проверьте, что у service role есть права на выполнение DDL операций

