import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getUserIdFromRequest, getUserIdFromDatabase } from '@/lib/auth-utils';
import { getRedis } from '@/lib/redis/init';

// ✅ Явная конфигурация runtime для Next.js 15
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Получаем Redis клиент через универсальную инициализацию
const redis = getRedis();

// Ключи Redis для онлайн статуса
const REDIS_KEYS = {
  userOnline: (userId: string) => `user:${userId}:online`,
  userLastSeen: (userId: string) => `user:${userId}:last_seen`,
  onlineUsers: () => 'online:users', // SET всех онлайн пользователей
};

// 💓 API: Heartbeat для обновления онлайн статуса с Redis кешированием
export async function POST(request: NextRequest) {
  try {
    // ✅ ИСПРАВЛЕНО: Используем универсальную систему авторизации
    const { userId, environment } = getUserIdFromRequest(request);
    
    if (!userId) {
      return NextResponse.json({ success: false, error: 'Не авторизован' }, { status: 401 });
    }

    // ✅ УНИВЕРСАЛЬНО: Получаем id из БД для обновления статуса
    const { dbUserId } = await getUserIdFromDatabase(userId, environment);
    
    if (!dbUserId) {
      return NextResponse.json({ success: false, error: 'Пользователь не найден в БД' }, { status: 404 });
    }

    const userIdBigInt = dbUserId;
    const cacheUserId = String(dbUserId);
    const now = new Date().toISOString();
    const nowTimestamp = Date.now();

    // ✅ ОПТИМИЗАЦИЯ ДЛЯ БЕСПЛАТНОГО ПЛАНА: Минимизируем Redis операции
    // Используем pipeline для батч-операций (экономия запросов к Redis)
    if (redis) {
      try {
        // ✅ БАТЧ-ОПЕРАЦИИ: Выполняем несколько операций за один запрос
        await Promise.all([
          redis.set(REDIS_KEYS.userOnline(cacheUserId), '1', { ex: 300 }),
          redis.set(REDIS_KEYS.userLastSeen(cacheUserId), nowTimestamp.toString(), { ex: 300 }),
          redis.sadd(REDIS_KEYS.onlineUsers(), cacheUserId),
          redis.expire(REDIS_KEYS.onlineUsers(), 300)
        ]);
        
        console.log(`💓 [HEARTBEAT REDIS] Обновлен кеш для ${cacheUserId} (батч-операции)`);
      } catch (redisError) {
        console.error('⚠️ [HEARTBEAT] Ошибка Redis (не критично):', redisError);
        // Продолжаем даже если Redis недоступен
      }
    }

    // ✅ ОБНОВЛЯЕМ БД (реже, для персистентности)
    // Обновляем БД только раз в 30 секунд для каждого пользователя
    let shouldUpdateDb = true;
    if (redis) {
      const lastDbUpdate = await redis.get(`user:${cacheUserId}:last_db_update`);
      shouldUpdateDb = !lastDbUpdate || (Date.now() - parseInt(lastDbUpdate as string)) > 30000;
    }

    if (shouldUpdateDb) {
      const updateData: any = {
        last_seen: now
      };
      
      // Обновляем статус (поддержка обоих вариантов столбцов)
      updateData.online_status = 'online';
      updateData.status = 'online';
      
      // ✅ ИСПРАВЛЕНО: Используем сервисную роль для обновления статуса, чтобы обойти RLS политики
      // Это предотвращает бесконечную рекурсию в RLS политиках
      // Используем админский клиент, который обходит RLS
      const { error, data: updatedUser } = await supabaseAdmin
        .from('_pidr_users')
        .update(updateData)
        .eq('id', userIdBigInt)
        .select();
      
      console.log(`💓 [HEARTBEAT DB] Обновлен статус для ${userId}:`, updatedUser ? 'успешно' : 'ошибка');

      if (error) {
        console.error('❌ [HEARTBEAT] Ошибка обновления онлайн статуса:', error);
        // Не возвращаем ошибку, т.к. Redis уже обновлен
        // Если это ошибка рекурсии RLS - просто логируем и продолжаем
        if (error.code === '42P17') {
          console.warn('⚠️ [HEARTBEAT] Обнаружена рекурсия RLS, используем только Redis кеш');
        }
      } else {
        // Сохраняем время последнего обновления БД (если Redis доступен)
        if (redis) {
          await redis.set(`user:${cacheUserId}:last_db_update`, Date.now().toString(), { ex: 60 });
        }
      }
    }

    // ✅ ОБНОВЛЯЕМ is_online В _pidr_room_players И last_activity КОМНАТЫ (с Redis кешем)
    try {
      let roomId: string | null = null;
      
      if (redis) {
        // Проверяем Redis кеш для комнаты
        const cachedRoomId = await redis.get(`user:${cacheUserId}:room`);
        if (cachedRoomId) {
          roomId = cachedRoomId as string;
        }
      }
      
      if (!roomId) {
        // Если нет в кеше, запрашиваем из БД
        const { data: playerRoom } = await supabaseAdmin
          .from('_pidr_room_players')
          .select('room_id')
          .eq('user_id', userIdBigInt)
          .maybeSingle();
        
        roomId = playerRoom?.room_id?.toString() || null;
        
        // Сохраняем в кеш если Redis доступен
        if (roomId && redis) {
          await redis.set(`user:${cacheUserId}:room`, roomId, { ex: 300 });
        }
      }
      
      if (roomId) {
        const now = new Date().toISOString();
        
        // Обновляем Redis кеш для комнаты (если доступен)
        if (redis) {
          await redis.set(`room:${roomId}:last_activity`, nowTimestamp.toString(), { ex: 300 });
          await redis.sadd(`room:${roomId}:online_players`, cacheUserId);
          await redis.expire(`room:${roomId}:online_players`, 300);
          
          // Обновляем БД (реже)
          const lastRoomDbUpdate = await redis.get(`room:${roomId}:last_db_update`);
          const shouldUpdateRoomDb = !lastRoomDbUpdate || (Date.now() - parseInt(lastRoomDbUpdate as string)) > 30000;
          
          if (shouldUpdateRoomDb) {
            // ✅ ИСПРАВЛЕНО: Обновляем is_online в _pidr_room_players
            await supabaseAdmin
              .from('_pidr_room_players')
              .update({ 
                is_online: true,
                last_activity: now
              })
              .eq('user_id', userIdBigInt)
              .eq('room_id', parseInt(roomId));
            
            // Обновляем last_activity комнаты
            await supabaseAdmin
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
          await supabaseAdmin
            .from('_pidr_room_players')
            .update({ 
              is_online: true,
              last_activity: now
            })
            .eq('user_id', userIdBigInt)
            .eq('room_id', parseInt(roomId));
          
          await supabaseAdmin
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

