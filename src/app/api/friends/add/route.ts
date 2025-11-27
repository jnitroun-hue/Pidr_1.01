import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

/**
 * POST /api/friends/add
 * Добавить пользователя в друзья
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabaseAdmin();
    
    if (!supabase) {
      console.error('❌ [FRIENDS ADD] Supabase admin client не инициализирован');
      return NextResponse.json(
        { success: false, error: 'Database connection error' },
        { status: 500 }
      );
    }

    const telegramId = request.headers.get('x-telegram-id');
    
    console.log('➕ [FRIENDS ADD] Начало добавления друга');
    console.log('   Telegram ID из header:', telegramId);
    
    if (!telegramId) {
      console.error('❌ [FRIENDS ADD] Не найден x-telegram-id header');
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const userId = telegramId; // ✅ Оставляем как строку (VARCHAR в БД)
    const body = await request.json();
    const { friend_id } = body;

    console.log('   User ID:', userId);
    console.log('   Friend ID:', friend_id);

    if (!friend_id || String(friend_id) === String(userId)) {
      console.error('❌ [FRIENDS ADD] Невалидный friend_id или попытка добавить себя');
      return NextResponse.json(
        { success: false, error: 'Invalid friend_id' },
        { status: 400 }
      );
    }

    // ✅ Проверяем, существует ли пользователь-друг
    const { data: friendUser, error: friendCheckError } = await supabase
      .from('_pidr_users')
      .select('telegram_id, username')
      .eq('telegram_id', String(friend_id))
      .single();

    if (friendCheckError || !friendUser) {
      console.error('❌ [FRIENDS ADD] Пользователь не найден:', friend_id, friendCheckError);
      return NextResponse.json(
        { success: false, error: 'Пользователь не найден' },
        { status: 404 }
      );
    }

    console.log('✅ [FRIENDS ADD] Пользователь найден:', friendUser.username);

    // Проверяем, не добавлен ли уже
    const { data: existing, error: existingError } = await supabase
      .from('_pidr_friends')
      .select('id, status')
      .eq('user_id', userId)
      .eq('friend_id', friend_id)
      .maybeSingle(); // ✅ Используем maybeSingle вместо single (не выдаст ошибку если не найдено)

    console.log('   Проверка существующей дружбы:', { existing, existingError });

    if (existing) {
      console.warn('⚠️ [FRIENDS ADD] Дружба уже существует со статусом:', existing.status);
      return NextResponse.json(
        { success: false, error: `Уже в друзьях (статус: ${existing.status})` },
        { status: 400 }
      );
    }

    // Добавляем в друзья (двухсторонняя связь)
    console.log('💾 [FRIENDS ADD] Создаём первую связь: user_id =', userId, ', friend_id =', friend_id);
    const { data: friendship1, error: error1 } = await supabase
      .from('_pidr_friends')
      .insert({
        user_id: String(userId),
        friend_id: String(friend_id),
        status: 'accepted',
        created_at: new Date().toISOString()
      })
      .select();

    if (error1) {
      console.error('❌ [FRIENDS ADD] Ошибка создания первой связи:', error1);
      return NextResponse.json(
        { success: false, error: `Ошибка создания дружбы: ${error1.message}` },
        { status: 500 }
      );
    }

    console.log('✅ [FRIENDS ADD] Первая связь создана:', friendship1);

    console.log('💾 [FRIENDS ADD] Создаём вторую связь: user_id =', friend_id, ', friend_id =', userId);
    const { data: friendship2, error: error2 } = await supabase
      .from('_pidr_friends')
      .insert({
        user_id: String(friend_id),
        friend_id: String(userId),
        status: 'accepted',
        created_at: new Date().toISOString()
      })
      .select();

    if (error2) {
      console.error('❌ [FRIENDS ADD] Ошибка создания второй связи:', error2);
      // Откатываем первую связь
      await supabase
        .from('_pidr_friends')
        .delete()
        .eq('user_id', userId)
        .eq('friend_id', friend_id);
      
      return NextResponse.json(
        { success: false, error: `Ошибка создания обратной связи: ${error2.message}` },
        { status: 500 }
      );
    }

    console.log('✅ [FRIENDS ADD] Вторая связь создана:', friendship2);
    console.log(`✅ [FRIENDS ADD] Пользователи ${userId} и ${friend_id} теперь друзья!`);

    return NextResponse.json({
      success: true,
      message: 'Друг добавлен!'
    });

  } catch (error: any) {
    console.error('❌ Ошибка API /api/friends/add:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

