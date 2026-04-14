import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { requireAuth, getUserIdFromDatabase } from '@/lib/auth-utils';

export async function POST(req: NextRequest) {
  try {
    // ✅ УНИВЕРСАЛЬНО: Используем универсальную авторизацию
    const auth = requireAuth(req);

    if (auth.error || !auth.userId) {
      console.error('❌ [Add Coins] Ошибка авторизации:', auth.error);
      return NextResponse.json(
        { success: false, error: auth.error || 'Требуется авторизация' },
        { status: 401 }
      );
    }

    const { userId, environment } = auth;
    const { dbUserId, user: dbUser } = await getUserIdFromDatabase(userId, environment);

    if (!dbUserId || !dbUser) {
      console.error('❌ [Add Coins] Пользователь не найден в БД');
      return NextResponse.json(
        { success: false, error: 'Пользователь не найден' },
        { status: 404 }
      );
    }
    
    const body = await req.json();
    const { amount, updateStats, traceId, ratingChange } = body;
    
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
    
    // Используем данные пользователя из getUserIdFromDatabase
    const userData = dbUser;
    const currentCoins = userData.coins || 0;
    const newBalance = currentCoins + amount;

    if (newBalance < 0) {
      return NextResponse.json(
        {
          success: false,
          error: `Недостаточно монет. Требуется: ${Math.abs(amount)}, есть: ${currentCoins}`
        },
        { status: 400 }
      );
    }
    
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
        updateData.total_games = (userData.total_games || 0) + 1;
        console.log(`📊 [${traceId || 'NO_TRACE'}] Игр сыграно: ${userData.games_played || 0} → ${updateData.games_played}`);
      }
      if (updateStats.wins) {
        updateData.games_won = (userData.games_won || 0) + 1;
        console.log(`🏆 [${traceId || 'NO_TRACE'}] Побед: ${userData.games_won || 0} → ${updateData.games_won}`);
      }
      // ✅ КРИТИЧНО: Обновляем поражения (раньше не записывались в БД!)
      if (updateStats.losses) {
        updateData.losses = (userData.losses || 0) + 1;
        console.log(`💀 [${traceId || 'NO_TRACE'}] Поражений: ${userData.losses || 0} → ${updateData.losses}`);
      }
      
      console.log(`📊 [${traceId || 'NO_TRACE'}] [Add Coins] ИТОГОВЫЕ значения для записи:`, updateData);
    }
    
    if (ratingChange && typeof ratingChange === 'number') {
      const currentRating = userData.rating || 1000;
      updateData.rating = Math.max(0, currentRating + ratingChange);
      console.log(`📈 [${traceId || 'NO_TRACE'}] Рейтинг: ${currentRating} → ${updateData.rating} (${ratingChange > 0 ? '+' : ''}${ratingChange})`);
    }
    
    // Обновляем баланс и статистику в БД
    const { error: updateError } = await supabaseAdmin
      .from('_pidr_users')
      .update(updateData)
      .eq('id', dbUserId);
    
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
      { success: false, error: (error instanceof Error ? error.message : String(error)) || 'Internal server error' },
      { status: 500 }
    );
  }
}

