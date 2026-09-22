import { getSupabaseAdmin } from '@/lib/supabase';

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
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

export async function sendRoomInviteTelegram(params: {
  telegramId: string | number | null | undefined;
  friendName: string;
  matchLabel: string;
  roomCode: string;
  roomId: number | string;
  inviteId: number;
}): Promise<void> {
  const token = botToken();
  const baseUrl = appBaseUrl();
  const chatId = params.telegramId != null ? String(params.telegramId).trim() : '';
  if (!token || !baseUrl || !chatId || !params.inviteId) return;

  const joinUrl = `${baseUrl}/multiplayer?roomId=${encodeURIComponent(String(params.roomId))}&roomCode=${encodeURIComponent(params.roomCode)}`;
  const name = escapeHtml(params.friendName || 'Друг');
  const mode = escapeHtml(params.matchLabel || 'Обычный');
  const code = escapeHtml(params.roomCode);

  const text =
    `🎮 <b>${name}</b> зовёт тебя поиграть\n\n` +
    `Режим: <b>${mode}</b>\n` +
    `Код комнаты: <code>${code}</code>\n\n` +
    `Кореш уже за столом. Заходи или откажись.`;

  try {
    const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: 'HTML',
        reply_markup: {
          inline_keyboard: [[
            { text: '✅ Присоединиться', web_app: { url: joinUrl } },
            { text: '❌ Отказаться', callback_data: `inv_decline:${params.inviteId}` },
          ]],
        },
      }),
    });
    const data = await response.json().catch(() => null);
    if (!response.ok || data?.ok === false) {
      console.warn('⚠️ [room-invite] Telegram не доставил приглашение:', data?.description || response.status);
    }
  } catch (error) {
    console.warn('⚠️ [room-invite] Ошибка отправки в Telegram:', error);
  }
}

export async function declineRoomInviteFromTelegram(params: {
  inviteId: number;
  telegramUserId: number;
}): Promise<{ ok: boolean; message: string }> {
  if (!Number.isFinite(params.inviteId) || params.inviteId <= 0) {
    return { ok: false, message: 'Приглашение не найдено' };
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) return { ok: false, message: 'Сервис временно недоступен' };

  const { data: invite } = await supabase
    .from('_pidr_room_invites')
    .select('id, to_user_id, status')
    .eq('id', params.inviteId)
    .maybeSingle();

  if (!invite) return { ok: false, message: 'Приглашение не найдено' };
  if (invite.status !== 'pending') return { ok: false, message: 'Приглашение уже закрыто' };

  const telegramId = String(params.telegramUserId);
  const { data: user } = await supabase
    .from('_pidr_users')
    .select('id, telegram_id')
    .eq('telegram_id', telegramId)
    .maybeSingle();

  if (!user) return { ok: false, message: 'Аккаунт не найден' };

  const allowed = new Set(
    [user.id, user.telegram_id].filter((value) => value != null).map((value) => String(value))
  );
  if (!allowed.has(String(invite.to_user_id))) {
    return { ok: false, message: 'Это приглашение не для вас' };
  }

  const { data: updated, error } = await supabase
    .from('_pidr_room_invites')
    .update({ status: 'declined' })
    .eq('id', params.inviteId)
    .eq('status', 'pending')
    .select('id')
    .maybeSingle();

  if (error || !updated) return { ok: false, message: 'Не удалось отказаться' };
  return { ok: true, message: 'Вы отказались от приглашения' };
}
