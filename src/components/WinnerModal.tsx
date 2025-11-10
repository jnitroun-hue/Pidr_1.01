'use client'
import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Eye, Home, Crown, Star, Sparkles } from 'lucide-react';

interface WinnerModalProps {
  playerName: string;
  place: number;
  avatar?: string;
  isCurrentUser?: boolean;
  onClose: () => void;
  onContinueWatching?: () => void;
  onExitToMenu?: () => void;
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

  useEffect(() => {
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
          gradient: 'linear-gradient(145deg, #1e293b 0%, #0f172a 100%)',
          borderColor: '#FFD700',
          icon: <Crown size={48} strokeWidth={2.5} style={{ color: '#FFD700' }} />,
          title: '🏆 ПОБЕДА!',
          subtitle: '1-е место',
          iconBg: 'rgba(255, 215, 0, 0.15)'
        };
      case 2:
        return {
          gradient: 'linear-gradient(145deg, #1e293b 0%, #0f172a 100%)',
          borderColor: '#C0C0C0',
          icon: <Trophy size={44} strokeWidth={2.5} style={{ color: '#C0C0C0' }} />,
          title: '🥈 ОТЛИЧНО!',
          subtitle: '2-е место',
          iconBg: 'rgba(192, 192, 192, 0.15)'
        };
      case 3:
        return {
          gradient: 'linear-gradient(145deg, #1e293b 0%, #0f172a 100%)',
          borderColor: '#CD7F32',
          icon: <Star size={44} strokeWidth={2.5} style={{ color: '#CD7F32' }} />,
          title: '🥉 МОЛОДЕЦ!',
          subtitle: '3-е место',
          iconBg: 'rgba(205, 127, 50, 0.15)'
        };
      default:
        return {
          gradient: 'linear-gradient(145deg, #1e293b 0%, #0f172a 100%)',
          borderColor: '#8b5cf6',
          icon: <Sparkles size={40} strokeWidth={2.5} style={{ color: '#8b5cf6' }} />,
          title: '🎉 ФИНИШ!',
          subtitle: `${place}-е место`,
          iconBg: 'rgba(139, 92, 246, 0.15)'
        };
    }
  };

  const placeData = getPlaceData(place);

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
            background: placeData.gradient,
            border: `3px solid ${placeData.borderColor}`,
            borderRadius: '24px',
            padding: '30px',
            maxWidth: '420px',
            width: '100%',
            position: 'relative',
            boxShadow: `0 20px 60px rgba(${placeData.borderColor === '#FFD700' ? '255, 215, 0' : placeData.borderColor === '#C0C0C0' ? '192, 192, 192' : placeData.borderColor === '#CD7F32' ? '205, 127, 50' : '139, 92, 246'}, 0.3)`,
            textAlign: 'center'
          }}
        >
          {/* Иконка места */}
          <div style={{
            width: '100px',
            height: '100px',
            margin: '0 auto 20px',
            borderRadius: '50%',
            background: placeData.iconBg,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: `3px solid ${placeData.borderColor}`,
            boxShadow: `0 10px 30px rgba(${placeData.borderColor === '#FFD700' ? '255, 215, 0' : placeData.borderColor === '#C0C0C0' ? '192, 192, 192' : placeData.borderColor === '#CD7F32' ? '205, 127, 50' : '139, 92, 246'}, 0.4)`
          }}>
            {placeData.icon}
          </div>

          {/* Заголовок */}
          <h2 style={{
            color: '#ffffff',
            fontSize: '32px',
            fontWeight: 'black',
            marginBottom: '8px',
            textShadow: '0 2px 10px rgba(0,0,0,0.5)'
          }}>
            {placeData.title}
          </h2>

          {/* Место */}
          <div style={{
            color: placeData.borderColor,
            fontSize: '18px',
            fontWeight: '700',
            marginBottom: '25px',
            textShadow: '0 2px 8px rgba(0,0,0,0.3)'
          }}>
            {placeData.subtitle}
          </div>

          {/* Аватар и имя */}
          <div style={{ marginBottom: '25px' }}>
            {avatar && (
              <div style={{
                width: '100px',
                height: '100px',
                margin: '0 auto 15px',
                borderRadius: '50%',
                background: `linear-gradient(135deg, ${placeData.borderColor}, ${placeData.borderColor}aa)`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: `4px solid rgba(${placeData.borderColor === '#FFD700' ? '255, 215, 0' : placeData.borderColor === '#C0C0C0' ? '192, 192, 192' : placeData.borderColor === '#CD7F32' ? '205, 127, 50' : '139, 92, 246'}, 0.3)`,
                boxShadow: `0 10px 30px rgba(${placeData.borderColor === '#FFD700' ? '255, 215, 0' : placeData.borderColor === '#C0C0C0' ? '192, 192, 192' : placeData.borderColor === '#CD7F32' ? '205, 127, 50' : '139, 92, 246'}, 0.4)`,
                overflow: 'hidden'
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
            <h3 style={{
              color: '#ffffff',
              fontSize: '24px',
              fontWeight: 'bold',
              textShadow: '0 2px 8px rgba(0,0,0,0.3)'
            }}>
              {playerName}
            </h3>
          </div>

          {/* Кнопки для ПОЛЬЗОВАТЕЛЯ */}
          {isCurrentUser && onContinueWatching && onExitToMenu && (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '12px'
            }}>
              <motion.button
                whileHover={{ scale: 1.05, y: -2 }}
                whileTap={{ scale: 0.98, y: 0 }}
                onClick={onContinueWatching}
                style={{
                  width: '100%',
                  padding: '14px 20px',
                  borderRadius: '16px',
                  fontWeight: 'bold',
                  fontSize: '16px',
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '10px',
                  background: 'linear-gradient(145deg, #10b981 0%, #059669 100%)',
                  boxShadow: '0 8px 20px rgba(16, 185, 129, 0.35), inset 0 2px 4px rgba(255, 255, 255, 0.4), inset 0 -2px 4px rgba(0, 0, 0, 0.2)',
                  border: '2px solid rgba(255, 255, 255, 0.3)',
                  textShadow: '0 2px 6px rgba(0, 0, 0, 0.4)',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                <Eye size={20} strokeWidth={2.5} />
                Продолжить просмотр
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.05, y: -2 }}
                whileTap={{ scale: 0.98, y: 0 }}
                onClick={onExitToMenu}
                style={{
                  width: '100%',
                  padding: '14px 20px',
                  borderRadius: '16px',
                  fontWeight: 'bold',
                  fontSize: '16px',
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '10px',
                  background: 'linear-gradient(145deg, #6366f1 0%, #4f46e5 100%)',
                  boxShadow: '0 8px 20px rgba(99, 102, 241, 0.35), inset 0 2px 4px rgba(255, 255, 255, 0.4), inset 0 -2px 4px rgba(0, 0, 0, 0.2)',
                  border: '2px solid rgba(255, 255, 255, 0.3)',
                  textShadow: '0 2px 6px rgba(0, 0, 0, 0.4)',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                <Home size={20} strokeWidth={2.5} />
                Выйти в главное меню
              </motion.button>
            </div>
          )}

          {/* Индикатор автозакрытия для ботов */}
          {!isCurrentUser && (
            <motion.div
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ duration: 3, ease: 'linear' }}
              style={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
                height: '4px',
                borderRadius: '0 0 20px 20px',
                background: `linear-gradient(90deg, ${placeData.borderColor} 0%, ${placeData.borderColor}88 100%)`,
                transformOrigin: 'left'
              }}
            />
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
