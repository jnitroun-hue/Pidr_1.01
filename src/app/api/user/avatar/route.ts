import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../lib/supabase';
import { requireAuth, getUserIdFromDatabase } from '../../../../lib/auth-utils';
import { resolveAvatarUrlForStorage } from '../../../../lib/user/upload-user-avatar';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// POST /api/user/avatar - Обновить аватар пользователя
export async function POST(req: NextRequest) {
  try {
    const auth = requireAuth(req);

    if (auth.error || !auth.userId) {
      return NextResponse.json(
        { success: false, message: auth.error || 'Требуется авторизация' },
        { status: 401 }
      );
    }

    const { dbUserId } = await getUserIdFromDatabase(auth.userId, auth.environment);

    if (!dbUserId) {
      return NextResponse.json(
        { success: false, message: 'Пользователь не найден в БД' },
        { status: 404 }
      );
    }

    const body = await req.json();
    const { avatar_url } = body;

    if (!avatar_url || typeof avatar_url !== 'string') {
      return NextResponse.json(
        { success: false, message: 'avatar_url обязателен' },
        { status: 400 }
      );
    }

    const storedAvatarUrl = await resolveAvatarUrlForStorage(avatar_url, Number(dbUserId));

    const { data: updatedUser, error: updateError } = await supabaseAdmin
      .from('_pidr_users')
      .update({
        avatar_url: storedAvatarUrl,
        updated_at: new Date().toISOString(),
      })
      .eq('id', dbUserId)
      .select('avatar_url, username')
      .single();

    if (updateError || !updatedUser) {
      console.error('❌ Ошибка обновления аватара:', updateError);
      return NextResponse.json(
        { success: false, message: 'Ошибка обновления аватара' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Аватар обновлен',
      data: {
        avatar_url: updatedUser.avatar_url,
      },
    });
  } catch (error: unknown) {
    console.error('❌ Ошибка обновления аватара:', error);
    const message = error instanceof Error ? error.message : 'Неизвестная ошибка';
    return NextResponse.json(
      { success: false, message: `Ошибка обновления аватара: ${message}` },
      { status: 500 }
    );
  }
}
