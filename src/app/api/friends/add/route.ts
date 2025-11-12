import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

/**
 * POST /api/friends/add
 * Добавить пользователя в друзья
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const telegramId = request.headers.get('x-telegram-id');
    
    if (!telegramId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const userId = parseInt(telegramId);
    const body = await request.json();
    const { friend_id } = body;

    if (!friend_id || friend_id === userId) {
      return NextResponse.json(
        { success: false, error: 'Invalid friend_id' },
        { status: 400 }
      );
    }

    // Проверяем, не добавлен ли уже
    const { data: existing } = await supabase
      .from('_pidr_friendships')
      .select('id')
      .eq('user_id', userId)
      .eq('friend_id', friend_id)
      .single();

    if (existing) {
      return NextResponse.json(
        { success: false, error: 'Уже в друзьях' },
        { status: 400 }
      );
    }

    // Добавляем в друзья (двухсторонняя связь)
    const { error: error1 } = await supabase
      .from('_pidr_friendships')
      .insert({
        user_id: userId,
        friend_id: friend_id,
        status: 'accepted',
        created_at: new Date().toISOString()
      });

    const { error: error2 } = await supabase
      .from('_pidr_friendships')
      .insert({
        user_id: friend_id,
        friend_id: userId,
        status: 'accepted',
        created_at: new Date().toISOString()
      });

    if (error1 || error2) {
      console.error('❌ Ошибка добавления в друзья:', error1 || error2);
      return NextResponse.json(
        { success: false, error: (error1 || error2)?.message },
        { status: 500 }
      );
    }

    console.log(`✅ Пользователь ${friend_id} добавлен в друзья для ${userId}`);

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

