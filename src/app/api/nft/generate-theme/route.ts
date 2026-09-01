/**
 * 🎨 API: Генерация тематических NFT карт
 * 
 * POST /api/nft/generate-theme
 * 
 * Темы: Pokemon, Halloween, Star Wars
 * 
 * ✅ ГЕНЕРАЦИЯ НА СЕРВЕРЕ С ПОМОЩЬЮ SHARP!
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { requireAuth, getUserIdFromDatabase } from '@/lib/auth-utils';
import { NFT_CARDS_TABLE, NFT_STORAGE_BUCKET } from '@/lib/nft/constants';
import { isNftThemeKey } from '@/lib/nft/theme-config';
import { NFT_GEN_COIN_COST } from '@/lib/nft/crypto-gen-costs';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    console.log('🎨 [generate-theme] Генерация тематической NFT карты');

    // ✅ Авторизация через cookie → Redis/БД
    const auth = requireAuth(request);
    if (auth.error || !auth.userId) {
      return NextResponse.json({ success: false, error: 'Требуется авторизация' }, { status: 401 });
    }

    const { dbUserId: userId, user: dbUser } = await getUserIdFromDatabase(auth.userId, auth.environment);
    if (!userId || !dbUser) {
      return NextResponse.json({ success: false, error: 'Пользователь не найден' }, { status: 404 });
    }

    // Получаем данные
    const body = await request.json();
    const { suit, rank, imageData, theme, themeId, action, skipCoinDeduction } = body;

    console.log(`👤 Пользователь: ${userId}`);
    console.log(`🎨 Тема: ${theme}, ID: ${themeId}, Карта: ${rank}${suit}`);

    if (!isNftThemeKey(theme)) {
      return NextResponse.json({ success: false, error: 'Неизвестная тема' }, { status: 400 });
    }

    const coinPrice = NFT_GEN_COIN_COST[theme] || { single: 10000, deck: 400000 };
    const costs: Record<string, number> = {
      [`random_${theme}`]: coinPrice.single,
      [`deck_${theme}`]: coinPrice.deck,
    };
    Object.entries(NFT_GEN_COIN_COST).forEach(([key, price]) => {
      costs[`random_${key}`] = price.single;
      costs[`deck_${key}`] = price.deck;
    });

    const cost = costs[action] || 10000;

    if (!skipCoinDeduction && dbUser.coins < cost) {
      return NextResponse.json(
        { success: false, error: `Недостаточно монет. Требуется: ${cost}, есть: ${dbUser.coins}` },
        { status: 400 }
      );
    }

    // ✅ КОНВЕРТИРУЕМ BASE64 ИЗ КЛИЕНТА!
    const base64Data = imageData.replace(/^data:image\/\w+;base64,/, '');
    const imageBuffer = Buffer.from(base64Data, 'base64');

    // ✅ Генерируем имя файла С ПРИВЯЗКОЙ К USER_ID!
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 9);
    const fileName = `${theme}_${rank}_${suit}_${themeId}_${timestamp}_${random}.png`;
    const filePath = `${userId}/${fileName}`; // ✅ Папка по user_id!

    // Загружаем в Supabase Storage
    console.log(`📤 Загружаем файл: ${filePath}`);
    
    const { error: uploadError } = await supabaseAdmin.storage
      .from(NFT_STORAGE_BUCKET)
      .upload(filePath, imageBuffer, {
        contentType: 'image/png',
        upsert: false
      });

    if (uploadError) {
      console.error('❌ Ошибка загрузки в Storage:', uploadError);
      throw new Error(`Ошибка загрузки: ${uploadError.message}`);
    }

    // Получаем публичный URL
    const { data: urlData } = supabaseAdmin.storage
      .from(NFT_STORAGE_BUCKET)
      .getPublicUrl(filePath);

    if (!urlData || !urlData.publicUrl) {
      throw new Error('Не удалось получить публичный URL');
    }

    const imageUrl = urlData.publicUrl;
    console.log(`✅ Файл загружен: ${imageUrl}`);

    // Сохраняем в БД
    const { data: nftData, error: dbError } = await supabaseAdmin
      .from(NFT_CARDS_TABLE)
      .insert({
        user_id: userId,
        suit: suit,
        rank: rank,
        rarity: theme, // Используем тему как rarity
        image_url: imageUrl,
        storage_path: filePath,
        metadata: {
          theme: theme,
          theme_id: themeId,
          generator: action,
          created_at: new Date().toISOString()
        },
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (dbError) {
      console.error('❌ Ошибка сохранения в БД:', dbError);
      
      // Удаляем файл из Storage
      await supabaseAdmin.storage
        .from(NFT_STORAGE_BUCKET)
        .remove([filePath]);
      
      throw new Error(`Ошибка сохранения: ${dbError.message}`);
    }

    console.log(`✅ NFT сохранена в БД: ID=${nftData.id}`);

    // ✅ Списываем монеты (если не skipCoinDeduction)
    let newBalance = undefined;
    
    if (!skipCoinDeduction) {
      // ✅ СПИСЫВАЕМ МОНЕТЫ
      newBalance = dbUser.coins - cost;
      const { error: updateError } = await supabaseAdmin
        .from('_pidr_users')
        .update({ coins: newBalance })
        .eq('id', userId);

      if (updateError) {
        return NextResponse.json({ success: false, error: 'Ошибка списания монет' }, { status: 500 });
      }

      // ✅ СОЗДАЕМ ТРАНЗАКЦИЮ
      await supabaseAdmin
        .from('_pidr_coin_transactions')
        .insert({
          user_id: userId,
          amount: -cost,
          transaction_type: 'nft_generation',
          description: `Генерация NFT карты: ${rank} of ${suit} (${theme})`,
          balance_before: dbUser.coins,
          balance_after: newBalance
        });

      console.log(`✅ Списано ${cost} монет, новый баланс: ${newBalance}`);
    }

    return NextResponse.json({
      success: true,
      nft: {
        id: nftData.id,
        suit: nftData.suit,
        rank: nftData.rank,
        rarity: nftData.rarity,
        image_url: nftData.image_url,
        theme: theme,
        theme_id: themeId
      },
      newBalance
    });

  } catch (error: any) {
    console.error('❌ [generate-theme] Ошибка:', error);
    return NextResponse.json({
      success: false,
      error: (error instanceof Error ? error.message : String(error)) || 'Внутренняя ошибка сервера'
    }, { status: 500 });
  }
}
