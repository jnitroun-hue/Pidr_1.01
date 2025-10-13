import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { supabase } from '@/lib/supabase';

/**
 * API для генерации NFT карт через Canvas
 * POST /api/nft/generate-canvas
 */
export async function POST(request: NextRequest) {
  try {
    console.log('🎴 [NFT Canvas] Запрос на генерацию карты');

    // Проверяем аутентификацию
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('pidr_session');
    
    if (!sessionCookie) {
      return NextResponse.json(
        { success: false, error: 'Требуется авторизация' },
        { status: 401 }
      );
    }

    // Получаем данные пользователя
    const sessionData = JSON.parse(sessionCookie.value);
    const userId = sessionData.userId || sessionData.telegramId || sessionData.telegram_id || sessionData.id;

    console.log('🎴 [NFT Canvas] Session data:', { 
      hasUserId: !!sessionData.userId,
      hasTelegramId: !!sessionData.telegramId,
      hasTelegram_id: !!sessionData.telegram_id,
      hasId: !!sessionData.id,
      finalUserId: userId
    });

    if (!userId) {
      console.error('❌ [NFT Canvas] ID пользователя не найден в сессии:', Object.keys(sessionData));
      return NextResponse.json(
        { success: false, error: 'ID пользователя не найден в сессии' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { 
      action = 'single',
      suit,
      rank,
      rarity = 'common',
      imageDataUrl // Base64 изображение с клиента
    } = body;

    // Цены в зависимости от редкости
    const RARITY_COSTS: Record<string, number> = {
      common: 1000,
      rare: 2000,
      epic: 3500,
      legendary: 5000,
      mythic: 10000
    };

    const FULL_DECK_COST = 20000;
    
    const cost = action === 'full_deck' ? FULL_DECK_COST : (RARITY_COSTS[rarity] || 1000);

    console.log('🎴 [NFT Canvas] Данные:', { userId, action, suit, rank, rarity, cost });

    // Проверяем баланс пользователя
    const { data: user, error: userError } = await supabase
      .from('_pidr_users')
      .select('id, coins, telegram_id')
      .eq('telegram_id', userId)
      .single();

    if (userError || !user) {
      return NextResponse.json(
        { success: false, error: 'Пользователь не найден в БД' },
        { status: 404 }
      );
    }

    let newBalance = user.coins;
    let actualCost = cost;

    // Для полной колоды первая карта уже оплачена, остальные бесплатно
    const isPartOfDeck = action === 'deck_card';
    if (!isPartOfDeck) {
      // Обычная генерация - проверяем и списываем монеты
      if (user.coins < cost) {
        return NextResponse.json(
          { success: false, error: 'Недостаточно монет', required: cost, available: user.coins },
          { status: 400 }
        );
      }

      // Списываем монеты
      newBalance = user.coins - cost;
      const { error: updateError } = await supabase
        .from('_pidr_users')
        .update({ coins: newBalance })
        .eq('id', user.id);

      if (updateError) {
        console.error('❌ [NFT Canvas] Ошибка обновления баланса:', updateError);
        return NextResponse.json(
          { success: false, error: 'Ошибка списания монет' },
          { status: 500 }
        );
      }

      // Создаем транзакцию
      await supabase
        .from('_pidr_coin_transactions')
        .insert([{
          user_id: user.id,
          amount: -cost,
          transaction_type: 'nft_generation',
          description: `Генерация NFT карты: ${rank} of ${suit}`,
          balance_before: user.coins,
          balance_after: newBalance
        }]);

      console.log('✅ [NFT Canvas] Монеты списаны, сохраняем карту...');
    } else {
      // Карта из колоды - уже оплачена, просто сохраняем
      actualCost = 0;
      console.log('✅ [NFT Canvas] Карта из колоды (уже оплачена), сохраняем...');
    }

    if (!imageDataUrl) {
      return NextResponse.json(
        { success: false, error: 'Изображение карты не предоставлено' },
        { status: 400 }
      );
    }

    // Конвертируем base64 в Buffer
    const base64Data = imageDataUrl.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');

    // Генерируем имя файла
    const fileName = `${userId}/${suit}_${rank}_${rarity}_${Date.now()}.png`;
    const bucketName = 'nft-cards';

    // Загружаем в Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(bucketName)
      .upload(fileName, buffer, {
        contentType: 'image/png',
        cacheControl: '3600',
        upsert: false
      });

    if (uploadError) {
      console.error('❌ [NFT Canvas] Ошибка загрузки в Storage:', uploadError);
      
      // Возвращаем монеты обратно
      await supabase
        .from('_pidr_users')
        .update({ coins: user.coins })
        .eq('id', user.id);
      
      return NextResponse.json(
        { success: false, error: 'Ошибка загрузки изображения' },
        { status: 500 }
      );
    }

    // Получаем публичный URL
    const { data: { publicUrl } } = supabase.storage
      .from(bucketName)
      .getPublicUrl(fileName);

    console.log('✅ [NFT Canvas] Карта загружена в Storage:', publicUrl);

    // Сохраняем в таблицу _pidr_nft_cards
    const { data: savedCard, error: saveError } = await supabase
      .from('_pidr_nft_cards')
      .insert([{
        user_id: userId,
        suit: suit,
        rank: rank,
        rarity: rarity,
        image_url: publicUrl,
        storage_path: fileName,
        metadata: {
          generated_at: new Date().toISOString(),
          generator: 'client_canvas',
          version: '1.0',
          cost: cost
        },
        created_at: new Date().toISOString()
      }])
      .select()
      .single();

    if (saveError) {
      console.error('❌ [NFT Canvas] Ошибка сохранения в БД:', saveError);
    }

    // Также добавляем в _pidr_nft_ownership для отображения в галерее
    await supabase
      .from('_pidr_nft_ownership')
      .insert([{
        user_telegram_id: userId,
        nft_address: `local_${Date.now()}`,
        token_id: `${suit}_${rank}_${rarity}`,
        card_id: `${rank}_of_${suit}`,
        card_name: `${rank.toUpperCase()} of ${suit.toUpperCase()}`,
        card_rank: rank,
        card_suit: suit,
        rarity: rarity,
        image_url: publicUrl,
        acquired_via: 'generation',
        minted_at: new Date().toISOString()
      }]);

    console.log('✅ [NFT Canvas] Карта сохранена в БД');

    return NextResponse.json({
      success: true,
      message: 'Карта успешно сгенерирована!',
      card: {
        ...savedCard,
        imageUrl: publicUrl
      },
      balance: newBalance,
      spent: cost
    });

  } catch (error: any) {
    console.error('❌ [NFT Canvas] Ошибка:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

/**
 * GET /api/nft/generate-canvas
 * Получение списка доступных для генерации карт
 */
export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('pidr_session');
    
    if (!sessionCookie) {
      return NextResponse.json(
        { success: false, error: 'Требуется авторизация' },
        { status: 401 }
      );
    }

    const sessionData = JSON.parse(sessionCookie.value);
    const userId = sessionData.userId || sessionData.telegramId || sessionData.telegram_id || sessionData.id;

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'ID пользователя не найден' },
        { status: 400 }
      );
    }

    // Получаем все карты пользователя
    const { data: cards, error } = await supabase
      .from('_pidr_nft_cards')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ [NFT Canvas] Ошибка получения карт:', error);
      return NextResponse.json(
        { success: false, error: 'Ошибка получения карт' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      cards: cards || [],
      count: cards?.length || 0
    });

  } catch (error: any) {
    console.error('❌ [NFT Canvas] Ошибка:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

