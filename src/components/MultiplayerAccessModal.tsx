'use client'
import React from 'react';
import { motion } from 'framer-motion';
import { Lock, Gamepad2, Trophy } from 'lucide-react';

interface MultiplayerAccessModalProps {
  isOpen: boolean;
  botGamesPlayed: number;
  requiredGames: number;
  onClose: () => void;
  onPlayBots: () => void;
}

export default function MultiplayerAccessModal({
  isOpen,
  botGamesPlayed,
  requiredGames,
  onClose,
  onPlayBots
}: MultiplayerAccessModalProps) {
  if (!isOpen) return null;

  const remaining = requiredGames - botGamesPlayed;

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
          background: 'rgba(0, 0, 0, 0.85)',
          zIndex: 9998,
          backdropFilter: 'blur(4px)'
        }}
      />
      
      {/* Модалка */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '90%',
          maxWidth: '500px',
          background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.98) 0%, rgba(15, 23, 42, 0.98) 100%)',
          borderRadius: '20px',
          border: '3px solid rgba(239, 68, 68, 0.5)',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5), 0 0 40px rgba(239, 68, 68, 0.3)',
          zIndex: 9999,
          padding: '30px',
          maxHeight: '80vh',
          overflowY: 'auto'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Заголовок */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '12px',
          marginBottom: '20px',
          paddingBottom: '15px',
          borderBottom: '2px solid rgba(239, 68, 68, 0.3)'
        }}>
          <Lock 
            size={32} 
            style={{ 
              color: '#ef4444',
              filter: 'drop-shadow(0 0 8px rgba(239, 68, 68, 0.5))'
            }} 
          />
          <h2 style={{
            fontSize: '24px',
            fontWeight: '800',
            background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            margin: 0
          }}>
            Доступ к мультиплееру закрыт
          </h2>
        </div>

        {/* Контент */}
        <div style={{
          color: '#e2e8f0',
          fontSize: '16px',
          lineHeight: '1.7',
          marginBottom: '25px',
          textAlign: 'center'
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
                Сыграно: {botGamesPlayed} / {requiredGames}
              </span>
            </div>
            <div style={{
              fontSize: '14px',
              color: '#cbd5e1'
            }}>
              Осталось сыграть: <strong style={{ color: '#ef4444' }}>{remaining} {remaining === 1 ? 'игра' : remaining < 5 ? 'игры' : 'игр'}</strong>
            </div>
          </div>

          <p style={{ marginBottom: '20px', fontSize: '14px', color: '#94a3b8' }}>
            В первой игре с ботами вы получите подробные подсказки и объяснения всех правил игры.
          </p>
        </div>

        {/* Кнопки */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '12px'
        }}>
          <motion.button
            onClick={onPlayBots}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            style={{
              width: '100%',
              padding: '16px 24px',
              background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
              color: 'white',
              border: 'none',
              borderRadius: '12px',
              fontSize: '18px',
              fontWeight: '700',
              cursor: 'pointer',
              boxShadow: '0 8px 24px rgba(99, 102, 241, 0.4)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px'
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
              background: 'rgba(100, 116, 139, 0.2)',
              color: '#cbd5e1',
              border: '2px solid rgba(100, 116, 139, 0.3)',
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

