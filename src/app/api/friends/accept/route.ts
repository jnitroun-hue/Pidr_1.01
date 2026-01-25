import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

/**
 * POST /api/friends/accept
 * Принять запрос в друзья
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabaseAdmin();
    
    if (!supabase) {
      console.error('❌ [FRIENDS ACCEPT] Supabase admin client не инициализирован');
      return NextResponse.json(
        { success: false, error: 'Database connection error' },
        { status: 500 }
      );
    }

    const telegramId = request.headers.get('x-telegram-id');
    
    if (!telegramId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const userId = telegramId;
    const body = await request.json();
    const { friend_id } = body;

    if (!friend_id) {
      return NextResponse.json(
        { success: false, error: 'friend_id обязателен' },
        { status: 400 }
      );
    }

    console.log(`✅ [FRIENDS ACCEPT] Пользователь ${userId} принимает запрос от ${friend_id}`);

    // Проверяем, есть ли pending запрос от friend_id к userId
    const { data: pendingRequest, error: checkError } = await supabase
      .from('_pidr_friends')
      .select('id, status')
      .eq('user_id', friend_id)
      .eq('friend_id', userId)
      .eq('status', 'pending')
      .maybeSingle();

    if (checkError || !pendingRequest) {
      console.error('❌ [FRIENDS ACCEPT] Запрос не найден:', checkError);
      return NextResponse.json(
        { success: false, error: 'Запрос в друзья не найден' },
        { status: 404 }
      );
    }

    // Обновляем статус запроса на 'accepted'
    const { error: updateError } = await supabase
      .from('_pidr_friends')
      .update({ status: 'accepted' })
      .eq('id', pendingRequest.id);

    if (updateError) {
      console.error('❌ [FRIENDS ACCEPT] Ошибка обновления статуса:', updateError);
      return NextResponse.json(
        { success: false, error: 'Ошибка принятия запроса' },
        { status: 500 }
      );
    }

    // Создаем обратную связь (userId -> friend_id) со статусом 'accepted'
    const { data: existingReverse, error: reverseCheckError } = await supabase
      .from('_pidr_friends')
      .select('id')
      .eq('user_id', userId)
      .eq('friend_id', friend_id)
      .maybeSingle();

    if (!existingReverse) {
      const { error: insertError } = await supabase
        .from('_pidr_friends')
        .insert({
          user_id: String(userId),
          friend_id: String(friend_id),
          status: 'accepted',
          created_at: new Date().toISOString()
        });

      if (insertError) {
        console.error('❌ [FRIENDS ACCEPT] Ошибка создания обратной связи:', insertError);
      } else {
        console.log('✅ [FRIENDS ACCEPT] Обратная связь создана');
      }
    }

    console.log(`✅ [FRIENDS ACCEPT] Пользователи ${userId} и ${friend_id} теперь друзья!`);

    return NextResponse.json({
      success: true,
      message: 'Запрос принят!'
    });

  } catch (error: any) {
    console.error('❌ Ошибка API /api/friends/accept:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

