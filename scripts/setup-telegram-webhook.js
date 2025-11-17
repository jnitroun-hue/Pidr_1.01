#!/usr/bin/env node

/**
 * 🔧 Скрипт для настройки Telegram Webhook
 * 
 * Использование:
 *   node scripts/setup-telegram-webhook.js
 * 
 * Требует переменные окружения:
 *   - TELEGRAM_BOT_TOKEN
 *   - NEXT_PUBLIC_APP_URL (или передать через --url)
 *   - WEBHOOK_SECRET_TOKEN (опционально)
 */

require('dotenv').config({ path: '.env.local' });

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || process.argv.find(arg => arg.startsWith('--url='))?.split('=')[1];
const SECRET_TOKEN = process.env.WEBHOOK_SECRET_TOKEN;

if (!BOT_TOKEN) {
  console.error('❌ Ошибка: TELEGRAM_BOT_TOKEN не установлен');
  console.log('💡 Добавьте TELEGRAM_BOT_TOKEN в .env.local или переменные окружения');
  process.exit(1);
}

if (!APP_URL) {
  console.error('❌ Ошибка: NEXT_PUBLIC_APP_URL не установлен');
  console.log('💡 Добавьте NEXT_PUBLIC_APP_URL в .env.local или передайте через --url=https://your-app.com');
  process.exit(1);
}

const WEBHOOK_URL = `${APP_URL}/api/telegram/webhook`;

async function setupWebhook() {
  console.log('🔧 Настройка Telegram Webhook...\n');
  console.log(`📋 Параметры:`);
  console.log(`   Bot Token: ${BOT_TOKEN.substring(0, 10)}...`);
  console.log(`   Webhook URL: ${WEBHOOK_URL}`);
  if (SECRET_TOKEN) {
    console.log(`   Secret Token: ${SECRET_TOKEN.substring(0, 10)}...`);
  }
  console.log('');

  try {
    // Проверяем информацию о боте
    console.log('1️⃣ Проверка бота...');
    const botInfoResponse = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/getMe`);
    const botInfo = await botInfoResponse.json();
    
    if (!botInfo.ok) {
      console.error('❌ Ошибка: Неверный токен бота');
      process.exit(1);
    }
    
    console.log(`   ✅ Бот: @${botInfo.result.username} (${botInfo.result.first_name})`);

    // Устанавливаем webhook
    console.log('\n2️⃣ Установка webhook...');
    const webhookData = {
      url: WEBHOOK_URL
    };
    
    if (SECRET_TOKEN) {
      webhookData.secret_token = SECRET_TOKEN;
    }
    
    const setWebhookResponse = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/setWebhook`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(webhookData)
    });
    
    const setWebhookResult = await setWebhookResponse.json();
    
    if (!setWebhookResult.ok) {
      console.error('❌ Ошибка установки webhook:', setWebhookResult.description);
      process.exit(1);
    }
    
    console.log('   ✅ Webhook установлен успешно');

    // Проверяем информацию о webhook
    console.log('\n3️⃣ Проверка webhook...');
    const webhookInfoResponse = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/getWebhookInfo`);
    const webhookInfo = await webhookInfoResponse.json();
    
    if (webhookInfo.ok) {
      const info = webhookInfo.result;
      console.log(`   URL: ${info.url}`);
      console.log(`   Ожидающих обновлений: ${info.pending_update_count || 0}`);
      if (info.last_error_date) {
        console.log(`   ⚠️ Последняя ошибка: ${info.last_error_message} (${new Date(info.last_error_date * 1000).toLocaleString()})`);
      }
    }

    console.log('\n✅ Webhook настроен успешно!');
    console.log('\n📝 Следующие шаги:');
    console.log('   1. Откройте вашего бота в Telegram');
    console.log('   2. Отправьте команду /start');
    console.log('   3. Проверьте, что бот отвечает');
    
  } catch (error) {
    console.error('❌ Ошибка:', error.message);
    process.exit(1);
  }
}

// Удаление webhook (для тестирования)
async function deleteWebhook() {
  console.log('🗑️ Удаление webhook...');
  
  const response = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/deleteWebhook`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ drop_pending_updates: true })
  });
  
  const result = await response.json();
  
  if (result.ok) {
    console.log('✅ Webhook удален');
  } else {
    console.error('❌ Ошибка:', result.description);
  }
}

// Главная функция
const command = process.argv[2];

if (command === 'delete') {
  deleteWebhook();
} else {
  setupWebhook();
}

