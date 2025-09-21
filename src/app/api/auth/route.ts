import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '../../../lib/supabase';
import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';

const JWT_SECRET = process.env.JWT_SECRET;
const SESSION_SECRET = process.env.SESSION_SECRET;
const NEXTAUTH_URL = process.env.NEXTAUTH_URL || process.env.VERCEL_URL;

// GET /api/auth - Проверка активной сессии
export async function GET(req: NextRequest) {
  try {
    console.log('🔍 Проверка активной сессии пользователя...');

    if (!JWT_SECRET) {
      console.error('❌ JWT_SECRET не настроен');
      return NextResponse.json({ 
        success: false, 
        message: 'Сервер не настроен' 
      }, { status: 500 });
    }

    // Проверяем JWT токен в cookies
    const cookieStore = cookies();
    const token = cookieStore.get('auth_token')?.value;
    
    console.log('🍪 Cookies проверка:', {
      hasCookies: !!cookieStore,
      hasAuthToken: !!token,
      cookieKeys: Array.from(cookieStore).map(([key]) => key)
    });

    if (!token) {
      console.log('❌ JWT токен не найден в cookies');
      return NextResponse.json({ 
        success: false, 
        message: 'Не авторизован' 
      }, { status: 401 });
    }

    // Верифицируем JWT токен
    let userId: string;
    try {
      const payload = jwt.verify(token, JWT_SECRET) as any;
      userId = payload.userId;
      console.log('✅ JWT токен валиден, userId:', userId);
    } catch (jwtError) {
      console.error('❌ Невалидный JWT токен:', jwtError);
      return NextResponse.json({ 
        success: false, 
        message: 'Невалидный токен' 
      }, { status: 401 });
    }

    // Получаем данные пользователя из БД
    const { data: user, error } = await supabase
      .from('_pidr_users')
      .select('*')
      .eq('id', userId)
      .single();

    if (error || !user) {
      console.error('❌ Пользователь не найден в БД:', error);
      return NextResponse.json({ 
        success: false, 
        message: 'Пользователь не найден' 
      }, { status: 404 });
    }

    // Обновляем время последней активности
    await supabase
      .from('_pidr_users')
      .update({ 
        last_seen: new Date().toISOString(),
        status: 'online'
      })
      .eq('id', userId);

    console.log('✅ Активная сессия найдена:', user.username);

    return NextResponse.json({
      success: true,
      message: 'Сессия активна',
      user: {
        id: user.id,
        username: user.username,
        firstName: user.first_name,
        lastName: user.last_name,
        telegramId: user.telegram_id,
        coins: user.coins,
        rating: user.rating,
        gamesPlayed: user.games_played,
        gamesWon: user.games_won,
        status: user.status
      }
    });

  } catch (error: any) {
    console.error('❌ Ошибка проверки сессии:', error);
    return NextResponse.json({ 
      success: false, 
      message: 'Ошибка сервера' 
    }, { status: 500 });
  }
}

// POST /api/auth - Авторизация пользователя
export async function POST(req: NextRequest) {
  try {
    console.log('🔐 POST /api/auth - Авторизация пользователя...');
    
    // Проверяем переменные окружения
    console.log('🔍 Проверка переменных окружения:');
    console.log('- JWT_SECRET:', !!JWT_SECRET ? 'ЕСТЬ' : '❌ НЕТ');
    console.log('- SESSION_SECRET:', !!SESSION_SECRET ? 'ЕСТЬ' : '❌ НЕТ');
    console.log('- SUPABASE_URL:', process.env.SUPABASE_URL ? 'ЕСТЬ' : '❌ НЕТ');
    console.log('- SUPABASE_ANON_KEY:', process.env.SUPABASE_ANON_KEY ? 'ЕСТЬ' : '❌ НЕТ');

    if (!JWT_SECRET) {
      console.error('❌ JWT_SECRET не настроен');
      return NextResponse.json({ 
        success: false, 
        message: 'JWT_SECRET не настроен на сервере' 
      }, { status: 500 });
    }

    if (!SESSION_SECRET) {
      console.error('❌ SESSION_SECRET не настроен');
      return NextResponse.json({ 
        success: false, 
        message: 'SESSION_SECRET не настроен на сервере' 
      }, { status: 500 });
    }

    const requestBody = await req.json();
    console.log('📥 Получены данные:', requestBody);
    
    const { telegramId, username, firstName, lastName, photoUrl } = requestBody;

    if (!telegramId || !username) {
      return NextResponse.json({ 
        success: false, 
        message: 'Недостаточно данных для авторизации' 
      }, { status: 400 });
    }

    console.log('👤 Авторизация пользователя:', { telegramId, username });

    // Ищем существующего пользователя
    console.log('🔍 Ищем пользователя в БД по telegram_id:', telegramId);
    let { data: existingUser, error: findError } = await supabase
      .from('_pidr_users')
      .select('*')
      .eq('telegram_id', telegramId)
      .single();
      
    console.log('📊 Результат поиска пользователя:', { user: !!existingUser, error: findError?.message });

    let user = existingUser;

    if (!existingUser) {
      // Создаем нового пользователя
      console.log('👤 Создаем нового пользователя...');
      
      const newUserData = {
        telegram_id: telegramId,
        username: username,
        first_name: firstName || username,
        last_name: lastName || '',
        avatar_url: photoUrl || null,
        coins: 1000, // Стартовые монеты
        rating: 0,
        games_played: 0,
        games_won: 0,
        status: 'online',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      console.log('💾 Создаем пользователя с данными:', newUserData);
      
      const { data: newUser, error: createError } = await supabase
        .from('_pidr_users')
        .insert([newUserData])
        .select()
        .single();
        
      console.log('✅ Результат создания пользователя:', { user: !!newUser, error: createError?.message });

      if (createError) {
        console.error('❌ Ошибка создания пользователя:', createError);
        return NextResponse.json({ 
          success: false, 
          message: 'Ошибка создания пользователя' 
        }, { status: 500 });
      }

      user = newUser;
      console.log('✅ Новый пользователь создан:', user.username);
    } else {
      // Обновляем данные существующего пользователя
      console.log('👤 Обновляем данные существующего пользователя...');
      
      const { data: updatedUser, error: updateError } = await supabase
        .from('_pidr_users')
        .update({
          username: username,
          first_name: firstName || existingUser.first_name,
          last_name: lastName || existingUser.last_name,
          avatar_url: photoUrl || existingUser.avatar_url,
          last_seen: new Date().toISOString(),
          status: 'online',
          updated_at: new Date().toISOString()
        })
        .eq('id', existingUser.id)
        .select()
        .single();

      if (updateError) {
        console.error('❌ Ошибка обновления пользователя:', updateError);
        // Продолжаем с существующими данными
        user = existingUser;
      } else {
        user = updatedUser;
      }

      console.log('✅ Пользователь обновлен:', user.username);
    }

    // Создаем JWT токен
    const token = jwt.sign(
      { 
        userId: user.id,
        telegramId: user.telegram_id,
        username: user.username
      },
      JWT_SECRET,
      { expiresIn: '30d' } // Токен действует 30 дней
    );

    // Устанавливаем cookie с токеном
    const response = NextResponse.json({
      success: true,
      message: 'Авторизация успешна',
      token,
      user: {
        id: user.id,
        username: user.username,
        firstName: user.first_name,
        lastName: user.last_name,
        telegramId: user.telegram_id,
        coins: user.coins,
        rating: user.rating,
        gamesPlayed: user.games_played,
        gamesWon: user.games_won,
        status: user.status
      }
    });

    // Устанавливаем HTTP-only cookie с правильными настройками для Vercel
    response.cookies.set('auth_token', token, {
      httpOnly: true,
      secure: true, // Всегда true для HTTPS
      sameSite: 'none', // Для Telegram WebApp нужно 'none'
      path: '/',
      maxAge: 30 * 24 * 60 * 60, // 30 дней
      domain: process.env.NODE_ENV === 'production' ? undefined : undefined // Автоопределение домена
    });

    console.log('✅ JWT токен создан и установлен в cookie');
    console.log('🔑 Токен (первые 50 символов):', token.substring(0, 50) + '...');
    console.log('🍪 Cookie настройки:', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60
    });

    return response;

  } catch (error: any) {
    console.error('❌ КРИТИЧЕСКАЯ ОШИБКА API авторизации:');
    console.error('- Тип ошибки:', typeof error);
    console.error('- Сообщение:', error?.message);
    console.error('- Стек:', error?.stack);
    console.error('- Полный объект:', error);
    
    return NextResponse.json({ 
      success: false, 
      message: `Внутренняя ошибка сервера: ${error?.message || 'Неизвестная ошибка'}` 
    }, { status: 500 });
  }
}

// DELETE /api/auth - Выход из системы
export async function DELETE(req: NextRequest) {
  try {
    console.log('👋 Выход из системы...');

    const response = NextResponse.json({
      success: true,
      message: 'Выход выполнен успешно'
    });

    // Удаляем cookie с токеном
    response.cookies.set('auth_token', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 0 // Удаляем cookie
    });

    return response;

  } catch (error: any) {
    console.error('❌ Ошибка выхода:', error);
    return NextResponse.json({ 
      success: false, 
      message: 'Ошибка сервера' 
    }, { status: 500 });
  }
}
