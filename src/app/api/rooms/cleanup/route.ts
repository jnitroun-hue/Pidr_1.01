/**
 * 🧹 API: Очистка неактивных комнат
 * 
 * GET /api/rooms/cleanup
 * 
 * Удаляет:
 * - Комнаты в 'waiting' старше 15 минут
 * - Комнаты в 'playing' не обновлявшиеся 15 минут
 * - Комнаты старше 1 дня (любые)
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '../../../../lib/supabase';

export async function GET(req: NextRequest) {
  try {
    console.log('🧹 [cleanup] Начинаем очистку неактивных комнат...');
    
    const now = new Date();
    const fifteenMinutesAgo = new Date(now.getTime() - 15 * 60 * 1000);
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    
    // 1. Удаляем комнаты старше 1 дня
    const { data: veryOld, error: veryOldError } = await supabase
      .from('_pidr_rooms')
      .delete()
      .lt('created_at', oneDayAgo.toISOString())
      .select('id, name, room_code');
    
    console.log(`🗑️ Удалено комнат старше 1 дня: ${veryOld?.length || 0}`);
    
    // 2. Удаляем комнаты в waiting старше 15 минут
    const { data: waitingOld, error: waitingError } = await supabase
      .from('_pidr_rooms')
      .delete()
      .eq('status', 'waiting')
      .lt('created_at', fifteenMinutesAgo.toISOString())
      .select('id, name, room_code');
    
    console.log(`⏰ Удалено комнат в waiting старше 15 минут: ${waitingOld?.length || 0}`);
    
    // 3. Удаляем комнаты в playing не обновлявшиеся 15 минут
    const { data: playingInactive, error: playingError } = await supabase
      .from('_pidr_rooms')
      .delete()
      .eq('status', 'playing')
      .lt('updated_at', fifteenMinutesAgo.toISOString())
      .select('id, name, room_code');
    
    console.log(`🎮 Удалено неактивных игровых комнат: ${playingInactive?.length || 0}`);
    
    // 4. Получаем оставшиеся комнаты
    const { data: remaining, error: remainingError } = await supabase
      .from('_pidr_rooms')
      .select('id, name, room_code, status, created_at, updated_at')
      .order('created_at', { ascending: false });
    
    const totalDeleted = (veryOld?.length || 0) + (waitingOld?.length || 0) + (playingInactive?.length || 0);
    
    return NextResponse.json({
      success: true,
      deleted: {
        total: totalDeleted,
        veryOld: veryOld?.length || 0,
        waitingOld: waitingOld?.length || 0,
        playingInactive: playingInactive?.length || 0
      },
      remaining: {
        total: remaining?.length || 0,
        rooms: remaining || []
      },
      deletedRooms: {
        veryOld: veryOld || [],
        waitingOld: waitingOld || [],
        playingInactive: playingInactive || []
      }
    });
    
  } catch (error: any) {
    console.error('❌ [cleanup] Ошибка очистки комнат:', error);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}

