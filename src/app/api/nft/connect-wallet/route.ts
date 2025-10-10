import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '../../../../lib/supabase';
import { requireAuth } from '../../../../lib/auth-utils';

/**
 * POST /api/nft/connect-wallet
 * Подключить TON кошелек игрока для NFT
 */
export async function POST(req: NextRequest) {
  try {
    const userId = await requireAuth(req);
    console.log(`🔗 Пользователь ${userId} подключает TON кошелек...`);

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
      p_user_id: userId,
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
    const userId = await requireAuth(req);
    console.log(`📋 Получаем кошельки пользователя ${userId}...`);

    const { data: wallets, error } = await supabase
      .from('_pidr_player_wallets')
      .select('*')
      .eq('user_id', userId)
      .order('is_primary', { ascending: false })
      .order('connected_at', { ascending: false });

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
      { status: 401 }
    );
  }
}

