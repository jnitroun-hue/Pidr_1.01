import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '../../../../lib/supabase';
import { requireAuth } from '../../../../lib/auth-utils';

// GET /api/admin/rooms - Получить список комнат для админа
export async function GET(req: NextRequest) {
  try {
    // Проверка прав администратора
    const auth = requireAuth(req);
    if (auth.error) {
      return NextResponse.json({ success: false, error: 'Требуется авторизация' }, { status: 401 });
    }

    // Проверяем, является ли пользователь админом
    const { data: user } = await supabase
      .from('_pidr_users')
      .select('is_admin')
      .or(`telegram_id.eq.${auth.userId},id.eq.${auth.userId}`)
      .single();

    if (!user || !user.is_admin) {
      return NextResponse.json({ success: false, error: 'Доступ запрещен' }, { status: 403 });
    }

    // Получаем параметры пагинации
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = (page - 1) * limit;

    // Загружаем комнаты
    const { data: rooms, error: roomsError } = await supabase
      .from('_pidr_rooms')
      .select('*')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (roomsError) {
      console.error('❌ Ошибка загрузки комнат:', roomsError);
      return NextResponse.json({ success: false, error: roomsError.message }, { status: 500 });
    }

    // Получаем общее количество комнат
    const { count } = await supabase
      .from('_pidr_rooms')
      .select('*', { count: 'exact', head: true });

    // Обогащаем данные о комнатах информацией о игроках
    const roomsWithPlayers = await Promise.all((rooms || []).map(async (room: any) => {
      const { data: players } = await supabase
        .from('_pidr_room_players')
        .select('user_id, username, is_host, is_ready')
        .eq('room_id', room.id);

      return {
        ...room,
        players: players || [],
        playersCount: players?.length || 0
      };
    }));

    return NextResponse.json({
      success: true,
      rooms: roomsWithPlayers,
      pagination: {
        page,
        limit,
        totalPages: Math.ceil((count || 0) / limit),
        total: count || 0
      }
    });
  } catch (error: any) {
    console.error('❌ Ошибка получения комнат:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

