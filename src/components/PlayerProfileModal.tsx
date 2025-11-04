'use client'
import { motion, AnimatePresence } from 'framer-motion';
import { X, Trophy, Target, Award, TrendingUp, Star } from 'lucide-react';

interface PlayerProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  player: {
    name: string;
    avatar?: string;
    isBot?: boolean;
    rating?: number;
    gamesPlayed?: number;
    wins?: number;
    losses?: number;
    winRate?: number;
  };
}

export default function PlayerProfileModal({ isOpen, onClose, player }: PlayerProfileModalProps) {
  if (!isOpen) return null;

  const winRate = player.winRate || (player.wins && player.gamesPlayed 
    ? Math.round((player.wins / player.gamesPlayed) * 100) 
    : 0);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.85)',
          backdropFilter: 'blur(10px)',
          zIndex: 999999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px'
        }}
      >
        <motion.div
          initial={{ scale: 0.8, y: 50 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.8, y: 50 }}
          onClick={(e) => e.stopPropagation()}
          style={{
            background: 'linear-gradient(145deg, #1e293b 0%, #0f172a 100%)',
            border: '3px solid #3b82f6',
            borderRadius: '24px',
            padding: '30px',
            maxWidth: '420px',
            width: '100%',
            position: 'relative',
            boxShadow: '0 20px 60px rgba(59, 130, 246, 0.3)'
          }}
        >
          {/* Кнопка закрытия */}
          <button
            onClick={onClose}
            style={{
              position: 'absolute',
              top: '20px',
              right: '20px',
              background: 'rgba(255, 255, 255, 0.1)',
              border: 'none',
              borderRadius: '50%',
              width: '44px',
              height: '44px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: '#ffffff',
              transition: 'all 0.3s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(239, 68, 68, 0.2)';
              e.currentTarget.style.transform = 'rotate(90deg)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
              e.currentTarget.style.transform = 'rotate(0deg)';
            }}
          >
            <X size={24} />
          </button>

          {/* Аватар */}
          <div style={{
            textAlign: 'center',
            marginBottom: '25px'
          }}>
            <div style={{
              width: '120px',
              height: '120px',
              margin: '0 auto',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '64px',
              border: '4px solid rgba(59, 130, 246, 0.3)',
              boxShadow: '0 10px 30px rgba(59, 130, 246, 0.4)',
              marginBottom: '15px'
            }}>
              {player.avatar || '👤'}
            </div>
            
            <h2 style={{
              color: '#ffffff',
              fontSize: '28px',
              fontWeight: 'black',
              marginBottom: '8px',
              textShadow: '0 2px 10px rgba(0,0,0,0.3)'
            }}>
              {player.name}
            </h2>

            {player.isBot && (
              <div style={{
                display: 'inline-block',
                background: 'linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%)',
                padding: '6px 16px',
                borderRadius: '20px',
                fontSize: '13px',
                fontWeight: 'bold',
                color: '#ffffff',
                marginTop: '8px'
              }}>
                🤖 БОТ
              </div>
            )}
          </div>

          {/* Статистика */}
          {!player.isBot && (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: '15px',
              marginTop: '25px'
            }}>
              {/* Рейтинг */}
              <div style={{
                background: 'rgba(59, 130, 246, 0.1)',
                border: '2px solid rgba(59, 130, 246, 0.3)',
                borderRadius: '16px',
                padding: '16px',
                textAlign: 'center'
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  marginBottom: '8px'
                }}>
                  <TrendingUp size={20} color="#3b82f6" />
                  <span style={{ color: '#94a3b8', fontSize: '13px', fontWeight: '600' }}>
                    Рейтинг
                  </span>
                </div>
                <div style={{
                  color: '#3b82f6',
                  fontSize: '28px',
                  fontWeight: 'black'
                }}>
                  {player.rating || 1000}
                </div>
              </div>

              {/* Игры */}
              <div style={{
                background: 'rgba(139, 92, 246, 0.1)',
                border: '2px solid rgba(139, 92, 246, 0.3)',
                borderRadius: '16px',
                padding: '16px',
                textAlign: 'center'
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  marginBottom: '8px'
                }}>
                  <Target size={20} color="#8b5cf6" />
                  <span style={{ color: '#94a3b8', fontSize: '13px', fontWeight: '600' }}>
                    Игры
                  </span>
                </div>
                <div style={{
                  color: '#8b5cf6',
                  fontSize: '28px',
                  fontWeight: 'black'
                }}>
                  {player.gamesPlayed || 0}
                </div>
              </div>

              {/* Победы */}
              <div style={{
                background: 'rgba(34, 197, 94, 0.1)',
                border: '2px solid rgba(34, 197, 94, 0.3)',
                borderRadius: '16px',
                padding: '16px',
                textAlign: 'center'
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  marginBottom: '8px'
                }}>
                  <Trophy size={20} color="#22c55e" />
                  <span style={{ color: '#94a3b8', fontSize: '13px', fontWeight: '600' }}>
                    Победы
                  </span>
                </div>
                <div style={{
                  color: '#22c55e',
                  fontSize: '28px',
                  fontWeight: 'black'
                }}>
                  {player.wins || 0}
                </div>
              </div>

              {/* Винрейт */}
              <div style={{
                background: 'rgba(251, 191, 36, 0.1)',
                border: '2px solid rgba(251, 191, 36, 0.3)',
                borderRadius: '16px',
                padding: '16px',
                textAlign: 'center'
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  marginBottom: '8px'
                }}>
                  <Star size={20} color="#fbbf24" />
                  <span style={{ color: '#94a3b8', fontSize: '13px', fontWeight: '600' }}>
                    Винрейт
                  </span>
                </div>
                <div style={{
                  color: '#fbbf24',
                  fontSize: '28px',
                  fontWeight: 'black'
                }}>
                  {winRate}%
                </div>
              </div>
            </div>
          )}

          {/* ✅ ДЛЯ БОТОВ УБРАЛИ ЕБАНУЮ НАДПИСЬ */}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
