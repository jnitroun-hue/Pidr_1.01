import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '../../../../lib/supabase';
import jwt from 'jsonwebtoken';

import { getJwtSecret } from '@/lib/auth/jwt-secret';

function getUserIdFromRequest(req: NextRequest): string | null {
  const JWT_SECRET = getJwtSecret();
  if (!JWT_SECRET) return null;
  
  const token = req.cookies.get('auth_token')?.value;
  if (!token) return null;
  
  try {
    const payload = jwt.verify(token, JWT_SECRET) as any;
    return payload.userId;
  } catch {
    return null;
  }
}

// POST /api/shop/add-coins - Добавить монеты после криптоплатежа
export async function POST(req: NextRequest) {
  const userId = getUserIdFromRequest(req);
  if (!userId) {
    return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { amount, cryptoCurrency, cryptoAmount, transactionHash, packageName } = await req.json();

    if (!amount || amount <= 0) {
      return NextResponse.json({ 
        success: false, 
        message: 'Некорректная сумма' 
      }, { status: 400 });
    }

    console.log(`💰 Добавление ${amount} монет пользователю ${userId} за ${cryptoAmount} ${cryptoCurrency}`);

    // Получаем текущий баланс пользователя
    const { data: user, error: userError } = await supabase
      .from('_pidr_users')
      .select('id, coins')
      .eq('id', userId)
      .single();

    if (userError || !user) {
      console.error('❌ Пользователь не найден:', userError);
      return NextResponse.json({ 
        success: false, 
        message: 'Пользователь не найден' 
      }, { status: 404 });
    }

    const newBalance = user.coins + amount;

    // Обновляем баланс пользователя
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

    // Создаем запись о транзакции
    const transactionDescription = `Покупка монет: ${packageName || 'Пакет монет'} за ${cryptoAmount} ${cryptoCurrency}`;
    
    const { error: transactionError } = await supabase
      .from('_pidr_coin_transactions')
      .insert({
        user_id: userId,
        amount: amount,
        transaction_type: 'crypto_purchase',
        description: transactionDescription,
        balance_before: user.coins,
        balance_after: newBalance,
        created_at: new Date().toISOString()
      });

    if (transactionError) {
      console.warn('⚠️ Ошибка создания записи транзакции:', transactionError);
      // Не критично, продолжаем
    }

    // Можно также сохранить детали криптоплатежа в отдельную таблицу
    // Пока просто логируем
    console.log(`💎 Криптоплатеж: ${cryptoAmount} ${cryptoCurrency} -> ${amount} монет`);
    if (transactionHash) {
      console.log(`🔗 Transaction hash: ${transactionHash}`);
    }

    console.log(`✅ Монеты добавлены. Новый баланс: ${newBalance}`);

    return NextResponse.json({ 
      success: true, 
      message: 'Монеты успешно добавлены',
      coinsAdded: amount,
      newBalance: newBalance,
      cryptoPayment: {
        currency: cryptoCurrency,
        amount: cryptoAmount,
        transactionHash: transactionHash
      }
    });

  } catch (error: any) {
    console.error('❌ Add coins error:', error);
    return NextResponse.json({ 
      success: false, 
      message: 'Ошибка сервера' 
    }, { status: 500 });
  }
}
