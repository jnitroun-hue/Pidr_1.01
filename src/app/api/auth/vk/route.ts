import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createSession } from '@/lib/auth/redis-session-manager';

interface VKAccessTokenResponse {
  access_token?: string;
  user_id?: number;
  email?: string;
  error?: string;
  error_description?: string;
}

interface VKUser {
  id: number;
  first_name: string;
  last_name: string;
  photo_200?: string;
}

interface VKUsersGetResponse {
  response?: VKUser[];
  error?: { error_msg?: string };
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const vkClientId = process.env.NEXT_PUBLIC_VK_CLIENT_ID || '';
const vkClientSecret = process.env.VK_CLIENT_SECRET || '';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const code = String(body.code || '');
    const redirectUri = String(body.redirect_uri || '');

    if (!code || !redirectUri) {
      return NextResponse.json({ success: false, message: 'Missing code or redirect_uri' }, { status: 400 });
    }

    if (!vkClientId || !vkClientSecret) {
      return NextResponse.json(
        { success: false, message: 'VK OAuth is not configured on server' },
        { status: 500 }
      );
    }

    const tokenUrl = new URL('https://oauth.vk.com/access_token');
    tokenUrl.searchParams.set('client_id', vkClientId);
    tokenUrl.searchParams.set('client_secret', vkClientSecret);
    tokenUrl.searchParams.set('redirect_uri', redirectUri);
    tokenUrl.searchParams.set('code', code);

    const tokenRes = await fetch(tokenUrl.toString(), { method: 'GET' });
    const tokenData = (await tokenRes.json()) as VKAccessTokenResponse;

    if (!tokenRes.ok || tokenData.error || !tokenData.access_token || !tokenData.user_id) {
      return NextResponse.json(
        {
          success: false,
          message: tokenData.error_description || tokenData.error || 'Failed to exchange VK code',
        },
        { status: 401 }
      );
    }

    const usersGetUrl = new URL('https://api.vk.com/method/users.get');
    usersGetUrl.searchParams.set('access_token', tokenData.access_token);
    usersGetUrl.searchParams.set('fields', 'photo_200');
    usersGetUrl.searchParams.set('v', '5.199');

    const userRes = await fetch(usersGetUrl.toString(), { method: 'GET' });
    const userData = (await userRes.json()) as VKUsersGetResponse;

    const vkUser = userData.response?.[0];
    if (!userRes.ok || !vkUser || userData.error) {
      return NextResponse.json(
        {
          success: false,
          message: userData.error?.error_msg || 'Failed to fetch VK user profile',
        },
        { status: 401 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const vkId = String(vkUser.id);
    const email = tokenData.email || null;

    const { data: existingByVk } = await supabase
      .from('_pidr_users')
      .select('*')
      .eq('vk_id', vkId)
      .maybeSingle();

    let user = existingByVk;
    if (!user && email) {
      const { data: existingByEmail } = await supabase
        .from('_pidr_users')
        .select('*')
        .eq('email', email)
        .maybeSingle();
      user = existingByEmail;
    }

    const baseUpdate = {
      vk_id: vkId,
      first_name: vkUser.first_name,
      last_name: vkUser.last_name,
      avatar_url: vkUser.photo_200 || null,
      auth_method: 'vk',
      last_login_at: new Date().toISOString(),
      online_status: 'online',
      status: 'online',
      last_seen: new Date().toISOString(),
    };

    let isNewUser = false;
    if (!user) {
      isNewUser = true;
      const generatedUsername = `${vkUser.first_name}_${vkUser.last_name}_${vkId}`.toLowerCase().replace(/[^a-z0-9_]/g, '_');
      const { data: createdUser, error: createError } = await supabase
        .from('_pidr_users')
        .insert({
          ...baseUpdate,
          username: generatedUsername || `vk_${vkId}`,
          email,
          coins: 1000,
          rating: 0,
          login_count: 1,
          is_active: true,
        })
        .select()
        .single();

      if (createError || !createdUser) {
        return NextResponse.json({ success: false, message: 'Failed to create VK user' }, { status: 500 });
      }
      user = createdUser;
    } else {
      const { data: updatedUser, error: updateError } = await supabase
        .from('_pidr_users')
        .update({
          ...baseUpdate,
          login_count: (user.login_count || 0) + 1,
          ...(email ? { email } : {}),
        })
        .eq('id', user.id)
        .select()
        .single();

      if (updateError || !updatedUser) {
        return NextResponse.json({ success: false, message: 'Failed to update VK user' }, { status: 500 });
      }
      user = updatedUser;
    }

    const { token } = await createSession({
      userId: String(user.id),
      username: user.username,
      authMethod: 'vk',
      vkId,
      email: user.email || undefined,
      userAgent: request.headers.get('user-agent') || undefined,
      ip:
        request.headers.get('x-forwarded-for')?.split(',')[0] ||
        request.headers.get('x-real-ip') ||
        undefined,
    });

    const response = NextResponse.json({
      success: true,
      message: 'VK login successful',
      token,
      isNewUser,
      user: {
        id: user.id,
        username: user.username,
        first_name: user.first_name,
        last_name: user.last_name,
        vk_id: user.vk_id,
        email: user.email,
        coins: user.coins,
        rating: user.rating,
        avatar_url: user.avatar_url,
      },
    });

    const isProduction = process.env.NODE_ENV === 'production' || process.env.VERCEL === '1';
    response.cookies.set('auth_token', token, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60,
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('❌ [api/auth/vk] Error:', error);
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 });
  }
}
