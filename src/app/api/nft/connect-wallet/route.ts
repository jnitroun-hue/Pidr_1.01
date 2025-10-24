import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getSessionFromRequest } from '@/lib/auth/session-utils';

/**
 * POST /api/nft/connect-wallet
 * Подключить TON кошелек игрока для NFT
 */
export async function POST(req: NextRequest) {
  try {
    // Проверяем аутентификацию - БЕЗ cookies, только из localStorage через headers
    const telegramIdHeader = req.headers.get('x-telegram-id');
    const usernameHeader = req.headers.get('x-username');
    
    if (!telegramIdHeader) {
      console.error('❌ [connect-wallet] Не найден x-telegram-id header');
      return NextResponse.json(
        { success: false, message: 'Требуется авторизация' },
        { status: 401 }
      );
    }

    const userId = telegramIdHeader;
    // ✅ Конвертируем в BIGINT для БД (foreign key требует BIGINT)
    const userIdBigInt = parseInt(userId, 10);
    
    if (isNaN(userIdBigInt)) {
      console.error('❌ [connect-wallet] Некорректный telegram_id:', userId);
      return NextResponse.json(
        { success: false, message: 'Некорректный ID пользователя' },
        { status: 400 }
      );
    }
    
    console.log(`🔗 Пользователь ${userId} (BIGINT: ${userIdBigInt}) подключает TON кошелек через headers...`);

    const { wallet_address, wallet_type = 'ton', proof } = await req.json();

    if (!wallet_address) {
      return NextResponse.json(
        { success: false, message: 'Адрес кошелька обязателен' },
        { status: 400 }
      );
    }

    // TODO: Верификация proof (подписи) от TON Connect
    // В production необходимо проверить, что пользователь действительно владеет кошельком

    // Вызываем SQL функцию для подключения кошелька
    const { data, error } = await supabase.rpc('connect_player_wallet', {
      p_user_id: userIdBigInt, // ✅ Передаём BIGINT вместо STRING
      p_wallet_address: wallet_address,
      p_wallet_type: wallet_type
    });

    if (error) {
      console.error('❌ Ошибка подключения кошелька:', error);
      return NextResponse.json(
        { success: false, message: error.message || 'Ошибка подключения кошелька' },
        { status: 500 }
      );
    }

    if (!data.success) {
      return NextResponse.json(
        { success: false, message: data.message },
        { status: 400 }
      );
    }

    console.log(`✅ Кошелек ${wallet_address} успешно подключен для пользователя ${userId}`);
    return NextResponse.json({
      success: true,
      message: 'Кошелек успешно подключен',
      wallet_id: data.wallet_id,
      wallet_address
    });

  } catch (error: any) {
    console.error('❌ Ошибка API подключения кошелька:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Ошибка сервера' },
      { status: 401 }
    );
  }
}

/**
 * GET /api/nft/connect-wallet
 * Получить подключенные кошельки пользователя
 */
export async function GET(req: NextRequest) {
  try {
    // Проверяем аутентификацию - БЕЗ cookies, только из localStorage через headers
    const telegramIdHeader = req.headers.get('x-telegram-id');
    const usernameHeader = req.headers.get('x-username');
    
    if (!telegramIdHeader) {
      console.error('❌ [connect-wallet GET] Не найден x-telegram-id header');
      return NextResponse.json(
        { success: false, message: 'Требуется авторизация' },
        { status: 401 }
      );
    }

    const userId = telegramIdHeader;
    // ✅ Конвертируем в BIGINT для БД (foreign key требует BIGINT)
    const userIdBigInt = parseInt(userId, 10);
    
    if (isNaN(userIdBigInt)) {
      console.error('❌ [connect-wallet GET] Некорректный telegram_id:', userId);
      return NextResponse.json(
        { success: false, message: 'Некорректный ID пользователя' },
        { status: 400 }
      );
    }
    
    console.log(`📋 Получаем кошельки пользователя ${userId} (BIGINT: ${userIdBigInt}) через headers...`);

    const { data: wallets, error } = await supabase
      .from('_pidr_player_wallets')
      .select('*')
      .eq('user_id', userIdBigInt) // ✅ Передаём BIGINT вместо STRING
      .order('is_active', { ascending: false }) // ✅ ИСПРАВЛЕНО: is_primary → is_active
      .order('created_at', { ascending: false }); // ✅ ИСПРАВЛЕНО: connected_at → created_at

    if (error) {
      console.error('❌ Ошибка получения кошельков:', error);
      return NextResponse.json(
        { success: false, message: 'Ошибка получения кошельков' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      wallets: wallets || []
    });

  } catch (error: any) {
    console.error('❌ Ошибка API получения кошельков:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Ошибка сервера' },
      { status: 500 }
    );
  }
}

