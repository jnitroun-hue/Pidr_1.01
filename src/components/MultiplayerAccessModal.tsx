'use client'
import React from 'react';
import { motion } from 'framer-motion';
import { Lock, Gamepad2, Trophy, X } from 'lucide-react';

interface MultiplayerAccessModalProps {
  isOpen: boolean;
  gamesPlayed: number;
  requiredGames: number;
  onClose: () => void;
  onPlayBots: () => void;
}

export default function MultiplayerAccessModal({
  isOpen,
  gamesPlayed,
  requiredGames,
  onClose,
  onPlayBots
}: MultiplayerAccessModalProps) {
  if (!isOpen) return null;

  const remaining = requiredGames - gamesPlayed;

  return (
    <>
      {/* Затемнение фона */}
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
          background: 'rgba(0, 0, 0, 0.78)',
          zIndex: 9999,
          backdropFilter: 'blur(4px)'
        }}
      />
      
      {/* Модалка - позиционирование как TutorialModal */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        style={{
          position: 'fixed',
          top: '12px',
          left: '12px',
          right: '12px',
          bottom: '12px',
          width: 'auto',
          maxWidth: '560px',
          height: 'auto',
          maxHeight: 'calc(var(--app-viewport-height, 100dvh) - 24px)',
          margin: 'auto',
          background: 'var(--menu-card-bg)',
          color: 'var(--menu-text)',
          borderRadius: '20px',
          border: '2px solid rgba(239, 68, 68, 0.55)',
          boxShadow: 'var(--menu-shadow), 0 0 32px rgba(239, 68, 68, 0.18)',
          zIndex: 10000,
          padding: 'clamp(18px, 5vw, 32px)',
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          boxSizing: 'border-box',
          WebkitOverflowScrolling: 'touch',
          overscrollBehavior: 'contain'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Заголовок */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
          marginBottom: '24px',
          paddingBottom: '16px',
          borderBottom: '2px solid rgba(239, 68, 68, 0.3)',
          flexShrink: 0
        }}>
          <Lock 
            size={32} 
            style={{ 
              color: '#ef4444',
              filter: 'drop-shadow(0 0 8px rgba(239, 68, 68, 0.5))'
            }} 
          />
          <h2 style={{
            fontSize: 'clamp(24px, 4vw, 32px)',
            fontWeight: '800',
            background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            margin: 0,
            wordBreak: 'break-word',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            flex: 1
          }}>
            Доступ к мультиплееру закрыт
          </h2>
          <button
            onClick={onClose}
            style={{
              background: 'rgba(239, 68, 68, 0.2)',
              border: '2px solid rgba(239, 68, 68, 0.3)',
              borderRadius: '8px',
              padding: '8px',
              cursor: 'pointer',
              color: '#ef4444',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s',
              flexShrink: 0,
              marginLeft: '12px'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(239, 68, 68, 0.3)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(239, 68, 68, 0.2)';
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Контент */}
        <div style={{
          color: 'var(--menu-text)',
          fontSize: 'clamp(16px, 2.5vw, 20px)',
          lineHeight: '1.8',
          marginBottom: '32px',
          textAlign: 'center',
          flex: 1,
          overflowY: 'auto',
          wordBreak: 'break-word'
        }}>
          <p style={{ marginBottom: '20px' }}>
            Чтобы играть онлайн с реальными игроками, вам нужно сначала сыграть <strong>{requiredGames} игры с ботами</strong>.
          </p>
          
          <div style={{
            background: 'rgba(239, 68, 68, 0.1)',
            borderRadius: '12px',
            padding: '20px',
            marginBottom: '20px',
            border: '2px solid rgba(239, 68, 68, 0.3)'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              marginBottom: '10px'
            }}>
              <Gamepad2 size={24} style={{ color: '#fbbf24' }} />
              <span style={{ fontSize: '18px', fontWeight: '700', color: '#fbbf24' }}>
                Сыграно: {gamesPlayed} / {requiredGames}
              </span>
            </div>
            <div style={{
              fontSize: '14px',
              color: 'var(--menu-text-muted)'
            }}>
              Осталось сыграть: <strong style={{ color: '#ef4444' }}>{remaining} {remaining === 1 ? 'игра' : remaining < 5 ? 'игры' : 'игр'}</strong>
            </div>
          </div>

          <p style={{ marginBottom: '20px', fontSize: '14px', color: 'var(--menu-text-muted)' }}>
            В первых {requiredGames} играх с ботами вы получите подробные подсказки и объяснения всех правил игры. После прохождения обучения вы сможете играть онлайн!
          </p>
        </div>

        {/* Кнопки */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          flexShrink: 0
        }}>
          <motion.button
            onClick={onPlayBots}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            style={{
              width: '100%',
              padding: '20px 32px',
              background: 'var(--menu-accent)',
              color: '#111827',
              border: 'none',
              borderRadius: '16px',
              fontSize: 'clamp(18px, 3vw, 22px)',
              fontWeight: '700',
              cursor: 'pointer',
              boxShadow: 'var(--menu-shadow)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              transition: 'all 0.3s',
              touchAction: 'manipulation',
              WebkitTapHighlightColor: 'transparent'
            }}
          >
            <Gamepad2 size={20} />
            Играть с ботами
          </motion.button>
          
          <motion.button
            onClick={onClose}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            style={{
              width: '100%',
              padding: '14px 24px',
              background: 'var(--menu-accent-soft)',
              color: 'var(--menu-text)',
              border: '1px solid var(--menu-card-border)',
              borderRadius: '12px',
              fontSize: '16px',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.3s'
            }}
          >
            Закрыть
          </motion.button>
        </div>
      </motion.div>
    </>
  );
}

