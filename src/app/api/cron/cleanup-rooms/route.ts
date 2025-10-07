/**
 * ============================================================
 * AUTOMATIC ROOM CLEANUP CRON JOB
 * ============================================================
 * Automatic cleanup of inactive rooms and stuck states
 * 
 * Recommended to run every 5-10 minutes
 * Vercel Cron: every 5 minutes
 * 
 * Performs:
 * - Delete inactive rooms (30+ minutes without activity)
 * - Sync Redis and PostgreSQL
 * - Cleanup stuck locks
 * - Update player counters
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '../../../../lib/supabase';
import { 
  getRoomPlayers, 
  removePlayerFromRoom,
  setPlayerRoom,
  getRoomDetails
} from '../../../../lib/multiplayer/player-state-manager';
import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL || '',
  token: process.env.UPSTASH_REDIS_REST_TOKEN || '',
});

/**
 * GET /api/cron/cleanup-rooms
 * Выполняет очистку неактивных комнат
 */
export async function GET(req: NextRequest) {
  const startTime = Date.now();
  
  // Проверяем авторизацию для cron (опционально)
  const authHeader = req.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    console.warn('⚠️ [CLEANUP] Unauthorized cron request');
    // В продакшене раскомментируйте:
    // return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
  }
  
  console.log('🧹 [CLEANUP] Начало автоматической очистки...');
  
  const stats = {
    inactiveRoomsDeleted: 0,
    emptyRoomsDeleted: 0,
    playersRemoved: 0,
    syncedRooms: 0,
    errors: [] as string[],
  };
  
  try {
    // ============================================================
    // 1. УДАЛЕНИЕ НЕАКТИВНЫХ КОМНАТ (30+ минут в статусе waiting)
    // ============================================================
    
    const inactiveTimeout = 30 * 60 * 1000; // 30 минут
    const inactiveThreshold = new Date(Date.now() - inactiveTimeout).toISOString();
    
    const { data: inactiveRooms, error: inactiveError } = await supabase
      .from('_pidr_rooms')
      .select('id, room_code, name, created_at')
      .eq('status', 'waiting')
      .lt('created_at', inactiveThreshold);
    
    if (!inactiveError && inactiveRooms) {
      for (const room of inactiveRooms) {
        try {
          // Удаляем игроков из Redis
          const players = await getRoomPlayers(room.id);
          for (const playerId of players) {
            await removePlayerFromRoom(room.id, playerId);
            await setPlayerRoom(playerId, null);
            stats.playersRemoved++;
          }
          
          // Удаляем комнату из БД
          await supabase.from('_pidr_rooms').delete().eq('id', room.id);
          
          stats.inactiveRoomsDeleted++;
          console.log(`🗑️ [CLEANUP] Удалена неактивная комната: ${room.room_code} (${room.name})`);
        } catch (error: any) {
          stats.errors.push(`Failed to delete inactive room ${room.room_code}: ${error.message}`);
        }
      }
    }
    
    // ============================================================
    // 2. УДАЛЕНИЕ ПУСТЫХ КОМНАТ
    // ============================================================
    
    const { data: emptyRooms, error: emptyError } = await supabase
      .from('_pidr_rooms')
      .select('id, room_code, name, current_players')
      .eq('current_players', 0)
      .eq('status', 'waiting');
    
    if (!emptyError && emptyRooms) {
      for (const room of emptyRooms) {
        try {
          // Проверяем что комната действительно пустая в Redis
          const redisPlayers = await getRoomPlayers(room.id);
          
          if (redisPlayers.length === 0) {
            await supabase.from('_pidr_rooms').delete().eq('id', room.id);
            stats.emptyRoomsDeleted++;
            console.log(`🗑️ [CLEANUP] Удалена пустая комната: ${room.room_code}`);
          }
        } catch (error: any) {
          stats.errors.push(`Failed to delete empty room ${room.room_code}: ${error.message}`);
        }
      }
    }
    
    // ============================================================
    // 3. СИНХРОНИЗАЦИЯ СЧЕТЧИКОВ REDIS ↔ POSTGRESQL
    // ============================================================
    
    const { data: activeRooms, error: activeError } = await supabase
      .from('_pidr_rooms')
      .select('id, room_code, current_players')
      .in('status', ['waiting', 'playing'])
      .limit(100); // Ограничиваем для производительности
    
    if (!activeError && activeRooms) {
      for (const room of activeRooms) {
        try {
          // Получаем реальное количество из Redis
          const redisPlayers = await getRoomPlayers(room.id);
          const redisCount = redisPlayers.length;
          
          // Если не совпадает - обновляем в БД
          if (redisCount !== room.current_players) {
            await supabase
              .from('_pidr_rooms')
              .update({ current_players: redisCount })
              .eq('id', room.id);
            
            stats.syncedRooms++;
            console.log(`🔄 [CLEANUP] Синхронизирован счетчик комнаты ${room.room_code}: ${room.current_players} → ${redisCount}`);
          }
          
          // Удаляем игроков из Redis, которых нет в БД
          const { data: dbPlayers } = await supabase
            .from('_pidr_room_players')
            .select('user_id')
            .eq('room_id', room.id);
          
          const dbPlayerIds = new Set((dbPlayers || []).map((p: any) => p.user_id));
          
          for (const redisPlayerId of redisPlayers) {
            if (!dbPlayerIds.has(redisPlayerId)) {
              await removePlayerFromRoom(room.id, redisPlayerId);
              await setPlayerRoom(redisPlayerId, null);
              stats.playersRemoved++;
              console.log(`🧹 [CLEANUP] Удален зависший игрок ${redisPlayerId} из Redis комнаты ${room.room_code}`);
            }
          }
        } catch (error: any) {
          stats.errors.push(`Failed to sync room ${room.room_code}: ${error.message}`);
        }
      }
    }
    
    // ============================================================
    // 4. ОЧИСТКА ЗАВИСШИХ БЛОКИРОВОК В REDIS
    // ============================================================
    
    // Блокировки автоматически истекают через TTL, но можем добавить дополнительную очистку
    // Для этого нужно сканировать ключи, что может быть затратно
    // Пока полагаемся на автоматическое истечение
    
    const duration = Date.now() - startTime;
    
    console.log(`✅ [CLEANUP] Очистка завершена за ${duration}ms`);
    console.log(`📊 [CLEANUP] Статистика:`, stats);
    
    return NextResponse.json({
      success: true,
      stats,
      duration: `${duration}ms`,
      timestamp: new Date().toISOString()
    });
    
  } catch (error: any) {
    console.error('❌ [CLEANUP] Критическая ошибка:', error);
    
    return NextResponse.json({
      success: false,
      message: error.message,
      stats,
      duration: `${Date.now() - startTime}ms`,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

/**
 * POST /api/cron/cleanup-rooms
 * То же самое через POST (для Vercel Cron)
 */
export async function POST(req: NextRequest) {
  return GET(req);
}

