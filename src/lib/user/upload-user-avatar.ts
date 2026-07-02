import { supabaseAdmin } from '@/lib/supabase';
import { NFT_STORAGE_BUCKET } from '@/lib/nft/constants';

const AVATAR_PREFIX = 'avatars';
const MAX_AVATAR_BYTES = 5 * 1024 * 1024;

export function buildUserAvatarStoragePath(userId: number, ext: string): string {
  return `${AVATAR_PREFIX}/user-${userId}/avatar-${Date.now()}.${ext}`;
}

function mimeToExt(mime: string): string {
  if (mime === 'image/jpeg') return 'jpg';
  if (mime === 'image/webp') return 'webp';
  if (mime === 'image/gif') return 'gif';
  return 'png';
}

/** Data URL → Supabase Storage; http(s) URL возвращаем как есть. */
export async function resolveAvatarUrlForStorage(rawUrl: string, dbUserId: number): Promise<string> {
  const trimmed = rawUrl.trim();
  if (!trimmed.startsWith('data:')) {
    return trimmed;
  }

  const match = trimmed.match(/^data:(image\/[\w+.-]+);base64,(.+)$/);
  if (!match) {
    throw new Error('Неверный формат изображения');
  }

  const mime = match[1];
  const buffer = Buffer.from(match[2], 'base64');
  if (buffer.length > MAX_AVATAR_BYTES) {
    throw new Error('Файл слишком большой. Максимум 5MB');
  }

  const storagePath = buildUserAvatarStoragePath(dbUserId, mimeToExt(mime));
  const { error: uploadError } = await supabaseAdmin.storage.from(NFT_STORAGE_BUCKET).upload(storagePath, buffer, {
    contentType: mime,
    cacheControl: '86400',
    upsert: false,
  });

  if (uploadError) {
    throw new Error(`Не удалось сохранить аватар: ${uploadError.message}`);
  }

  const { data: urlData } = supabaseAdmin.storage.from(NFT_STORAGE_BUCKET).getPublicUrl(storagePath);
  if (!urlData?.publicUrl) {
    await supabaseAdmin.storage.from(NFT_STORAGE_BUCKET).remove([storagePath]);
    throw new Error('Не удалось получить публичный URL аватара');
  }

  return urlData.publicUrl;
}
