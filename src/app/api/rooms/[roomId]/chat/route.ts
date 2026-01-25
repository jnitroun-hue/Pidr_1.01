import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { requireAuth } from '@/lib/auth-utils';

// 💬 API ДЛЯ ЧАТА В КОМНАТЕ

// GET: Получить историю сообщений
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ roomId: string }> }
) {
  try {
    const params = await context.params;
    const roomId = params.roomId;
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');

    console.log(`💬 [CHAT] Получение истории для комнаты ${roomId}, limit=${limit}`);

    // ПОЛУЧАЕМ ПОСЛЕДНИЕ СООБЩЕНИЯ
    const { data: messages, error } = await supabase
      .from('_pidr_room_chat')
      .select('*')
      .eq('room_id', roomId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('❌ [CHAT] Ошибка получения сообщений:', error);
      return NextResponse.json({ 
        success: false, 
        error: error.message 
      }, { status: 500 });
    }

    // РЕВЕРСИРУЕМ (чтобы старые были первыми)
    const sortedMessages = (messages || []).reverse();

    console.log(`✅ [CHAT] Получено ${sortedMessages.length} сообщений`);

    return NextResponse.json({
      success: true,
      messages: sortedMessages
    });

  } catch (error: any) {
    console.error('❌ [CHAT] Ошибка:', error);
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
}

// POST: Отправить сообщение
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ roomId: string }> }
) {
  try {
    const params = await context.params;
    // ПРОВЕРЯЕМ АВТОРИЗАЦИЮ
    const auth = await requireAuth(request);
    if (auth.error) {
      return NextResponse.json({ success: false, message: auth.error }, { status: 401 });
    }

    const telegramId = auth.userId as string;
    const roomId = params.roomId;
    const body = await request.json();
    const { message, message_type = 'text' } = body;

    if (!message || !message.trim()) {
      return NextResponse.json({ 
        success: false, 
        message: 'Сообщение не может быть пустым' 
      }, { status: 400 });
    }

    console.log(`💬 [CHAT] Отправка сообщения от ${telegramId} в комнату ${roomId}`);

    // ПОЛУЧАЕМ ДАННЫЕ ПОЛЬЗОВАТЕЛЯ
    const { data: userData, error: userError } = await supabase
      .from('_pidr_users')
      .select('username, first_name')
      .eq('telegram_id', telegramId)
      .single();

    if (userError || !userData) {
      console.error(`❌ [CHAT] Пользователь не найден:`, userError);
      return NextResponse.json({ 
        success: false, 
        message: 'Пользователь не найден' 
      }, { status: 404 });
    }

    const username = userData.username || userData.first_name || 'Аноним';

    // ПРОВЕРЯЕМ СУЩЕСТВОВАНИЕ КОМНАТЫ
    const { data: room, error: roomError } = await supabase
      .from('_pidr_rooms')
      .select('id')
      .eq('id', roomId)
      .single();

    if (roomError || !room) {
      return NextResponse.json({ 
        success: false, 
        message: 'Комната не найдена' 
      }, { status: 404 });
    }

    // ПРОВЕРЯЕМ ЧТО ПОЛЬЗОВАТЕЛЬ В КОМНАТЕ
    const { data: playerInRoom } = await supabase
      .from('_pidr_room_players')
      .select('id')
      .eq('room_id', roomId)
      .eq('user_id', telegramId)
      .single();

    if (!playerInRoom) {
      return NextResponse.json({ 
        success: false, 
        message: 'Вы не в этой комнате' 
      }, { status: 403 });
    }

    // ВСТАВЛЯЕМ СООБЩЕНИЕ
    const { data: newMessage, error: insertError } = await supabase
      .from('_pidr_room_chat')
      .insert({
        room_id: parseInt(roomId),
        user_id: parseInt(telegramId),
        username: username,
        message: message.trim(),
        message_type: message_type
      })
      .select()
      .single();

    if (insertError) {
      console.error('❌ [CHAT] Ошибка вставки сообщения:', insertError);
      return NextResponse.json({ 
        success: false, 
        error: insertError.message 
      }, { status: 500 });
    }

    console.log(`✅ [CHAT] Сообщение отправлено: ID=${newMessage.id}`);

    return NextResponse.json({
      success: true,
      message: newMessage
    });

  } catch (error: any) {
    console.error('❌ [CHAT] Ошибка:', error);
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
}

