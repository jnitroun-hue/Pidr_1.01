import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * GET /api/nft/base-cards/[suit]/[rank]
 * Получить прегенерированную базовую карту из Supabase Storage
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { suit: string; rank: string } }
) {
  try {
    const { suit, rank } = params;

    // Путь к карте в Supabase Storage
    const filePath = `base-cards/${suit}/${rank}.png`;

    // Получаем публичный URL
    const { data } = supabase.storage
      .from('nft-cards')
      .getPublicUrl(filePath);

    if (!data.publicUrl) {
      // Если карта не найдена, возвращаем заглушку
      return NextResponse.json(
        { error: 'Базовая карта не найдена' },
        { status: 404 }
      );
    }

    // Редирект на Supabase Storage CDN
    return NextResponse.redirect(data.publicUrl);

  } catch (error) {
    console.error('❌ Ошибка получения базовой карты:', error);
    return NextResponse.json(
      { error: 'Ошибка загрузки карты' },
      { status: 500 }
    );
  }
}

