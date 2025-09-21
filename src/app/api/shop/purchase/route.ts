import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '../../../../lib/supabase';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET;

function getUserIdFromRequest(req: NextRequest): string | null {
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

// POST /api/shop/purchase - Покупка предмета в магазине
export async function POST(req: NextRequest) {
  const userId = getUserIdFromRequest(req);
  if (!userId) {
    return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { itemId, price } = await req.json();

    if (!itemId || !price || price <= 0) {
      return NextResponse.json({ 
        success: false, 
        message: 'Некорректные данные покупки' 
      }, { status: 400 });
    }

    console.log(`🛒 Покупка предмета ${itemId} за ${price} монет пользователем ${userId}`);

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

    // Проверяем, достаточно ли монет
    if (user.coins < price) {
      return NextResponse.json({ 
        success: false, 
        message: 'Недостаточно монет' 
      }, { status: 400 });
    }

    const newBalance = user.coins - price;

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
    const { error: transactionError } = await supabase
      .from('_pidr_coin_transactions')
      .insert({
        user_id: userId,
        amount: -price,
        transaction_type: 'shop_purchase',
        description: `Покупка предмета: ${itemId}`,
        balance_before: user.coins,
        balance_after: newBalance,
        created_at: new Date().toISOString()
      });

    if (transactionError) {
      console.warn('⚠️ Ошибка создания записи транзакции:', transactionError);
      // Не критично, продолжаем
    }

    console.log(`✅ Покупка успешна. Новый баланс: ${newBalance}`);

    return NextResponse.json({ 
      success: true, 
      message: 'Покупка успешна',
      itemId: itemId,
      price: price,
      newBalance: newBalance
    });

  } catch (error: any) {
    console.error('❌ Shop purchase error:', error);
    return NextResponse.json({ 
      success: false, 
      message: 'Ошибка сервера' 
    }, { status: 500 });
  }
}

// GET /api/shop/purchase - Получить историю покупок
export async function GET(req: NextRequest) {
  const userId = getUserIdFromRequest(req);
  if (!userId) {
    return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
  }

  try {
    console.log(`📜 Получаем историю покупок для пользователя ${userId}`);

    const { data: purchases, error } = await supabase
      .from('_pidr_coin_transactions')
      .select('*')
      .eq('user_id', userId)
      .eq('transaction_type', 'shop_purchase')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ Ошибка получения истории покупок:', error);
      return NextResponse.json({ 
        success: false, 
        message: 'Ошибка получения истории' 
      }, { status: 500 });
    }

    const formattedPurchases = (purchases || []).map((purchase: any) => ({
      id: purchase.id,
      itemId: purchase.description.replace('Покупка предмета: ', ''),
      price: Math.abs(purchase.amount),
      date: purchase.created_at,
      balanceAfter: purchase.balance_after
    }));

    console.log(`✅ Найдено ${formattedPurchases.length} покупок`);

    return NextResponse.json({ 
      success: true, 
      purchases: formattedPurchases
    });

  } catch (error: any) {
    console.error('❌ Shop purchase history error:', error);
    return NextResponse.json({ 
      success: false, 
      message: 'Ошибка сервера' 
    }, { status: 500 });
  }
}
