import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '../../../lib/supabase';
import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';

const JWT_SECRET = process.env.JWT_SECRET;
const SESSION_SECRET = process.env.SESSION_SECRET;

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
    console.log('🔐 Авторизация пользователя...');

    if (!JWT_SECRET) {
      return NextResponse.json({ 
        success: false, 
        message: 'Сервер не настроен' 
      }, { status: 500 });
    }

    const { telegramId, username, firstName, lastName, photoUrl } = await req.json();

    if (!telegramId || !username) {
      return NextResponse.json({ 
        success: false, 
        message: 'Недостаточно данных для авторизации' 
      }, { status: 400 });
    }

    console.log('👤 Авторизация пользователя:', { telegramId, username });

    // Ищем существующего пользователя
    let { data: existingUser, error: findError } = await supabase
      .from('_pidr_users')
      .select('*')
      .eq('telegram_id', telegramId)
      .single();

    let user = existingUser;

    if (!existingUser) {
      // Создаем нового пользователя
      console.log('👤 Создаем нового пользователя...');
      
      const { data: newUser, error: createError } = await supabase
        .from('_pidr_users')
        .insert([{
          telegram_id: telegramId,
          username: username,
          first_name: firstName || username,
          last_name: lastName || '',
          photo_url: photoUrl || null,
          coins: 1000, // Стартовые монеты
          rating: 0,
          games_played: 0,
          games_won: 0,
          status: 'online',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }])
        .select()
        .single();

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
          photo_url: photoUrl || existingUser.photo_url,
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

    // Устанавливаем HTTP-only cookie
    response.cookies.set('auth_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60 // 30 дней
    });

    console.log('✅ JWT токен создан и установлен в cookie');

    return response;

  } catch (error: any) {
    console.error('❌ Ошибка авторизации:', error);
    return NextResponse.json({ 
      success: false, 
      message: 'Ошибка сервера' 
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
