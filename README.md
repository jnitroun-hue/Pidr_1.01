# Pidr_1.01

🎮 **P.I.D.R. Game** - Многопользовательская карточная игра для Telegram WebApp с интеграцией Web3

## 🚀 Особенности

- **Telegram WebApp** - Нативная интеграция с Telegram
- **Многопользовательский режим** - Игра в реальном времени с друзьями
- **Web3 интеграция** - Поддержка TON, Solana, Ethereum кошельков
- **Криптоплатежи** - Встроенная система депозитов и выводов
- **HD кошельки** - Автоматическая генерация адресов для каждого пользователя
- **Real-time мониторинг** - Отслеживание транзакций в реальном времени

## 🛠 Технологический стек

### Frontend
- **Next.js 15** - React фреймворк
- **TypeScript** - Типизированный JavaScript
- **Chakra UI** - Компонентная библиотека
- **Framer Motion** - Анимации
- **Zustand** - Управление состоянием

### Backend
- **Next.js API Routes** - Серверная логика
- **Supabase** - База данных и аутентификация
- **Socket.IO** - WebSocket соединения
- **JWT** - Токены аутентификации

### Web3 & Криптовалюты
- **TON Connect** - TON кошелек
- **Solana Wallet Adapter** - Solana кошельки
- **Ethers.js** - Ethereum интеграция
- **HD Wallets** - Иерархические детерминированные кошельки

### Мониторинг платежей
- **TON API** (toncenter.com)
- **Etherscan API** - Ethereum транзакции
- **TRON Grid API** - TRON транзакции
- **Solana RPC** - Solana транзакции

## 📦 Установка

```bash
# Клонирование репозитория
git clone https://github.com/jnitroun-hue/Pidr_1.01.git
cd Pidr_1.01

# Установка зависимостей
npm install

# Настройка переменных окружения
cp .env.example .env.local
# Заполните необходимые переменные

# Запуск в режиме разработки
npm run dev

# Сборка для продакшена
npm run build
npm start
```

## 🔧 Переменные окружения

```env
# Database
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key

# JWT
JWT_SECRET=your_jwt_secret
SESSION_SECRET=your_session_secret

# Telegram Bot
BOT_TOKEN=your_bot_token
BOT_USERNAME=your_bot_username
APP_URL=your_app_url

# Crypto APIs
TON_API_KEY=your_ton_api_key
ETHERSCAN_API_KEY=your_etherscan_api_key
TRON_GRID_API=your_tron_grid_api

# Master Wallets (для приема платежей)
MASTER_TON_WALLET=your_master_ton_wallet
MASTER_ETH_WALLET=your_master_eth_wallet
MASTER_SOL_WALLET=your_master_sol_wallet
MASTER_TRON_WALLET=your_master_tron_wallet

# Rate Limiting
UPSTASH_REDIS_REST_URL=your_upstash_url
UPSTASH_REDIS_REST_TOKEN=your_upstash_token
```

## 🎮 Игровая механика

### Основные правила
- Карточная игра на 2-6 игроков
- Цель: избавиться от всех карт первым
- Специальные карты с уникальными эффектами
- Система очков и рейтинга

### Многопользовательский режим
- Создание приватных комнат
- Быстрый поиск игры
- Система приглашений через Telegram
- Real-time синхронизация

## 💰 Экономическая модель

### Криптокошелек
- Автоматическая генерация адресов для каждого пользователя
- Поддержка основных криптовалют (TON, ETH, SOL, USDT)
- Мгновенные депозиты и выводы
- Комиссии за транзакции

### Игровая валюта
- Внутриигровые токены
- Система ставок в играх
- Турниры с призовыми фондами
- NFT карты (планируется)

## 🏗 Архитектура

```
src/
├── app/                    # Next.js App Router
│   ├── api/               # API маршруты
│   ├── auth/              # Аутентификация
│   ├── game/              # Игровые страницы
│   └── wallet/            # Кошелек
├── components/            # React компоненты
├── lib/                   # Утилиты и сервисы
│   ├── auth/             # Аутентификация
│   ├── database/         # База данных
│   └── wallets/          # Криптокошельки
├── hooks/                # React хуки
├── store/                # Zustand стор
└── types/                # TypeScript типы
```

## 🚀 Деплой

### Vercel (рекомендуется)
```bash
# Установка Vercel CLI
npm i -g vercel

# Деплой
vercel --prod
```

### Railway
```bash
# Подключение к Railway
railway login
railway link
railway up
```

### Docker
```bash
# Сборка образа
docker build -t pidr-game .

# Запуск контейнера
docker run -p 3000:3000 pidr-game
```

## 🧪 Тестирование

```bash
# Запуск тестов
npm test

# Тесты в watch режиме
npm run test:watch

# Проверка типов
npx tsc --noEmit

# Линтинг
npm run lint
```

## 📱 Telegram WebApp

### Настройка бота
1. Создайте бота через @BotFather
2. Получите токен бота
3. Настройте WebApp URL
4. Добавьте команды и меню

### Интеграция
- Автоматическая аутентификация через Telegram
- Доступ к данным пользователя
- Haptic feedback
- Адаптивный интерфейс

## 🔐 Безопасность

- JWT токены для аутентификации
- Rate limiting для API
- Валидация всех входных данных
- Безопасное хранение приватных ключей
- HTTPS обязателен для продакшена

## 📊 Мониторинг

- Логирование всех транзакций
- Метрики производительности
- Отслеживание ошибок
- Аналитика игровых сессий

## 🤝 Вклад в проект

1. Fork репозитория
2. Создайте feature ветку
3. Внесите изменения
4. Добавьте тесты
5. Создайте Pull Request

## 📄 Лицензия

MIT License - см. файл [LICENSE](LICENSE)

## 📞 Поддержка

- Telegram: @your_support_bot
- Email: support@pidr-game.com
- Discord: [Сервер разработчиков](https://discord.gg/pidr-game)

---

**Разработано с ❤️ для Telegram сообщества**