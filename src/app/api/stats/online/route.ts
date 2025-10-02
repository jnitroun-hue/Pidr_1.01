import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '../../../lib/supabase';

// GET /api/stats/online - Статистика онлайн игроков
export async function GET(req: NextRequest) {
  try {
    console.log('📊 Получение статистики онлайн игроков...');

    // 1. Общая статистика по статусам
    const { data: statusStats, error: statusError } = await supabase
      .from('_pidr_users')
      .select('status')
      .then(({ data, error }) => {
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

    // 2. Реально активные игроки (последние 5 минут)
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    const { data: reallyActive, error: activeError } = await supabase
      .from('_pidr_users')
      .select('id')
      .eq('status', 'online')
      .gte('last_seen', fiveMinutesAgo);

    if (activeError) {
      console.error('❌ Ошибка получения активных игроков:', activeError);
    }

    // 3. Игроки онлайн за последние 30 минут
    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();
    const { data: online30min, error: online30Error } = await supabase
      .from('_pidr_users')
      .select('id')
      .eq('status', 'online')
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

    const stats = {
      total: Object.values(statusStats || {}).reduce((a: any, b: any) => a + b, 0),
      byStatus: statusStats || {},
      reallyActive: reallyActive?.length || 0, // Последние 5 минут
      online30min: online30min?.length || 0,   // Последние 30 минут
      inRooms: inRooms?.length || 0
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
