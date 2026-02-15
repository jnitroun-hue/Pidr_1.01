import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { requireAuth, getUserIdFromDatabase } from '@/lib/auth-utils';

/**
 * POST /api/wallet/check
 * Проверка наличия кошелька у пользователя
 */
export async function POST(request: NextRequest) {
  try {
    const auth = requireAuth(request);

    if (auth.error || !auth.userId) {
      return NextResponse.json(
        { success: false, error: auth.error || 'Unauthorized' },
        { status: 401 }
      );
    }

    const { userId, environment } = auth;
    const { dbUserId } = await getUserIdFromDatabase(userId, environment);

    if (!dbUserId) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    const { wallet_type } = await request.json();
    
    if (!wallet_type) {
      return NextResponse.json(
        { success: false, error: 'wallet_type required' },
        { status: 400 }
      );
    }

    // Проверяем наличие кошелька в _pidr_player_wallets
    const { data: wallet, error } = await supabase
      .from('_pidr_player_wallets')
      .select('*')
      .eq('user_id', dbUserId)
      .eq('wallet_type', wallet_type)
      .eq('is_active', true)
      .single();

    if (error || !wallet) {
      return NextResponse.json({
        success: false,
        wallet: null,
        message: `${wallet_type.toUpperCase()} wallet not found`
      });
    }

    return NextResponse.json({
      success: true,
      wallet: {
        wallet_address: wallet.wallet_address,
        wallet_type: wallet.wallet_type,
        is_active: wallet.is_active
      }
    });

  } catch (error: any) {
    console.error('❌ [Wallet Check] Error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

