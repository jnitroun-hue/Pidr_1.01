import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '../../../../lib/supabase';
import { requireAuth } from '../../../../lib/auth-utils';

// POST /api/shop/activate - Активировать купленный товар
export async function POST(req: NextRequest) {
  console.log('⚡ POST /api/shop/activate - Активация товара...');
  
  try {
    const userId = await requireAuth(req);
    console.log(`✅ Авторизован пользователь: ${userId}`);
    
    const body = await req.json();
    const { item_id, item_type } = body;
    
    if (!item_id || !item_type) {
      return NextResponse.json({ 
        success: false, 
        message: 'item_id и item_type обязательны' 
      }, { status: 400 });
    }
    
    console.log(`⚡ Активация: ${item_id} (${item_type})`);
    
    // Вызываем функцию БД для активации
    const { data, error } = await supabase.rpc('activate_shop_item', {
      p_user_id: userId,
      p_item_id: item_id,
      p_item_type: item_type
    });
    
    if (error) {
      console.error('❌ Ошибка активации:', error);
      return NextResponse.json({ 
        success: false, 
        message: 'Ошибка активации' 
      }, { status: 500 });
    }
    
    // Проверяем результат из функции
    if (data && typeof data === 'object') {
      if (data.success === false) {
        console.log(`⚠️ Активация отклонена: ${data.message}`);
        return NextResponse.json(data, { status: 400 });
      }
      
      console.log(`✅ Товар активирован!`);
      return NextResponse.json(data);
    }
    
    return NextResponse.json({ 
      success: true,
      message: 'Товар активирован'
    });
    
  } catch (error: any) {
    console.error('❌ Ошибка активации:', error);
    return NextResponse.json({ 
      success: false, 
      message: `Ошибка: ${error?.message || 'Неизвестная ошибка'}` 
    }, { status: 500 });
  }
}

