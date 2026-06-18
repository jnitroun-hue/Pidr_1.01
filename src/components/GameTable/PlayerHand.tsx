'use client'

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { buildNftDeckKey } from '../../lib/game/cardAssets';
import styles from './PlayerHand.module.css';
import { Card } from '../../types/game';

interface PlayerHandProps {
  cards: Card[];
  selectedCardIndex: number | null;
  onCardSelect: (index: number) => void;
  onCardPlay: (index: number) => void;
  canPlayCard: (card: Card, index: number) => boolean;
  gameStage: 1 | 2 | 3;
  isPlayerTurn: boolean;
  nftDeckCards?: Record<string, string>; // ✅ НОВОЕ: NFT карты из колоды
}

const PlayerHand: React.FC<PlayerHandProps> = ({
  cards,
  selectedCardIndex,
  onCardSelect,
  onCardPlay,
  canPlayCard,
  gameStage,
  isPlayerTurn,
  nftDeckCards = {}
}) => {
  const maxVisibleCards = 8;
  const shouldScroll = cards.length > maxVisibleCards;

  return (
    <div className={styles.handContainer}>
      {/* Заголовок руки */}
      <div className={styles.handHeader}>
        <div className={styles.handTitle}>
          Ваши карты ({cards.length})
        </div>
        <div className={styles.gameStageInfo}>
          Стадия {gameStage}
          {!isPlayerTurn && <span className={styles.waitingIndicator}>Ожидание хода</span>}
        </div>
      </div>

      {/* Карты в руке */}
      <div className={`${styles.handCards} ${shouldScroll ? styles.scrollable : ''}`}>
        <AnimatePresence mode="popLayout">
          {cards.map((card, index) => {
            const isSelected = selectedCardIndex === index;
            const isPlayable = isPlayerTurn && canPlayCard(card, index);
            
            return (
              <motion.div
                key={`hand-${card.id || `${card.suit}-${card.rank}-${index}`}`} // ✅ УНИКАЛЬНЫЙ КЛЮЧ через card.id
                className={`${styles.handCard} ${isSelected ? styles.selected : ''} ${isPlayable ? styles.playable : ''} ${!isPlayerTurn ? styles.disabled : ''}`}
                initial={{ y: 100, opacity: 0, scale: 0.8 }}
                animate={{ 
                  y: isSelected ? -20 : 0, 
                  opacity: 1, 
                  scale: isSelected ? 1.1 : 1,
                  zIndex: isSelected ? 10 : 1
                }}
                exit={{ y: -100, opacity: 0, scale: 0.8 }}
                transition={{ 
                  type: "spring", 
                  stiffness: 300, 
                  damping: 25,
                  delay: index * 0.05
                }}
                whileHover={isPlayerTurn ? { 
                  y: isSelected ? -20 : -10, 
                  scale: isSelected ? 1.1 : 1.05,
                  transition: { duration: 0.2 }
                } : {}}
                onClick={() => {
                  if (!isPlayerTurn) return;
                  
                  if (isSelected) {
                    // Если карта уже выбрана, играем её
                    onCardPlay(index);
                  } else {
                    // Иначе выбираем карту
                    onCardSelect(index);
                  }
                }}
                style={{
                  marginLeft: shouldScroll ? '0' : `${index * -20}px`,
                }}
              >
                {/* Изображение карты */}
                <div className={styles.cardImageContainer}>
                  {/* ✅ НОВОЕ: Используем NFT карту если она есть в колоде */}
                  {(() => {
                    const cardRank = card.rank;
                    const cardSuit = card.suit;
                    const cardImage = card.image;

                    if (cardImage && (cardImage.startsWith('http://') || cardImage.startsWith('https://'))) {
                      return (
                        <img
                          src={cardImage}
                          alt="NFT Card"
                          className={styles.cardImage}
                          draggable={false}
                          style={{ objectFit: 'contain', background: '#ffffff' }}
                        />
                      );
                    }

                    if (!cardRank || !cardSuit) {
                      return (
                        <img
                          src={`/img/cards/back.png`}
                          alt="Card"
                          className={styles.cardImage}
                          draggable={false}
                        />
                      );
                    }

                    const nftKey = buildNftDeckKey(cardRank, cardSuit);
                    const nftImageUrl = nftKey ? nftDeckCards[nftKey] : undefined;
                    
                    return nftImageUrl ? (
                      <img
                        src={nftImageUrl}
                        alt={`${cardRank} of ${cardSuit}`}
                        className={styles.cardImage}
                        draggable={false}
                        style={{ objectFit: 'contain', background: '#ffffff' }}
                      />
                    ) : (
                      <img
                        src={`/img/cards/${cardSuit}_${cardRank}.png`}
                        alt={`${cardRank} of ${cardSuit}`}
                        className={styles.cardImage}
                        draggable={false}
                      />
                    );
                  })()}
                  
                  {/* Индикатор возможности хода */}
                  {isPlayable && (
                    <div className={styles.playableIndicator}>
                      <div className={styles.playablePulse}></div>
                    </div>
                  )}
                </div>

                {/* Информация о карте */}
                {card.rank && card.suit && (
                  <div className={styles.cardInfo}>
                    <div className={styles.cardRank}>{card.rank}</div>
                    <div className={styles.cardSuit}>
                      {card.suit === 'hearts' && '♥️'}
                      {card.suit === 'diamonds' && '♦️'}
                      {card.suit === 'clubs' && '♣️'}
                      {card.suit === 'spades' && '♠️'}
                    </div>
                  </div>
                )}

                {/* Подсказка для выбранной карты */}
                {isSelected && (
                  <motion.div 
                    className={styles.cardTooltip}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                  >
                    {isPlayable ? 'Нажмите еще раз чтобы сыграть' : 'Нельзя сыграть эту карту'}
                  </motion.div>
                )}
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Действия с картами */}
      <div className={styles.handActions}>
        {selectedCardIndex !== null && (
          <motion.div 
            className={styles.actionButtons}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
          >
            <button 
              className={`${styles.actionButton} ${styles.playButton}`}
              onClick={() => onCardPlay(selectedCardIndex)}
              disabled={!isPlayerTurn || !canPlayCard(cards[selectedCardIndex], selectedCardIndex)}
            >
              🃏 Сыграть карту
            </button>
            
            <button 
              className={`${styles.actionButton} ${styles.cancelButton}`}
              onClick={() => onCardSelect(-1)}
            >
              ❌ Отменить
            </button>
          </motion.div>
        )}

        {/* Подсказки по игре */}
        <div className={styles.gameHints}>
          {gameStage === 1 && (
            <div className={styles.hint}>
              💡 Стадия 1: Играйте картой на 1 ранг выше. Масти не важны.
            </div>
          )}
          {gameStage === 2 && (
            <div className={styles.hint}>
              💡 Стадия 2: Правила "Дурака". Пики бьются только пиками!
            </div>
          )}
          {gameStage === 3 && (
            <div className={styles.hint}>
              💡 Стадия 3: Используйте все доступные карты. Не забудьте объявить "Одна карта!"
            </div>
          )}
        </div>
      </div>

      {/* Прокрутка для большого количества карт */}
      {shouldScroll && (
        <div className={styles.scrollHint}>
          ← Прокрутите для просмотра всех карт →
        </div>
      )}
    </div>
  );
};

export default PlayerHand;
