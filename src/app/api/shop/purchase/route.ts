import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '../../../../lib/supabase';
import { requireAuth } from '../../../../lib/auth-utils';

// POST /api/shop/purchase - Купить товар в магазине
export async function POST(req: NextRequest) {
  console.log('🛒 POST /api/shop/purchase - Покупка товара...');
  
  try {
    const userId = await requireAuth(req);
    console.log(`✅ Авторизован пользователь: ${userId}`);
    
    const body = await req.json();
    const { item_id, item_type, item_name, price, metadata = {} } = body;
    
    if (!item_id || !item_type || !item_name || !price) {
      return NextResponse.json({ 
        success: false, 
        message: 'Не все поля заполнены' 
      }, { status: 400 });
    }
    
    console.log(`🛒 Покупка: ${item_name} (${item_type}) за ${price} монет`);
    
    // Вызываем функцию БД для покупки
    const { data, error } = await supabase.rpc('buy_shop_item', {
      p_user_id: userId,
      p_item_id: item_id,
      p_item_type: item_type,
      p_item_name: item_name,
      p_price: price,
      p_metadata: metadata
    });
    
    if (error) {
      console.error('❌ Ошибка покупки:', error);
      return NextResponse.json({ 
        success: false, 
        message: 'Ошибка покупки' 
      }, { status: 500 });
    }
    
    // Проверяем результат из функции
    if (data && typeof data === 'object') {
      if (data.success === false) {
        console.log(`⚠️ Покупка отклонена: ${data.message}`);
        return NextResponse.json(data, { status: 400 });
      }
      
      console.log(`✅ Покупка успешна! Новый баланс: ${data.new_balance}`);
      return NextResponse.json(data);
    }
    
    return NextResponse.json({ 
      success: true,
      message: 'Покупка успешна'
    });
    
  } catch (error: any) {
    console.error('❌ Ошибка покупки:', error);
    return NextResponse.json({ 
      success: false, 
      message: `Ошибка: ${error?.message || 'Неизвестная ошибка'}` 
    }, { status: 500 });
  }
}
