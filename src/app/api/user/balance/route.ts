import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../lib/supabase';
import { requireAuth, getUserIdFromDatabase } from '../../../../lib/auth-utils';
import { normalizeUserStats } from '@/lib/user/normalize-user-stats';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

function noStoreJson(body: unknown, init?: ResponseInit) {
  const response = NextResponse.json(body, init);
  response.headers.set('Cache-Control', 'private, no-store, no-cache, must-revalidate');
  response.headers.set('Pragma', 'no-cache');
  response.headers.set('Expires', '0');
  return response;
}

// GET /api/user/balance - Получить текущий баланс пользователя (универсально для всех платформ)
export async function GET(req: NextRequest) {
  console.log('💰 GET /api/user/balance - Получение баланса пользователя...');
  
  const auth = requireAuth(req);
  
  if (auth.error || !auth.userId) {
    console.error('❌ [GET /api/user/balance] Ошибка авторизации:', auth.error);
    return noStoreJson({ success: false, message: auth.error || 'Требуется авторизация' }, { status: 401 });
  }
  
  const { userId, environment } = auth;
  console.log(`✅ [GET /api/user/balance] Пользователь: ${userId} (${environment})`);
  
  try {
    // ✅ УНИВЕРСАЛЬНО: Получаем пользователя из БД
    const { dbUserId, user: dbUser } = await getUserIdFromDatabase(userId, environment);
    
    if (!dbUserId || !dbUser) {
      console.error('❌ [GET /api/user/balance] Пользователь не найден');
      return noStoreJson({ 
        success: false, 
        message: 'Пользователь не найден' 
      }, { status: 404 });
    }
    
    const user = dbUser;
    
    console.log(`💰 Баланс пользователя ${user.username}: ${user.coins} монет`);
    
    // Получаем последние транзакции для истории
    // ✅ ИСПРАВЛЕНО: Используем _pidr_coin_transactions и dbUserId
    const { data: recentTransactions } = await supabaseAdmin
      .from('_pidr_coin_transactions')
      .select('id, transaction_type, amount, description, created_at')
      .eq('user_id', dbUserId)
      .order('created_at', { ascending: false })
      .limit(10);
    
    const stats = normalizeUserStats(user);

    return noStoreJson({ 
      success: true, 
      data: {
        balance: user.coins,
        user: {
          id: user.id,
          username: user.username,
          rating: user.rating,
          gamesPlayed: stats.gamesPlayed,
          gamesWon: stats.wins,
          memberSince: user.created_at
        },
        recentTransactions: recentTransactions || []
      }
    });
    
  } catch (error: unknown) {
    console.error('❌ Ошибка получения баланса:', error);
    const message = error instanceof Error ? error.message : 'Неизвестная ошибка';
    return noStoreJson({ 
      success: false, 
      message: `Ошибка получения баланса: ${message}` 
    }, { status: 500 });
  }
}

// POST /api/user/balance - Обновить баланс пользователя (для внутренних операций)
export async function POST(req: NextRequest) {
  console.log('💰 POST /api/user/balance - Обновление баланса пользователя...');
  
  const auth = requireAuth(req);
  
  if (auth.error || !auth.userId) {
    console.error('❌ [POST /api/user/balance] Ошибка авторизации:', auth.error);
    return noStoreJson({ success: false, message: auth.error || 'Требуется авторизация' }, { status: 401 });
  }
  
  const { userId, environment } = auth;
  console.log(`✅ [POST /api/user/balance] Пользователь: ${userId} (${environment})`);
  
  try {
    const { amount, type, description } = await req.json();
    
    if (typeof amount !== 'number' || amount === 0) {
      return noStoreJson({ 
        success: false, 
        message: 'Некорректная сумма' 
      }, { status: 400 });
    }
    
    if (!type || !description) {
      return noStoreJson({ 
        success: false, 
        message: 'Не указан тип операции или описание' 
      }, { status: 400 });
    }
    
    console.log(`💰 Обновление баланса: ${amount > 0 ? '+' : ''}${amount} (${type})`);
    
    // ✅ УНИВЕРСАЛЬНО: Получаем пользователя из БД
    const { dbUserId, user: dbUser } = await getUserIdFromDatabase(userId, environment);
    
    if (!dbUserId || !dbUser) {
      console.error('❌ [POST /api/user/balance] Пользователь не найден');
      return noStoreJson({ 
        success: false, 
        message: 'Пользователь не найден' 
      }, { status: 404 });
    }
    
    const user = dbUser;
    
    const oldBalance = user.coins;
    const newBalance = oldBalance + amount;
    
    // Проверяем, что баланс не уходит в минус
    if (newBalance < 0) {
      return noStoreJson({ 
        success: false, 
        message: 'Недостаточно средств' 
      }, { status: 400 });
    }
    
    console.log(`💰 Баланс ${user.username}: ${oldBalance} → ${newBalance}`);
    
    // ✅ ИСПРАВЛЕНО: Используем supabaseAdmin для обхода RLS
    // Обновляем баланс в базе данных
    const { error: updateError } = await supabaseAdmin
      .from('_pidr_users')
      .update({ 
        coins: newBalance,
        updated_at: new Date().toISOString()
      })
      .eq('id', dbUserId);
      
    if (updateError) {
      console.error('❌ Ошибка обновления баланса:', updateError);
      return noStoreJson({ 
        success: false, 
        message: 'Ошибка обновления баланса' 
      }, { status: 500 });
    }
    
    // Записываем транзакцию
    // ✅ ИСПРАВЛЕНО: Используем _pidr_coin_transactions
    const { error: transactionError } = await supabaseAdmin
      .from('_pidr_coin_transactions')
      .insert({
        user_id: dbUserId,
        transaction_type: type,
        amount: amount,
        description: description,
        balance_before: oldBalance,
        balance_after: newBalance,
        created_at: new Date().toISOString()
      });
      
    if (transactionError) {
      console.warn('⚠️ Ошибка записи транзакции:', transactionError);
      // Не критично, продолжаем
    }
    
    console.log(`✅ Баланс успешно обновлен для ${user.username}`);
    
    return noStoreJson({ 
      success: true, 
      message: `${amount > 0 ? 'Начислено' : 'Списано'} ${Math.abs(amount)} монет`,
      data: {
        oldBalance,
        newBalance,
        amount,
        type,
        description
      }
    });
    
  } catch (error: unknown) {
    console.error('❌ Критическая ошибка обновления баланса:', error);
    const message = error instanceof Error ? error.message : 'Неизвестная ошибка';
    return noStoreJson({ 
      success: false, 
      message: `Внутренняя ошибка сервера: ${message}` 
    }, { status: 500 });
  }
}
