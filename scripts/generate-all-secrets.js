const crypto = require('crypto');
const fs = require('fs');

// Генератор случайных строк разных форматов
const b64url = (n) => crypto.randomBytes(n).toString('base64url');
const hex = (n) => crypto.randomBytes(n).toString('hex');
const base64 = (n) => crypto.randomBytes(n).toString('base64');

// Генератор фейковых токенов в формате провайдеров
const fakeSupabaseKey = () => `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.${b64url(128)}.${b64url(32)}`;
const fakeTelegramToken = () => `${Math.floor(1000000000 + Math.random() * 9000000000)}:${b64url(27)}`;
const fakeUpstashUrl = () => `https://${hex(8)}-${hex(4)}.upstash.io`;
const fakeApiKey = (prefix = '') => prefix + hex(32);
const fakeUUID = () => crypto.randomUUID();

// Генерация всех секретов
const secrets = {
  // === ВНУТРЕННИЕ СЕКРЕТЫ (реальные криптостойкие) ===
  SUPABASE_JWT_SECRET: b64url(48),
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

  // === SUPABASE ===
  NEXT_PUBLIC_SUPABASE_URL: 'https://your-project.supabase.co',
  SUPABASE_URL: 'https://your-project.supabase.co',
  NEXT_PUBLIC_SUPABASE_ANON_KEY: fakeSupabaseKey(),
  SUPABASE_ANON_KEY: fakeSupabaseKey(),
  SUPABASE_SERVICE_ROLE_KEY: fakeSupabaseKey(),

  // === TELEGRAM ===
  TELEGRAM_BOT_TOKEN: fakeTelegramToken(),
  BOT_TOKEN: fakeTelegramToken(),
  BOT_USERNAME: 'your_bot_username',
  NEXT_PUBLIC_TELEGRAM_BOT_USERNAME: 'your_bot_username',
  NEXT_PUBLIC_TELEGRAM_CHANNEL_LINK: 'https://t.me/your_channel',
  NEXT_PUBLIC_VK_GROUP_LINK: 'https://vk.com/your_group',

  // === APP URLs ===
  NEXT_PUBLIC_APP_URL: 'https://your-app.vercel.app',
  APP_URL: 'https://your-app.vercel.app',
  BASE_URL: 'https://your-app.vercel.app',
  NEXTAUTH_URL: 'https://your-app.vercel.app',
  NEXT_PUBLIC_API_URL: 'https://your-app.vercel.app',
  NEXT_PUBLIC_WS_URL: 'wss://your-app.vercel.app',

  // === UPSTASH REDIS ===
  UPSTASH_REDIS_REST_URL: fakeUpstashUrl(),
  UPSTASH_REDIS_REST_TOKEN: b64url(32),

  // === TON ===
  TONCENTER_API_KEY: fakeApiKey(),
  TON_CENTER_API: fakeApiKey(),
  TONCENTER_API: fakeApiKey(),
  NEXT_PUBLIC_TONCENTER_API_KEY: fakeApiKey(),
  NEXT_PUBLIC_TON_API_KEY: fakeApiKey(),
  NEXT_PUBLIC_TON_API_URL: 'https://toncenter.com/api/v2',
  NEXT_PUBLIC_TON_MANIFEST_URL: 'https://your-app.vercel.app/tonconnect-manifest.json',
  NEXT_PUBLIC_NFT_COLLECTION_ADDRESS: 'EQBvW8Z5huBkMJYdnfAEM5JqTNkuWX3diqYENkWsIL0XggGG',
  TON_WALLET_MNEMONIC: Array.from({length: 24}, () => {
    const words = ['abandon','ability','able','about','above','absent','absorb','abstract','absurd','abuse'];
    return words[Math.floor(Math.random() * words.length)];
  }).join(' '),
  TON_API_KEY: fakeApiKey(),
  MASTER_TON_ADDRESS: 'EQBvW8Z5huBkMJYdnfAEM5JqTNkuWX3diqYENkWsIL0XggGG',
  TON_MASTER_ADDRESS: 'EQBvW8Z5huBkMJYdnfAEM5JqTNkuWX3diqYENkWsIL0XggGG',
  MASTER_TON_WALLET: 'EQBvW8Z5huBkMJYdnfAEM5JqTNkuWX3diqYENkWsIL0XggGG',
  TON_MASTER_XPUB: `xpub${base64(78).replace(/[+/=]/g, '')}`,

  // === COINPAYMENTS ===
  COINPAYMENTS_MERCHANT_ID: fakeUUID(),
  COINPAYMENTS_PUBLIC_KEY: fakeApiKey('cp_pub_'),
  COINPAYMENTS_PRIVATE_KEY: fakeApiKey('cp_priv_'),
  COINPAYMENTS_API_KEY: fakeApiKey('cp_'),
  COINPAYMENTS_API_SECRET: b64url(32),
  COINPAYMENTS_IPN_SECRET: b64url(32),

  // === NOWPAYMENTS ===
  NOWPAYMENTS_API_KEY: fakeApiKey('np_'),

  // === ETHERSCAN ===
  ETHERSCAN_API_KEY: fakeApiKey().toUpperCase(),

  // === TRON ===
  TRON_GRID_API: fakeApiKey('tron_'),
  TRON_API: fakeApiKey('tron_'),
  MASTER_TRON_WALLET: 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t',
  TRON_MASTER_XPUB: `xpub${base64(78).replace(/[+/=]/g, '')}`,

  // === SOLANA ===
  SOLANA_RPC_URL: 'https://api.mainnet-beta.solana.com',
  SOLANA_API: 'https://api.mainnet-beta.solana.com',
  SOLANA_WALLET_PRIVATE_KEY: base64(64),
  MASTER_SOL_ADDRESS: '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgHPv',
  MASTER_SOLANA_WALLET: '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgHPv',
  SOL_MASTER_XPUB: `xpub${base64(78).replace(/[+/=]/g, '')}`,

  // === BITCOIN ===
  BTC_XPUB: `xpub${base64(78).replace(/[+/=]/g, '')}`,
  BTC_MASTER_XPUB: `xpub${base64(78).replace(/[+/=]/g, '')}`,
  BTC_API: fakeApiKey('btc_'),
  BLOCKCHAIN_INFO_API: fakeApiKey('blockchain_'),
  MASTER_BTC_ADDRESS: '1BvBMSEYstWetqTFn5Au4m4GFg7xJaNVN2',
  MASTER_BTC_WALLET: '1BvBMSEYstWetqTFn5Au4m4GFg7xJaNVN2',

  // === ETHEREUM ===
  ETH_PRIVATE_KEY: '0x' + hex(32),
  ETH_RPC_URL: 'https://mainnet.infura.io/v3/' + hex(32),
  ETH_API: fakeApiKey('eth_'),
  MASTER_ETH_ADDRESS: '0x742d35Cc6639C0532fba96b9f8b1B8F4D3c8b3a1',
  MASTER_ETH_WALLET: '0x742d35Cc6639C0532fba96b9f8b1B8F4D3c8b3a1',
  ETH_MASTER_XPUB: `xpub${base64(78).replace(/[+/=]/g, '')}`,

  // === USDT (ERC20/TRC20) ===
  USDT_CONTRACT_ADDRESS: '0xdac17f958d2ee523a2206206994597c13d831ec7',
  MASTER_USDT_ADDRESS: 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t',

  // === NFT STORAGE (если используется) ===
  NFT_STORAGE_API_KEY: fakeApiKey('nft_'),

  // === PINATA (если используется) ===
  PINATA_API_KEY: fakeApiKey('pinata_'),
  PINATA_SECRET_API_KEY: fakeApiKey('pinata_secret_'),

  // === OPENAI (если используется для генерации) ===
  OPENAI_API_KEY: 'sk-' + b64url(48),

  // === VK OAUTH (если есть) ===
  VK_CLIENT_ID: Math.floor(10000000 + Math.random() * 90000000).toString(),
  NEXT_PUBLIC_VK_CLIENT_ID: Math.floor(10000000 + Math.random() * 90000000).toString(),
  VK_CLIENT_SECRET: b64url(32),

  // === GOOGLE OAUTH (если есть) ===
  GOOGLE_CLIENT_ID: `${Math.floor(100000000000 + Math.random() * 900000000000)}-${b64url(16)}.apps.googleusercontent.com`,
  NEXT_PUBLIC_GOOGLE_CLIENT_ID: `${Math.floor(100000000000 + Math.random() * 900000000000)}-${b64url(16)}.apps.googleusercontent.com`,
  GOOGLE_CLIENT_SECRET: 'GOCSPX-' + b64url(24),

  // === BLENDER (для 3D генерации) ===
  BLENDER_PATH: 'blender',

  // === DEBUG ===
  NEXT_PUBLIC_DEBUG: 'false',
  NODE_ENV: 'production',
};

// Формирование .env файла
const envContent = Object.entries(secrets)
  .map(([key, value]) => `${key}="${value}"`)
  .join('\n');

// Формирование Markdown файла
const mdContent = `# 🔐 Все сгенерированные секреты

## ⚠️ ВАЖНО
- **Этот файл содержит фейковые токены провайдеров** (Supabase, Telegram, Upstash и т.д.)
- **Замени их на реальные** из кабинетов сервисов перед деплоем
- **Внутренние секреты** (JWT, SESSION, CRON и т.д.) — реальные криптостойкие, можно использовать как есть
- **НЕ коммить этот файл** (уже в .gitignore)

---

## 📋 Копируй в Vercel → Environment Variables

\`\`\`env
${envContent}
\`\`\`

---

## 🔄 Что нужно заменить на реальные значения

### 1. Supabase
- \`SUPABASE_SERVICE_ROLE_KEY\` → Supabase Dashboard → Project Settings → API → service_role key

### 2. Telegram
- \`TELEGRAM_BOT_TOKEN\` → @BotFather → /newbot или /token

### 3. Upstash Redis
- \`UPSTASH_REDIS_REST_URL\` → Upstash Console → Database → REST API → URL
- \`UPSTASH_REDIS_REST_TOKEN\` → Upstash Console → Database → REST API → Token

### 4. TON
- \`TONCENTER_API_KEY\` → https://toncenter.com → получить API key
- \`TON_WALLET_MNEMONIC\` → реальная мнемоника из TON кошелька (24 слова)

### 5. CoinPayments
- \`COINPAYMENTS_*\` → https://www.coinpayments.net → Account Settings → API Keys

### 6. NOWPayments
- \`NOWPAYMENTS_API_KEY\` → https://nowpayments.io → Settings → API Keys

### 7. Etherscan
- \`ETHERSCAN_API_KEY\` → https://etherscan.io → My Account → API Keys

### 8. Tron
- \`TRON_GRID_API\` → https://www.trongrid.io → получить API key

### 9. Solana
- \`SOLANA_WALLET_PRIVATE_KEY\` → экспорт приватного ключа из Phantom/Solflare

### 10. Bitcoin
- \`BTC_XPUB\` → extended public key из HD кошелька

### 11. Ethereum
- \`ETH_PRIVATE_KEY\` → приватный ключ из MetaMask
- \`ETH_RPC_URL\` → Infura/Alchemy RPC endpoint

### 12. OpenAI (если используется)
- \`OPENAI_API_KEY\` → https://platform.openai.com → API Keys

### 13. VK OAuth (если используется)
- \`VK_CLIENT_ID\` / \`VK_CLIENT_SECRET\` → https://vk.com/apps?act=manage

### 14. Google OAuth (если используется)
- \`GOOGLE_CLIENT_ID\` / \`GOOGLE_CLIENT_SECRET\` → Google Cloud Console → APIs & Services → Credentials

---

## 🔄 Перегенерировать

\`\`\`bash
node scripts/generate-all-secrets.js
\`\`\`

---

**Сгенерировано:** ${new Date().toISOString()}
`;

// Запись файлов
fs.writeFileSync('.env.generated', envContent);
fs.writeFileSync('SECRETS.FULL.md', mdContent);

console.log('✅ Сгенерированы файлы:');
console.log('   - .env.generated (готовый .env файл)');
console.log('   - SECRETS.FULL.md (все токены с инструкциями)');
console.log('');
console.log('⚠️  ЗАМЕНИ фейковые токены провайдеров на реальные!');

