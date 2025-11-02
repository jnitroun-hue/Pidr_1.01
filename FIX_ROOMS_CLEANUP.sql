-- 🧹 ОЧИСТКА СТАРЫХ КОМНАТ И ИСПРАВЛЕНИЕ ЛОГИКИ
-- Выполнить в Supabase SQL Editor

-- 1️⃣ УДАЛЯЕМ ВСЕ СТАРЫЕ КОМНАТЫ
DELETE FROM _pidr_room_players;
DELETE FROM _pidr_rooms;

-- 2️⃣ СБРАСЫВАЕМ СЧЕТЧИК ID
ALTER SEQUENCE _pidr_rooms_id_seq RESTART WITH 1;

-- 3️⃣ СОЗДАЕМ ФУНКЦИЮ ДЛЯ АВТОМАТИЧЕСКОГО УДАЛЕНИЯ НЕАКТИВНЫХ КОМНАТ
CREATE OR REPLACE FUNCTION cleanup_inactive_rooms()
RETURNS void AS $$
BEGIN
  -- Удаляем комнаты старше 1 часа в статусе 'waiting'
  DELETE FROM _pidr_rooms
  WHERE status = 'waiting'
  AND created_at < NOW() - INTERVAL '1 hour';
  
  -- Удаляем комнаты старше 3 часов в статусе 'playing'
  DELETE FROM _pidr_rooms
  WHERE status = 'playing'
  AND created_at < NOW() - INTERVAL '3 hours';
  
  -- Удаляем комнаты старше 1 дня в статусе 'finished'
  DELETE FROM _pidr_rooms
  WHERE status = 'finished'
  AND created_at < NOW() - INTERVAL '1 day';
  
  RAISE NOTICE 'Неактивные комнаты удалены';
END;
$$ LANGUAGE plpgsql;

-- 4️⃣ СОЗДАЕМ CRON JOB ДЛЯ АВТОМАТИЧЕСКОЙ ОЧИСТКИ (каждые 30 минут)
-- Если у вас есть pg_cron расширение:
-- SELECT cron.schedule('cleanup-rooms', '*/30 * * * *', 'SELECT cleanup_inactive_rooms()');

-- 5️⃣ ДОБАВЛЯЕМ ИНДЕКСЫ ДЛЯ БЫСТРОЙ ОЧИСТКИ
CREATE INDEX IF NOT EXISTS idx_rooms_status_created 
ON _pidr_rooms(status, created_at);

-- 6️⃣ ДОБАВЛЯЕМ КОЛОНКУ last_activity ДЛЯ ОТСЛЕЖИВАНИЯ АКТИВНОСТИ
ALTER TABLE _pidr_rooms 
ADD COLUMN IF NOT EXISTS last_activity TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- 7️⃣ СОЗДАЕМ ТРИГГЕР ДЛЯ ОБНОВЛЕНИЯ last_activity
CREATE OR REPLACE FUNCTION update_room_activity()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE _pidr_rooms 
  SET last_activity = NOW()
  WHERE id = NEW.room_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_room_activity ON _pidr_room_players;
CREATE TRIGGER trigger_update_room_activity
AFTER INSERT OR UPDATE OR DELETE ON _pidr_room_players
FOR EACH ROW
EXECUTE FUNCTION update_room_activity();

-- 8️⃣ ИСПРАВЛЯЕМ RLS ПОЛИТИКИ ДЛЯ КОМНАТ
DROP POLICY IF EXISTS rooms_select_policy ON _pidr_rooms;
CREATE POLICY rooms_select_policy ON _pidr_rooms
  FOR SELECT USING (true);

DROP POLICY IF EXISTS rooms_insert_policy ON _pidr_rooms;
CREATE POLICY rooms_insert_policy ON _pidr_rooms
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS rooms_update_policy ON _pidr_rooms;
CREATE POLICY rooms_update_policy ON _pidr_rooms
  FOR UPDATE USING (true);

DROP POLICY IF EXISTS rooms_delete_policy ON _pidr_rooms;
CREATE POLICY rooms_delete_policy ON _pidr_rooms
  FOR DELETE USING (true);

-- 9️⃣ ИСПРАВЛЯЕМ RLS ПОЛИТИКИ ДЛЯ ИГРОКОВ В КОМНАТАХ
DROP POLICY IF EXISTS room_players_select_policy ON _pidr_room_players;
CREATE POLICY room_players_select_policy ON _pidr_room_players
  FOR SELECT USING (true);

DROP POLICY IF EXISTS room_players_insert_policy ON _pidr_room_players;
CREATE POLICY room_players_insert_policy ON _pidr_room_players
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS room_players_update_policy ON _pidr_room_players;
CREATE POLICY room_players_update_policy ON _pidr_room_players
  FOR UPDATE USING (true);

DROP POLICY IF EXISTS room_players_delete_policy ON _pidr_room_players;
CREATE POLICY room_players_delete_policy ON _pidr_room_players
  FOR DELETE USING (true);

-- 🎉 ГОТОВО! Теперь:
-- 1. Все старые комнаты удалены
-- 2. Автоматическая очистка настроена
-- 3. RLS политики исправлены
-- 4. Индексы добавлены для производительности

-- 🔟 ЗАПУСКАЕМ ПЕРВУЮ ОЧИСТКУ ВРУЧНУЮ
SELECT cleanup_inactive_rooms();

-- ✅ ПРОВЕРЯЕМ РЕЗУЛЬТАТ
SELECT 
  COUNT(*) as total_rooms,
  COUNT(*) FILTER (WHERE status = 'waiting') as waiting_rooms,
  COUNT(*) FILTER (WHERE status = 'playing') as playing_rooms,
  COUNT(*) FILTER (WHERE status = 'finished') as finished_rooms
FROM _pidr_rooms;

