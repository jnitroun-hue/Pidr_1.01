import { NextResponse } from 'next/server';

/**
 * API endpoint для получения публичных конфигов на клиенте
 * Возвращает Supabase URL и ANON KEY (публичные данные, безопасно передавать)
 */
export async function GET() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || '';
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '';

    // Проверяем что переменные есть
    if (!supabaseUrl || !supabaseAnonKey) {
      console.error('❌ [/api/config] Отсутствуют Supabase переменные!');
      return NextResponse.json(
        { 
          error: 'Supabase configuration missing',
          hasUrl: !!supabaseUrl,
          hasKey: !!supabaseAnonKey
        },
        { status: 500 }
      );
    }

    // Возвращаем публичные данные
    return NextResponse.json({
      supabaseUrl,
      supabaseAnonKey
    });
  } catch (error: unknown) {
    console.error('❌ [/api/config] Ошибка:', error);
    return NextResponse.json(
      { error: 'Failed to load config' },
      { status: 500 }
    );
  }
}

