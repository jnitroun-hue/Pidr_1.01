import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { requireAuth, getUserIdFromDatabase } from '@/lib/auth-utils';
import { getPremiumStatus } from '@/lib/premium/premium-service';
import {
  DEFAULT_MENU_THEME,
  canUseMenuTheme,
  isMenuThemeId,
  listMenuThemes,
  pickRandomMenuTheme,
  resolveMenuTheme,
  type MenuThemeId,
} from '@/lib/ui/menuThemes';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function noStoreJson(body: unknown, init?: ResponseInit) {
  const response = NextResponse.json(body, init);
  response.headers.set('Cache-Control', 'private, no-store, no-cache, must-revalidate');
  return response;
}

async function loadUserTheme(dbUserId: number): Promise<MenuThemeId> {
  const { data } = await supabaseAdmin
    .from('_pidr_users')
    .select('menu_theme')
    .eq('id', dbUserId)
    .maybeSingle();

  const raw = data?.menu_theme;
  return isMenuThemeId(raw) ? raw : DEFAULT_MENU_THEME;
}

// GET /api/user/menu-theme
export async function GET(req: NextRequest) {
  try {
    const auth = requireAuth(req);
    if (auth.error || !auth.userId) {
      return noStoreJson(
        { success: false, message: auth.error || 'Требуется авторизация' },
        { status: 401 }
      );
    }

    const { dbUserId } = await getUserIdFromDatabase(auth.userId, auth.environment);
    if (!dbUserId) {
      return noStoreJson({ success: false, message: 'Пользователь не найден' }, { status: 404 });
    }

    const premium = await getPremiumStatus(Number(dbUserId));
    const themeId = await loadUserTheme(Number(dbUserId));
    const theme = resolveMenuTheme(themeId);

    return noStoreJson({
      success: true,
      themeId: theme.id,
      theme,
      isPremium: premium.isPremium,
      available: listMenuThemes({ includePremium: true }).map((t) => ({
        id: t.id,
        labelRu: t.labelRu,
        labelEn: t.labelEn,
        premium: t.premium,
        locked: t.premium && !premium.isPremium,
        vars: t.vars,
      })),
    });
  } catch (error: unknown) {
    console.error('❌ [menu-theme GET]', error);
    return noStoreJson({ success: false, message: 'Ошибка сервера' }, { status: 500 });
  }
}

// POST /api/user/menu-theme  { themeId?: string, action?: 'set' | 'generate' }
export async function POST(req: NextRequest) {
  try {
    const auth = requireAuth(req);
    if (auth.error || !auth.userId) {
      return noStoreJson(
        { success: false, message: auth.error || 'Требуется авторизация' },
        { status: 401 }
      );
    }

    const { dbUserId } = await getUserIdFromDatabase(auth.userId, auth.environment);
    if (!dbUserId) {
      return noStoreJson({ success: false, message: 'Пользователь не найден' }, { status: 404 });
    }

    const body = await req.json().catch(() => ({}));
    const action = body?.action === 'generate' ? 'generate' : 'set';
    const premium = await getPremiumStatus(Number(dbUserId));

    let nextThemeId: MenuThemeId;
    if (action === 'generate') {
      nextThemeId = pickRandomMenuTheme(premium.isPremium);
    } else {
      const requested = body?.themeId;
      if (!isMenuThemeId(requested)) {
        return noStoreJson({ success: false, message: 'Некорректная тема' }, { status: 400 });
      }
      if (!canUseMenuTheme(requested, premium.isPremium)) {
        return noStoreJson(
          {
            success: false,
            requiresPremium: true,
            message: 'Эта тема доступна только с Premium',
          },
          { status: 403 }
        );
      }
      nextThemeId = requested;
    }

    const { error } = await supabaseAdmin
      .from('_pidr_users')
      .update({
        menu_theme: nextThemeId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', dbUserId);

    if (error) {
      // Колонка может ещё не быть применена — мягкая ошибка с подсказкой
      console.error('❌ [menu-theme POST] update:', error);
      return noStoreJson(
        {
          success: false,
          message:
            'Не удалось сохранить тему. Примените scripts/sql/user-menu-theme.sql в Supabase.',
          dbError: error.message,
        },
        { status: 500 }
      );
    }

    const theme = resolveMenuTheme(nextThemeId);
    return noStoreJson({
      success: true,
      themeId: theme.id,
      theme,
      generated: action === 'generate',
      isPremium: premium.isPremium,
    });
  } catch (error: unknown) {
    console.error('❌ [menu-theme POST]', error);
    return noStoreJson({ success: false, message: 'Ошибка сервера' }, { status: 500 });
  }
}
