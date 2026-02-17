import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '../../../../lib/supabase';

// GET /api/stats/online - Статистика онлайн игроков
export async function GET(req: NextRequest) {
  try {
    console.log('📊 Получение статистики онлайн игроков...');

    // 1. Общая статистика по статусам (проверяем ОБА поля!)
    let statusStats: any = {};
    let statusError: any = null;
    
    try {
      const { data, error } = await supabase
        .from('_pidr_users')
        .select('status, online_status');
      
      if (error) {
        statusError = error;
        console.error('❌ Ошибка получения статистики:', error);
      } else {
        statusStats = data?.reduce((acc: any, user: any) => {
          // Приоритет online_status над status
          const status = user.online_status || user.status || 'offline';
          acc[status] = (acc[status] || 0) + 1;
          return acc;
        }, {}) || {};
      }
    } catch (err: any) {
      statusError = err;
      console.error('❌ Исключение при получении статистики:', err);
    }

    // ✅ ИСПРАВЛЕНО: Не возвращаем ошибку сразу, продолжаем с дефолтными значениями
    if (statusError) {
      console.warn('⚠️ Ошибка получения статистики, используем дефолтные значения');
      statusStats = { offline: 0, online: 0 };
    }

    // 2. ✅ ИСПРАВЛЕНО: Реально активные игроки - считаем ВСЕХ онлайн правильно
    const moscowNow = new Date();
    const fiveMinutesAgo = new Date(moscowNow.getTime() - 5 * 60 * 1000).toISOString();
    const threeMinutesAgo = new Date(moscowNow.getTime() - 3 * 60 * 1000).toISOString();
    
    // ✅ ПОЛУЧАЕМ ВСЕХ ПОЛЬЗОВАТЕЛЕЙ С ПОЛЯМИ ДЛЯ ПОДСЧЕТА ОНЛАЙН
    let allUsers: any[] = [];
    let activeError: any = null;
    
    try {
      const { data, error } = await supabase
        .from('_pidr_users')
        .select('id, username, last_seen, status, online_status');
      
      if (error) {
        activeError = error;
        console.error('❌ Ошибка получения пользователей:', error);
      } else {
        allUsers = data || [];
      }
    } catch (err: any) {
      activeError = err;
      console.error('❌ Исключение при получении пользователей:', err);
      allUsers = [];
    }

    // ✅ ФИЛЬТРУЕМ: Считаем всех онлайн игроков (статус 'online' ИЛИ активность < 5 минут)
    const onlinePlayers = (allUsers || []).filter((user: any) => {
      const status = user.online_status || user.status || 'offline';
      const lastSeen = user.last_seen ? new Date(user.last_seen) : null;
      const isRecentlyActive = lastSeen && lastSeen >= new Date(fiveMinutesAgo);
      
      // ✅ ИГРОК ОНЛАЙН ЕСЛИ: статус = 'online' ИЛИ был активен за последние 5 минут
      return status === 'online' || isRecentlyActive;
    });
    
    console.log(`📊 [ONLINE STATS] Всего пользователей: ${allUsers?.length || 0}, онлайн: ${onlinePlayers.length}`);

    // 3. Игроки онлайн за последние 30 минут - московское время
    let online30min: any[] = [];
    try {
      const thirtyMinutesAgo = new Date(moscowNow.getTime() - 30 * 60 * 1000).toISOString();
      const { data, error } = await supabase
        .from('_pidr_users')
        .select('id, username, last_seen')
        .gte('last_seen', thirtyMinutesAgo);
      
      if (error) {
        console.error('❌ Ошибка получения онлайн за 30 мин:', error);
      } else {
        online30min = data || [];
      }
    } catch (err: any) {
      console.error('❌ Исключение при получении онлайн за 30 мин:', err);
      online30min = [];
    }

    // 4. Игроки в комнатах (проверяем ОБА поля!)
    let inRooms: any[] = [];
    try {
      const { data, error } = await supabase
        .from('_pidr_users')
        .select('id, status, online_status')
        .or('status.in.(in_room,playing),online_status.in.(in_room,playing)');
      
      if (error) {
        console.error('❌ Ошибка получения игроков в комнатах:', error);
      } else {
        inRooms = data || [];
      }
    } catch (err: any) {
      console.error('❌ Исключение при получении игроков в комнатах:', err);
      inRooms = [];
    }

    // ✅ ИСПРАВЛЕНО: Обновляем статус на offline для неактивных (ОБА поля!)
    // Обновляем только тех, кто был онлайн, но неактивен более 5 минут
    try {
      const { error: updateStatusError } = await supabase
        .from('_pidr_users')
        .update({ 
          status: 'offline',
          online_status: 'offline'
        })
        .or('status.eq.online,online_status.eq.online')
        .lt('last_seen', fiveMinutesAgo); // ✅ УВЕЛИЧИЛИ ДО 5 МИНУТ
      
      if (updateStatusError) {
        console.error('❌ Ошибка обновления статусов:', updateStatusError);
      } else {
        console.log(`✅ [ONLINE STATS] Обновлен статус неактивных игроков на offline`);
      }
    } catch (err: any) {
      console.error('❌ Исключение при обновлении статусов:', err);
    }
    
    // ✅ ИСПРАВЛЕНО: Считаем онлайн игроков правильно
    const onlineCount = onlinePlayers.length; // Реальное количество онлайн
    const offlineCount = (statusStats?.offline || 0);
    const totalUsers = onlineCount + offlineCount + (statusStats?.in_room || 0) + (statusStats?.playing || 0);
    
    const stats = {
      total: totalUsers || Object.values(statusStats || {}).reduce((a: any, b: any) => a + b, 0),
      byStatus: statusStats || {},
      reallyActive: onlineCount, // ✅ ИСПРАВЛЕНО: Реальное количество онлайн игроков
      online30min: online30min?.length || 0,   // Последние 30 минут
      inRooms: inRooms?.length || 0,
      moscowTime: new Date().toLocaleString('ru-RU', { 
        timeZone: 'Europe/Moscow',
        year: 'numeric',
        month: '2-digit', 
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      }),
      activeUsers: onlinePlayers.map((user: any) => ({
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
        minutesAgo: user.last_seen ? Math.round((moscowNow.getTime() - new Date(user.last_seen).getTime()) / 60000) : 0
      }))
    };

    console.log('✅ Статистика онлайна:', {
      ...stats,
      debug: {
        onlinePlayersCount: onlinePlayers.length,
        allUsersCount: allUsers?.length || 0,
        statusBreakdown: {
          online: onlinePlayers.filter((u: any) => (u.online_status || u.status) === 'online').length,
          recentlyActive: onlinePlayers.filter((u: any) => {
            const status = u.online_status || u.status || 'offline';
            const lastSeen = u.last_seen ? new Date(u.last_seen) : null;
            return status !== 'online' && lastSeen && lastSeen >= new Date(fiveMinutesAgo);
          }).length
        }
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
