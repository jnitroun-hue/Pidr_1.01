import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getUserIdFromRequest } from '@/lib/auth-utils';
import { Redis } from '@upstash/redis';

// Безопасная инициализация Redis (только для Upstash REST API)
let redis: Redis | null = null;
try {
  // Vercel Upstash использует KV_REST_API_URL и KV_REST_API_TOKEN
  // Также поддерживаем старые имена для совместимости
  const redisUrl = process.env.KV_REST_API_URL || 
                   process.env.UPSTASH_REDIS_REST_URL || 
                   process.env.REDIS_URL || '';
  const redisToken = process.env.KV_REST_API_TOKEN || 
                     process.env.UPSTASH_REDIS_REST_TOKEN || 
                     process.env.REDIS_TOKEN || '';
  
  // Upstash Redis требует URL начинающийся с https://
  if (redisUrl && redisUrl.startsWith('https://') && redisToken) {
    redis = new Redis({
      url: redisUrl,
      token: redisToken,
    });
    console.log('✅ Redis инициализирован (Upstash REST API)');
  } else if (redisUrl && !redisUrl.startsWith('https://')) {
    console.warn('⚠️ Redis URL не поддерживается для Upstash клиента. Используйте KV_REST_API_URL (https://) из Vercel.');
  }
} catch (error) {
  console.warn('⚠️ Не удалось инициализировать Redis:', error);
  redis = null;
}

// Ключи Redis для онлайн статуса
const REDIS_KEYS = {
  userOnline: (userId: string) => `user:${userId}:online`,
  userLastSeen: (userId: string) => `user:${userId}:last_seen`,
  onlineUsers: () => 'online:users', // SET всех онлайн пользователей
};

// 💓 API: Heartbeat для обновления онлайн статуса с Redis кешированием
export async function POST(request: NextRequest) {
  try {
    // ✅ ИСПРАВЛЕНО: Используем x-telegram-id как fallback
    let userId: string | null = getUserIdFromRequest(request);
    
    // Если нет из токена, пробуем из header
    if (!userId) {
      const telegramIdHeader = request.headers.get('x-telegram-id');
      if (telegramIdHeader) {
        userId = telegramIdHeader;
      }
    }
    
    if (!userId) {
      return NextResponse.json({ success: false, error: 'Не авторизован' }, { status: 401 });
    }

    const userIdBigInt = parseInt(userId, 10);
    const now = new Date().toISOString();
    const nowTimestamp = Date.now();

    // ✅ ОБНОВЛЯЕМ REDIS КЕШ (быстро)
    if (redis) {
      try {
        // Устанавливаем онлайн статус в Redis (TTL 5 минут)
        await redis.set(REDIS_KEYS.userOnline(userId), '1', { ex: 300 }); // 5 минут
        await redis.set(REDIS_KEYS.userLastSeen(userId), nowTimestamp.toString(), { ex: 300 });
        
        // Добавляем в SET онлайн пользователей
        await redis.sadd(REDIS_KEYS.onlineUsers(), userId);
        await redis.expire(REDIS_KEYS.onlineUsers(), 300); // Обновляем TTL для SET
        
        console.log(`💓 [HEARTBEAT REDIS] Обновлен кеш для ${userId}`);
      } catch (redisError) {
        console.error('⚠️ [HEARTBEAT] Ошибка Redis (не критично):', redisError);
        // Продолжаем даже если Redis недоступен
      }
    }

    // ✅ ОБНОВЛЯЕМ БД (реже, для персистентности)
    // Обновляем БД только раз в 30 секунд для каждого пользователя
    let shouldUpdateDb = true;
    if (redis) {
      const lastDbUpdate = await redis.get(`user:${userId}:last_db_update`);
      shouldUpdateDb = !lastDbUpdate || (Date.now() - parseInt(lastDbUpdate as string)) > 30000;
    }

    if (shouldUpdateDb) {
      const updateData: any = {
        last_seen: now
      };
      
      // Обновляем статус (поддержка обоих вариантов столбцов)
      updateData.online_status = 'online';
      updateData.status = 'online';
      
      const { error, data: updatedUser } = await supabase
        .from('_pidr_users')
        .update(updateData)
        .eq('telegram_id', userIdBigInt)
        .select();
      
      console.log(`💓 [HEARTBEAT DB] Обновлен статус для ${userId}:`, updatedUser);

      if (error) {
        console.error('❌ [HEARTBEAT] Ошибка обновления онлайн статуса:', error);
        // Не возвращаем ошибку, т.к. Redis уже обновлен
      } else {
        // Сохраняем время последнего обновления БД (если Redis доступен)
        if (redis) {
          await redis.set(`user:${userId}:last_db_update`, Date.now().toString(), { ex: 60 });
        }
      }
    }

    // ✅ ОБНОВЛЯЕМ is_online В _pidr_room_players И last_activity КОМНАТЫ (с Redis кешем)
    try {
      let roomId: string | null = null;
      
      if (redis) {
        // Проверяем Redis кеш для комнаты
        const cachedRoomId = await redis.get(`user:${userId}:room`);
        if (cachedRoomId) {
          roomId = cachedRoomId as string;
        }
      }
      
      if (!roomId) {
        // Если нет в кеше, запрашиваем из БД
        const { data: playerRoom } = await supabase
          .from('_pidr_room_players')
          .select('room_id')
          .eq('user_id', userIdBigInt)
          .maybeSingle();
        
        roomId = playerRoom?.room_id?.toString() || null;
        
        // Сохраняем в кеш если Redis доступен
        if (roomId && redis) {
          await redis.set(`user:${userId}:room`, roomId, { ex: 300 });
        }
      }
      
      if (roomId) {
        const now = new Date().toISOString();
        
        // Обновляем Redis кеш для комнаты (если доступен)
        if (redis) {
          await redis.set(`room:${roomId}:last_activity`, nowTimestamp.toString(), { ex: 300 });
          await redis.sadd(`room:${roomId}:online_players`, userId);
          await redis.expire(`room:${roomId}:online_players`, 300);
          
          // Обновляем БД (реже)
          const lastRoomDbUpdate = await redis.get(`room:${roomId}:last_db_update`);
          const shouldUpdateRoomDb = !lastRoomDbUpdate || (Date.now() - parseInt(lastRoomDbUpdate as string)) > 30000;
          
          if (shouldUpdateRoomDb) {
            // ✅ ИСПРАВЛЕНО: Обновляем is_online в _pidr_room_players
            await supabase
              .from('_pidr_room_players')
              .update({ 
                is_online: true,
                last_activity: now
              })
              .eq('user_id', userIdBigInt)
              .eq('room_id', parseInt(roomId));
            
            // Обновляем last_activity комнаты
            await supabase
              .from('_pidr_rooms')
              .update({ 
                last_activity: now,
                updated_at: now
              })
              .eq('id', parseInt(roomId));
            
            await redis.set(`room:${roomId}:last_db_update`, Date.now().toString(), { ex: 60 });
            console.log(`✅ [HEARTBEAT] Обновлена активность комнаты ${roomId} и is_online для игрока`);
          }
        } else {
          // Если Redis недоступен, обновляем БД напрямую
          await supabase
            .from('_pidr_room_players')
            .update({ 
              is_online: true,
              last_activity: now
            })
            .eq('user_id', userIdBigInt)
            .eq('room_id', parseInt(roomId));
          
          await supabase
            .from('_pidr_rooms')
            .update({ 
              last_activity: now,
              updated_at: now
            })
            .eq('id', parseInt(roomId));
        }
      }
    } catch (roomError) {
      console.error('⚠️ [HEARTBEAT] Ошибка обновления активности комнаты:', roomError);
      // Не критично, продолжаем
    }

    return NextResponse.json({
      success: true,
      message: 'Онлайн статус обновлён',
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('❌ [HEARTBEAT] Ошибка:', error);
    return NextResponse.json({
      success: false,
      error: (error instanceof Error ? error.message : String(error)) || 'Ошибка heartbeat'
    }, { status: 500 });
  }
}

// GET для ручного вызова
export async function GET(request: NextRequest) {
  return POST(request);
}

