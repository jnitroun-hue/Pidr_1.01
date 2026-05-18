import { NextRequest, NextResponse } from 'next/server';
import { supabase, supabaseAdmin } from '../../../lib/supabase';
import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';
import { lightCleanup } from '../../../lib/auto-cleanup';
import crypto from 'crypto';
import { hasJwtSecret, requireJwtSecret } from '../../../lib/auth/jwt-secret';

// ✅ Явная конфигурация runtime для Next.js 15
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

const SESSION_SECRET = process.env.SESSION_SECRET || process.env.SUPABASE_JWT_SECRET;
const NEXTAUTH_URL = process.env.NEXTAUTH_URL || process.env.VERCEL_URL;

interface AuthJwtPayload {
  userId: string;
  telegramId?: string;
  deviceFingerprint?: string;
  authMethod?: string;
  authSource?: string;
}

type DbUserRecord = Record<string, unknown> & {
  id: number;
  username?: string;
  first_name?: string;
  last_name?: string;
  telegram_id?: string;
  avatar_url?: string;
  coins?: number;
  rating?: number;
  total_games_played?: number;
  games_played?: number;
  wins?: number;
  games_won?: number;
  losses?: number;
  online_status?: string;
  status?: string;
  is_admin?: boolean;
};

// GET /api/auth - Проверка активной сессии
export async function GET(req: NextRequest) {
  try {
    console.log('🔍 [GET /api/auth] Проверка активной сессии пользователя...');
    
    // ✅ ОЧИСТКА НЕАКТИВНЫХ ПОЛЬЗОВАТЕЛЕЙ (не блокирует запрос, выполняется асинхронно)
    // Вызываем в фоне, не ждем результата
    try {
      lightCleanup().catch((err: unknown) => {
        // Игнорируем ошибки очистки, они не критичны
        if (err instanceof Error) {
          console.warn('⚠️ [GET /api/auth] Ошибка автоочистки (не критично):', err.message);
        }
      });
    } catch (cleanupError) {
      // Игнорируем ошибки импорта/вызова cleanup
      console.warn('⚠️ [GET /api/auth] Не удалось запустить автоочистку (не критично)');
    }
    console.log('📋 [GET /api/auth] Headers:', {
      'x-telegram-id': req.headers.get('x-telegram-id'),
      'x-username': req.headers.get('x-username'),
      'user-agent': req.headers.get('user-agent')?.substring(0, 50)
    });

    if (!hasJwtSecret()) {
      console.error('❌ SUPABASE_JWT_SECRET не настроен');
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
    let payload: AuthJwtPayload;
    try {
      payload = jwt.verify(token, requireJwtSecret()) as AuthJwtPayload;
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

    // ✅ ПРОВЕРКА БЕЗОПАСНОСТИ: x-telegram-id header (только для Telegram авторизации)
    // Для веб-версии этот header не требуется
    const telegramIdHeader = req.headers.get('x-telegram-id');
    // ✅ ИСПРАВЛЕНО: Дефолт 'web' вместо 'telegram', чтобы веб-пользователи не блокировались
    const authMethod = payload?.authMethod || payload?.authSource || (payload?.telegramId ? 'telegram' : 'web');
    
    // Если это Telegram авторизация - проверяем header
    // Если это веб-версия - пропускаем проверку header
    if (authMethod === 'telegram' && !telegramIdHeader) {
      console.log('⚠️ x-telegram-id header отсутствует для Telegram авторизации, возвращаем 401');
      return NextResponse.json({ 
        success: false, 
        message: 'Требуется авторизация через Telegram' 
      }, { status: 401 });
    }

    // ✅ ИСПРАВЛЕНО: userId из токена может быть как id из БД, так и telegram_id
    // Для веб-версии проверяем только по id из БД
    // Для Telegram авторизации проверяем по telegram_id и header
    let userForCheck: { id: number; telegram_id?: string; auth_method?: string } | null = null;
    let userCheckError: Error | null = null;
    
    if (authMethod === 'web') {
      // Для веб-версии - находим пользователя по id из БД (supabaseAdmin для обхода RLS)
      const numericId = parseInt(userId);
      if (!isNaN(numericId)) {
        const { data, error } = await supabaseAdmin
          .from('_pidr_users')
          .select('id, telegram_id, auth_method')
          .eq('id', numericId)
          .maybeSingle();
        userForCheck = data;
        userCheckError = error ? new Error(error.message) : null;
      }
    } else {
      // Для Telegram авторизации - проверяем по id или telegram_id
      if (!isNaN(Number(userId))) {
        const { data, error } = await supabaseAdmin
          .from('_pidr_users')
          .select('id, telegram_id')
          .eq('id', parseInt(userId))
          .maybeSingle();
        userForCheck = data;
        userCheckError = error ? new Error(error.message) : null;
      }
      
      // Если не найдено по id, ищем по telegram_id
      if (!userForCheck) {
        const { data, error } = await supabaseAdmin
          .from('_pidr_users')
          .select('id, telegram_id')
          .eq('telegram_id', userId)
          .maybeSingle();
        userForCheck = data;
        userCheckError = error ? new Error(error.message) : null;
      }

      // ✅ КРИТИЧНО: Для Telegram авторизации проверяем что telegram_id из БД совпадает с header
      if (userForCheck && telegramIdHeader) {
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
      }
    }

    if (userCheckError || !userForCheck) {
      console.error('❌ Пользователь не найден в БД для проверки:', userCheckError);
      return NextResponse.json({ 
        success: false, 
        message: 'Пользователь не найден' 
      }, { status: 404 });
    }

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

    console.log('🔍 [GET /api/auth] Ищем пользователя, authMethod:', authMethod, 'userId:', userId);
    
    let user: DbUserRecord | null = null;
    let error: Error | null = null;
    
    if (authMethod === 'web') {
      // ✅ ВЕБ: ТОЛЬКО по числовому id из БД — никогда не трогаем telegram_id
      const numericId = parseInt(userId);
      if (isNaN(numericId)) {
        console.error('❌ [GET /api/auth] Для веб userId должен быть числом, получено:', userId);
        return NextResponse.json({ success: false, message: 'Невалидный токен' }, { status: 401 });
      }
      const { data, error: err } = await supabaseAdmin
        .from('_pidr_users')
        .select('*')
        .eq('id', numericId)
        .single();
      user = data;
      error = err ? new Error(err.message) : null;
    } else {
      // ✅ TELEGRAM/VK: ищем по id из БД (userId = числовой id пользователя)
      if (!isNaN(Number(userId))) {
        const { data, error: err } = await supabaseAdmin
          .from('_pidr_users')
          .select('*')
          .eq('id', parseInt(userId))
          .single();
        user = data;
        error = err ? new Error(err.message) : null;
      }
      // Если не найдено по id — fallback по telegram_id
      if (!user) {
        console.log('🔍 Fallback: ищем по telegram_id:', userId);
        const { data, error: err } = await supabaseAdmin
          .from('_pidr_users')
          .select('*')
          .eq('telegram_id', userId)
          .single();
        user = data;
        error = err ? new Error(err.message) : null;
      }
    }

    if (error || !user) {
      console.error('❌ Пользователь не найден в БД:', error);
      return NextResponse.json({ 
        success: false, 
        message: 'Пользователь не найден' 
      }, { status: 404 });
    }

    // ✅ КРИТИЧНО: Финальная проверка - только для Telegram авторизации
    // Для веб-версии проверка telegram_id не требуется
    if (authMethod === 'telegram') {
      const finalTelegramId = String(user.telegram_id || '');
      const finalHeaderTelegramId = String(telegramIdHeader || '');
      
      console.log('👤 [GET /api/auth] Финальная проверка пользователя (Telegram):', {
        userId: user.id,
        username: user.username,
        dbTelegramId: finalTelegramId,
        headerTelegramId: finalHeaderTelegramId,
        tokenTelegramId: telegramIdFromToken,
        match: finalTelegramId === finalHeaderTelegramId
      });

      // ✅ КРИТИЧНО: Если telegram_id не совпадает - БЛОКИРУЕМ (только для Telegram)
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
    } else {
      console.log('👤 [GET /api/auth] Веб-версия, проверка telegram_id не требуется:', {
        userId: user.id,
        username: user.username,
        authMethod
      });
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

    // ✅ ИСПРАВЛЕНО: userId из токена может быть как id из БД, так и telegram_id
    // Нужно найти правильный id из БД для обновления
    let userIdForUpdate: number;
    
    if (authMethod === 'web') {
      // Для веб - userId это уже id из БД
      userIdForUpdate = parseInt(userId);
    } else {
      // Для Telegram - userId это telegram_id, нужно найти id из БД
      userIdForUpdate = user.id;
    }
    
    // ✅ ИСПРАВЛЕНО: Используем supabaseAdmin для обхода RLS
    await supabaseAdmin
      .from('_pidr_users')
      .update({ 
        last_seen: moscowTime
        // ✅ УБРАНО: status: 'online' - не меняем статус при проверке сессии!
      })
      .eq('id', userIdForUpdate);

    console.log('✅ Активная сессия найдена:', user.username);

    const response = NextResponse.json({
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
        status: user.online_status || user.status || 'offline',
        is_admin: user.is_admin || false
      }
    });
    // /api/auth зависит от cookie и не должен кешироваться CDN/браузером.
    response.headers.set('Cache-Control', 'private, no-store, no-cache, must-revalidate');
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Expires', '0');
    return response;

  } catch (error: unknown) {
    console.error('❌ Ошибка проверки сессии:', error);
    const response = NextResponse.json({ 
      success: false, 
      message: 'Ошибка сервера' 
    }, { status: 500 });
    response.headers.set('Cache-Control', 'private, no-store, no-cache, must-revalidate');
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Expires', '0');
    return response;
  }
}

// POST /api/auth - Авторизация пользователя
export async function POST(req: NextRequest) {
  try {
    console.log('🔐 POST /api/auth - Авторизация пользователя...');
    
    // Проверяем переменные окружения
    console.log('🔍 Проверка переменных окружения:');
    console.log('- SUPABASE_JWT_SECRET:', hasJwtSecret() ? 'ЕСТЬ' : '❌ НЕТ');
    console.log('- SESSION_SECRET:', !!SESSION_SECRET ? 'ЕСТЬ' : '❌ НЕТ');
    console.log('- SUPABASE_URL:', (process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL) ? 'ЕСТЬ' : '❌ НЕТ');
    console.log('- SUPABASE_ANON_KEY:', (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY) ? 'ЕСТЬ' : '❌ НЕТ');

    if (!hasJwtSecret()) {
      console.error('❌ SUPABASE_JWT_SECRET не настроен');
      return NextResponse.json({ 
        success: false, 
        message: 'SUPABASE_JWT_SECRET не настроен на сервере' 
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

    // ✅ ИСПРАВЛЕНО: Используем supabaseAdmin для обхода RLS
    // Ищем существующего пользователя
    console.log('🔍 Ищем пользователя в БД по telegram_id:', telegramId);
    let { data: existingUser, error: findError } = await supabaseAdmin
      .from('_pidr_users')
      .select('*')
      .eq('telegram_id', telegramId)
      .maybeSingle(); // ✅ ИСПРАВЛЕНО: Используем maybeSingle() вместо single()
      
    console.log('📊 Результат поиска пользователя:', { 
      user: !!existingUser, 
      userId: existingUser?.id,
      username: existingUser?.username,
      error: findError?.message 
    });

    let user = existingUser;

    if (!existingUser || findError) {
      // ✅ ИСПРАВЛЕНО: Если пользователь не найден ИЛИ есть ошибка - создаем нового
      if (findError && findError.code !== 'PGRST116') {
        // PGRST116 = not found (это нормально)
        console.error('❌ Ошибка поиска пользователя:', findError);
      }
      // Создаем нового пользователя
      console.log('👤 Создаем нового пользователя...');
      
      // ✅ ИСПРАВЛЕНО: Используем правильные названия столбцов из БД
      // ✅ КРИТИЧНО: Проверяем что username не пустой и не "Игрок"
      let finalUsername = username && username.trim() ? username.trim() : (firstName || `User${telegramId.toString().slice(-4)}`);
      if (finalUsername === 'Игрок' || finalUsername.trim() === '') {
        finalUsername = firstName || `User${telegramId.toString().slice(-4)}`;
      }
      
      const newUserData: Record<string, string | number | null> = {
        telegram_id: telegramId,
        username: finalUsername, // ✅ Сохраняем правильный username
        first_name: firstName || finalUsername,
        last_name: lastName || '',
        avatar_url: photoUrl || null,
        coins: 1000,
        rating: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      console.log(`📝 [POST /api/auth] Создаем пользователя с username: "${finalUsername}" (было: "${username}")`);
      
      // Добавляем поля с правильными названиями (поддержка обоих вариантов)
      newUserData.total_games_played = 0; // Из скриншота БД
      newUserData.games_played = 0; // Старое название (на случай если есть)
      newUserData.wins = 0;
      newUserData.games_won = 0; // Старое название
      newUserData.losses = 0;
      newUserData.online_status = 'online'; // Из скриншота БД
      newUserData.status = 'online'; // Старое название
      
      console.log('💾 Создаем пользователя с данными:', newUserData);
      
      // ✅ ИСПРАВЛЕНО: Используем админский клиент для создания пользователя, чтобы обойти RLS
      const { data: newUser, error: createError } = await supabaseAdmin
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
        
        // ✅ КРИТИЧНО: Если ошибка дублирования ключа - пользователь уже существует, используем его
        if (createError.code === '23505' || createError.message?.includes('duplicate key') || createError.message?.includes('_pidr_users_telegram_id_key')) {
          console.log('⚠️ Пользователь уже существует (duplicate key), ищем его в БД...');
          const { data: existingUserRetry, error: retryError } = await supabaseAdmin
            .from('_pidr_users')
            .select('*')
            .eq('telegram_id', telegramId)
            .maybeSingle();
          
          if (existingUserRetry) {
            console.log('✅ Пользователь найден после ошибки дублирования, обновляем данные:', existingUserRetry.username);
            user = existingUserRetry;
            
            // ✅ СРАЗУ ОБНОВЛЯЕМ ДАННЫЕ ПОЛЬЗОВАТЕЛЯ
            // ✅ КРИТИЧНО: Всегда обновляем username если он передан (даже если пустой)
            const updateData: Record<string, string> = {
              username: username && username.trim() ? username.trim() : existingUserRetry.username, // Обновляем только если есть непустое значение
              first_name: firstName || existingUserRetry.first_name,
              last_name: lastName || existingUserRetry.last_name,
              avatar_url: photoUrl || existingUserRetry.avatar_url,
              last_seen: moscowTime,
              updated_at: new Date().toISOString(),
              online_status: 'online',
              status: 'online'
            };
            
            // ✅ КРИТИЧНО: Если username пустой или "Игрок", используем first_name или telegram_id
            if (!updateData.username || updateData.username === 'Игрок' || updateData.username.trim() === '') {
              updateData.username = firstName || `User${telegramId.toString().slice(-4)}` || existingUserRetry.username;
              console.log(`⚠️ [POST /api/auth] Username был пустым или "Игрок", установлен: ${updateData.username}`);
            }
            
            const { data: updatedUser, error: updateError } = await supabaseAdmin
              .from('_pidr_users')
              .update(updateData)
              .eq('id', existingUserRetry.id)
              .select()
              .single();
            
            if (!updateError && updatedUser) {
              user = updatedUser;
              console.log('✅ Данные пользователя обновлены после ошибки дублирования');
            } else {
              console.warn('⚠️ Ошибка обновления данных пользователя:', updateError);
            }
          } else {
            console.error('❌ Пользователь не найден после ошибки дублирования:', retryError);
            return NextResponse.json({ 
              success: false, 
              message: `Ошибка создания пользователя: пользователь с таким telegram_id уже существует, но не найден в БД`,
              errorDetails: createError
            }, { status: 500 });
          }
        } else {
          // ✅ ДЛЯ ДРУГИХ ОШИБОК - возвращаем ошибку
          return NextResponse.json({ 
            success: false, 
            message: `Ошибка создания пользователя: ${createError.message || 'Неизвестная ошибка'}`,
            errorDetails: createError
          }, { status: 500 });
        }
      } else {
        user = newUser;
        console.log('✅ Новый пользователь создан:', user.username);
      }
      
      // ✅ ЕСЛИ ПОЛЬЗОВАТЕЛЬ НАЙДЕН (новый или существующий) - ПРОДОЛЖАЕМ
      if (!user) {
        return NextResponse.json({ 
          success: false, 
          message: 'Не удалось создать или найти пользователя'
        }, { status: 500 });
      }
      
      // ✅ ОБРАБОТКА РЕФЕРАЛЬНОЙ ССЫЛКИ
      if (referrerId && referrerId !== String(telegramId)) {
        console.log('🎁 Обрабатываем реферальную ссылку от:', referrerId);
        try {
          // ✅ ИСПРАВЛЕНО: Используем supabaseAdmin для обхода RLS
          // Проверяем, существует ли пригласивший пользователь
          const { data: referrerUser, error: referrerError } = await supabaseAdmin
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
        } catch (error: unknown) {
          console.error('❌ Ошибка обработки реферальной ссылки:', error);
        }
      }
    }
    
    // ✅ ОБНОВЛЕНИЕ ДАННЫХ ПОЛЬЗОВАТЕЛЯ (для существующих И для найденных после ошибки дублирования)
    // Обновляем данные только если пользователь уже существовал (не новый)
    if (user && existingUser) {
      // Обновляем данные существующего пользователя
      console.log('👤 Обновляем данные существующего пользователя...');
      console.log(`📝 [POST /api/auth] Текущий username в БД: "${user.username}", новый username: "${username}"`);
      
      // ✅ ИСПРАВЛЕНО: Обновляем с правильными названиями столбцов
      // ✅ КРИТИЧНО: Всегда обновляем username если он передан и не пустой
      let finalUsername = username && username.trim() ? username.trim() : user.username;
      // ✅ Если username пустой или "Игрок", используем first_name или оставляем существующий
      if (!finalUsername || finalUsername === 'Игрок' || finalUsername.trim() === '') {
        finalUsername = firstName || user.username || `User${telegramId.toString().slice(-4)}`;
      }
      
      const updateData: Record<string, string> = {
        username: finalUsername, // ✅ Всегда обновляем username (даже если используем существующий)
        first_name: firstName || user.first_name,
        last_name: lastName || user.last_name,
        avatar_url: photoUrl || user.avatar_url,
        last_seen: moscowTime,
        updated_at: new Date().toISOString(),
        online_status: 'online',
        status: 'online'
      };
      
      console.log(`📝 [POST /api/auth] Обновляем username существующего пользователя: "${user.username}" → "${finalUsername}"`);
      
      // ✅ ИСПРАВЛЕНО: Используем админский клиент для обновления статуса, чтобы обойти RLS
      const { data: updatedUser, error: updateError } = await supabaseAdmin
        .from('_pidr_users')
        .update(updateData)
        .eq('id', user.id)
        .select()
        .single();

      if (updateError) {
        console.error('❌ Ошибка обновления пользователя:', updateError);
        // Продолжаем с существующими данными
      } else if (updatedUser) {
        user = updatedUser;
        console.log('✅ Пользователь обновлен:', user.username);
      }
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
    // ✅ КРИТИЧНО: authMethod ОБЯЗАТЕЛЕН чтобы GET не путал Telegram с веб
    const token = jwt.sign(
      { 
        userId: user.id,
        telegramId: user.telegram_id,
        username: user.username,
        authMethod: 'telegram',   // ← ОБЯЗАТЕЛЬНО
        authSource: 'telegram',   // ← дублируем для совместимости
        deviceFingerprint
      },
      requireJwtSecret(),
      { expiresIn: '30d' }
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
        gamesPlayed: user.total_games_played || user.games_played || 0,
        wins: user.wins || user.games_won || 0,
        losses: user.losses || 0,
        status: user.online_status || user.status || 'offline'
      }
    });

    // Устанавливаем HTTP-only cookie с правильными настройками
    // ✅ ИСПРАВЛЕНО: Определяем настройки в зависимости от окружения
    const isProduction = process.env.NODE_ENV === 'production';
    const isTelegramWebApp = req.headers.get('user-agent')?.includes('Telegram') || 
                            req.headers.get('x-telegram-id') !== null;
    
    const cookieSettings = {
      httpOnly: true,
      secure: isProduction, // В production всегда true, в dev может быть false для localhost
      sameSite: (isTelegramWebApp ? 'none' : 'lax') as 'none' | 'lax', // Для Telegram WebApp 'none', для браузера 'lax'
      path: '/',
      maxAge: 30 * 24 * 60 * 60, // 30 дней
      domain: undefined // Автоопределение домена
    };
    
    console.log('🍪 Cookie настройки:', {
      ...cookieSettings,
      isProduction,
      isTelegramWebApp,
      userAgent: req.headers.get('user-agent')?.substring(0, 50)
    });
    
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

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Неизвестная ошибка';
    const errorStack = error instanceof Error ? error.stack : undefined;
    console.error('❌ КРИТИЧЕСКАЯ ОШИБКА API авторизации:');
    console.error('- Тип ошибки:', typeof error);
    console.error('- Сообщение:', errorMessage);
    console.error('- Стек:', errorStack);
    console.error('- Полный объект:', error);
    
    return NextResponse.json({ 
      success: false, 
      message: `Внутренняя ошибка сервера: ${errorMessage}` 
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

  } catch (error: unknown) {
    console.error('❌ Ошибка выхода:', error);
    return NextResponse.json({ 
      success: false, 
      message: 'Ошибка сервера' 
    }, { status: 500 });
  }
}
