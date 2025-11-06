-- ============================================
-- 🔧 ИСПРАВЛЕНИЕ RLS ПОЛИТИК ДЛЯ _pidr_user_nft_deck
-- ============================================

-- Удаляем старые политики
DROP POLICY IF EXISTS "Users can read their own deck" ON _pidr_user_nft_deck;
DROP POLICY IF EXISTS "Users can add to their deck" ON _pidr_user_nft_deck;
DROP POLICY IF EXISTS "Users can delete from their deck" ON _pidr_user_nft_deck;
DROP POLICY IF EXISTS "Service role has full access to deck" ON _pidr_user_nft_deck;

-- ============================================
-- ✅ НОВЫЕ ПОЛИТИКИ (БЕЗ JWT - ИСПОЛЬЗУЕМ SERVICE ROLE)
-- ============================================

-- Все могут читать (для простоты)
CREATE POLICY "Public can read deck" ON _pidr_user_nft_deck
  FOR SELECT USING (true);

-- Все могут добавлять (проверка владения на уровне API)
CREATE POLICY "Public can add to deck" ON _pidr_user_nft_deck
  FOR INSERT WITH CHECK (true);

-- Все могут удалять (проверка владения на уровне API)
CREATE POLICY "Public can delete from deck" ON _pidr_user_nft_deck
  FOR DELETE USING (true);

-- Service role имеет полный доступ
CREATE POLICY "Service role has full access to deck" ON _pidr_user_nft_deck
  FOR ALL USING (
    current_setting('request.jwt.claims', true)::json->>'role' = 'service_role'
  );

-- ============================================
-- ✅ ПРОВЕРКА
-- ============================================

SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = '_pidr_user_nft_deck'
ORDER BY policyname;

-- ============================================
-- ✅ ГОТОВО!
-- ============================================

