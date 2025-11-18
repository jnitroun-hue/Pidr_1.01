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
    
    // ✅ ОБРАБОТКА НАЖАТИЙ НА КНОПКИ (callback_query)
    if (body.callback_query) {
      const callbackQuery = body.callback_query;
      const callbackData = callbackQuery.data;
      const callbackChatId = callbackQuery.message?.chat?.id;
      const callbackMessageId = callbackQuery.message?.message_id;
      
      console.log('📨 [Telegram Webhook] Получен callback_query:', { 
        data: callbackData, 
        chatId: callbackChatId,
        messageId: callbackMessageId
      });
      
      const botToken = process.env.TELEGRAM_BOT_TOKEN;
      if (!botToken) {
        console.warn('⚠️ [Telegram Webhook] TELEGRAM_BOT_TOKEN не установлен');
        return NextResponse.json({ ok: true });
      }
      
      // Обрабатываем кнопку "Изучить правила"
      if (callbackData === 'show_rules') {
        const rulesText = `📖 <b>Правила игры P.I.D.R.</b>\n\n` +
          `🎯 <b>Цель игры:</b>\n` +
          `Избавиться от всех карт раньше других игроков.\n\n` +
          `🎮 <b>Стадии игры:</b>\n\n` +
          `1️⃣ <b>Первая стадия:</b>\n` +
          `• У каждого игрока 1 открытая карта\n` +
          `• Старшая карта бьет младшую (Туз → Король → Дама → Валет → 10 → ... → 2)\n` +
          `• Двойка бьет только Туз\n` +
          `• Можно брать карты из колоды\n` +
          `• Когда колода заканчивается - переход во 2-ю стадию\n\n` +
          `2️⃣ <b>Вторая стадия (с козырем):</b>\n` +
          `• Козырь определяется последней взятой картой (кроме пик)\n` +
          `• Козырь бьет любую некозырную карту\n` +
          `• Старший козырь бьет младший козырь\n` +
          `• Можно бить карту соперника или брать карты со стола\n` +
          `• Когда у игрока заканчиваются карты - переход в 3-ю стадию\n\n` +
          `3️⃣ <b>Третья стадия (пеньки):</b>\n` +
          `• Игрок активирует 2 закрытые карты (пеньки)\n` +
          `• Продолжает играть с пеньками\n` +
          `• Когда пеньки заканчиваются - игрок выходит из игры\n\n` +
          `⚠️ <b>Штрафы:</b>\n` +
          `• Если у игрока 1 карта, он должен объявить "Одна карта!"\n` +
          `• Если забыл - получает штрафные карты от других игроков\n\n` +
          `🏆 <b>Победа:</b>\n` +
          `Первый игрок, избавившийся от всех карт - победитель!\n\n` +
          `💡 <b>Советы:</b>\n` +
          `• Следите за козырем во 2-й стадии\n` +
          `• Не забывайте объявлять "Одна карта!"\n` +
          `• Используйте NFT карты для уникального стиля!`;
        
        // Отправляем ответ на callback_query
        await fetch(`https://api.telegram.org/bot${botToken}/answerCallbackQuery`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            callback_query_id: callbackQuery.id,
            text: 'Правила игры'
          })
        });
        
        // Отправляем сообщение с правилами
        const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: callbackChatId,
            text: rulesText,
            parse_mode: 'HTML',
            reply_markup: {
              inline_keyboard: [[
                {
                  text: '🎮 Начать игру',
                  web_app: { url: process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || 'https://your-app-url.vercel.app' }
                }
              ]]
            }
          })
        });
        
        const responseData = await response.json();
        if (!responseData.ok) {
          console.error('❌ [Telegram Webhook] Ошибка отправки правил:', responseData);
        } else {
          console.log('✅ [Telegram Webhook] Правила отправлены успешно');
        }
      }
      
      return NextResponse.json({ ok: true });
    }
    
    // Проверяем, что это сообщение от Telegram
    if (!body.message) {
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
      
      let responseText = `🎮 <b>Добро пожаловать в P.I.D.R.!</b>\n\n`;
      responseText += `Это увлекательная карточная игра для Telegram WebApp.\n\n`;
      responseText += `🎯 <b>Что вас ждет:</b>\n`;
      responseText += `• Динамичная карточная игра с ботами и друзьями\n`;
      responseText += `• Система рейтинга и достижений\n`;
      responseText += `• Уникальные NFT карты для коллекции\n`;
      responseText += `• Мультиплеер на 4-7 игроков\n\n`;
      responseText += `🚀 <b>Начните играть прямо сейчас!</b>\n`;
      responseText += `Нажмите кнопку "🎮 Играть" чтобы открыть игру.`;

      // Если есть параметр (invite_ или join_), добавляем информацию
      if (startParam) {
        if (startParam.startsWith('invite_')) {
          const referrerId = startParam.replace('invite_', '');
          responseText += `\n\n🎁 <b>Вы были приглашены другом!</b>\nВы получите бонус при регистрации.`;
        } else if (startParam.startsWith('join_')) {
          const parts = startParam.replace('join_', '').split('_');
          if (parts.length >= 2) {
            const roomCode = parts.slice(1).join('_');
            responseText += `\n\n🎮 <b>Приглашение в игру!</b>\nКод комнаты: <code>${roomCode}</code>\n\nНажмите кнопку "🎮 Играть" чтобы присоединиться!`;
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
              inline_keyboard: [
                [
                  {
                    text: '🎮 Играть',
                    web_app: { url: webAppUrl }
                  }
                ],
                [
                  {
                    text: '📖 Изучить правила',
                    callback_data: 'show_rules'
                  }
                ]
              ]
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

