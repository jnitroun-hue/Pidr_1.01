'use client'
import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface WinnerModalProps {
  playerName: string;
  place: number;
  avatar?: string;
  isCurrentUser?: boolean; // ✅ Флаг что это ПОЛЬЗОВАТЕЛЬ победил (не бот)
  onClose: () => void;
  onContinueWatching?: () => void; // ✅ Кнопка "Продолжить просмотр"
  onExitToMenu?: () => void; // ✅ Кнопка "Выйти в главное меню"
}

export default function WinnerModal({ playerName, place, avatar, isCurrentUser, onClose, onContinueWatching, onExitToMenu }: WinnerModalProps) {
  const [confetti, setConfetti] = useState<Array<{ id: number; x: number; delay: number; color: string }>>([]);
  
  // ✅ Адаптивные отступы в зависимости от размера экрана
  const getResponsiveMargin = () => {
    if (typeof window === 'undefined') return '120px';
    const width = window.innerWidth;
    if (width <= 480) return '60px 15px'; // Очень маленький экран
    if (width <= 768) return '80px 20px'; // Мобильный
    return '120px'; // Десктоп
  };
  
  const getResponsiveWidth = () => {
    if (typeof window === 'undefined') return 'calc(100% - 240px)';
    const width = window.innerWidth;
    if (width <= 480) return 'calc(100% - 30px)';
    if (width <= 768) return 'calc(100% - 40px)';
    return 'calc(100% - 240px)';
  };
  
  const getResponsivePadding = () => {
    if (typeof window === 'undefined') return '40px';
    const width = window.innerWidth;
    if (width <= 480) return '20px';
    if (width <= 768) return '30px';
    return '40px';
  };

  useEffect(() => {
    // Генерируем конфетти
    const newConfetti = Array.from({ length: 50 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      delay: Math.random() * 0.5,
      color: ['#FFD700', '#FF6B6B', '#4ECDC4', '#95E1D3', '#FFA07A'][Math.floor(Math.random() * 5)]
    }));
    setConfetti(newConfetti);

    // ✅ АВТОЗАКРЫТИЕ ТОЛЬКО ДЛЯ БОТОВ (не для пользователя)!
    if (!isCurrentUser) {
      const timer = setTimeout(() => {
        onClose();
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [onClose, isCurrentUser]);

  const medals = ['🥇', '🥈', '🥉', '🏅', '🏅', '🏅', '🏅', '🏅'];
  const medal = medals[place - 1] || '🏅';
  const placeText = place === 1 ? '1-е место' : place === 2 ? '2-е место' : place === 3 ? '3-е место' : `${place}-е место`;

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
          background: 'rgba(0, 0, 0, 0.7)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10000, // ✅ ПОВЫШЕН z-index (выше LoserModal)
          overflow: 'hidden'
        }}
      >
        {/* Конфетти */}
        {confetti.map((particle) => (
          <motion.div
            key={particle.id}
            initial={{ y: -50, x: `${particle.x}vw`, opacity: 1, rotate: 0 }}
            animate={{ 
              y: '110vh', 
              x: `${particle.x + (Math.random() - 0.5) * 20}vw`,
              rotate: Math.random() * 720,
              opacity: 0
            }}
            transition={{ 
              duration: 2 + Math.random() * 2, 
              delay: particle.delay,
              ease: 'easeOut'
            }}
            style={{
              position: 'absolute',
              width: '10px',
              height: '10px',
              background: particle.color,
              borderRadius: '50%',
              pointerEvents: 'none'
            }}
          />
        ))}

        {/* Модальное окно */}
        <motion.div
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          exit={{ scale: 0, rotate: 180 }}
          transition={{ type: 'spring', duration: 0.5 }}
          style={{
            background: 'linear-gradient(135deg, rgba(255, 215, 0, 0.95) 0%, rgba(255, 140, 0, 0.95) 100%)',
            borderRadius: '24px',
            padding: getResponsivePadding(), // ✅ Адаптивный padding
            boxShadow: '0 20px 60px rgba(255, 215, 0, 0.5), 0 0 100px rgba(255, 140, 0, 0.3)',
            border: '3px solid rgba(255, 255, 255, 0.5)',
            textAlign: 'center',
            maxWidth: '400px',
            width: getResponsiveWidth(), // ✅ Адаптивная ширина
            margin: getResponsiveMargin(), // ✅ Адаптивные отступы от края
            position: 'relative',
            overflow: 'hidden'
          } as React.CSSProperties}
        >
          {/* Блики */}
          <motion.div
            animate={{ 
              rotate: [0, 360],
              scale: [1, 1.2, 1]
            }}
            transition={{ 
              duration: 3, 
              repeat: Infinity,
              ease: 'linear'
            }}
            style={{
              position: 'absolute',
              top: '-50%',
              left: '-50%',
              width: '200%',
              height: '200%',
              background: 'radial-gradient(circle, rgba(255, 255, 255, 0.3) 0%, transparent 70%)',
              pointerEvents: 'none'
            }}
          />

          {/* Медаль */}
          <motion.div
            animate={{ 
              scale: [1, 1.2, 1],
              rotate: [0, 10, -10, 0]
            }}
            transition={{ 
              duration: 1, 
              repeat: Infinity,
              ease: 'easeInOut'
            }}
            style={{ 
              fontSize: '80px', 
              marginBottom: '16px',
              filter: 'drop-shadow(0 0 20px rgba(255, 215, 0, 0.8))'
            }}
          >
            {medal}
          </motion.div>

          {/* Аватар */}
          {avatar && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2 }}
              style={{
                width: '80px',
                height: '80px',
                borderRadius: '50%',
                margin: '0 auto 16px',
                overflow: 'hidden',
                border: '4px solid white',
                boxShadow: '0 8px 24px rgba(0, 0, 0, 0.3)'
              }}
            >
              <img 
                src={avatar} 
                alt={playerName}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            </motion.div>
          )}

          {/* Текст */}
          <motion.h2
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3 }}
            style={{
              fontSize: '32px',
              fontWeight: '900',
              color: 'white',
              marginBottom: '8px',
              textShadow: '0 4px 12px rgba(0, 0, 0, 0.5)',
              textTransform: 'uppercase'
            }}
          >
            {placeText}!
          </motion.h2>

          <motion.p
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.4 }}
            style={{
              fontSize: '24px',
              fontWeight: '700',
              color: 'rgba(255, 255, 255, 0.95)',
              textShadow: '0 2px 8px rgba(0, 0, 0, 0.3)'
            }}
          >
            {playerName}
          </motion.p>

          <motion.p
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.5 }}
            style={{
              fontSize: '16px',
              fontWeight: '600',
              color: 'rgba(255, 255, 255, 0.8)',
              marginTop: '16px',
              textShadow: '0 2px 4px rgba(0, 0, 0, 0.2)'
            }}
          >
            🎉 Поздравляем! 🎉
          </motion.p>

          {/* ✅ КНОПКИ ТОЛЬКО ДЛЯ ПОЛЬЗОВАТЕЛЯ! */}
          {isCurrentUser && (
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.6 }}
              style={{
                display: 'flex',
                gap: '16px',
                marginTop: '32px',
                flexDirection: 'column',
                width: '100%',
                maxWidth: '400px'
              }}
            >
              {/* Кнопка "Продолжить просмотр" */}
              <button
                onClick={() => {
                  console.log('👁️ [WinnerModal] Пользователь продолжает просмотр');
                  if (onContinueWatching) onContinueWatching();
                  onClose();
                }}
                style={{
                  padding: '16px 32px',
                  fontSize: '18px',
                  fontWeight: 'bold',
                  color: 'white',
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  border: 'none',
                  borderRadius: '12px',
                  cursor: 'pointer',
                  boxShadow: '0 4px 15px rgba(102, 126, 234, 0.4)',
                  transition: 'all 0.3s ease',
                  textTransform: 'uppercase',
                  letterSpacing: '1px'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 6px 20px rgba(102, 126, 234, 0.6)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 4px 15px rgba(102, 126, 234, 0.4)';
                }}
              >
                👁️ Продолжить просмотр
              </button>

              {/* Кнопка "Выйти в главное меню" */}
              <button
                onClick={() => {
                  console.log('🚪 [WinnerModal] Пользователь выходит в главное меню');
                  if (onExitToMenu) onExitToMenu();
                  onClose();
                }}
                style={{
                  padding: '16px 32px',
                  fontSize: '18px',
                  fontWeight: 'bold',
                  color: 'white',
                  background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
                  border: 'none',
                  borderRadius: '12px',
                  cursor: 'pointer',
                  boxShadow: '0 4px 15px rgba(245, 87, 108, 0.4)',
                  transition: 'all 0.3s ease',
                  textTransform: 'uppercase',
                  letterSpacing: '1px'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 6px 20px rgba(245, 87, 108, 0.6)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 4px 15px rgba(245, 87, 108, 0.4)';
                }}
              >
                🚪 Выйти в главное меню
              </button>
            </motion.div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

