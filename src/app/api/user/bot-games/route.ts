import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { requireAuth } from '@/lib/auth-utils';

// GET /api/user/bot-games - Получить количество сыгранных игр с ботами
export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    if (auth.error) {
      return NextResponse.json({ success: false, error: auth.error }, { status: 401 });
    }

    const userId = auth.userId as string;

    const { data: user, error } = await supabase
      .from('_pidr_users')
      .select('bot_games_played')
      .eq('telegram_id', userId)
      .single();

    if (error) {
      console.error('❌ [BOT GAMES] Ошибка получения данных:', error);
      return NextResponse.json({ 
        success: false, 
        error: 'Ошибка получения данных' 
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      botGamesPlayed: user?.bot_games_played || 0,
      canPlayMultiplayer: (user?.bot_games_played || 0) >= 3
    });

  } catch (error: any) {
    console.error('❌ [BOT GAMES] Ошибка:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Внутренняя ошибка сервера' 
    }, { status: 500 });
  }
}

// POST /api/user/bot-games - Увеличить счетчик игр с ботами
export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    if (auth.error) {
      return NextResponse.json({ success: false, error: auth.error }, { status: 401 });
    }

    const userId = auth.userId as string;

    // Получаем текущее значение
    const { data: user, error: fetchError } = await supabase
      .from('_pidr_users')
      .select('bot_games_played')
      .eq('telegram_id', userId)
      .single();

    if (fetchError) {
      console.error('❌ [BOT GAMES] Ошибка получения данных:', fetchError);
      return NextResponse.json({ 
        success: false, 
        error: 'Ошибка получения данных' 
      }, { status: 500 });
    }

    const currentCount = user?.bot_games_played || 0;
    const newCount = currentCount + 1;

    // Обновляем счетчик
    const { error: updateError } = await supabase
      .from('_pidr_users')
      .update({ 
        bot_games_played: newCount,
        updated_at: new Date().toISOString()
      })
      .eq('telegram_id', userId);

    if (updateError) {
      console.error('❌ [BOT GAMES] Ошибка обновления:', updateError);
      return NextResponse.json({ 
        success: false, 
        error: 'Ошибка обновления счетчика' 
      }, { status: 500 });
    }

    console.log(`✅ [BOT GAMES] Игр с ботами: ${currentCount} → ${newCount}`);

    return NextResponse.json({
      success: true,
      botGamesPlayed: newCount,
      canPlayMultiplayer: newCount >= 3
    });

  } catch (error: any) {
    console.error('❌ [BOT GAMES] Ошибка:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Внутренняя ошибка сервера' 
    }, { status: 500 });
  }
}

