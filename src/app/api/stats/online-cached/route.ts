import { NextRequest, NextResponse } from 'next/server';
import { getRedis } from '@/lib/redis/init';
import { supabaseAdmin } from '@/lib/supabase';

// Получаем Redis клиент через универсальную инициализацию
const redis = getRedis();

const REDIS_KEYS = {
  userOnline: (userId: string) => `user:${userId}:online`,
  onlineUsers: () => 'online:users',
};

/**
 * GET /api/stats/online-cached
 * Получить статистику онлайн игроков из Redis кеша (быстро)
 */
export async function GET(request: NextRequest) {
  // Если Redis не инициализирован, сразу используем fallback на БД
  if (!redis) {
    console.log('⚠️ Redis не доступен, используем fallback на БД');
    return getStatsFromDB();
  }

  try {
    // Получаем список онлайн пользователей из Redis
    const onlineUserIds = await redis.smembers(REDIS_KEYS.onlineUsers()) as string[];
    
    // Фильтруем только активных (проверяем TTL)
    const activeUsers: string[] = [];
    for (const userId of onlineUserIds) {
      const isOnline = await redis.exists(REDIS_KEYS.userOnline(userId));
      if (isOnline) {
        activeUsers.push(userId);
      } else {
        // Удаляем неактивных из SET
        await redis.srem(REDIS_KEYS.onlineUsers(), userId);
      }
    }

    // Получаем дополнительную информацию из БД (опционально, для деталей)
    let onlineDetails: any[] = [];
    if (activeUsers.length > 0) {
      const userIds = activeUsers.map(id => parseInt(id, 10)).filter(id => !isNaN(id));
      
      if (userIds.length > 0) {
        const [{ data: usersById }, { data: usersByTelegramId }] = await Promise.all([
          supabaseAdmin
            .from('_pidr_users')
            .select('id, telegram_id, username, online_status, status, last_seen')
            .in('id', userIds)
            .limit(100),
          supabaseAdmin
            .from('_pidr_users')
            .select('id, telegram_id, username, online_status, status, last_seen')
            .in('telegram_id', activeUsers)
            .limit(100)
        ]);
        
        const mergedUsers = [...(usersById || []), ...(usersByTelegramId || [])];
        const seenIds = new Set<number>();
        onlineDetails = mergedUsers.filter((user: any) => {
          if (!user?.id || seenIds.has(user.id)) return false;
          seenIds.add(user.id);
          return true;
        });
      }
    }

    // Подсчитываем по статусам
    const stats = {
      total: activeUsers.length,
      online: onlineDetails.filter((u: any) => (u.online_status || u.status) === 'online').length,
      in_room: onlineDetails.filter((u: any) => (u.online_status || u.status) === 'in_room').length,
      playing: onlineDetails.filter((u: any) => (u.online_status || u.status) === 'playing').length,
      cached: true, // Указываем что данные из кеша
      timestamp: new Date().toISOString()
    };

    console.log(`📊 [ONLINE CACHED] Онлайн игроков: ${stats.total}`);

    return NextResponse.json({
      success: true,
      stats
    });

  } catch (error: any) {
    console.error('❌ Error getting cached online stats:', error);
    // Fallback на БД если Redis недоступен
    return getStatsFromDB();
  }
}

/**
 * Получить статистику из БД (fallback)
 */
async function getStatsFromDB() {
  try {
    const { data: users } = await supabaseAdmin
      .from('_pidr_users')
      .select('online_status, status')
      .limit(1000);

    const stats = {
      total: users?.length || 0,
      online: users?.filter((u: any) => (u.online_status || u.status) === 'online').length || 0,
      in_room: users?.filter((u: any) => (u.online_status || u.status) === 'in_room').length || 0,
      playing: users?.filter((u: any) => (u.online_status || u.status) === 'playing').length || 0,
      cached: false,
      timestamp: new Date().toISOString()
    };

    return NextResponse.json({
      success: true,
      stats
    });
  } catch (dbError) {
    return NextResponse.json(
      { success: false, message: 'Ошибка получения статистики' },
      { status: 500 }
    );
  }
}

