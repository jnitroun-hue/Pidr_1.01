'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, User, CheckCircle, AlertCircle } from 'lucide-react';

interface Friend {
  telegram_id: string;
  username?: string;
  first_name?: string;
  avatar_url?: string;
  status?: string;
}

interface InviteFriendsModalProps {
  isOpen: boolean;
  onClose: () => void;
  roomId: string;
  roomCode: string;
}

export default function InviteFriendsModal({
  isOpen,
  onClose,
  roomId,
  roomCode
}: InviteFriendsModalProps) {
  const [friends, setFriends] = useState<Friend[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviting, setInviting] = useState<string | null>(null);
  const [invited, setInvited] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadFriends();
    }
  }, [isOpen]);

  const loadFriends = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const telegramUser = typeof window !== 'undefined' && (window as any).Telegram?.WebApp?.initDataUnsafe?.user;
      
      if (!telegramUser) {
        setError('Пользователь не найден');
        return;
      }

      const response = await fetch('/api/friends/list', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'x-telegram-id': telegramUser.id.toString(),
          'x-username': telegramUser.username || telegramUser.first_name || 'User'
        }
      });

      if (!response.ok) {
        throw new Error('Ошибка загрузки друзей');
      }

      const result = await response.json();
      if (result.success) {
        setFriends(result.friends || []);
      } else {
        setError(result.error || 'Ошибка загрузки друзей');
      }
    } catch (err: any) {
      console.error('❌ Ошибка загрузки друзей:', err);
      setError(err.message || 'Ошибка загрузки друзей');
    } finally {
      setLoading(false);
    }
  };

  const inviteFriend = async (friendId: string) => {
    try {
      setInviting(friendId);
      setError(null);
      
      const telegramUser = typeof window !== 'undefined' && (window as any).Telegram?.WebApp?.initDataUnsafe?.user;
      
      if (!telegramUser) {
        setError('Пользователь не найден');
        return;
      }

      const response = await fetch(`/api/rooms/${roomId}/invite`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-telegram-id': telegramUser.id.toString(),
          'x-username': telegramUser.username || telegramUser.first_name || 'User'
        },
        body: JSON.stringify({ friendId })
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.message || 'Ошибка отправки приглашения');
      }

      const result = await response.json();
      if (result.success) {
        setInvited(prev => new Set([...prev, friendId]));
        // Вибрация для подтверждения
        if ((window as any).Telegram?.WebApp?.HapticFeedback) {
          (window as any).Telegram.WebApp.HapticFeedback.impactOccurred('medium');
        }
      } else {
        throw new Error(result.message || 'Ошибка отправки приглашения');
      }
    } catch (err: any) {
      console.error('❌ Ошибка приглашения друга:', err);
      setError(err.message || 'Ошибка отправки приглашения');
    } finally {
      setInviting(null);
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
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
          zIndex: 10000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
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
            backgroundColor: '#1e293b',
            borderRadius: '20px',
            padding: '24px',
            maxWidth: '500px',
            width: '100%',
            maxHeight: '80vh',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)'
          }}
        >
          {/* Заголовок */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '20px'
          }}>
            <h2 style={{
              color: '#ffffff',
              fontSize: '20px',
              fontWeight: 'bold',
              margin: 0
            }}>
              👥 Пригласить друзей
            </h2>
            <motion.button
              onClick={onClose}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              style={{
                background: 'none',
                border: 'none',
                color: '#94a3b8',
                cursor: 'pointer',
                padding: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <X size={24} />
            </motion.button>
          </div>

          {/* Информация о комнате */}
          <div style={{
            backgroundColor: '#0f172a',
            borderRadius: '12px',
            padding: '12px',
            marginBottom: '20px',
            border: '1px solid #334155'
          }}>
            <div style={{ color: '#94a3b8', fontSize: '12px', marginBottom: '4px' }}>
              Комната
            </div>
            <div style={{ color: '#ffffff', fontSize: '16px', fontWeight: 'bold' }}>
              {roomCode}
            </div>
          </div>

          {/* Ошибка */}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              style={{
                backgroundColor: '#7f1d1d',
                border: '1px solid #991b1b',
                borderRadius: '12px',
                padding: '12px',
                marginBottom: '16px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                color: '#fca5a5'
              }}
            >
              <AlertCircle size={16} />
              <span style={{ fontSize: '14px' }}>{error}</span>
            </motion.div>
          )}

          {/* Список друзей */}
          <div style={{
            flex: 1,
            overflowY: 'auto',
            marginBottom: '16px'
          }}>
            {loading ? (
              <div style={{
                textAlign: 'center',
                color: '#94a3b8',
                padding: '40px'
              }}>
                Загрузка друзей...
              </div>
            ) : friends.length === 0 ? (
              <div style={{
                textAlign: 'center',
                color: '#94a3b8',
                padding: '40px'
              }}>
                <User size={48} style={{ margin: '0 auto 16px', opacity: 0.5 }} />
                <div style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '8px' }}>
                  У вас пока нет друзей
                </div>
                <div style={{ fontSize: '14px' }}>
                  Добавьте друзей на странице друзей
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {friends.map((friend) => {
                  const isInvited = invited.has(friend.telegram_id);
                  const isInviting = inviting === friend.telegram_id;
                  
                  return (
                    <motion.div
                      key={friend.telegram_id}
                      whileHover={{ scale: 1.02 }}
                      style={{
                        backgroundColor: '#0f172a',
                        borderRadius: '12px',
                        padding: '12px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        border: '1px solid #334155'
                      }}
                    >
                      {/* Аватар */}
                      <div style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '50%',
                        backgroundColor: '#334155',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        overflow: 'hidden',
                        flexShrink: 0
                      }}>
                        {friend.avatar_url ? (
                          <img
                            src={friend.avatar_url}
                            alt={friend.username || friend.first_name}
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          />
                        ) : (
                          <User size={20} color="#94a3b8" />
                        )}
                      </div>

                      {/* Информация */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{
                          color: '#ffffff',
                          fontSize: '14px',
                          fontWeight: 'bold',
                          marginBottom: '4px',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap'
                        }}>
                          {friend.username || friend.first_name || 'Без имени'}
                        </div>
                        <div style={{
                          color: '#64748b',
                          fontSize: '12px'
                        }}>
                          {friend.status === 'online' ? '🟢 Онлайн' : '⚫ Офлайн'}
                        </div>
                      </div>

                      {/* Кнопка приглашения */}
                      {isInvited ? (
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          color: '#10b981',
                          fontSize: '12px',
                          fontWeight: 'bold'
                        }}>
                          <CheckCircle size={16} />
                          <span>Отправлено</span>
                        </div>
                      ) : (
                        <motion.button
                          onClick={() => inviteFriend(friend.telegram_id)}
                          disabled={isInviting}
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          style={{
                            padding: '8px 16px',
                            borderRadius: '8px',
                            border: 'none',
                            background: isInviting
                              ? '#334155'
                              : 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                            color: '#ffffff',
                            fontSize: '12px',
                            fontWeight: 'bold',
                            cursor: isInviting ? 'not-allowed' : 'pointer',
                            opacity: isInviting ? 0.6 : 1
                          }}
                        >
                          {isInviting ? 'Отправка...' : 'Пригласить'}
                        </motion.button>
                      )}
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Закрыть */}
          <motion.button
            onClick={onClose}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            style={{
              padding: '12px',
              borderRadius: '12px',
              border: '1px solid #334155',
              background: 'transparent',
              color: '#94a3b8',
              fontSize: '14px',
              fontWeight: 'bold',
              cursor: 'pointer'
            }}
          >
            Закрыть
          </motion.button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

