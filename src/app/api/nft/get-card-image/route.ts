/**
 * 🎴 API: Получение NFT изображения карты для отображения в игре
 * 
 * GET /api/nft/get-card-image?userId=123&suit=hearts&rank=A
 * 
 * Возвращает URL изображения NFT карты если она есть в колоде пользователя
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// ✅ Ленивая инициализация Supabase клиента
function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Supabase credentials not configured');
  }

  return createClient(supabaseUrl, supabaseServiceKey);
}

export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabaseClient();
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const suit = searchParams.get('suit');
    const rank = searchParams.get('rank');

    if (!userId || !suit || !rank) {
      return NextResponse.json(
        { success: false, error: 'Missing parameters' },
        { status: 400 }
      );
    }

    console.log(`🎴 [get-card-image] Запрос: userId=${userId}, suit=${suit}, rank=${rank}`);

    // Получаем NFT карту из колоды пользователя
    const { data, error } = await supabase
      .from('_pidr_user_nft_deck')
      .select('image_url, nft_card_id')
      .eq('user_id', parseInt(userId, 10))
      .eq('suit', suit.toLowerCase())
      .eq('rank', rank.toLowerCase())
      .maybeSingle();

    if (error) {
      console.error('❌ Ошибка получения карты:', error);
      return NextResponse.json(
        { success: false, hasNFT: false },
        { status: 200 }
      );
    }

    if (!data) {
      console.log(`ℹ️ NFT карта не найдена для ${userId} - ${rank}${suit}`);
      return NextResponse.json({
        success: true,
        hasNFT: false
      });
    }

    console.log(`✅ Найдена NFT карта: ${data.image_url}`);

    return NextResponse.json({
      success: true,
      hasNFT: true,
      imageUrl: data.image_url,
      nftCardId: data.nft_card_id
    });

  } catch (error: any) {
    console.error('❌ [get-card-image] Ошибка:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

