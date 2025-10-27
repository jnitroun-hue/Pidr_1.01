/**
 * 🎴 API: Добавление NFT карты в игровую колоду пользователя
 * 
 * POST /api/nft/add-to-deck
 * 
 * Body: {
 *   nftId: string,
 *   suit: string,
 *   rank: string,
 *   imageUrl: string
 * }
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Supabase credentials missing:', { 
    hasUrl: !!supabaseUrl, 
    hasKey: !!supabaseServiceKey 
  });
}

const supabase = createClient(
  supabaseUrl || '',
  supabaseServiceKey || ''
);

export async function POST(request: NextRequest) {
  try {
    console.log('🎴 [add-to-deck] Получен запрос на добавление NFT в колоду');

    // Получаем данные из запроса
    const body = await request.json();
    const { nftId, suit, rank, imageUrl } = body;

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
    console.log(`🎴 NFT ID: ${nftId}, ${rank}${suit}`);

    // Проверяем что карта принадлежит пользователю
    const { data: nftCard, error: nftError } = await supabase
      .from('_pidr_nft_cards')
      .select('*')
      .eq('id', nftId)
      .eq('user_id', userId)
      .single();

    if (nftError || !nftCard) {
      console.error('❌ Карта не найдена или не принадлежит пользователю:', nftError);
      return NextResponse.json(
        { success: false, error: 'Карта не найдена' },
        { status: 404 }
      );
    }

    // Проверяем существует ли уже запись в _pidr_user_nft_deck
    const { data: existing, error: checkError } = await supabase
      .from('_pidr_user_nft_deck')
      .select('*')
      .eq('user_id', userId)
      .eq('suit', suit)
      .eq('rank', rank)
      .maybeSingle();

    if (checkError) {
      console.error('❌ Ошибка проверки существующей карты:', checkError);
    }

    if (existing) {
      // Обновляем существующую запись
      const { error: updateError } = await supabase
        .from('_pidr_user_nft_deck')
        .update({
          nft_card_id: nftId,
          image_url: imageUrl,
          updated_at: new Date().toISOString()
        })
        .eq('id', existing.id);

      if (updateError) {
        console.error('❌ Ошибка обновления карты в колоде:', updateError);
        return NextResponse.json(
          { success: false, error: 'Ошибка обновления карты' },
          { status: 500 }
        );
      }

      console.log('✅ Карта обновлена в игровой колоде');
    } else {
      // Создаем новую запись
      const { error: insertError } = await supabase
        .from('_pidr_user_nft_deck')
        .insert({
          user_id: userId,
          nft_card_id: nftId,
          suit,
          rank,
          image_url: imageUrl,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });

      if (insertError) {
        console.error('❌ Ошибка добавления карты в колоду:', insertError);
        return NextResponse.json(
          { success: false, error: 'Ошибка добавления карты' },
          { status: 500 }
        );
      }

      console.log('✅ Карта добавлена в игровую колоду');
    }

    return NextResponse.json({
      success: true,
      message: 'Карта добавлена в игровую колоду'
    });

  } catch (error: any) {
    console.error('❌ [add-to-deck] Ошибка:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Внутренняя ошибка сервера' },
      { status: 500 }
    );
  }
}

