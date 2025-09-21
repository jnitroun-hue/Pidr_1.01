# 🔐 ПОЛНЫЙ СПИСОК ПЕРЕМЕННЫХ ОКРУЖЕНИЯ

## 📋 ОБЯЗАТЕЛЬНЫЕ ПЕРЕМЕННЫЕ

### JWT и Сессии
```env
JWT_SECRET=your_jwt_secret_key_32_chars_min
SESSION_SECRET=your_session_secret_key_32_chars_min
```

### Supabase База Данных
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Redis (Upstash)
```env
UPSTASH_REDIS_REST_URL=https://your-redis.upstash.io
UPSTASH_REDIS_REST_TOKEN=your_redis_token
```

### Криптокошельки Мастер Адреса
```env
BTC_MASTER_ADDRESS=1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa
ETH_MASTER_ADDRESS=0xAb5801a7D398351b8bE11C439e05C5B3259aeC9B
TON_MASTER_ADDRESS=EQCD39VS5jcptHL8vMjEXrzGaRcApWG5Hq6CZT6I5htQueue
SOL_MASTER_ADDRESS=Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB
USDT_MASTER_ADDRESS=TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t
```

### Прокси Адреса
```env
PROXY_ADDRESS_SECRET=your_proxy_secret_key_for_address_generation
```

### API Ключи для Крипто
```env
TON_API_KEY=your_ton_api_key
ETHERSCAN_API_KEY=your_etherscan_api_key
TRON_GRID_API=your_tron_grid_api_key
SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
```

### Webhook Секреты
```env
WEBHOOK_SECRET=your_webhook_secret_for_crypto_payments
TELEGRAM_BOT_TOKEN=your_telegram_bot_token
```

### Общие Настройки
```env
NODE_ENV=production
NEXTAUTH_URL=https://your-domain.vercel.app
NEXTAUTH_SECRET=your_nextauth_secret_key
```

---

## 🚀 VERCEL DEPLOYMENT

### Установка через Vercel CLI:
```bash
vercel env add JWT_SECRET
vercel env add SESSION_SECRET
vercel env add NEXT_PUBLIC_SUPABASE_URL
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY
vercel env add SUPABASE_SERVICE_ROLE_KEY
vercel env add UPSTASH_REDIS_REST_URL
vercel env add UPSTASH_REDIS_REST_TOKEN
vercel env add PROXY_ADDRESS_SECRET
vercel env add BTC_MASTER_ADDRESS
vercel env add ETH_MASTER_ADDRESS
vercel env add TON_MASTER_ADDRESS
vercel env add SOL_MASTER_ADDRESS
vercel env add USDT_MASTER_ADDRESS
```

### Или через Vercel Dashboard:
1. Зайти в проект на vercel.com
2. Settings → Environment Variables
3. Добавить каждую переменную

---

## 🔧 RAILWAY DEPLOYMENT

### Railway Environment Variables:
```bash
railway variables set JWT_SECRET=your_jwt_secret
railway variables set SESSION_SECRET=your_session_secret
railway variables set NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
railway variables set NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
railway variables set SUPABASE_SERVICE_ROLE_KEY=your_service_key
railway variables set UPSTASH_REDIS_REST_URL=https://your-redis.upstash.io
railway variables set UPSTASH_REDIS_REST_TOKEN=your_redis_token
railway variables set PROXY_ADDRESS_SECRET=your_proxy_secret
railway variables set BTC_MASTER_ADDRESS=your_btc_address
railway variables set ETH_MASTER_ADDRESS=your_eth_address
railway variables set TON_MASTER_ADDRESS=your_ton_address
railway variables set SOL_MASTER_ADDRESS=your_sol_address
railway variables set USDT_MASTER_ADDRESS=your_usdt_address
```

---

## 🎯 TELEGRAM BOT SETUP

### BotFather Commands:
```
/newbot
/setdomain - your-domain.vercel.app
/setjoingroups - Disable
/setprivacy - Disable
```

### Webhook URL:
```
https://api.telegram.org/bot<YOUR_BOT_TOKEN>/setWebhook?url=https://your-domain.vercel.app/api/webhook/telegram
```

---

## 🔑 ГЕНЕРАЦИЯ СЕКРЕТНЫХ КЛЮЧЕЙ

### JWT и Session Secrets:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Proxy Address Secret:
```bash
node -e "console.log('PIDR_' + require('crypto').randomBytes(16).toString('hex'))"
```

### NextAuth Secret:
```bash
openssl rand -base64 32
```

---

## ⚠️ ВАЖНЫЕ ЗАМЕЧАНИЯ

1. **JWT_SECRET** - минимум 32 символа
2. **SESSION_SECRET** - минимум 32 символа  
3. **SUPABASE_SERVICE_ROLE_KEY** - СЕКРЕТНЫЙ ключ, НЕ публичный
4. **Redis** - обязателен для rate limiting
5. **Мастер адреса** - ваши реальные кошельки для приема платежей
6. **NODE_ENV=production** - обязательно на продакшене

---

## 🔍 ПРОВЕРКА ПЕРЕМЕННЫХ

### Локально:
```bash
node -e "console.log(process.env.JWT_SECRET ? '✅ JWT_SECRET' : '❌ JWT_SECRET')"
```

### В коде (для отладки):
```javascript
console.log('ENV CHECK:', {
  JWT_SECRET: !!process.env.JWT_SECRET,
  SESSION_SECRET: !!process.env.SESSION_SECRET,
  SUPABASE_URL: !!process.env.SUPABASE_URL,
  REDIS_URL: !!process.env.UPSTASH_REDIS_REST_URL
});
```
