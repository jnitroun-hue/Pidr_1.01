import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '../../../../lib/supabase';
import { requireAuth } from '../../../../lib/auth-utils';

// Используем единую функцию авторизации из auth-utils
function getUserIdFromRequest(req: NextRequest): string | null {
  try {
    const authResult = requireAuth(req);
    if (authResult.error || !authResult.userId) {
      return null;
    }
    return authResult.userId;
  } catch {
    return null;
  }
}

// GET /api/wallet/transactions - Получить транзакции пользователя
export async function GET(req: NextRequest) {
  const userId = getUserIdFromRequest(req);
  if (!userId) {
    return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);
    const offset = Math.max(parseInt(searchParams.get('offset') || '0'), 0);
    const type = searchParams.get('type'); // deposit, withdrawal, purchase, game_win, game_loss

    console.log(`📊 [TRANSACTIONS API] Получаем транзакции для userId=${userId} (type: ${typeof userId}), лимит: ${limit}`);

    // ✅ КРИТИЧНО: userId из requireAuth это telegram_id
    // Нужно получить user.id (UUID/BIGINT) из таблицы _pidr_users
    const { data: userData, error: userError } = await supabase
      .from('_pidr_users')
      .select('id')
      .eq('telegram_id', userId)
      .single();
    
    if (userError || !userData) {
      console.error('❌ [TRANSACTIONS API] Пользователь не найден по telegram_id:', userId, userError);
      return NextResponse.json({ 
        success: false, 
        message: 'Пользователь не найден' 
      }, { status: 404 });
    }
    
    const userIdBigInt = userData.id; // ✅ Это BIGINT из БД
    console.log(`✅ [TRANSACTIONS API] Найден user.id=${userIdBigInt} для telegram_id=${userId}`);

    let query = supabase
      .from('_pidr_coin_transactions')
      .select('*')
      .eq('user_id', userIdBigInt); // ✅ Используем BIGINT!

    // Фильтр по типу транзакции
    if (type) {
      query = query.eq('type', type);
    }

    const { data: transactions, error } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('❌ Ошибка получения транзакций:', error);
      return NextResponse.json({ 
        success: false, 
        message: 'Ошибка получения транзакций' 
      }, { status: 500 });
    }

    // Форматируем транзакции для фронтенда
    const formattedTransactions = (transactions || []).map((tx: any) => ({
      id: tx.id,
      type: tx.type,
      amount: tx.amount,
      cryptoAmount: tx.crypto_amount,
      cryptoCurrency: tx.crypto_currency,
      txHash: tx.tx_hash,
      address: tx.address,
      status: tx.status,
      description: tx.description,
      createdAt: tx.created_at,
      updatedAt: tx.updated_at
    }));

    console.log(`✅ Найдено ${formattedTransactions.length} транзакций`);

    return NextResponse.json({
      success: true,
      transactions: formattedTransactions,
      pagination: {
        limit,
        offset,
        total: formattedTransactions.length
      }
    });

  } catch (error: unknown) {
    console.error('❌ Transactions GET error:', error);
    return NextResponse.json({ 
      success: false, 
      message: 'Ошибка сервера' 
    }, { status: 500 });
  }
}

// POST /api/wallet/transactions - Создать новую транзакцию
export async function POST(req: NextRequest) {
  const userId = getUserIdFromRequest(req);
  if (!userId) {
    return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { 
      type, 
      amount, 
      cryptoAmount, 
      cryptoCurrency, 
      txHash, 
      address, 
      description 
    } = await req.json();

    if (!type || !amount) {
      return NextResponse.json({ 
        success: false, 
        message: 'Тип и сумма транзакции обязательны' 
      }, { status: 400 });
    }

    console.log(`💳 Создаем новую транзакцию для пользователя ${userId}: ${type}, ${amount} монет`);

    // Создаем транзакцию
    const { data: transaction, error: createError } = await supabase
      .from('_pidr_coin_transactions')
      .insert({
        user_id: userId,
        type,
        amount,
        crypto_amount: cryptoAmount || null,
        crypto_currency: cryptoCurrency || null,
        tx_hash: txHash || null,
        address: address || null,
        status: 'completed',
        description: description || `${type} транзакция`,
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (createError) {
      console.error('❌ Ошибка создания транзакции:', createError);
      return NextResponse.json({ 
        success: false, 
        message: 'Ошибка создания транзакции' 
      }, { status: 500 });
    }

    // Если это пополнение или выигрыш - обновляем баланс пользователя
    if (type === 'deposit' || type === 'game_win') {
      const { data: user, error: userError } = await supabase
        .from('_pidr_users')
        .select('coins')
        .eq('id', userId)
        .single();

      if (!userError && user) {
        const newBalance = (user.coins || 0) + amount;
        await supabase
          .from('_pidr_users')
          .update({ 
            coins: newBalance,
            updated_at: new Date().toISOString()
          })
          .eq('id', userId);

        console.log(`✅ Баланс обновлен: +${amount} монет, новый баланс: ${newBalance}`);
      }
    }

    // Если это вывод или проигрыш - уменьшаем баланс
    if (type === 'withdrawal' || type === 'game_loss' || type === 'purchase') {
      const { data: user, error: userError } = await supabase
        .from('_pidr_users')
        .select('coins')
        .eq('id', userId)
        .single();

      if (!userError && user) {
        const newBalance = Math.max((user.coins || 0) - amount, 0);
        await supabase
          .from('_pidr_users')
          .update({ 
            coins: newBalance,
            updated_at: new Date().toISOString()
          })
          .eq('id', userId);

        console.log(`✅ Баланс обновлен: -${amount} монет, новый баланс: ${newBalance}`);
      }
    }

    console.log(`✅ Транзакция создана: ${transaction.id}`);

    return NextResponse.json({
      success: true,
      transaction: {
        id: transaction.id,
        type: transaction.type,
        amount: transaction.amount,
        cryptoAmount: transaction.crypto_amount,
        cryptoCurrency: transaction.crypto_currency,
        txHash: transaction.tx_hash,
        address: transaction.address,
        status: transaction.status,
        description: transaction.description,
        createdAt: transaction.created_at
      }
    });

  } catch (error: unknown) {
    console.error('❌ Transactions POST error:', error);
    return NextResponse.json({ 
      success: false, 
      message: 'Ошибка сервера' 
    }, { status: 500 });
  }
}
