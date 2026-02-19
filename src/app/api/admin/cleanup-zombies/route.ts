import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../lib/supabase';

// POST /api/admin/cleanup-zombies - Очистка зомби-онлайн статусов
export async function POST(req: NextRequest) {
  try {
    console.log('🧟 Очистка зомби-онлайн статусов...');

    // Переводим в offline пользователей, которые не заходили больше 10 минут
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    
    // ✅ ИСПРАВЛЕНО: Используем supabaseAdmin для обхода RLS
    const { data: zombieUsers, error: findError } = await supabaseAdmin
      .from('_pidr_users')
      .select('id, username, last_seen')
      .eq('status', 'online')
      .lt('last_seen', tenMinutesAgo);

    if (findError) {
      console.error('❌ Ошибка поиска зомби:', findError);
      return NextResponse.json({ 
        success: false, 
        message: 'Ошибка поиска зомби-пользователей' 
      }, { status: 500 });
    }

    console.log(`🧟 Найдено зомби-пользователей: ${zombieUsers?.length || 0}`);

    if (zombieUsers && zombieUsers.length > 0) {
      // ✅ ИСПРАВЛЕНО: Используем supabaseAdmin для обхода RLS
      // Переводим их в offline
      const { error: updateError } = await supabaseAdmin
        .from('_pidr_users')
        .update({ status: 'offline' })
        .eq('status', 'online')
        .lt('last_seen', tenMinutesAgo);

      if (updateError) {
        console.error('❌ Ошибка обновления статусов:', updateError);
        return NextResponse.json({ 
          success: false, 
          message: 'Ошибка обновления статусов' 
        }, { status: 500 });
      }

      console.log(`✅ Переведено в offline: ${zombieUsers.length} пользователей`);
    }

    // ✅ ИСПРАВЛЕНО: Используем supabaseAdmin для обхода RLS
    // Получаем актуальную статистику
    const { data: stats } = await supabaseAdmin
      .from('_pidr_users')
      .select('status')
      .then(({ data, error }: { data: any; error: any }) => {
        if (error) return { data: null };
        
        const statusCounts = data?.reduce((acc: any, user: any) => {
          acc[user.status] = (acc[user.status] || 0) + 1;
          return acc;
        }, {}) || {};
        
        return { data: statusCounts };
      });

    return NextResponse.json({
      success: true,
      message: `Очистка завершена. Переведено в offline: ${zombieUsers?.length || 0}`,
      zombiesCleared: zombieUsers?.length || 0,
      zombieUsers: zombieUsers?.map((u: any) => ({
        id: u.id,
        username: u.username,
        lastSeen: u.last_seen,
        minutesAgo: Math.round((Date.now() - new Date(u.last_seen).getTime()) / 60000)
      })) || [],
      currentStats: stats || {}
    });

  } catch (error: any) {
    console.error('❌ Ошибка очистки зомби:', error);
    return NextResponse.json({ 
      success: false, 
      message: 'Ошибка сервера' 
    }, { status: 500 });
  }
}

// GET /api/admin/cleanup-zombies - Просмотр зомби без очистки
export async function GET(req: NextRequest) {
  try {
    console.log('👀 Просмотр зомби-онлайн статусов...');

    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    
    // ✅ ИСПРАВЛЕНО: Используем supabaseAdmin для обхода RLS
    const { data: zombieUsers, error } = await supabaseAdmin
      .from('_pidr_users')
      .select('id, username, last_seen, status')
      .eq('status', 'online')
      .lt('last_seen', tenMinutesAgo);

    if (error) {
      console.error('❌ Ошибка поиска зомби:', error);
      return NextResponse.json({ 
        success: false, 
        message: 'Ошибка поиска зомби-пользователей' 
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      zombieCount: zombieUsers?.length || 0,
      zombies: zombieUsers?.map((u: any) => ({
        id: u.id,
        username: u.username,
        lastSeen: new Date(u.last_seen).toLocaleString('ru-RU', { 
          timeZone: 'Europe/Moscow',
          year: 'numeric',
          month: '2-digit', 
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit'
        }),
        minutesAgo: Math.round((Date.now() - new Date(u.last_seen).getTime()) / 60000)
      })) || []
    });

  } catch (error: any) {
    console.error('❌ Ошибка просмотра зомби:', error);
    return NextResponse.json({ 
      success: false, 
      message: 'Ошибка сервера' 
    }, { status: 500 });
  }
}
