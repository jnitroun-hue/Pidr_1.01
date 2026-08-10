-- Тема главного меню на пользователя (бесплатные + Premium-варианты).
ALTER TABLE _pidr_users
  ADD COLUMN IF NOT EXISTS menu_theme VARCHAR(40) DEFAULT 'slate';

CREATE INDEX IF NOT EXISTS idx_pidr_users_menu_theme
  ON _pidr_users (menu_theme);

COMMENT ON COLUMN _pidr_users.menu_theme IS
  'Ключ темы главного меню (slate, midnight, forest, gold, aurora, cyber, ember, ocean, …)';
