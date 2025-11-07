/**
 * ============================================================
 * PLAYER STATE MIDDLEWARE
 * ============================================================
 * Middleware для проверки состояния игрока перед игровыми действиями
 * 
 * Использование:
 * - Проверка что игрок в комнате
 * - Проверка что игрок готов к игре
 * - Валидация прав доступа (хост / обычный игрок)
 */

import { NextRequest } from 'next/server';
import { getPlayerState, getPlayerRoom } from './player-state-manager';
import { supabase } from '../supabase';

export interface PlayerValidationResult {
  valid: boolean;
  error?: string;
  userId?: string;
  roomId?: string;
  isHost?: boolean;
  position?: number;
}

/**
 * Проверить что игрок находится в указанной комнате
 */
export async function validatePlayerInRoom(
  userId: string,
  expectedRoomId: string
): Promise<PlayerValidationResult> {
  try {
    // 1. Получаем состояние игрока из Redis
    const playerState = await getPlayerState(userId);
    
    if (!playerState) {
      return {
        valid: false,
        error: 'Состояние игрока не найдено. Попробуйте переподключиться.',
      };
    }
    
    // 2. Проверяем что игрок в указанной комнате
    if (playerState.currentRoomId !== expectedRoomId) {
      return {
        valid: false,
        error: `Вы не находитесь в этой комнате. Текущая комната: ${playerState.currentRoomId || 'нет'}`,
        roomId: playerState.currentRoomId || undefined,
      };
    }
    
    // 3. Проверяем актуальность данных в БД
    const { data: dbPlayer, error: dbError } = await supabase
      .from('_pidr_room_players')
      .select('position')
      .eq('room_id', expectedRoomId)
      .eq('user_id', userId)
      .single();
    
    if (dbError || !dbPlayer) {
      return {
        valid: false,
        error: 'Игрок не найден в комнате (БД). Попробуйте переподключиться.',
      };
    }
    
    // ✅ ОПРЕДЕЛЯЕМ ХОСТА ПО host_id В _pidr_rooms
    const { data: room } = await supabase
      .from('_pidr_rooms')
      .select('host_id')
      .eq('id', expectedRoomId)
      .single();
    
    const isHost = room?.host_id === userId;
    
    return {
      valid: true,
      userId,
      roomId: expectedRoomId,
      isHost,
      position: dbPlayer.position,
    };
    
  } catch (error: any) {
    console.error('❌ [VALIDATE] Ошибка валидации игрока:', error);
    return {
      valid: false,
      error: 'Ошибка проверки состояния игрока: ' + error.message,
    };
  }
}

/**
 * Проверить что игрок является хостом комнаты
 */
export async function validatePlayerIsHost(
  userId: string,
  roomId: string
): Promise<PlayerValidationResult> {
  const validation = await validatePlayerInRoom(userId, roomId);
  
  if (!validation.valid) {
    return validation;
  }
  
  if (!validation.isHost) {
    return {
      valid: false,
      error: 'Только хост может выполнять это действие',
      userId,
      roomId,
      isHost: false,
    };
  }
  
  return validation;
}

/**
 * Проверить что игрок может выполнять игровые действия
 */
export async function validatePlayerCanPlay(
  userId: string,
  roomId: string
): Promise<PlayerValidationResult> {
  const validation = await validatePlayerInRoom(userId, roomId);
  
  if (!validation.valid) {
    return validation;
  }
  
  // Дополнительные проверки для игры
  const { data: room, error: roomError } = await supabase
    .from('_pidr_rooms')
    .select('status')
    .eq('id', roomId)
    .single();
  
  if (roomError || !room) {
    return {
      valid: false,
      error: 'Комната не найдена',
    };
  }
  
  if (room.status !== 'playing') {
    return {
      valid: false,
      error: `Игра еще не началась. Статус комнаты: ${room.status}`,
      roomId,
    };
  }
  
  // Проверяем что игрок готов
  const { data: player } = await supabase
    .from('_pidr_room_players')
    .select('is_ready')
    .eq('room_id', roomId)
    .eq('user_id', userId)
    .single();
  
  if (!player?.is_ready) {
    return {
      valid: false,
      error: 'Вы не готовы к игре',
      roomId,
    };
  }
  
  return validation;
}

/**
 * Проверить что комната существует и доступна
 */
export async function validateRoomExists(
  roomId: string
): Promise<{
  valid: boolean;
  error?: string;
  room?: any;
}> {
  try {
    const { data: room, error } = await supabase
      .from('_pidr_rooms')
      .select('*')
      .eq('id', roomId)
      .single();
    
    if (error || !room) {
      return {
        valid: false,
        error: 'Комната не найдена',
      };
    }
    
    if (room.status === 'finished' || room.status === 'cancelled') {
      return {
        valid: false,
        error: `Комната закрыта. Статус: ${room.status}`,
      };
    }
    
    return {
      valid: true,
      room,
    };
    
  } catch (error: any) {
    return {
      valid: false,
      error: 'Ошибка проверки комнаты: ' + error.message,
    };
  }
}

/**
 * Проверить что у игрока нет активных комнат
 */
export async function validatePlayerNotInRoom(
  userId: string
): Promise<{
  valid: boolean;
  error?: string;
  currentRoomId?: string;
}> {
  try {
    const currentRoomId = await getPlayerRoom(userId);
    
    if (currentRoomId) {
      // Проверяем что комната еще существует
      const { data: room } = await supabase
        .from('_pidr_rooms')
        .select('name, room_code, status')
        .eq('id', currentRoomId)
        .single();
      
      if (room && (room.status === 'waiting' || room.status === 'playing')) {
        return {
          valid: false,
          error: `Вы уже находитесь в комнате "${room.name}" (${room.room_code})`,
          currentRoomId,
        };
      }
    }
    
    return {
      valid: true,
    };
    
  } catch (error: any) {
    console.error('❌ [VALIDATE] Ошибка проверки активных комнат:', error);
    return {
      valid: true, // В случае ошибки разрешаем продолжить
    };
  }
}

/**
 * Извлечь userId из запроса (для использования в middleware)
 */
export function extractUserId(req: NextRequest): string | null {
  // Из cookies
  const userIdCookie = req.cookies.get('user_id')?.value;
  if (userIdCookie) {
    return userIdCookie;
  }
  
  // Из заголовка Authorization
  const authHeader = req.headers.get('authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    // Здесь можно декодировать JWT если используется
    // Для простоты возвращаем токен как userId
    return token;
  }
  
  return null;
}

/**
 * Middleware wrapper для защиты эндпоинтов
 */
export function withPlayerValidation(
  handler: (req: NextRequest, context: any) => Promise<Response>,
  options: {
    requireInRoom?: boolean;
    requireHost?: boolean;
    requireReady?: boolean;
  } = {}
) {
  return async (req: NextRequest, context: any) => {
    const userId = extractUserId(req);
    
    if (!userId) {
      return new Response(
        JSON.stringify({
          success: false,
          message: 'Unauthorized: User ID not found',
        }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    // Если требуется проверка комнаты
    if (options.requireInRoom || options.requireHost || options.requireReady) {
      const roomId = context.params?.roomId;
      
      if (!roomId) {
        return new Response(
          JSON.stringify({
            success: false,
            message: 'Room ID required',
          }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }
      
      // Валидация хоста
      if (options.requireHost) {
        const validation = await validatePlayerIsHost(userId, roomId);
        if (!validation.valid) {
          return new Response(
            JSON.stringify({
              success: false,
              message: validation.error,
            }),
            { status: 403, headers: { 'Content-Type': 'application/json' } }
          );
        }
      }
      // Валидация готовности к игре
      else if (options.requireReady) {
        const validation = await validatePlayerCanPlay(userId, roomId);
        if (!validation.valid) {
          return new Response(
            JSON.stringify({
              success: false,
              message: validation.error,
            }),
            { status: 403, headers: { 'Content-Type': 'application/json' } }
          );
        }
      }
      // Просто проверка нахождения в комнате
      else if (options.requireInRoom) {
        const validation = await validatePlayerInRoom(userId, roomId);
        if (!validation.valid) {
          return new Response(
            JSON.stringify({
              success: false,
              message: validation.error,
            }),
            { status: 403, headers: { 'Content-Type': 'application/json' } }
          );
        }
      }
    }
    
    // Вызываем оригинальный handler
    return handler(req, context);
  };
}

