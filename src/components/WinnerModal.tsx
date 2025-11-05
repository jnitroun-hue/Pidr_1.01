'use client'
import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Eye, Home, Crown, Star, Sparkles } from 'lucide-react';

interface WinnerModalProps {
  playerName: string;
  place: number;
  avatar?: string;
  isCurrentUser?: boolean; // ✅ Флаг что это ПОЛЬЗОВАТЕЛЬ победил (не бот)
  onClose: () => void;
  onContinueWatching?: () => void; // ✅ Кнопка "Продолжить просмотр"
  onExitToMenu?: () => void; // ✅ Кнопка "Выйти в главное меню"
}

export default function WinnerModal({ 
  playerName, 
  place, 
  avatar, 
  isCurrentUser, 
  onClose, 
  onContinueWatching, 
  onExitToMenu 
}: WinnerModalProps) {
  const [confetti, setConfetti] = useState<Array<{ id: number; x: number; delay: number; color: string }>>([]);

  useEffect(() => {
    // Генерируем конфетти
    const newConfetti = Array.from({ length: 60 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      delay: Math.random() * 0.8,
      color: ['#FFD700', '#FFA500', '#FF6B6B', '#4ECDC4', '#95E1D3', '#F38181'][Math.floor(Math.random() * 6)]
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

  // Определяем цвета и данные по месту
  const getPlaceData = (place: number) => {
    switch (place) {
      case 1:
        return {
          gradient: 'linear-gradient(135deg, #FFD700 0%, #FFA500 50%, #FF8C00 100%)',
          icon: <Crown size={48} className="text-white" strokeWidth={2.5} />,
          glowColor: 'rgba(255, 215, 0, 0.6)',
          title: '🏆 ПОБЕДА!',
          subtitle: '1-е место'
        };
      case 2:
        return {
          gradient: 'linear-gradient(135deg, #E8E8E8 0%, #C0C0C0 50%, #A8A8A8 100%)',
          icon: <Trophy size={44} className="text-white" strokeWidth={2.5} />,
          glowColor: 'rgba(192, 192, 192, 0.5)',
          title: '🥈 ОТЛИЧНО!',
          subtitle: '2-е место'
        };
      case 3:
        return {
          gradient: 'linear-gradient(135deg, #CD7F32 0%, #B8732C 50%, #A0632A 100%)',
          icon: <Star size={44} className="text-white" strokeWidth={2.5} />,
          glowColor: 'rgba(205, 127, 50, 0.5)',
          title: '🥉 МОЛОДЕЦ!',
          subtitle: '3-е место'
        };
      default:
        return {
          gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 50%, #5e35b1 100%)',
          icon: <Sparkles size={40} className="text-white" strokeWidth={2.5} />,
          glowColor: 'rgba(102, 126, 234, 0.5)',
          title: '🎉 ФИНИШ!',
          subtitle: `${place}-е место`
        };
    }
  };

  const placeData = getPlaceData(place);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 flex items-center justify-center overflow-hidden"
        style={{
          background: 'rgba(0, 0, 0, 0.95)',
          backdropFilter: 'blur(20px)',
          zIndex: 99999,
          pointerEvents: 'auto'
        }}
      >
        {/* Анимированный фон с частицами */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {confetti.map((particle) => (
            <motion.div
              key={particle.id}
              initial={{ y: -20, x: `${particle.x}%`, opacity: 1, scale: 0 }}
              animate={{ 
                y: '120vh', 
                x: `${particle.x + (Math.random() - 0.5) * 30}%`,
                rotate: Math.random() * 720,
                opacity: [0, 1, 1, 0],
                scale: [0, 1, 1, 0.5]
              }}
              transition={{ 
                duration: 3 + Math.random() * 2, 
                delay: particle.delay,
                ease: 'easeOut'
              }}
              className="absolute"
              style={{
                width: '12px',
                height: '12px',
                background: particle.color,
                borderRadius: '50%',
                boxShadow: `0 0 10px ${particle.color}`
              }}
            />
          ))}
        </div>

        {/* Основная карточка - АДАПТИВНАЯ ПОД ЭКРАН */}
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="relative mx-auto"
          style={{
            width: 'min(90vw, 420px)',
            maxHeight: '80vh',
            minWidth: '280px',
            background: placeData.gradient,
            borderRadius: '24px',
            padding: '28px 20px',
            overflow: 'auto',
            boxShadow: `0 20px 60px -10px ${placeData.glowColor}, 0 0 0 1px rgba(255, 255, 255, 0.2), inset 0 1px 3px rgba(255, 255, 255, 0.3)`,
            border: '2px solid rgba(255, 255, 255, 0.4)',
            textAlign: 'center'
          }}
        >
          {/* Блик */}
          <motion.div
            animate={{ 
              x: ['-100%', '200%'],
            }}
            transition={{ 
              duration: 3, 
              repeat: Infinity,
              ease: 'easeInOut',
              repeatDelay: 1
            }}
            className="absolute top-0 left-0 w-1/2 h-full pointer-events-none"
            style={{
              background: 'linear-gradient(90deg, transparent 0%, rgba(255, 255, 255, 0.3) 50%, transparent 100%)',
              filter: 'blur(20px)'
            }}
          />

          {/* Иконка места */}
          <motion.div
            animate={{ 
              scale: [1, 1.08, 1],
              rotate: [0, 2, -2, 0]
            }}
            transition={{ 
              duration: 2.5, 
              repeat: Infinity,
              ease: 'easeInOut'
            }}
            className="flex justify-center mb-3"
            style={{
              filter: `drop-shadow(0 8px 24px ${placeData.glowColor})`,
              transform: 'scale(0.65)' // ✅ ЕЩЁ МЕНЬШЕ ИКОНКИ!
            }}
          >
            {placeData.icon}
          </motion.div>

          {/* Заголовок - СТИЛЬ ПОКЕРА */}
          <motion.h2
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="text-3xl font-black text-white text-center mb-2"
            style={{
              textShadow: '0 6px 16px rgba(0, 0, 0, 0.6), 0 2px 4px rgba(0, 0, 0, 0.4), 0 0 20px rgba(255, 255, 255, 0.3)',
              letterSpacing: '0.05em',
              fontFamily: 'system-ui, -apple-system, sans-serif',
              WebkitTextStroke: '1px rgba(0, 0, 0, 0.3)'
            }}
          >
            {placeData.title}
          </motion.h2>

          {/* Место - ОБЪЁМНОЕ */}
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.3, type: 'spring', stiffness: 200 }}
            className="text-lg font-bold text-white/95 text-center mb-5"
            style={{
              textShadow: '0 3px 10px rgba(0, 0, 0, 0.5)',
              background: 'rgba(0, 0, 0, 0.25)',
              padding: '6px 16px',
              borderRadius: '12px',
              display: 'inline-block',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(255, 255, 255, 0.2)'
            }}
          >
            {placeData.subtitle}
          </motion.div>

          {/* Аватар и имя */}
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="flex flex-col items-center gap-3 mb-6"
          >
            {avatar && (
              <motion.div 
                animate={{ 
                  scale: [1, 1.05, 1],
                  rotate: [0, 5, -5, 0]
                }}
                transition={{ 
                  duration: 2, 
                  repeat: Infinity,
                  ease: 'easeInOut'
                }}
                className="relative"
                style={{
                  width: '80px', // ✅ АВАТАР В КРУЖОЧКЕ!
                  height: '80px',
                  borderRadius: '50%',
                  padding: '4px',
                  background: place === 1 
                    ? 'linear-gradient(135deg, #FFD700 0%, #FFA500 100%)'
                    : place === 2
                    ? 'linear-gradient(135deg, #E8E8E8 0%, #C0C0C0 100%)'
                    : place === 3
                    ? 'linear-gradient(135deg, #CD7F32 0%, #A0632A 100%)'
                    : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  boxShadow: `0 8px 30px ${placeData.glowColor}, inset 0 2px 4px rgba(255, 255, 255, 0.6)`,
                  border: '3px solid rgba(255, 255, 255, 0.8)'
                }}
              >
                <img 
                  src={avatar} 
                  alt={playerName}
                  style={{
                    width: '100%',
                    height: '100%',
                    borderRadius: '50%',
                    objectFit: 'cover'
                  }}
                />
              </motion.div>
            )}
            <div className="text-xl font-black text-white text-center px-4 py-2 rounded-xl"
              style={{
                background: 'rgba(0, 0, 0, 0.4)',
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                textShadow: '0 2px 8px rgba(0, 0, 0, 0.5)'
              }}
            >
              {playerName}
            </div>
          </motion.div>

          {/* Кнопки для ПОЛЬЗОВАТЕЛЯ */}
          {isCurrentUser && onContinueWatching && onExitToMenu && (
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.6 }}
              className="flex flex-col gap-3"
            >
              <motion.button
                whileHover={{ scale: 1.05, y: -2, boxShadow: '0 16px 40px rgba(16, 185, 129, 0.5)' }}
                whileTap={{ scale: 0.98, y: 0 }}
                onClick={onContinueWatching}
                className="w-full py-3 px-5 rounded-xl font-bold text-base text-white flex items-center justify-center gap-2 transition-all duration-200"
                style={{
                  background: 'linear-gradient(145deg, #10b981 0%, #059669 100%)',
                  boxShadow: '0 8px 20px rgba(16, 185, 129, 0.35), inset 0 2px 4px rgba(255, 255, 255, 0.4), inset 0 -2px 4px rgba(0, 0, 0, 0.2)',
                  border: '2px solid rgba(255, 255, 255, 0.3)',
                  textShadow: '0 2px 6px rgba(0, 0, 0, 0.4)',
                  cursor: 'pointer'
                }}
              >
                <Eye size={20} strokeWidth={2.5} />
                Продолжить просмотр
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.05, y: -2, boxShadow: '0 16px 40px rgba(99, 102, 241, 0.5)' }}
                whileTap={{ scale: 0.98, y: 0 }}
                onClick={onExitToMenu}
                className="w-full py-3 px-5 rounded-xl font-bold text-base text-white flex items-center justify-center gap-2 transition-all duration-200"
                style={{
                  background: 'linear-gradient(145deg, #6366f1 0%, #4f46e5 100%)',
                  boxShadow: '0 8px 20px rgba(99, 102, 241, 0.35), inset 0 2px 4px rgba(255, 255, 255, 0.4), inset 0 -2px 4px rgba(0, 0, 0, 0.2)',
                  border: '2px solid rgba(255, 255, 255, 0.3)',
                  textShadow: '0 2px 6px rgba(0, 0, 0, 0.4)',
                  cursor: 'pointer'
                }}
              >
                <Home size={20} strokeWidth={2.5} />
                Выйти в главное меню
              </motion.button>
            </motion.div>
          )}

          {/* Индикатор автозакрытия для ботов */}
          {!isCurrentUser && (
            <motion.div
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ duration: 3, ease: 'linear' }}
              className="absolute bottom-0 left-0 right-0 h-1 rounded-b-[28px]"
              style={{
                background: 'linear-gradient(90deg, rgba(255, 255, 255, 0.8) 0%, rgba(255, 255, 255, 0.4) 100%)',
                transformOrigin: 'left'
              }}
            />
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
