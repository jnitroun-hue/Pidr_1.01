import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '../../../../lib/supabase';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET;

function getUserIdFromRequest(req: NextRequest): string | null {
  if (!JWT_SECRET) return null;
  const auth = req.headers.get('authorization');
  if (!auth) return null;
  const token = auth.replace('Bearer ', '');
  try {
    const payload = jwt.verify(token, JWT_SECRET) as any;
    return payload.userId;
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

    console.log(`📊 Получаем транзакции для пользователя ${userId}, лимит: ${limit}, смещение: ${offset}`);

    let query = supabase
      .from('_pidr_coin_transactions')
      .select('*')
      .eq('user_id', userId);

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

  } catch (error) {
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

  } catch (error) {
    console.error('❌ Transactions POST error:', error);
    return NextResponse.json({ 
      success: false, 
      message: 'Ошибка сервера' 
    }, { status: 500 });
  }
}
