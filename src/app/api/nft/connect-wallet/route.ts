import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { requireAuth, getUserIdFromDatabase } from '@/lib/auth-utils';

// ✅ Явная конфигурация runtime для Next.js 15
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/nft/connect-wallet
 * Подключить TON кошелек игрока для NFT
 */
export async function POST(req: NextRequest) {
  try {
    // ✅ УНИВЕРСАЛЬНО: Используем универсальную систему авторизации
    const auth = requireAuth(req);
    
    if (auth.error || !auth.userId) {
      console.error('❌ [connect-wallet] Ошибка авторизации:', auth.error);
      return NextResponse.json(
        { success: false, message: auth.error || 'Требуется авторизация' },
        { status: 401 }
      );
    }
    
    const { userId, environment } = auth;
    console.log(`🔗 [connect-wallet] Пользователь: ${userId} (${environment})`);
    
    // ✅ УНИВЕРСАЛЬНО: Получаем пользователя из БД
    const { dbUserId, user } = await getUserIdFromDatabase(userId, environment);
    
    if (!dbUserId || !user) {
      console.error(`❌ [connect-wallet] Пользователь не найден (${environment}):`, userId);
      return NextResponse.json(
        { success: false, message: 'Пользователь не найден' },
        { status: 404 }
      );
    }
    
    // ✅ Конвертируем в BIGINT для БД (foreign key требует BIGINT)
    const userIdBigInt = dbUserId;
    
    const { wallet_address, wallet_type = 'ton', proof } = await req.json();
    
    // ✅ ИСПРАВЛЕНО: Показываем правильный тип кошелька в логах
    const walletTypeUpper = (wallet_type || 'ton').toUpperCase();
    console.log(`🔗 Пользователь ${userId} (BIGINT: ${userIdBigInt}) подключает ${walletTypeUpper} кошелек через headers...`);

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

    console.log(`✅ ${walletTypeUpper} кошелек ${wallet_address} успешно подключен для пользователя ${userId} (${environment})`);
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
    // ✅ УНИВЕРСАЛЬНО: Используем универсальную систему авторизации
    const auth = requireAuth(req);
    
    if (auth.error || !auth.userId) {
      console.error('❌ [connect-wallet GET] Ошибка авторизации:', auth.error);
      return NextResponse.json(
        { success: false, message: auth.error || 'Требуется авторизация' },
        { status: 401 }
      );
    }
    
    const { userId, environment } = auth;
    console.log(`📋 [connect-wallet GET] Пользователь: ${userId} (${environment})`);
    
    // ✅ УНИВЕРСАЛЬНО: Получаем пользователя из БД
    const { dbUserId, user } = await getUserIdFromDatabase(userId, environment);
    
    if (!dbUserId || !user) {
      console.error(`❌ [connect-wallet GET] Пользователь не найден (${environment}):`, userId);
      return NextResponse.json(
        { success: false, message: 'Пользователь не найден' },
        { status: 404 }
      );
    }
    
    // ✅ Конвертируем в BIGINT для БД (foreign key требует BIGINT)
    const userIdBigInt = dbUserId;
    
    console.log(`📋 Получаем кошельки пользователя ${userId} (BIGINT: ${userIdBigInt}, ${environment})...`);

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

