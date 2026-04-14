import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../lib/supabase';

// ✅ Явная конфигурация runtime для Next.js 15
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// GET /api/stats/online - Статистика онлайн игроков
export async function GET(req: NextRequest) {
  try {
    console.log('📊 Получение статистики онлайн игроков...');

    const now = Date.now();
    const fiveMinutesAgo = now - 5 * 60 * 1000;
    const thirtyMinutesAgo = now - 30 * 60 * 1000;

    const { data: allUsers, error } = await supabaseAdmin
      .from('_pidr_users')
      .select('id, username, last_seen, status, online_status');

    if (error) {
      console.error('❌ Ошибка получения пользователей:', error);
      throw error;
    }

    const users = allUsers || [];
    const getLastSeenMs = (value: string | null) => {
      if (!value) return null;
      const time = new Date(value).getTime();
      return Number.isNaN(time) ? null : time;
    };

    const recentActiveUsers = users.filter((user: any) => {
      const lastSeenMs = getLastSeenMs(user.last_seen);
      return lastSeenMs !== null && lastSeenMs >= fiveMinutesAgo;
    });

    const seenInLast30Minutes = users.filter((user: any) => {
      const lastSeenMs = getLastSeenMs(user.last_seen);
      return lastSeenMs !== null && lastSeenMs >= thirtyMinutesAgo;
    });

    const inRoomsUsers = users.filter((user: any) => {
      const lastSeenMs = getLastSeenMs(user.last_seen);
      const currentStatus = user.online_status || user.status || 'offline';
      return lastSeenMs !== null && lastSeenMs >= fiveMinutesAgo && ['in_room', 'playing'].includes(currentStatus);
    });

    const statusStats = users.reduce((acc: Record<string, number>, user: any) => {
      const lastSeenMs = getLastSeenMs(user.last_seen);
      const rawStatus = user.online_status || user.status || 'offline';

      let effectiveStatus = 'offline';
      if (lastSeenMs !== null && lastSeenMs >= fiveMinutesAgo) {
        effectiveStatus = ['in_room', 'playing'].includes(rawStatus) ? rawStatus : 'online';
      }

      acc[effectiveStatus] = (acc[effectiveStatus] || 0) + 1;
      return acc;
    }, {});

    const stats = {
      total: users.length,
      byStatus: statusStats,
      reallyActive: recentActiveUsers.length,
      online30min: seenInLast30Minutes.length,
      inRooms: inRoomsUsers.length,
      moscowTime: new Date().toLocaleString('ru-RU', {
        timeZone: 'Europe/Moscow',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      }),
      activeUsers: recentActiveUsers.map((user: any) => ({
        id: user.id,
        username: user.username,
        lastSeenMoscow: user.last_seen ? new Date(user.last_seen).toLocaleString('ru-RU', {
          timeZone: 'Europe/Moscow',
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit'
        }) : 'Недавно',
        minutesAgo: user.last_seen ? Math.max(0, Math.round((now - new Date(user.last_seen).getTime()) / 60000)) : 0
      }))
    };

    console.log('✅ Статистика онлайна:', {
      ...stats,
      debug: {
        allUsersCount: users.length,
        recentActiveCount: recentActiveUsers.length,
        recent30minCount: seenInLast30Minutes.length,
        inRoomsCount: inRoomsUsers.length,
      }
    });

    const response = NextResponse.json({
      success: true,
      stats
    });
    
    // ✅ УСТАНАВЛИВАЕМ ЗАГОЛОВКИ ДЛЯ ОТКЛЮЧЕНИЯ КЭШИРОВАНИЯ
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Expires', '0');
    
    return response;

  } catch (error: any) {
    console.error('❌ Ошибка API статистики:', error);
    return NextResponse.json({ 
      success: false, 
      message: 'Ошибка сервера' 
    }, { status: 500 });
  }
}
