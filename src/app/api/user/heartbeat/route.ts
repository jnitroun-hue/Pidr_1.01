import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getUserIdFromRequest } from '@/lib/auth-utils';

// 💓 API: Heartbeat для обновления онлайн статуса
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

    // ✅ ОБНОВЛЯЕМ last_seen и статус (поддержка обоих вариантов столбцов)
    const updateData: any = {
      last_seen: new Date().toISOString()
    };
    
    // Обновляем статус (поддержка обоих вариантов)
    updateData.online_status = 'online';
    updateData.status = 'online';
    
    const { error, data: updatedUser } = await supabase
      .from('_pidr_users')
      .update(updateData)
      .eq('telegram_id', userIdBigInt)
      .select();
    
    console.log(`💓 [HEARTBEAT] Обновлен статус для ${userId}:`, updatedUser);

    if (error) {
      console.error('❌ [HEARTBEAT] Ошибка обновления онлайн статуса:', error);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    // ✅ ОБНОВЛЯЕМ last_activity КОМНАТЫ, ЕСЛИ ПОЛЬЗОВАТЕЛЬ В КОМНАТЕ
    try {
      const { data: playerRoom } = await supabase
        .from('_pidr_room_players')
        .select('room_id')
        .eq('user_id', userIdBigInt)
        .maybeSingle();
      
      if (playerRoom?.room_id) {
        const now = new Date().toISOString();
        await supabase
          .from('_pidr_rooms')
          .update({ 
            last_activity: now,
            updated_at: now
          })
          .eq('id', playerRoom.room_id);
        console.log(`✅ [HEARTBEAT] Обновлена активность комнаты ${playerRoom.room_id}`);
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
      error: error.message || 'Ошибка heartbeat'
    }, { status: 500 });
  }
}

// GET для ручного вызова
export async function GET(request: NextRequest) {
  return POST(request);
}

