import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, getUserIdFromDatabase } from '@/lib/auth-utils';
import { generateRandomCharacterAvatars } from '@/lib/avatars/character-avatars';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// GET /api/user/avatar/random?count=6 — пакет случайных 3D-style персонажей
export async function GET(req: NextRequest) {
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
      return NextResponse.json({ success: false, message: 'Пользователь не найден' }, { status: 404 });
    }

    const countRaw = Number(req.nextUrl.searchParams.get('count') || 6);
    const count = Number.isFinite(countRaw) ? Math.min(9, Math.max(3, Math.floor(countRaw))) : 6;
    const options = generateRandomCharacterAvatars(count);

    return NextResponse.json({
      success: true,
      options: options.map((opt) => ({
        id: opt.id,
        style: opt.style,
        seed: opt.seed,
        dataUrl: opt.dataUrl,
        previewPath: opt.previewPath,
      })),
    });
  } catch (error: unknown) {
    console.error('❌ [avatar/random]', error);
    const message = error instanceof Error ? error.message : 'Ошибка генерации аватаров';
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
