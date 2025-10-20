import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

export async function POST(req: NextRequest) {
  try {
    console.log('💰 [Add Coins] Запрос на добавление монет');
    
    // ✅ Авторизация через Telegram WebApp headers
    const telegramIdHeader = req.headers.get('x-telegram-id');
    
    if (!telegramIdHeader) {
      console.error('❌ [Add Coins] Не найден x-telegram-id header');
      return NextResponse.json(
        { success: false, error: 'Требуется авторизация' },
        { status: 401 }
      );
    }
    
    const userId = telegramIdHeader;
    console.log(`✅ [Add Coins] Авторизован пользователь: ${userId}`);
    
    // Получаем сумму из тела запроса
    const body = await req.json();
    const { amount } = body;
    
    if (!amount || typeof amount !== 'number') {
      return NextResponse.json(
        { success: false, error: 'Некорректная сумма' },
        { status: 400 }
      );
    }
    
    console.log(`💰 [Add Coins] Добавляем ${amount} монет пользователю ${userId}`);
    
    // Получаем текущий баланс пользователя
    const { data: userData, error: fetchError } = await supabase
      .from('pidr_users')
      .select('coins')
      .eq('telegram_id', userId)
      .single();
    
    if (fetchError) {
      console.error('❌ [Add Coins] Ошибка получения пользователя:', fetchError);
      return NextResponse.json(
        { success: false, error: 'Пользователь не найден' },
        { status: 404 }
      );
    }
    
    const currentCoins = userData.coins || 0;
    const newBalance = currentCoins + amount;
    
    // Обновляем баланс в БД
    const { error: updateError } = await supabase
      .from('pidr_users')
      .update({ coins: newBalance })
      .eq('telegram_id', userId);
    
    if (updateError) {
      console.error('❌ [Add Coins] Ошибка обновления баланса:', updateError);
      return NextResponse.json(
        { success: false, error: 'Ошибка обновления баланса' },
        { status: 500 }
      );
    }
    
    console.log(`✅ [Add Coins] Баланс обновлён: ${currentCoins} → ${newBalance}`);
    
    return NextResponse.json({
      success: true,
      newBalance,
      added: amount
    });
    
  } catch (error: any) {
    console.error('❌ [Add Coins] Критическая ошибка:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

