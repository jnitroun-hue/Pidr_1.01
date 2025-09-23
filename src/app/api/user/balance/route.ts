import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '../../../../lib/supabase';
import { requireAuth } from '../../../../lib/auth-utils';

// GET /api/user/balance - Получить текущий баланс пользователя
export async function GET(req: NextRequest) {
  console.log('💰 GET /api/user/balance - Получение баланса пользователя...');
  
  const auth = requireAuth(req);
  if (auth.error) {
    console.error('❌ Ошибка авторизации:', auth.error);
    return NextResponse.json({ success: false, message: auth.error }, { status: 401 });
  }
  
  const userId = auth.userId;
  
  try {
    // Получаем актуальный баланс из базы данных
    const { data: user, error: userError } = await supabase
      .from('_pidr_users')
      .select('id, username, coins, rating, games_played, games_won, created_at')
      .eq('id', userId)
      .single();
      
    if (userError || !user) {
      console.error('❌ Пользователь не найден:', userError);
      return NextResponse.json({ 
        success: false, 
        message: 'Пользователь не найден' 
      }, { status: 404 });
    }
    
    console.log(`💰 Баланс пользователя ${user.username}: ${user.coins} монет`);
    
    // Получаем последние транзакции для истории
    const { data: recentTransactions } = await supabase
      .from('_pidr_transactions')
      .select('id, type, amount, description, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(10);
    
    return NextResponse.json({ 
      success: true, 
      data: {
        balance: user.coins,
        user: {
          id: user.id,
          username: user.username,
          rating: user.rating,
          gamesPlayed: user.games_played,
          gamesWon: user.games_won,
          memberSince: user.created_at
        },
        recentTransactions: recentTransactions || []
      }
    });
    
  } catch (error: any) {
    console.error('❌ Ошибка получения баланса:', error);
    return NextResponse.json({ 
      success: false, 
      message: `Ошибка получения баланса: ${error?.message || 'Неизвестная ошибка'}` 
    }, { status: 500 });
  }
}

// POST /api/user/balance - Обновить баланс пользователя (для внутренних операций)
export async function POST(req: NextRequest) {
  console.log('💰 POST /api/user/balance - Обновление баланса пользователя...');
  
  const auth = requireAuth(req);
  if (auth.error) {
    console.error('❌ Ошибка авторизации:', auth.error);
    return NextResponse.json({ success: false, message: auth.error }, { status: 401 });
  }
  
  const userId = auth.userId;
  
  try {
    const { amount, type, description } = await req.json();
    
    if (typeof amount !== 'number' || amount === 0) {
      return NextResponse.json({ 
        success: false, 
        message: 'Некорректная сумма' 
      }, { status: 400 });
    }
    
    if (!type || !description) {
      return NextResponse.json({ 
        success: false, 
        message: 'Не указан тип операции или описание' 
      }, { status: 400 });
    }
    
    console.log(`💰 Обновление баланса: ${amount > 0 ? '+' : ''}${amount} (${type})`);
    
    // Получаем текущий баланс
    const { data: user, error: userError } = await supabase
      .from('_pidr_users')
      .select('id, username, coins')
      .eq('id', userId)
      .single();
      
    if (userError || !user) {
      console.error('❌ Пользователь не найден:', userError);
      return NextResponse.json({ 
        success: false, 
        message: 'Пользователь не найден' 
      }, { status: 404 });
    }
    
    const oldBalance = user.coins;
    const newBalance = oldBalance + amount;
    
    // Проверяем, что баланс не уходит в минус
    if (newBalance < 0) {
      return NextResponse.json({ 
        success: false, 
        message: 'Недостаточно средств' 
      }, { status: 400 });
    }
    
    console.log(`💰 Баланс ${user.username}: ${oldBalance} → ${newBalance}`);
    
    // Обновляем баланс в базе данных
    const { error: updateError } = await supabase
      .from('_pidr_users')
      .update({ 
        coins: newBalance,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId);
      
    if (updateError) {
      console.error('❌ Ошибка обновления баланса:', updateError);
      return NextResponse.json({ 
        success: false, 
        message: 'Ошибка обновления баланса' 
      }, { status: 500 });
    }
    
    // Записываем транзакцию
    const { error: transactionError } = await supabase
      .from('_pidr_transactions')
      .insert({
        user_id: userId,
        type: type,
        amount: amount,
        description: description,
        created_at: new Date().toISOString()
      });
      
    if (transactionError) {
      console.warn('⚠️ Ошибка записи транзакции:', transactionError);
      // Не критично, продолжаем
    }
    
    console.log(`✅ Баланс успешно обновлен для ${user.username}`);
    
    return NextResponse.json({ 
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
    
  } catch (error: any) {
    console.error('❌ Критическая ошибка обновления баланса:', error);
    return NextResponse.json({ 
      success: false, 
      message: `Внутренняя ошибка сервера: ${error?.message || 'Неизвестная ошибка'}` 
    }, { status: 500 });
  }
}
