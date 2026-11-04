import { NextRequest, NextResponse } from 'next/server';
import { getUserIdFromDatabase, requireAuth } from '@/lib/auth-utils';
import { createKlingClip, klingConfigured, type ClipRequest } from '@/lib/clips/kling';
import { saveClipJob } from '@/lib/clips/jobs';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const ASPECTS = new Set(['21:9', '16:9', '9:16', '1:1']);
const RESOLUTIONS = new Set(['720p', '1080p']);

function noStore(body: unknown, status = 200) {
  const response = NextResponse.json(body, { status });
  response.headers.set('Cache-Control', 'private, no-store');
  return response;
}

export async function POST(req: NextRequest) {
  const auth = requireAuth(req);
  if (auth.error || !auth.userId) return noStore({ success: false, error: auth.error || 'Нужно войти' }, 401);
  if (!klingConfigured()) return noStore({ success: false, error: 'На сервере не задан KLING_API_KEY' }, 503);

  const body = await req.json().catch(() => null);
  const prompt = String(body?.prompt || '').trim();
  const duration = Number(body?.duration);
  const aspectRatio = String(body?.aspectRatio || '');
  const resolution = String(body?.resolution || '');
  const watermark = body?.watermark === true;
  const imageUrl = String(body?.imageUrl || '').trim();

  if (prompt.length < 8 || prompt.length > 11000) {
    return noStore({ success: false, error: 'Текст запроса должен быть от 8 до 11000 знаков' }, 400);
  }
  if (!Number.isInteger(duration) || duration < 3 || duration > 30) {
    return noStore({ success: false, error: 'Длина ролика от 3 до 30 секунд' }, 400);
  }
  if (!ASPECTS.has(aspectRatio) || !RESOLUTIONS.has(resolution)) {
    return noStore({ success: false, error: 'Неверный кадр или разрешение' }, 400);
  }
  if (imageUrl && !/^https:\/\/\S+$/i.test(imageUrl)) {
    return noStore({ success: false, error: 'Картинка-референс должна быть https-ссылкой' }, 400);
  }

  const { dbUserId, user } = await getUserIdFromDatabase(auth.userId, auth.environment);
  const telegramId = user?.telegram_id != null ? String(user.telegram_id).trim() : '';
  if (!dbUserId || !telegramId || telegramId.startsWith('-')) {
    return noStore({ success: false, error: 'Ролик уходит в личные сообщения Telegram. Открой приложение из бота под своим аккаунтом.' }, 403);
  }

  const request: ClipRequest = {
    prompt: imageUrl && !prompt.includes('@image_1') ? `${prompt}\n@image_1` : prompt,
    duration,
    aspectRatio: aspectRatio as ClipRequest['aspectRatio'],
    resolution: resolution as ClipRequest['resolution'],
    watermark,
    imageUrl: imageUrl || undefined,
  };

  try {
    const externalId = `must-${dbUserId}-${Date.now()}`;
    const taskId = await createKlingClip(request, externalId);
    await saveClipJob({ taskId, dbUserId, telegramId, prompt, sent: false });
    return noStore({ success: true, taskId, status: 'submitted' });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Kling не принял заявку';
    return noStore({ success: false, error: message }, 502);
  }
}
