import { fetchWithAuth } from '@/lib/api-headers';

export type ChatBlocksState = {
  blockedUserIds: Set<number>;
  blockedPlayerKeys: Set<string>;
};

export function resolveChatBlockTarget(player: {
  dbUserId?: number | null;
  publicUserId?: string | number | null;
  id?: string;
}): { blockedUserId?: number; blockedPlayerKey?: string } {
  if (player.dbUserId != null && !Number.isNaN(Number(player.dbUserId))) {
    return { blockedUserId: Number(player.dbUserId) };
  }
  const key = player.publicUserId != null ? String(player.publicUserId) : player.id;
  if (key && key.trim() !== '') {
    return { blockedPlayerKey: key };
  }
  return {};
}

export async function fetchChatBlocksFromDb(): Promise<ChatBlocksState> {
  try {
    const resp = await fetchWithAuth('/api/chat/blocks', { method: 'GET', cache: 'no-store' });
    if (!resp.ok) {
      return { blockedUserIds: new Set(), blockedPlayerKeys: new Set() };
    }
    const data = await resp.json();
    if (!data.success) {
      return { blockedUserIds: new Set(), blockedPlayerKeys: new Set() };
    }
    return {
      blockedUserIds: new Set((data.blockedUserIds as number[]) || []),
      blockedPlayerKeys: new Set((data.blockedPlayerKeys as string[]) || []),
    };
  } catch {
    return { blockedUserIds: new Set(), blockedPlayerKeys: new Set() };
  }
}

export async function setChatBlockInDb(params: {
  blockedUserId?: number;
  blockedPlayerKey?: string;
  block: boolean;
}): Promise<boolean> {
  const resp = await fetchWithAuth('/api/chat/blocks', {
    method: 'POST',
    body: JSON.stringify({
      action: params.block ? 'block' : 'unblock',
      blockedUserId: params.blockedUserId,
      blockedPlayerKey: params.blockedPlayerKey,
    }),
  });
  const data = await resp.json();
  if (!resp.ok || !data.success) {
    throw new Error(data.error || 'Failed to update chat block');
  }
  return params.block;
}

export function isPlayerChatBlocked(
  blocks: ChatBlocksState,
  player: { id: string; dbUserId?: number | null; publicUserId?: string | null }
): boolean {
  if (player.dbUserId != null && blocks.blockedUserIds.has(Number(player.dbUserId))) {
    return true;
  }
  if (blocks.blockedPlayerKeys.has(player.id)) return true;
  if (player.publicUserId != null && blocks.blockedPlayerKeys.has(String(player.publicUserId))) {
    return true;
  }
  return false;
}
