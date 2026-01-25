import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '../../../../lib/supabase';
import { requireAuth } from '../../../../lib/auth-utils';

/**
 * POST /api/nft/withdraw
 * Вывод NFT на другой кошелек
 */
export async function POST(req: NextRequest) {
  try {
    const authResult = requireAuth(req);
    if (authResult.error || !authResult.userId) {
      return NextResponse.json({ 
        success: false, 
        message: authResult.error || 'Не авторизован' 
      }, { status: 401 });
    }
    const userId = authResult.userId;
    console.log(`💸 Пользователь ${userId} запрашивает вывод NFT...`);

    const { nft_ownership_id, to_wallet_address } = await req.json();

    if (!nft_ownership_id || !to_wallet_address) {
      return NextResponse.json(
        { success: false, message: 'nft_ownership_id и to_wallet_address обязательны' },
        { status: 400 }
      );
    }

    // Проверяем, что NFT принадлежит пользователю
    const { data: ownership, error: ownershipError } = await supabase
      .from('_pidr_nft_ownership')
      .select('*')
      .eq('id', nft_ownership_id)
      .eq('user_id', userId)
      .eq('is_active', true)
      .single();

    if (ownershipError || !ownership) {
      return NextResponse.json(
        { success: false, message: 'NFT не найден или не принадлежит вам' },
        { status: 403 }
      );
    }

    // Проверяем, можно ли вывести NFT
    if (!ownership.can_withdraw) {
      return NextResponse.json(
        { success: false, message: 'Этот NFT нельзя вывести' },
        { status: 403 }
      );
    }

    // Создаем запрос на вывод
    const { data: withdrawal, error: withdrawalError } = await supabase
      .from('_pidr_nft_withdrawals')
      .insert({
        user_id: userId,
        nft_ownership_id,
        from_wallet_address: ownership.wallet_address,
        to_wallet_address,
        nft_address: ownership.nft_address,
        status: 'pending'
      })
      .select()
      .single();

    if (withdrawalError) {
      console.error('❌ Ошибка создания запроса на вывод:', withdrawalError);
      return NextResponse.json(
        { success: false, message: 'Ошибка создания запроса на вывод' },
        { status: 500 }
      );
    }

    console.log(`✅ Запрос на вывод NFT создан: ${withdrawal.id}`);
    
    return NextResponse.json({
      success: true,
      withdrawal_id: withdrawal.id,
      nft_address: ownership.nft_address,
      from_wallet: ownership.wallet_address,
      to_wallet: to_wallet_address,
      message: 'Запрос на вывод создан. Подтвердите транзакцию в кошельке.'
    });

  } catch (error: any) {
    console.error('❌ Ошибка API вывода NFT:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Ошибка сервера' },
      { status: 401 }
    );
  }
}

/**
 * PUT /api/nft/withdraw
 * Подтверждение вывода NFT после транзакции
 */
export async function PUT(req: NextRequest) {
  try {
    const authResult = requireAuth(req);
    if (authResult.error || !authResult.userId) {
      return NextResponse.json({ 
        success: false, 
        message: authResult.error || 'Не авторизован' 
      }, { status: 401 });
    }
    const userId = authResult.userId;
    console.log(`✅ Подтверждение вывода NFT для пользователя ${userId}...`);

    const { withdrawal_id, transaction_hash } = await req.json();

    if (!withdrawal_id || !transaction_hash) {
      return NextResponse.json(
        { success: false, message: 'withdrawal_id и transaction_hash обязательны' },
        { status: 400 }
      );
    }

    // Проверяем, что вывод принадлежит пользователю
    const { data: withdrawal, error: withdrawalError } = await supabase
      .from('_pidr_nft_withdrawals')
      .select('*')
      .eq('id', withdrawal_id)
      .eq('user_id', userId)
      .single();

    if (withdrawalError || !withdrawal) {
      return NextResponse.json(
        { success: false, message: 'Запрос на вывод не найден' },
        { status: 403 }
      );
    }

    // Обновляем статус вывода
    const { error: updateError } = await supabase
      .from('_pidr_nft_withdrawals')
      .update({
        status: 'completed',
        transaction_hash,
        completed_at: new Date().toISOString()
      })
      .eq('id', withdrawal_id);

    if (updateError) {
      console.error('❌ Ошибка обновления статуса вывода:', updateError);
      return NextResponse.json(
        { success: false, message: 'Ошибка подтверждения вывода' },
        { status: 500 }
      );
    }

    // Деактивируем NFT в текущем кошельке
    const { error: deactivateError } = await supabase
      .from('_pidr_nft_ownership')
      .update({
        is_active: false,
        updated_at: new Date().toISOString()
      })
      .eq('id', withdrawal.nft_ownership_id);

    if (deactivateError) {
      console.error('❌ Ошибка деактивации NFT:', deactivateError);
    }

    console.log(`✅ NFT успешно выведен: ${withdrawal.nft_address}`);
    
    return NextResponse.json({
      success: true,
      message: 'NFT успешно выведен на указанный кошелек!',
      transaction_hash
    });

  } catch (error: any) {
    console.error('❌ Ошибка API подтверждения вывода NFT:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Ошибка сервера' },
      { status: 401 }
    );
  }
}

