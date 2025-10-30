/**
 * ============================================================
 * ROOM PLAYERS API
 * ============================================================
 * API для получения списка игроков в комнате
 * Использует Redis для real-time данных + PostgreSQL для детальной информации
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '../../../../../lib/supabase';
import { getRoomPlayers, getRoomDetails } from '../../../../../lib/multiplayer/player-state-manager';

interface RouteParams {
  params: Promise<{
    roomId: string;
  }>;
}

export async function GET(
  req: NextRequest,
  { params }: RouteParams
) {
  try {
    const { roomId } = await params; // ✅ AWAIT для Next.js 15!
    if (!roomId) {
      return NextResponse.json({ success: false, message: 'Room ID обязателен' }, { status: 400 });
    }

    // 1) Пытаемся получить игроков комнаты из БД (без join)
    const { data: dbPlayers, error: playersError } = await supabase
      .from('_pidr_room_players')
      .select('user_id, username, position, is_host, is_ready, is_bot, joined_at, avatar_url')
      .eq('room_id', roomId)
      .order('position', { ascending: true });

    if (playersError) {
      return NextResponse.json({ success: false, message: 'Ошибка загрузки игроков: ' + playersError.message }, { status: 500 });
    }

    const players = dbPlayers || [];

    // 2) Подтягиваем профили пользователей одним запросом IN
    let usersMap: Record<string, { avatar_url?: string; rating?: number; games_won?: number; games_played?: number }> = {};
    if (players.length > 0) {
      const userIds = [...new Set(players.map((p: { user_id: string }) => p.user_id))];
      const { data: usersData, error: usersError } = await supabase
        .from('_pidr_users')
        .select('id, avatar_url, rating, games_won, games_played')
        .in('id', userIds);

      if (!usersError && usersData) {
        usersMap = usersData.reduce((acc: Record<string, any>, u: any) => {
          acc[u.id] = { avatar_url: u.avatar_url, rating: u.rating, games_won: u.games_won, games_played: u.games_played };
          return acc;
        }, {} as Record<string, any>);
      }
    }

    // 3) Обогащаем игроков данными профиля и Redis слотами (не критично)
    let redisSlots: Record<string, string> = {};
    try {
      const details = await getRoomDetails(roomId);
      redisSlots = details?.slots || {};
    } catch (_) {}

    const enrichedPlayers = players.map((p: { user_id: string; username: string; position: number; is_host: boolean; is_ready: boolean; is_bot: boolean; joined_at: string; avatar_url?: string | null }) => {
      const profile = usersMap[p.user_id] || {};
      const redisPosition = Object.entries(redisSlots).find(([, uid]) => uid === p.user_id)?.[0] || null;
      return {
        user_id: p.user_id,
        username: p.username,
        position: p.position,
        is_host: p.is_host,
        is_ready: p.is_ready,
        is_bot: p.is_bot,
        joined_at: p.joined_at,
        // Приоритет: avatar_url из room_players (для ботов), затем из users (для реальных игроков)
        avatar_url: p.avatar_url || profile.avatar_url || null,
        rating: profile.rating || 0,
        games_won: profile.games_won || 0,
        games_played: profile.games_played || 0,
        redis_position: redisPosition,
      };
    });

    return NextResponse.json({ success: true, players: enrichedPlayers, count: enrichedPlayers.length });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: 'Internal server error: ' + error.message }, { status: 500 });
  }
}
