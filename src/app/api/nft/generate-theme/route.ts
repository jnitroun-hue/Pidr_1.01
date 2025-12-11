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
import { supabase } from '@/lib/supabase';
import sharp from 'sharp';
import path from 'path';
import fs from 'fs';

// Конфигурация тем
const THEMES: Record<string, { prefix: string; folder: string; total: number }> = {
  pokemon: { prefix: '', folder: 'pokemon', total: 52 },
  halloween: { prefix: 'hel_', folder: 'halloween', total: 10 },
  starwars: { prefix: 'star_', folder: 'starwars', total: 7 },
  legendary: { prefix: 'leg_', folder: 'legendary', total: 5 }
};

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
    
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('nft-cards')
      .upload(filePath, imageBuffer, {
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

    // ✅ Списываем монеты (если не skipCoinDeduction)
    let newBalance = undefined;
    
    if (!skipCoinDeduction) {
      const costs: Record<string, number> = {
        random_pokemon: 10000,
        random_halloween: 10000,
        random_starwars: 10000,
        random_legendary: 50000,
        deck_pokemon: 400000,
        deck_halloween: 400000,
        deck_starwars: 400000
      };

      const cost = costs[action] || 10000;

      // ✅ ПОЛУЧАЕМ ТЕКУЩИЙ БАЛАНС ПОЛЬЗОВАТЕЛЯ
      const { data: userData, error: userError } = await supabase
        .from('_pidr_users')
        .select('coins, id')
        .eq('telegram_id', userId.toString())
        .single();

      if (userError || !userData) {
        console.error('❌ Ошибка получения данных пользователя:', userError);
        return NextResponse.json(
          { success: false, error: 'Ошибка получения данных пользователя' },
          { status: 500 }
        );
      }

      // ✅ ПРОВЕРЯЕМ ДОСТАТОЧНО ЛИ МОНЕТ
      if (userData.coins < cost) {
        console.error(`❌ Недостаточно монет: требуется ${cost}, есть ${userData.coins}`);
        return NextResponse.json(
          { success: false, error: `Недостаточно монет. Требуется: ${cost}, есть: ${userData.coins}` },
          { status: 400 }
        );
      }

      // ✅ СПИСЫВАЕМ МОНЕТЫ ПРЯМО ЧЕРЕЗ UPDATE
      newBalance = userData.coins - cost;
      const { error: updateError } = await supabase
        .from('_pidr_users')
        .update({ coins: newBalance })
        .eq('id', userData.id);

      if (updateError) {
        console.error('❌ Ошибка списания монет:', updateError);
        return NextResponse.json(
          { success: false, error: 'Ошибка списания монет' },
          { status: 500 }
        );
      }

      // ✅ СОЗДАЕМ ТРАНЗАКЦИЮ
      await supabase
        .from('_pidr_coin_transactions')
        .insert({
          user_id: userData.id,
          amount: -cost,
          transaction_type: 'nft_generation',
          description: `Генерация NFT карты: ${rank} of ${suit} (${theme})`,
          balance_before: userData.coins,
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
      error: error.message || 'Внутренняя ошибка сервера'
    }, { status: 500 });
  }
}

/**
 * ✅ ГЕНЕРАЦИЯ КАРТЫ С ПОМОЩЬЮ SHARP НА СЕРВЕРЕ!
 */
async function generateThemeCardImage(
  suit: string,
  rank: string,
  themeId: number,
  theme: string
): Promise<Buffer> {
  const themeConfig = THEMES[theme];
  
  if (!themeConfig) {
    throw new Error(`Unknown theme: ${theme}`);
  }

  // Путь к изображению темы в public/
  const fileName = `${themeConfig.prefix}${themeId}.png`;
  const imagePath = path.join(process.cwd(), 'public', themeConfig.folder, fileName);

  console.log(`🖼️ Загружаем изображение: ${imagePath}`);

  // Проверяем существование файла
  if (!fs.existsSync(imagePath)) {
    console.error(`❌ Файл не найден: ${imagePath}`);
    throw new Error(`Theme image not found: ${fileName}`);
  }

  // Определяем цвет масти
  const suitColor = (suit === 'hearts' || suit === 'diamonds') 
    ? '#ef4444' 
    : '#000000';

  // Символ масти
  const suitSymbol = {
    hearts: '♥',
    diamonds: '♦',
    clubs: '♣',
    spades: '♠'
  }[suit] || suit;

  // SVG для текста (ранг и масть)
  const svgText = `
    <svg width="300" height="420">
      <!-- Белый фон -->
      <rect width="300" height="420" fill="#ffffff"/>
      
      <!-- Черная рамка -->
      <rect x="4" y="4" width="292" height="412" fill="none" stroke="#000000" stroke-width="8"/>
      
      <!-- Ранг и масть в верхнем левом углу -->
      <text x="20" y="50" font-family="Arial" font-size="40" font-weight="bold" fill="${suitColor}">${rank.toUpperCase()}</text>
      <text x="20" y="90" font-family="Arial" font-size="36" font-weight="bold" fill="${suitColor}">${suitSymbol}</text>
      
      <!-- Ранг и масть в нижнем правом углу -->
      <text x="260" y="400" font-family="Arial" font-size="40" font-weight="bold" fill="${suitColor}" text-anchor="end">${rank.toUpperCase()}</text>
      <text x="260" y="360" font-family="Arial" font-size="36" font-weight="bold" fill="${suitColor}" text-anchor="end">${suitSymbol}</text>
    </svg>
  `;

  try {
    // Загружаем изображение темы
    const themeImage = await sharp(imagePath)
      .resize(200, 200, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 1 } })
      .toBuffer();

    // Создаем базовый слой с текстом
    const baseLayer = await sharp(Buffer.from(svgText))
      .png()
      .toBuffer();

    // Накладываем изображение темы в центр (X: 50, Y: 110)
    const finalImage = await sharp(baseLayer)
      .composite([
        {
          input: themeImage,
          top: 110,
          left: 50
        }
      ])
      .png()
      .toBuffer();

    console.log(`✅ Изображение карты создано!`);
    return finalImage;

  } catch (error) {
    console.error(`❌ Ошибка генерации изображения:`, error);
    throw new Error(`Failed to generate card image: ${error}`);
  }
}
