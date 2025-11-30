'use client';

import { useEffect, useState } from 'react';
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
  } | null;
}

export default function GlobalRoomInviteListener() {
  const [activeInvite, setActiveInvite] = useState<InviteInfo | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    // Пуллим приглашения каждые 5 секунд
    const pollInvites = async () => {
      try {
        const tg = (window as any).Telegram?.WebApp;
        const user = tg?.initDataUnsafe?.user;
        if (!user?.id) return;

        const response = await fetch('/api/friends/invites', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'x-telegram-id': user.id.toString(),
            'x-username': user.username || user.first_name || 'User'
          },
          cache: 'no-store'
        });

        if (!response.ok) {
          return;
        }

        const data = await response.json();
        if (data.success && data.invites && data.invites.length > 0) {
          const firstInvite = data.invites[0] as InviteInfo;
          setActiveInvite(firstInvite);
          setIsModalOpen(true);
        }
      } catch {
        // игнорируем ошибки опроса
      }
    };

    // первый запуск
    pollInvites();
    const interval = setInterval(pollInvites, 5000);

    return () => clearInterval(interval);
  }, []);

  if (!activeInvite) return null;

  const roomId = String(activeInvite.room?.id || '');
  const roomCode = activeInvite.room?.room_code || '';

  if (!roomId || !roomCode) return null;

  return (
    <RoomInviteModal
      isOpen={isModalOpen}
      roomId={roomId}
      roomCode={roomCode}
      onClose={() => setIsModalOpen(false)}
      onJoin={() => setIsModalOpen(false)}
    />
  );
}


