import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Проверяем переменные окружения
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.warn('⚠️ Supabase credentials not found for base-cards');
}

const supabase = supabaseUrl && supabaseKey 
  ? createClient(supabaseUrl, supabaseKey)
  : null;

/**
 * GET /api/nft/base-cards/[suit]/[rank]
 * Получить прегенерированную базовую карту из Supabase Storage
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { suit: string; rank: string } }
) {
  try {
    // Проверяем наличие Supabase
    if (!supabase) {
      return NextResponse.json(
        { error: 'Supabase not configured' },
        { status: 500 }
      );
    }

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

