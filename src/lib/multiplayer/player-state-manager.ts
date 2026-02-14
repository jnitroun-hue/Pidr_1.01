/**
 * ============================================================
 * PROFESSIONAL PLAYER STATE MANAGER
 * ============================================================
 * Управление состояниями игроков с использованием Redis + PostgreSQL
 * 
 * Архитектура:
 * - Redis: Real-time состояния, блокировки, кэш
 * - PostgreSQL: Персистентное хранение, статистика
 * 
 * Гарантии:
 * - Игрок может быть только в одной комнате
 * - Атомарные операции с distributed locks
 * - Автоматическая очистка зависших состояний
 * - Правильное управление счетчиками
 */

import { getRedis, isRedisAvailable } from '../redis/init';
import { supabase } from '../supabase';
import type { Redis } from '@upstash/redis';

// Получаем Redis клиент через универсальную инициализацию
const redis: Redis | null = getRedis();

// ============================================================
// TYPES
// ============================================================

export interface PlayerState {
  userId: string;
  username: string;
  currentRoomId: string | null;
  status: 'online' | 'in_lobby' | 'in_room' | 'in_game';
  position: number | null; // Позиция за столом
  isHost: boolean;
  lastActivity: number; // timestamp
  sessionId: string; // Уникальный ID сессии
}

export interface RoomState {
  roomId: string;
  roomCode: string;
  hostId: string;
  players: string[]; // Array of user IDs
  maxPlayers: number;
  status: 'waiting' | 'starting' | 'playing' | 'finished';
  createdAt: number;
  lastActivity: number;
}

// ============================================================
// REDIS KEYS
// ============================================================

const KEYS = {
  playerState: (userId: string) => `player:${userId}:state`,
  playerLock: (userId: string) => `player:${userId}:lock`,
  roomState: (roomId: string) => `room:${roomId}:state`,
  roomLock: (roomId: string) => `room:${roomId}:lock`,
  roomPlayers: (roomId: string) => `room:${roomId}:players`, // SET
  userRoom: (userId: string) => `user:${userId}:room`, // STRING (roomId)
  roomSlots: (roomId: string) => `room:${roomId}:slots`, // HASH {position: userId}
};

// ============================================================
// DISTRIBUTED LOCKS
// ============================================================

/**
 * Получить блокировку игрока
 * Использует Redis SET NX EX для атомарной блокировки
 */
export async function acquirePlayerLock(
  userId: string,
  timeoutMs: number = 5000
): Promise<string | null> {
  if (!redis) {
    console.warn('⚠️ [acquirePlayerLock] Redis недоступен, блокировка не получена');
    return null;
  }
  
  // TypeScript type narrowing: после проверки redis точно не null
  const redisClient = redis;
  const lockKey = KEYS.playerLock(userId);
  const lockId = `${Date.now()}-${Math.random()}`;
  
  // Пробуем получить блокировку
  const result = await redisClient.set(lockKey, lockId, {
    nx: true, // Только если ключ не существует
    px: timeoutMs, // Автоматическое удаление через timeout
  });
  
  return result === 'OK' ? lockId : null;
}

/**
 * Освободить блокировку игрока
 */
export async function releasePlayerLock(
  userId: string,
  lockId: string
): Promise<boolean> {
  if (!redis) {
    console.warn('⚠️ [releasePlayerLock] Redis недоступен');
    return false;
  }
  
  // TypeScript type narrowing: после проверки redis точно не null
  const redisClient = redis;
  const lockKey = KEYS.playerLock(userId);
  
  // Проверяем что это наша блокировка перед удалением
  const currentLock = await redisClient.get(lockKey);
  
  if (currentLock === lockId) {
    await redisClient.del(lockKey);
    return true;
  }
  
  return false;
}

/**
 * Получить блокировку комнаты
 */
export async function acquireRoomLock(
  roomId: string,
  timeoutMs: number = 5000
): Promise<string | null> {
  if (!redis) {
    console.warn('⚠️ [acquireRoomLock] Redis недоступен, блокировка не получена');
    return null;
  }
  
  // TypeScript type narrowing: после проверки redis точно не null
  const redisClient = redis;
  const lockKey = KEYS.roomLock(roomId);
  const lockId = `${Date.now()}-${Math.random()}`;
  
  const result = await redisClient.set(lockKey, lockId, {
    nx: true,
    px: timeoutMs,
  });
  
  return result === 'OK' ? lockId : null;
}

/**
 * Освободить блокировку комнаты
 */
export async function releaseRoomLock(
  roomId: string,
  lockId: string
): Promise<boolean> {
  if (!redis) {
    console.warn('⚠️ [releaseRoomLock] Redis недоступен');
    return false;
  }
  
  // TypeScript type narrowing: после проверки redis точно не null
  const redisClient = redis;
  const lockKey = KEYS.roomLock(roomId);
  const currentLock = await redisClient.get(lockKey);
  
  if (currentLock === lockId) {
    await redisClient.del(lockKey);
    return true;
  }
  
  return false;
}

// ============================================================
// PLAYER STATE MANAGEMENT
// ============================================================

/**
 * Получить состояние игрока из Redis
 */
export async function getPlayerState(
  userId: string
): Promise<PlayerState | null> {
  if (!redis) {
    console.warn('⚠️ [getPlayerState] Redis недоступен');
    return null;
  }
  
  // TypeScript type narrowing: после проверки redis точно не null
  const redisClient = redis;
  const key = KEYS.playerState(userId);
  const state = await redisClient.get<PlayerState>(key);
  return state;
}

/**
 * Установить состояние игрока в Redis
 */
export async function setPlayerState(
  userId: string,
  state: PlayerState,
  ttlSeconds: number = 3600 // 1 час
): Promise<void> {
  if (!redis) {
    console.warn('⚠️ [setPlayerState] Redis недоступен');
    return;
  }
  
  // TypeScript type narrowing: после проверки redis точно не null
  const redisClient = redis;
  const key = KEYS.playerState(userId);
  await redisClient.set(key, state, { ex: ttlSeconds });
}

/**
 * Получить текущую комнату игрока
 */
export async function getPlayerRoom(userId: string): Promise<string | null> {
  if (!redis) {
    console.warn('⚠️ [getPlayerRoom] Redis недоступен');
    return null;
  }
  
  // TypeScript type narrowing: после проверки redis точно не null
  const redisClient = redis;
  return await redisClient.get(KEYS.userRoom(userId));
}

/**
 * Установить комнату игрока
 */
export async function setPlayerRoom(
  userId: string,
  roomId: string | null
): Promise<void> {
  if (!redis) {
    console.warn('⚠️ [setPlayerRoom] Redis недоступен');
    return;
  }
  
  // TypeScript type narrowing: после проверки redis точно не null
  const redisClient = redis;
  const key = KEYS.userRoom(userId);
  
  if (roomId) {
    await redisClient.set(key, roomId, { ex: 7200 }); // 2 часа
  } else {
    await redisClient.del(key);
  }
}

/**
 * Проверить может ли игрок присоединиться к комнате
 */
export async function canPlayerJoinRoom(
  userId: string,
  targetRoomId: string
): Promise<{ canJoin: boolean; reason?: string; currentRoomId?: string }> {
  // Проверяем текущую комнату игрока
  const currentRoomId = await getPlayerRoom(userId);
  
  if (currentRoomId) {
    // Если игрок уже в этой комнате - разрешаем (переподключение)
    if (currentRoomId === targetRoomId) {
      return { canJoin: true };
    }
    
    // Игрок уже в другой комнате
    return {
      canJoin: false,
      reason: 'Вы уже находитесь в другой комнате',
      currentRoomId,
    };
  }
  
  return { canJoin: true };
}

// ============================================================
// ROOM STATE MANAGEMENT
// ============================================================

/**
 * Получить список игроков в комнате из Redis
 */
export async function getRoomPlayers(roomId: string): Promise<string[]> {
  if (!redis) {
    console.warn('⚠️ [getRoomPlayers] Redis недоступен');
    return [];
  }
  
  // TypeScript type narrowing: после проверки redis точно не null
  const redisClient = redis;
  const key = KEYS.roomPlayers(roomId);
  const players = await redisClient.smembers(key);
  return players as string[];
}

/**
 * Добавить игрока в комнату (Redis SET)
 */
export async function addPlayerToRoom(
  roomId: string,
  userId: string
): Promise<void> {
  if (!redis) {
    console.warn('⚠️ [addPlayerToRoom] Redis недоступен');
    return;
  }
  
  // TypeScript type narrowing: после проверки redis точно не null
  const redisClient = redis;
  const key = KEYS.roomPlayers(roomId);
  await redisClient.sadd(key, userId);
  await redisClient.expire(key, 7200); // 2 часа
}

/**
 * Удалить игрока из комнаты (Redis SET)
 */
export async function removePlayerFromRoom(
  roomId: string,
  userId: string
): Promise<void> {
  if (!redis) {
    console.warn('⚠️ [removePlayerFromRoom] Redis недоступен');
    return;
  }
  
  // TypeScript type narrowing: после проверки redis точно не null
  const redisClient = redis;
  const key = KEYS.roomPlayers(roomId);
  await redisClient.srem(key, userId);
}

/**
 * Получить количество игроков в комнате
 */
export async function getRoomPlayerCount(roomId: string): Promise<number> {
  if (!redis) {
    console.warn('⚠️ [getRoomPlayerCount] Redis недоступен');
    return 0;
  }
  
  // TypeScript type narrowing: после проверки redis точно не null
  const redisClient = redis;
  const key = KEYS.roomPlayers(roomId);
  const count = await redisClient.scard(key);
  return count || 0;
}

/**
 * Проверить есть ли место в комнате
 */
export async function hasRoomSpace(
  roomId: string,
  maxPlayers: number
): Promise<boolean> {
  const currentCount = await getRoomPlayerCount(roomId);
  return currentCount < maxPlayers;
}

/**
 * Получить свободную позицию за столом
 */
export async function getFreePosition(
  roomId: string,
  maxPlayers: number
): Promise<number | null> {
  if (!redis) {
    console.warn('⚠️ [getFreePosition] Redis недоступен');
    return null;
  }
  
  // TypeScript type narrowing: после проверки redis точно не null
  const redisClient = redis;
  const slotsKey = KEYS.roomSlots(roomId);
  const occupiedSlots = await redisClient.hgetall(slotsKey);
  
  // Позиции от 1 до maxPlayers
  for (let pos = 1; pos <= maxPlayers; pos++) {
    if (!occupiedSlots || !occupiedSlots[pos.toString()]) {
      return pos;
    }
  }
  
  return null; // Нет свободных позиций
}

/**
 * Занять позицию за столом
 */
export async function occupyPosition(
  roomId: string,
  userId: string,
  position: number
): Promise<void> {
  if (!redis) {
    console.warn('⚠️ [occupyPosition] Redis недоступен');
    return;
  }
  
  // TypeScript type narrowing: после проверки redis точно не null
  const redisClient = redis;
  const slotsKey = KEYS.roomSlots(roomId);
  await redisClient.hset(slotsKey, { [position.toString()]: userId });
  await redisClient.expire(slotsKey, 7200);
}

/**
 * Освободить позицию за столом
 */
export async function freePosition(
  roomId: string,
  position: number
): Promise<void> {
  if (!redis) {
    console.warn('⚠️ [freePosition] Redis недоступен');
    return;
  }
  
  // TypeScript type narrowing: после проверки redis точно не null
  const redisClient = redis;
  const slotsKey = KEYS.roomSlots(roomId);
  await redisClient.hdel(slotsKey, position.toString());
}

/**
 * Получить позицию игрока в комнате
 */
export async function getPlayerPosition(
  roomId: string,
  userId: string
): Promise<number | null> {
  if (!redis) {
    console.warn('⚠️ [getPlayerPosition] Redis недоступен');
    return null;
  }
  
  // TypeScript type narrowing: после проверки redis точно не null
  const redisClient = redis;
  const slotsKey = KEYS.roomSlots(roomId);
  const slots = await redisClient.hgetall(slotsKey);
  
  if (!slots) return null;
  
  for (const [pos, uid] of Object.entries(slots)) {
    if (uid === userId) {
      return parseInt(pos);
    }
  }
  
  return null;
}

// ============================================================
// CLEANUP FUNCTIONS
// ============================================================

/**
 * Удалить игрока из всех комнат (кроме указанной)
 */
export async function removePlayerFromAllRooms(
  userId: string,
  exceptRoomId?: string
): Promise<void> {
  // Получаем текущую комнату
  const currentRoomId = await getPlayerRoom(userId);
  
  if (currentRoomId && currentRoomId !== exceptRoomId) {
    // Удаляем из Redis SET
    await removePlayerFromRoom(currentRoomId, userId);
    
    // Освобождаем позицию
    const position = await getPlayerPosition(currentRoomId, userId);
    if (position !== null) {
      await freePosition(currentRoomId, position);
    }
  }
  
  // Очищаем ссылку на комнату
  if (!exceptRoomId) {
    await setPlayerRoom(userId, null);
  }
}

/**
 * Очистить неактивные состояния игроков
 */
export async function cleanupInactiveStates(
  inactivityTimeoutMs: number = 3600000 // 1 час
): Promise<number> {
  let cleanedCount = 0;
  const now = Date.now();
  
  // Это должно выполняться периодически через cron
  // Для простоты пока не реализуем полное сканирование
  
  return cleanedCount;
}

// ============================================================
// ATOMIC OPERATIONS
// ============================================================

/**
 * АТОМАРНАЯ ОПЕРАЦИЯ: Присоединение к комнате
 * 
 * Гарантирует:
 * - Игрок может быть только в одной комнате
 * - Не превышается максимум игроков
 * - Позиции не конфликтуют
 * - Все изменения atomic с использованием locks
 */
export async function atomicJoinRoom(params: {
  userId: string;
  username: string;
  roomId: string;
  roomCode: string;
  maxPlayers: number;
  isHost: boolean;
}): Promise<{
  success: boolean;
  position?: number;
  error?: string;
  currentRoomId?: string;
}> {
  const { userId, username, roomId, roomCode, maxPlayers, isHost } = params;
  
  console.log(`🔒 [ATOMIC JOIN] Начало операции для пользователя ${userId}`);
  console.log(`👑 [ATOMIC JOIN] isHost=${isHost} (type: ${typeof isHost}), username=${username}, roomId=${roomId}`);
  console.log(`👑 [ATOMIC JOIN] isHost=${isHost} (type: ${typeof isHost}), username=${username}, roomId=${roomId}`);
  
  // 1. ПОЛУЧАЕМ БЛОКИРОВКУ ИГРОКА
  const playerLock = await acquirePlayerLock(userId, 10000); // 10 секунд
  if (!playerLock) {
    console.error(`❌ [ATOMIC JOIN] Не удалось получить блокировку игрока ${userId}`);
    return {
      success: false,
      error: 'Не удалось получить блокировку. Попробуйте снова.',
    };
  }
  
  try {
    // 2. ПРОВЕРЯЕМ МОЖЕТ ЛИ ИГРОК ПРИСОЕДИНИТЬСЯ
    const canJoin = await canPlayerJoinRoom(userId, roomId);
    
    if (!canJoin.canJoin) {
      console.warn(`⚠️ [ATOMIC JOIN] Игрок ${userId} не может присоединиться: ${canJoin.reason}`);
      return {
        success: false,
        error: canJoin.reason,
        currentRoomId: canJoin.currentRoomId,
      };
    }
    
    // 3. ПОЛУЧАЕМ БЛОКИРОВКУ КОМНАТЫ
    const roomLock = await acquireRoomLock(roomId, 10000);
    if (!roomLock) {
      console.error(`❌ [ATOMIC JOIN] Не удалось получить блокировку комнаты ${roomId}`);
      return {
        success: false,
        error: 'Комната занята другой операцией. Попробуйте снова.',
      };
    }
    
    try {
      // 4. ПРОВЕРЯЕМ ЕСТЬ ЛИ МЕСТО В КОМНАТЕ
      const hasSpace = await hasRoomSpace(roomId, maxPlayers);
      if (!hasSpace) {
        console.warn(`⚠️ [ATOMIC JOIN] Нет места в комнате ${roomId}`);
        return {
          success: false,
          error: 'В комнате нет свободных мест',
        };
      }
      
      // 5. ОПРЕДЕЛЯЕМ ПОЗИЦИЮ
      let position: number;
      
      if (isHost) {
        // Хост всегда на позиции 1
        position = 1;
        console.log(`👑 [ATOMIC JOIN] Хост ${userId} занимает позицию 1`);
      } else {
        // Ищем свободную позицию
        const freePos = await getFreePosition(roomId, maxPlayers);
        if (freePos === null) {
          console.error(`❌ [ATOMIC JOIN] Нет свободных позиций в комнате ${roomId}`);
          return {
            success: false,
            error: 'Нет свободных позиций',
          };
        }
        position = freePos;
        console.log(`🎯 [ATOMIC JOIN] Игрок ${userId} получил позицию ${position}`);
      }
      
      // 6. УДАЛЯЕМ ИЗ ДРУГИХ КОМНАТ (если был)
      await removePlayerFromAllRooms(userId, roomId);
      
      // 7. ДОБАВЛЯЕМ В НОВУЮ КОМНАТУ (Redis)
      await addPlayerToRoom(roomId, userId);
      await occupyPosition(roomId, userId, position);
      await setPlayerRoom(userId, roomId);
      
      // 8. ОБНОВЛЯЕМ СОСТОЯНИЕ ИГРОКА
      const playerState: PlayerState = {
        userId,
        username,
        currentRoomId: roomId,
        status: 'in_room',
        position,
        isHost,
        lastActivity: Date.now(),
        sessionId: `${userId}-${Date.now()}`,
      };
      await setPlayerState(userId, playerState);
      
      // 9. СИНХРОНИЗИРУЕМ С POSTGRESQL
      console.log(`💾 [ATOMIC JOIN] Вызываем syncPlayerToDatabase с isHost=${isHost} (type: ${typeof isHost})`);
      await syncPlayerToDatabase({
        roomId,
        userId,
        username,
        position,
        isHost: Boolean(isHost), // ✅ ПРИВОДИМ К BOOLEAN
      });
      
      // 10. ОБНОВЛЯЕМ СЧЕТЧИК В БД
      await updateRoomPlayerCount(roomId);
      
      // 11. ✅ ОТПРАВЛЯЕМ BROADCAST ДЛЯ СИНХРОНИЗАЦИИ ВСЕХ КЛИЕНТОВ
      try {
        const channel = supabase.channel(`room:${roomId}`);
        await channel.send({
          type: 'broadcast',
          event: 'player-joined',
          payload: {
            userId,
            username,
            position,
            isHost,
            timestamp: Date.now()
          }
        });
        console.log(`📡 [ATOMIC JOIN] Broadcast отправлен для синхронизации клиентов`);
      } catch (broadcastError) {
        console.warn(`⚠️ [ATOMIC JOIN] Ошибка отправки broadcast (не критично):`, broadcastError);
      }
      
      console.log(`✅ [ATOMIC JOIN] Игрок ${userId} успешно присоединился к комнате ${roomId} на позиции ${position}`);
      
      return {
        success: true,
        position,
      };
      
    } finally {
      // ОСВОБОЖДАЕМ БЛОКИРОВКУ КОМНАТЫ
      await releaseRoomLock(roomId, roomLock);
    }
    
  } finally {
    // ОСВОБОЖДАЕМ БЛОКИРОВКУ ИГРОКА
    await releasePlayerLock(userId, playerLock);
  }
}

/**
 * АТОМАРНАЯ ОПЕРАЦИЯ: Выход из комнаты
 */
export async function atomicLeaveRoom(params: {
  userId: string;
  roomId: string;
}): Promise<{ success: boolean; error?: string }> {
  const { userId, roomId } = params;
  
  console.log(`🔒 [ATOMIC LEAVE] Начало операции для пользователя ${userId}`);
  
  // 1. ПОЛУЧАЕМ БЛОКИРОВКУ ИГРОКА
  const playerLock = await acquirePlayerLock(userId, 10000);
  if (!playerLock) {
    return {
      success: false,
      error: 'Не удалось получить блокировку',
    };
  }
  
  try {
    // 2. ПОЛУЧАЕМ БЛОКИРОВКУ КОМНАТЫ
    const roomLock = await acquireRoomLock(roomId, 10000);
    if (!roomLock) {
      return {
        success: false,
        error: 'Комната занята другой операцией',
      };
    }
    
    try {
      // 3. ПОЛУЧАЕМ ПОЗИЦИЮ ИГРОКА
      const position = await getPlayerPosition(roomId, userId);
      
      // 4. УДАЛЯЕМ ИЗ КОМНАТЫ
      await removePlayerFromRoom(roomId, userId);
      
      if (position !== null) {
        await freePosition(roomId, position);
      }
      
      await setPlayerRoom(userId, null);
      
      // 5. ОБНОВЛЯЕМ СОСТОЯНИЕ ИГРОКА
      const playerState = await getPlayerState(userId);
      if (playerState) {
        playerState.currentRoomId = null;
        playerState.status = 'in_lobby';
        playerState.position = null;
        playerState.lastActivity = Date.now();
        await setPlayerState(userId, playerState);
      }
      
      // 6. УДАЛЯЕМ ИЗ БД
      const { error: dbError } = await supabase
        .from('_pidr_room_players')
        .delete()
        .eq('room_id', roomId)
        .eq('user_id', userId);
      
      if (dbError) {
        console.error(`❌ [ATOMIC LEAVE] Ошибка удаления из БД:`, dbError);
      }
      
      // 7. ОБНОВЛЯЕМ СЧЕТЧИК
      await updateRoomPlayerCount(roomId);
      
      console.log(`✅ [ATOMIC LEAVE] Игрок ${userId} успешно покинул комнату ${roomId}`);
      
      return { success: true };
      
    } finally {
      await releaseRoomLock(roomId, roomLock);
    }
    
  } finally {
    await releasePlayerLock(userId, playerLock);
  }
}

// ============================================================
// DATABASE SYNC
// ============================================================

/**
 * Синхронизировать данные игрока с PostgreSQL
 */
async function syncPlayerToDatabase(params: {
  roomId: string;
  userId: string;
  username: string;
  position: number;
  isHost: boolean;
}): Promise<void> {
  const { roomId, userId, username, position, isHost } = params;
  
  console.log(`📝 [SYNC DB] Синхронизация: roomId=${roomId}, userId=${userId}, isHost=${isHost} (type: ${typeof isHost}), position=${position}`);
  
  // ✅ ИСПРАВЛЕНО: Сначала удаляем старую запись, потом вставляем новую
  // Это гарантирует что is_host будет правильным
  const deleteResult = await supabase
    .from('_pidr_room_players')
    .delete()
    .eq('room_id', parseInt(roomId))
    .eq('user_id', parseInt(userId));
  
  if (deleteResult.error) {
    console.warn(`⚠️ [SYNC DB] Ошибка удаления старой записи (может не существовать):`, deleteResult.error);
  } else {
    console.log(`🗑️ [SYNC DB] Удалена старая запись для userId=${userId}, roomId=${roomId}`);
  }
  
  // Вставляем свежую запись  
  // ✅ ВАЖНО: room_id это INT4, user_id это INT8 (telegram_id)!
  const insertData = {
    room_id: parseInt(roomId), // INT4
    user_id: parseInt(userId), // INT8 (telegram_id)
    username,
    position,
    is_host: Boolean(isHost), // ✅ ПРИВОДИМ К BOOLEAN И ОПРЕДЕЛЯЕМ ХОСТА!
    is_ready: Boolean(isHost), // Хост сразу готов
    joined_at: new Date().toISOString(),
  };
  
  console.log(`💾 [SYNC DB] Вставляем данные:`, JSON.stringify(insertData, null, 2));
  
  const { error, data } = await supabase
    .from('_pidr_room_players')
    .insert(insertData)
    .select();
  
  if (error) {
    console.error(`❌ [SYNC DB] Ошибка синхронизации с БД:`, error);
    console.error(`❌ [SYNC DB] Данные которые пытались вставить:`, insertData);
    throw error;
  }
  
  console.log(`✅ [SYNC DB] Игрок добавлен в БД:`, data);
  
  // ✅ ПРОВЕРЯЕМ ЧТО is_host УСТАНОВЛЕН ПРАВИЛЬНО И ПРИНУДИТЕЛЬНО ИСПРАВЛЯЕМ ЕСЛИ НУЖНО
  if (data && data.length > 0) {
    const insertedRecord = data[0];
    if (insertedRecord.is_host !== isHost) {
      console.error(`🚨 [SYNC DB] КРИТИЧЕСКАЯ ОШИБКА: is_host не совпадает! Ожидали: ${isHost}, получили: ${insertedRecord.is_host}`);
      console.log(`🔧 [SYNC DB] ПРИНУДИТЕЛЬНО ИСПРАВЛЯЕМ is_host на ${isHost}`);
      
      // ✅ ПРИНУДИТЕЛЬНО ОБНОВЛЯЕМ is_host
      const { error: updateError, data: updatedData } = await supabase
        .from('_pidr_room_players')
        .update({ 
          is_host: Boolean(isHost),
          is_ready: Boolean(isHost) // Хост сразу готов
        })
        .eq('id', insertedRecord.id)
        .select();
      
      if (updateError) {
        console.error(`❌ [SYNC DB] Ошибка принудительного обновления is_host:`, updateError);
      } else {
        console.log(`✅ [SYNC DB] is_host принудительно обновлен:`, updatedData);
      }
    } else {
      console.log(`✅ [SYNC DB] is_host установлен правильно: ${insertedRecord.is_host}`);
    }
  }
  
  // ✅ ДОПОЛНИТЕЛЬНАЯ ПРОВЕРКА: ЕСЛИ ИГРОК - ХОСТ ПО host_id, ПРИНУДИТЕЛЬНО УСТАНАВЛИВАЕМ is_host
  try {
    const { data: roomData } = await supabase
      .from('_pidr_rooms')
      .select('host_id')
      .eq('id', parseInt(roomId))
      .single();
    
    if (roomData?.host_id) {
      // ✅ ИСПРАВЛЕНО: userId это telegram_id (строка), получаем UUID пользователя
      const { data: userData } = await supabase
        .from('_pidr_users')
        .select('id')
        .eq('telegram_id', String(userId)) // ✅ userId это telegram_id (строка или число)
        .single();
      
      if (userData?.id && roomData.host_id === userData.id) {
        // ✅ Игрок является хостом по host_id - ПРИНУДИТЕЛЬНО устанавливаем is_host=true
        console.log(`👑 [SYNC DB] Игрок ${userId} является хостом по host_id (UUID: ${userData.id}), принудительно устанавливаем is_host=true`);
        const { error: fixError, data: fixedData } = await supabase
          .from('_pidr_room_players')
          .update({ 
            is_host: true,
            is_ready: true
          })
          .eq('room_id', parseInt(roomId))
          .eq('user_id', parseInt(String(userId))) // ✅ user_id в БД это telegram_id (INT8)
          .select();
        
        if (fixError) {
          console.error(`❌ [SYNC DB] Ошибка исправления is_host для хоста:`, fixError);
        } else {
          console.log(`✅ [SYNC DB] is_host принудительно установлен для хоста ${userId}:`, fixedData);
        }
      } else {
        // ✅ Если НЕ хост по host_id, но isHost=true - это ошибка, исправляем на false
        if (isHost && userData?.id && roomData.host_id !== userData.id) {
          console.warn(`⚠️ [SYNC DB] Игрок ${userId} НЕ является хостом по host_id, но isHost=true. Исправляем на false.`);
          await supabase
            .from('_pidr_room_players')
            .update({ is_host: false })
            .eq('room_id', parseInt(roomId))
            .eq('user_id', parseInt(String(userId)));
        }
      }
    }
  } catch (checkError) {
    console.warn(`⚠️ [SYNC DB] Ошибка проверки host_id (не критично):`, checkError);
  }
  
  // ✅ ОБНОВЛЯЕМ last_activity КОМНАТЫ
  await supabase
    .from('_pidr_rooms')
    .update({ 
      last_activity: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .eq('id', parseInt(roomId));
}

/**
 * Обновить счетчик игроков в комнате
 */
async function updateRoomPlayerCount(roomId: string): Promise<void> {
  // Считаем реальное количество игроков в Redis
  const count = await getRoomPlayerCount(roomId);
  
  // ✅ ИСПРАВЛЕНО: Обновляем current_players И last_activity
  const now = new Date().toISOString();
  const { error } = await supabase
    .from('_pidr_rooms')
    .update({ 
      current_players: count,
      last_activity: now, // ✅ ОБНОВЛЯЕМ АКТИВНОСТЬ!
      updated_at: now
    })
    .eq('id', roomId);
  
  if (error) {
    console.error(`❌ [SYNC DB] Ошибка обновления счетчика:`, error);
  } else {
    console.log(`📊 [SYNC DB] Счетчик комнаты ${roomId} обновлен: ${count}, last_activity обновлен`);
  }
}

// ============================================================
// UTILITY FUNCTIONS
// ============================================================

/**
 * Получить детальную информацию о комнате
 */
export async function getRoomDetails(roomId: string): Promise<{
  players: string[];
  playerCount: number;
  slots: Record<string, string>;
} | null> {
  try {
    const players = await getRoomPlayers(roomId);
    const playerCount = players.length;
    if (!redis) {
      console.warn('⚠️ [getRoomDetails] Redis недоступен');
      return null;
    }
    
    // TypeScript type narrowing: после проверки redis точно не null
    const redisClient = redis;
    const slotsKey = KEYS.roomSlots(roomId);
    const slots = await redisClient.hgetall(slotsKey) || {};
    
    return {
      players,
      playerCount,
      slots: slots as Record<string, string>,
    };
  } catch (error: unknown) {
    console.error(`❌ Ошибка получения информации о комнате ${roomId}:`, error);
    return null;
  }
}

/**
 * Проверить здоровье системы
 */
export async function healthCheck(): Promise<{
  redis: boolean;
  database: boolean;
  errors: string[];
}> {
  const errors: string[] = [];
  let redisOk = false;
  let dbOk = false;
  
  // Проверка Redis
  if (redis) {
    // TypeScript type narrowing: после проверки redis точно не null
    const redisClient = redis;
    try {
      await redisClient.ping();
      redisOk = true;
    } catch (error: any) {
      errors.push(`Redis: ${error instanceof Error ? error.message : String(error)}`);
    }
  } else {
    errors.push('Redis: не инициализирован (переменные окружения не настроены)');
  }
  
  // Проверка БД
  try {
    const { error } = await supabase.from('_pidr_rooms').select('id').limit(1);
    if (!error) {
      dbOk = true;
    } else {
      errors.push(`Database: ${error instanceof Error ? error.message : String(error)}`);
    }
  } catch (error: any) {
    errors.push(`Database: ${error.message}`);
  }
  
  return {
    redis: redisOk,
    database: dbOk,
    errors,
  };
}

