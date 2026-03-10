import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin as supabase } from '../../../../lib/supabase';
import { requireAuth, getUserIdFromDatabase } from '../../../../lib/auth-utils';
import { checkRateLimit, getRateLimitId } from '../../../../lib/ratelimit';
import { removePlayerFromAllRooms } from '../../../../lib/multiplayer/player-state-manager';

// POST /api/rooms/close - Закрыть комнату (только для создателя)
export async function POST(req: NextRequest) {
  // ✅ Универсальная авторизация
  const auth = requireAuth(req);
  if (auth.error || !auth.userId) {
    return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
  }

  // Rate limiting
  const id = getRateLimitId(req);
  const { success } = await checkRateLimit(`rooms_close:${id}`);
  if (!success) {
    return NextResponse.json({ success: false, message: 'Too many requests' }, { status: 429 });
  }

  const { userId, environment } = auth;

  try {
    // Получаем данные пользователя из БД
    const { dbUserId, user } = await getUserIdFromDatabase(userId, environment);
    if (!dbUserId || !user) {
      return NextResponse.json({ success: false, message: 'Пользователь не найден' }, { status: 404 });
    }

    const { roomId } = await req.json();

    if (!roomId) {
      return NextResponse.json({ success: false, message: 'Room ID is required' }, { status: 400 });
    }

    // Проверяем, что комната существует и пользователь является её создателем
    const { data: room, error: roomError } = await supabase
      .from('_pidr_rooms')
      .select('id, name, host_id, status')
      .eq('id', roomId)
      .single();

    if (roomError || !room) {
      return NextResponse.json({ success: false, message: 'Комната не найдена' }, { status: 404 });
    }

    // Проверяем что пользователь — хост (сравниваем с dbUserId)
    if (String(room.host_id) !== String(dbUserId)) {
      return NextResponse.json({ 
        success: false, 
        message: 'Только создатель комнаты может её закрыть' 
      }, { status: 403 });
    }

    if (room.status === 'finished' || room.status === 'cancelled') {
      return NextResponse.json({ 
        success: false, 
        message: 'Комната уже закрыта' 
      }, { status: 400 });
    }

    // Получаем список всех игроков в комнате
    const { data: players } = await supabase
      .from('_pidr_room_players')
      .select('user_id')
      .eq('room_id', roomId);

    // Обновляем статус комнаты на "cancelled"
    const { error: updateError } = await supabase
      .from('_pidr_rooms')
      .update({ 
        status: 'cancelled',
        finished_at: new Date().toISOString()
      })
      .eq('id', roomId);

    if (updateError) throw updateError;

    // Удаляем всех игроков из комнаты
    const { error: deletePlayersError } = await supabase
      .from('_pidr_room_players')
      .delete()
      .eq('room_id', roomId);

    if (deletePlayersError) throw deletePlayersError;

    // Обновляем статус реальных игроков + очищаем Redis
    if (players && players.length > 0) {
      const realPlayerIds = players
        .filter((p: any) => parseInt(p.user_id) > 0)
        .map((p: any) => p.user_id);
      
      if (realPlayerIds.length > 0) {
        // Обновляем статус в БД
        await supabase
          .from('_pidr_user_status')
          .update({ 
            status: 'online',
            current_room_id: null,
            updated_at: new Date().toISOString()
          })
          .in('user_id', realPlayerIds);

        // Очищаем Redis для каждого игрока
        for (const playerId of realPlayerIds) {
          try {
            await removePlayerFromAllRooms(playerId);
          } catch (err) {
            console.warn(`⚠️ [Close Room] Ошибка очистки Redis для ${playerId}:`, err);
          }
        }
        
        console.log(`✅ [Close Room] Обновлен статус ${realPlayerIds.length} игроков`);
      }
    }

    return NextResponse.json({ 
      success: true, 
      message: `Комната "${room.name}" успешно закрыта`
    });

  } catch (error: unknown) {
    console.error('❌ [Close Room] Ошибка:', error);
    return NextResponse.json({ 
      success: false, 
      message: 'Внутренняя ошибка сервера' 
    }, { status: 500 });
  }
}
