import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getSessionFromRequest } from '@/lib/auth/session-utils';

/**
 * GET /api/nft/collection
 * Получить NFT коллекцию пользователя
 */
export async function GET(req: NextRequest) {
  try {
    // ✅ Проверка сессии через cookies или headers
    let session = getSessionFromRequest(req);
    
    // Если нет cookie, пробуем header
    if (!session) {
      const telegramIdHeader = req.headers.get('x-telegram-id');
      const usernameHeader = req.headers.get('x-username');
      
      if (telegramIdHeader) {
        session = {
          userId: telegramIdHeader,
          telegramId: telegramIdHeader,
          username: usernameHeader || undefined
        };
        console.log('✅ [Collection] Авторизация через header');
      }
    }
    
    if (!session || !session.telegramId) {
      console.error('❌ [collection] Сессия не найдена');
      return NextResponse.json(
        { success: false, message: 'Требуется авторизация' },
        { status: 401 }
      );
    }

    const userId = session.telegramId;
    console.log(`📦 Получаем NFT коллекцию пользователя ${userId}...`);

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

