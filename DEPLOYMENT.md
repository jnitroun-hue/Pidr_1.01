# 🚀 Deployment Guide - P.I.D.R. Game

## Быстрый деплой на Vercel (рекомендуется)

### 1. Подготовка
```bash
# Клонируйте репозиторий
git clone https://github.com/jnitroun-hue/Pidr_1.01.git
cd Pidr_1.01

# Установите зависимости
npm install
```

### 2. Настройка переменных окружения
Создайте файл `.env.local` со следующими переменными:

```env
# Database
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_supabase_anon_key

# JWT
JWT_SECRET=your_super_secret_jwt_key
SESSION_SECRET=your_session_secret

# Telegram Bot
BOT_TOKEN=your_telegram_bot_token
BOT_USERNAME=your_bot_username
APP_URL=https://your-vercel-app.vercel.app

# Crypto APIs
TON_API_KEY=your_ton_api_key
ETHERSCAN_API_KEY=your_etherscan_key
TRON_GRID_API=your_tron_api_key

# Master Wallets
MASTER_TON_WALLET=your_ton_address
MASTER_ETH_WALLET=your_eth_address
MASTER_SOL_WALLET=your_sol_address

# Rate Limiting
UPSTASH_REDIS_REST_URL=your_upstash_url
UPSTASH_REDIS_REST_TOKEN=your_upstash_token
```

### 3. Деплой на Vercel
```bash
# Установите Vercel CLI
npm i -g vercel

# Деплой
vercel --prod

# Или через GitHub интеграцию:
# 1. Подключите репозиторий к Vercel
# 2. Добавьте переменные окружения в панели Vercel
# 3. Деплой произойдет автоматически
```

## Настройка базы данных (Supabase)

### 1. Создание проекта
1. Зайдите на [supabase.com](https://supabase.com)
2. Создайте новый проект
3. Скопируйте URL и anon key

### 2. Настройка таблиц
Выполните SQL скрипты из папки `src/lib/database/`:
- `pidr-schema.sql` - основные таблицы игры
- `hd-wallets-schema.sql` - таблицы для кошельков
- `transactions-schema.sql` - таблицы транзакций

### 3. Настройка RLS (Row Level Security)
```sql
-- Включите RLS для всех таблиц
ALTER TABLE _pidr_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE _pidr_games ENABLE ROW LEVEL SECURITY;
-- ... для всех остальных таблиц
```

## Настройка Telegram бота

### 1. Создание бота
1. Напишите @BotFather в Telegram
2. Создайте нового бота: `/newbot`
3. Получите токен бота

### 2. Настройка WebApp
```bash
# Установите URL WebApp
/setmenubutton
# Выберите вашего бота
# Введите URL: https://your-app.vercel.app

# Настройте команды
/setcommands
start - Начать игру
help - Помощь
wallet - Кошелек
```

## Настройка криптокошельков

### 1. TON
- Получите API ключ на [toncenter.com](https://toncenter.com)
- Создайте master кошелек для приема платежей

### 2. Ethereum
- Получите API ключ на [etherscan.io](https://etherscan.io)
- Создайте master кошелек

### 3. Solana
- Используйте публичные RPC или получите ключ
- Создайте master кошелек

## Мониторинг платежей

### Настройка webhook'ов
```javascript
// Пример настройки webhook для TON
const webhook = {
  url: 'https://your-app.vercel.app/api/wallet/webhook',
  secret: process.env.WEBHOOK_SECRET
}
```

## Безопасность

### 1. Переменные окружения
- Никогда не коммитьте `.env` файлы
- Используйте сильные пароли для JWT_SECRET
- Храните приватные ключи в безопасности

### 2. Rate Limiting
- Настройте Upstash Redis для rate limiting
- Ограничьте количество запросов на пользователя

### 3. HTTPS
- Обязательно используйте HTTPS в продакшене
- Настройте правильные CORS заголовки

## Мониторинг и логи

### 1. Vercel Analytics
```bash
npm install @vercel/analytics
```

### 2. Error Tracking
```bash
npm install @sentry/nextjs
```

### 3. Логирование
- Все транзакции логируются в базу данных
- Используйте Vercel Functions для мониторинга

## Масштабирование

### 1. Database
- Используйте индексы для часто запрашиваемых полей
- Настройте connection pooling

### 2. Redis
- Кешируйте часто используемые данные
- Используйте Redis для сессий

### 3. CDN
- Статические ресурсы через Vercel CDN
- Оптимизируйте изображения

## Troubleshooting

### Частые проблемы:
1. **Build errors** - проверьте TypeScript ошибки
2. **Database connection** - проверьте Supabase credentials
3. **Telegram webhook** - проверьте HTTPS и сертификаты
4. **Wallet connections** - проверьте API ключи

### Полезные команды:
```bash
# Проверка сборки
npm run build

# Локальный запуск
npm run dev

# Проверка типов
npx tsc --noEmit

# Тесты
npm test
```

## Поддержка

Если возникли проблемы:
1. Проверьте логи в Vercel Dashboard
2. Проверьте Supabase логи
3. Создайте issue в GitHub репозитории

---

**Успешного деплоя! 🚀**
