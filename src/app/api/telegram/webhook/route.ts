import { NextRequest, NextResponse } from 'next/server';

/**
 * 🎮 Telegram Bot Webhook Handler
 * Обрабатывает команды от Telegram бота
 * 
 * POST /api/telegram/webhook
 * 
 * 📚 Документация: см. TELEGRAM_WEBHOOK_GUIDE.md
 * 
 * 🔒 Безопасность: Опционально можно добавить проверку secret_token
 * через заголовок x-telegram-bot-api-secret-token
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    
    // ✅ ОПЦИОНАЛЬНАЯ ПРОВЕРКА SECRET TOKEN (для безопасности)
    const secretToken = req.headers.get('x-telegram-bot-api-secret-token');
    if (process.env.WEBHOOK_SECRET_TOKEN && secretToken !== process.env.WEBHOOK_SECRET_TOKEN) {
      console.warn('⚠️ [Telegram Webhook] Неверный secret token');
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 403 });
    }
    
    // Проверяем, что это сообщение от Telegram
    if (!body.message) {
      // Обрабатываем другие типы обновлений (callback_query, edited_message и т.д.)
      if (body.callback_query) {
        console.log('📨 [Telegram Webhook] Получен callback_query:', body.callback_query);
        // TODO: Обработка нажатий на кнопки
      }
      return NextResponse.json({ ok: true }); // Игнорируем обновления без сообщений
    }

    const message = body.message;
    const chatId = message.chat.id;
    const text = message.text;
    const from = message.from;

    console.log('📨 [Telegram Webhook] Получено сообщение:', { 
      chatId, 
      text, 
      from: from ? { id: from.id, username: from.username, first_name: from.first_name } : null,
      messageId: message.message_id
    });

    // Обрабатываем команду /start
    if (text && text.startsWith('/start')) {
      const startParam = text.split(' ')[1]; // Параметр после /start
      
      let responseText = `🎮 Добро пожаловать в The Must!\n\n`;
      responseText += `Это карточная игра для Telegram WebApp.\n\n`;
      responseText += `📋 Основные команды:\n`;
      responseText += `• /start - Начать игру\n`;
      responseText += `• /help - Помощь\n\n`;
      responseText += `🎯 Как играть:\n`;
      responseText += `1. Нажмите кнопку "Играть" ниже\n`;
      responseText += `2. Создайте комнату или присоединитесь к существующей\n`;
      responseText += `3. Пригласите друзей и начните игру!\n\n`;
      responseText += `💡 Совет: Используйте кнопку "Играть" для быстрого старта!`;

      // Если есть параметр (invite_ или join_), добавляем информацию
      if (startParam) {
        if (startParam.startsWith('invite_')) {
          const referrerId = startParam.replace('invite_', '');
          responseText += `\n\n🎁 Вы были приглашены другом! Вы получите бонус при регистрации.`;
        } else if (startParam.startsWith('join_')) {
          const parts = startParam.replace('join_', '').split('_');
          if (parts.length >= 2) {
            const roomCode = parts.slice(1).join('_');
            responseText += `\n\n🎮 Приглашение в игру!\nКод комнаты: ${roomCode}\n\nНажмите кнопку "Играть" чтобы присоединиться!`;
          }
        }
      }

      // Отправляем ответ через Telegram Bot API
      const botToken = process.env.TELEGRAM_BOT_TOKEN;
      if (botToken) {
        // ✅ Поддержка обеих переменных: NEXT_PUBLIC_APP_URL и APP_URL
        const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || 'https://your-app-url.vercel.app';
        
        // Формируем URL с параметром start_param если есть
        let webAppUrl = appUrl;
        if (startParam) {
          webAppUrl += `?start_param=${encodeURIComponent(startParam)}`;
        }
        
        const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: chatId,
            text: responseText,
            parse_mode: 'HTML',
            reply_markup: {
              inline_keyboard: [[
                {
                  text: '🎮 Играть',
                  web_app: { url: webAppUrl }
                }
              ]]
            }
          })
        });
        
        const responseData = await response.json();
        if (!responseData.ok) {
          console.error('❌ [Telegram Webhook] Ошибка отправки сообщения:', responseData);
        } else {
          console.log('✅ [Telegram Webhook] Сообщение отправлено успешно');
        }
      } else {
        console.warn('⚠️ [Telegram Webhook] TELEGRAM_BOT_TOKEN не установлен');
      }
    }

    // Обрабатываем команду /help
    if (text && text.startsWith('/help')) {
      let helpText = `📖 Помощь по The Must!\n\n`;
      helpText += `🎯 Основные правила:\n`;
      helpText += `• Минимум 4 игрока для начала игры\n`;
      helpText += `• Максимум 7 игроков в комнате\n`;
      helpText += `• Все игроки должны быть готовы перед стартом\n\n`;
      helpText += `💡 Советы:\n`;
      helpText += `• Используйте кнопку "Добавить бота" если не хватает игроков\n`;
      helpText += `• Приглашайте друзей через кнопку "Пригласить друзей"\n`;
      helpText += `• Следите за козырем во второй стадии игры\n\n`;
      helpText += `❓ Вопросы? Напишите @support`;

      const botToken = process.env.TELEGRAM_BOT_TOKEN;
      if (botToken) {
        const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: chatId,
            text: helpText,
            parse_mode: 'HTML'
          })
        });
        
        const responseData = await response.json();
        if (!responseData.ok) {
          console.error('❌ [Telegram Webhook] Ошибка отправки help:', responseData);
        } else {
          console.log('✅ [Telegram Webhook] Help отправлен успешно');
        }
      }
    }

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error('❌ [Telegram Webhook] Ошибка:', error);
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}

// GET для проверки webhook
export async function GET() {
  return NextResponse.json({ 
    message: 'Telegram Bot Webhook is active',
    timestamp: new Date().toISOString()
  });
}

