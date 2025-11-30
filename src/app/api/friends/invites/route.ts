import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

// GET /api/friends/invites - получить активные приглашения в комнаты для текущего пользователя
export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabaseAdmin();
    if (!supabase) {
      console.error('❌ [FRIENDS INVITES] Supabase admin client не инициализирован');
      return NextResponse.json(
        { success: false, message: 'Database connection error' },
        { status: 500 }
      );
    }

    const telegramId = request.headers.get('x-telegram-id');
    if (!telegramId) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const toUserId = parseInt(telegramId, 10);
    if (isNaN(toUserId)) {
      return NextResponse.json(
        { success: false, message: 'Некорректный telegram_id' },
        { status: 400 }
      );
    }

    const nowIso = new Date().toISOString();

    // Получаем все активные приглашения
    const { data: invites, error } = await supabase
      .from('_pidr_room_invites')
      .select('id, room_id, room_code, from_user_id, created_at, expires_at, status')
      .eq('to_user_id', toUserId)
      .eq('status', 'pending')
      .gt('expires_at', nowIso)
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) {
      console.error('❌ [FRIENDS INVITES] Ошибка получения приглашений:', error);
      return NextResponse.json(
        { success: false, message: 'Ошибка получения приглашений' },
        { status: 500 }
      );
    }

    // Обогащаем данными о комнатах и отправителях
    const detailed = await Promise.all(
      (invites || []).map(async (invite) => {
        const [roomRes, userRes] = await Promise.all([
          supabase
            .from('_pidr_rooms')
            .select('id, room_code, name, status, max_players, current_players')
            .eq('id', invite.room_id)
            .single(),
          supabase
            .from('_pidr_users')
            .select('telegram_id, username, first_name, avatar_url, status')
            .eq('telegram_id', invite.from_user_id)
            .single()
        ]);

        return {
          id: invite.id,
          room: roomRes.data || null,
          from: userRes.data || null,
          created_at: invite.created_at,
          expires_at: invite.expires_at
        };
      })
    );

    return NextResponse.json({
      success: true,
      invites: detailed
    });
  } catch (error: any) {
    console.error('❌ [FRIENDS INVITES] Ошибка API:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Внутренняя ошибка сервера' },
      { status: 500 }
    );
  }
}


