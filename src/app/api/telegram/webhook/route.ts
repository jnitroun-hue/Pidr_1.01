import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { declineRoomInviteFromTelegram } from '@/lib/telegram/room-invite-notify';
import { referralCodeFromTelegramStartParam } from '@/lib/referral/referral-links';

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
    
    // ✅ ЛОГИРОВАНИЕ ВСЕХ ВХОДЯЩИХ ЗАПРОСОВ
    console.log('📥 [Telegram Webhook] Получен запрос:', {
      hasMessage: !!body.message,
      hasCallbackQuery: !!body.callback_query,
      updateId: body.update_id,
      keys: Object.keys(body)
    });
    
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

      if (typeof callbackData === 'string' && callbackData.startsWith('inv_decline:')) {
        const inviteId = Number(callbackData.slice('inv_decline:'.length));
        const telegramUserId = Number(callbackQuery.from?.id);
        const result = await declineRoomInviteFromTelegram({ inviteId, telegramUserId });

        await fetch(`https://api.telegram.org/bot${botToken}/answerCallbackQuery`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            callback_query_id: callbackQuery.id,
            text: result.message,
            show_alert: !result.ok,
          }),
        });

        if (result.ok && callbackChatId && callbackMessageId) {
          await fetch(`https://api.telegram.org/bot${botToken}/editMessageText`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: callbackChatId,
              message_id: callbackMessageId,
              text: '❌ Вы отказались от приглашения в игру.',
            }),
          });
        }

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
    
    // ✅ ВАЖНО: Всегда возвращаем ok: true для Telegram
    // Telegram будет повторять запросы, если не получит ok: true
    
    // Проверяем, что это сообщение от Telegram
    if (!body.message) {
      console.log('📨 [Telegram Webhook] Обновление без сообщения, игнорируем:', Object.keys(body));
      // ✅ ВАЖНО: Всегда возвращаем ok: true
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
      console.log('✅ [Telegram Webhook] Обрабатываем команду /start');
      const startParam = text.split(' ')[1]; // Параметр после /start
      console.log('📋 [Telegram Webhook] Параметр start:', startParam);
      
      // ✅ ПОЛУЧАЕМ СТАТИСТИКУ ДЛЯ ПРОМО-СООБЩЕНИЯ
      let recentWins = '';
      try {
        console.log('📊 [Telegram Webhook] Загружаем статистику игроков...');
        const { data: recentGames, error: statsError } = await supabase
          .from('_pidr_users')
          .select('username, wins, games_played')
          .gt('wins', 0)
          .order('wins', { ascending: false })
          .limit(3);
        
        if (statsError) {
          console.error('❌ [Telegram Webhook] Ошибка загрузки статистики:', statsError);
        } else {
          console.log('✅ [Telegram Webhook] Статистика загружена:', recentGames?.length || 0, 'игроков');
        }
        
        if (recentGames && recentGames.length > 0) {
          recentWins = `\n🏆 <b>Топ игроков:</b>\n`;
          recentGames.forEach((user: { username: string | null; wins: number; games_played: number }, index: number) => {
            const winRate = user.games_played > 0 ? Math.round((user.wins / user.games_played) * 100) : 0;
            const name = (user.username || 'Игрок').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
            recentWins += `${index + 1}. ${name} - ${user.wins} побед (${winRate}%)\n`;
          });
        }
      } catch (error: unknown) {
        console.error('❌ [Telegram Webhook] Ошибка получения статистики:', error);
      }
      
      let caption = `<b>P.I.D.R.</b> — карточная игра\n\n`;
      caption += `Садись за стол с друзьями, собирай NFT и поднимайся в рейтинге.\n`;
      caption += `Зарегистрируйся или сразу играй — в Telegram или во ВКонтакте.`;
      if (recentWins) caption += `\n${recentWins}`;
      if (startParam?.startsWith('invite_')) {
        caption += `\n\n🎁 <b>Вас пригласил друг.</b> Бонус придёт после регистрации.`;
      } else if (startParam?.startsWith('join_')) {
        const parts = startParam.replace('join_', '').split('_');
        if (parts.length >= 2) {
          const roomCode = parts.slice(1).join('_').replace(/[<>&]/g, '');
          caption += `\n\n🎮 <b>Приглашение в игру.</b> Код комнаты: <code>${roomCode}</code>`;
        }
      }

      // Отправляем ответ через Telegram Bot API
      const botToken = process.env.TELEGRAM_BOT_TOKEN;
      console.log('🔑 [Telegram Webhook] Bot token:', botToken ? `${botToken.substring(0, 10)}...` : 'НЕ УСТАНОВЛЕН');
      
      if (botToken) {
        // ✅ Поддержка обеих переменных: NEXT_PUBLIC_APP_URL и APP_URL
        const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || 'https://your-app-url.vercel.app';
        console.log('🌐 [Telegram Webhook] App URL:', appUrl);
        
        // Формируем URL с параметром start_param если есть
        let webAppUrl = appUrl;
        if (startParam) {
          webAppUrl += `?start_param=${encodeURIComponent(startParam)}`;
        }
        console.log('🔗 [Telegram Webhook] Web App URL:', webAppUrl);
        
        const appBase = appUrl.replace(/\/$/, '');
        const heroUrl = `${appBase}/img/vk-app-icon-512.png`;
        const referralCode = referralCodeFromTelegramStartParam(startParam);
        const registerUrl = referralCode
          ? `${appBase}/auth/register?ref=${encodeURIComponent(referralCode)}`
          : `${appBase}/auth/register`;
        const vkAppId = (process.env.NEXT_PUBLIC_VK_CLIENT_ID || '').trim();
        const vkPlayUrl = /^\d+$/.test(vkAppId) ? `https://vk.com/app${vkAppId}` : null;

        const playRow: Array<Record<string, unknown>> = [
          { text: '🎮 Играть в Telegram', web_app: { url: webAppUrl } },
        ];
        if (vkPlayUrl) {
          playRow.push({ text: '🔵 Играть в VK', url: vkPlayUrl });
        } else {
          console.warn('⚠️ [Telegram Webhook] NEXT_PUBLIC_VK_CLIENT_ID не задан — кнопка VK скрыта');
        }

        const replyMarkup = {
          inline_keyboard: [
            [{ text: '📝 Зарегистрироваться', web_app: { url: registerUrl } }],
            playRow,
            [{ text: '📖 Изучить правила', callback_data: 'show_rules' }],
          ],
        };

        console.log('📤 [Telegram Webhook] Отправляем /start с картинкой...');
        const photoResponse = await fetch(`https://api.telegram.org/bot${botToken}/sendPhoto`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: chatId,
            photo: heroUrl,
            caption,
            parse_mode: 'HTML',
            reply_markup: replyMarkup,
          }),
        });
        const photoData = await photoResponse.json();
        if (photoData.ok) {
          console.log('✅ [Telegram Webhook] /start с картинкой отправлен');
        } else {
          console.error('❌ [Telegram Webhook] sendPhoto не удался, шлём текст:', photoData);
          const textResponse = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: chatId,
              text: caption,
              parse_mode: 'HTML',
              reply_markup: replyMarkup,
            }),
          });
          const textData = await textResponse.json();
          if (!textData.ok) {
            console.error('❌ [Telegram Webhook] Ошибка отправки /start:', textData);
          }
        }
      } else {
        console.warn('⚠️ [Telegram Webhook] TELEGRAM_BOT_TOKEN не установлен');
        console.warn('💡 Установите переменную окружения TELEGRAM_BOT_TOKEN в Vercel');
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

    // ✅ ВАЖНО: Всегда возвращаем ok: true в конце
    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error('❌ [Telegram Webhook] Ошибка:', error);
    // ✅ ВАЖНО: Даже при ошибке возвращаем ok: true, иначе Telegram будет повторять запросы
    return NextResponse.json({ ok: true, error: error instanceof Error ? error.message : String(error) });
  }
}

// GET для проверки webhook
export async function GET(req: NextRequest) {
  try {
    // ✅ ИСПОЛЬЗУЕМ req.nextUrl вместо new URL для правильного парсинга
    const action = req.nextUrl.searchParams.get('action');
    const url = req.nextUrl.toString();
    
    console.log('🔍 [Telegram Webhook GET] Получен запрос:', {
      url,
      action,
      searchParams: req.nextUrl.searchParams.toString(),
      allParams: Object.fromEntries(req.nextUrl.searchParams.entries())
    });
    
    // ✅ ПРОВЕРКА СТАТУСА WEBHOOK
    if (action === 'check') {
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    
    if (!botToken) {
      return NextResponse.json({ 
        error: 'TELEGRAM_BOT_TOKEN не установлен',
        webhookConfigured: false
      }, { status: 500 });
    }
    
    try {
      // Проверяем информацию о webhook
      const webhookInfoResponse = await fetch(`https://api.telegram.org/bot${botToken}/getWebhookInfo`);
      const webhookInfo = await webhookInfoResponse.json();
      
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || 'https://your-app-url.vercel.app';
      const expectedWebhookUrl = `${appUrl}/api/telegram/webhook`;
      
      return NextResponse.json({
        webhookConfigured: webhookInfo.ok && webhookInfo.result.url === expectedWebhookUrl,
        webhookInfo: webhookInfo.result,
        expectedUrl: expectedWebhookUrl,
        botTokenExists: !!botToken,
        appUrl
      });
    } catch (error: any) {
      return NextResponse.json({ 
        error: error instanceof Error ? error.message : String(error),
        webhookConfigured: false
      }, { status: 500 });
    }
  }
  
    // ✅ УСТАНОВКА WEBHOOK
    if (action === 'setup') {
      console.log('⚙️ [Telegram Webhook GET] Настройка webhook...');
      const botToken = process.env.TELEGRAM_BOT_TOKEN;
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL;
      const secretToken = process.env.WEBHOOK_SECRET_TOKEN;
      
      console.log('📋 [Telegram Webhook GET] Параметры:', {
        botTokenExists: !!botToken,
        appUrl,
        secretTokenExists: !!secretToken
      });
      
      if (!botToken || !appUrl) {
        return NextResponse.json({ 
          error: 'TELEGRAM_BOT_TOKEN или NEXT_PUBLIC_APP_URL не установлены',
          botTokenExists: !!botToken,
          appUrlExists: !!appUrl,
          env: {
            NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
            APP_URL: process.env.APP_URL
          }
        }, { status: 500 });
      }
      
      try {
        const webhookUrl = `${appUrl}/api/telegram/webhook`;
        const webhookData: any = { url: webhookUrl };
        
        if (secretToken) {
          webhookData.secret_token = secretToken;
        }
        
        console.log('📤 [Telegram Webhook GET] Отправляем запрос на установку webhook:', webhookUrl);
        
        const setWebhookResponse = await fetch(`https://api.telegram.org/bot${botToken}/setWebhook`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(webhookData)
        });
        
        const result = await setWebhookResponse.json();
        
        console.log('📥 [Telegram Webhook GET] Ответ от Telegram:', result);
        
        return NextResponse.json({
          success: result.ok,
          message: result.description || 'Webhook установлен',
          webhookUrl,
          result
        });
      } catch (error: any) {
        console.error('❌ [Telegram Webhook GET] Ошибка установки webhook:', error);
        return NextResponse.json({ 
          error: error instanceof Error ? error.message : String(error)
        }, { status: 500 });
      }
    }
    
    // ✅ ДЕФОЛТНЫЙ ОТВЕТ
    console.log('ℹ️ [Telegram Webhook GET] Дефолтный ответ (action не указан или неизвестен)');
    console.log('🔍 [Telegram Webhook GET] Отладочная информация:', {
      action,
      actionType: typeof action,
      actionIsNull: action === null,
      actionIsUndefined: action === undefined,
      actionIsEmpty: action === '',
      url: req.url,
      nextUrl: req.nextUrl.toString(),
      searchParams: req.nextUrl.searchParams.toString()
    });
    
    return NextResponse.json({ 
      message: 'Telegram Bot Webhook is active',
      timestamp: new Date().toISOString(),
      action: action || 'none',
      debug: {
        action,
        actionType: typeof action,
        url: req.url,
        nextUrl: req.nextUrl.toString(),
        searchParams: req.nextUrl.searchParams.toString()
      },
      endpoints: {
        check: '/api/telegram/webhook?action=check',
        setup: '/api/telegram/webhook?action=setup'
      }
    });
  } catch (error: any) {
    console.error('❌ [Telegram Webhook GET] Ошибка:', error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}

