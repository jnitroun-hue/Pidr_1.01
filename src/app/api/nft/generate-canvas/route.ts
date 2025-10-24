import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getSessionFromRequest } from '@/lib/auth/session-utils';

/**
 * API для генерации NFT карт через Canvas
 * POST /api/nft/generate-canvas
 */
export async function POST(request: NextRequest) {
  try {
    console.log('🎴 [NFT Canvas] Запрос на генерацию карты');

    // Проверяем аутентификацию - БЕЗ cookies, только из localStorage через headers
    const telegramIdHeader = request.headers.get('x-telegram-id');
    const usernameHeader = request.headers.get('x-username');
    
    if (!telegramIdHeader) {
      console.error('❌ [NFT Canvas] Не найден x-telegram-id header');
      return NextResponse.json(
        { success: false, error: 'Требуется авторизация' },
        { status: 401 }
      );
    }

    const session = {
      userId: telegramIdHeader,
      telegramId: telegramIdHeader,
      username: usernameHeader || undefined
    };

    const userId = session.telegramId;

    console.log('✅ [NFT Canvas] Авторизован через headers:', { 
      userId,
      username: session.username 
    });

    const body = await request.json();
    const { 
      action = 'single',
      suit,
      rank,
      rarity = 'common',
      imageDataUrl // Base64 изображение с клиента
    } = body;

    // ✅ НОВАЯ СИСТЕМА ЦЕН: Ранг + Масть
    // Цены по рангам
    const RANK_COSTS: Record<string, number> = {
      '2': 1000, '3': 1000, '4': 1000, '5': 1000, '6': 1000, '7': 1000, '8': 1000, '9': 1000,
      '10': 2500,
      'jack': 2500, 'j': 2500,
      'queen': 5000, 'q': 5000,
      'king': 5000, 'k': 5000,
      'ace': 8000, 'a': 8000
    };

    // Цены по мастям
    const SUIT_COSTS: Record<string, number> = {
      'hearts': 500,
      'diamonds': 500,
      'clubs': 500,
      'spades': 1000 // ♠️ дороже
    };

    const FULL_DECK_COST = 150000; // 52 карты, средняя стоимость ~2800 за карту
    
    // Вычисляем стоимость карты
    const rankCost = RANK_COSTS[rank?.toLowerCase()] || 1000;
    const suitCost = SUIT_COSTS[suit?.toLowerCase()] || 500;
    const cardCost = rankCost + suitCost;
    
    const cost = action === 'full_deck' ? FULL_DECK_COST : (action === 'deck_card' ? 0 : cardCost);

    console.log('🎴 [NFT Canvas] Данные:', { 
      userId, 
      action, 
      suit, 
      rank, 
      rankCost, 
      suitCost, 
      totalCost: cardCost 
    });

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
    const { data: savedCard, error: saveError} = await supabase
      .from('_pidr_nft_cards')
      .insert([{
        user_id: userId,
        suit: suit,
        rank: rank,
        rarity: 'custom', // ✅ Фиксированное значение вместо переменной редкости
        image_url: publicUrl,
        storage_path: fileName,
        metadata: {
          generated_at: new Date().toISOString(),
          generator: 'client_canvas',
          version: '2.0',
          cost: cost,
          rank_cost: rankCost,
          suit_cost: suitCost
        },
        created_at: new Date().toISOString()
      }])
      .select()
      .single();

    if (saveError) {
      console.error('❌ [NFT Canvas] Ошибка сохранения в БД:', saveError);
      console.error('❌ [NFT Canvas] Детали ошибки:', JSON.stringify(saveError, null, 2));
      
      // ✅ КРИТИЧНО: Возвращаем монеты если не удалось сохранить карту!
      if (!isPartOfDeck && newBalance !== undefined) {
        await supabase
          .from('_pidr_users')
          .update({ coins: user.coins })
          .eq('id', user.id);
      }
      
      // ✅ КРИТИЧНО: Удаляем файл из Storage!
      await supabase.storage
        .from(bucketName)
        .remove([fileName]);
      
      return NextResponse.json(
        { 
          success: false, 
          error: 'Ошибка сохранения карты в базу данных',
          details: saveError.message || 'Неизвестная ошибка'
        },
        { status: 500 }
      );
    }
    
    if (!savedCard) {
      console.error('❌ [NFT Canvas] Карта не сохранена - savedCard is null');
      
      // Возвращаем монеты
      if (!isPartOfDeck && newBalance !== undefined) {
        await supabase
          .from('_pidr_users')
          .update({ coins: user.coins })
          .eq('id', user.id);
      }
      
      // Удаляем файл
      await supabase.storage
        .from(bucketName)
        .remove([fileName]);
      
      return NextResponse.json(
        { success: false, error: 'Карта не была сохранена' },
        { status: 500 }
      );
    }

    // Также добавляем в _pidr_nft_ownership для отображения в галерее
    const { error: ownershipError } = await supabase
      .from('_pidr_nft_ownership')
      .insert([{
        user_telegram_id: userId,
        nft_address: `local_${Date.now()}`,
        token_id: `${suit}_${rank}_custom`,
        card_id: `${rank}_of_${suit}`,
        card_name: `${rank.toUpperCase()} of ${suit.toUpperCase()}`,
        card_rank: rank,
        card_suit: suit,
        rarity: 'custom',
        image_url: publicUrl,
        acquired_via: 'generation',
        minted_at: new Date().toISOString()
      }]);
    
    if (ownershipError) {
      console.error('⚠️ [NFT Canvas] Ошибка добавления в ownership (не критично):', ownershipError);
      // Не останавливаем процесс - карта уже сохранена в _pidr_nft_cards
    }

    console.log('✅ [NFT Canvas] Карта сохранена в БД:', {
      cardId: savedCard.id,
      userId: userId,
      suit: suit,
      rank: rank
    });

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
    // Проверяем аутентификацию - БЕЗ cookies, только из localStorage через headers
    const telegramIdHeader = request.headers.get('x-telegram-id');
    const usernameHeader = request.headers.get('x-username');
    
    if (!telegramIdHeader) {
      console.error('❌ [NFT Canvas GET] Не найден x-telegram-id header');
      return NextResponse.json(
        { success: false, error: 'Требуется авторизация' },
        { status: 401 }
      );
    }

    const session = {
      userId: telegramIdHeader,
      telegramId: telegramIdHeader,
      username: usernameHeader || undefined
    };

    const userId = session.telegramId;

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

