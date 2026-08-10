-- Приватные реквизиты продавца. Публичный /api/marketplace/list эти поля не возвращает.
ALTER TABLE _pidr_nft_marketplace
  ADD COLUMN IF NOT EXISTS seller_wallet_address TEXT,
  ADD COLUMN IF NOT EXISTS seller_wallet_network VARCHAR(16),
  ADD COLUMN IF NOT EXISTS seller_fiat_phone VARCHAR(32),
  ADD COLUMN IF NOT EXISTS seller_fiat_qr_url TEXT,
  ADD COLUMN IF NOT EXISTS fiat_payment_method VARCHAR(32),
  ADD COLUMN IF NOT EXISTS price_rub NUMERIC(18, 2);

ALTER TABLE _pidr_nft_marketplace
  DROP CONSTRAINT IF EXISTS marketplace_wallet_network_check;

ALTER TABLE _pidr_nft_marketplace
  ADD CONSTRAINT marketplace_wallet_network_check
  CHECK (seller_wallet_network IS NULL OR seller_wallet_network IN ('TON', 'SOL'));

CREATE INDEX IF NOT EXISTS idx_pidr_marketplace_active_created
  ON _pidr_nft_marketplace (status, created_at DESC);
