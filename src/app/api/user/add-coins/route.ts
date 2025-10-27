import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(req: NextRequest) {
  try {
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
    
    // Получаем сумму и статистику из тела запроса
    const body = await req.json();
    const { amount, updateStats, traceId } = body;
    
    // ✅ ЛОГИРУЕМ С TRACE ID
    console.log(`💰💰💰 [${traceId || 'NO_TRACE'}] [Add Coins] Запрос на добавление монет от пользователя: ${userId}`);
    
    if (!amount || typeof amount !== 'number') {
      return NextResponse.json(
        { success: false, error: 'Некорректная сумма' },
        { status: 400 }
      );
    }
    
    console.log(`💰 [${traceId || 'NO_TRACE'}] [Add Coins] Добавляем ${amount} монет пользователю ${userId}`);
    if (updateStats) {
      console.log(`📊 [${traceId || 'NO_TRACE'}] [Add Coins] Обновляем статистику:`, JSON.stringify(updateStats, null, 2));
      console.log(`📊 [${traceId || 'NO_TRACE'}] [Add Coins] ДЕТАЛИ ЗАПРОСА:`, {
        gamesPlayed: updateStats.gamesPlayed,
        wins: updateStats.wins,
        losses: updateStats.losses,
        source: body.source || 'unknown',
        traceId: traceId
      });
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
      console.log(`🔍 [${traceId || 'NO_TRACE'}] [Add Coins] НАЧАЛО ОБНОВЛЕНИЯ СТАТИСТИКИ`);
      console.log(`📊 [${traceId || 'NO_TRACE'}] [Add Coins] Текущие значения в БД:`, {
        games_played: userData.games_played || 0,
        wins: userData.wins || 0,
        losses: userData.losses || 0
      });
      
      if (updateStats.gamesPlayed) {
        updateData.games_played = (userData.games_played || 0) + 1;
        console.log(`📊 [${traceId || 'NO_TRACE'}] Игр сыграно: ${userData.games_played || 0} → ${updateData.games_played}`);
      }
      if (updateStats.wins) {
        updateData.wins = (userData.wins || 0) + 1;
        console.log(`🏆 [${traceId || 'NO_TRACE'}] Побед: ${userData.wins || 0} → ${updateData.wins}`);
      }
      if (updateStats.losses) {
        updateData.losses = (userData.losses || 0) + 1;
        console.log(`💀 [${traceId || 'NO_TRACE'}] Поражений: ${userData.losses || 0} → ${updateData.losses}`);
      }
      
      console.log(`📊 [${traceId || 'NO_TRACE'}] [Add Coins] ИТОГОВЫЕ значения для записи:`, {
        games_played: updateData.games_played,
        wins: updateData.wins,
        losses: updateData.losses
      });
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
    
    console.log(`✅✅✅ [${traceId || 'NO_TRACE'}] [Add Coins] Баланс обновлён: ${currentCoins} → ${newBalance}`);
    if (updateStats) {
      console.log(`✅✅✅ [${traceId || 'NO_TRACE'}] [Add Coins] СТАТИСТИКА УСПЕШНО ОБНОВЛЕНА В БД!`);
    }
    
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

