import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '../../../../lib/supabase';
import { getSessionFromRequest } from '@/lib/auth/session-utils';

// GET /api/shop/inventory - Получить инвентарь пользователя
export async function GET(req: NextRequest) {
  console.log('📦 GET /api/shop/inventory - Получение инвентаря...');
  
  try {
    // Проверяем аутентификацию - БЕЗ cookies, только из localStorage через headers
    const telegramIdHeader = req.headers.get('x-telegram-id');
    const usernameHeader = req.headers.get('x-username');
    
    if (!telegramIdHeader) {
      console.error('❌ [Shop Inventory] Не найден x-telegram-id header');
      return NextResponse.json({ 
        success: false, 
        message: 'Требуется авторизация' 
      }, { status: 401 });
    }
    
    const userId = telegramIdHeader;
    console.log(`✅ [Shop Inventory] Авторизован пользователь через headers: ${userId}`);
    
    // Вызываем функцию БД для получения инвентаря
    const { data, error } = await supabase.rpc('_pidr_get_user_inventory', {
      p_user_id: userId
    });
    
    if (error) {
      console.error('❌ Ошибка получения инвентаря:', error);
      return NextResponse.json({ 
        success: false, 
        message: 'Ошибка получения инвентаря' 
      }, { status: 500 });
    }
    
    console.log(`✅ Инвентарь загружен для пользователя ${userId}`);
    
    return NextResponse.json({ 
      success: true,
      data: data || {
        skins: [],
        effects: [],
        frames: [],
        boosters: [],
        active_settings: null
      }
    });
    
  } catch (error: any) {
    console.error('❌ Ошибка получения инвентаря:', error);
    return NextResponse.json({ 
      success: false, 
      message: `Ошибка: ${error?.message || 'Неизвестная ошибка'}` 
    }, { status: 500 });
  }
}

