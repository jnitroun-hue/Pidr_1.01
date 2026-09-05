'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Trophy,
  Target,
  TrendingUp,
  Star,
  UserPlus,
  MessageCircleOff,
  MessageCircle,
  Crown,
  ShieldCheck,
} from 'lucide-react';
import PremiumAvatarFire from '@/components/PremiumAvatarFire';
import { PidrCoinAmount } from '@/components/PidrCoinIcon';

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
  coins?: number;
  isPremium?: boolean;
  onlineGamesPlayed?: number;
  onlineWins?: number;
  botGamesPlayed?: number;
  botWins?: number;
  firstPlaces?: number;
  secondPlaces?: number;
  thirdPlaces?: number;
  bestStreak?: number;
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
          background: 'rgba(2, 6, 23, 0.82)',
          backdropFilter: 'blur(14px)',
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
            background: 'var(--menu-card-bg, linear-gradient(145deg, #1e293b 0%, #0f172a 100%))',
            border: '1px solid var(--menu-card-border, rgba(59,130,246,.45))',
            borderRadius: '24px',
            padding: '24px',
            maxWidth: '460px',
            maxHeight: 'min(88vh, 88dvh)',
            overflowY: 'auto',
            width: '100%',
            position: 'relative',
            boxShadow: '0 28px 80px rgba(0,0,0,.58), var(--menu-shadow)',
          }}
        >
          <button
            type="button"
            onClick={onClose}
            style={{
              position: 'absolute',
              top: '20px',
              right: '20px',
              background: 'var(--menu-accent-soft, rgba(255,255,255,.1))',
              border: '1px solid var(--menu-card-border, transparent)',
              borderRadius: '12px',
              width: '38px',
              height: '38px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: 'var(--menu-text, #fff)',
            }}
          >
            <X size={24} />
          </button>

          <div style={{ textAlign: 'center', marginBottom: '25px' }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 8 }}>
              <PremiumAvatarFire size={72} active={!!player.isPremium}>
                <div
                  style={{
                    width: '100%',
                    height: '100%',
                    borderRadius: '50%',
                    overflow: 'hidden',
                    background: 'linear-gradient(135deg, var(--menu-accent), #0f172a)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {player.avatar &&
                  (player.avatar.startsWith('http') ||
                    player.avatar.startsWith('data:') ||
                    player.avatar.startsWith('/avatars/') ||
                    player.avatar.startsWith('/img/')) ? (
                    <img
                      src={player.avatar}
                      alt={player.name}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  ) : (
                    <span style={{ fontSize: '38px' }}>{player.avatar || '👤'}</span>
                  )}
                </div>
              </PremiumAvatarFire>
            </div>

            <h2
              style={{
                color: 'var(--menu-text, #fff)',
                fontSize: '25px',
                fontWeight: '850',
                marginBottom: '8px',
              }}
            >
              {player.name}
            </h2>

            <div style={{ display: 'flex', justifyContent: 'center', gap: 8, flexWrap: 'wrap' }}>
              {player.isPremium && (
                <span style={{
                  display: 'inline-flex', alignItems: 'center', gap: 5,
                  padding: '5px 9px', borderRadius: 999,
                  color: '#fde68a', background: 'rgba(245,197,24,.13)',
                  border: '1px solid rgba(245,197,24,.38)', fontSize: 11, fontWeight: 800,
                }}>
                  <Crown size={13} /> PREMIUM
                </span>
              )}
              {player.isSelf && (
                <span style={{
                  display: 'inline-flex', alignItems: 'center', gap: 5,
                  padding: '5px 9px', borderRadius: 999,
                  color: 'var(--menu-accent)', background: 'var(--menu-accent-soft)',
                  border: '1px solid var(--menu-card-border)', fontSize: 11, fontWeight: 800,
                }}>
                  <ShieldCheck size={13} /> ВАШ ПРОФИЛЬ
                </span>
              )}
            </div>

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
            <>
              {player.isSelf && player.coins != null && (
                <div style={{
                  marginTop: 18, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '11px 14px', borderRadius: 14,
                  background: 'var(--menu-accent-soft)', border: '1px solid var(--menu-card-border)',
                }}>
                  <span style={{ color: 'var(--menu-text-muted)', fontSize: 12, fontWeight: 700 }}>Игровой баланс</span>
                  <PidrCoinAmount value={player.coins} size={18} />
                </div>
              )}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
                  gap: '10px',
                  marginTop: '14px',
                }}
              >
                <StatCard icon={<TrendingUp size={18} />} label="Рейтинг" value={player.rating ?? 0} />
                <StatCard icon={<Target size={18} />} label="Игры" value={player.gamesPlayed ?? 0} />
                <StatCard icon={<Trophy size={18} />} label="Победы" value={player.wins ?? 0} />
                <StatCard icon={<Star size={18} />} label="Винрейт" value={`${winRate}%`} />
              </div>

              {player.isSelf && (
                <div style={{
                  marginTop: 10, padding: 12, borderRadius: 14,
                  background: 'rgba(2,6,23,.28)', border: '1px solid var(--menu-card-border)',
                }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                    <MiniMetric label="Онлайн" value={`${player.onlineWins ?? 0}/${player.onlineGamesPlayed ?? 0}`} />
                    <MiniMetric label="С ботами" value={`${player.botWins ?? 0}/${player.botGamesPlayed ?? 0}`} />
                    <MiniMetric label="Серия" value={player.bestStreak ?? 0} />
                  </div>
                  <div style={{
                    display: 'flex', justifyContent: 'center', gap: 12, marginTop: 11,
                    paddingTop: 10, borderTop: '1px solid var(--menu-card-border)',
                    color: 'var(--menu-text-muted)', fontSize: 11, fontWeight: 750,
                  }}>
                    <span>1 место: {player.firstPlaces ?? 0}</span>
                    <span>2 место: {player.secondPlaces ?? 0}</span>
                    <span>3 место: {player.thirdPlaces ?? 0}</span>
                  </div>
                </div>
              )}
            </>
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
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
}) {
  return (
    <div
      style={{
        background: 'color-mix(in srgb, var(--menu-accent-soft) 62%, rgba(2,6,23,.32))',
        border: '1px solid var(--menu-card-border)',
        borderRadius: '14px',
        padding: '12px',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-start',
          gap: '8px',
          marginBottom: '6px',
          color: 'var(--menu-accent)',
        }}
      >
        {icon}
        <span style={{ color: 'var(--menu-text-muted)', fontSize: '11px', fontWeight: '700' }}>{label}</span>
      </div>
      <div style={{ color: 'var(--menu-text)', fontSize: '22px', fontWeight: '850' }}>{value}</div>
    </div>
  );
}

function MiniMetric({ label, value }: { label: string; value: string | number }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ color: 'var(--menu-text)', fontSize: 14, fontWeight: 850 }}>{value}</div>
      <div style={{ color: 'var(--menu-text-muted)', fontSize: 10, marginTop: 2 }}>{label}</div>
    </div>
  );
}
