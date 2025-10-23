'use client'
import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface LoserModalProps {
  playerName: string;
  avatar?: string;
  onClose: () => void;
}

export default function LoserModal({ playerName, avatar, onClose }: LoserModalProps) {
  const [skulls, setSkulls] = useState<Array<{ id: number; x: number; y: number; delay: number }>>([]);

  useEffect(() => {
    // Генерируем падающие черепа
    const newSkulls = Array.from({ length: 20 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: -20 - Math.random() * 50,
      delay: Math.random() * 0.5
    }));
    setSkulls(newSkulls);

    // Автозакрытие через 5 секунд
    const timer = setTimeout(() => {
      onClose();
    }, 5000);

    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'linear-gradient(135deg, rgba(30, 20, 30, 0.95) 0%, rgba(15, 10, 20, 0.98) 100%)',
          backdropFilter: 'blur(10px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          overflow: 'hidden'
        }}
      >
        {/* Падающие черепа */}
        {skulls.map((skull) => (
          <motion.div
            key={skull.id}
            initial={{ y: `${skull.y}vh`, x: `${skull.x}vw`, opacity: 0.7, rotate: 0 }}
            animate={{ 
              y: '110vh', 
              x: `${skull.x + (Math.random() - 0.5) * 20}vw`,
              rotate: Math.random() * 360,
              opacity: 0
            }}
            transition={{ 
              duration: 3 + Math.random() * 2, 
              delay: skull.delay,
              ease: 'easeIn'
            }}
            style={{
              position: 'absolute',
              fontSize: '30px',
              pointerEvents: 'none'
            }}
          >
            💀
          </motion.div>
        ))}

        {/* Темный дым/туман */}
        <motion.div
          animate={{ 
            scale: [1, 1.1, 1],
            opacity: [0.3, 0.5, 0.3]
          }}
          transition={{ 
            duration: 4, 
            repeat: Infinity,
            ease: 'easeInOut'
          }}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'radial-gradient(circle at 50% 50%, rgba(139, 0, 0, 0.3) 0%, transparent 70%)',
            pointerEvents: 'none'
          }}
        />

        {/* Модальное окно */}
        <motion.div
          initial={{ scale: 0, rotate: 180 }}
          animate={{ scale: 1, rotate: 0 }}
          exit={{ scale: 0, rotate: -180 }}
          transition={{ type: 'spring', duration: 0.6 }}
          style={{
            background: 'linear-gradient(135deg, rgba(60, 20, 20, 0.95) 0%, rgba(20, 10, 10, 0.98) 100%)',
            borderRadius: '24px',
            padding: '40px',
            boxShadow: '0 20px 60px rgba(139, 0, 0, 0.8), 0 0 100px rgba(255, 0, 0, 0.3), inset 0 0 30px rgba(0, 0, 0, 0.5)',
            border: '3px solid rgba(139, 0, 0, 0.6)',
            textAlign: 'center',
            maxWidth: '450px',
            width: '90%',
            position: 'relative',
            overflow: 'hidden'
          }}
        >
          {/* Кровавые блики */}
          <motion.div
            animate={{ 
              rotate: [0, 360]
            }}
            transition={{ 
              duration: 8, 
              repeat: Infinity,
              ease: 'linear'
            }}
            style={{
              position: 'absolute',
              top: '-50%',
              left: '-50%',
              width: '200%',
              height: '200%',
              background: 'conic-gradient(from 0deg, transparent 0%, rgba(139, 0, 0, 0.3) 25%, transparent 50%, rgba(139, 0, 0, 0.3) 75%, transparent 100%)',
              pointerEvents: 'none'
            }}
          />

          {/* Черепа вокруг */}
          <motion.div
            animate={{ 
              scale: [1, 1.1, 1],
              rotate: [0, 5, -5, 0]
            }}
            transition={{ 
              duration: 2, 
              repeat: Infinity,
              ease: 'easeInOut'
            }}
            style={{ 
              fontSize: '60px', 
              marginBottom: '20px',
              display: 'flex',
              justifyContent: 'center',
              gap: '16px',
              filter: 'drop-shadow(0 0 20px rgba(255, 0, 0, 0.8))'
            }}
          >
            <span>💀</span>
            <span style={{ fontSize: '80px' }}>💀</span>
            <span>💀</span>
          </motion.div>

          {/* Аватар с красной рамкой */}
          {avatar && (
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ delay: 0.2 }}
              style={{
                width: '100px',
                height: '100px',
                borderRadius: '50%',
                margin: '0 auto 20px',
                overflow: 'hidden',
                border: '4px solid rgba(139, 0, 0, 0.8)',
                boxShadow: '0 0 30px rgba(255, 0, 0, 0.6), inset 0 0 20px rgba(0, 0, 0, 0.8)',
                filter: 'grayscale(0.5)'
              }}
            >
              <img 
                src={avatar} 
                alt={playerName}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            </motion.div>
          )}

          {/* LOSER текст */}
          <motion.h2
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3 }}
            style={{
              fontSize: '48px',
              fontWeight: '900',
              color: '#DC143C',
              marginBottom: '12px',
              textShadow: '0 0 20px rgba(220, 20, 60, 0.8), 0 4px 12px rgba(0, 0, 0, 0.9)',
              textTransform: 'uppercase',
              letterSpacing: '4px'
            }}
          >
            LOSER
          </motion.h2>

          {/* P.I.D.R. */}
          <motion.h3
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.4 }}
            style={{
              fontSize: '36px',
              fontWeight: '800',
              color: '#8B0000',
              marginBottom: '20px',
              textShadow: '0 0 15px rgba(139, 0, 0, 0.8), 0 2px 8px rgba(0, 0, 0, 0.9)',
              letterSpacing: '6px'
            }}
          >
            P.I.D.R.
          </motion.h3>

          {/* Имя проигравшего */}
          <motion.p
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.5 }}
            style={{
              fontSize: '28px',
              fontWeight: '700',
              color: 'rgba(255, 255, 255, 0.9)',
              textShadow: '0 2px 8px rgba(0, 0, 0, 0.8), 0 0 20px rgba(220, 20, 60, 0.5)',
              padding: '12px 24px',
              background: 'rgba(0, 0, 0, 0.4)',
              borderRadius: '12px',
              border: '2px solid rgba(139, 0, 0, 0.5)'
            }}
          >
            {playerName}
          </motion.p>

          {/* Дополнительный текст */}
          <motion.p
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.6 }}
            style={{
              fontSize: '16px',
              fontWeight: '600',
              color: 'rgba(220, 20, 60, 0.8)',
              marginTop: '20px',
              textShadow: '0 2px 4px rgba(0, 0, 0, 0.8)'
            }}
          >
            💀 Последний игрок в игре 💀
          </motion.p>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

