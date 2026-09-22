'use client';

import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle, Crown, Users, X, XCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import styles from './RoomInviteModal.module.css';

interface RoomInviteModalProps {
  isOpen: boolean;
  roomId: string;
  roomCode: string;
  onClose: () => void;
  onJoin: () => void;
  prefillRoom?: RoomInfo;
  prefillHost?: HostInfo;
}

interface RoomInfo {
  id: string;
  roomCode: string;
  name: string;
  status: string;
  maxPlayers: number;
  currentPlayers: number;
  matchLabel?: string;
}

interface HostInfo {
  telegramId: number;
  username: string;
  firstName: string;
  avatarUrl?: string;
  status: string;
  isOnline?: boolean;
}

function hostCanJoin(host: HostInfo): boolean {
  if (host.isOnline === true) return true;
  return ['online', 'in_room', 'playing'].includes(host.status);
}

function hostStatusLabel(host: HostInfo, online: boolean): string {
  if (!online) return 'Офлайн';
  if (host.status === 'in_room') return 'В комнате';
  if (host.status === 'playing') return 'В игре';
  return 'Онлайн';
}

export default function RoomInviteModal({
  isOpen,
  roomId,
  roomCode,
  onClose,
  onJoin,
  prefillRoom,
  prefillHost,
}: RoomInviteModalProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(!prefillRoom || !prefillHost);
  const [roomInfo, setRoomInfo] = useState<RoomInfo | null>(prefillRoom ?? null);
  const [hostInfo, setHostInfo] = useState<HostInfo | null>(prefillHost ?? null);
  const [error, setError] = useState<string | null>(null);
  const [joining, setJoining] = useState(false);
  const prefillAppliedRef = useRef(false);

  useEffect(() => {
    if (!isOpen || !roomId || !roomCode) {
      prefillAppliedRef.current = false;
      return;
    }

    const hasPrefill = Boolean(prefillRoom && prefillHost);
    if (hasPrefill && !prefillAppliedRef.current) {
      setRoomInfo(prefillRoom!);
      setHostInfo(prefillHost!);
      setLoading(false);
      setError(null);
      prefillAppliedRef.current = true;
    }

    void loadRoomInfo(hasPrefill);
    // prefill применяем один раз при открытии; roomId/roomCode достаточно для refresh
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, roomId, roomCode]);

  const loadRoomInfo = async (hasPrefill: boolean) => {
    try {
      if (!hasPrefill) {
        setLoading(true);
        setError(null);
      }

      const response = await fetch(`/api/rooms/invite-info?roomId=${roomId}&roomCode=${roomCode}`);
      const data = await response.json();

      if (!data.success) {
        if (!hasPrefill) {
          setError(data.message || 'Ошибка загрузки информации о комнате');
        }
        return;
      }

      setRoomInfo(data.room);
      setHostInfo(data.host);
      setError(null);
    } catch (err: unknown) {
      console.error('❌ Ошибка загрузки информации о комнате:', err);
      if (!hasPrefill) {
        setError('Не удалось загрузить информацию о комнате');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleJoin = async () => {
    if (!roomInfo) return;

    try {
      setJoining(true);
      router.push(`/multiplayer?roomId=${roomId}&roomCode=${roomCode}`);
      onJoin();
    } catch (err: unknown) {
      console.error('❌ Ошибка присоединения к комнате:', err);
      setError('Не удалось присоединиться к комнате');
      setJoining(false);
    }
  };

  const hostName = hostInfo?.firstName || hostInfo?.username || 'Друг';
  const matchLabel = roomInfo?.matchLabel || 'Обычный';
  const hostOnline = hostInfo ? hostCanJoin(hostInfo) : false;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className={styles.overlay}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className={styles.card}
            initial={{ scale: 0.96, opacity: 0, y: 10 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.96, opacity: 0, y: 10 }}
            onClick={(event) => event.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="room-invite-title"
          >
            <button type="button" className={styles.close} onClick={onClose} aria-label="Закрыть">
              <X size={18} />
            </button>

            {loading ? (
              <div className={styles.center}>
                <div className={styles.spinner} />
                <div>Загрузка приглашения…</div>
              </div>
            ) : error ? (
              <div className={styles.center}>
                <XCircle size={40} color="#f87171" />
                <div className={styles.errorTitle}>Приглашение недоступно</div>
                <div className={styles.note}>{error}</div>
                <button type="button" className={styles.dismiss} onClick={onClose}>
                  Закрыть
                </button>
              </div>
            ) : roomInfo && hostInfo ? (
              <>
                <p className={styles.eyebrow}>Приглашение за стол</p>
                <h2 id="room-invite-title" className={styles.title}>
                  {hostName} зовёт поиграть
                </h2>
                <div className={styles.mode}>{matchLabel} режим</div>

                <div className={styles.host}>
                  <div className={styles.avatar}>
                    {hostInfo.avatarUrl ? (
                      <img src={hostInfo.avatarUrl} alt="" />
                    ) : (
                      '👤'
                    )}
                  </div>
                  <div>
                    <div className={styles.hostName}>
                      <Crown size={15} color="var(--menu-accent)" />
                      {hostName}
                    </div>
                    <div className={styles.hostUser}>@{hostInfo.username}</div>
                  </div>
                  <div className={`${styles.badge} ${hostOnline ? styles.badgeOnline : styles.badgeOffline}`}>
                    {hostStatusLabel(hostInfo, hostOnline)}
                  </div>
                </div>

                <div className={styles.meta}>
                  <div className={styles.metaItem}>
                    <div className={styles.metaLabel}>Комната</div>
                    <div className={styles.metaValue}>{roomInfo.roomCode}</div>
                  </div>
                  <div className={styles.metaItem}>
                    <div className={styles.metaLabel}>
                      <Users size={12} style={{ verticalAlign: 'middle', marginRight: 4 }} />
                      Игроки
                    </div>
                    <div className={styles.metaValue}>
                      {roomInfo.currentPlayers} / {roomInfo.maxPlayers}
                    </div>
                  </div>
                </div>

                <div className={styles.actions}>
                  <button
                    type="button"
                    className={styles.join}
                    onClick={() => void handleJoin()}
                    disabled={joining}
                  >
                    <CheckCircle size={18} />
                    {joining ? 'Входим…' : 'Присоединиться'}
                  </button>
                  <button type="button" className={styles.decline} onClick={onClose}>
                    Отказаться
                  </button>
                </div>
                {!hostOnline && (
                  <p className={styles.note}>
                    Хост сейчас не в сети, но комната ещё открыта — можно зайти.
                  </p>
                )}
              </>
            ) : null}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
