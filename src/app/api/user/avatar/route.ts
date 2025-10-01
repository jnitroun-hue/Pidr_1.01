import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '../../../../lib/supabase';
import { requireAuth } from '../../../../lib/auth-utils';

// POST /api/user/avatar - Обновить аватар пользователя
export async function POST(req: NextRequest) {
  console.log('🖼️ POST /api/user/avatar - Обновление аватара пользователя...');
  
  const auth = requireAuth(req);
  if (auth.error) {
    console.error('❌ Ошибка авторизации:', auth.error);
    return NextResponse.json({ success: false, message: auth.error }, { status: 401 });
  }
  
  const userId = auth.userId as string;
  
  try {
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
