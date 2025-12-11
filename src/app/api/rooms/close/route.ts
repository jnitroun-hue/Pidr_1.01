import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '../../../../lib/supabase';
import jwt from 'jsonwebtoken';
import { checkRateLimit, getRateLimitId } from '../../../../lib/ratelimit';

const JWT_SECRET = process.env.JWT_SECRET;

function getUserIdFromRequest(req: NextRequest): string | null {
  if (!JWT_SECRET) return null;
  const auth = req.headers.get('authorization');
  if (!auth) return null;
  const token = auth.replace('Bearer ', '');
  try {
    const payload = jwt.verify(token, JWT_SECRET) as any;
    return payload.userId;
  } catch {
    return null;
  }
}

// POST /api/rooms/close - Закрыть комнату (только для создателя)
export async function POST(req: NextRequest) {
  const userId = getUserIdFromRequest(req);
  if (!userId) {
    return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
  }

  // Rate limiting
  const id = getRateLimitId(req);
  const { success } = await checkRateLimit(`rooms_close:${id}`);
  if (!success) {
    return NextResponse.json({ success: false, message: 'Too many requests' }, { status: 429 });
  }

  try {
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

    if (room.host_id !== userId) {
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

    // ✅ ИСПРАВЛЕНО: Обновляем статус ТОЛЬКО РЕАЛЬНЫХ игроков (НЕ БОТОВ)
    if (players && players.length > 0) {
      // Фильтруем только реальных игроков (положительные ID)
      const realPlayerIds = players
        .filter((p: any) => parseInt(p.user_id) > 0)
        .map((p: any) => p.user_id);
      
      if (realPlayerIds.length > 0) {
        await supabase
          .from('_pidr_user_status')
          .update({ 
            status: 'online',
            current_room_id: null,
            updated_at: new Date().toISOString()
          })
          .in('user_id', realPlayerIds);
        
        console.log(`✅ [Close Room] Обновлен статус ${realPlayerIds.length} реальных игроков (боты исключены)`);
      }
    }

    return NextResponse.json({ 
      success: true, 
      message: `Комната "${room.name}" успешно закрыта`
    });

  } catch (error: unknown) {
    console.error('Room close error:', error);
    return NextResponse.json({ 
      success: false, 
      message: 'Внутренняя ошибка сервера' 
    }, { status: 500 });
  }
}
