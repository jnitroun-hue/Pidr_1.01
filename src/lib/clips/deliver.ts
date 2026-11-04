export async function sendClipToTelegram(telegramId: string, videoUrl: string, caption: string): Promise<string | null> {
  const token = process.env.TELEGRAM_BOT_TOKEN || process.env.BOT_TOKEN || '';
  if (!token) return 'Бот Telegram не настроен';
  const file = await fetch(videoUrl);
  if (!file.ok) return 'Kling отдал ссылку, но файл не скачался';
  const bytes = Buffer.from(await file.arrayBuffer());
  const form = new FormData();
  form.append('chat_id', telegramId);
  form.append('caption', caption.slice(0, 900));
  form.append('video', new Blob([new Uint8Array(bytes)], { type: 'video/mp4' }), 'clip.mp4');
  const response = await fetch(`https://api.telegram.org/bot${token}/sendVideo`, {
    method: 'POST',
    body: form,
  });
  const data = await response.json().catch(() => null);
  if (response.ok && data?.ok !== false) return null;
  const description = String(data?.description || response.status);
  if (/blocked|initiate|chat not found|bot can't/i.test(description)) {
    return 'Напиши боту /start. Иначе Telegram не пускает видео в личные сообщения.';
  }
  return description;
}
