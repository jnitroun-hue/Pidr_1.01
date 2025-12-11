import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireAuth } from '../../../../lib/auth/auth-middleware';

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
    
    const userId = await requireAuth(req);
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
    
  } catch (error: any) {
    console.error('❌ Ошибка обновления аватара:', error);
    return NextResponse.json({ 
      success: false, 
      message: `Ошибка обновления аватара: ${error?.message || 'Неизвестная ошибка'}` 
    }, { status: 500 });
  }
}
