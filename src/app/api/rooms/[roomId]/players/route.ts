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
  params: {
    roomId: string;
  };
}

/**
 * GET /api/rooms/[roomId]/players
 * Получить список всех игроков в комнате
 */
export async function GET(
  req: NextRequest,
  { params }: RouteParams
) {
  try {
    const { roomId } = params;
    
    if (!roomId) {
      return NextResponse.json({
        success: false,
        message: 'Room ID обязателен'
      }, { status: 400 });
    }
    
    console.log(`📋 [GET PLAYERS] Загрузка игроков для комнаты ${roomId}`);
    
    // 1. ПОЛУЧАЕМ ДЕТАЛИ ИЗ REDIS
    const roomDetails = await getRoomDetails(roomId);
    
    if (!roomDetails) {
      console.warn(`⚠️ [GET PLAYERS] Комната ${roomId} не найдена в Redis`);
      // Fallback к БД
      return await getPlayersFromDatabase(roomId);
    }
    
    const { players: playerIds, slots } = roomDetails;
    
    console.log(`📊 [GET PLAYERS] Найдено ${playerIds.length} игроков в Redis`);
    
    // 2. ПОЛУЧАЕМ ДЕТАЛЬНУЮ ИНФОРМАЦИЮ ИЗ БД
    if (playerIds.length === 0) {
      return NextResponse.json({
        success: true,
        players: [],
        count: 0
      });
    }
    
    const { data: players, error } = await supabase
      .from('_pidr_room_players')
      .select(`
        user_id,
        username,
        position,
        is_host,
        is_ready,
        is_bot,
        joined_at,
        _pidr_users!inner(
          avatar_url,
          rating,
          games_won,
          games_played
        )
      `)
      .eq('room_id', roomId)
      .in('user_id', playerIds)
      .order('position', { ascending: true });
    
    if (error) {
      console.error(`❌ [GET PLAYERS] Ошибка загрузки из БД:`, error);
      return NextResponse.json({
        success: false,
        message: 'Ошибка загрузки игроков: ' + error.message
      }, { status: 500 });
    }
    
    // 3. ФОРМИРУЕМ ОТВЕТ
    const enrichedPlayers = (players || []).map((player: any) => {
      const userData = Array.isArray(player._pidr_users) 
        ? player._pidr_users[0] 
        : player._pidr_users;
      
      return {
        user_id: player.user_id,
        username: player.username,
        position: player.position,
        is_host: player.is_host,
        is_ready: player.is_ready,
        is_bot: player.is_bot,
        joined_at: player.joined_at,
        avatar_url: userData?.avatar_url || null,
        rating: userData?.rating || 0,
        games_won: userData?.games_won || 0,
        games_played: userData?.games_played || 0,
        // Добавляем информацию из Redis
        in_redis: playerIds.includes(player.user_id),
        redis_position: Object.entries(slots).find(([pos, uid]) => uid === player.user_id)?.[0] || null
      };
    });
    
    console.log(`✅ [GET PLAYERS] Загружено ${enrichedPlayers.length} игроков`);
    
    return NextResponse.json({
      success: true,
      players: enrichedPlayers,
      count: enrichedPlayers.length,
      redis_count: playerIds.length
    });
    
  } catch (error: any) {
    console.error('❌ [GET PLAYERS] Ошибка:', error);
    return NextResponse.json({
      success: false,
      message: 'Internal server error: ' + error.message
    }, { status: 500 });
  }
}

/**
 * Fallback: Получить игроков только из БД
 */
async function getPlayersFromDatabase(roomId: string) {
  console.log(`📦 [GET PLAYERS] Fallback к БД для комнаты ${roomId}`);
  
  const { data: players, error } = await supabase
    .from('_pidr_room_players')
    .select(`
      user_id,
      username,
      position,
      is_host,
      is_ready,
      is_bot,
      joined_at,
      _pidr_users!inner(
        avatar_url,
        rating,
        games_won,
        games_played
      )
    `)
    .eq('room_id', roomId)
    .order('position', { ascending: true });
  
  if (error) {
    return NextResponse.json({
      success: false,
      message: 'Ошибка загрузки игроков: ' + error.message
    }, { status: 500 });
  }
  
  const enrichedPlayers = (players || []).map((player: any) => {
    const userData = Array.isArray(player._pidr_users) 
      ? player._pidr_users[0] 
      : player._pidr_users;
    
    return {
      user_id: player.user_id,
      username: player.username,
      position: player.position,
      is_host: player.is_host,
      is_ready: player.is_ready,
      is_bot: player.is_bot,
      joined_at: player.joined_at,
      avatar_url: userData?.avatar_url || null,
      rating: userData?.rating || 0,
      games_won: userData?.games_won || 0,
      games_played: userData?.games_played || 0,
      in_redis: false,
      redis_position: null
    };
  });
  
  return NextResponse.json({
    success: true,
    players: enrichedPlayers,
    count: enrichedPlayers.length,
    source: 'database_only'
  });
}
