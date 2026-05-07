import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '../../../../lib/supabase';
import { requireAuth, getUserIdFromDatabase } from '../../../../lib/auth-utils';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function noStoreJson(body: any, init?: ResponseInit) {
  const response = NextResponse.json(body, init);
  response.headers.set('Cache-Control', 'private, no-store, no-cache, must-revalidate');
  response.headers.set('Pragma', 'no-cache');
  response.headers.set('Expires', '0');
  return response;
}

// GET /api/wallet/transactions - Получить транзакции пользователя
export async function GET(req: NextRequest) {
  const auth = requireAuth(req);
  if (auth.error || !auth.userId) {
    return noStoreJson({ success: false, message: 'Unauthorized' }, { status: 401 });
  }

  const db = getSupabaseAdmin();
  if (!db) {
    return noStoreJson({ success: false, message: 'База данных недоступна' }, { status: 503 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);
    const offset = Math.max(parseInt(searchParams.get('offset') || '0'), 0);
    const type = searchParams.get('type'); // deposit, withdrawal, purchase, game_win, game_loss

    const { dbUserId } = await getUserIdFromDatabase(auth.userId, auth.environment);
    if (!dbUserId) {
      console.error('❌ [TRANSACTIONS API] Пользователь не найден:', auth.userId, auth.environment);
      return noStoreJson({ 
        success: false, 
        message: 'Пользователь не найден' 
      }, { status: 404 });
    }
    
    const userIdBigInt = dbUserId;
    console.log(`✅ [TRANSACTIONS API] Найден user.id=${userIdBigInt}`);

    let query = db
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
      return noStoreJson({ 
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

    return noStoreJson({
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
    return noStoreJson({ 
      success: false, 
      message: 'Ошибка сервера' 
    }, { status: 500 });
  }
}

// POST /api/wallet/transactions - Создать новую транзакцию
export async function POST(req: NextRequest) {
  const auth = requireAuth(req);
  if (auth.error || !auth.userId) {
    return noStoreJson({ success: false, message: 'Unauthorized' }, { status: 401 });
  }

  const db = getSupabaseAdmin();
  if (!db) {
    return noStoreJson({ success: false, message: 'База данных недоступна' }, { status: 503 });
  }

  try {
    const { dbUserId } = await getUserIdFromDatabase(auth.userId, auth.environment);
    if (!dbUserId) {
      return noStoreJson({ success: false, message: 'Пользователь не найден' }, { status: 404 });
    }
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
      return noStoreJson({ 
        success: false, 
        message: 'Тип и сумма транзакции обязательны' 
      }, { status: 400 });
    }

    console.log(`💳 Создаем новую транзакцию для пользователя ${dbUserId}: ${type}, ${amount} монет`);

    // Создаем транзакцию
    const { data: transaction, error: createError } = await db
      .from('_pidr_coin_transactions')
      .insert({
        user_id: dbUserId,
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
      return noStoreJson({ 
        success: false, 
        message: 'Ошибка создания транзакции' 
      }, { status: 500 });
    }

    // Если это пополнение или выигрыш - обновляем баланс пользователя
    if (type === 'deposit' || type === 'game_win') {
      const { data: user, error: userError } = await db
        .from('_pidr_users')
        .select('coins')
        .eq('id', dbUserId)
        .single();

      if (!userError && user) {
        const newBalance = (user.coins || 0) + amount;
        await db
          .from('_pidr_users')
          .update({ 
            coins: newBalance,
            updated_at: new Date().toISOString()
          })
          .eq('id', dbUserId);

        console.log(`✅ Баланс обновлен: +${amount} монет, новый баланс: ${newBalance}`);
      }
    }

    // Если это вывод или проигрыш - уменьшаем баланс
    if (type === 'withdrawal' || type === 'game_loss' || type === 'purchase') {
      const { data: user, error: userError } = await db
        .from('_pidr_users')
        .select('coins')
        .eq('id', dbUserId)
        .single();

      if (!userError && user) {
        const newBalance = Math.max((user.coins || 0) - amount, 0);
        await db
          .from('_pidr_users')
          .update({ 
            coins: newBalance,
            updated_at: new Date().toISOString()
          })
          .eq('id', dbUserId);

        console.log(`✅ Баланс обновлен: -${amount} монет, новый баланс: ${newBalance}`);
      }
    }

    console.log(`✅ Транзакция создана: ${transaction.id}`);

    return noStoreJson({
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
    return noStoreJson({ 
      success: false, 
      message: 'Ошибка сервера' 
    }, { status: 500 });
  }
}
