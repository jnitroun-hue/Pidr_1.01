import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin as supabase } from '@/lib/supabase';
import { requireAuth, getUserIdFromDatabase } from '@/lib/auth-utils';

// GET /api/rooms/[roomId] - получить информацию о комнате
export async function GET(req: NextRequest, context: { params: Promise<{ roomId: string }> }) {
  try {
    const params = await context.params;
    const { roomId } = params;
    
    if (!roomId) {
      return NextResponse.json({ success: false, message: 'Room ID required' }, { status: 400 });
    }

    console.log(`🔍 [GET /api/rooms/${roomId}] Загружаем информацию о комнате`);

    // Загружаем информацию о комнате из БД
    const { data: room, error: roomError } = await supabase
      .from('_pidr_rooms')
      .select('*')
      .eq('id', roomId)
      .single();

    if (roomError || !room) {
      return NextResponse.json({ 
        success: false, 
        message: 'Комната не найдена' 
      }, { status: 404 });
    }

    console.log(`✅ [GET /api/rooms/${roomId}] Комната найдена: ${room.name}`);

    return NextResponse.json({
      success: true,
      room: {
        id: room.id,
        room_code: room.room_code,
        name: room.name,
        host_id: room.host_id,
        max_players: room.max_players,
        current_players: room.current_players,
        status: room.status,
        is_private: room.is_private,
        password: room.password ? true : false, // Не возвращаем сам пароль
        settings: room.settings,
        created_at: room.created_at,
        updated_at: room.updated_at
      }
    });

  } catch (error: any) {
    console.error('❌ Room GET error:', error);
    return NextResponse.json({ 
      success: false, 
      message: 'Ошибка сервера: ' + (error?.message || 'Неизвестная ошибка')
    }, { status: 500 });
  }
}

// DELETE /api/rooms/[roomId] - удалить конкретную комнату
export async function DELETE(req: NextRequest, context: { params: Promise<{ roomId: string }> }) {
  try {
    const params = await context.params;
    const auth = requireAuth(req);
    if ('error' in auth) {
      return NextResponse.json({ success: false, message: auth.error }, { status: 401 });
    }

    const userId = auth.userId;
    const environment = auth.environment;
    const { roomId } = params;
    
    if (!roomId) {
      return NextResponse.json({ success: false, message: 'Room ID required' }, { status: 400 });
    }

    console.log(`🗑️ [DELETE /api/rooms/${roomId}] Удаляем комнату, пользователь: ${userId}`);

    // Проверяем что комната существует и пользователь - хост
    const { data: room, error: roomError } = await supabase
      .from('_pidr_rooms')
      .select('id, host_id, name')
      .eq('id', roomId)
      .single();

    if (roomError || !room) {
      return NextResponse.json({ success: false, message: 'Комната не найдена' }, { status: 404 });
    }

    const { dbUserId } = await getUserIdFromDatabase(userId, environment);
    if (!dbUserId) {
      return NextResponse.json({ success: false, message: 'Пользователь не найден' }, { status: 404 });
    }

    // Проверяем что пользователь - хост
    if (room.host_id !== dbUserId) {
      return NextResponse.json({ 
        success: false, 
        message: 'Только хост может удалить комнату' 
      }, { status: 403 });
    }

    // Удаляем всех игроков из комнаты
    const { error: playersError } = await supabase
      .from('_pidr_room_players')
      .delete()
      .eq('room_id', roomId);

    if (playersError) {
      console.error('❌ Ошибка удаления игроков:', playersError);
      return NextResponse.json({ 
        success: false, 
        message: 'Ошибка удаления игроков: ' + playersError.message 
      }, { status: 500 });
    }

    // Обновляем статус пользователей (убираем их из комнаты)
    const { error: statusError } = await supabase
      .from('_pidr_user_status')
      .update({ 
        current_room_id: null, 
        status: 'online',
        updated_at: new Date().toISOString()
      })
      .eq('current_room_id', roomId);

    if (statusError) {
      console.error('⚠️ Предупреждение: не удалось обновить статус пользователей:', statusError);
      // Не возвращаем ошибку, так как это не критично
    }

    // Удаляем саму комнату
    const { error: deleteError } = await supabase
      .from('_pidr_rooms')
      .delete()
      .eq('id', roomId);

    if (deleteError) {
      console.error('❌ Ошибка удаления комнаты:', deleteError);
      return NextResponse.json({ 
        success: false, 
        message: 'Ошибка удаления комнаты: ' + deleteError.message 
      }, { status: 500 });
    }

    console.log(`✅ [DELETE /api/rooms/${roomId}] Комната "${room.name}" успешно удалена`);

    return NextResponse.json({
      success: true,
      message: `Комната "${room.name}" удалена`
    });

  } catch (error: any) {
    console.error('❌ Room DELETE error:', error);
    return NextResponse.json({ 
      success: false, 
      message: 'Ошибка сервера: ' + (error?.message || 'Неизвестная ошибка')
    }, { status: 500 });
  }
}
