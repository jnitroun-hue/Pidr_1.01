import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { requireAuth } from '@/lib/auth-utils';

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
      // ДОБАВЛЯЕМ БОТА
      
      // ПОЛУЧАЕМ ТЕКУЩЕЕ КОЛИЧЕСТВО ИГРОКОВ
      const { data: currentPlayers, error: playersError } = await supabase
        .from('_pidr_room_players')
        .select('position')
        .eq('room_id', roomId)
        .order('position', { ascending: false });

      if (playersError) {
        console.error('❌ Ошибка получения игроков:', playersError);
        return NextResponse.json({ 
          success: false, 
          message: 'Ошибка получения игроков: ' + playersError.message 
        }, { status: 500 });
      }

      // ПРОВЕРЯЕМ НЕ ПРЕВЫШЕН ЛИ ЛИМИТ
      if (currentPlayers.length >= room.max_players) {
        return NextResponse.json({ 
          success: false, 
          message: `Достигнут максимум игроков: ${room.max_players}` 
        }, { status: 400 });
      }

      // ГЕНЕРИРУЕМ УНИКАЛЬНЫЙ ID ДЛЯ БОТА (ОТРИЦАТЕЛЬНЫЙ)
      const botId = -(Date.now() + Math.floor(Math.random() * 1000));
      const maxPosition = currentPlayers[0]?.position || 0;
      const nextPosition = maxPosition + 1;

      // СПИСОК ИМЕН БОТОВ
      const botNames = [
        'Андрей_БОТ', 'Максим_БОТ', 'Дмитрий_БОТ', 'Алексей_БОТ', 
        'Сергей_БОТ', 'Владимир_БОТ', 'Николай_БОТ', 'Игорь_БОТ'
      ];
      
      const usedNames = currentPlayers.map((p: any) => p.username).filter((name: string) => name?.includes('_БОТ'));
      const availableNames = botNames.filter(name => !usedNames.includes(name));
      const botName = availableNames[0] || `БОТ_${nextPosition}`;

      console.log(`🤖 Добавляем бота: id=${botId}, name=${botName}, position=${nextPosition}`);

      // ДОБАВЛЯЕМ БОТА В БАЗУ
      const { error: botError } = await supabase
        .from('_pidr_room_players')
        .insert({
          room_id: roomId,
          user_id: botId.toString(), // ОТРИЦАТЕЛЬНЫЙ ID КАК СТРОКА
          username: botName,
          position: nextPosition,
          is_ready: true, // БОТЫ ВСЕГДА ГОТОВЫ
          avatar_url: null
        });

      if (botError) {
        console.error('❌ Ошибка добавления бота:', botError);
        return NextResponse.json({ 
          success: false, 
          message: 'Ошибка добавления бота: ' + botError.message 
        }, { status: 500 });
      }

      // ОБНОВЛЯЕМ СЧЕТЧИК ИГРОКОВ
      const { error: updateError } = await supabase
        .from('_pidr_rooms')
        .update({ current_players: room.current_players + 1 })
        .eq('id', roomId);

      if (updateError) {
        console.error('❌ Ошибка обновления счетчика:', updateError);
      }

      console.log(`✅ Бот ${botName} добавлен в комнату ${roomId}`);

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

      // ОБНОВЛЯЕМ СЧЕТЧИК ИГРОКОВ
      const { error: updateError } = await supabase
        .from('_pidr_rooms')
        .update({ current_players: room.current_players - 1 })
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
