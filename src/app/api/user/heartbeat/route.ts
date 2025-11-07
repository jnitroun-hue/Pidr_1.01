import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { requireAuth } from '@/lib/auth-utils';

// 💓 API: Heartbeat для обновления онлайн статуса
export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    if (auth.error) {
      return NextResponse.json({ success: false, error: auth.error }, { status: 401 });
    }

    const userId = auth.userId as string;
    const userIdBigInt = parseInt(userId, 10);

    // ✅ ОБНОВЛЯЕМ last_seen (ТРИГГЕР АВТОМАТИЧЕСКИ ОБНОВИТ online_status!)
    const { error } = await supabase
      .from('_pidr_users')
      .update({
        last_seen: new Date().toISOString(),
        status: 'online'
      })
      .eq('telegram_id', userIdBigInt);

    if (error) {
      console.error('❌ [HEARTBEAT] Ошибка обновления онлайн статуса:', error);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
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

