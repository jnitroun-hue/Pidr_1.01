/**
 * ============================================================
 * PROFESSIONAL MULTIPLAYER ROOMS API
 * ============================================================
 * API для управления игровыми комнатами с использованием
 * профессиональной архитектуры: Redis + PostgreSQL
 * 
 * Гарантии:
 * - Один игрок = одна комната (строгая проверка)
 * - Атомарные операции с distributed locks
 * - Правильное управление счетчиками
 * - Автоматическая очистка и синхронизация
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin as supabase } from '../../../lib/supabase';
import { requireAuth } from '../../../lib/auth-utils';
import {
  atomicJoinRoom,
  atomicLeaveRoom,
  canPlayerJoinRoom,
  evictStalePlayerRoomMembership,
  getPlayerRoom,
  removePlayerFromAllRooms,
  getRoomDetails,
  healthCheck,
} from '../../../lib/multiplayer/player-state-manager';
import { lightCleanup, cleanupOfflinePlayers } from '../../../lib/auto-cleanup';
import { clampRoomSize, normalizeMatchType } from '../../../lib/multiplayer/room-rules';
import { getRedisUserId } from '../../../lib/multiplayer/public-user-id';
import { isRoomHostUser } from '../../../lib/multiplayer/room-host';
import { getUserIdFromDatabase } from '../../../lib/auth-utils';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

// ============================================================
// UTILITY FUNCTIONS
// ============================================================

function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// ============================================================
// GET /api/rooms - Получить список комнат
// ============================================================

export async function GET(req: NextRequest) {
  console.log('🔍 GET /api/rooms - загружаем комнаты');
  
  // 🧹 АВТОМАТИЧЕСКАЯ ОЧИСТКА (не блокирует запрос)
  lightCleanup().catch(err => console.error('❌ Ошибка автоочистки:', err));
  
  try {
    // Получаем параметры запроса
    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type') || 'public';
    
    let query = supabase
      .from('_pidr_rooms')
      .select('*')
      .eq('status', 'waiting')
      .order('created_at', { ascending: false })
      .limit(50);

    if (type === 'private') {
      query = query.eq('is_private', true);
    } else {
      query = query.eq('is_private', false);
    }

    console.log(`🔍 [GET ROOMS] Загружаем комнаты типа: ${type}`);
    
    let rooms: any[] = [];
    let error: any = null;
    
    try {
      const result = await query;
      rooms = result.data || [];
      error = result.error;
    } catch (err: any) {
      console.error('❌ Исключение при загрузке комнат:', err);
      error = err;
    }
    
    if (error) {
      console.error('❌ Ошибка загрузки комнат:', error);
      // ✅ ИСПРАВЛЕНО: Возвращаем пустой список вместо ошибки
      return NextResponse.json({ 
        success: true, 
        rooms: [] 
      });
    }
    
    console.log(`📊 [GET ROOMS] Загружено комнат из БД: ${rooms?.length || 0}`);
    
    const roomsForListing = rooms || [];

    const roomIds = roomsForListing.map((room: { id: number }) => room.id);
    const playerCountMap = new Map<number, number>();
    if (roomIds.length > 0) {
      const { data: playerRows } = await supabase
        .from('_pidr_room_players')
        .select('room_id')
        .in('room_id', roomIds);

      (playerRows || []).forEach((row: { room_id: number }) => {
        playerCountMap.set(row.room_id, (playerCountMap.get(row.room_id) || 0) + 1);
      });
    }
    
    // ✅ ОПТИМИЗАЦИЯ ДЛЯ БЕСПЛАТНОГО ПЛАНА: Собираем все host_id и делаем один батч-запрос
    const hostIds = roomsForListing
      .map((room: any) => room.host_id)
      .filter((id: any) => id); // Убираем null/undefined
    
    // ✅ БАТЧ-ЗАПРОС: Получаем всех хостов одним запросом (экономия запросов к БД)
    let hostsMap: Map<string | number, any> = new Map();
    if (hostIds.length > 0) {
      const { data: hosts } = await supabase
        .from('_pidr_users')
        .select('id, username, avatar_url')
        .in('id', hostIds);
      
      if (hosts) {
        hosts.forEach((host: any) => {
          hostsMap.set(host.id, host);
        });
        console.log(`✅ [GET ROOMS] Загружено ${hosts.length} хостов одним батч-запросом (экономия ${hostIds.length - 1} запросов)`);
      }
    }
    
    // Обогащаем данные о хостах (используем кэш из батч-запроса)
    const roomsWithHosts = await Promise.all(roomsForListing.map(async (room: any) => {
      // ✅ СПОСОБ 1: Получаем хоста из кэша (батч-запрос) - БЕЗ ДОПОЛНИТЕЛЬНЫХ ЗАПРОСОВ
      let hostUser: any = null;
      
      if (room.host_id) {
        hostUser = hostsMap.get(room.host_id);
      }
      
      // ✅ СПОСОБ 2: Fallback - получаем хоста через _pidr_room_players (is_host = true)
      if (!hostUser) {
        console.log(`⚠️ [GET ROOMS] Хост не найден через host_id для комнаты ${room.id}, пробуем через _pidr_room_players`);
        const { data: hostPlayer } = await supabase
          .from('_pidr_room_players')
          .select('user_id, username')
          .eq('room_id', room.id)
          .eq('is_host', true)
          .maybeSingle();
        
        if (hostPlayer) {
          // Получаем данные пользователя по внутреннему user_id из _pidr_room_players
          const { data: userData } = await supabase
            .from('_pidr_users')
            .select('id, username, avatar_url')
            .eq('id', hostPlayer.user_id)
            .maybeSingle();
          
          if (userData) {
            hostUser = userData;
            // ✅ ОБНОВЛЯЕМ host_id в комнате для будущих запросов
            await supabase
              .from('_pidr_rooms')
              .update({ host_id: userData.id })
              .eq('id', room.id);
            console.log(`✅ [GET ROOMS] Хост найден и обновлен для комнаты ${room.id}`);
          }
        }
      }
      
      // ✅ СПОСОБ 3: Последний fallback - первый игрок в комнате
      if (!hostUser) {
        console.log(`⚠️ [GET ROOMS] Хост не найден, используем первого игрока для комнаты ${room.id}`);
        const { data: firstPlayer } = await supabase
          .from('_pidr_room_players')
          .select('user_id, username')
          .eq('room_id', room.id)
          .order('joined_at', { ascending: true })
          .limit(1)
          .maybeSingle();
        
        if (firstPlayer) {
          const { data: userData } = await supabase
            .from('_pidr_users')
            .select('username, avatar_url')
            .eq('id', firstPlayer.user_id)
            .maybeSingle();
          
          if (userData) {
            hostUser = userData;
          }
        }
      }
      
      const actualPlayerCount = playerCountMap.get(room.id) ?? room.current_players ?? 0;
      
      console.log(`📋 [GET ROOMS] Комната ${room.id}: хост=${hostUser?.username || 'Неизвестно'}, игроков=${actualPlayerCount}`);
      
      return {
        id: room.id,
        room_code: room.room_code,
        code: room.room_code,
        name: room.name,
        max_players: room.max_players,
        maxPlayers: room.max_players,
        current_players: actualPlayerCount, // Реальное количество из Redis
        players: actualPlayerCount,
        status: room.status,
        is_private: room.is_private,
        isPrivate: room.is_private,
        hasPassword: Boolean(room.password) || Boolean(room.settings?.hasPassword),
        gameMode: room.match_type || room.settings?.matchType || room.settings?.gameMode || 'normal',
        matchType: room.match_type || normalizeMatchType(room.settings?.gameMode),
        difficulty:
          room.settings?.gameMode === 'pro'
            ? 'hard'
            : room.settings?.gameMode === 'competitive'
              ? 'medium'
              : room.settings?.gameMode === 'blitz'
                ? 'hard'
                : 'easy',
        created_at: room.created_at,
        settings: room.settings,
        users: { 
          username: hostUser?.username || 'Хост', 
          avatar: hostUser?.avatar_url || null 
        },
      };
    }));
    
    console.log(`✅ Загружено комнат: ${roomsWithHosts.length}`);
    
    const response = NextResponse.json({ 
      success: true, 
      rooms: roomsWithHosts
    });
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Expires', '0');
    return response;
    
  } catch (error: any) {
    console.error('❌ Rooms GET error:', error);
    return NextResponse.json({ 
      success: false, 
      message: 'Internal server error' 
    }, { status: 500 });
  }
}

// ============================================================
// POST /api/rooms - Создание / Присоединение / Выход
// ============================================================

export async function POST(req: NextRequest) {
  console.log('🏠 POST /api/rooms');
  
  try {
    const auth = requireAuth(req);
    if ('error' in auth) {
      return NextResponse.json({ 
        success: false, 
        message: auth.error 
      }, { status: 401 });
    }
    
    const userId = auth.userId;
    const environment = auth.environment;
    const body = await req.json();
    const { action } = body;
    
    console.log(`📋 Action: ${action}, User: ${userId}`);
    
    // ============================================================
    // ACTION: CREATE - Создание комнаты
    // ============================================================
    
    if (action === 'create') {
      const { name, maxPlayers, gameMode, hasPassword, password, isPrivate, forceReplace } = body;
      const roomMaxPlayers = clampRoomSize(maxPlayers);
      const matchType = normalizeMatchType(gameMode);
      
      console.log('🆕 Создание новой комнаты...');
      
      // 🧹 Легкая очистка перед созданием комнаты
      lightCleanup().catch((err: unknown) => console.error('❌ Ошибка автоочистки:', err));
      
      // 1. ПОЛУЧАЕМ ДАННЫЕ ПОЛЬЗОВАТЕЛЯ
      // ✅ userId может быть либо UUID (из JWT), либо telegram_id (из headers)
      // Сначала пробуем найти по telegram_id, потом по id
      let userData: any = null;
      let userError: any = null;
      
      // Попытка 1: ищем по telegram_id
      const telegramIdResult = await supabase
        .from('_pidr_users')
        .select('id, username, first_name, telegram_id')
        .eq('telegram_id', userId)
        .maybeSingle();
      
      if (telegramIdResult.data) {
        userData = telegramIdResult.data;
      } else {
        // Попытка 2: ищем по UUID (если userId это UUID)
        const uuidResult = await supabase
          .from('_pidr_users')
          .select('id, username, first_name, telegram_id')
          .eq('id', userId)
          .maybeSingle();
        
        if (uuidResult.data) {
          userData = uuidResult.data;
        } else {
          userError = telegramIdResult.error || uuidResult.error;
        }
      }
      
      if (!userData) {
        console.error('❌ Не удалось получить данные пользователя:', userError);
        console.error('❌ userId:', userId);
        return NextResponse.json({ 
          success: false, 
          message: 'Ошибка получения данных пользователя' 
        }, { status: 500 });
      }

      if (!userData.username) {
        userData.username =
          userData.first_name?.trim() ||
          (userData.telegram_id ? `Player_${userData.telegram_id}` : `Player_${userData.id}`);
      }
      
      const userUUID = userData.id;
      const redisUserId = getRedisUserId(userData);
      console.log(`👤 Пользователь найден: UUID=${userUUID}, redisUserId=${redisUserId}`);

      await evictStalePlayerRoomMembership(redisUserId);

      const { data: dbMembership } = await supabase
        .from('_pidr_room_players')
        .select('room_id')
        .eq('user_id', userUUID)
        .maybeSingle();

      if (dbMembership?.room_id) {
        const stuckRoomId = String(dbMembership.room_id);
        const { data: stuckRoom } = await supabase
          .from('_pidr_rooms')
          .select('id, name, room_code, host_id')
          .eq('id', dbMembership.room_id)
          .maybeSingle();

        if (forceReplace) {
          await atomicLeaveRoom({ userId: redisUserId, roomId: stuckRoomId });
          if (stuckRoom && String(stuckRoom.host_id) === String(userUUID)) {
            await supabase
              .from('_pidr_rooms')
              .update({ status: 'finished' })
              .eq('id', stuckRoom.id);
          }
        } else {
          return NextResponse.json(
            {
              success: false,
              message: `Вы уже находитесь в комнате "${stuckRoom?.name || 'Неизвестная'}" (${stuckRoom?.room_code || '?'}). Покиньте её сначала.`,
              currentRoomId: stuckRoomId,
              currentRoom: stuckRoom,
            },
            { status: 400 }
          );
        }
      }
      
      // 2. ПРОВЕРЯЕМ МОЖЕТ ЛИ ИГРОК СОЗДАТЬ КОМНАТУ
      const currentRoomId = await getPlayerRoom(redisUserId);
      
      if (currentRoomId) {
        // Проверяем существует ли эта комната в БД (СРАВНИВАЕМ UUID С UUID!)
        const { data: existingRoom } = await supabase
          .from('_pidr_rooms')
          .select('id, name, room_code')
          .eq('id', currentRoomId)
          .eq('host_id', userUUID) // ✅ Используем UUID!
          .in('status', ['waiting', 'playing'])
          .single();
        
        if (existingRoom) {
          // ✅ ЕСЛИ forceReplace = true, закрываем старую комнату
          if (forceReplace) {
            console.log(`🔄 [CREATE ROOM] Принудительная замена комнаты ${existingRoom.id}`);
            // Закрываем старую комнату
            await supabase
              .from('_pidr_rooms')
              .update({ status: 'finished' })
              .eq('id', existingRoom.id);
            
            // Удаляем игроков из старой комнаты
            await supabase
              .from('_pidr_room_players')
              .delete()
              .eq('room_id', existingRoom.id);
            
            // Очищаем Redis
            await removePlayerFromAllRooms(redisUserId);
            
            console.log(`✅ [CREATE ROOM] Старая комната закрыта, создаем новую`);
          } else {
            // Если не forceReplace, возвращаем ошибку с информацией о текущей комнате
            return NextResponse.json({ 
              success: false, 
              message: `У вас уже есть активная комната "${existingRoom.name}" (${existingRoom.room_code}). Закройте её сначала.`,
              currentRoom: existingRoom
            }, { status: 400 });
          }
        } else {
          // Комната есть в Redis но не в БД - очищаем Redis
          await removePlayerFromAllRooms(redisUserId);
        }
      }
      
      // 3. СОЗДАЕМ КОМНАТУ В БД
      const roomCode = generateRoomCode();
      const roomSettings = {
        gameMode: matchType,
        matchType,
        isRanked: matchType === 'rated',
        allowBots: false,
        maxPlayers: roomMaxPlayers,
        hasPassword: hasPassword || false
      };
      
      const now = new Date().toISOString();
      const { data: room, error: roomError } = await supabase
        .from('_pidr_rooms')
        .insert({
          room_code: roomCode,
          name: name || 'Новая комната',
          host_id: userUUID, // ✅ ИСПОЛЬЗУЕМ UUID, А НЕ TELEGRAM_ID!
          max_players: roomMaxPlayers,
          current_players: 0, // Будет обновлено atomicJoinRoom
          status: 'waiting',
          is_private: isPrivate || false,
          password: hasPassword ? password : null,
          match_type: matchType,
          settings: roomSettings,
          created_at: now,
          updated_at: now, // ✅ ОБНОВЛЯЕМ ВРЕМЯ СОЗДАНИЯ
          last_activity: now // ✅ УСТАНАВЛИВАЕМ АКТИВНОСТЬ
        })
        .select()
        .single();
      
      if (roomError) {
        console.error('❌ Ошибка создания комнаты:', roomError);
        return NextResponse.json({ 
          success: false, 
          message: 'Ошибка создания комнаты: ' + roomError.message 
        }, { status: 500 });
      }
      
      // 4. АТОМАРНО ДОБАВЛЯЕМ ХОСТА В КОМНАТУ
      // ✅ Используем telegram_id для Redis
      console.log(`👑 [CREATE ROOM] Создаем комнату ${room.id}, добавляем хоста ${redisUserId} с isHost=true`);
      const joinResult = await atomicJoinRoom({
        userId: redisUserId,
        username: userData.username,
        roomId: String(room.id),
        roomCode,
        maxPlayers: roomMaxPlayers,
        isHost: true, // ✅ Создатель = хост
      });
      
      if (joinResult.success) {
        console.log(`✅ [CREATE ROOM] Хост успешно добавлен в комнату ${room.id}`);
      } else {
        console.error(`❌ [CREATE ROOM] Ошибка добавления хоста:`, joinResult.error);
      }
      
      if (!joinResult.success) {
        // Откатываем создание комнаты
        await supabase.from('_pidr_rooms').delete().eq('id', room.id);
        
        return NextResponse.json({ 
          success: false, 
          message: joinResult.error || 'Ошибка добавления хоста в комнату' 
        }, { status: 500 });
      }
      
      console.log(`✅ Комната создана: ${roomCode}, хост на позиции ${joinResult.position}`);
      
      return NextResponse.json({ 
        success: true, 
        room: {
          id: room.id,
          roomCode,
          name: room.name,
          status: room.status,
          position: joinResult.position,
          isHost: true
        }
      });
    }
    
    // ============================================================
    // ACTION: JOIN - Присоединение к комнате
    // ============================================================
    
    if (action === 'join') {
      const { roomCode, password } = body;
      
      if (!roomCode) {
        return NextResponse.json({ 
          success: false, 
          message: 'Код комнаты обязателен' 
        }, { status: 400 });
      }
      
      console.log(`🚪 Присоединение к комнате: ${roomCode}`);
      
      // 🧹 Удаляем офлайн игроков перед присоединением
      await cleanupOfflinePlayers();
      
      // 1. НАХОДИМ КОМНАТУ В БД
      const { data: room, error: roomError } = await supabase
        .from('_pidr_rooms')
        .select('*')
        .eq('room_code', roomCode.toUpperCase())
        .in('status', ['waiting', 'playing'])
        .single();
      
      if (roomError || !room) {
        console.error('❌ Комната не найдена:', roomError);
        return NextResponse.json({ 
          success: false, 
          message: 'Комната не найдена или уже закрыта' 
        }, { status: 404 });
      }
      
      // 2. ПРОВЕРЯЕМ ПАРОЛЬ
      if (room.password && room.password !== password) {
        return NextResponse.json({ 
          success: false, 
          message: 'Неверный пароль' 
        }, { status: 403 });
      }
      
      // 3. ПОЛУЧАЕМ ДАННЫЕ ПОЛЬЗОВАТЕЛЯ
      // ✅ userId может быть либо UUID, либо telegram_id
      let userData2: any = null;
      
      const telegramIdResult2 = await supabase
        .from('_pidr_users')
        .select('id, username, telegram_id')
        .eq('telegram_id', userId)
        .maybeSingle();
      
      if (telegramIdResult2.data) {
        userData2 = telegramIdResult2.data;
      } else {
        const uuidResult2 = await supabase
          .from('_pidr_users')
          .select('id, username, telegram_id')
          .eq('id', userId)
          .maybeSingle();
        
        userData2 = uuidResult2.data;
      }
      
      if (!userData2 || !userData2.username) {
        return NextResponse.json({ 
          success: false, 
          message: 'Ошибка получения данных пользователя' 
        }, { status: 500 });
      }
      
      const userUUID2 = userData2.id;
      const redisUserId2 = getRedisUserId(userData2);
      console.log(`👤 Пользователь найден: UUID=${userUUID2}, redisUserId=${redisUserId2}`);

      await evictStalePlayerRoomMembership(redisUserId2);
      
      // 4. ПРОВЕРЯЕМ МОЖЕТ ЛИ ИГРОК ПРИСОЕДИНИТЬСЯ
      const canJoin = await canPlayerJoinRoom(redisUserId2, String(room.id));
      
      if (!canJoin.canJoin && String(canJoin.currentRoomId) !== String(room.id)) {
        // Игрок уже в другой комнате
        const { data: currentRoom } = await supabase
          .from('_pidr_rooms')
          .select('name, room_code')
          .eq('id', canJoin.currentRoomId)
          .single();
        
        return NextResponse.json({ 
          success: false, 
          message: `Вы уже находитесь в комнате "${currentRoom?.name || 'Неизвестная'}" (${currentRoom?.room_code || '?'}). Покиньте её сначала.`,
          currentRoomId: canJoin.currentRoomId
        }, { status: 400 });
      }
      
      // 5. ОПРЕДЕЛЯЕМ ЯВЛЯЕТСЯ ЛИ ИГРОК ХОСТОМ
      const isHost = await isRoomHostUser(supabase, room.id, {
        dbUserId: userUUID2,
        telegramId: userData2.telegram_id,
      });
      
      // 6. АТОМАРНО ПРИСОЕДИНЯЕМСЯ К КОМНАТЕ
      // ✅ Используем telegram_id для Redis
      const joinResult = await atomicJoinRoom({
        userId: redisUserId2,
        username: userData2.username,
        roomId: String(room.id),
        roomCode: room.room_code,
        maxPlayers: room.max_players,
        isHost,
      });
      
      if (!joinResult.success) {
        return NextResponse.json({ 
          success: false, 
          message: joinResult.error || 'Не удалось присоединиться к комнате',
          currentRoomId: joinResult.currentRoomId
        }, { status: 400 });
      }
      
      console.log(`✅ Игрок ${redisUserId2} присоединился к комнате ${room.room_code} на позиции ${joinResult.position}`);
      
      return NextResponse.json({ 
        success: true, 
        room: {
          id: room.id,
          roomCode: room.room_code,
          name: room.name,
          position: joinResult.position,
          isHost
        }
      });
    }
    
    // ============================================================
    // ACTION: EVICT-STALE — сброс зависшего membership (2+ мин offline)
    // ============================================================
    if (action === 'evict-stale') {
      const { dbUserId, user: evictUser } = await getUserIdFromDatabase(userId, environment);
      const redisEvictId = evictUser ? getRedisUserId(evictUser) : userId;
      const evictedFrom = await evictStalePlayerRoomMembership(redisEvictId);
      return NextResponse.json({
        success: true,
        evicted: Boolean(evictedFrom),
        evictedFromRoomId: evictedFrom,
      });
    }
    
    // ============================================================
    // ACTION: LEAVE - Выход из комнаты
    // ============================================================
    
    if (action === 'leave') {
      const { roomId } = body;
      
      if (!roomId) {
        return NextResponse.json({ 
          success: false, 
          message: 'ID комнаты обязателен' 
        }, { status: 400 });
      }
      
      console.log(`🚶 Выход из комнаты: ${roomId}`);
      
      const { dbUserId: leaveDbUserId, user: leaveUser } = await getUserIdFromDatabase(userId, environment);
      const redisUserId3 = leaveUser ? getRedisUserId(leaveUser) : userId;
      
      const leaveResult = await atomicLeaveRoom({
        userId: redisUserId3,
        roomId: String(roomId),
      });
      
      if (!leaveResult.success) {
        return NextResponse.json({ 
          success: false, 
          message: leaveResult.error || 'Не удалось выйти из комнаты' 
        }, { status: 500 });
      }
      
      console.log(`✅ Игрок ${redisUserId3} вышел из комнаты ${roomId}`);
      
      await removePlayerFromAllRooms(redisUserId3);
      
      // Проверяем нужно ли удалить комнату (если хост вышел и комната пустая)
      const { data: room } = await supabase
        .from('_pidr_rooms')
        .select('host_id, current_players')
        .eq('id', roomId)
        .single();
      
      if (room && room.current_players === 0 && leaveDbUserId && room.host_id === leaveDbUserId) {
          console.log(`🗑️ Удаляем пустую комнату хоста ${roomId}`);
          await supabase
            .from('_pidr_rooms')
            .delete()
            .eq('id', roomId);
      }
      
      return NextResponse.json({ 
        success: true, 
        message: 'Вы вышли из комнаты' 
      });
    }
    
    // ============================================================
    // ACTION: HEALTH - Проверка здоровья системы
    // ============================================================
    
    if (action === 'health') {
      const health = await healthCheck();
      
      return NextResponse.json({
        success: health.redis && health.database,
        health,
        timestamp: new Date().toISOString()
      });
    }
    
    return NextResponse.json({ 
      success: false, 
      message: 'Неизвестное действие: ' + action 
    }, { status: 400 });
    
  } catch (error: any) {
    console.error('❌ Rooms POST error:', error);
    return NextResponse.json({ 
      success: false, 
      message: 'Ошибка сервера: ' + (error?.message || 'Неизвестная ошибка')
    }, { status: 500 });
  }
}

// ============================================================
// DELETE /api/rooms - Удаление комнаты (только хост)
// ============================================================

export async function DELETE(req: NextRequest) {
  try {
    const auth = requireAuth(req);
    if (auth.error) {
      return NextResponse.json({ 
        success: false, 
        message: auth.error 
      }, { status: 401 });
    }
    
    const telegramId = auth.userId as string; // ✅ Это telegram_id!
    const { searchParams } = new URL(req.url);
    const roomId = searchParams.get('roomId');
    
    if (!roomId) {
      return NextResponse.json({ 
        success: false, 
        message: 'Room ID required' 
      }, { status: 400 });
    }
    
    // ✅ ПОЛУЧАЕМ UUID ПОЛЬЗОВАТЕЛЯ ПО TELEGRAM_ID
    const { data: userData, error: userError } = await supabase
      .from('_pidr_users')
      .select('id')
      .eq('telegram_id', telegramId)
      .single();
    
    if (userError || !userData) {
      return NextResponse.json({ 
        success: false, 
        message: 'Пользователь не найден' 
      }, { status: 404 });
    }
    
    const userUUID = userData.id;
    
    // Проверяем что пользователь - хост комнаты (СРАВНИВАЕМ UUID С UUID!)
    const { data: room } = await supabase
      .from('_pidr_rooms')
      .select('host_id')
      .eq('id', roomId)
      .single();
    
    if (!room) {
      return NextResponse.json({ 
        success: false, 
        message: 'Комната не найдена' 
      }, { status: 404 });
    }
    
    if (room.host_id !== userUUID) { // ✅ Сравниваем UUID с UUID!
      return NextResponse.json({ 
        success: false, 
        message: 'Только хост может удалить комнату' 
      }, { status: 403 });
    }
    
    // Удаляем комнату (каскадно удалятся все связанные записи)
    const { error: deleteError } = await supabase
      .from('_pidr_rooms')
      .delete()
      .eq('id', roomId);
    
    if (deleteError) {
      return NextResponse.json({ 
        success: false, 
        message: 'Ошибка удаления комнаты: ' + deleteError.message 
      }, { status: 500 });
    }
    
    console.log(`✅ Комната ${roomId} удалена хостом ${telegramId} (UUID: ${userUUID})`);
    
    return NextResponse.json({ 
      success: true, 
      message: 'Комната удалена' 
    });
    
  } catch (error: any) {
    console.error('❌ Rooms DELETE error:', error);
    return NextResponse.json({ 
      success: false, 
      message: 'Ошибка сервера' 
    }, { status: 500 });
  }
}
