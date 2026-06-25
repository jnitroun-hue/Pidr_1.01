import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { supabaseAdmin } from '../../../../lib/supabase';
import { requireAuth, getUserIdFromDatabase } from '../../../../lib/auth-utils';
import { resolveAuthMethod } from '@/lib/user/resolve-auth-method';
import { normalizeUserStats } from '@/lib/user/normalize-user-stats';
import { syncPremiumFlag } from '../../../../lib/premium/premium-service';

// ✅ Явная конфигурация runtime для Next.js 15
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

function noStoreJson(body: unknown, init?: ResponseInit) {
  const response = NextResponse.json(body, init);
  response.headers.set('Cache-Control', 'private, no-store, no-cache, must-revalidate');
  response.headers.set('Pragma', 'no-cache');
  response.headers.set('Expires', '0');
  return response;
}

// GET /api/user/me - Получить данные текущего пользователя (универсально для всех платформ)
export async function GET(req: NextRequest) {
  try {
    const auth = requireAuth(req);
    
    if (auth.error || !auth.userId) {
      return noStoreJson(
        { success: false, message: auth.error || 'Требуется авторизация' },
        { status: 401 }
      );
    }
    
    const { userId, environment } = auth;
    
    // Получаем пользователя из БД
    const { dbUserId, user: dbUser } = await getUserIdFromDatabase(userId, environment);
    
    if (!dbUserId || !dbUser) {
      return noStoreJson(
        { success: false, message: 'Пользователь не найден в БД' },
        { status: 404 }
      );
    }
    
    const user = dbUser;

    await syncPremiumFlag(Number(dbUserId));

    const { data: freshUser } = await supabaseAdmin
      .from('_pidr_users')
      .select('is_premium, premium_expires_at')
      .eq('id', dbUserId)
      .single();

    const premiumExpiresAt = freshUser?.premium_expires_at ?? user.premium_expires_at ?? null;
    const isPremiumFlag =
      freshUser?.is_premium ??
      (premiumExpiresAt ? new Date(premiumExpiresAt).getTime() > Date.now() : false);

    // Обновляем last_seen
    // ✅ ИСПРАВЛЕНО: Используем supabaseAdmin для обхода RLS
    await supabaseAdmin
      .from('_pidr_users')
      .update({
        last_seen: new Date().toISOString(),
        status: 'online'
      })
      .eq('id', dbUserId);

    const stats = normalizeUserStats(user);
    console.log(`📊 [API /user/me] Пользователь ${userId}: games=${stats.gamesPlayed}, wins=${stats.wins}`);

    // ✅ ЛОГИРОВАНИЕ: Проверяем что приходит из БД
    console.log(`📊 [API /user/me] Данные из БД:`, {
      id: user.id,
      username: user.username,
      first_name: user.first_name,
      email: user.email,
      telegram_id: user.telegram_id
    });

    return noStoreJson({
      success: true,
      user: {
        id: user.id,
        username: user.username, // ✅ Возвращаем username как есть из БД
        firstName: user.first_name,
        lastName: user.last_name,
        avatar_url: user.avatar_url,
        auth_method: resolveAuthMethod(user),
        telegramId: user.telegram_id,
        coins: user.coins,
        rating: user.rating,
        experience: user.experience || 0,
        games_played: stats.gamesPlayed,
        gamesPlayed: stats.gamesPlayed,
        games_won: stats.wins,
        wins: stats.wins,
        losses: stats.losses,
        best_win_streak: user.best_win_streak || 0,
        status: user.status,
        created_at: user.created_at,
        is_admin: user.is_admin || false,
        is_premium: isPremiumFlag,
        premium_expires_at: premiumExpiresAt,
      }
    });
  } catch (error: unknown) {
    return noStoreJson(
      { success: false, message: 'Ошибка сервера' },
      { status: 500 }
    );
  }
}

