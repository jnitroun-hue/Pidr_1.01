'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { fetchWithAuth } from '@/lib/api-headers';
import RoomInviteModal from './RoomInviteModal';

interface InviteInfo {
  id: number;
  room: {
    id: number;
    room_code: string;
    name: string;
    status: string;
    max_players: number;
    current_players: number;
  } | null;
  from: {
    telegram_id: number;
    username: string | null;
    first_name: string | null;
    avatar_url?: string | null;
    status?: string | null;
    is_online?: boolean;
  } | null;
}

const DISMISSED_KEY = 'dismissed_room_invites';

function loadDismissedInviteIds(): Set<number> {
  try {
    const raw = sessionStorage.getItem(DISMISSED_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw) as number[];
    return new Set(parsed.filter((id) => Number.isFinite(id)));
  } catch {
    return new Set();
  }
}

function persistDismissedInviteIds(ids: Set<number>) {
  try {
    sessionStorage.setItem(DISMISSED_KEY, JSON.stringify([...ids].slice(-50)));
  } catch {
    // ignore quota errors
  }
}

function isAlreadyInRoom(roomId: number): boolean {
  if (typeof window === 'undefined') return false;
  const { pathname, search } = window.location;
  if (!pathname.includes('/multiplayer')) return false;
  const params = new URLSearchParams(search);
  return params.get('roomId') === String(roomId);
}

export default function GlobalRoomInviteListener() {
  const [activeInvite, setActiveInvite] = useState<InviteInfo | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const dismissedRef = useRef<Set<number>>(loadDismissedInviteIds());
  const isModalOpenRef = useRef(false);

  useEffect(() => {
    isModalOpenRef.current = isModalOpen;
  }, [isModalOpen]);

  const dismissInvite = useCallback(async (inviteId: number) => {
    dismissedRef.current.add(inviteId);
    persistDismissedInviteIds(dismissedRef.current);
    try {
      await fetchWithAuth('/api/friends/invites/dismiss', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invite_id: inviteId }),
      });
    } catch {
      // локальный кэш уже скрывает повтор
    }
  }, []);

  const handleClose = useCallback(() => {
    if (activeInvite?.id) {
      void dismissInvite(activeInvite.id);
    }
    setIsModalOpen(false);
    setActiveInvite(null);
  }, [activeInvite?.id, dismissInvite]);

  const handleJoin = useCallback(() => {
    if (activeInvite?.id) {
      void dismissInvite(activeInvite.id);
    }
    setIsModalOpen(false);
    setActiveInvite(null);
  }, [activeInvite?.id, dismissInvite]);

  useEffect(() => {
    const pollInvites = async () => {
      try {
        if (isModalOpenRef.current) return;

        const response = await fetchWithAuth('/api/friends/invites', {
          method: 'GET',
          cache: 'no-store',
        });

        if (!response.ok) return;

        const data = await response.json();
        if (!data.success || !Array.isArray(data.invites) || data.invites.length === 0) {
          return;
        }

        const eligible = (data.invites as InviteInfo[]).filter(
          (invite) => invite.room?.id && !dismissedRef.current.has(invite.id)
        );

        if (eligible.length === 0) return;

        const invite = eligible[0];
        const roomId = invite.room?.id;
        if (!roomId || !invite.room?.room_code) return;

        if (isAlreadyInRoom(roomId)) {
          void dismissInvite(invite.id);
          return;
        }

        setActiveInvite(invite);
        setIsModalOpen(true);
      } catch {
        // игнорируем ошибки опроса
      }
    };

    pollInvites();
    const interval = setInterval(pollInvites, 5000);
    return () => clearInterval(interval);
  }, [dismissInvite]);

  if (!activeInvite?.room) return null;

  const room = activeInvite.room;
  const host = activeInvite.from;

  return (
    <RoomInviteModal
      isOpen={isModalOpen}
      roomId={String(room.id)}
      roomCode={room.room_code}
      prefillRoom={{
        id: String(room.id),
        roomCode: room.room_code,
        name: room.name,
        status: room.status,
        maxPlayers: room.max_players,
        currentPlayers: room.current_players,
      }}
      prefillHost={
        host
          ? {
              telegramId: Number(host.telegram_id) || 0,
              username: host.username || host.first_name || 'host',
              firstName: host.first_name || host.username || 'Хост',
              avatarUrl: host.avatar_url || undefined,
              status: host.status || (host.is_online ? 'online' : 'offline'),
              isOnline: host.is_online ?? host.status !== 'offline',
            }
          : undefined
      }
      onClose={handleClose}
      onJoin={handleJoin}
    />
  );
}
