import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '../../../lib/supabase';
import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';
import { lightCleanup } from '../../../lib/auto-cleanup';
import crypto from 'crypto';

const JWT_SECRET = process.env.JWT_SECRET;
const SESSION_SECRET = process.env.SESSION_SECRET;
const NEXTAUTH_URL = process.env.NEXTAUTH_URL || process.env.VERCEL_URL;

// GET /api/auth - Проверка активной сессии
export async function GET(req: NextRequest) {
  try {
    // ✅ ОЧИСТКА НЕАКТИВНЫХ ПОЛЬЗОВАТЕЛЕЙ (не блокирует запрос)
    lightCleanup().catch(err => console.error('❌ Ошибка автоочистки:', err));
    
    console.log('🔍 [GET /api/auth] Проверка активной сессии пользователя...');
    console.log('📋 [GET /api/auth] Headers:', {
      'x-telegram-id': req.headers.get('x-telegram-id'),
      'x-username': req.headers.get('x-username'),
      'user-agent': req.headers.get('user-agent')?.substring(0, 50)
    });

    if (!JWT_SECRET) {
      console.error('❌ JWT_SECRET не настроен');
      return NextResponse.json({ 
        success: false, 
        message: 'Сервер не настроен' 
      }, { status: 500 });
    }

    // Проверяем JWT токен в cookies
    const cookieStore = await cookies();
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
    let telegramIdFromToken: string | null = null;
    let deviceFingerprintFromToken: string | null = null;
    try {
      const payload = jwt.verify(token, JWT_SECRET) as any;
      userId = payload.userId;
      telegramIdFromToken = payload.telegramId || null;
      deviceFingerprintFromToken = payload.deviceFingerprint || null;
      console.log('✅ JWT токен валиден, userId:', userId, 'telegramId:', telegramIdFromToken, 'device:', deviceFingerprintFromToken);
    } catch (jwtError) {
      console.error('❌ Невалидный JWT токен:', jwtError);
      return NextResponse.json({ 
        success: false, 
        message: 'Невалидный токен' 
      }, { status: 401 });
    }

    // ✅ КРИТИЧЕСКАЯ ПРОВЕРКА БЕЗОПАСНОСТИ: x-telegram-id header ОБЯЗАТЕЛЕН!
    const telegramIdHeader = req.headers.get('x-telegram-id');
    
    if (!telegramIdHeader) {
      console.error('🚨 КРИТИЧЕСКАЯ ОШИБКА БЕЗОПАСНОСТИ: x-telegram-id header отсутствует!');
      return NextResponse.json({ 
        success: false, 
        message: 'Требуется x-telegram-id header для безопасности. Доступ запрещен.' 
      }, { status: 403 });
    }

    // Получаем данные пользователя из БД для проверки telegram_id
    const { data: userForCheck, error: userCheckError } = await supabase
      .from('_pidr_users')
      .select('telegram_id')
      .eq('id', userId)
      .single();

    if (userCheckError || !userForCheck) {
      console.error('❌ Пользователь не найден в БД для проверки:', userCheckError);
      return NextResponse.json({ 
        success: false, 
        message: 'Пользователь не найден' 
      }, { status: 404 });
    }

    // ✅ КРИТИЧНО: Проверяем что telegram_id из БД совпадает с header
    const dbTelegramId = String(userForCheck.telegram_id || '');
    const headerTelegramId = String(telegramIdHeader);
    
    if (dbTelegramId !== headerTelegramId) {
      console.error('🚨 КРИТИЧЕСКАЯ ОШИБКА БЕЗОПАСНОСТИ: x-telegram-id не совпадает с токеном!', {
        userId,
        dbTelegramId,
        headerTelegramId,
        tokenTelegramId: telegramIdFromToken,
        action: 'БЛОКИРУЕМ ДОСТУП И УДАЛЯЕМ НЕВЕРНЫЙ ТОКЕН'
      });
      
      // ✅ УДАЛЯЕМ НЕВЕРНЫЙ ТОКЕН ИЗ COOKIE
      const errorResponse = NextResponse.json({ 
        success: false, 
        message: 'Несоответствие токена и Telegram ID. Доступ запрещен. Пожалуйста, перезайдите.' 
      }, { status: 403 });
      
      // Удаляем неверный токен
      errorResponse.cookies.set('auth_token', '', {
        httpOnly: true,
        secure: true,
        sameSite: 'none',
        path: '/',
        maxAge: 0
      });
      
      return errorResponse;
    }
    
    console.log('✅ Безопасность: x-telegram-id совпадает с токеном', {
      userId,
      telegramId: dbTelegramId
    });

    // ✅ ПРОВЕРКА УСТРОЙСТВА: Проверяем device fingerprint (мягкая проверка)
    // ⚠️ ВАЖНО: Не блокируем если fingerprint отсутствует - это нормально для разных браузеров
    const userAgent = req.headers.get('user-agent') || '';
    const headerDeviceFingerprint = req.headers.get('x-device-fingerprint');
    
    if (deviceFingerprintFromToken && headerDeviceFingerprint) {
      // Только если оба fingerprint присутствуют - проверяем совпадение
      if (deviceFingerprintFromToken !== headerDeviceFingerprint) {
        console.warn('⚠️ Device fingerprint не совпадает, но разрешаем доступ (разные браузеры нормальны)', {
          userId,
          tokenDevice: deviceFingerprintFromToken.substring(0, 8),
          headerDevice: headerDeviceFingerprint.substring(0, 8),
          userAgent: userAgent.substring(0, 50)
        });
        // ✅ НЕ БЛОКИРУЕМ: Разные браузеры/устройства - это нормально
      } else {
        console.log('✅ Device fingerprint совпадает');
      }
    } else {
      console.log('ℹ️ Device fingerprint не проверяется (отсутствует в токене или header)');
    }

    // Получаем данные пользователя из БД
    console.log('🔍 [GET /api/auth] Запрашиваем пользователя с userId:', userId, 'telegramId из токена:', telegramIdFromToken);
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

    // ✅ КРИТИЧНО: Финальная проверка - убеждаемся что возвращаем правильного пользователя
    const finalTelegramId = String(user.telegram_id || '');
    const finalHeaderTelegramId = String(telegramIdHeader || '');
    
    console.log('👤 [GET /api/auth] Финальная проверка пользователя:', {
      userId: user.id,
      username: user.username,
      dbTelegramId: finalTelegramId,
      headerTelegramId: finalHeaderTelegramId,
      tokenTelegramId: telegramIdFromToken,
      match: finalTelegramId === finalHeaderTelegramId
    });

    // ✅ КРИТИЧНО: Если telegram_id не совпадает - БЛОКИРУЕМ
    if (finalTelegramId !== finalHeaderTelegramId) {
      console.error('🚨 КРИТИЧЕСКАЯ ОШИБКА: telegram_id пользователя не совпадает с header!', {
        userId: user.id,
        userTelegramId: finalTelegramId,
        headerTelegramId: finalHeaderTelegramId,
        action: 'БЛОКИРУЕМ ДОСТУП'
      });
      
      const errorResponse = NextResponse.json({ 
        success: false, 
        message: 'Несоответствие данных пользователя. Доступ запрещен. Пожалуйста, перезайдите.' 
      }, { status: 403 });
      
      // Удаляем неверный токен
      errorResponse.cookies.set('auth_token', '', {
        httpOnly: true,
        secure: true,
        sameSite: 'none',
        path: '/',
        maxAge: 0
      });
      
      return errorResponse;
    }
    
    console.log('✅ [GET /api/auth] Все проверки пройдены, возвращаем данные пользователя:', user.username);

    // ✅ ИСПРАВЛЕНО: Обновляем только last_seen, НЕ меняем статус на 'online'
    // Статус должен устанавливаться только через heartbeat или при реальной авторизации
    const moscowTime = new Date().toLocaleString('en-CA', { 
      timeZone: 'Europe/Moscow',
      year: 'numeric',
      month: '2-digit', 
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    }).replace(', ', 'T') + '+03:00';

    await supabase
      .from('_pidr_users')
      .update({ 
        last_seen: moscowTime
        // ✅ УБРАНО: status: 'online' - не меняем статус при проверке сессии!
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
        avatar_url: user.avatar_url,
        coins: user.coins,
        rating: user.rating,
        gamesPlayed: user.total_games_played || user.games_played || 0,
        wins: user.wins || user.games_won || 0,
        losses: user.losses || 0,
        status: user.online_status || user.status || 'offline'
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
    console.log('- SUPABASE_URL:', (process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL) ? 'ЕСТЬ' : '❌ НЕТ');
    console.log('- SUPABASE_ANON_KEY:', (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY) ? 'ЕСТЬ' : '❌ НЕТ');

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
    
    const { telegramId, username, firstName, lastName, photoUrl, referrerId } = requestBody;

    if (!telegramId || !username) {
      return NextResponse.json({ 
        success: false, 
        message: 'Недостаточно данных для авторизации' 
      }, { status: 400 });
    }

    console.log('👤 Авторизация пользователя:', { telegramId, username });

    // Генерируем московское время для всех операций
    const moscowTime = new Date().toLocaleString('en-CA', { 
      timeZone: 'Europe/Moscow',
      year: 'numeric',
      month: '2-digit', 
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    }).replace(', ', 'T') + '+03:00';

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
      
      // ✅ ИСПРАВЛЕНО: Используем правильные названия столбцов из БД
      const newUserData: any = {
        telegram_id: telegramId,
        username: username,
        first_name: firstName || username,
        last_name: lastName || '',
        avatar_url: photoUrl || null,
        coins: 1000,
        rating: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      // Добавляем поля с правильными названиями (поддержка обоих вариантов)
      newUserData.total_games_played = 0; // Из скриншота БД
      newUserData.games_played = 0; // Старое название (на случай если есть)
      newUserData.wins = 0;
      newUserData.games_won = 0; // Старое название
      newUserData.losses = 0;
      newUserData.online_status = 'online'; // Из скриншота БД
      newUserData.status = 'online'; // Старое название
      
      console.log('💾 Создаем пользователя с данными:', newUserData);
      
      const { data: newUser, error: createError } = await supabase
        .from('_pidr_users')
        .insert([newUserData])
        .select()
        .single();
        
      console.log('✅ Результат создания пользователя:', { user: !!newUser, error: createError?.message });

      if (createError) {
        console.error('❌ Ошибка создания пользователя:', createError);
        console.error('❌ Детали ошибки:', {
          code: createError.code,
          message: createError.message,
          details: createError.details,
          hint: createError.hint
        });
        
        // ✅ ПРОБУЕМ НАЙТИ ПОЛЬЗОВАТЕЛЯ ЕСЛИ ОН УЖЕ СУЩЕСТВУЕТ
        const { data: existingUserRetry } = await supabase
          .from('_pidr_users')
          .select('*')
          .eq('telegram_id', telegramId)
          .maybeSingle();
        
        if (existingUserRetry) {
          console.log('✅ Пользователь найден после ошибки создания, используем существующего');
          user = existingUserRetry;
        } else {
        return NextResponse.json({ 
          success: false, 
            message: `Ошибка создания пользователя: ${createError.message || 'Неизвестная ошибка'}`,
            errorDetails: createError
        }, { status: 500 });
        }
      }

      user = newUser;
      console.log('✅ Новый пользователь создан:', user.username);
      
      // ✅ ОБРАБОТКА РЕФЕРАЛЬНОЙ ССЫЛКИ
      if (referrerId && referrerId !== String(telegramId)) {
        console.log('🎁 Обрабатываем реферальную ссылку от:', referrerId);
        try {
          // Проверяем, существует ли пригласивший пользователь
          const { data: referrerUser, error: referrerError } = await supabase
            .from('_pidr_users')
            .select('telegram_id')
            .eq('telegram_id', referrerId)
            .single();
          
          if (referrerUser) {
            // Создаем связь дружбы (автоматически принятую) - ДВУХСТОРОННЮЮ!
            const { error: friendshipError1 } = await supabase
              .from('_pidr_friends')
              .insert([
                {
                  user_id: String(telegramId),
                  friend_id: String(referrerId),
                  status: 'accepted', // ✅ Сразу принимаем дружбу
                  created_at: new Date().toISOString()
                }
              ]);
            
            // ✅ Создаём обратную связь
            const { error: friendshipError2 } = await supabase
              .from('_pidr_friends')
              .insert([
                {
                  user_id: String(referrerId),
                  friend_id: String(telegramId),
                  status: 'accepted',
                  created_at: new Date().toISOString()
                }
              ]);
            
            const friendshipError = friendshipError1 || friendshipError2;
            
            if (!friendshipError) {
              console.log('✅ Дружба с приглашающим создана!');
              
              // ✅ НАЧИСЛЯЕМ РЕФЕРАЛЬНЫЕ БОНУСЫ!
              try {
                const bonusResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/referral/bonus`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    referrer_id: referrerId,
                    new_user_id: telegramId
                  })
                });
                
                if (bonusResponse.ok) {
                  const bonusData = await bonusResponse.json();
                  console.log('✅ Реферальные бонусы начислены:', bonusData);
                } else {
                  console.error('❌ Ошибка начисления бонусов:', await bonusResponse.text());
                }
              } catch (bonusError) {
                console.error('❌ Ошибка вызова API бонусов:', bonusError);
              }
            } else {
              console.error('❌ Ошибка создания дружбы:', friendshipError);
            }
          } else {
            console.warn('⚠️ Пригласивший пользователь не найден:', referrerId);
          }
        } catch (error) {
          console.error('❌ Ошибка обработки реферальной ссылки:', error);
        }
      }
    } else {
      // Обновляем данные существующего пользователя
      console.log('👤 Обновляем данные существующего пользователя...');
      
      // ✅ ИСПРАВЛЕНО: Обновляем с правильными названиями столбцов
      const updateData: any = {
        username: username,
        first_name: firstName || existingUser.first_name,
        last_name: lastName || existingUser.last_name,
        avatar_url: photoUrl || existingUser.avatar_url,
        last_seen: moscowTime,
        updated_at: new Date().toISOString()
      };
      
      // Обновляем статус (поддержка обоих вариантов)
      updateData.online_status = 'online';
      updateData.status = 'online';
      
      const { data: updatedUser, error: updateError } = await supabase
        .from('_pidr_users')
        .update(updateData)
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

    // ✅ КРИТИЧНО: Создаем device fingerprint для привязки токена к устройству
    const userAgent = req.headers.get('user-agent') || '';
    const acceptLanguage = req.headers.get('accept-language') || '';
    const platform = req.headers.get('sec-ch-ua-platform') || '';
    const deviceFingerprint = crypto
      .createHash('sha256')
      .update(`${userAgent}${acceptLanguage}${platform}${user.telegram_id}`)
      .digest('hex')
      .substring(0, 32);
    
    console.log('🔐 Создаем токен с device fingerprint:', deviceFingerprint.substring(0, 8) + '...');

    // Создаем JWT токен с device fingerprint
    const token = jwt.sign(
      { 
        userId: user.id,
        telegramId: user.telegram_id,
        username: user.username,
        deviceFingerprint // ✅ ПРИВЯЗКА К УСТРОЙСТВУ
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
        gamesPlayed: (user as any).total_games_played || (user as any).games_played || 0,
        wins: (user as any).wins || (user as any).games_won || 0,
        losses: (user as any).losses || 0,
        status: (user as any).online_status || (user as any).status || 'offline'
      }
    });

    // Устанавливаем HTTP-only cookie с правильными настройками для Telegram WebApp
    const cookieSettings = {
      httpOnly: true,
      secure: true, // Всегда true для HTTPS (обязательно для sameSite: 'none')
      sameSite: 'none' as const, // Для Telegram WebApp нужно 'none'
      path: '/',
      maxAge: 30 * 24 * 60 * 60, // 30 дней
      domain: undefined // Автоопределение домена
    };
    
    response.cookies.set('auth_token', token, cookieSettings);

    console.log('✅ JWT токен создан и установлен в cookie');
    console.log('🔑 Токен (первые 50 символов):', token.substring(0, 50) + '...');
    console.log('🍪 Cookie настройки:', cookieSettings);
    console.log('📊 Возвращаем статистику пользователя:', {
      gamesPlayed: user.games_played,
      wins: user.wins,
      losses: user.losses
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
