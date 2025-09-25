'use client'

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import RectangularGameTable from './RectangularGameTable';
import PlayerHand from './PlayerHand';
import { Player, Card } from '../../types/game';
import styles from './ProfessionalGameTable.module.css';

interface ProfessionalGameTableProps {
  players: Player[];
  currentPlayerId: string | null;
  gameStage: 1 | 2 | 3;
  playedCards: Card[];
  deckCount: number;
  onPlayerClick?: (playerId: string) => void;
  onCardSelect?: (index: number) => void;
  onCardPlay?: (index: number) => void;
  canPlayCard?: (card: Card, index: number) => boolean;
  selectedCardIndex?: number | null;
  gameActions?: {
    onTakeFromDeck?: () => void;
    onPassTurn?: () => void;
    onDeclareOneCard?: () => void;
  };
}

const ProfessionalGameTable: React.FC<ProfessionalGameTableProps> = ({
  players,
  currentPlayerId,
  gameStage,
  playedCards,
  deckCount,
  onPlayerClick,
  onCardSelect,
  onCardPlay,
  canPlayCard,
  selectedCardIndex,
  gameActions
}) => {
  const [showGameInfo, setShowGameInfo] = useState(false);
  const [notifications, setNotifications] = useState<Array<{id: string, message: string, type: 'info' | 'success' | 'warning' | 'error'}>>([]);
  
  // Находим текущего игрока (пользователя)
  const currentPlayer = players.find(p => p.isUser);
  const isPlayerTurn = currentPlayer?.id === currentPlayerId;
  
  // Добавление уведомлений
  const addNotification = (message: string, type: 'info' | 'success' | 'warning' | 'error' = 'info') => {
    const id = Date.now().toString();
    setNotifications(prev => [...prev, { id, message, type }]);
    
    // Автоматически убираем уведомление через 5 секунд
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, 5000);
  };

  // Обработчики для карт
  const handleCardSelect = (index: number) => {
    if (index === -1) {
      onCardSelect?.(-1); // Отмена выбора
    } else {
      onCardSelect?.(index);
    }
  };

  const handleCardPlay = (index: number) => {
    if (!currentPlayer || !isPlayerTurn) {
      addNotification('Сейчас не ваш ход!', 'warning');
      return;
    }

    const card = currentPlayer.hand[index];
    if (!canPlayCard?.(card, index)) {
      addNotification('Эту карту нельзя сыграть!', 'error');
      return;
    }

    onCardPlay?.(index);
    addNotification(`Сыграна карта: ${card.rank} ${card.suit}`, 'success');
  };

  const defaultCanPlayCard = (card: Card, index: number) => {
    // Базовая логика - можно играть любой картой если ваш ход
    return isPlayerTurn;
  };

  return (
    <div className={styles.gameContainer}>
      {/* Основной игровой стол */}
      <RectangularGameTable
        players={players}
        currentPlayerId={currentPlayerId}
        gameStage={gameStage}
        playedCards={playedCards}
        deckCount={deckCount}
        onPlayerClick={onPlayerClick}
      />

      {/* Рука игрока */}
      {currentPlayer && (
        <PlayerHand
          cards={currentPlayer.hand}
          selectedCardIndex={selectedCardIndex || null}
          onCardSelect={handleCardSelect}
          onCardPlay={handleCardPlay}
          canPlayCard={canPlayCard || defaultCanPlayCard}
          gameStage={gameStage}
          isPlayerTurn={isPlayerTurn}
        />
      )}

      {/* Игровые действия */}
      <div className={styles.gameActions}>
        <div className={styles.actionPanel}>
          {/* Основные действия */}
          <div className={styles.primaryActions}>
            {gameActions?.onTakeFromDeck && (
              <motion.button
                className={`${styles.actionButton} ${styles.deckAction}`}
                onClick={gameActions.onTakeFromDeck}
                disabled={!isPlayerTurn}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                🃏 Взять из колоды
              </motion.button>
            )}

            {gameActions?.onPassTurn && (
              <motion.button
                className={`${styles.actionButton} ${styles.passAction}`}
                onClick={gameActions.onPassTurn}
                disabled={!isPlayerTurn}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                ⏭️ Пропустить ход
              </motion.button>
            )}

            {gameActions?.onDeclareOneCard && currentPlayer?.hand.length === 1 && (
              <motion.button
                className={`${styles.actionButton} ${styles.oneCardAction}`}
                onClick={gameActions.onDeclareOneCard}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                animate={{ 
                  boxShadow: [
                    '0 0 20px rgba(255, 0, 0, 0.5)',
                    '0 0 30px rgba(255, 0, 0, 0.8)',
                    '0 0 20px rgba(255, 0, 0, 0.5)'
                  ]
                }}
                transition={{ repeat: Infinity, duration: 1 }}
              >
                ⚠️ ОДНА КАРТА!
              </motion.button>
            )}
          </div>

          {/* Информационная панель */}
          <div className={styles.infoPanel}>
            <button 
              className={styles.infoToggle}
              onClick={() => setShowGameInfo(!showGameInfo)}
            >
              ℹ️ Информация
            </button>
            
            <AnimatePresence>
              {showGameInfo && (
                <motion.div
                  className={styles.gameInfo}
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <div className={styles.gameStats}>
                    <div className={styles.stat}>
                      <span>Стадия:</span>
                      <span>{gameStage}/3</span>
                    </div>
                    <div className={styles.stat}>
                      <span>Игроков:</span>
                      <span>{players.length}</span>
                    </div>
                    <div className={styles.stat}>
                      <span>Карт в колоде:</span>
                      <span>{deckCount}</span>
                    </div>
                    <div className={styles.stat}>
                      <span>Сыграно карт:</span>
                      <span>{playedCards.length}</span>
                    </div>
                  </div>
                  
                  <div className={styles.currentTurn}>
                    {isPlayerTurn ? (
                      <span className={styles.yourTurn}>🎯 Ваш ход!</span>
                    ) : (
                      <span className={styles.waitingTurn}>
                        ⏳ Ход игрока: {players.find(p => p.id === currentPlayerId)?.name || 'Неизвестно'}
                      </span>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Уведомления */}
      <div className={styles.notifications}>
        <AnimatePresence>
          {notifications.map((notification) => (
            <motion.div
              key={notification.id}
              className={`${styles.notification} ${styles[notification.type]}`}
              initial={{ opacity: 0, y: -50, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -50, scale: 0.9 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
            >
              <div className={styles.notificationContent}>
                {notification.type === 'success' && '✅'}
                {notification.type === 'warning' && '⚠️'}
                {notification.type === 'error' && '❌'}
                {notification.type === 'info' && 'ℹ️'}
                <span>{notification.message}</span>
              </div>
              <button 
                className={styles.notificationClose}
                onClick={() => setNotifications(prev => prev.filter(n => n.id !== notification.id))}
              >
                ✕
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Эффекты и частицы */}
      <div className={styles.gameEffects}>
        {/* Частицы для атмосферы */}
        {Array.from({ length: 20 }).map((_, index) => (
          <div
            key={index}
            className={styles.particle}
            style={{
              left: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 10}s`,
              animationDuration: `${10 + Math.random() * 10}s`
            }}
          />
        ))}
      </div>
    </div>
  );
};

export default ProfessionalGameTable;
