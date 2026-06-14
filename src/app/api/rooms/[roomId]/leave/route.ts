import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin as supabase } from '@/lib/supabase';
import { requireAuth } from '@/lib/auth-utils';
import { atomicLeaveRoom } from '@/lib/multiplayer/player-state-manager';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** POST /api/rooms/[roomId]/leave — атомарный выход (Redis + БД + пересчёт) */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ roomId: string }> }
) {
  try {
    const params = await context.params;
    const roomId = params.roomId;

    const auth = requireAuth(request);
    if (auth.error || !auth.userId) {
      return NextResponse.json({ success: false, message: auth.error || 'Требуется авторизация' }, { status: 401 });
    }

    console.log(`🚪 [POST /api/rooms/${roomId}/leave] user=${auth.userId}`);

    const leaveResult = await atomicLeaveRoom({
      userId: String(auth.userId),
      roomId,
    });

    if (!leaveResult.success) {
      return NextResponse.json(
        { success: false, message: leaveResult.error || 'Не удалось выйти из комнаты' },
        { status: 500 }
      );
    }

    const { data: room } = await supabase
      .from('_pidr_rooms')
      .select('host_id, current_players')
      .eq('id', roomId)
      .maybeSingle();

    if (room && (room.current_players ?? 0) === 0) {
      await supabase.from('_pidr_rooms').delete().eq('id', roomId);
      console.log(`🗑️ [leave] Пустая комната ${roomId} удалена`);
    }

    return NextResponse.json({ success: true, message: 'Вы покинули комнату' });
  } catch (error: unknown) {
    console.error('❌ [leave] Ошибка:', error);
    return NextResponse.json(
      { success: false, message: 'Внутренняя ошибка сервера' },
      { status: 500 }
    );
  }
}
