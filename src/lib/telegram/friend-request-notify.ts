import { getSupabaseAdmin } from '@/lib/supabase';
import { ensureMutualFriendship } from '@/lib/friends/friend-links';

function appBaseUrl(): string {
  const raw = (
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.APP_URL ||
    process.env.NEXTAUTH_URL ||
    'https://www.pidr1-01.ru'
  )
    .trim()
    .replace(/\/$/, '');
  if (!raw) return '';
  if (/^https?:\/\//i.test(raw)) return raw.replace(/^http:\/\//i, 'https://');
  return `https://${raw}`;
}

function botToken(): string {
  return process.env.TELEGRAM_BOT_TOKEN || process.env.BOT_TOKEN || '';
}

function escapeHtml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export async function sendFriendRequestTelegram(params: {
  telegramId: string | number | null | undefined;
  fromName: string;
  fromUserId: number;
}): Promise<void> {
  const token = botToken();
  const baseUrl = appBaseUrl();
  const chatId = params.telegramId != null ? String(params.telegramId).trim() : '';
  if (!token || !chatId || !params.fromUserId) return;
  if (chatId.startsWith('-')) return;

  const name = escapeHtml(params.fromName || 'Игрок');
  const friendsUrl = baseUrl ? `${baseUrl}/friends` : '';

  try {
    const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: `👋 <b>${name}</b> хочет добавить вас в друзья.`,
        parse_mode: 'HTML',
        reply_markup: {
          inline_keyboard: [
            [
              { text: '✅ Принять', callback_data: `fr_accept:${params.fromUserId}` },
              { text: '❌ Отклонить', callback_data: `fr_decline:${params.fromUserId}` },
            ],
            ...(friendsUrl ? [[{ text: '👤 Открыть друзей', web_app: { url: friendsUrl } }]] : []),
          ],
        },
      }),
    });
    const data = await response.json().catch(() => null);
    if (!response.ok || data?.ok === false) {
      console.warn('⚠️ [friend-request] Telegram не доставил заявку:', data?.description || response.status);
    }
  } catch (error) {
    console.warn('⚠️ [friend-request] Ошибка отправки в Telegram:', error);
  }
}

async function resolveDbUserIdByTelegram(telegramUserId: number): Promise<number | null> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return null;
  const { data } = await supabase
    .from('_pidr_users')
    .select('id')
    .eq('telegram_id', String(telegramUserId))
    .maybeSingle();
  const id = Number(data?.id);
  return Number.isFinite(id) && id > 0 ? id : null;
}

export async function acceptFriendRequestFromTelegram(params: {
  fromUserId: number;
  telegramUserId: number;
}): Promise<{ ok: boolean; message: string }> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return { ok: false, message: 'Сервис временно недоступен' };
  const me = await resolveDbUserIdByTelegram(params.telegramUserId);
  if (!me || me === params.fromUserId) return { ok: false, message: 'Заявка не найдена' };
  await ensureMutualFriendship(supabase, me, params.fromUserId);
  return { ok: true, message: 'Вы теперь друзья' };
}

export async function declineFriendRequestFromTelegram(params: {
  fromUserId: number;
  telegramUserId: number;
}): Promise<{ ok: boolean; message: string }> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return { ok: false, message: 'Сервис временно недоступен' };
  const me = await resolveDbUserIdByTelegram(params.telegramUserId);
  if (!me) return { ok: false, message: 'Заявка не найдена' };
  await supabase
    .from('_pidr_friends')
    .delete()
    .eq('user_id', String(params.fromUserId))
    .eq('friend_id', String(me))
    .eq('status', 'pending');
  return { ok: true, message: 'Заявка отклонена' };
}
