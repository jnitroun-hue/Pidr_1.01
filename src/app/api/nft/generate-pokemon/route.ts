import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { NFT_CARDS_TABLE, NFT_STORAGE_BUCKET } from '@/lib/nft/constants';

// GET /api/nft/generate-pokemon - Получить все NFT карты пользователя
export async function GET(req: NextRequest) {
  try {
    const telegramIdHeader = req.headers.get('x-telegram-id');
    const usernameHeader = req.headers.get('x-username');

    if (!telegramIdHeader) {
      return NextResponse.json(
        { success: false, error: 'Требуется авторизация через Telegram' },
        { status: 401 }
      );
    }

    const userId = telegramIdHeader;
    const userIdBigInt = parseInt(userId, 10);

    console.log(`📦 Получаем NFT коллекцию пользователя ${userId} (${userIdBigInt})...`);

    const { data, error } = await supabase
      .from('_pidr_nft_cards')
      .select('*')
      .eq('user_id', userIdBigInt)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ Ошибка загрузки коллекции:', error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    console.log(`✅ Загружено ${data.length} карт`);

    return NextResponse.json({
      success: true,
      cards: data
    });

  } catch (error: any) {
    console.error('❌ Ошибка API:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// POST /api/nft/generate-pokemon - Создать NFT карту с покемоном
export async function POST(req: NextRequest) {
  try {
    console.log('🎴 [NFT Pokemon] Запрос на генерацию карты с покемоном');

    const telegramIdHeader = req.headers.get('x-telegram-id');
    const usernameHeader = req.headers.get('x-username');

    if (!telegramIdHeader) {
      return NextResponse.json(
        { success: false, error: 'Требуется авторизация через Telegram' },
        { status: 401 }
      );
    }

    const userId = telegramIdHeader;
    const userIdBigInt = parseInt(userId, 10);

    if (isNaN(userIdBigInt) || !userId) {
      console.error('❌ [NFT Pokemon] Невалидный userId:', { userId, userIdBigInt });
      return NextResponse.json(
        { success: false, error: 'Невалидный ID пользователя' },
        { status: 400 }
      );
    }

    console.log('✅ [NFT Pokemon] Авторизован через headers:', {
      userId,
      userIdBigInt,
      username: usernameHeader
    });

    const body = await req.json();
    const { action, suit, rank, rankCost, suitCost, totalCost, pokemonId, imageData } = body;

    console.log('🎴 [NFT Pokemon] Данные:', {
      userId,
      action,
      suit,
      rank,
      pokemonId,
      rankCost,
      suitCost,
      totalCost
    });

    // Проверяем баланс пользователя
    const { data: userData, error: userError } = await supabase
      .from('_pidr_users')
      .select('coins')
      .eq('telegram_id', userIdBigInt)
      .single();

    if (userError || !userData) {
      return NextResponse.json(
        { success: false, error: 'Пользователь не найден' },
        { status: 404 }
      );
    }

    if (userData.coins < totalCost) {
      return NextResponse.json(
        { success: false, error: 'Недостаточно монет' },
        { status: 400 }
      );
    }

    // Списываем монеты
    const { error: deductError } = await supabase
      .from('_pidr_users')
      .update({ coins: userData.coins - totalCost })
      .eq('telegram_id', userIdBigInt);

    if (deductError) {
      return NextResponse.json(
        { success: false, error: 'Ошибка списания монет' },
        { status: 500 }
      );
    }

    console.log('✅ [NFT Pokemon] Монеты списаны, загружаем изображение в Storage...');

    // Конвертируем base64 в Buffer
    const base64Data = imageData.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');

    const timestamp = Date.now();
    const fileName = `${userId}/${suit}_${rank}_pokemon${pokemonId}_${timestamp}.png`;

    console.log('📤 [NFT Pokemon] Загружаем в Storage:', {
      bucketName: NFT_STORAGE_BUCKET,
      fileName,
      bufferSize: buffer.length,
      pokemonId
    });

    // Загружаем файл в Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase
      .storage
      .from(NFT_STORAGE_BUCKET)
      .upload(fileName, buffer, {
        contentType: 'image/png',
        cacheControl: '3600',
        upsert: false
      });

    if (uploadError) {
      console.error('❌ [NFT Pokemon] Ошибка загрузки в Storage:', uploadError);
      
      // Возвращаем монеты
      await supabase
        .from('_pidr_users')
        .update({ coins: userData.coins })
        .eq('telegram_id', userIdBigInt);

      return NextResponse.json(
        { success: false, error: `Ошибка загрузки: ${uploadError.message}` },
        { status: 500 }
      );
    }

    console.log('✅ [NFT Pokemon] Файл загружен в Storage:', uploadData);

    // Получаем публичный URL
    const { data: publicUrlData } = supabase
      .storage
      .from(NFT_STORAGE_BUCKET)
      .getPublicUrl(fileName);

    const imageUrl = publicUrlData.publicUrl;

    console.log('✅ [NFT Pokemon] Карта загружена в Storage:', imageUrl);
    console.log('💾 [NFT Pokemon] Сохраняем карту в БД:', {
      userId,
      userIdBigInt,
      suit,
      rank,
      pokemonId,
      imageUrl,
      storagePath: fileName
    });

    // Сохраняем в БД
    const { data: savedCard, error: saveError } = await supabase
      .from(NFT_CARDS_TABLE)
      .insert([{
        user_id: userIdBigInt,
        suit: suit,
        rank: rank,
        rarity: 'pokemon', // ✅ Тип карты
        image_url: imageUrl,
        storage_path: fileName,
        metadata: {
          pokemonId: pokemonId,
          generator: action === 'random_pokemon' ? 'random_pokemon' : action === 'random_naruto' ? 'random_naruto' : 'simple',
          cost: totalCost,
          payment_method: 'coins',
          generated_at: new Date().toISOString()
        },
        created_at: new Date().toISOString()
      }])
      .select()
      .single();

    if (saveError) {
      console.error('❌ [NFT Pokemon] Ошибка сохранения в БД:', saveError);
      console.error('❌ [NFT Pokemon] Детали ошибки:', {
        code: saveError.code,
        details: saveError.details,
        hint: saveError.hint,
        message: saveError.message
      });

      // Возвращаем монеты и удаляем файл
      console.log('💰 [NFT Pokemon] Возвращаем монеты обратно...');
      await supabase
        .from('_pidr_users')
        .update({ coins: userData.coins })
        .eq('telegram_id', userIdBigInt);

      console.log('🗑️ [NFT Pokemon] Удаляем файл из Storage...');
      await supabase
        .storage
        .from(NFT_STORAGE_BUCKET)
        .remove([fileName]);

      return NextResponse.json(
        { success: false, error: `Ошибка сохранения: ${saveError.message}` },
        { status: 500 }
      );
    }

    console.log('✅ [NFT Pokemon] Карта успешно сохранена в БД!');

    const newBalance = userData.coins - totalCost;

    return NextResponse.json({
      success: true,
      card: savedCard,
      newBalance,
      imageUrl,
      pokemonId
    });

  } catch (error: any) {
    console.error('❌ [NFT Pokemon] КРИТИЧЕСКАЯ ОШИБКА:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

