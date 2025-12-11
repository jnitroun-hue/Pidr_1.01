'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Users, Crown, CheckCircle, XCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface RoomInviteModalProps {
  isOpen: boolean;
  roomId: string;
  roomCode: string;
  onClose: () => void;
  onJoin: () => void;
}

interface RoomInfo {
  id: string;
  roomCode: string;
  name: string;
  status: string;
  maxPlayers: number;
  currentPlayers: number;
}

interface HostInfo {
  telegramId: number;
  username: string;
  firstName: string;
  avatarUrl?: string;
  status: string;
}

export default function RoomInviteModal({
  isOpen,
  roomId,
  roomCode,
  onClose,
  onJoin
}: RoomInviteModalProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [roomInfo, setRoomInfo] = useState<RoomInfo | null>(null);
  const [hostInfo, setHostInfo] = useState<HostInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [joining, setJoining] = useState(false);

  useEffect(() => {
    if (isOpen && roomId && roomCode) {
      loadRoomInfo();
    }
  }, [isOpen, roomId, roomCode]);

  const loadRoomInfo = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/rooms/invite-info?roomId=${roomId}&roomCode=${roomCode}`);
      const data = await response.json();

      if (!data.success) {
        setError(data.message || 'Ошибка загрузки информации о комнате');
        return;
      }

      setRoomInfo(data.room);
      setHostInfo(data.host);
    } catch (err: any) {
      console.error('❌ Ошибка загрузки информации о комнате:', err);
      setError('Не удалось загрузить информацию о комнате');
    } finally {
      setLoading(false);
    }
  };

  const handleJoin = async () => {
    if (!roomInfo || !hostInfo) return;

    try {
      setJoining(true);

      // Переходим в лобби комнаты
      router.push(`/multiplayer?roomId=${roomId}&roomCode=${roomCode}`);
      onJoin();
    } catch (err: any) {
      console.error('❌ Ошибка присоединения к комнате:', err);
      setError('Не удалось присоединиться к комнате');
    } finally {
      setJoining(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 999999,
          padding: '20px'
        }}
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
          style={{
            background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #334155 100%)',
            borderRadius: '20px',
            padding: '32px',
            maxWidth: '400px',
            width: '100%',
            border: '2px solid rgba(99, 102, 241, 0.3)',
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)',
            position: 'relative'
          }}
        >
          {/* Кнопка закрытия */}
          <button
            onClick={onClose}
            style={{
              position: 'absolute',
              top: '16px',
              right: '16px',
              background: 'rgba(239, 68, 68, 0.2)',
              border: '2px solid rgba(239, 68, 68, 0.4)',
              borderRadius: '50%',
              width: '36px',
              height: '36px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: '#ef4444',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(239, 68, 68, 0.4)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(239, 68, 68, 0.2)';
            }}
          >
            <X size={20} />
          </button>

          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px 0' }}>
              <div style={{
                width: '48px',
                height: '48px',
                border: '4px solid rgba(99, 102, 241, 0.3)',
                borderTop: '4px solid #6366f1',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite',
                margin: '0 auto 16px'
              }}></div>
              <div style={{ color: '#94a3b8', fontSize: '16px' }}>Загрузка...</div>
              <style jsx>{`
                @keyframes spin {
                  0% { transform: rotate(0deg); }
                  100% { transform: rotate(360deg); }
                }
              `}</style>
            </div>
          ) : error ? (
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              <XCircle size={48} style={{ color: '#ef4444', margin: '0 auto 16px' }} />
              <div style={{ color: '#ef4444', fontSize: '18px', fontWeight: '700', marginBottom: '8px' }}>
                Ошибка
              </div>
              <div style={{ color: '#94a3b8', fontSize: '14px' }}>{error}</div>
              <motion.button
                onClick={onClose}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                style={{
                  marginTop: '24px',
                  padding: '12px 24px',
                  background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                  border: 'none',
                  borderRadius: '12px',
                  color: '#ffffff',
                  fontSize: '16px',
                  fontWeight: '700',
                  cursor: 'pointer'
                }}
              >
                Закрыть
              </motion.button>
            </div>
          ) : roomInfo && hostInfo ? (
            <>
              {/* Заголовок */}
              <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                <div style={{
                  fontSize: '24px',
                  fontWeight: '900',
                  background: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  marginBottom: '8px'
                }}>
                  🎮 Приглашение в игру
                </div>
                <div style={{ color: '#64748b', fontSize: '14px' }}>
                  Код комнаты: <span style={{ color: '#10b981', fontWeight: '700' }}>{roomInfo.roomCode}</span>
                </div>
              </div>

              {/* Информация о хосте */}
              <div style={{
                background: 'rgba(99, 102, 241, 0.1)',
                borderRadius: '16px',
                padding: '20px',
                marginBottom: '20px',
                border: '2px solid rgba(99, 102, 241, 0.3)'
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  marginBottom: '12px'
                }}>
                  <div style={{
                    width: '56px',
                    height: '56px',
                    borderRadius: '50%',
                    background: hostInfo.avatarUrl
                      ? 'transparent'
                      : 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '24px',
                    overflow: 'hidden'
                  }}>
                    {hostInfo.avatarUrl ? (
                      <img
                        src={hostInfo.avatarUrl}
                        alt={hostInfo.username}
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover'
                        }}
                      />
                    ) : (
                      '👤'
                    )}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      marginBottom: '4px'
                    }}>
                      <Crown size={16} style={{ color: '#fbbf24' }} />
                      <div style={{
                        color: '#e2e8f0',
                        fontSize: '18px',
                        fontWeight: '700'
                      }}>
                        {hostInfo.firstName || hostInfo.username}
                      </div>
                    </div>
                    <div style={{
                      color: '#64748b',
                      fontSize: '14px'
                    }}>
                      @{hostInfo.username}
                    </div>
                  </div>
                  {hostInfo.status === 'online' ? (
                    <div style={{
                      padding: '6px 12px',
                      background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                      borderRadius: '12px',
                      color: '#ffffff',
                      fontSize: '12px',
                      fontWeight: '700',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}>
                      <div style={{
                        width: '6px',
                        height: '6px',
                        borderRadius: '50%',
                        background: '#ffffff',
                        animation: 'pulse 2s ease-in-out infinite'
                      }}></div>
                      Онлайн
                    </div>
                  ) : (
                    <div style={{
                      padding: '6px 12px',
                      background: 'rgba(100, 116, 139, 0.3)',
                      borderRadius: '12px',
                      color: '#94a3b8',
                      fontSize: '12px',
                      fontWeight: '700'
                    }}>
                      Офлайн
                    </div>
                  )}
                </div>
              </div>

              {/* Информация о комнате */}
              <div style={{
                background: 'rgba(15, 23, 42, 0.5)',
                borderRadius: '12px',
                padding: '16px',
                marginBottom: '24px',
                display: 'flex',
                alignItems: 'center',
                gap: '12px'
              }}>
                <Users size={20} style={{ color: '#6366f1' }} />
                <div style={{ flex: 1 }}>
                  <div style={{ color: '#94a3b8', fontSize: '12px', marginBottom: '4px' }}>
                    Игроков в комнате
                  </div>
                  <div style={{ color: '#e2e8f0', fontSize: '16px', fontWeight: '700' }}>
                    {roomInfo.currentPlayers} / {roomInfo.maxPlayers}
                  </div>
                </div>
              </div>

              {/* Кнопки */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <motion.button
                  onClick={handleJoin}
                  disabled={joining || hostInfo.status !== 'online'}
                  whileHover={!joining && hostInfo.status === 'online' ? { scale: 1.02 } : {}}
                  whileTap={!joining && hostInfo.status === 'online' ? { scale: 0.98 } : {}}
                  style={{
                    padding: '16px 24px',
                    background: hostInfo.status === 'online'
                      ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
                      : 'linear-gradient(135deg, #6b7280 0%, #4b5563 100%)',
                    border: 'none',
                    borderRadius: '12px',
                    color: '#ffffff',
                    fontSize: '16px',
                    fontWeight: '700',
                    cursor: hostInfo.status === 'online' && !joining ? 'pointer' : 'not-allowed',
                    opacity: hostInfo.status === 'online' && !joining ? 1 : 0.6,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px'
                  }}
                >
                  {joining ? (
                    <>
                      <div style={{
                        width: '16px',
                        height: '16px',
                        border: '2px solid rgba(255, 255, 255, 0.3)',
                        borderTop: '2px solid #ffffff',
                        borderRadius: '50%',
                        animation: 'spin 1s linear infinite'
                      }}></div>
                      Присоединение...
                    </>
                  ) : (
                    <>
                      <CheckCircle size={20} />
                      Присоединиться
                    </>
                  )}
                </motion.button>

                <motion.button
                  onClick={onClose}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  style={{
                    padding: '12px 24px',
                    background: 'transparent',
                    border: '2px solid rgba(239, 68, 68, 0.5)',
                    borderRadius: '12px',
                    color: '#ef4444',
                    fontSize: '16px',
                    fontWeight: '700',
                    cursor: 'pointer'
                  }}
                >
                  Отмена
                </motion.button>
              </div>

              {hostInfo.status !== 'online' && (
                <div style={{
                  marginTop: '16px',
                  padding: '12px',
                  background: 'rgba(239, 68, 68, 0.1)',
                  borderRadius: '12px',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  color: '#ef4444',
                  fontSize: '14px',
                  textAlign: 'center'
                }}>
                  ⚠️ Хост сейчас офлайн. Присоединение может быть недоступно.
                </div>
              )}
            </>
          ) : null}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

