import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '../../../../lib/supabase';

// GET /api/stats/online - Статистика онлайн игроков
export async function GET(req: NextRequest) {
  try {
    console.log('📊 Получение статистики онлайн игроков...');

    // 1. Общая статистика по статусам
    const { data: statusStats, error: statusError } = await supabase
      .from('_pidr_users')
      .select('status')
      .then(({ data, error }: { data: any; error: any }) => {
        if (error) return { data: null, error };
        
        const stats = data?.reduce((acc: any, user: any) => {
          acc[user.status] = (acc[user.status] || 0) + 1;
          return acc;
        }, {}) || {};
        
        return { data: stats, error: null };
      });

    if (statusError) {
      console.error('❌ Ошибка получения статистики:', statusError);
      return NextResponse.json({ 
        success: false, 
        message: 'Ошибка получения статистики' 
      }, { status: 500 });
    }

    // 2. Реально активные игроки (последние 3 минуты) - московское время
    const moscowNow = new Date();
    const threeMinutesAgo = new Date(moscowNow.getTime() - 3 * 60 * 1000).toISOString();
    const { data: reallyActive, error: activeError } = await supabase
      .from('_pidr_users')
      .select('id, username, last_seen')
      .gte('last_seen', threeMinutesAgo);

    if (activeError) {
      console.error('❌ Ошибка получения активных игроков:', activeError);
    }

    // 3. Игроки онлайн за последние 30 минут - московское время
    const thirtyMinutesAgo = new Date(moscowNow.getTime() - 30 * 60 * 1000).toISOString();
    const { data: online30min, error: online30Error } = await supabase
      .from('_pidr_users')
      .select('id, username, last_seen')
      .gte('last_seen', thirtyMinutesAgo);

    if (online30Error) {
      console.error('❌ Ошибка получения онлайн за 30 мин:', online30Error);
    }

    // 4. Игроки в комнатах
    const { data: inRooms, error: roomsError } = await supabase
      .from('_pidr_users')
      .select('id')
      .in('status', ['in_room', 'playing']);

    if (roomsError) {
      console.error('❌ Ошибка получения игроков в комнатах:', roomsError);
    }

    // ✅ ИСПРАВЛЕНО: Обновляем статус на offline для неактивных
    const { error: updateStatusError } = await supabase
      .from('_pidr_users')
      .update({ status: 'offline' })
      .eq('status', 'online')
      .lt('last_seen', threeMinutesAgo);
    
    if (updateStatusError) {
      console.error('❌ Ошибка обновления статусов:', updateStatusError);
    }
    
    const stats = {
      total: Object.values(statusStats || {}).reduce((a: any, b: any) => a + b, 0),
      byStatus: statusStats || {},
      reallyActive: reallyActive?.length || 0, // Последние 3 минуты
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
      activeUsers: reallyActive?.map((user: any) => ({
        id: user.id,
        username: user.username,
        lastSeenMoscow: new Date(user.last_seen).toLocaleString('ru-RU', { 
          timeZone: 'Europe/Moscow',
          year: 'numeric',
          month: '2-digit', 
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit'
        }),
        minutesAgo: Math.round((moscowNow.getTime() - new Date(user.last_seen).getTime()) / 60000)
      })) || []
    };

    console.log('✅ Статистика онлайна:', stats);

    return NextResponse.json({
      success: true,
      stats
    });

  } catch (error: any) {
    console.error('❌ Ошибка API статистики:', error);
    return NextResponse.json({ 
      success: false, 
      message: 'Ошибка сервера' 
    }, { status: 500 });
  }
}
