import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { requireAuth } from '@/lib/auth-utils';

// POST /api/rooms/[roomId]/invite
// Создать приглашение другу в комнату
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ roomId: string }> }
) {
  try {
    const { roomId } = await context.params;
    const auth = await requireAuth(request);
    if (auth.error) {
      return NextResponse.json({ success: false, message: auth.error }, { status: 401 });
    }

    const fromTelegramId = auth.userId as string;
    const body = await request.json();
    const { friendId } = body as { friendId?: string | number };

    if (!friendId) {
      return NextResponse.json(
        { success: false, message: 'friendId обязателен' },
        { status: 400 }
      );
    }

    const toTelegramId = String(friendId);
    if (toTelegramId === fromTelegramId) {
      return NextResponse.json(
        { success: false, message: 'Нельзя пригласить самого себя' },
        { status: 400 }
      );
    }

    // Проверяем существование комнаты
    const { data: room, error: roomError } = await supabase
      .from('_pidr_rooms')
      .select('*')
      .eq('id', roomId)
      .in('status', ['waiting', 'playing'])
      .single();

    if (roomError || !room) {
      return NextResponse.json(
        { success: false, message: 'Комната не найдена или уже закрыта' },
        { status: 404 }
      );
    }

    // Проверяем, что отправитель действительно в этой комнате
    const { data: senderPlayer } = await supabase
      .from('_pidr_room_players')
      .select('id')
      .eq('room_id', roomId)
      .eq('user_id', fromTelegramId)
      .maybeSingle();

    if (!senderPlayer) {
      return NextResponse.json(
        { success: false, message: 'Вы не находитесь в этой комнате' },
        { status: 403 }
      );
    }

    // Проверяем, что пользователи являются друзьями
    const { data: friendship } = await supabase
      .from('_pidr_friends')
      .select('id, status')
      .eq('user_id', fromTelegramId)
      .eq('friend_id', toTelegramId)
      .maybeSingle();

    if (!friendship || friendship.status !== 'accepted') {
      return NextResponse.json(
        { success: false, message: 'Этот пользователь не в вашем списке друзей' },
        { status: 403 }
      );
    }

    const now = new Date();
    const expiresAt = new Date(now.getTime() + 10 * 60 * 1000).toISOString(); // 10 минут

    // Создаем приглашение
    const { data: invite, error: inviteError } = await supabase
      .from('_pidr_room_invites')
      .insert({
        room_id: parseInt(roomId, 10),
        room_code: room.room_code,
        from_user_id: parseInt(fromTelegramId, 10),
        to_user_id: parseInt(toTelegramId, 10),
        status: 'pending',
        expires_at: expiresAt
      })
      .select()
      .single();

    if (inviteError || !invite) {
      console.error('❌ [ROOM INVITE] Ошибка создания приглашения:', inviteError);
      return NextResponse.json(
        { success: false, message: 'Не удалось создать приглашение' },
        { status: 500 }
      );
    }

    console.log('✅ [ROOM INVITE] Приглашение создано:', invite);

    return NextResponse.json({
      success: true,
      invite
    });
  } catch (error: any) {
    console.error('❌ [ROOM INVITE] Ошибка API:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Внутренняя ошибка сервера' },
      { status: 500 }
    );
  }
}


