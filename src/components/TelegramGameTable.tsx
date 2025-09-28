'use client'

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Player, Card } from '../types/game';
import '../styles/telegram-optimized.css';

interface TelegramGameTableProps {
  players: Player[];
  currentPlayerId: string | null;
  gameStage: 1 | 2 | 3;
  playedCards: Card[];
  deckCount: number;
  onPlayerClick?: (playerId: string) => void;
  onCardSelect?: (index: number) => void;
  onCardPlay?: (index: number) => void;
  onDeckClick?: () => void;
  canPlayCard?: (card: Card, index: number) => boolean;
  selectedCardIndex?: number | null;
  gameActions?: {
    onTakeFromDeck?: () => void;
    onPassTurn?: () => void;
    onDeclareOneCard?: () => void;
  };
}

// Haptic feedback helper
const triggerHaptic = (type: 'light' | 'medium' | 'heavy' = 'light') => {
  if (typeof window !== 'undefined' && window.Telegram?.WebApp?.HapticFeedback) {
    switch (type) {
      case 'light':
        window.Telegram.WebApp.HapticFeedback.impactOccurred('light');
        break;
      case 'medium':
        window.Telegram.WebApp.HapticFeedback.impactOccurred('medium');
        break;
      case 'heavy':
        window.Telegram.WebApp.HapticFeedback.impactOccurred('heavy');
        break;
    }
  }
};

// Player position calculator for mobile
const getPlayerPosition = (index: number, totalPlayers: number, isCurrentPlayer: boolean = false) => {
  if (isCurrentPlayer) {
    return 'position-bottom';
  }

  const remainingPlayers = totalPlayers - 1;
  const adjustedIndex = index - 1;

  if (totalPlayers <= 3) {
    return adjustedIndex === 0 ? 'position-top' : 'position-left';
  }

  if (totalPlayers === 4) {
    const positions = ['position-top', 'position-left', 'position-right'];
    return positions[adjustedIndex] || 'position-top';
  }

  // For 5+ players, distribute around the table
  if (adjustedIndex === 0) return 'position-top';
  if (adjustedIndex === 1) return 'position-left';
  if (adjustedIndex === 2) return 'position-right';
  
  // Additional players on sides
  return adjustedIndex % 2 === 0 ? 'position-right' : 'position-left';
};

const TelegramGameTable: React.FC<TelegramGameTableProps> = ({
  players,
  currentPlayerId,
  gameStage,
  playedCards,
  deckCount,
  onPlayerClick,
  onCardSelect,
  onCardPlay,
  onDeckClick,
  canPlayCard,
  selectedCardIndex,
  gameActions
}) => {
  const [notifications, setNotifications] = useState<Array<{
    id: string;
    message: string;
    type: 'success' | 'warning' | 'error' | 'info';
  }>>([]);

  const currentPlayer = players.find(p => p.isUser);
  const isPlayerTurn = currentPlayer?.id === currentPlayerId;

  // Add notification helper
  const addNotification = useCallback((message: string, type: 'success' | 'warning' | 'error' | 'info' = 'info') => {
    const id = Date.now().toString();
    setNotifications(prev => [...prev, { id, message, type }]);
    
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, 4000);
  }, []);

  // Handle card selection with haptic feedback
  const handleCardSelect = useCallback((index: number) => {
    triggerHaptic('light');
    onCardSelect?.(index);
  }, [onCardSelect]);

  // Handle card play with validation
  const handleCardPlay = useCallback((index: number) => {
    if (!currentPlayer || !isPlayerTurn) {
      triggerHaptic('heavy');
      addNotification('Сейчас не ваш ход!', 'warning');
      return;
    }

    const card = currentPlayer.hand[index];
    if (!canPlayCard?.(card, index)) {
      triggerHaptic('heavy');
      addNotification('Эту карту нельзя сыграть!', 'error');
      return;
    }

    triggerHaptic('medium');
    onCardPlay?.(index);
    addNotification(`Сыграна карта: ${card.rank} ${card.suit}`, 'success');
  }, [currentPlayer, isPlayerTurn, canPlayCard, onCardPlay, addNotification]);

  // Handle deck click
  const handleDeckClick = useCallback(() => {
    if (!isPlayerTurn) {
      triggerHaptic('heavy');
      addNotification('Сейчас не ваш ход!', 'warning');
      return;
    }
    
    triggerHaptic('medium');
    onDeckClick?.();
    gameActions?.onTakeFromDeck?.();
  }, [isPlayerTurn, onDeckClick, gameActions, addNotification]);

  // Stage descriptions
  const getStageDescription = (stage: number) => {
    switch (stage) {
      case 1: return 'Простые правила';
      case 2: return 'Правила дурака';
      case 3: return 'Открытие пеньков';
      default: return 'Игра';
    }
  };

  return (
    <div className="tg-game-container">
      {/* Game Header */}
      <div className="tg-game-header">
        <div className="tg-game-info">
          <div className="tg-stage-indicator">
            <span>🎮</span>
            <span>Стадия {gameStage}: {getStageDescription(gameStage)}</span>
          </div>
          <div className="tg-deck-count">
            🃏 {deckCount}
          </div>
        </div>
      </div>

      {/* Game Controls */}
      <div className="tg-game-controls">
        {gameActions?.onPassTurn && (
          <motion.button
            className="tg-control-btn warning"
            onClick={() => {
              triggerHaptic('medium');
              gameActions.onPassTurn?.();
            }}
            disabled={!isPlayerTurn}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            ⏭️ Пас
          </motion.button>
        )}

        {gameActions?.onDeclareOneCard && currentPlayer?.hand.length === 1 && (
          <motion.button
            className="tg-control-btn danger"
            onClick={() => {
              triggerHaptic('heavy');
              gameActions.onDeclareOneCard?.();
            }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            animate={{
              boxShadow: [
                '0 4px 16px rgba(0, 0, 0, 0.15)',
                '0 8px 24px rgba(236, 57, 66, 0.4)',
                '0 4px 16px rgba(0, 0, 0, 0.15)'
              ]
            }}
            transition={{ repeat: Infinity, duration: 1.5 }}
          >
            ⚠️ УНО!
          </motion.button>
        )}
      </div>

      {/* Main Table */}
      <div className="tg-table-container">
        <div className="tg-table-main">
          <div className="tg-table-felt"></div>

          {/* Center Play Area */}
          <div className="tg-center-area">
            {/* Deck */}
            <motion.div
              className="tg-deck-stack"
              onClick={handleDeckClick}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <div className="tg-deck-card"></div>
            </motion.div>

            {/* Played Cards Area */}
            <div className="tg-played-area">
              <AnimatePresence>
                {playedCards.map((card, index) => (
                  <motion.div
                    key={`${card.suit}-${card.rank}-${index}`}
                    className="tg-played-card"
                    initial={{ 
                      scale: 0,
                      rotation: Math.random() * 360,
                      opacity: 0 
                    }}
                    animate={{ 
                      scale: 1,
                      rotation: Math.random() * 20 - 10,
                      opacity: 1 
                    }}
                    exit={{ 
                      scale: 0,
                      opacity: 0 
                    }}
                    transition={{ delay: index * 0.1 }}
                    style={{
                      position: 'absolute',
                      zIndex: index + 1,
                      transform: `translate(${Math.random() * 20 - 10}px, ${Math.random() * 20 - 10}px)`
                    }}
                  >
                    <img 
                      src={`/cards/${card.suit}_${card.rank}.png`} 
                      alt={`${card.rank} of ${card.suit}`}
                      className="tg-card-image"
                      style={{ width: '60px', height: '84px', borderRadius: '6px' }}
                    />
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>

          {/* Players */}
          <div className="tg-players-container">
            {players.map((player, index) => {
              const isCurrentPlayer = player.isUser;
              const isActivePlayer = player.id === currentPlayerId;
              const positionClass = getPlayerPosition(index, players.length, isCurrentPlayer);
              
              return (
                <motion.div
                  key={player.id}
                  className={`tg-player-seat ${positionClass}`}
                  onClick={() => {
                    triggerHaptic('light');
                    onPlayerClick?.(player.id);
                  }}
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: index * 0.1 }}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <div className={`tg-player-avatar ${isActivePlayer ? 'active' : ''} ${isCurrentPlayer ? 'current' : ''}`}>
                    {player.avatar ? (
                      <img 
                        src={player.avatar} 
                        alt={player.name}
                        className="tg-avatar-image"
                      />
                    ) : (
                      <div style={{ 
                        fontSize: '20px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        height: '100%'
                      }}>
                        👤
                      </div>
                    )}
                    
                    {isActivePlayer && (
                      <motion.div
                        style={{
                          position: 'absolute',
                          top: '-2px',
                          right: '-2px',
                          width: '12px',
                          height: '12px',
                          background: '#4bb34b',
                          borderRadius: '50%',
                          border: '2px solid white'
                        }}
                        animate={{ scale: [1, 1.3, 1] }}
                        transition={{ repeat: Infinity, duration: 1.5 }}
                      />
                    )}
                  </div>

                  <div className="tg-player-name">{player.name}</div>
                  <div className="tg-player-cards-count">
                    🃏 {player.hand.length}
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Player Hand */}
      {currentPlayer && (
        <div className="tg-player-hand">
          <div className="tg-hand-cards">
            {currentPlayer.hand.map((card, index) => {
              const isSelected = selectedCardIndex === index;
              const isPlayable = canPlayCard?.(card, index) && isPlayerTurn;
              
              return (
                <motion.div
                  key={`${card.suit}-${card.rank}-${index}`}
                  className={`tg-card ${isSelected ? 'selected' : ''} ${isPlayable ? 'playable' : ''}`}
                  onClick={() => {
                    if (isSelected) {
                      handleCardPlay(index);
                    } else {
                      handleCardSelect(index);
                    }
                  }}
                  initial={{ y: 100, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: index * 0.05 }}
                  whileHover={{ y: -5 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <img 
                    src={`/cards/${card.suit}_${card.rank}.png`} 
                    alt={`${card.rank} of ${card.suit}`}
                    className="tg-card-image"
                  />
                </motion.div>
              );
            })}
          </div>
        </div>
      )}

      {/* Notifications */}
      <AnimatePresence>
        {notifications.map((notification) => (
          <motion.div
            key={notification.id}
            initial={{ opacity: 0, y: -50, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -50, scale: 0.8 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            style={{
              position: 'fixed',
              top: '80px',
              left: '50%',
              transform: 'translateX(-50%)',
              zIndex: 10030,
              background: notification.type === 'error' ? '#ec3942' :
                         notification.type === 'warning' ? '#f5a623' :
                         notification.type === 'success' ? '#4bb34b' : '#5288c1',
              color: 'white',
              padding: '12px 20px',
              borderRadius: '12px',
              fontSize: '14px',
              fontWeight: '600',
              boxShadow: '0 8px 24px rgba(0, 0, 0, 0.3)',
              backdropFilter: 'blur(10px)',
              maxWidth: '90%',
              textAlign: 'center'
            }}
          >
            {notification.message}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};

export default TelegramGameTable;
