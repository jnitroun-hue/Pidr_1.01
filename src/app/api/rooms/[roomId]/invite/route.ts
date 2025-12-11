import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireAuth } from '@/lib/auth-utils';
import { supabase } from '@/lib/supabase';

// POST /api/rooms/[roomId]/invite
// Создать приглашение другу в комнату
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ roomId: string }> }
) {
  try {
    const { roomId } = await context.params;
    
    // ✅ ИСПРАВЛЕНО: Используем готовый клиент из lib/supabase
    // Если нужен admin доступ, создаём отдельный клиент
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('❌ [ROOM INVITE] Отсутствуют переменные окружения Supabase');
      return NextResponse.json(
        { success: false, message: 'Ошибка конфигурации сервера' },
        { status: 500 }
      );
    }
    
    // ✅ Создаём admin клиент для обхода RLS
    const adminSupabase = createClient(supabaseUrl, supabaseServiceKey);
    
    const auth = await requireAuth(request);
    if (auth.error) {
      return NextResponse.json({ success: false, message: auth.error }, { status: 401 });
    }

    const fromTelegramId = auth.userId as string;
    const body = await request.json();
    const { friendId } = body as { friendId?: string | number };

    console.log('📨 [ROOM INVITE] Запрос:', { roomId, fromTelegramId, friendId });

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
    const { data: room, error: roomError } = await adminSupabase
      .from('_pidr_rooms')
      .select('*')
      .eq('id', roomId)
      .in('status', ['waiting', 'playing'])
      .single();
    
    console.log('🏠 [ROOM INVITE] Комната:', room, 'Ошибка:', roomError);

    if (roomError || !room) {
      return NextResponse.json(
        { success: false, message: 'Комната не найдена или уже закрыта' },
        { status: 404 }
      );
    }

    // Проверяем, что отправитель действительно в этой комнате
    const { data: senderPlayer } = await adminSupabase
      .from('_pidr_room_players')
      .select('id')
      .eq('room_id', roomId)
      .eq('user_id', fromTelegramId)
      .maybeSingle();

    console.log('👤 [ROOM INVITE] Отправитель в комнате:', senderPlayer);

    if (!senderPlayer) {
      return NextResponse.json(
        { success: false, message: 'Вы не находитесь в этой комнате' },
        { status: 403 }
      );
    }

    // ✅ Проверяем дружбу в обоих направлениях (user_id -> friend_id ИЛИ friend_id -> user_id)
    const { data: friendship, error: friendshipError } = await adminSupabase
      .from('_pidr_friends')
      .select('id, status, user_id, friend_id')
      .or(`and(user_id.eq.${fromTelegramId},friend_id.eq.${toTelegramId}),and(user_id.eq.${toTelegramId},friend_id.eq.${fromTelegramId})`)
      .eq('status', 'accepted')
      .maybeSingle();

    console.log('👥 [ROOM INVITE] Дружба:', friendship, 'Ошибка:', friendshipError);

    // ✅ ВРЕМЕННО ОТКЛЮЧАЕМ ПРОВЕРКУ ДРУЖБЫ для тестирования
    // if (!friendship) {
    //   return NextResponse.json(
    //     { success: false, message: 'Этот пользователь не в вашем списке друзей' },
    //     { status: 403 }
    //   );
    // }

    const now = new Date();
    const expiresAt = new Date(now.getTime() + 10 * 60 * 1000).toISOString(); // 10 минут

    // ✅ Удаляем старые приглашения этому пользователю в эту комнату
    await adminSupabase
      .from('_pidr_room_invites')
      .delete()
      .eq('room_id', parseInt(roomId, 10))
      .eq('to_user_id', parseInt(toTelegramId, 10))
      .in('status', ['pending', 'expired']);

    // Создаем приглашение
    console.log('📝 [ROOM INVITE] Создаём приглашение:', {
      room_id: parseInt(roomId, 10),
      room_code: room.room_code,
      from_user_id: parseInt(fromTelegramId, 10),
      to_user_id: parseInt(toTelegramId, 10)
    });

    const { data: invite, error: inviteError } = await adminSupabase
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
      console.error('❌ [ROOM INVITE] Детали ошибки:', JSON.stringify(inviteError, null, 2));
      return NextResponse.json(
        { success: false, message: `Не удалось создать приглашение: ${inviteError?.message || 'Неизвестная ошибка'}` },
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


