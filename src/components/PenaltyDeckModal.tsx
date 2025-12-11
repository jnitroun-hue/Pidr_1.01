'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { X, User } from 'lucide-react';

interface PenaltyDeckModalProps {
  isOpen: boolean;
  onClose: () => void;
  penaltyCards: Array<{ playerId: string; playerName: string }>;
  totalCards: number;
  targetPlayerName?: string; // ✅ Имя игрока который получит карты
}

export default function PenaltyDeckModal({ 
  isOpen, 
  onClose, 
  penaltyCards, 
  totalCards,
  targetPlayerName
}: PenaltyDeckModalProps) {
  // Группируем карты по игрокам
  const contributorCounts = penaltyCards.reduce((acc, card) => {
    acc[card.playerId] = (acc[card.playerId] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const contributors = Object.entries(contributorCounts).map(([playerId, count]) => {
    const card = penaltyCards.find(c => c.playerId === playerId);
    return {
      playerId,
      playerName: card?.playerName || 'Неизвестный',
      cardCount: count
    };
  });

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(10px)',
            zIndex: 99999,
            pointerEvents: 'auto'
          }}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ duration: 0.25 }}
            onClick={(e) => e.stopPropagation()}
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              width: 'min(50vw, 90vw)', // ✅ 50% ЭКРАНА!
              maxWidth: '500px', // ✅ МАКСИМУМ 500px!
              maxHeight: 'min(60vh, 60dvh)', // ✅ 60% ВЫСОТЫ!
              overflowY: 'auto',
              background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
              borderRadius: '20px',
              padding: '24px 18px',
              boxShadow: '0 20px 50px rgba(0, 0, 0, 0.5)',
              border: '2px solid rgba(239, 68, 68, 0.3)'
            }}
          >
            {/* Заголовок */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '20px',
              borderBottom: '2px solid rgba(239, 68, 68, 0.3)',
              paddingBottom: '12px'
            }}>
              <h2 style={{
                margin: 0,
                fontSize: '20px',
                fontWeight: 'bold',
                color: '#ef4444',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                💀 Штрафная стопка
              </h2>
              <button
                onClick={onClose}
                style={{
                  background: 'rgba(239, 68, 68, 0.2)',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '8px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(239, 68, 68, 0.4)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(239, 68, 68, 0.2)';
                }}
              >
                <X size={20} color="#ef4444" />
              </button>
            </div>

            {/* Общее количество карт и получатель */}
            <div style={{
              background: 'rgba(239, 68, 68, 0.1)',
              borderRadius: '12px',
              padding: '12px',
              marginBottom: '16px',
              textAlign: 'center'
            }}>
              <p style={{
                margin: 0,
                fontSize: '16px',
                color: '#f87171',
                fontWeight: 'bold',
                marginBottom: targetPlayerName ? '8px' : 0
              }}>
                Всего штрафных карт: {totalCards}
              </p>
              {targetPlayerName && (
                <p style={{
                  margin: 0,
                  fontSize: '14px',
                  color: '#fca5a5'
                }}>
                  → Получит: <strong>{targetPlayerName}</strong>
                </p>
              )}
            </div>

            {/* Список игроков */}
            {contributors.length > 0 ? (
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '12px'
              }}>
                {contributors.map((contributor) => (
                  <motion.div
                    key={contributor.playerId}
                    initial={{ x: -20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    style={{
                      background: 'rgba(255, 255, 255, 0.05)',
                      borderRadius: '12px',
                      padding: '12px 16px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      transition: 'all 0.2s'
                    }}
                    whileHover={{
                      background: 'rgba(255, 255, 255, 0.1)',
                      scale: 1.02
                    }}
                  >
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px'
                    }}>
                      <User size={20} color="#94a3b8" />
                      <span style={{
                        color: '#e2e8f0',
                        fontSize: '15px',
                        fontWeight: '500'
                      }}>
                        {contributor.playerName}
                      </span>
                    </div>
                    <div style={{
                      background: 'rgba(239, 68, 68, 0.2)',
                      borderRadius: '8px',
                      padding: '4px 12px'
                    }}>
                      <span style={{
                        color: '#f87171',
                        fontSize: '14px',
                        fontWeight: 'bold'
                      }}>
                        {contributor.cardCount} {contributor.cardCount === 1 ? 'карта' : contributor.cardCount < 5 ? 'карты' : 'карт'}
                      </span>
                    </div>
                  </motion.div>
                ))}
              </div>
            ) : (
              <div style={{
                textAlign: 'center',
                padding: '32px',
                color: '#94a3b8',
                fontSize: '14px'
              }}>
                <p style={{ margin: 0 }}>Штрафная стопка пуста</p>
              </div>
            )}

            {/* Кнопка закрыть */}
            <button
              onClick={onClose}
              style={{
                width: '100%',
                marginTop: '20px',
                background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                color: 'white',
                border: 'none',
                borderRadius: '12px',
                padding: '12px',
                fontSize: '15px',
                fontWeight: 'bold',
                cursor: 'pointer',
                transition: 'all 0.2s',
                boxShadow: '0 4px 12px rgba(239, 68, 68, 0.3)'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 6px 20px rgba(239, 68, 68, 0.4)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(239, 68, 68, 0.3)';
              }}
            >
              Закрыть
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

