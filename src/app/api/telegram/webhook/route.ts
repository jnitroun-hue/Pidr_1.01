import { NextRequest, NextResponse } from 'next/server';
import { declineRoomInviteFromTelegram } from '@/lib/telegram/room-invite-notify';
import {
  acceptFriendRequestFromTelegram,
  declineFriendRequestFromTelegram,
} from '@/lib/telegram/friend-request-notify';

/** В проде URL иногда лежит без схемы — Telegram тогда отклоняет web_app-кнопки целиком. */
function botAppBase(): string {
  const raw = (process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || 'https://www.pidr1-01.ru')
    .trim()
    .replace(/\/$/, '');
  if (/^https?:\/\//i.test(raw)) return raw.replace(/^http:\/\//i, 'https://');
  return `https://${raw}`;
}

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

      if (
        typeof callbackData === 'string' &&
        (callbackData.startsWith('fr_accept:') || callbackData.startsWith('fr_decline:'))
      ) {
        const accept = callbackData.startsWith('fr_accept:');
        const fromUserId = Number(callbackData.slice(accept ? 'fr_accept:'.length : 'fr_decline:'.length));
        const telegramUserId = Number(callbackQuery.from?.id);
        const result = accept
          ? await acceptFriendRequestFromTelegram({ fromUserId, telegramUserId })
          : await declineFriendRequestFromTelegram({ fromUserId, telegramUserId });

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
              text: accept
                ? '✅ Заявка в друзья принята.'
                : '❌ Заявка в друзья отклонена.',
            }),
          });
        }

        return NextResponse.json({ ok: true });
      }

      if (callbackData === 'show_earn') {
        const earnText =
          `💰 <b>Как зарабатывать в P.I.D.R.</b>\n\n` +
          `Заработок внутри игры: рейтинг, монеты и свои NFT-карты, которые можно продать другим игрокам.\n\n` +
          `🏆 <b>Рейтинг</b>\n` +
          `• Садись за стол и поднимайся в таблице\n` +
          `• Чем выше место — тем заметнее профиль и тем больше шансов на призы сезона\n\n` +
          `🪙 <b>Монеты</b>\n` +
          `• Игровые монеты копятся за игру и бонусы\n` +
          `• Ими оплачивают генерацию NFT и покупки на площадке\n` +
          `• Пригласи друга: после его регистрации тебе начисляется <b>500 монет</b>\n\n` +
          `🎨 <b>NFT-карты</b>\n` +
          `• Открой коллекцию, выбери тему и запусти генерацию\n` +
          `• У карты сохраняются ранг, масть и оформление\n` +
          `• Редкая тема и сильный ранг интереснее покупателям\n\n` +
          `💸 <b>Продажа другим игрокам</b>\n` +
          `• Нажми «Продать» и укажи одну цену\n` +
          `• Оплата: монеты, рубли, GRAM, SOL, TRX, ETH или USDT\n` +
          `• Для крипты выбери сеть и свой кошелёк получения\n` +
          `• Адрес скрыт в карточке лота и открывается покупателю только на оплате\n` +
          `• После сделки карта уходит покупателю, а оплата — тебе\n\n` +
          `⚠️ <b>Важно</b>\n` +
          `Доход не гарантирован: карта должна найти покупателя. Перед криптопереводом проверяй сеть и адрес — в блокчейне его не отменить.`;

        await fetch(`https://api.telegram.org/bot${botToken}/answerCallbackQuery`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            callback_query_id: callbackQuery.id,
            text: 'Как зарабатывать',
          }),
        });

        const earnResponse = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: callbackChatId,
            text: earnText,
            parse_mode: 'HTML',
            reply_markup: {
              inline_keyboard: [[
                {
                  text: '🎮 Начать игру',
                  web_app: { url: botAppBase() },
                },
              ]],
            },
          }),
        });
        const earnData = await earnResponse.json();
        if (!earnData.ok) {
          console.error('❌ [Telegram Webhook] Ошибка отправки заработка:', earnData);
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
          `• У каждого игрока 1 открытая и 2 закрытые карты (пеньки — до 3 стадии)\n` +
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
          `• Если забыл — получает карты от всех остальных за столом, но только если кто-то успел первым спросить «Сколько карт?»\n\n` +
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
                  web_app: { url: botAppBase() }
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
      const startParam = text.split(' ')[1];
      const botToken = process.env.TELEGRAM_BOT_TOKEN;
      console.log('✅ [Telegram Webhook] /start', { startParam, hasToken: !!botToken });

      if (botToken) {
        const appBase = botAppBase();
        const heroUrl = `${appBase}/img/vk-app-icon-512.png`;
        const playUrl = startParam
          ? `${appBase}/?start_param=${encodeURIComponent(startParam)}`
          : `${appBase}/`;
        const vkAppId = (process.env.NEXT_PUBLIC_VK_CLIENT_ID || '').trim();
        const vkPlayUrl = /^\d+$/.test(vkAppId) ? `https://vk.com/app${vkAppId}` : null;

        let caption =
          `<b>P.I.D.R.</b> — карточная игра\n\n` +
          `Садись за стол в Telegram или VK.\n\n` +
          `💰 <b>Заработать</b> можно в самой игре: поднимайся в рейтинге, получай монеты, генерируй NFT-карты и продавай их другим игрокам.`;
        if (startParam?.startsWith('invite_')) {
          caption += `\n\n🎁 <b>Вас пригласил друг.</b> Бонус придёт после регистрации.`;
        } else if (startParam?.startsWith('join_')) {
          const roomCode = startParam.replace(/^join_/, '').split('_').slice(1).join('_').replace(/[<>&]/g, '');
          if (roomCode) caption += `\n\n🎮 Код комнаты: <code>${roomCode}</code>`;
        }

        const playRow: Array<Record<string, unknown>> = [
          { text: '🎮 Играть в Telegram', web_app: { url: playUrl } },
        ];
        if (vkPlayUrl) playRow.push({ text: '🔵 Играть в VK', url: vkPlayUrl });

        const replyMarkup = {
          inline_keyboard: [
            [{ text: '💰 Заработать', callback_data: 'show_earn' }],
            playRow,
            [{ text: '📖 Изучить правила', callback_data: 'show_rules' }],
          ],
        };

        const api = `https://api.telegram.org/bot${botToken}`;
        try {
          const photoResponse = await fetch(`${api}/sendPhoto`, {
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
          const photoData = await photoResponse.json().catch(() => null);
          if (!photoData?.ok) {
            console.error('❌ [Telegram Webhook] sendPhoto:', photoData);
            const textResponse = await fetch(`${api}/sendMessage`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                chat_id: chatId,
                text: caption,
                parse_mode: 'HTML',
                reply_markup: replyMarkup,
              }),
            });
            const textData = await textResponse.json().catch(() => null);
            if (!textData?.ok) {
              console.error('❌ [Telegram Webhook] sendMessage fallback:', textData);
              await fetch(`${api}/sendMessage`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  chat_id: chatId,
                  text: `P.I.D.R. — карточная игра.\nИграть: ${appBase}/`,
                }),
              });
            }
          }
        } catch (sendError) {
          console.error('❌ [Telegram Webhook] /start send failed:', sendError);
          await fetch(`${api}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: chatId,
              text: 'P.I.D.R. — карточная игра. Нажми кнопку меню «Играть» или открой https://pidr-1-01.vercel.app',
            }),
          }).catch(() => undefined);
        }
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

