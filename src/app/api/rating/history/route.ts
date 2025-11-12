import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * GET /api/rating/history?userId=123&limit=20
 * Получает историю рейтинга игрока
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const limit = parseInt(searchParams.get('limit') || '20');

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Missing userId parameter' },
        { status: 400 }
      );
    }

    // Вызываем SQL функцию для получения истории
    const { data, error } = await supabase.rpc('get_user_rating_history', {
      p_user_id: parseInt(userId),
      p_limit: limit
    });

    if (error) {
      console.error('❌ Ошибка получения истории рейтинга:', error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    console.log(`✅ История рейтинга получена для пользователя ${userId}:`, data?.length || 0, 'игр');

    return NextResponse.json({
      success: true,
      history: data || []
    });

  } catch (error: any) {
    console.error('❌ Ошибка API /api/rating/history:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

