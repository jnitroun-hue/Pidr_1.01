import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * POST /api/rating/save-game
 * Сохраняет результат рейтинговой игры
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { roomId, winnerId, totalPlayers, gameDurationSeconds, players } = body;

    // Валидация
    if (!roomId || !winnerId || !totalPlayers || !players || !Array.isArray(players)) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Вызываем SQL функцию для сохранения результата
    const { data, error } = await supabase.rpc('save_ranked_game_result', {
      p_room_id: roomId,
      p_winner_id: winnerId,
      p_total_players: totalPlayers,
      p_game_duration_seconds: gameDurationSeconds || 0,
      p_players: players
    });

    if (error) {
      console.error('❌ Ошибка сохранения рейтинговой игры:', error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    console.log('✅ Рейтинговая игра сохранена:', data);

    return NextResponse.json({
      success: true,
      gameId: data.game_id
    });

  } catch (error: any) {
    console.error('❌ Ошибка API /api/rating/save-game:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

