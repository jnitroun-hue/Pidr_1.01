/**
 * ============================================================
 * USER USERNAME API - PATCH
 * ============================================================
 * Endpoint для редактирования имени пользователя
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { verify } from 'jsonwebtoken';

export async function PATCH(req: NextRequest) {
  try {
    const token = req.cookies.get('auth-token')?.value;
    
    if (!token) {
      return NextResponse.json({ 
        success: false, 
        message: 'Не авторизован' 
      }, { status: 401 });
    }

    // Проверяем токен
    const JWT_SECRET = process.env.JWT_SECRET || '';
    let decoded: any;
    
    try {
      decoded = verify(token, JWT_SECRET);
    } catch (error) {
      return NextResponse.json({ 
        success: false, 
        message: 'Невалидный токен' 
      }, { status: 401 });
    }

    const userId = decoded.userId;
    if (!userId) {
      return NextResponse.json({ 
        success: false, 
        message: 'User ID не найден' 
      }, { status: 400 });
    }

    // Получаем новое имя из body
    const body = await req.json();
    const { username } = body;

    if (!username || typeof username !== 'string') {
      return NextResponse.json({ 
        success: false, 
        message: 'Имя пользователя обязательно' 
      }, { status: 400 });
    }

    // Валидация имени
    if (username.length < 3) {
      return NextResponse.json({ 
        success: false, 
        message: 'Имя должно быть минимум 3 символа' 
      }, { status: 400 });
    }

    if (username.length > 20) {
      return NextResponse.json({ 
        success: false, 
        message: 'Имя не может быть длиннее 20 символов' 
      }, { status: 400 });
    }

    // Обновляем имя в БД
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from('_pidr_users')
      .update({ username: username.trim() })
      .eq('id', userId)
      .select('id, username, avatar_url')
      .single();

    if (error) {
      console.error('❌ Ошибка обновления имени:', error);
      return NextResponse.json({ 
        success: false, 
        message: 'Ошибка обновления имени: ' + error.message 
      }, { status: 500 });
    }

    console.log(`✅ Имя пользователя ${userId} обновлено: ${username}`);

    return NextResponse.json({ 
      success: true, 
      message: 'Имя обновлено',
      user: data
    });

  } catch (error: any) {
    console.error('❌ Ошибка API /user/username:', error);
    return NextResponse.json({ 
      success: false, 
      message: 'Внутренняя ошибка сервера' 
    }, { status: 500 });
  }
}

