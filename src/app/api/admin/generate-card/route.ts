import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-utils';
import { supabase } from '@/lib/supabase';

/**
 * POST /api/admin/generate-card
 * Генерация NFT карты администратором (только для админов)
 */
export async function POST(req: NextRequest) {
  try {
    const adminCheck = await requireAdmin(req);
    
    if (!adminCheck.isAdmin) {
      return NextResponse.json({
        success: false,
        error: adminCheck.error || 'Требуются права администратора'
      }, { status: adminCheck.error?.includes('Unauthorized') ? 401 : 403 });
    }

    const body = await req.json();
    const { user_id, rank, suit, rarity, wallet_address, network } = body;

    if (!user_id || !rank || !suit || !rarity) {
      return NextResponse.json({
        success: false,
        error: 'Недостаточно данных для генерации карты'
      }, { status: 400 });
    }

    // Преобразуем user_id в BIGINT
    const userIdBigInt = typeof user_id === 'string' ? parseInt(user_id, 10) : user_id;
    
    if (isNaN(userIdBigInt)) {
      return NextResponse.json({
        success: false,
        error: 'Неверный формат ID пользователя'
      }, { status: 400 });
    }

    // Проверяем существование пользователя
    const { data: user, error: userError } = await supabase
      .from('_pidr_users')
      .select('id')
      .eq('id', userIdBigInt)
      .single();

    if (userError || !user) {
      return NextResponse.json({
        success: false,
        error: 'Пользователь не найден'
      }, { status: 404 });
    }

    // Создаем NFT карту
    const { data: nftCard, error: nftError } = await supabase
      .from('_pidr_nft_ownership')
      .insert({
        user_id: userIdBigInt,
        rank: rank,
        suit: suit,
        rarity: rarity,
        mint_type: 'admin_generated',
        wallet_address: wallet_address || null,
        network: network || 'TON',
        minted_at: new Date().toISOString()
      })
      .select()
      .single();

    if (nftError) {
      console.error('❌ Ошибка создания NFT карты:', nftError);
      return NextResponse.json({
        success: false,
        error: 'Ошибка создания NFT карты'
      }, { status: 500 });
    }

    // Создаем транзакцию
    await supabase
      .from('_pidr_transactions')
      .insert({
        user_id: userIdBigInt,
        transaction_type: 'admin_reward',
        amount: 0, // Бесплатная генерация
        currency: 'nft',
        description: `Админ генерация NFT карты: ${rank} of ${suit} (${rarity})`,
        status: 'completed',
        metadata: {
          nft_id: nftCard.id,
          rank,
          suit,
          rarity,
          generated_by: adminCheck.userId
        }
      });

    return NextResponse.json({
      success: true,
      nft_card: nftCard
    });
  } catch (error: any) {
    console.error('❌ [Admin Generate Card] Ошибка:', error);
    return NextResponse.json({
      success: false,
      error: 'Внутренняя ошибка сервера'
    }, { status: 500 });
  }
}

