import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '../../../../../lib/supabase';

/**
 * GET /api/nft/cards
 * Получить список всех доступных NFT карт для минта
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const rarity = searchParams.get('rarity');
    const suit = searchParams.get('suit');

    console.log(`📋 Получаем список NFT карт (rarity: ${rarity}, suit: ${suit})...`);

    let query = supabase
      .from('_pidr_nft_cards')
      .select('*')
      .order('rarity', { ascending: false })
      .order('card_rank', { ascending: true });

    if (rarity) {
      query = query.eq('rarity', rarity);
    }

    if (suit) {
      query = query.eq('card_suit', suit);
    }

    const { data: cards, error } = await query;

    if (error) {
      console.error('❌ Ошибка получения карт:', error);
      return NextResponse.json(
        { success: false, message: 'Ошибка получения карт' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      cards: cards || [],
      total: cards?.length || 0
    });

  } catch (error: any) {
    console.error('❌ Ошибка API получения карт:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Ошибка сервера' },
      { status: 500 }
    );
  }
}

