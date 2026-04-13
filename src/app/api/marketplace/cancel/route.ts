import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { requireAuth, getUserIdFromDatabase } from '@/lib/auth-utils';

/**
 * POST /api/marketplace/cancel
 * 
 * Отменить продажу NFT карты
 * 
 * Body:
 * {
 *   listing_id: number
 * }
 * 
 * Headers:
 * - x-telegram-id: telegram user ID
 */
export async function POST(request: NextRequest) {
  try {
    const auth = requireAuth(request);
    if (auth.error || !auth.userId) {
      return NextResponse.json(
        { success: false, error: auth.error || 'Не авторизован' },
        { status: 401 }
      );
    }

    const { dbUserId } = await getUserIdFromDatabase(auth.userId, auth.environment);
    if (!dbUserId) {
      return NextResponse.json(
        { success: false, error: 'Пользователь не найден' },
        { status: 404 }
      );
    }
    
    const body = await request.json();
    const { listing_id } = body;
    
    console.log('❌ [Marketplace Cancel] Отмена лота:', { userId: dbUserId, listing_id });
    
    if (!listing_id) {
      return NextResponse.json(
        { success: false, error: 'listing_id обязателен' },
        { status: 400 }
      );
    }
    
    // Получаем лот
    const { data: listing, error: listingError } = await supabase
      .from('_pidr_nft_marketplace')
      .select('*')
      .eq('id', listing_id)
      .single();
    
    if (listingError || !listing) {
      console.error('❌ [Marketplace Cancel] Лот не найден:', listingError);
      return NextResponse.json(
        { success: false, error: 'Лот не найден' },
        { status: 404 }
      );
    }
    
    // Проверяем владельца
    if (listing.seller_user_id !== dbUserId) {
      return NextResponse.json(
        { success: false, error: 'Только владелец может отменить продажу' },
        { status: 403 }
      );
    }
    
    // Проверяем статус
    if (listing.status !== 'active') {
      return NextResponse.json(
        { success: false, error: 'Лот уже не активен' },
        { status: 400 }
      );
    }
    
    // Отменяем лот
    const { error: updateError } = await supabase
      .from('_pidr_nft_marketplace')
      .update({ status: 'cancelled' })
      .eq('id', listing_id);
    
    if (updateError) {
      console.error('❌ [Marketplace Cancel] Ошибка отмены:', updateError);
      return NextResponse.json(
        { success: false, error: updateError.message },
        { status: 500 }
      );
    }
    
    console.log('✅ [Marketplace Cancel] Лот отменён');
    
    return NextResponse.json({
      success: true,
      message: 'Лот успешно снят с продажи'
    });
    
  } catch (error: any) {
    console.error('❌ [Marketplace Cancel] Критическая ошибка:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

