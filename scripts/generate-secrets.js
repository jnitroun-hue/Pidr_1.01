/**
 * Generates cryptographically-strong INTERNAL secrets for local/server env vars.
 * Provider-issued keys (Supabase/Telegram/Upstash/etc) are NOT generated here.
 *
 * Output: SECRETS.generated.md (gitignored by default in this repo via *.md)
 */

const fs = require('fs');
const crypto = require('crypto');

function b64url(bytes) {
  return crypto.randomBytes(bytes).toString('base64url');
}

const secrets = {
  JWT_SECRET: b64url(48),
  SESSION_SECRET: b64url(48),
  CRON_SECRET: b64url(48),
  ADMIN_SECRET: b64url(48),

  WEBHOOK_SECRET_TOKEN: b64url(32),

  MEMO_SECRET: b64url(32),
  MASTER_WALLET_SECRET: b64url(48),
  MASTER_WALLET_SALT: b64url(32),
  WALLET_SEED_SECRET: b64url(48),
  PROXY_WALLET_SECRET: b64url(48),
  PROXY_ADDRESS_SECRET: b64url(48),
  HD_SALT: b64url(32),
};

const envLines = Object.entries(secrets).map(([k, v]) => `${k}=${v}`);

const md = [
  '# Сгенерированные секреты (локально)',
  '',
  '## Вставь в Vercel → Environment Variables',
  '',
  '```env',
  ...envLines,
  '```',
  '',
  '## НЕ генерируются тут (нужно взять в кабинетах сервисов)',
  '- SUPABASE_SERVICE_ROLE_KEY (Supabase → Project Settings → API)',
  '- TELEGRAM_BOT_TOKEN (BotFather)',
  '- UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN (Upstash)',
  '- TONCENTER_API_KEY / COINPAYMENTS_* / NOWPAYMENTS_API_KEY / ETHERSCAN_API_KEY / TRON_GRID_API (соответствующие сервисы)',
  '',
  '## Важно',
  '- Этот файл не коммить: в `.gitignore` уже есть `*.md`, так что он не запушится.',
  '- При необходимости можно перегенерировать: `node scripts/generate-secrets.js`.',
  '',
].join('\n');

fs.writeFileSync('SECRETS.generated.md', md, 'utf8');
console.log('✅ Wrote SECRETS.generated.md');


