import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const BOT_TOKEN = process.env.BOT_TOKEN || process.env.TELEGRAM_BOT_TOKEN!; // Работает с обеими переменными

export async function POST(request: NextRequest) {
  try {
    console.log('🔐 [Telegram Login] Начало авторизации');

    const body = await request.json();
    const { id, first_name, last_name, username, photo_url, auth_date, hash } = body;

    // 1. ПРОВЕРКА ПОДЛИННОСТИ (hash verification)
    if (!BOT_TOKEN) {
      console.error('❌ [Telegram Login] BOT_TOKEN не настроен');
      return NextResponse.json(
        { success: false, error: 'Сервер не настроен' },
        { status: 500 }
      );
    }

    // Создаем data-check-string (все поля кроме hash, отсортированные по алфавиту)
    const dataCheckArr: string[] = [];
    if (auth_date) dataCheckArr.push(`auth_date=${auth_date}`);
    if (first_name) dataCheckArr.push(`first_name=${first_name}`);
    if (id) dataCheckArr.push(`id=${id}`);
    if (last_name) dataCheckArr.push(`last_name=${last_name}`);
    if (photo_url) dataCheckArr.push(`photo_url=${photo_url}`);
    if (username) dataCheckArr.push(`username=${username}`);
    
    const dataCheckString = dataCheckArr.sort().join('\n');
    console.log('🔑 [Telegram Login] Data check string:', dataCheckString);

    // Вычисляем секретный ключ: SHA256(bot_token)
    const secretKey = crypto
      .createHash('sha256')
      .update(BOT_TOKEN)
      .digest();

    // Вычисляем HMAC-SHA256
    const computedHash = crypto
      .createHmac('sha256', secretKey)
      .update(dataCheckString)
      .digest('hex');

    console.log('🔑 [Telegram Login] Computed hash:', computedHash);
    console.log('🔑 [Telegram Login] Received hash:', hash);

    if (computedHash !== hash) {
      console.error('❌ [Telegram Login] Неверный hash! Возможная подделка данных.');
      return NextResponse.json(
        { success: false, error: 'Неверная подпись данных' },
        { status: 401 }
      );
    }

    console.log('✅ [Telegram Login] Hash проверен успешно');

    // 2. ПРОВЕРКА ВРЕМЕНИ (не старше 24 часов)
    const currentTime = Math.floor(Date.now() / 1000);
    const authTime = parseInt(auth_date);
    if (currentTime - authTime > 86400) {
      console.error('❌ [Telegram Login] Данные устарели');
      return NextResponse.json(
        { success: false, error: 'Данные авторизации устарели' },
        { status: 401 }
      );
    }

    // 3. СОЗДАНИЕ/ОБНОВЛЕНИЕ ПОЛЬЗОВАТЕЛЯ В БД
    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

    const { data: existingUser, error: fetchError } = await supabase
      .from('_pidr_users')
      .select('*')
      .eq('telegram_id', id.toString())
      .single();

    let user;

    if (existingUser) {
      // Обновляем существующего пользователя
      console.log('👤 [Telegram Login] Пользователь найден, обновляем данные');
      
      const { data: updatedUser, error: updateError } = await supabase
        .from('_pidr_users')
        .update({
          username: username || existingUser.username,
          first_name: first_name || existingUser.first_name,
          last_name: last_name || existingUser.last_name,
          avatar_url: photo_url || existingUser.avatar_url,
          last_login: new Date().toISOString()
        })
        .eq('telegram_id', id.toString())
        .select()
        .single();

      if (updateError) {
        console.error('❌ [Telegram Login] Ошибка обновления пользователя:', updateError);
        return NextResponse.json(
          { success: false, error: 'Ошибка обновления данных' },
          { status: 500 }
        );
      }

      user = updatedUser;
    } else {
      // Создаем нового пользователя
      console.log('👤 [Telegram Login] Новый пользователь, создаем запись');

      const { data: newUser, error: insertError } = await supabase
        .from('_pidr_users')
        .insert({
          telegram_id: id.toString(),
          username: username || `user_${id}`,
          first_name: first_name || '',
          last_name: last_name || '',
          avatar_url: photo_url || '',
          coins: 1000, // Стартовый бонус
          rating: 1000,
          games_played: 0,
          wins: 0,
          losses: 0,
          last_login: new Date().toISOString(),
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (insertError) {
        console.error('❌ [Telegram Login] Ошибка создания пользователя:', insertError);
        return NextResponse.json(
          { success: false, error: 'Ошибка создания пользователя' },
          { status: 500 }
        );
      }

      user = newUser;
      console.log('✅ [Telegram Login] Пользователь создан с бонусом 1000 монет!');
    }

    // 4. СОЗДАНИЕ СЕССИИ (HTTP-only cookie)
    const sessionData = {
      userId: user.id,
      telegramId: user.telegram_id,
      username: user.username,
      firstName: user.first_name,
      lastName: user.last_name,
      photoUrl: user.avatar_url
    };

    const sessionJson = JSON.stringify(sessionData);
    
    console.log('🍪 [Telegram Login] Устанавливаем cookies...');
    console.log('🍪 [Telegram Login] Session data:', sessionData);

    console.log('✅ [Telegram Login] Сессия создана:', user.username);

    const response = NextResponse.json({
      success: true,
      message: 'Авторизация успешна',
      user: {
        id: user.id,
        username: user.username,
        firstName: user.first_name,
        coins: user.coins
      }
    });

    // Устанавливаем pidr_session cookie
    response.cookies.set('pidr_session', sessionJson, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax', // Изменено с 'none' на 'lax' для лучшей совместимости
      maxAge: 60 * 60 * 24 * 30,
      path: '/'
    });

    // ТАКЖЕ устанавливаем auth_token (JWT) для совместимости с /api/auth
    const JWT_SECRET = process.env.JWT_SECRET || process.env.SESSION_SECRET;
    if (JWT_SECRET) {
      const token = jwt.sign(
        { 
          userId: user.id,
          telegramId: user.telegram_id,
          username: user.username
        },
        JWT_SECRET,
        { expiresIn: '30d' }
      );

      response.cookies.set('auth_token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax', // Изменено с 'none' на 'lax' для лучшей совместимости
        maxAge: 60 * 60 * 24 * 30,
        path: '/'
      });

      console.log('✅ [Telegram Login] Cookies установлены: pidr_session + auth_token');
    } else {
      console.log('✅ [Telegram Login] Cookie pidr_session установлена');
    }

    return response;

  } catch (error: any) {
    console.error('❌ [Telegram Login] Ошибка:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Ошибка сервера' },
      { status: 500 }
    );
  }
}

