import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { requireAuth } from '@/lib/auth-utils';

// POST /api/admin/fix-multiplayer - Исправление проблем мультиплеера
export async function POST(req: NextRequest) {
  try {
    const auth = requireAuth(req);
    if (auth.error) {
      return NextResponse.json({ success: false, message: auth.error }, { status: 401 });
    }

    const body = await req.json();
    const { action, roomCode } = body;

    console.log(`🔧 [POST /api/admin/fix-multiplayer] Действие: ${action}, Комната: ${roomCode}`);

    if (action === 'cleanup') {
      // АВТОМАТИЧЕСКАЯ ОЧИСТКА
      const { data: result, error } = await supabase.rpc('auto_cleanup_multiplayer');
      
      if (error) {
        console.error('❌ Ошибка очистки:', error);
        return NextResponse.json({ 
          success: false, 
          message: 'Ошибка очистки: ' + error.message 
        }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        message: 'Автоматическая очистка завершена',
        result
      });

    } else if (action === 'fix_room' && roomCode) {
      // ИСПРАВЛЕНИЕ КОНКРЕТНОЙ КОМНАТЫ
      const { data: result, error } = await supabase.rpc('fix_room_settings', {
        room_code_param: roomCode
      });
      
      if (error) {
        console.error('❌ Ошибка исправления комнаты:', error);
        return NextResponse.json({ 
          success: false, 
          message: 'Ошибка исправления: ' + error.message 
        }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        message: `Комната ${roomCode} исправлена`,
        result
      });

    } else if (action === 'protect_bots' && roomCode) {
      // ЗАЩИТА БОТОВ
      const { data: result, error } = await supabase.rpc('protect_bots_in_room', {
        room_code_param: roomCode
      });
      
      if (error) {
        console.error('❌ Ошибка защиты ботов:', error);
        return NextResponse.json({ 
          success: false, 
          message: 'Ошибка защиты ботов: ' + error.message 
        }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        message: `Боты в комнате ${roomCode} защищены`,
        result
      });

    } else if (action === 'remove_duplicates') {
      // УДАЛЕНИЕ ДУБЛИРОВАННЫХ ИГРОКОВ
      const { error: duplicatesError } = await supabase.rpc('sql', {
        query: `
          DELETE FROM _pidr_room_players 
          WHERE id NOT IN (
            SELECT DISTINCT ON (user_id) id 
            FROM _pidr_room_players 
            ORDER BY user_id, joined_at DESC
          )
        `
      });

      if (duplicatesError) {
        console.error('❌ Ошибка удаления дубликатов:', duplicatesError);
        return NextResponse.json({ 
          success: false, 
          message: 'Ошибка удаления дубликатов: ' + duplicatesError.message 
        }, { status: 500 });
      }

      // Обновляем счетчики
      const { error: updateError } = await supabase.rpc('sql', {
        query: `
          UPDATE _pidr_rooms 
          SET current_players = (
            SELECT COUNT(*) 
            FROM _pidr_room_players 
            WHERE room_id = _pidr_rooms.id
          )
        `
      });

      if (updateError) {
        console.error('⚠️ Предупреждение: не удалось обновить счетчики:', updateError);
      }

      return NextResponse.json({
        success: true,
        message: 'Дублированные игроки удалены'
      });

    } else {
      return NextResponse.json({ 
        success: false, 
        message: 'Неизвестное действие' 
      }, { status: 400 });
    }

  } catch (error: any) {
    console.error('❌ Fix multiplayer error:', error);
    return NextResponse.json({ 
      success: false, 
      message: 'Ошибка сервера: ' + (error?.message || 'Неизвестная ошибка')
    }, { status: 500 });
  }
}

// GET /api/admin/fix-multiplayer - Диагностика проблем
export async function GET() {
  try {
    console.log('🔍 [GET /api/admin/fix-multiplayer] Диагностика проблем...');

    // Проблемные комнаты
    const { data: problematicRooms, error: roomsError } = await supabase
      .from('_pidr_rooms')
      .select(`
        room_code,
        name,
        status,
        current_players,
        max_players,
        created_at,
        host_id,
        settings
      `)
      .eq('status', 'waiting');

    if (roomsError) {
      console.error('❌ Ошибка получения комнат:', roomsError);
    }

    // Дублированные игроки
    const { data: duplicates, error: duplicatesError } = await supabase.rpc('sql', {
      query: `
        SELECT 
          user_id,
          username,
          COUNT(*) as rooms_count,
          STRING_AGG(r.room_code, ', ') as room_codes
        FROM _pidr_room_players rp
        JOIN _pidr_rooms r ON rp.room_id = r.id
        GROUP BY user_id, username
        HAVING COUNT(*) > 1
        ORDER BY COUNT(*) DESC
      `
    });

    if (duplicatesError) {
      console.error('❌ Ошибка получения дубликатов:', duplicatesError);
    }

    return NextResponse.json({
      success: true,
      diagnostics: {
        problematicRooms: problematicRooms || [],
        duplicatedPlayers: duplicates || [],
        timestamp: new Date().toISOString()
      }
    });

  } catch (error: any) {
    console.error('❌ Diagnostics error:', error);
    return NextResponse.json({ 
      success: false, 
      message: 'Ошибка диагностики: ' + (error?.message || 'Неизвестная ошибка')
    }, { status: 500 });
  }
}
