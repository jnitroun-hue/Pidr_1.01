import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createSession } from '@/lib/auth/redis-session-manager';
import * as crypto from 'crypto';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const VK_CLIENT_SECRET = process.env.VK_CLIENT_SECRET || '';

/**
 * Проверка подписи VK Mini App
 * Документация: https://dev.vk.com/mini-apps/development/launch-params#Проверка%20подписи
 */
function verifyVKSignature(searchParams: URLSearchParams): boolean {
  if (!VK_CLIENT_SECRET) {
    console.error('❌ VK_CLIENT_SECRET не настроен');
    return false;
  }

  const sign = searchParams.get('sign');
  if (!sign) {
    console.error('❌ Отсутствует параметр sign');
    return false;
  }

  // Собираем все параметры кроме sign
  const params: string[] = [];
  searchParams.forEach((value, key) => {
    if (key !== 'sign') {
      params.push(`${key}=${value}`);
    }
  });

  // Сортируем параметры
  params.sort();

  // Создаем строку для подписи
  const paramsString = params.join('&');

  // Вычисляем HMAC-SHA256
  const hash = crypto
    .createHmac('sha256', VK_CLIENT_SECRET)
    .update(paramsString)
    .digest('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');

  return hash === sign;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { vk_user_id, vk_access_token_settings, vk_app_id, vk_are_notifications_enabled, 
            vk_is_app_user, vk_is_favorite, vk_language, vk_platform, vk_ref, vk_ts, 
            sign, first_name, last_name, photo_url } = body;

    console.log('🔍 VK Mini App авторизация:', { vk_user_id, first_name, last_name });

    // Проверяем обязательные параметры
    if (!vk_user_id || !sign) {
      return NextResponse.json(
        { success: false, message: 'Отсутствуют обязательные параметры VK' },
        { status: 400 }
      );
    }

    // Создаем URLSearchParams для проверки подписи
    const searchParams = new URLSearchParams();
    Object.entries(body).forEach(([key, value]) => {
      if (value !== null && value !== undefined && key !== 'first_name' && key !== 'last_name' && key !== 'photo_url') {
        searchParams.set(key, String(value));
      }
    });

    // Проверяем подпись VK
    if (!verifyVKSignature(searchParams)) {
      console.error('❌ Неверная подпись VK');
      return NextResponse.json(
        { success: false, message: 'Неверная подпись VK. Откройте приложение через VK' },
        { status: 403 }
      );
    }

    console.log('✅ Подпись VK валидна');

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Ищем пользователя по VK ID
    const { data: existingUser, error: findError } = await supabase
      .from('_pidr_users')
      .select('*')
      .eq('vk_id', vk_user_id)
      .single();

    let user = existingUser;

    if (!existingUser) {
      // Создаем нового пользователя
      console.log('📝 Создаем нового пользователя VK:', vk_user_id);

      // Генерируем уникальный username
      let username = `vk_${vk_user_id}`;
      if (first_name) {
        username = `${first_name.toLowerCase().replace(/[^a-z0-9]/g, '')}_${vk_user_id}`;
      }

      const { data: newUser, error: createError } = await supabase
        .from('_pidr_users')
        .insert({
          vk_id: vk_user_id,
          username,
          first_name: first_name || null,
          last_name: last_name || null,
          avatar_url: photo_url || null,
          auth_method: 'vk',
          coins: 1000,
          rating: 0,
          is_active: true,
          login_count: 1,
          last_login_at: new Date().toISOString(),
          online_status: 'online',
          status: 'online',
          last_seen: new Date().toISOString()
        })
        .select()
        .single();

      if (createError || !newUser) {
        console.error('❌ Ошибка создания пользователя VK:', createError);
        return NextResponse.json(
          { success: false, message: 'Ошибка создания пользователя' },
          { status: 500 }
        );
      }

      user = newUser;
      console.log('✅ Пользователь VK создан:', username);
    } else {
      // Обновляем существующего пользователя
      console.log('🔄 Обновляем существующего пользователя VK:', existingUser.username);

      const updateData: Record<string, string | number> = {
        last_login_at: new Date().toISOString(),
        login_count: (existingUser.login_count || 0) + 1,
        online_status: 'online',
        status: 'online',
        last_seen: new Date().toISOString()
      };

      // Обновляем имя и фото, если они изменились
      if (first_name && first_name !== existingUser.first_name) {
        updateData.first_name = first_name;
      }
      if (last_name && last_name !== existingUser.last_name) {
        updateData.last_name = last_name;
      }
      if (photo_url && photo_url !== existingUser.avatar_url) {
        updateData.avatar_url = photo_url;
      }

      const { data: updatedUser } = await supabase
        .from('_pidr_users')
        .update(updateData)
        .eq('id', existingUser.id)
        .select()
        .single();

      user = updatedUser || existingUser;
    }

    // Создаем сессию в Redis + JWT токен
    const { token } = await createSession({
      userId: user.id.toString(),
      username: user.username,
      authMethod: 'vk',
      vkId: vk_user_id.toString(),
      userAgent: request.headers.get('user-agent') || undefined,
      ip: request.headers.get('x-forwarded-for')?.split(',')[0] || 
          request.headers.get('x-real-ip') || undefined,
    });

    // Подготавливаем данные пользователя
    const userData = {
      id: user.id,
      username: user.username,
      first_name: user.first_name,
      last_name: user.last_name,
      vk_id: user.vk_id,
      coins: user.coins,
      rating: user.rating,
      avatar_url: user.avatar_url,
      auth_method: user.auth_method,
      games_played: user.games_played || 0,
      games_won: user.games_won || 0,
      wins: user.wins || 0,
      losses: user.losses || 0
    };

    console.log('✅ VK авторизация успешна:', user.username);

    const response = NextResponse.json({
      success: true,
      message: 'Авторизация через VK успешна',
      user: userData,
      token,
      isNewUser: !existingUser
    });

    // Устанавливаем cookie с токеном
    response.cookies.set('auth_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60, // 30 дней
      path: '/'
    });

    return response;

  } catch (error) {
    console.error('❌ Ошибка VK авторизации:', error);
    return NextResponse.json(
      { success: false, message: 'Внутренняя ошибка сервера' },
      { status: 500 }
    );
  }
}

