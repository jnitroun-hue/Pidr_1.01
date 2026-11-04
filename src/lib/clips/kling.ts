const BASE = process.env.KLING_API_BASE || 'https://api-singapore.klingai.com';

export type ClipRequest = {
  prompt: string;
  duration: number;
  aspectRatio: '21:9' | '16:9' | '9:16' | '1:1';
  resolution: '720p' | '1080p';
  watermark: boolean;
  imageUrl?: string;
};

export type KlingTask = {
  id: string;
  status: string;
  message?: string;
  videoUrl?: string;
};

function key(): string {
  return process.env.KLING_API_KEY || '';
}

export function klingConfigured(): boolean {
  return Boolean(key());
}

async function kling(path: string, init?: RequestInit): Promise<{ code: number; message: string; data: unknown }> {
  const token = key();
  if (!token) throw new Error('KLING_API_KEY не задан');
  const response = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(init?.headers || {}),
    },
  });
  const body = await response.json().catch(() => null);
  if (!body || typeof body !== 'object') throw new Error(`Kling ответил ${response.status}`);
  return body as { code: number; message: string; data: unknown };
}

export async function createKlingClip(input: ClipRequest, externalId: string): Promise<string> {
  const payload: Record<string, unknown> = {
    prompt: input.prompt,
    settings: {
      duration: input.duration,
      resolution: input.resolution,
      aspect_ratio: input.aspectRatio,
    },
    options: {
      external_task_id: externalId,
      watermark_info: { enabled: input.watermark },
    },
  };
  if (input.imageUrl) {
    payload.contents = [{ type: 'refer_image', id: 'image_1', url: input.imageUrl }];
  }
  const body = await kling('/text-to-video/kling-4.0', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  const data = body.data as { id?: string } | null;
  if (body.code !== 0 || !data?.id) throw new Error(body.message || 'Kling не принял заявку');
  return data.id;
}

export async function readKlingClip(taskId: string): Promise<KlingTask> {
  const body = await kling(`/tasks?task_ids=${encodeURIComponent(taskId)}`);
  const row = Array.isArray(body.data) ? body.data[0] as {
    id?: string;
    status?: string;
    message?: string;
    outputs?: { type?: string; url?: string }[];
  } : null;
  if (body.code !== 0 || !row) throw new Error(body.message || 'Задача не найдена');
  const video = row.outputs?.find((item) => item.type === 'video' && item.url);
  return {
    id: row.id || taskId,
    status: row.status || 'processing',
    message: row.message,
    videoUrl: video?.url,
  };
}
