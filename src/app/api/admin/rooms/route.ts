import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../lib/supabase';
import { requireAdmin } from '../../../../lib/admin-utils';

// GET /api/admin/rooms - Получить список комнат для админа
export async function GET(req: NextRequest) {
  try {
    // Проверка прав администратора
    const adminCheck = await requireAdmin(req);
    if (!adminCheck.isAdmin) {
      return NextResponse.json({
        success: false,
        error: adminCheck.error || 'Требуются права администратора'
      }, { status: adminCheck.error?.includes('Unauthorized') ? 401 : 403 });
    }

    // Получаем параметры пагинации
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = (page - 1) * limit;

    // Загружаем комнаты
    const { data: rooms, error: roomsError } = await supabaseAdmin
      .from('_pidr_rooms')
      .select('*')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (roomsError) {
      console.error('❌ Ошибка загрузки комнат:', roomsError);
      return NextResponse.json({ success: false, error: roomsError.message }, { status: 500 });
    }

    // Получаем общее количество комнат
    const { count } = await supabaseAdmin
      .from('_pidr_rooms')
      .select('*', { count: 'exact', head: true });

    // Обогащаем данные о комнатах информацией о игроках
    const roomsWithPlayers = await Promise.all((rooms || []).map(async (room: any) => {
      const { data: players } = await supabaseAdmin
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
