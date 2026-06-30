'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Trophy, Target, TrendingUp, Star, UserPlus, MessageCircleOff, MessageCircle } from 'lucide-react';

export interface PlayerProfileModalPlayer {
  name: string;
  avatar?: string;
  isBot?: boolean;
  isSelf?: boolean;
  rating?: number;
  gamesPlayed?: number;
  wins?: number;
  losses?: number;
  winRate?: number;
  isChatBlocked?: boolean;
  canAddFriend?: boolean;
  canBlockChat?: boolean;
  friendActionLabel?: string;
  friendActionDisabled?: boolean;
}

interface PlayerProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  player: PlayerProfileModalPlayer;
  onAddFriend?: () => void | Promise<void>;
  onToggleChatBlock?: () => void | Promise<void>;
}

export default function PlayerProfileModal({
  isOpen,
  onClose,
  player,
  onAddFriend,
  onToggleChatBlock,
}: PlayerProfileModalProps) {
  const [friendLoading, setFriendLoading] = useState(false);
  const [blockLoading, setBlockLoading] = useState(false);

  if (!isOpen) return null;

  const winRate =
    player.winRate ||
    (player.wins && player.gamesPlayed
      ? Math.round((player.wins / player.gamesPlayed) * 100)
      : 0);

  const runFriend = async () => {
    if (!onAddFriend || player.friendActionDisabled || friendLoading) return;
    setFriendLoading(true);
    try {
      await onAddFriend();
    } finally {
      setFriendLoading(false);
    }
  };

  const runBlock = async () => {
    if (!onToggleChatBlock || blockLoading) return;
    setBlockLoading(true);
    try {
      await onToggleChatBlock();
    } finally {
      setBlockLoading(false);
    }
  };

  const showActions =
    !player.isSelf && (player.canAddFriend || player.canBlockChat);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.85)',
          backdropFilter: 'blur(10px)',
          zIndex: 999999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px',
        }}
      >
        <motion.div
          initial={{ scale: 0.8, y: 50 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.8, y: 50 }}
          onClick={(e) => e.stopPropagation()}
          style={{
            background: 'linear-gradient(145deg, #1e293b 0%, #0f172a 100%)',
            border: '3px solid #3b82f6',
            borderRadius: '24px',
            padding: '30px',
            maxWidth: '420px',
            width: '100%',
            position: 'relative',
            boxShadow: '0 20px 60px rgba(59, 130, 246, 0.3)',
          }}
        >
          <button
            type="button"
            onClick={onClose}
            style={{
              position: 'absolute',
              top: '20px',
              right: '20px',
              background: 'rgba(255, 255, 255, 0.1)',
              border: 'none',
              borderRadius: '50%',
              width: '44px',
              height: '44px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: '#ffffff',
            }}
          >
            <X size={24} />
          </button>

          <div style={{ textAlign: 'center', marginBottom: '25px' }}>
            <div
              style={{
                width: '120px',
                height: '120px',
                margin: '0 auto',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '64px',
                border: '4px solid rgba(59, 130, 246, 0.3)',
                boxShadow: '0 10px 30px rgba(59, 130, 246, 0.4)',
                marginBottom: '15px',
                overflow: 'hidden',
              }}
            >
              {player.avatar &&
              (player.avatar.startsWith('http') || player.avatar.startsWith('data:')) ? (
                <img
                  src={player.avatar}
                  alt={player.name}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              ) : (
                <span style={{ fontSize: '64px' }}>{player.avatar || '👤'}</span>
              )}
            </div>

            <h2
              style={{
                color: '#ffffff',
                fontSize: '28px',
                fontWeight: 'black',
                marginBottom: '8px',
              }}
            >
              {player.name}
            </h2>

            {player.isBot && (
              <div
                style={{
                  display: 'inline-block',
                  background: 'linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%)',
                  padding: '6px 16px',
                  borderRadius: '20px',
                  fontSize: '13px',
                  fontWeight: 'bold',
                  color: '#ffffff',
                  marginTop: '8px',
                }}
              >
                🤖 БОТ
              </div>
            )}

            {player.isChatBlocked && (
              <div
                style={{
                  display: 'inline-block',
                  marginTop: '10px',
                  marginLeft: player.isBot ? '8px' : 0,
                  background: 'rgba(239, 68, 68, 0.15)',
                  border: '1px solid rgba(239, 68, 68, 0.45)',
                  padding: '6px 14px',
                  borderRadius: '20px',
                  fontSize: '12px',
                  fontWeight: '700',
                  color: '#fca5a5',
                }}
              >
                🔇 Чат скрыт
              </div>
            )}
          </div>

          {!player.isBot && (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: '15px',
                marginTop: '25px',
              }}
            >
              <StatCard icon={<TrendingUp size={20} color="#3b82f6" />} label="Рейтинг" value={player.rating || 1000} color="#3b82f6" />
              <StatCard icon={<Target size={20} color="#8b5cf6" />} label="Игры" value={player.gamesPlayed || 0} color="#8b5cf6" />
              <StatCard icon={<Trophy size={20} color="#22c55e" />} label="Победы" value={player.wins || 0} color="#22c55e" />
              <StatCard icon={<Star size={20} color="#fbbf24" />} label="Винрейт" value={`${winRate}%`} color="#fbbf24" />
            </div>
          )}

          {showActions && (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
                marginTop: '24px',
              }}
            >
              {player.canAddFriend && (
                <button
                  type="button"
                  onClick={() => void runFriend()}
                  disabled={friendLoading || player.friendActionDisabled}
                  style={{
                    width: '100%',
                    padding: '14px 16px',
                    borderRadius: '14px',
                    border: '2px solid rgba(34, 197, 94, 0.45)',
                    background: 'linear-gradient(135deg, rgba(34,197,94,0.25) 0%, rgba(22,163,74,0.15) 100%)',
                    color: '#ecfdf5',
                    fontSize: '15px',
                    fontWeight: '800',
                    cursor: player.friendActionDisabled ? 'not-allowed' : 'pointer',
                    opacity: player.friendActionDisabled ? 0.55 : 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '10px',
                  }}
                >
                  <UserPlus size={18} />
                  {friendLoading
                    ? 'Отправка...'
                    : player.friendActionLabel || 'Добавить в друзья'}
                </button>
              )}

              {player.canBlockChat && (
                <button
                  type="button"
                  onClick={() => void runBlock()}
                  disabled={blockLoading}
                  style={{
                    width: '100%',
                    padding: '14px 16px',
                    borderRadius: '14px',
                    border: player.isChatBlocked
                      ? '2px solid rgba(59, 130, 246, 0.45)'
                      : '2px solid rgba(239, 68, 68, 0.45)',
                    background: player.isChatBlocked
                      ? 'linear-gradient(135deg, rgba(59,130,246,0.25) 0%, rgba(37,99,235,0.15) 100%)'
                      : 'linear-gradient(135deg, rgba(239,68,68,0.22) 0%, rgba(220,38,38,0.12) 100%)',
                    color: '#fff',
                    fontSize: '15px',
                    fontWeight: '800',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '10px',
                  }}
                >
                  {player.isChatBlocked ? (
                    <>
                      <MessageCircle size={18} />
                      {blockLoading ? 'Сохранение...' : 'Разблокировать чат'}
                    </>
                  ) : (
                    <>
                      <MessageCircleOff size={18} />
                      {blockLoading ? 'Сохранение...' : 'Заблокировать чат'}
                    </>
                  )}
                </button>
              )}
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

function StatCard({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  color: string;
}) {
  return (
    <div
      style={{
        background: 'rgba(59, 130, 246, 0.1)',
        border: '2px solid rgba(59, 130, 246, 0.3)',
        borderRadius: '16px',
        padding: '16px',
        textAlign: 'center',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
          marginBottom: '8px',
        }}
      >
        {icon}
        <span style={{ color: '#94a3b8', fontSize: '13px', fontWeight: '600' }}>{label}</span>
      </div>
      <div style={{ color, fontSize: '28px', fontWeight: 'black' }}>{value}</div>
    </div>
  );
}
