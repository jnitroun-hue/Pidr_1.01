import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireAuth } from '../../../../lib/auth/auth-middleware';

// ✅ Явная конфигурация runtime для Next.js 15
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// POST /api/user/avatar - Обновить аватар пользователя
export async function POST(req: NextRequest) {
  console.log('🖼️ POST /api/user/avatar - Обновление аватара пользователя...');
  
  try {
    // Lazy initialization Supabase
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      console.error('❌ [avatar] Supabase не настроен');
      return NextResponse.json(
        { success: false, message: 'Supabase не настроен' },
        { status: 500 }
      );
    }
    
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // ✅ ИСПРАВЛЕНО: requireAuth из auth-middleware возвращает AuthContext
    const authContext = await requireAuth(req);
    
    if (!authContext.authenticated || !authContext.userId) {
      return NextResponse.json(
        { success: false, message: authContext.error || 'Требуется авторизация' },
        { status: 401 }
      );
    }
    
    const userId = authContext.userId;
    console.log(`✅ Авторизован пользователь: ${userId}`);
    
    const body = await req.json();
    const { avatar_url } = body;
    
    if (!avatar_url) {
      return NextResponse.json({ 
        success: false, 
        message: 'avatar_url обязателен' 
      }, { status: 400 });
    }
    
    console.log(`🖼️ Обновляем аватар для пользователя ${userId}...`);
    
    // Обновляем аватар в базе данных
    const { data: updatedUser, error: updateError } = await supabase
      .from('_pidr_users')
      .update({ 
        avatar_url: avatar_url,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId)
      .select()
      .single();
      
    if (updateError || !updatedUser) {
      console.error('❌ Ошибка обновления аватара:', updateError);
      return NextResponse.json({ 
        success: false, 
        message: 'Ошибка обновления аватара' 
      }, { status: 500 });
    }
    
    console.log(`✅ Аватар пользователя ${updatedUser.username} обновлен`);
    
    return NextResponse.json({ 
      success: true,
      message: 'Аватар обновлен',
      data: {
        avatar_url: updatedUser.avatar_url
      }
    });
    
  } catch (error: unknown) {
    console.error('❌ Ошибка обновления аватара:', error);
    const message = error instanceof Error ? error.message : 'Неизвестная ошибка';
    return NextResponse.json({ 
      success: false, 
      message: `Ошибка обновления аватара: ${message}` 
    }, { status: 500 });
  }
}
