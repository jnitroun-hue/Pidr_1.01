import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// 📋 API ДЛЯ ПОЛУЧЕНИЯ СПИСКА ИГРОКОВ В КОМНАТЕ
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ roomId: string }> }
) {
  try {
    const params = await context.params;
    const roomId = params.roomId;

    console.log(`📋 [GET /api/rooms/${roomId}/players] Получение списка игроков`);

    // ✅ ИСПРАВЛЕНО: Один запрос для получения всей информации о комнате
    const { data: room, error: roomError } = await supabase
      .from('_pidr_rooms')
      .select('max_players, current_players, status, host_id')
      .eq('id', roomId)
      .single();

    if (roomError || !room) {
      console.error('❌ [GET /api/rooms/players] Комната не найдена:', roomError);
      return NextResponse.json({ 
        success: false, 
        message: 'Комната не найдена: ' + (roomError?.message || 'Unknown error')
      }, { status: 404 });
    }

    // Получаем список игроков из БД
    const { data: players, error } = await supabase
      .from('_pidr_room_players')
      .select('*')
      .eq('room_id', roomId)
      .order('position', { ascending: true });

    // ✅ ИСПРАВЛЕНО: ДОБАВЛЯЕМ is_host И is_bot К КАЖДОМУ ИГРОКУ
    // ⚠️ ВАЖНО: host_id это UUID, user_id это telegram_id (INT8)
    // Боты определяются по telegram_id < 0
    const playersWithHost = await Promise.all((players || []).map(async (player: any) => {
      // ✅ НОВОЕ: Определяем является ли игрок ботом (telegram_id < 0)
      const isBot = typeof player.user_id === 'number' && player.user_id < 0;
      
      // Получаем UUID пользователя по telegram_id (только для не-ботов)
      let userData = null;
      let isHost = false;
      
      if (!isBot) {
        const { data } = await supabase
          .from('_pidr_users')
          .select('id')
          .eq('telegram_id', player.user_id)
          .maybeSingle();
        userData = data;
        
        // ✅ КРИТИЧНО: Сравниваем UUID с UUID (только для не-ботов)
        // room.host_id это UUID, userData.id это UUID
        if (room?.host_id && userData?.id) {
          // ✅ ИСПРАВЛЕНО: Приводим оба к строке для корректного сравнения
          const hostIdStr = String(room.host_id);
          const userIdStr = String(userData.id);
          isHost = hostIdStr === userIdStr;
          
          console.log(`🔍 [GET /api/rooms/players] Проверка хоста для игрока ${player.user_id}:`, {
            hostId: hostIdStr,
            userId: userIdStr,
            isHost,
            playerIsHost: player.is_host
          });
        }
      }
      
      // ✅ КРИТИЧНО: Используем вычисленный isHost, но если в БД уже есть is_host=true, тоже учитываем
      // ✅ УЛУЧШЕНО: Приоритет у вычисленного isHost (сравнение с host_id)
      const finalIsHost = isHost || (player.is_host === true);
      
      // ✅ ДОПОЛНИТЕЛЬНАЯ ПРОВЕРКА: Если игрок является хостом по host_id, но is_host=false в БД - исправляем
      if (isHost && !player.is_host) {
        console.log(`🔧 [GET /api/rooms/players] Исправляем is_host для хоста ${player.user_id}`);
        // Обновляем в БД (не блокируем ответ)
        supabase
          .from('_pidr_room_players')
          .update({ is_host: true })
          .eq('room_id', roomId)
          .eq('user_id', player.user_id)
          .then(() => console.log(`✅ [GET /api/rooms/players] is_host исправлен для ${player.user_id}`))
          .catch((err: unknown) => console.error(`❌ [GET /api/rooms/players] Ошибка исправления is_host:`, err));
      }
      
      return {
        ...player,
        is_host: finalIsHost, // ✅ ИСПРАВЛЕНО: Используем вычисленный isHost
        is_bot: isBot // ✅ ДОБАВЛЕНО: Флаг бота
      };
    }));

    if (error) {
      console.error('❌ [GET /api/rooms/players] Ошибка получения игроков:', error);
      return NextResponse.json({ 
        success: false, 
        message: 'Ошибка получения игроков: ' + error.message 
      }, { status: 500 });
    }

    console.log(`✅ [GET /api/rooms/players] Найдено игроков: ${players?.length || 0}, max: ${room.max_players}`);

    return NextResponse.json({ 
      success: true, 
      players: playersWithHost || [], // ✅ ИСПОЛЬЗУЕМ playersWithHost
      maxPlayers: room.max_players, // ✅ ДОБАВЛЕНО!
      currentPlayers: players?.length || 0,
      roomStatus: room.status
    });

  } catch (error: unknown) {
    console.error('❌ [GET /api/rooms/players] Ошибка:', error);
    return NextResponse.json({ 
      success: false, 
      message: 'Внутренняя ошибка сервера' 
    }, { status: 500 });
  }
}
