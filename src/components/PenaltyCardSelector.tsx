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

  // ✅ НОВАЯ ЛОГИКА: Выбор карты + цели для каждой карты
  const [selectedAssignments, setSelectedAssignments] = useState<{[cardId: string]: string}>({}); // cardId -> targetPlayerId

  if (!showPenaltyCardSelection || !penaltyCardSelectionPlayerId || !pendingPenalty) {
    return null;
  }

  const contributorPlayer = players.find(p => p.id === penaltyCardSelectionPlayerId);
  
  // ✅ КРИТИЧНО: Получаем ВСЕХ штрафников (может быть несколько!)
  const targetPlayerIds = Array.isArray(pendingPenalty.targetPlayerId) 
    ? pendingPenalty.targetPlayerId 
    : [pendingPenalty.targetPlayerId];
  
  const targetPlayers = players.filter(p => targetPlayerIds.includes(p.id));
  const openCards = contributorPlayer?.cards.filter(c => c.open) || [];

  // ✅ НОВАЯ ЛОГИКА: Отдаем карты ВСЕМ выбранным целям
  const handleSubmit = () => {
    Object.entries(selectedAssignments).forEach(([cardId, targetId]) => {
      contributePenaltyCard(penaltyCardSelectionPlayerId, cardId, targetId);
    });
    setSelectedAssignments({});
  };
  
  // Проверяем сколько карт нужно отдать
  const cardsToGive = Math.min(openCards.length, targetPlayers.length);
  const selectedCount = Object.keys(selectedAssignments).length;

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
          maxWidth: '700px',
          width: '100%',
          maxHeight: '85vh',
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
          💸 Штраф для {targetPlayers.length} игроков
        </h2>
        <p style={{ 
          color: '#94a3b8', 
          marginBottom: '16px', 
          fontSize: '14px',
          textAlign: 'center'
        }}>
          Выберите {cardsToGive} {cardsToGive === 1 ? 'карту' : cardsToGive < 5 ? 'карты' : 'карт'} и распределите их между штрафниками
        </p>

        {/* ✅ СПИСОК ШТРАФНИКОВ */}
        <div style={{
          background: 'rgba(239, 68, 68, 0.1)',
          borderRadius: '12px',
          padding: '12px',
          marginBottom: '20px',
          border: '1px solid rgba(239, 68, 68, 0.3)'
        }}>
          <div style={{ color: '#ef4444', fontSize: '13px', fontWeight: '600', marginBottom: '8px' }}>
            Штрафники ({targetPlayers.length}):
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {targetPlayers.map(tp => (
              <div key={tp.id} style={{
                background: 'rgba(239, 68, 68, 0.2)',
                padding: '6px 12px',
                borderRadius: '8px',
                color: '#fca5a5',
                fontSize: '12px',
                fontWeight: '600'
              }}>
                {tp.name}
              </div>
            ))}
          </div>
        </div>

        {/* ✅ КАРТЫ С ВЫБОРОМ ЦЕЛИ */}
        <div style={{
          display: 'grid',
          gap: '16px',
          marginBottom: '24px'
        }}>
          {openCards.length === 0 && (
            <div style={{ padding: '20px', textAlign: 'center', color: '#ef4444' }}>
              ❌ Нет доступных карт для штрафа
            </div>
          )}
          {openCards.slice(0, cardsToGive).map((card: any, index: number) => {
            const cardImage = typeof card === 'string' 
              ? card.replace('(open)', '').replace('(closed)', '')
              : card.image || `${card.rank}_of_${card.suit}.png`;
            
            const cardId = card.id || cardImage;
            const assignedTarget = selectedAssignments[cardId];

            return (
              <div 
                key={`penalty-card-${index}`}
                style={{
                  background: 'rgba(30, 41, 59, 0.5)',
                  borderRadius: '12px',
                  padding: '12px',
                  border: assignedTarget ? '2px solid #10b981' : '2px solid rgba(100, 116, 139, 0.3)'
                }}
              >
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                  {/* КАРТА */}
                  <div style={{
                    position: 'relative',
                    background: '#ffffff',
                    borderRadius: '8px',
                    padding: '3px',
                    flexShrink: 0
                  }}>
                    <Image
                      src={`${CARDS_PATH}${cardImage}`}
                      alt={cardImage}
                      width={60}
                      height={90}
                      style={{ 
                        borderRadius: '6px',
                        display: 'block'
                      }}
                    />
                  </div>

                  {/* СТРЕЛКА */}
                  <div style={{ color: '#94a3b8', fontSize: '24px', flexShrink: 0 }}>
                    →
                  </div>

                  {/* ВЫБОР ЦЕЛИ */}
                  <div style={{ flex: 1 }}>
                    <div style={{ color: '#cbd5e1', fontSize: '12px', marginBottom: '6px', fontWeight: '600' }}>
                      Кому отдать:
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: '6px' }}>
                      {targetPlayers.map(tp => {
                        const isSelected = assignedTarget === tp.id;
                        return (
                          <button
                            key={tp.id}
                            onClick={() => {
                              setSelectedAssignments(prev => ({
                                ...prev,
                                [cardId]: tp.id
                              }));
                            }}
                            style={{
                              background: isSelected 
                                ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
                                : 'rgba(100, 116, 139, 0.3)',
                              color: 'white',
                              border: isSelected ? '2px solid #10b981' : '2px solid rgba(100, 116, 139, 0.5)',
                              borderRadius: '8px',
                              padding: '8px',
                              fontSize: '12px',
                              fontWeight: '600',
                              cursor: 'pointer',
                              transition: 'all 0.2s ease'
                            }}
                            onMouseEnter={(e) => {
                              if (!isSelected) {
                                e.currentTarget.style.background = 'rgba(100, 116, 139, 0.5)';
                              }
                            }}
                            onMouseLeave={(e) => {
                              if (!isSelected) {
                                e.currentTarget.style.background = 'rgba(100, 116, 139, 0.3)';
                              }
                            }}
                          >
                            {isSelected && '✓ '}{tp.name}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* ПРОГРЕСС */}
        <div style={{
          background: 'rgba(100, 116, 139, 0.2)',
          borderRadius: '8px',
          padding: '10px',
          marginBottom: '16px',
          textAlign: 'center',
          color: selectedCount === cardsToGive ? '#10b981' : '#94a3b8',
          fontSize: '13px',
          fontWeight: '600'
        }}>
          {selectedCount === cardsToGive 
            ? `✓ Все карты распределены (${selectedCount}/${cardsToGive})`
            : `Распределено: ${selectedCount}/${cardsToGive}`}
        </div>

        {/* КНОПКА ОТДАТЬ */}
        <button
          disabled={selectedCount !== cardsToGive}
          onClick={handleSubmit}
          style={{
            width: '100%',
            background: selectedCount === cardsToGive
              ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
              : 'rgba(100, 116, 139, 0.3)',
            color: 'white',
            border: '2px solid rgba(16, 185, 129, 0.5)',
            borderRadius: '12px',
            padding: '14px 24px',
            fontSize: '16px',
            fontWeight: '700',
            cursor: selectedCount === cardsToGive ? 'pointer' : 'not-allowed',
            transition: 'all 0.3s ease',
            opacity: selectedCount === cardsToGive ? 1 : 0.5
          }}
          onMouseEnter={(e) => {
            if (selectedCount === cardsToGive) {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 6px 20px rgba(16, 185, 129, 0.5)';
            }
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = 'none';
          }}
        >
          ✓ Отдать {cardsToGive} {cardsToGive === 1 ? 'карту' : cardsToGive < 5 ? 'карты' : 'карт'}
        </button>
      </div>
    </div>
  );
}

