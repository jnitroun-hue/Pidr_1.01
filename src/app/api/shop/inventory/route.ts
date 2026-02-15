import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '../../../../lib/supabase';
import { requireAuth, getUserIdFromDatabase } from '@/lib/auth-utils';

// GET /api/shop/inventory - Получить инвентарь пользователя
export async function GET(req: NextRequest) {
  console.log('📦 GET /api/shop/inventory - Получение инвентаря...');
  
  try {
    // ✅ УНИВЕРСАЛЬНО: Используем универсальную авторизацию
    const auth = requireAuth(req);

    if (auth.error || !auth.userId) {
      console.error('❌ [Shop Inventory] Ошибка авторизации:', auth.error);
      return NextResponse.json({ 
        success: false, 
        message: auth.error || 'Требуется авторизация' 
      }, { status: 401 });
    }

    const { userId, environment } = auth;
    const { dbUserId } = await getUserIdFromDatabase(userId, environment);

    if (!dbUserId) {
      console.error('❌ [Shop Inventory] Пользователь не найден в БД');
      return NextResponse.json({ 
        success: false, 
        message: 'Пользователь не найден' 
      }, { status: 404 });
    }
    
    console.log(`✅ [Shop Inventory] Авторизован пользователь: ${userId} (${environment}), dbUserId: ${dbUserId}`);
    
    // ✅ ВРЕМЕННОЕ РЕШЕНИЕ: Возвращаем пустой инвентарь (пока нет таблицы инвентаря)
    console.log(`✅ Инвентарь загружен для пользователя ${userId}`);
    
    return NextResponse.json({ 
      success: true,
      data: {
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

