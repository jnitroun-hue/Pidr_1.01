import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { requireAuth, getUserIdFromDatabase } from '@/lib/auth-utils';
import { getPremiumStatus } from '@/lib/premium/premium-service';
import {
  DEFAULT_PREMIUM_FLAME,
  isPremiumFlameColorId,
  resolvePremiumFlame,
} from '@/lib/premium/flame';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function noStoreJson(body: unknown, init?: ResponseInit) {
  const response = NextResponse.json(body, init);
  response.headers.set('Cache-Control', 'private, no-store, no-cache, must-revalidate');
  return response;
}

async function loadFlame(dbUserId: number): Promise<string> {
  const { data, error } = await supabaseAdmin
    .from('_pidr_users')
    .select('premium_flame')
    .eq('id', dbUserId)
    .maybeSingle();
  if (error) return DEFAULT_PREMIUM_FLAME;
  return resolvePremiumFlame((data as { premium_flame?: string | null } | null)?.premium_flame);
}

export async function GET(req: NextRequest) {
  try {
    const auth = requireAuth(req);
    if (auth.error || !auth.userId) {
      return noStoreJson({ success: false, message: auth.error || 'Требуется авторизация' }, { status: 401 });
    }
    const { dbUserId } = await getUserIdFromDatabase(auth.userId, auth.environment);
    if (!dbUserId) {
      return noStoreJson({ success: false, message: 'Пользователь не найден' }, { status: 404 });
    }
    const premium = await getPremiumStatus(Number(dbUserId));
    const color = await loadFlame(Number(dbUserId));
    return noStoreJson({ success: true, color, isPremium: premium.isPremium });
  } catch (error: unknown) {
    console.error('❌ [premium-flame GET]', error);
    return noStoreJson({ success: false, message: 'Ошибка сервера' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = requireAuth(req);
    if (auth.error || !auth.userId) {
      return noStoreJson({ success: false, message: auth.error || 'Требуется авторизация' }, { status: 401 });
    }
    const { dbUserId } = await getUserIdFromDatabase(auth.userId, auth.environment);
    if (!dbUserId) {
      return noStoreJson({ success: false, message: 'Пользователь не найден' }, { status: 404 });
    }

    const premium = await getPremiumStatus(Number(dbUserId));
    if (!premium.isPremium) {
      return noStoreJson(
        { success: false, requiresPremium: true, message: 'Цвет пламени доступен только с Premium' },
        { status: 403 }
      );
    }

    const body = await req.json().catch(() => ({}));
    if (!isPremiumFlameColorId(body?.color)) {
      return noStoreJson({ success: false, message: 'Некорректный цвет пламени' }, { status: 400 });
    }

    const { error } = await supabaseAdmin
      .from('_pidr_users')
      .update({
        premium_flame: body.color,
        updated_at: new Date().toISOString(),
      })
      .eq('id', dbUserId);

    if (error) {
      console.error('❌ [premium-flame POST] update:', error);
      return noStoreJson({
        success: true,
        color: body.color,
        persisted: false,
        message: 'Цвет сохранён локально. Примените scripts/sql/user-premium-flame.sql в Supabase.',
      });
    }

    return noStoreJson({ success: true, color: body.color, persisted: true, isPremium: true });
  } catch (error: unknown) {
    console.error('❌ [premium-flame POST]', error);
    return noStoreJson({ success: false, message: 'Ошибка сервера' }, { status: 500 });
  }
}
