import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { requireAuth } from '@/lib/auth-utils';

// GET /api/user/bot-games - Получить количество сыгранных игр (используем total_games)
export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    if (auth.error) {
      return NextResponse.json({ success: false, error: auth.error }, { status: 401 });
    }

    const userId = auth.userId as string;

    const { data: user, error } = await supabase
      .from('_pidr_users')
      .select('total_games')
      .eq('telegram_id', userId)
      .single();

    if (error) {
      console.error('❌ [GAMES] Ошибка получения данных:', error);
      return NextResponse.json({ 
        success: false, 
        error: 'Ошибка получения данных' 
      }, { status: 500 });
    }

    const gamesPlayed = user?.total_games || 0;

    return NextResponse.json({
      success: true,
      gamesPlayed: gamesPlayed,
      canPlayMultiplayer: gamesPlayed >= 3
    });

  } catch (error: any) {
    console.error('❌ [GAMES] Ошибка:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Внутренняя ошибка сервера' 
    }, { status: 500 });
  }
}

