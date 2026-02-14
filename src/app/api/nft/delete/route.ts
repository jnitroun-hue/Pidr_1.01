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
    // ✅ ИСПРАВЛЕНО: Принимаем nft_card_id или nftId (совместимость)
    const { nft_card_id, nftId } = body;
    const cardId = nft_card_id || nftId;

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

    if (!cardId) {
      return NextResponse.json(
        { success: false, error: 'nft_card_id обязателен' },
        { status: 400 }
      );
    }

    console.log(`👤 Пользователь: ${userId}, NFT ID: ${cardId}`);

    // Получаем NFT для проверки владельца и storage_path
    const { data: nft, error: fetchError } = await supabase
      .from('_pidr_nft_cards')
      .select('id, user_id, storage_path')
      .eq('id', cardId)
      .single();

    if (fetchError || !nft) {
      console.error('❌ NFT не найдена:', fetchError);
      return NextResponse.json(
        { success: false, error: 'NFT карта не найдена' },
        { status: 404 }
      );
    }

    console.log(`🔍 Проверка владельца: nft.user_id=${nft.user_id} (${typeof nft.user_id}), userId=${userId} (${typeof userId})`);

    // Проверяем владельца (приводим оба значения к числу для сравнения)
    const nftUserId = typeof nft.user_id === 'string' ? parseInt(nft.user_id, 10) : nft.user_id;
    if (nftUserId !== userId) {
      console.error(`❌ НЕ ВЛАДЕЛЕЦ! nftUserId=${nftUserId}, userId=${userId}`);
      return NextResponse.json(
        { success: false, error: 'Вы не владелец этой карты' },
        { status: 403 }
      );
    }

    console.log('✅ Проверка владельца пройдена!');

    // Проверяем, не выставлена ли карта на продажу
    const { data: activeListing } = await supabase
      .from('_pidr_nft_marketplace')
      .select('id')
      .eq('nft_card_id', cardId)
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
      
      // ✅ Формируем правильный путь (может быть как с userId/, так и без)
      const storagePath = nft.storage_path.startsWith('nft-card/') 
        ? nft.storage_path.replace('nft-card/', '') 
        : nft.storage_path;
      
      const { error: storageError } = await supabase.storage
        .from('nft-card')
        .remove([storagePath]);

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
      .eq('id', cardId);

    if (deleteError) {
      console.error('❌ Ошибка удаления из БД:', deleteError);
      return NextResponse.json(
        { success: false, error: `Ошибка удаления: ${deleteError.message}` },
        { status: 500 }
      );
    }

    console.log(`✅ NFT ${cardId} удалена`);

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

