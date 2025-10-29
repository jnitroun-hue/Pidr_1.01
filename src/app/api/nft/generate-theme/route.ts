/**
 * 🎨 API: Генерация тематических NFT карт
 * 
 * POST /api/nft/generate-theme
 * 
 * Темы: Pokemon, Halloween, Star Wars
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    console.log('🎨 [generate-theme] Генерация тематической NFT карты');

    // Получаем данные
    const body = await request.json();
    const { suit, rank, imageData, theme, themeId, action, skipCoinDeduction } = body;

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

    console.log(`👤 Пользователь: ${userId}`);
    console.log(`🎨 Тема: ${theme}, ID: ${themeId}, Карта: ${rank}${suit}`);

    // Конвертируем base64 в Buffer
    const base64Data = imageData.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');

    // Генерируем уникальное имя файла
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 9);
    const fileName = `${theme}_${rank}_${suit}_${themeId}_${timestamp}_${random}.png`;
    const filePath = `nft-cards/${fileName}`;

    // Загружаем в Supabase Storage
    console.log(`📤 Загружаем файл: ${filePath}`);
    
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('nft-cards')
      .upload(filePath, buffer, {
        contentType: 'image/png',
        upsert: false
      });

    if (uploadError) {
      console.error('❌ Ошибка загрузки в Storage:', uploadError);
      throw new Error(`Ошибка загрузки: ${uploadError.message}`);
    }

    // Получаем публичный URL
    const { data: urlData } = supabase.storage
      .from('nft-cards')
      .getPublicUrl(filePath);

    if (!urlData || !urlData.publicUrl) {
      throw new Error('Не удалось получить публичный URL');
    }

    const imageUrl = urlData.publicUrl;
    console.log(`✅ Файл загружен: ${imageUrl}`);

    // Сохраняем в БД
    const { data: nftData, error: dbError } = await supabase
      .from('_pidr_nft_cards')
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
      await supabase.storage
        .from('nft-cards')
        .remove([filePath]);
      
      throw new Error(`Ошибка сохранения: ${dbError.message}`);
    }

    console.log(`✅ NFT сохранена в БД: ID=${nftData.id}`);

    // Списываем монеты (если не skipCoinDeduction)
    let newBalance = undefined;
    
    if (!skipCoinDeduction) {
      const costs: Record<string, number> = {
        random_pokemon: 10000,
        random_halloween: 10000,
        random_starwars: 10000,
        deck_pokemon: 400000,
        deck_halloween: 400000,
        deck_starwars: 400000
      };

      const cost = costs[action] || 10000;

      const { data: deductData, error: deductError } = await supabase.rpc('deduct_user_coins', {
        p_user_id: userId,
        p_amount: cost
      });

      if (deductError) {
        console.error('⚠️ Ошибка списания монет:', deductError);
      } else {
        newBalance = deductData;
        console.log(`💰 Списано ${cost} монет, новый баланс: ${newBalance}`);
      }
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
      error: error.message || 'Внутренняя ошибка сервера'
    }, { status: 500 });
  }
}

