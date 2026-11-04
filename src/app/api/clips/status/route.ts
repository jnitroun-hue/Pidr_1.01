import { NextRequest, NextResponse } from 'next/server';
import { getUserIdFromDatabase, requireAuth } from '@/lib/auth-utils';
import { sendClipToTelegram } from '@/lib/clips/deliver';
import { loadClipJob, saveClipJob } from '@/lib/clips/jobs';
import { readKlingClip } from '@/lib/clips/kling';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

function noStore(body: unknown, status = 200) {
  const response = NextResponse.json(body, { status });
  response.headers.set('Cache-Control', 'private, no-store');
  return response;
}

export async function GET(req: NextRequest) {
  const auth = requireAuth(req);
  if (auth.error || !auth.userId) return noStore({ success: false, error: auth.error || 'Нужно войти' }, 401);
  const taskId = req.nextUrl.searchParams.get('taskId') || '';
  if (!taskId || taskId.length > 80) return noStore({ success: false, error: 'Нет номера заявки' }, 400);

  const { dbUserId } = await getUserIdFromDatabase(auth.userId, auth.environment);
  const job = await loadClipJob(taskId);
  if (!job || job.dbUserId !== dbUserId) return noStore({ success: false, error: 'Заявка не твоя' }, 404);

  try {
    const task = await readKlingClip(taskId);
    if (task.status === 'succeeded' && task.videoUrl && !job.sent) {
      const delivery = await sendClipToTelegram(job.telegramId, task.videoUrl, job.prompt);
      if (!delivery) {
        job.sent = true;
        await saveClipJob(job);
      }
      return noStore({
        success: true,
        status: task.status,
        videoUrl: task.videoUrl,
        delivered: job.sent,
        error: delivery,
      });
    }
    return noStore({
      success: true,
      status: task.status,
      videoUrl: task.videoUrl || null,
      delivered: job.sent,
      error: task.status === 'failed' ? (task.message || 'Kling отклонил ролик') : null,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Не удалось спросить Kling';
    return noStore({ success: false, error: message }, 502);
  }
}
