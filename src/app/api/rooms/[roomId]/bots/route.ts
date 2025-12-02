import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { requireAuth } from '@/lib/auth-utils';
import { atomicJoinRoom } from '@/lib/multiplayer/player-state-manager';

// 🤖 API ДЛЯ УПРАВЛЕНИЯ БОТАМИ В КОМНАТЕ
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ roomId: string }> }
) {
  try {
    const params = await context.params;
    // ПРОВЕРЯЕМ АВТОРИЗАЦИЮ
    const auth = await requireAuth(request);
    if (auth.error) {
      return NextResponse.json({ success: false, message: auth.error }, { status: 401 });
    }

    const telegramId = auth.userId as string; // ✅ Это telegram_id!
    const roomId = params.roomId;
    const body = await request.json();
    const { action } = body; // 'add' или 'remove'

    console.log(`🤖 Управление ботами: telegramId=${telegramId}, roomId=${roomId}, action=${action}`);

    // ✅ ПОЛУЧАЕМ UUID ПОЛЬЗОВАТЕЛЯ ПО TELEGRAM_ID
    const { data: userData, error: userError } = await supabase
      .from('_pidr_users')
      .select('id')
      .eq('telegram_id', telegramId)
      .single();
    
    if (userError || !userData) {
      console.error(`❌ [BOTS] Пользователь не найден:`, userError);
      return NextResponse.json({ success: false, message: 'Пользователь не найден' }, { status: 404 });
    }
    
    const userUUID = userData.id;
    console.log(`👤 [BOTS] Пользователь найден: UUID=${userUUID}, telegram_id=${telegramId}`);

    // ПРОВЕРЯЕМ СУЩЕСТВОВАНИЕ КОМНАТЫ И ПРАВА ХОСТА
    const { data: room, error: roomError } = await supabase
      .from('_pidr_rooms')
      .select('*')
      .eq('id', roomId)
      .single();

    if (roomError || !room) {
      return NextResponse.json({ success: false, message: 'Комната не найдена' }, { status: 404 });
    }

    // ПРОВЕРЯЕМ ЯВЛЯЕТСЯ ЛИ ПОЛЬЗОВАТЕЛЬ ХОСТОМ (СРАВНИВАЕМ UUID С UUID!)
    console.log(`🔍 [BOTS] Проверка хоста:`, {
      'room.host_id (UUID)': room.host_id,
      'userUUID (UUID)': userUUID,
      'are_equal': room.host_id === userUUID,
      'telegramId (для справки)': telegramId
    });
    
    if (room.host_id !== userUUID) {
      console.error(`❌ [BOTS] Пользователь ${telegramId} (UUID: ${userUUID}) НЕ является хостом комнаты (хост UUID: ${room.host_id})`);
      return NextResponse.json({ success: false, message: 'Только хост может управлять ботами' }, { status: 403 });
    }
    
    console.log(`✅ [BOTS] Пользователь ${telegramId} (UUID: ${userUUID}) является хостом комнаты ${roomId}`);

    if (action === 'add') {
      // ✅ ДОБАВЛЯЕМ БОТА: СНАЧАЛА ИЩЕМ СВОБОДНОГО ИЗ БД, ПОТОМ СОЗДАЁМ НОВОГО
      
      // ПОЛУЧАЕМ ТЕКУЩИХ ИГРОКОВ В КОМНАТЕ
      const { data: currentPlayers, error: playersError } = await supabase
        .from('_pidr_room_players')
        .select('position, user_id')
        .eq('room_id', roomId)
        .order('position', { ascending: false });

      if (playersError) {
        console.error('❌ Ошибка получения игроков:', playersError);
        return NextResponse.json({ 
          success: false, 
          message: 'Ошибка получения игроков: ' + playersError.message 
        }, { status: 500 });
      }

      // ПРОВЕРЯЕМ ЛИМИТ
      if (currentPlayers.length >= room.max_players) {
        return NextResponse.json({ 
          success: false, 
          message: `Достигнут максимум игроков: ${room.max_players}` 
        }, { status: 400 });
      }

      const maxPosition = currentPlayers[0]?.position || 0;
      const nextPosition = maxPosition + 1;
      
      // ✅ ПОЛУЧАЕМ TELEGRAM_ID ВСЕХ ИГРОКОВ УЖЕ В КОМНАТЕ
      const usedBotIds = currentPlayers
        .map((p: any) => p.user_id)
        .filter((id: any) => parseInt(id) < 0); // Только боты (отрицательные ID)
      
      console.log(`🤖 [ADD BOT] Боты уже в комнате:`, usedBotIds);

      // ✅ ШАГ 1: ИЩЕМ СВОБОДНОГО БОТА ИЗ БД (НЕ ЗАНЯТОГО НИ В ОДНОЙ КОМНАТЕ!)
      // Сначала получаем всех ботов которые УЖЕ В КОМНАТАХ
      const { data: busyBots } = await supabase
        .from('_pidr_room_players')
        .select('user_id')
        .lt('user_id', 0); // Только боты (отрицательные ID)
      
      const busyBotIds = busyBots ? busyBots.map((b: any) => b.user_id) : [];
      console.log(`🤖 [ADD BOT] Занятые боты:`, busyBotIds);
      
      // ✅ Ищем свободного бота по отрицательному telegram_id (боты имеют ID < 0)
      let query = supabase
        .from('_pidr_users')
        .select('telegram_id, username, first_name, avatar_url')
        .lt('telegram_id', 0) // ✅ Боты имеют отрицательные telegram_id
        .order('telegram_id', { ascending: true })
        .limit(1);
      
      // Исключаем занятых ботов
      if (busyBotIds.length > 0) {
        query = query.not('telegram_id', 'in', `(${busyBotIds.join(',')})`);
      }
      
      const { data: availableBots, error: botsError } = await query;

      if (botsError) {
        console.error('❌ Ошибка получения ботов из БД:', botsError);
      }

      let botId: number;
      let botName: string;
      let botAvatar: string | null;

      if (availableBots && availableBots.length > 0) {
        // ✅ НАШЛИ СВОБОДНОГО БОТА!
        const selectedBot = availableBots[0];
        botId = selectedBot.telegram_id;
        botName = selectedBot.username || selectedBot.first_name;
        botAvatar = selectedBot.avatar_url || '🤖'; // ✅ ИСПРАВЛЕНО НА avatar_url
        
        console.log(`✅ [ADD BOT] Используем бота из БД: ${botName} (ID: ${botId})`);
      } else {
        // ❌ СВОБОДНЫХ БОТОВ НЕТ - СОЗДАЁМ НОВОГО
        console.log(`⚠️ [ADD BOT] Свободных ботов нет, создаём нового...`);
        
        // Генерируем уникальный ID
        botId = -(Date.now() + Math.floor(Math.random() * 1000));
        
        const botFirstNames = [
          'Александр', 'Дмитрий', 'Максим', 'Артём', 'Никита',
          'Владислав', 'Андрей', 'Иван', 'Егор', 'Михаил',
          'Даниил', 'Кирилл', 'Сергей', 'Павел', 'Роман'
        ];
        
        const randomName = botFirstNames[Math.floor(Math.random() * botFirstNames.length)];
        botName = `${randomName}_БОТ`;
        botAvatar = '🤖';
        
        // Создаем бота в _pidr_users (без поля is_bot, так как боты определяются по telegram_id < 0)
        const { error: createBotError } = await supabase
          .from('_pidr_users')
          .insert({
            telegram_id: botId,
            username: botName,
            first_name: randomName,
            last_name: 'БОТ',
            coins: 5000,
            rating: 1000 + Math.floor(Math.random() * 500),
            games_played: Math.floor(Math.random() * 100),
            games_won: Math.floor(Math.random() * 50),
            status: 'offline',
            avatar_url: botAvatar
          });

        if (createBotError) {
          console.error('❌ Ошибка создания бота в _pidr_users:', createBotError);
          return NextResponse.json({ 
            success: false, 
            message: 'Ошибка создания бота: ' + createBotError.message 
          }, { status: 500 });
        }
        
        console.log(`✅ [ADD BOT] Создан новый бот: ${botName} (ID: ${botId})`);
      }

      // ✅ ИСПРАВЛЕНО: ДОБАВЛЯЕМ БОТА ЧЕРЕЗ atomicJoinRoom для синхронизации с Redis
      console.log(`🤖 [ADD BOT] Добавляем бота ${botName} (ID: ${botId}) в комнату ${roomId}`);
      
      const joinResult = await atomicJoinRoom({
        userId: String(botId), // ✅ telegram_id бота (отрицательное число)
        username: botName,
        roomId: String(roomId),
        roomCode: room.room_code,
        maxPlayers: room.max_players,
        isHost: false, // Боты не могут быть хостами
      });

      if (!joinResult.success) {
        console.error('❌ [ADD BOT] Ошибка добавления бота через atomicJoinRoom:', joinResult.error);
        return NextResponse.json({ 
          success: false, 
          message: 'Ошибка добавления бота: ' + (joinResult.error || 'Неизвестная ошибка')
        }, { status: 500 });
      }

      // ✅ ОБНОВЛЯЕМ avatar_url для бота (atomicJoinRoom не устанавливает его)
      const { error: avatarError } = await supabase
        .from('_pidr_room_players')
        .update({ avatar_url: botAvatar })
        .eq('room_id', roomId)
        .eq('user_id', botId);

      if (avatarError) {
        console.warn('⚠️ [ADD BOT] Ошибка обновления avatar_url (не критично):', avatarError);
      }

      console.log(`✅ [ADD BOT] Бот ${botName} успешно добавлен в комнату ${roomId} на позицию ${joinResult.position}`);

      return NextResponse.json({ 
        success: true, 
        message: `Бот ${botName} добавлен`,
        bot: {
          id: botId,
          name: botName,
          position: nextPosition
        }
      });

    } else if (action === 'remove') {
      // УДАЛЯЕМ ПОСЛЕДНЕГО БОТА
      
      const { data: bots, error: botsError } = await supabase
        .from('_pidr_room_players')
        .select('*')
        .eq('room_id', roomId)
        .lt('user_id', '0') // ОТРИЦАТЕЛЬНЫЕ ID = БОТЫ
        .order('position', { ascending: false })
        .limit(1);

      if (botsError || !bots || bots.length === 0) {
        return NextResponse.json({ 
          success: false, 
          message: 'Нет ботов для удаления' 
        }, { status: 400 });
      }

      const botToRemove = bots[0];
      console.log(`🤖 Удаляем бота: ${botToRemove.username}`);

      // УДАЛЯЕМ БОТА
      const { error: removeError } = await supabase
        .from('_pidr_room_players')
        .delete()
        .eq('id', botToRemove.id);

      if (removeError) {
        console.error('❌ Ошибка удаления бота:', removeError);
        return NextResponse.json({ 
          success: false, 
          message: 'Ошибка удаления бота: ' + removeError.message 
        }, { status: 500 });
      }

      // ✅ ОБНОВЛЯЕМ СЧЕТЧИК ИГРОКОВ И last_activity
      const now = new Date().toISOString();
      const { error: updateError } = await supabase
        .from('_pidr_rooms')
        .update({ 
          current_players: room.current_players - 1,
          last_activity: now,
          updated_at: now
        })
        .eq('id', roomId);

      if (updateError) {
        console.error('❌ Ошибка обновления счетчика:', updateError);
      }

      console.log(`✅ Бот ${botToRemove.username} удален из комнаты ${roomId}`);

      return NextResponse.json({ 
        success: true, 
        message: `Бот ${botToRemove.username} удален`
      });

    } else {
      return NextResponse.json({ 
        success: false, 
        message: 'Неизвестное действие. Используйте "add" или "remove"' 
      }, { status: 400 });
    }

  } catch (error) {
    console.error('❌ Ошибка API ботов:', error);
    return NextResponse.json({ 
      success: false, 
      message: 'Внутренняя ошибка сервера' 
    }, { status: 500 });
  }
}
