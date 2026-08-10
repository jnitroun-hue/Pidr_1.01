-- Надёжная история бонусов и атомарное начисление монет.
CREATE TABLE IF NOT EXISTS _pidr_bonus_claims (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES _pidr_users(id) ON DELETE CASCADE,
  bonus_key VARCHAR(100) NOT NULL,
  bonus_type VARCHAR(50) NOT NULL,
  provider VARCHAR(30),
  external_subject VARCHAR(255),
  amount INTEGER NOT NULL CHECK (amount > 0),
  verification_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  claimed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, bonus_key)
);

CREATE INDEX IF NOT EXISTS idx_pidr_bonus_claims_user
  ON _pidr_bonus_claims (user_id, claimed_at DESC);

ALTER TABLE _pidr_bonus_claims ENABLE ROW LEVEL SECURITY;

-- Перенос уже выданных социальных бонусов, чтобы их нельзя было получить повторно.
INSERT INTO _pidr_bonus_claims
  (user_id, bonus_key, bonus_type, provider, amount, claimed_at, verification_data)
SELECT DISTINCT ON (user_id, description)
  user_id,
  CASE
    WHEN description = 'Бонус за подписку в Telegram' THEN 'telegram_subscribe'
    WHEN description = 'Бонус за подписку в ВК' THEN 'vk_subscribe'
  END,
  CASE
    WHEN description = 'Бонус за подписку в Telegram' THEN 'telegram_subscribe'
    WHEN description = 'Бонус за подписку в ВК' THEN 'vk_subscribe'
  END,
  CASE
    WHEN description = 'Бонус за подписку в Telegram' THEN 'telegram'
    ELSE 'vk'
  END,
  amount,
  created_at,
  '{"migrated":true}'::jsonb
FROM _pidr_coin_transactions
WHERE transaction_type = 'bonus'
  AND description IN ('Бонус за подписку в Telegram', 'Бонус за подписку в ВК')
ORDER BY user_id, description, created_at
ON CONFLICT (user_id, bonus_key) DO NOTHING;

-- Перенос ежедневных бонусов по UTC-дате.
INSERT INTO _pidr_bonus_claims
  (user_id, bonus_key, bonus_type, amount, claimed_at, verification_data)
SELECT DISTINCT ON (user_id, (created_at AT TIME ZONE 'UTC')::date)
  user_id,
  'daily:' || TO_CHAR(created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD'),
  'daily',
  amount,
  created_at,
  '{"migrated":true}'::jsonb
FROM _pidr_coin_transactions
WHERE transaction_type = 'bonus'
  AND description LIKE 'Ежедневный бонус%'
ORDER BY user_id, (created_at AT TIME ZONE 'UTC')::date, created_at
ON CONFLICT (user_id, bonus_key) DO NOTHING;

CREATE OR REPLACE FUNCTION claim_pidr_bonus(
  p_user_id BIGINT,
  p_bonus_key TEXT,
  p_bonus_type TEXT,
  p_amount INTEGER,
  p_description TEXT,
  p_provider TEXT DEFAULT NULL,
  p_external_subject TEXT DEFAULT NULL,
  p_verification_data JSONB DEFAULT '{}'::jsonb
)
RETURNS TABLE(new_balance INTEGER, claim_id BIGINT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_before INTEGER;
  v_after INTEGER;
  v_claim_id BIGINT;
BEGIN
  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'bonus amount must be positive';
  END IF;

  SELECT coins
    INTO v_before
    FROM _pidr_users
   WHERE id = p_user_id
   FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'user not found';
  END IF;

  INSERT INTO _pidr_bonus_claims (
    user_id,
    bonus_key,
    bonus_type,
    provider,
    external_subject,
    amount,
    verification_data
  ) VALUES (
    p_user_id,
    p_bonus_key,
    p_bonus_type,
    p_provider,
    p_external_subject,
    p_amount,
    COALESCE(p_verification_data, '{}'::jsonb)
  )
  RETURNING id INTO v_claim_id;

  v_after := COALESCE(v_before, 0) + p_amount;

  UPDATE _pidr_users
     SET coins = v_after,
         updated_at = NOW()
   WHERE id = p_user_id;

  INSERT INTO _pidr_coin_transactions (
    user_id,
    transaction_type,
    amount,
    description,
    balance_before,
    balance_after,
    created_at
  ) VALUES (
    p_user_id,
    'bonus',
    p_amount,
    p_description,
    COALESCE(v_before, 0),
    v_after,
    NOW()
  );

  RETURN QUERY SELECT v_after, v_claim_id;
END;
$$;

REVOKE ALL ON FUNCTION claim_pidr_bonus(BIGINT, TEXT, TEXT, INTEGER, TEXT, TEXT, TEXT, JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION claim_pidr_bonus(BIGINT, TEXT, TEXT, INTEGER, TEXT, TEXT, TEXT, JSONB) TO service_role;
