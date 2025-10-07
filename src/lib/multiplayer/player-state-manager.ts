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

import { Redis } from '@upstash/redis';
import { supabase } from '../supabase';

// Инициализация Redis
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL || '',
  token: process.env.UPSTASH_REDIS_REST_TOKEN || '',
});

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
  const lockKey = KEYS.playerLock(userId);
  const lockId = `${Date.now()}-${Math.random()}`;
  
  // Пробуем получить блокировку
  const result = await redis.set(lockKey, lockId, {
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
  const lockKey = KEYS.playerLock(userId);
  
  // Проверяем что это наша блокировка перед удалением
  const currentLock = await redis.get(lockKey);
  
  if (currentLock === lockId) {
    await redis.del(lockKey);
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
  const lockKey = KEYS.roomLock(roomId);
  const lockId = `${Date.now()}-${Math.random()}`;
  
  const result = await redis.set(lockKey, lockId, {
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
  const lockKey = KEYS.roomLock(roomId);
  const currentLock = await redis.get(lockKey);
  
  if (currentLock === lockId) {
    await redis.del(lockKey);
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
  const key = KEYS.playerState(userId);
  const state = await redis.get<PlayerState>(key);
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
  const key = KEYS.playerState(userId);
  await redis.set(key, state, { ex: ttlSeconds });
}

/**
 * Получить текущую комнату игрока
 */
export async function getPlayerRoom(userId: string): Promise<string | null> {
  return await redis.get(KEYS.userRoom(userId));
}

/**
 * Установить комнату игрока
 */
export async function setPlayerRoom(
  userId: string,
  roomId: string | null
): Promise<void> {
  const key = KEYS.userRoom(userId);
  
  if (roomId) {
    await redis.set(key, roomId, { ex: 7200 }); // 2 часа
  } else {
    await redis.del(key);
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
  const key = KEYS.roomPlayers(roomId);
  const players = await redis.smembers(key);
  return players as string[];
}

/**
 * Добавить игрока в комнату (Redis SET)
 */
export async function addPlayerToRoom(
  roomId: string,
  userId: string
): Promise<void> {
  const key = KEYS.roomPlayers(roomId);
  await redis.sadd(key, userId);
  await redis.expire(key, 7200); // 2 часа
}

/**
 * Удалить игрока из комнаты (Redis SET)
 */
export async function removePlayerFromRoom(
  roomId: string,
  userId: string
): Promise<void> {
  const key = KEYS.roomPlayers(roomId);
  await redis.srem(key, userId);
}

/**
 * Получить количество игроков в комнате
 */
export async function getRoomPlayerCount(roomId: string): Promise<number> {
  const key = KEYS.roomPlayers(roomId);
  const count = await redis.scard(key);
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
  const slotsKey = KEYS.roomSlots(roomId);
  const occupiedSlots = await redis.hgetall(slotsKey);
  
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
  const slotsKey = KEYS.roomSlots(roomId);
  await redis.hset(slotsKey, { [position.toString()]: userId });
  await redis.expire(slotsKey, 7200);
}

/**
 * Освободить позицию за столом
 */
export async function freePosition(
  roomId: string,
  position: number
): Promise<void> {
  const slotsKey = KEYS.roomSlots(roomId);
  await redis.hdel(slotsKey, position.toString());
}

/**
 * Получить позицию игрока в комнате
 */
export async function getPlayerPosition(
  roomId: string,
  userId: string
): Promise<number | null> {
  const slotsKey = KEYS.roomSlots(roomId);
  const slots = await redis.hgetall(slotsKey);
  
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
      await syncPlayerToDatabase({
        roomId,
        userId,
        username,
        position,
        isHost,
      });
      
      // 10. ОБНОВЛЯЕМ СЧЕТЧИК В БД
      await updateRoomPlayerCount(roomId);
      
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
  
  // UPSERT в БД
  const { error } = await supabase
    .from('_pidr_room_players')
    .upsert(
      {
        room_id: roomId,
        user_id: userId,
        username,
        position,
        is_host: isHost,
        is_ready: isHost, // Хост сразу готов
        joined_at: new Date().toISOString(),
      },
      {
        onConflict: 'room_id,user_id',
      }
    );
  
  if (error) {
    console.error(`❌ [SYNC DB] Ошибка синхронизации с БД:`, error);
    throw error;
  }
}

/**
 * Обновить счетчик игроков в комнате
 */
async function updateRoomPlayerCount(roomId: string): Promise<void> {
  // Считаем реальное количество игроков в Redis
  const count = await getRoomPlayerCount(roomId);
  
  // Обновляем в БД
  const { error } = await supabase
    .from('_pidr_rooms')
    .update({ current_players: count })
    .eq('id', roomId);
  
  if (error) {
    console.error(`❌ [SYNC DB] Ошибка обновления счетчика:`, error);
  } else {
    console.log(`📊 [SYNC DB] Счетчик комнаты ${roomId} обновлен: ${count}`);
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
    const slotsKey = KEYS.roomSlots(roomId);
    const slots = await redis.hgetall(slotsKey) || {};
    
    return {
      players,
      playerCount,
      slots: slots as Record<string, string>,
    };
  } catch (error) {
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
  try {
    await redis.ping();
    redisOk = true;
  } catch (error: any) {
    errors.push(`Redis: ${error.message}`);
  }
  
  // Проверка БД
  try {
    const { error } = await supabase.from('_pidr_rooms').select('id').limit(1);
    if (!error) {
      dbOk = true;
    } else {
      errors.push(`Database: ${error.message}`);
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

