'use client'

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence, PanInfo } from 'framer-motion';
import { Card } from '../types/game';

interface TelegramPlayerHandProps {
  cards: Card[];
  selectedCardIndex: number | null;
  onCardSelect: (index: number) => void;
  onCardPlay: (index: number) => void;
  canPlayCard: (card: Card, index: number) => boolean;
  gameStage: 1 | 2 | 3;
  isPlayerTurn: boolean;
  maxVisibleCards?: number;
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

const TelegramPlayerHand: React.FC<TelegramPlayerHandProps> = ({
  cards,
  selectedCardIndex,
  onCardSelect,
  onCardPlay,
  canPlayCard,
  gameStage,
  isPlayerTurn,
  maxVisibleCards = 7
}) => {
  const [draggedCardIndex, setDraggedCardIndex] = useState<number | null>(null);
  const [playZoneActive, setPlayZoneActive] = useState(false);
  const handRef = useRef<HTMLDivElement>(null);

  // Calculate card spacing based on number of cards
  const getCardSpacing = () => {
    if (cards.length <= maxVisibleCards) {
      return 8; // Normal spacing
    }
    // Compress spacing for more cards
    const availableWidth = window.innerWidth - 32; // Account for padding
    const cardWidth = 85; // Mobile card width
    const totalCardsWidth = cards.length * cardWidth;
    
    if (totalCardsWidth > availableWidth) {
      return Math.max(2, (availableWidth - cardWidth) / (cards.length - 1) - cardWidth);
    }
    return 8;
  };

  // Handle card drag
  const handleDrag = useCallback((event: any, info: PanInfo, index: number) => {
    const dragY = info.offset.y;
    
    // Activate play zone when dragging up significantly
    if (dragY < -60 && !playZoneActive) {
      setPlayZoneActive(true);
      triggerHaptic('light');
    } else if (dragY > -40 && playZoneActive) {
      setPlayZoneActive(false);
    }
  }, [playZoneActive]);

  // Handle drag end
  const handleDragEnd = useCallback((event: any, info: PanInfo, index: number) => {
    const dragY = info.offset.y;
    setDraggedCardIndex(null);
    
    // If dragged up enough and can play card, play it
    if (dragY < -80 && canPlayCard(cards[index], index) && isPlayerTurn) {
      triggerHaptic('medium');
      onCardPlay(index);
    } else {
      triggerHaptic('light');
    }
    
    setPlayZoneActive(false);
  }, [cards, canPlayCard, isPlayerTurn, onCardPlay]);

  // Handle card tap
  const handleCardTap = useCallback((index: number) => {
    if (selectedCardIndex === index) {
      // Double tap to play
      if (canPlayCard(cards[index], index) && isPlayerTurn) {
        triggerHaptic('medium');
        onCardPlay(index);
      } else {
        triggerHaptic('heavy');
      }
    } else {
      // Select card
      triggerHaptic('light');
      onCardSelect(index);
    }
  }, [selectedCardIndex, cards, canPlayCard, isPlayerTurn, onCardPlay, onCardSelect]);

  // Scroll to selected card
  useEffect(() => {
    if (selectedCardIndex !== null && handRef.current) {
      const cardElement = handRef.current.children[selectedCardIndex] as HTMLElement;
      if (cardElement) {
        cardElement.scrollIntoView({
          behavior: 'smooth',
          block: 'nearest',
          inline: 'center'
        });
      }
    }
  }, [selectedCardIndex]);

  const cardSpacing = getCardSpacing();

  return (
    <div 
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 1000,
        background: 'var(--tg-theme-bg-color)',
        borderTop: '1px solid rgba(255, 255, 255, 0.1)',
        paddingBottom: 'env(safe-area-inset-bottom)'
      }}
    >
      {/* Play Zone Indicator */}
      <AnimatePresence>
        {playZoneActive && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            style={{
              position: 'absolute',
              top: '-60px',
              left: '50%',
              transform: 'translateX(-50%)',
              background: 'var(--game-success)',
              color: 'white',
              padding: '8px 16px',
              borderRadius: '20px',
              fontSize: '14px',
              fontWeight: '600',
              boxShadow: '0 4px 16px rgba(75, 179, 75, 0.4)',
              zIndex: 1001
            }}
          >
            🎯 Отпустите для игры
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hand Info */}
      <div 
        style={{
          padding: '8px 16px',
          fontSize: '12px',
          color: 'var(--tg-theme-hint-color)',
          textAlign: 'center',
          borderBottom: '1px solid rgba(255, 255, 255, 0.05)'
        }}
      >
        {isPlayerTurn ? (
          <span style={{ color: 'var(--game-success)' }}>
            🎯 Ваш ход • {cards.length} карт{cards.length === 1 ? 'а' : cards.length < 5 ? 'ы' : ''}
          </span>
        ) : (
          <span>
            ⏳ Ожидание • {cards.length} карт{cards.length === 1 ? 'а' : cards.length < 5 ? 'ы' : ''}
          </span>
        )}
      </div>

      {/* Cards Container */}
      <div
        ref={handRef}
        style={{
          display: 'flex',
          gap: `${cardSpacing}px`,
          padding: '16px',
          overflowX: 'auto',
          overflowY: 'visible',
          scrollBehavior: 'smooth',
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
          WebkitOverflowScrolling: 'touch'
        }}
      >
        {cards.map((card, index) => {
          const isSelected = selectedCardIndex === index;
          const isPlayable = canPlayCard(card, index) && isPlayerTurn;
          const isDragged = draggedCardIndex === index;

          return (
            <motion.div
              key={`${card.suit}-${card.rank}-${index}`}
              style={{
                minWidth: '85px',
                height: '119px',
                borderRadius: '8px',
                background: 'white',
                border: `2px solid ${
                  isSelected ? 'var(--game-secondary)' : 
                  isPlayable ? 'var(--game-success)' : 
                  'transparent'
                }`,
                boxShadow: isSelected ? 
                  '0 8px 24px rgba(0, 0, 0, 0.18), 0 0 20px rgba(106, 183, 255, 0.4)' :
                  '0 4px 16px rgba(0, 0, 0, 0.15)',
                cursor: 'pointer',
                position: 'relative',
                overflow: 'hidden',
                userSelect: 'none',
                zIndex: isSelected ? 10 : isDragged ? 20 : 1
              }}
              initial={{ y: 100, opacity: 0, scale: 0.8 }}
              animate={{ 
                y: isSelected ? -10 : 0, 
                opacity: 1, 
                scale: isDragged ? 1.05 : 1,
                rotateZ: isDragged ? Math.random() * 10 - 5 : 0
              }}
              transition={{ 
                type: "spring", 
                stiffness: 300, 
                damping: 25,
                delay: index * 0.03
              }}
              whileHover={{ 
                y: isSelected ? -10 : -5,
                scale: 1.02
              }}
              whileTap={{ scale: 0.95 }}
              drag={isPlayerTurn ? "y" : false}
              dragConstraints={{ top: -200, bottom: 50 }}
              dragElastic={0.2}
              onDragStart={() => {
                setDraggedCardIndex(index);
                triggerHaptic('light');
              }}
              onDrag={(event, info) => handleDrag(event, info, index)}
              onDragEnd={(event, info) => handleDragEnd(event, info, index)}
              onTap={() => handleCardTap(index)}
            >
              {/* Card Image */}
              <img 
                src={`/cards/${card.suit}_${card.rank}.png`} 
                alt={`${card.rank} of ${card.suit}`}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  borderRadius: '6px',
                  pointerEvents: 'none'
                }}
              />

              {/* Playable Indicator */}
              {isPlayable && (
                <motion.div
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: 'linear-gradient(45deg, transparent 30%, rgba(75, 179, 75, 0.1) 50%, transparent 70%)',
                    pointerEvents: 'none'
                  }}
                  animate={{ x: [-100, 200] }}
                  transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
                />
              )}

              {/* Selected Indicator */}
              {isSelected && (
                <motion.div
                  style={{
                    position: 'absolute',
                    top: '4px',
                    right: '4px',
                    width: '16px',
                    height: '16px',
                    background: 'var(--game-secondary)',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '10px',
                    color: 'white',
                    fontWeight: 'bold'
                  }}
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 400, damping: 20 }}
                >
                  ✓
                </motion.div>
              )}

              {/* Card Value Overlay for better visibility */}
              <div
                style={{
                  position: 'absolute',
                  bottom: '4px',
                  left: '4px',
                  background: 'rgba(0, 0, 0, 0.7)',
                  color: 'white',
                  padding: '2px 6px',
                  borderRadius: '4px',
                  fontSize: '10px',
                  fontWeight: 'bold',
                  pointerEvents: 'none'
                }}
              >
                {card.rank}
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Hand Actions */}
      <div 
        style={{
          display: 'flex',
          justifyContent: 'center',
          gap: '12px',
          padding: '8px 16px 16px',
          borderTop: '1px solid rgba(255, 255, 255, 0.05)'
        }}
      >
        {selectedCardIndex !== null && (
          <motion.button
            style={{
              padding: '8px 16px',
              background: canPlayCard(cards[selectedCardIndex], selectedCardIndex) && isPlayerTurn ? 
                'var(--game-success)' : 'var(--tg-theme-hint-color)',
              color: 'white',
              border: 'none',
              borderRadius: '20px',
              fontSize: '14px',
              fontWeight: '600',
              cursor: canPlayCard(cards[selectedCardIndex], selectedCardIndex) && isPlayerTurn ? 'pointer' : 'not-allowed',
              opacity: canPlayCard(cards[selectedCardIndex], selectedCardIndex) && isPlayerTurn ? 1 : 0.5
            }}
            onClick={() => {
              if (canPlayCard(cards[selectedCardIndex], selectedCardIndex) && isPlayerTurn) {
                triggerHaptic('medium');
                onCardPlay(selectedCardIndex);
              } else {
                triggerHaptic('heavy');
              }
            }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
          >
            🎯 Играть карту
          </motion.button>
        )}

        <motion.button
          style={{
            padding: '8px 16px',
            background: 'var(--tg-theme-section-bg-color)',
            color: 'var(--tg-theme-text-color)',
            border: '1px solid var(--tg-theme-hint-color)',
            borderRadius: '20px',
            fontSize: '14px',
            fontWeight: '600',
            cursor: 'pointer'
          }}
          onClick={() => {
            triggerHaptic('light');
            onCardSelect(-1); // Deselect
          }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          ↩️ Отмена
        </motion.button>
      </div>

      {/* Scroll Indicator */}
      {cards.length > maxVisibleCards && (
        <div
          style={{
            position: 'absolute',
            right: '16px',
            top: '50%',
            transform: 'translateY(-50%)',
            background: 'rgba(0, 0, 0, 0.5)',
            color: 'white',
            padding: '4px 8px',
            borderRadius: '12px',
            fontSize: '10px',
            pointerEvents: 'none'
          }}
        >
          ← →
        </div>
      )}
    </div>
  );
};

export default TelegramPlayerHand;
