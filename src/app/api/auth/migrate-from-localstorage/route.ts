import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '../../../../lib/supabase';

export async function POST(req: NextRequest) {
  try {
    const { action, userData } = await req.json();
    
    if (action !== 'migrate_user_data' || !userData) {
      return NextResponse.json({
        success: false,
        message: 'Неверные параметры запроса'
      }, { status: 400 });
    }

    console.log('🔄 Миграция данных пользователя из localStorage:', userData);

    // Проверяем, существует ли уже пользователь в БД
    let existingUser = null;
    
    if (userData.telegram_id) {
      const { data } = await supabase
        .from('_pidr_users')
        .select('*')
        .eq('telegram_id', userData.telegram_id)
        .single();
      
      existingUser = data;
    }

    if (existingUser) {
      // Пользователь уже существует, обновляем только если данные из localStorage новее
      console.log('👤 Пользователь найден в БД, обновляем данные...');
      
      const updateData: any = {};
      
      // Обновляем только если значения больше текущих (для избежания потери прогресса)
      if (userData.coins && userData.coins > (existingUser.coins || 0)) {
        updateData.coins = userData.coins;
      }
      if (userData.rating && userData.rating > (existingUser.rating || 0)) {
        updateData.rating = userData.rating;
      }
      if (userData.games_played && userData.games_played > (existingUser.games_played || 0)) {
        updateData.games_played = userData.games_played;
      }
      if (userData.games_won && userData.games_won > (existingUser.games_won || 0)) {
        updateData.games_won = userData.games_won;
      }

      if (Object.keys(updateData).length > 0) {
        updateData.updated_at = new Date().toISOString();
        
        const { error: updateError } = await supabase
          .from('_pidr_users')
          .update(updateData)
          .eq('id', existingUser.id);

        if (updateError) {
          console.error('❌ Ошибка обновления пользователя:', updateError);
          return NextResponse.json({
            success: false,
            message: 'Ошибка обновления данных пользователя'
          }, { status: 500 });
        }

        console.log('✅ Данные пользователя обновлены из localStorage');
      } else {
        console.log('ℹ️ Данные в БД актуальнее, обновление не требуется');
      }

      return NextResponse.json({
        success: true,
        message: 'Данные пользователя синхронизированы',
        user: existingUser,
        updated: Object.keys(updateData).length > 0
      });

    } else {
      // Создаем нового пользователя на основе данных из localStorage
      console.log('👤 Создаем нового пользователя из данных localStorage...');
      
      const newUserData = {
        telegram_id: userData.telegram_id || null,
        username: userData.username || 'migrated_user',
        first_name: userData.first_name || null,
        last_name: userData.last_name || null,
        coins: userData.coins || 1000,
        rating: userData.rating || 0,
        games_played: userData.games_played || 0,
        games_won: userData.games_won || 0,
        status: 'online',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const { data: newUser, error: createError } = await supabase
        .from('_pidr_users')
        .insert([newUserData])
        .select()
        .single();

      if (createError) {
        console.error('❌ Ошибка создания пользователя:', createError);
        return NextResponse.json({
          success: false,
          message: 'Ошибка создания пользователя в БД'
        }, { status: 500 });
      }

      console.log('✅ Новый пользователь создан из данных localStorage');

      return NextResponse.json({
        success: true,
        message: 'Пользователь создан из данных localStorage',
        user: newUser,
        created: true
      });
    }

  } catch (error: any) {
    console.error('❌ Ошибка миграции из localStorage:', error);
    return NextResponse.json({
      success: false,
      message: 'Ошибка сервера при миграции данных'
    }, { status: 500 });
  }
}
