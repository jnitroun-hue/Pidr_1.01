import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { requireAuth } from '@/lib/auth-utils';

// DELETE /api/rooms/[roomId] - удалить конкретную комнату
export async function DELETE(req: NextRequest, { params }: { params: { roomId: string } }) {
  try {
    const auth = requireAuth(req);
    if (auth.error) {
      return NextResponse.json({ success: false, message: auth.error }, { status: 401 });
    }

    const userId = auth.userId as string;
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

    // Проверяем что пользователь - хост
    if (room.host_id !== userId) {
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
