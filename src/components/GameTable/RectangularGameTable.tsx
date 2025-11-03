'use client'

import React from 'react';
import { motion } from 'framer-motion';
import styles from './RectangularGameTable.module.css';
import { Player } from '../../types/game';

interface RectangularGameTableProps {
  players: Player[];
  currentPlayerId: string | null;
  gameStage: 1 | 2 | 3;
  playedCards: any[];
  deckCount: number;
  onPlayerClick?: (playerId: string) => void;
  children?: React.ReactNode;
}

// Позиции игроков на прямоугольном столе
const getPlayerPosition = (index: number, totalPlayers: number, isCurrentPlayer: boolean = false) => {
  // Главный игрок (вы) всегда внизу по центру
  if (isCurrentPlayer || index === 0) {
    return {
      position: 'bottom-center' as const,
      style: {
        bottom: '20px',
        left: '50%',
        transform: 'translateX(-50%)',
      }
    };
  }

  // Распределяем остальных игроков
  const remainingPlayers = totalPlayers - 1;
  const adjustedIndex = index - 1;

  if (totalPlayers <= 4) {
    // Для 2-4 игроков: простое распределение
    const positions = [
      { position: 'top-center', style: { top: '20px', left: '50%', transform: 'translateX(-50%)' } }, // 1
      { position: 'left-center', style: { top: '50%', left: '20px', transform: 'translateY(-50%)' } }, // 2
      { position: 'right-center', style: { top: '50%', right: '20px', transform: 'translateY(-50%)' } }, // 3
    ];
    return positions[adjustedIndex] || positions[0];
  }

  // Для 5-9 игроков: 2 сверху, 3 слева, 3 справа
  if (adjustedIndex < 2) {
    // 2 игрока сверху
    return {
      position: 'top',
      style: {
        top: '20px',
        left: adjustedIndex === 0 ? '35%' : '65%',
        transform: 'translateX(-50%)',
      }
    };
  } else if (adjustedIndex < 5) {
    // 3 игрока слева (позиции 2, 3, 4)
    const leftIndex = adjustedIndex - 2;
    const leftPositions = ['25%', '50%', '75%'];
    return {
      position: 'left',
      style: {
        left: '20px',
        top: leftPositions[leftIndex],
        transform: 'translateY(-50%)',
      }
    };
  } else {
    // 3 игрока справа (позиции 5, 6, 7)
    const rightIndex = adjustedIndex - 5;
    const rightPositions = ['25%', '50%', '75%'];
    return {
      position: 'right',
      style: {
        right: '20px',
        top: rightPositions[rightIndex],
        transform: 'translateY(-50%)',
      }
    };
  }
};

const RectangularGameTable: React.FC<RectangularGameTableProps> = ({
  players,
  currentPlayerId,
  gameStage,
  playedCards,
  deckCount,
  onPlayerClick,
  children
}) => {
  const currentPlayerIndex = players.findIndex(p => p.isUser);
  
  return (
    <div className={styles.gameContainer}>
      {/* Игровой стол */}
      <motion.div 
        className={styles.gameTable}
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        {/* Фон стола с текстурой */}
        <div className={styles.tableBackground}>
          <div className={styles.tablePattern}></div>
          <div className={styles.tableBorder}></div>
        </div>

        {/* Центральная область стола */}
        <div className={styles.tableCenterArea}>
          {/* Колода карт */}
          <motion.div 
            className={styles.deck}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <div className={styles.deckStack}>
              <div className={styles.deckCard}></div>
              <div className={styles.deckCard}></div>
              <div className={styles.deckCard}></div>
            </div>
            <div className={styles.deckCount}>{deckCount}</div>
          </motion.div>

          {/* Область для сыгранных карт */}
          <div className={styles.playedCardsArea}>
            {playedCards.map((card, index) => (
              <motion.div
                key={`${card.suit}-${card.rank}-${index}`}
                className={styles.playedCard}
                initial={{ scale: 0, rotate: Math.random() * 20 - 10 }}
                animate={{ scale: 1, rotate: Math.random() * 10 - 5 }}
                transition={{ delay: index * 0.1 }}
                style={{
                  zIndex: index + 1,
                  transform: `translate(${Math.random() * 20 - 10}px, ${Math.random() * 20 - 10}px)`
                }}
              >
                <img 
                  src={`/img/cards/${card.suit}_${card.rank}.png`} 
                  alt={`${card.rank} of ${card.suit}`}
                  className={styles.cardImage}
                />
              </motion.div>
            ))}
          </div>

          {/* Индикатор стадии игры */}
          <div className={styles.gameStageIndicator}>
            <div className={styles.stageTitle}>Стадия {gameStage}</div>
            <div className={styles.stageDescription}>
              {gameStage === 1 && "Простые правила"}
              {gameStage === 2 && "Правила дурака"}
              {gameStage === 3 && "Открытие пеньков"}
            </div>
          </div>
        </div>

        {/* Игроки */}
        {players.map((player, index) => {
          const isCurrentPlayer = player.isUser;
          const isActivePlayer = player.id === currentPlayerId;
          const position = getPlayerPosition(index, players.length, isCurrentPlayer);
          
          return (
            <motion.div
              key={player.id}
              className={`${styles.playerSeat} ${isCurrentPlayer ? styles.currentPlayer : ''} ${isActivePlayer ? styles.activePlayer : ''}`}
              style={position.style}
              onClick={() => onPlayerClick?.(player.id)}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: index * 0.1 }}
              whileHover={{ scale: 1.05 }}
            >
              {/* Аватар игрока */}
              <div className={styles.playerAvatar}>
                <img 
                  src={player.avatar || '/avatars/default.png'} 
                  alt={player.name}
                  className={styles.avatarImage}
                />
                {isActivePlayer && (
                  <div className={styles.turnIndicator}>
                    <div className={styles.turnPulse}></div>
                  </div>
                )}
              </div>

              {/* Информация об игроке */}
              <div className={styles.playerInfo}>
                <div className={styles.playerName}>{player.name}</div>
                <div className={styles.playerStats}>
                  <span className={styles.cardCount}>{player.cards.length} карт</span>
                </div>
              </div>

              {/* Карты игрока (для неосновных игроков показываем рубашки) */}
              {!isCurrentPlayer && (
                <div className={`${styles.playerCards} ${position.position === 'left' ? styles.playerCardsLeft : position.position === 'right' ? styles.playerCardsRight : ''}`}>
                  {player.cards.slice(0, Math.min(3, player.cards.length)).map((_, cardIndex) => (
                    <div 
                      key={cardIndex}
                      className={styles.playerCard}
                      style={{
                        zIndex: cardIndex,
                        transform: `translateX(${(position.position === 'right' ? -cardIndex : cardIndex) * 3}px) rotate(${(cardIndex - 1) * 5}deg)`
                      }}
                    >
                      <img 
                        src="/img/cards/back.png" 
                        alt="Card back"
                        className={styles.cardBackImage}
                      />
                    </div>
                  ))}
                  {player.cards.length > 3 && (
                    <div className={styles.moreCards}>+{player.cards.length - 3}</div>
                  )}
                </div>
              )}

              {/* Статус игрока - УДАЛЕНО, Player не имеет status */}
            </motion.div>
          );
        })}

        {/* Дополнительный контент (например, карты игрока) */}
        {children}
      </motion.div>

      {/* Эффекты и анимации */}
      <div className={styles.tableEffects}>
        {/* Световые эффекты */}
        <div className={styles.ambientLight}></div>
        <div className={styles.tableGlow}></div>
      </div>
    </div>
  );
};

export default RectangularGameTable;
