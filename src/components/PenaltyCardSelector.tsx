'use client'

import React, { useState } from 'react';
import Image from 'next/image';
import { useGameStore } from '../store/gameStore';

const CARDS_PATH = '/img/cards/';

export default function PenaltyCardSelector() {
  const { 
    players,
    pendingPenalty,
    showPenaltyCardSelection,
    penaltyCardSelectionPlayerId,
    contributePenaltyCard
  } = useGameStore();

  const [selectedCard, setSelectedCard] = useState<string | null>(null);

  if (!showPenaltyCardSelection || !penaltyCardSelectionPlayerId || !pendingPenalty) {
    return null;
  }

  const contributorPlayer = players.find(p => p.id === penaltyCardSelectionPlayerId);
  const targetPlayer = players.find(p => p.id === pendingPenalty.targetPlayerId);
  const openCards = contributorPlayer?.cards.filter(c => c.open) || [];

  const handleCardSelect = (cardId: string) => {
    contributePenaltyCard(penaltyCardSelectionPlayerId, cardId);
  };

  return (
    <div 
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0, 0, 0, 0.85)',
        backdropFilter: 'blur(12px)',
        zIndex: 999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px'
      }}
    >
      <div 
        style={{
          background: 'linear-gradient(145deg, rgba(30, 41, 59, 0.98) 0%, rgba(15, 23, 42, 0.98) 100%)',
          borderRadius: '20px',
          padding: '24px',
          maxWidth: '600px',
          width: '100%',
          maxHeight: '80vh',
          overflowY: 'auto',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.6)',
          border: '2px solid rgba(239, 68, 68, 0.5)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 style={{ 
          color: '#ef4444', 
          marginBottom: '8px', 
          fontSize: '22px', 
          fontWeight: 'bold',
          textAlign: 'center'
        }}>
          💸 Штраф для {targetPlayer?.name}
        </h2>
        <p style={{ 
          color: '#94a3b8', 
          marginBottom: '24px', 
          fontSize: '14px',
          textAlign: 'center'
        }}>
          Выберите карту которую отдадите
        </p>

        {/* Карты игрока */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))',
          gap: '12px',
          marginBottom: '24px'
        }}>
          {openCards.length === 0 && (
            <div style={{ padding: '20px', textAlign: 'center', color: '#ef4444', gridColumn: '1 / -1' }}>
              ❌ Нет доступных карт для штрафа
            </div>
          )}
          {openCards.map((card: any, index: number) => {
            const cardImage = typeof card === 'string' 
              ? card.replace('(open)', '').replace('(closed)', '')
              : card.image || `${card.rank}_of_${card.suit}.png`;
            
            const cardId = card.id || cardImage;
            const isSelected = selectedCard === cardId;

            return (
              <div 
                key={`penalty-card-${index}`}
                style={{
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  position: 'relative'
                }}
                onClick={() => setSelectedCard(cardId)}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-8px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                <Image
                  src={`${CARDS_PATH}${cardImage}`}
                  alt={cardImage}
                  width={80}
                  height={120}
                  style={{ 
                    borderRadius: '8px',
                    border: isSelected 
                      ? '3px solid #10b981' 
                      : '2px solid rgba(255, 255, 255, 0.2)',
                    boxShadow: isSelected 
                      ? '0 0 20px rgba(16, 185, 129, 0.6)' 
                      : '0 4px 12px rgba(0,0,0,0.3)'
                  }}
                />
                {isSelected && (
                  <div style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    background: 'rgba(16, 185, 129, 0.9)',
                    borderRadius: '50%',
                    width: '30px',
                    height: '30px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '18px',
                    color: 'white'
                  }}>
                    ✓
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Кнопка отдать карту */}
        <button
          disabled={!selectedCard}
          onClick={() => {
            if (selectedCard) {
              handleCardSelect(selectedCard);
              setSelectedCard(null);
            }
          }}
          style={{
            width: '100%',
            background: selectedCard
              ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
              : 'rgba(100, 116, 139, 0.3)',
            color: 'white',
            border: '2px solid rgba(16, 185, 129, 0.5)',
            borderRadius: '12px',
            padding: '14px 24px',
            fontSize: '16px',
            fontWeight: '700',
            cursor: selectedCard ? 'pointer' : 'not-allowed',
            transition: 'all 0.3s ease',
            opacity: selectedCard ? 1 : 0.5
          }}
          onMouseEnter={(e) => {
            if (selectedCard) {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 6px 20px rgba(16, 185, 129, 0.5)';
            }
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = 'none';
          }}
        >
          ✓ Отдать карту
        </button>
      </div>
    </div>
  );
}

