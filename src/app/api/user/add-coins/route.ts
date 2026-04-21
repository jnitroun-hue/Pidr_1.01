import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { requireAuth, getUserIdFromDatabase } from '@/lib/auth-utils';
import { getRedis } from '@/lib/redis/init';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

function noStoreJson(body: any, init?: ResponseInit) {
  const response = NextResponse.json(body, init);
  response.headers.set('Cache-Control', 'private, no-store, no-cache, must-revalidate');
  response.headers.set('Pragma', 'no-cache');
  response.headers.set('Expires', '0');
  return response;
}

export async function POST(req: NextRequest) {
  try {
    // ✅ УНИВЕРСАЛЬНО: Используем универсальную авторизацию
    const auth = requireAuth(req);

    if (auth.error || !auth.userId) {
      console.error('❌ [Add Coins] Ошибка авторизации:', auth.error);
      return noStoreJson(
        { success: false, error: auth.error || 'Требуется авторизация' },
        { status: 401 }
      );
    }

    const { userId, environment } = auth;
    const { dbUserId, user: dbUser } = await getUserIdFromDatabase(userId, environment);

    if (!dbUserId || !dbUser) {
      console.error('❌ [Add Coins] Пользователь не найден в БД');
      return noStoreJson(
        { success: false, error: 'Пользователь не найден' },
        { status: 404 }
      );
    }
    
    const body = await req.json();
    const { amount, updateStats, traceId, ratingChange, source } = body;
    
    // ✅ ЛОГИРУЕМ С TRACE ID
    console.log(`💰💰💰 [${traceId || 'NO_TRACE'}] [Add Coins] Запрос на добавление монет от пользователя: ${userId}`);
    
    // amount может быть 0 (например, апдейт только статистики/рейтинга), поэтому проверяем только тип
    if (typeof amount !== 'number' || Number.isNaN(amount)) {
      return noStoreJson(
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
    
    const redis = getRedis();
    const userLockKey = `lock:add-coins:${dbUserId}`;
    const traceDoneKey = traceId ? `add-coins:done:${dbUserId}:${traceId}` : null;
    let lockAcquired = false;

    try {
      // Идемпотентность по traceId: повторный запрос не должен повторно начислять/списывать
      if (traceDoneKey && redis) {
        const alreadyDone = await redis.get(traceDoneKey);
        if (alreadyDone) {
          console.log(`♻️ [${traceId}] [Add Coins] Дубликат запроса, операция уже обработана`);
          return noStoreJson({ success: true, duplicated: true });
        }
      }

      // Мягкая блокировка на пользователя, чтобы убрать гонки при одновременных апдейтах
      if (redis) {
        const lockResult = await redis.set(userLockKey, String(Date.now()), { nx: true, ex: 8 });
        lockAcquired = lockResult === 'OK';
      }

      // Если lock не удалось взять, читаем свежие данные и продолжаем (fallback без hard-fail)
      if (redis && !lockAcquired) {
        console.warn(`⚠️ [${traceId || 'NO_TRACE'}] [Add Coins] Lock не получен, продолжаем в fallback режиме`);
      }

      // Всегда читаем актуального пользователя прямо перед апдейтом (чтобы не брать устаревшие dbUser)
      const { data: freshUser, error: freshUserError } = await supabaseAdmin
        .from('_pidr_users')
        .select('*')
        .eq('id', dbUserId)
        .single();

      if (freshUserError || !freshUser) {
        console.error('❌ [Add Coins] Не удалось получить актуальные данные пользователя:', freshUserError);
        return noStoreJson({ success: false, error: 'Не удалось получить данные пользователя' }, { status: 500 });
      }
      
      const userData = freshUser;
      const currentCoins = userData.coins || 0;
      const newBalance = currentCoins + amount;

      if (newBalance < 0) {
        return noStoreJson(
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
        updateData.total_games_played = (userData.total_games_played || 0) + 1;
        console.log(`📊 [${traceId || 'NO_TRACE'}] Игр сыграно: ${userData.games_played || 0} → ${updateData.games_played}`);
      }
      if (updateStats.wins) {
        updateData.games_won = (userData.games_won || 0) + 1;
        updateData.wins = (userData.wins || 0) + 1;
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
        return noStoreJson(
          { success: false, error: 'Ошибка обновления баланса' },
          { status: 500 }
        );
      }

      // История транзакций: записываем каждое начисление/списание для прозрачности наград
      const txType = typeof source === 'string' && source.trim() ? source.trim() : 'manual_adjustment';
      const { error: txError } = await supabaseAdmin
        .from('_pidr_coin_transactions')
        .insert({
          user_id: dbUserId,
          transaction_type: txType,
          amount,
          description: traceId ? `trace:${traceId}` : `source:${txType}`,
          balance_before: currentCoins,
          balance_after: newBalance,
          created_at: new Date().toISOString()
        });
      if (txError) {
        console.warn('⚠️ [Add Coins] Не удалось записать coin transaction:', txError.message);
      }

      if (traceDoneKey && redis) {
        await redis.set(traceDoneKey, '1', { ex: 60 * 60 * 24 * 7 }); // 7 дней защиты от дублей
      }
    
      console.log(`✅✅✅ [${traceId || 'NO_TRACE'}] [Add Coins] Баланс обновлён: ${currentCoins} → ${newBalance}`);
      if (updateStats) {
        console.log(`✅✅✅ [${traceId || 'NO_TRACE'}] [Add Coins] СТАТИСТИКА УСПЕШНО ОБНОВЛЕНА В БД!`);
      }
    
      return noStoreJson({
        success: true,
        newBalance,
        added: amount
      });
    } finally {
      if (redis && lockAcquired) {
        await redis.del(userLockKey);
      }
    }
    
  } catch (error: any) {
    console.error('❌ [Add Coins] Критическая ошибка:', error);
    return noStoreJson(
      { success: false, error: (error instanceof Error ? error.message : String(error)) || 'Internal server error' },
      { status: 500 }
    );
  }
}

