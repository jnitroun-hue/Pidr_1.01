'use client'
import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Skull } from 'lucide-react';

interface LoserModalProps {
  playerName: string;
  avatar?: string;
  onClose: () => void;
}

export default function LoserModal({ playerName, avatar, onClose }: LoserModalProps) {

  useEffect(() => {
    // Автозакрытие через 5 секунд
    const timer = setTimeout(() => {
      onClose();
    }, 5000);

    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <AnimatePresence>
      {/* ✅ ФОН */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
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
        {/* ✅ МОДАЛКА КАК ПРОФИЛЬ */}
        <motion.div
          initial={{ scale: 0.8, y: 50 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.8, y: 50 }}
          onClick={(e) => e.stopPropagation()}
          style={{
            background: 'linear-gradient(145deg, #1e293b 0%, #0f172a 100%)',
            border: '3px solid #DC143C',
            borderRadius: '24px',
            padding: '30px',
            maxWidth: '420px',
            width: '100%',
            position: 'relative',
            boxShadow: '0 20px 60px rgba(220, 20, 60, 0.3)',
            textAlign: 'center'
          }}
        >
          {/* Иконка черепа */}
          <div style={{
            width: '100px',
            height: '100px',
            margin: '0 auto 20px',
            borderRadius: '50%',
            background: 'rgba(220, 20, 60, 0.15)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '3px solid #DC143C',
            boxShadow: '0 10px 30px rgba(220, 20, 60, 0.4)'
          }}>
            <Skull size={48} strokeWidth={2.5} style={{ color: '#DC143C' }} />
          </div>

          {/* LOSER текст */}
          <h2 style={{
            color: '#DC143C',
            fontSize: '48px',
            fontWeight: '900',
            marginBottom: '12px',
            textShadow: '0 0 20px rgba(220, 20, 60, 0.8), 0 4px 12px rgba(0, 0, 0, 0.9)',
            textTransform: 'uppercase',
            letterSpacing: '4px'
          }}>
            LOSER
          </h2>

          {/* P.I.D.R. */}
          <h3 style={{
            color: '#8B0000',
            fontSize: '36px',
            fontWeight: '800',
            marginBottom: '20px',
            textShadow: '0 0 15px rgba(139, 0, 0, 0.8), 0 2px 8px rgba(0, 0, 0, 0.9)',
            letterSpacing: '6px'
          }}>
            P.I.D.R.
          </h3>

          {/* Аватар */}
          {avatar && (
            <div style={{
              width: '100px',
              height: '100px',
              margin: '0 auto 20px',
              borderRadius: '50%',
              overflow: 'hidden',
              border: '4px solid rgba(220, 20, 60, 0.8)',
              boxShadow: '0 0 30px rgba(255, 0, 0, 0.6), inset 0 0 20px rgba(0, 0, 0, 0.8)',
              filter: 'grayscale(0.5)'
            }}>
              <img 
                src={avatar} 
                alt={playerName}
                style={{ 
                  width: '100%', 
                  height: '100%', 
                  objectFit: 'cover' 
                }}
              />
            </div>
          )}

          {/* Имя проигравшего */}
          <p style={{
            fontSize: '28px',
            fontWeight: '700',
            color: 'rgba(255, 255, 255, 0.9)',
            textShadow: '0 2px 8px rgba(0, 0, 0, 0.8), 0 0 20px rgba(220, 20, 60, 0.5)',
            padding: '12px 24px',
            background: 'rgba(0, 0, 0, 0.4)',
            borderRadius: '12px',
            border: '2px solid rgba(139, 0, 0, 0.5)'
          }}>
            {playerName}
          </p>

          {/* Дополнительный текст */}
          <p style={{
            fontSize: '16px',
            fontWeight: '600',
            color: 'rgba(220, 20, 60, 0.8)',
            marginTop: '20px',
            textShadow: '0 2px 4px rgba(0, 0, 0, 0.8)'
          }}>
            💀 Последний игрок в игре 💀
          </p>

          {/* Индикатор автозакрытия */}
          <motion.div
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ duration: 5, ease: 'linear' }}
            style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              height: '4px',
              borderRadius: '0 0 20px 20px',
              background: 'linear-gradient(90deg, #DC143C 0%, #DC143C88 100%)',
              transformOrigin: 'left'
            }}
          />
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
