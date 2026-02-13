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
      side: 'bottom' as const,
      style: {
        bottom: '20px',
        left: '50%',
        transform: 'translateX(-50%)',
      }
    };
  }

  // Распределяем остальных игроков
  const adjustedIndex = index - 1;

  if (totalPlayers === 4) {
    // 4 игрока: 1 сверху, 1 справа, 1 слева, 1 внизу (главный)
    const positions = [
      { position: 'top-center' as const, side: 'top' as const, style: { top: '20px', left: '50%', transform: 'translateX(-50%)' } }, // 1: сверху
      { position: 'right-center' as const, side: 'right' as const, style: { top: '50%', right: '20px', transform: 'translateY(-50%)' } }, // 2: справа
      { position: 'left-center' as const, side: 'left' as const, style: { top: '50%', left: '20px', transform: 'translateY(-50%)' } }, // 3: слева
    ];
    return positions[adjustedIndex] || positions[0];
  }

  if (totalPlayers === 5) {
    // 5 игроков: 2 сверху, 1 справа, 1 слева, 1 внизу (главный)
    const positions = [
      { position: 'top' as const, side: 'top' as const, style: { top: '20px', left: '35%', transform: 'translateX(-50%)' } }, // 1: сверху слева
      { position: 'top' as const, side: 'top' as const, style: { top: '20px', left: '65%', transform: 'translateX(-50%)' } }, // 2: сверху справа
      { position: 'right-center' as const, side: 'right' as const, style: { top: '50%', right: '20px', transform: 'translateY(-50%)' } }, // 3: справа
      { position: 'left-center' as const, side: 'left' as const, style: { top: '50%', left: '20px', transform: 'translateY(-50%)' } }, // 4: слева
    ];
    return positions[adjustedIndex] || positions[0];
  }

  if (totalPlayers === 6) {
    // 6 игроков: 1 сверху, 2 справа, 2 слева, 1 внизу (главный)
    const positions = [
      { position: 'top-center' as const, side: 'top' as const, style: { top: '20px', left: '50%', transform: 'translateX(-50%)' } }, // 1: сверху
      { position: 'right' as const, side: 'right' as const, style: { top: '35%', right: '20px', transform: 'translateY(-50%)' } }, // 2: справа вверху
      { position: 'right' as const, side: 'right' as const, style: { top: '65%', right: '20px', transform: 'translateY(-50%)' } }, // 3: справа внизу
      { position: 'left' as const, side: 'left' as const, style: { top: '35%', left: '20px', transform: 'translateY(-50%)' } }, // 4: слева вверху
      { position: 'left' as const, side: 'left' as const, style: { top: '65%', left: '20px', transform: 'translateY(-50%)' } }, // 5: слева внизу
    ];
    return positions[adjustedIndex] || positions[0];
  }

  if (totalPlayers === 7) {
    // 7 игроков: 2 сверху, 2 слева, 2 справа, 1 внизу (главный)
    const positions = [
      { position: 'top' as const, side: 'top' as const, style: { top: '20px', left: '35%', transform: 'translateX(-50%)' } }, // 1: сверху слева
      { position: 'top' as const, side: 'top' as const, style: { top: '20px', left: '65%', transform: 'translateX(-50%)' } }, // 2: сверху справа
      { position: 'left' as const, side: 'left' as const, style: { top: '35%', left: '20px', transform: 'translateY(-50%)' } }, // 3: слева вверху
      { position: 'left' as const, side: 'left' as const, style: { top: '65%', left: '20px', transform: 'translateY(-50%)' } }, // 4: слева внизу
      { position: 'right' as const, side: 'right' as const, style: { top: '35%', right: '20px', transform: 'translateY(-50%)' } }, // 5: справа вверху
      { position: 'right' as const, side: 'right' as const, style: { top: '65%', right: '20px', transform: 'translateY(-50%)' } }, // 6: справа внизу
    ];
    return positions[adjustedIndex] || positions[0];
  }

  // Fallback для других количеств игроков (старая логика)
  if (adjustedIndex < 2) {
    // 2 игрока сверху (позиции 0, 1)
    return {
      position: 'top',
      side: 'top' as const,
      style: {
        top: '20px',
        left: adjustedIndex === 0 ? '30%' : '70%',
        transform: 'translateX(-50%)',
      }
    };
  } else if (adjustedIndex < 4) {
    // 2 игрока слева (позиции 2, 3)
    const leftIndex = adjustedIndex - 2;
    const leftPositions = ['30%', '70%'];
    return {
      position: 'left',
      side: 'left' as const,
      style: {
        left: '20px',
        top: leftPositions[leftIndex],
        transform: 'translateY(-50%)',
      }
    };
  } else {
    // 2 игрока справа (позиции 4, 5)
    const rightIndex = adjustedIndex - 4;
    const rightPositions = ['30%', '70%'];
    return {
      position: 'right',
      side: 'right' as const,
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
            {playedCards.map((card, index) => {
              // ✅ ПРОВЕРКА НА UNDEFINED
              if (!card.suit || !card.rank) {
                return null;
              }
              
              return (
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
              );
            })}
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
          
          // ✅ НОВОЕ: Определяем расположение карт относительно аватара
          const cardsOnLeft = position.side === 'right'; // Справа - карты слева от аватара
          const cardsOnRight = position.side === 'left'; // Слева - карты справа от аватара
          const cardsOnBottom = position.side === 'top'; // Сверху - карты снизу от аватара
          const isVerticalLayout = cardsOnBottom; // Вертикальная компоновка для игроков сверху
          
          return (
            <motion.div
              key={player.id}
              className={`${styles.playerSeat} ${isCurrentPlayer ? styles.currentPlayer : ''} ${isActivePlayer ? styles.activePlayer : ''}`}
              style={{
                ...position.style,
                flexDirection: isVerticalLayout ? 'column' : (cardsOnLeft ? 'row-reverse' : 'row'), // ✅ Вертикально для сверху, горизонтально для боков
              }}
              onClick={() => onPlayerClick?.(player.id)}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: index * 0.1 }}
              whileHover={{ scale: 1.05 }}
            >
              {/* Аватар игрока */}
              <div className={styles.playerAvatar} style={{ order: isVerticalLayout ? 1 : (cardsOnLeft ? 2 : 1) }}>
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
              <div className={styles.playerInfo} style={{ order: isVerticalLayout ? 2 : 1 }}>
                <div className={styles.playerName}>{player.name}</div>
                <div className={styles.playerStats}>
                  <span className={styles.cardCount}>{player.cards.length} карт</span>
                </div>
              </div>

              {/* ✅ КАРТЫ ОТНОСИТЕЛЬНО АВАТАРА */}
              {!isCurrentPlayer && (
                <div 
                  className={`${styles.playerCards} ${cardsOnLeft ? styles.playerCardsRight : ''} ${cardsOnRight ? styles.playerCardsLeft : ''}`}
                  style={{ 
                    order: isVerticalLayout ? 3 : (cardsOnLeft ? 1 : 2),
                    flexDirection: isVerticalLayout ? 'row' : 'row', // Горизонтально всегда для карт
                  }}
                >
                  {player.cards.slice(0, Math.min(3, player.cards.length)).map((_, cardIndex) => {
                    // ✅ ИСПРАВЛЕНО: Динамическое перекрытие - чем больше карт, тем ближе друг к другу
                    const totalCards = player.cards.length;
                    // Чем больше карт, тем меньше перекрытие (карты ближе друг к другу)
                    // Формула: базовое перекрытие уменьшается с ростом количества карт
                    const baseOverlap = 15; // Размер закрытой карты
                    const minOverlap = 3; // Минимальное перекрытие (px)
                    // Динамическое перекрытие: чем больше карт, тем меньше перекрытие
                    const dynamicOverlap = totalCards > 1 
                      ? Math.max(minOverlap, baseOverlap - (totalCards - 1) * 1.5) 
                      : 0;
                    const rotation = (cardIndex - 1) * 2; // Небольшой поворот для глубины
                    
                    return (
                      <div 
                        key={cardIndex}
                        className={styles.playerCard}
                        style={{
                          zIndex: cardIndex,
                          transform: cardsOnLeft 
                            ? `translateX(${-cardIndex * dynamicOverlap}px) rotate(${rotation}deg)`
                            : `translateX(${cardIndex * dynamicOverlap}px) rotate(${rotation}deg)`,
                          transition: 'all 0.2s ease',
                        }}
                      >
                        <img 
                          src="/img/cards/back.png" 
                          alt="Card back"
                          className={styles.cardBackImage}
                        />
                      </div>
                    );
                  })}
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
