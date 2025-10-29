/**
 * 🗑️ API: Удаление NFT карты
 * 
 * DELETE /api/nft/delete
 * 
 * Удаляет NFT из БД и из Supabase Storage
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function DELETE(request: NextRequest) {
  try {
    console.log('🗑️ [delete-nft] Удаление NFT карты');

    const body = await request.json();
    const { nftId } = body;

    // Получаем user_id из headers
    const telegramIdHeader = request.headers.get('x-telegram-id');
    
    if (!telegramIdHeader) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Telegram ID отсутствует' },
        { status: 401 }
      );
    }

    const userId = parseInt(telegramIdHeader, 10);

    if (isNaN(userId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid user ID' },
        { status: 400 }
      );
    }

    if (!nftId) {
      return NextResponse.json(
        { success: false, error: 'nftId обязателен' },
        { status: 400 }
      );
    }

    console.log(`👤 Пользователь: ${userId}, NFT ID: ${nftId}`);

    // Получаем NFT для проверки владельца и storage_path
    const { data: nft, error: fetchError } = await supabase
      .from('_pidr_nft_cards')
      .select('id, user_id, storage_path')
      .eq('id', nftId)
      .single();

    if (fetchError || !nft) {
      console.error('❌ NFT не найдена:', fetchError);
      return NextResponse.json(
        { success: false, error: 'NFT карта не найдена' },
        { status: 404 }
      );
    }

    // Проверяем владельца
    if (nft.user_id !== userId) {
      return NextResponse.json(
        { success: false, error: 'Вы не владелец этой карты' },
        { status: 403 }
      );
    }

    // Проверяем, не выставлена ли карта на продажу
    const { data: activeListing } = await supabase
      .from('_pidr_nft_marketplace')
      .select('id')
      .eq('nft_card_id', nftId)
      .eq('status', 'active')
      .single();

    if (activeListing) {
      return NextResponse.json(
        { success: false, error: 'Нельзя удалить карту, выставленную на продажу. Сначала отмените продажу.' },
        { status: 400 }
      );
    }

    // Удаляем из Storage
    if (nft.storage_path) {
      console.log(`📤 Удаляем файл из Storage: ${nft.storage_path}`);
      
      const { error: storageError } = await supabase.storage
        .from('nft-cards')
        .remove([nft.storage_path]);

      if (storageError) {
        console.error('⚠️ Ошибка удаления из Storage:', storageError);
        // Продолжаем удаление из БД даже если файл не удалился
      } else {
        console.log('✅ Файл удален из Storage');
      }
    }

    // Удаляем из БД
    const { error: deleteError } = await supabase
      .from('_pidr_nft_cards')
      .delete()
      .eq('id', nftId);

    if (deleteError) {
      console.error('❌ Ошибка удаления из БД:', deleteError);
      return NextResponse.json(
        { success: false, error: `Ошибка удаления: ${deleteError.message}` },
        { status: 500 }
      );
    }

    console.log(`✅ NFT ${nftId} удалена`);

    return NextResponse.json({
      success: true,
      message: 'NFT карта успешно удалена'
    });

  } catch (error: any) {
    console.error('❌ [delete-nft] Критическая ошибка:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Внутренняя ошибка сервера'
    }, { status: 500 });
  }
}

