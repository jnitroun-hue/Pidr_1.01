/**
 * 🗑️ API: Удаление NFT карты
 * DELETE /api/nft/delete
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { requireAuth, getUserIdFromDatabase } from '@/lib/auth-utils';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function DELETE(request: NextRequest) {
  try {
    console.log('🗑️ [delete-nft] Удаление NFT карты');

    // ✅ Авторизация через cookie → Redis/БД
    const auth = requireAuth(request);
    if (auth.error || !auth.userId) {
      return NextResponse.json({ success: false, error: 'Требуется авторизация' }, { status: 401 });
    }

    const { dbUserId: userId } = await getUserIdFromDatabase(auth.userId, auth.environment);
    if (!userId) {
      return NextResponse.json({ success: false, error: 'Пользователь не найден в БД' }, { status: 404 });
    }

    const body = await request.json();
    const { nft_card_id, nftId } = body;
    const cardId = nft_card_id || nftId;

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
      return NextResponse.json({ success: false, error: 'NFT карта не найдена' }, { status: 404 });
    }

    // Проверяем владельца
    const nftUserId = typeof nft.user_id === 'string' ? parseInt(nft.user_id, 10) : nft.user_id;
    if (nftUserId !== userId) {
      return NextResponse.json({ success: false, error: 'Вы не владелец этой карты' }, { status: 403 });
    }

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
      const storagePath = nft.storage_path.startsWith('nft-card/')
        ? nft.storage_path.replace('nft-card/', '')
        : nft.storage_path;
      
      const { error: storageError } = await supabase.storage
        .from('nft-card')
        .remove([storagePath]);

      if (storageError) {
        console.error('⚠️ Ошибка удаления из Storage:', storageError);
      }
    }

    // Удаляем из БД
    const { error: deleteError } = await supabase
      .from('_pidr_nft_cards')
      .delete()
      .eq('id', cardId);

    if (deleteError) {
      return NextResponse.json(
        { success: false, error: `Ошибка удаления: ${deleteError.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, message: 'NFT карта успешно удалена' });

  } catch (error: any) {
    console.error('❌ [delete-nft] Критическая ошибка:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Внутренняя ошибка сервера'
    }, { status: 500 });
  }
}
