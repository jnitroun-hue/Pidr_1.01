'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import styles from './PlayerProfileModal.module.css';

interface PlayerProfileData {
  id: string;
  name: string;
  avatar: string;
  isBot: boolean;
  isUser?: boolean;
  // Статистика
  level?: number;
  rating?: number;
  gamesPlayed?: number;
  winRate?: number;
  bestStreak?: number;
  // Дополнительно
  status?: string;
  joinedDate?: string;
}

interface PlayerProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  playerData: PlayerProfileData | null;
  onAddFriend?: (playerId: string) => void;
}

export default function PlayerProfileModal({
  isOpen,
  onClose,
  playerData,
  onAddFriend
}: PlayerProfileModalProps) {
  if (!playerData) return null;

  const handleAddFriend = () => {
    if (onAddFriend && playerData.id) {
      onAddFriend(playerData.id);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Overlay */}
          <motion.div
            className={styles.overlay}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            className={styles.modal}
            initial={{ opacity: 0, scale: 0.8, y: 50 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 50 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          >
            {/* Header */}
            <div className={styles.header}>
              <h2 className={styles.title}>
                {playerData.isUser ? '👤 Ваш профиль' : '🎮 Профиль игрока'}
              </h2>
              <button className={styles.closeButton} onClick={onClose}>
                ✕
              </button>
            </div>

            {/* Avatar */}
            <div className={styles.avatarContainer}>
              <div className={styles.avatarWrapper}>
                {playerData.avatar ? (
                  <img 
                    src={playerData.avatar} 
                    alt={playerData.name}
                    className={styles.avatar}
                  />
                ) : (
                  <div className={styles.avatarPlaceholder}>👤</div>
                )}
                {playerData.isBot && (
                  <div className={styles.botBadge}>🤖 BOT</div>
                )}
                {playerData.isUser && (
                  <div className={styles.userBadge}>⭐ YOU</div>
                )}
              </div>
              <h3 className={styles.playerName}>{playerData.name}</h3>
              {playerData.status && (
                <p className={styles.status}>{playerData.status}</p>
              )}
            </div>

            {/* Stats Grid */}
            <div className={styles.statsGrid}>
              <div className={styles.statCard}>
                <div className={styles.statIcon}>🏆</div>
                <div className={styles.statValue}>{playerData.level || 1}</div>
                <div className={styles.statLabel}>Уровень</div>
              </div>

              <div className={styles.statCard}>
                <div className={styles.statIcon}>⭐</div>
                <div className={styles.statValue}>{playerData.rating || 0}</div>
                <div className={styles.statLabel}>Рейтинг</div>
              </div>

              <div className={styles.statCard}>
                <div className={styles.statIcon}>🎮</div>
                <div className={styles.statValue}>{playerData.gamesPlayed || 0}</div>
                <div className={styles.statLabel}>Игр</div>
              </div>

              <div className={styles.statCard}>
                <div className={styles.statIcon}>📊</div>
                <div className={styles.statValue}>
                  {playerData.winRate ? `${playerData.winRate}%` : '0%'}
                </div>
                <div className={styles.statLabel}>Побед</div>
              </div>
            </div>

            {/* Additional Info */}
            <div className={styles.additionalInfo}>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>🔥 Лучшая серия:</span>
                <span className={styles.infoValue}>{playerData.bestStreak || 0} побед</span>
              </div>
              {playerData.joinedDate && (
                <div className={styles.infoRow}>
                  <span className={styles.infoLabel}>📅 В игре с:</span>
                  <span className={styles.infoValue}>{playerData.joinedDate}</span>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className={styles.actions}>
              {playerData.isBot && !playerData.isUser && (
                <motion.button
                  className={styles.addFriendButton}
                  onClick={handleAddFriend}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <span className={styles.buttonIcon}>👥</span>
                  Добавить в друзья
                </motion.button>
              )}
              
              <motion.button
                className={styles.closeButtonBottom}
                onClick={onClose}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                Закрыть
              </motion.button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

