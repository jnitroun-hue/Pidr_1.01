import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getSessionFromRequest } from '@/lib/auth/session-utils';

/**
 * GET /api/nft/collection
 * Получить NFT коллекцию пользователя
 */
export async function GET(req: NextRequest) {
  try {
    // Проверяем аутентификацию - БЕЗ cookies, только из localStorage через headers
    const telegramIdHeader = req.headers.get('x-telegram-id');
    const usernameHeader = req.headers.get('x-username');
    
    if (!telegramIdHeader) {
      console.error('❌ [collection] Не найден x-telegram-id header');
      return NextResponse.json(
        { success: false, message: 'Требуется авторизация' },
        { status: 401 }
      );
    }

    const userId = telegramIdHeader;
    console.log(`📦 Получаем NFT коллекцию пользователя ${userId} через headers...`);

    // Вызываем SQL функцию для получения коллекции
    const { data, error } = await supabase.rpc('get_user_nft_collection', {
      p_user_id: userId
    });

    if (error) {
      console.error('❌ Ошибка получения коллекции:', error);
      return NextResponse.json(
        { success: false, message: 'Ошибка получения коллекции' },
        { status: 500 }
      );
    }

    const collection = data || [];
    console.log(`✅ Найдено ${collection.length} NFT карт для пользователя ${userId}`);

    return NextResponse.json({
      success: true,
      collection,
      total: collection.length
    });

  } catch (error: any) {
    console.error('❌ Ошибка API получения коллекции:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Ошибка сервера' },
      { status: 401 }
    );
  }
}

