import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

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
    
    // Получаем сумму и статистику из тела запроса
    const body = await req.json();
    const { amount, updateStats } = body;
    
    if (!amount || typeof amount !== 'number') {
      return NextResponse.json(
        { success: false, error: 'Некорректная сумма' },
        { status: 400 }
      );
    }
    
    console.log(`💰 [Add Coins] Добавляем ${amount} монет пользователю ${userId}`);
    if (updateStats) {
      console.log(`📊 [Add Coins] Обновляем статистику:`, updateStats);
    }
    
    // Получаем текущие данные пользователя (баланс и статистика)
    const { data: userData, error: fetchError } = await supabase
      .from('_pidr_users')
      .select('coins, games_played, wins, losses')
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
    
    // Формируем объект обновления
    const updateData: any = { coins: newBalance };
    
    // ✅ Обновляем статистику если передана
    if (updateStats) {
      if (updateStats.gamesPlayed) {
        updateData.games_played = (userData.games_played || 0) + 1;
        console.log(`📊 Игр сыграно: ${userData.games_played || 0} → ${updateData.games_played}`);
      }
      if (updateStats.wins) {
        updateData.wins = (userData.wins || 0) + 1;
        console.log(`🏆 Побед: ${userData.wins || 0} → ${updateData.wins}`);
      }
      if (updateStats.losses) {
        updateData.losses = (userData.losses || 0) + 1;
        console.log(`💀 Поражений: ${userData.losses || 0} → ${updateData.losses}`);
      }
    }
    
    // Обновляем баланс и статистику в БД
    const { error: updateError } = await supabase
      .from('_pidr_users')
      .update(updateData)
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

