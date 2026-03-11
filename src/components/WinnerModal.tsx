'use client'
import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Eye, Home, Crown, Star, Sparkles } from 'lucide-react';

interface WinnerModalProps {
  playerName: string;
  place: number;
  avatar?: string;
  isCurrentUser?: boolean;
  coinsEarned?: number;
  ratingChange?: number;
  isBotGame?: boolean;
  onClose: () => void;
  onContinueWatching?: () => void;
  onExitToMenu?: () => void;
}

export default function WinnerModal({ 
  playerName, 
  place, 
  avatar, 
  isCurrentUser,
  coinsEarned = 0,
  ratingChange = 0,
  isBotGame = false,
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
          <div style={{ marginBottom: '16px' }}>
            {avatar && (
              <div style={{
                width: '80px',
                height: '80px',
                margin: '0 auto 10px',
                borderRadius: '50%',
                border: `3px solid ${placeData.borderColor}`,
                boxShadow: `0 8px 24px rgba(0,0,0,0.4)`,
                overflow: 'hidden'
              }}>
                <img src={avatar} alt={playerName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </div>
            )}
            <h3 style={{
              color: '#ffffff', fontSize: '20px', fontWeight: 'bold',
              textShadow: '0 2px 8px rgba(0,0,0,0.3)', margin: 0,
            }}>
              {playerName}
            </h3>
          </div>

          {/* Инфо: место, монеты, рейтинг */}
          {isCurrentUser && (
            <div style={{
              background: 'rgba(15,23,42,0.5)',
              borderRadius: '16px',
              padding: '14px 18px',
              marginBottom: '16px',
              border: '1px solid rgba(99,102,241,0.15)',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: '#94a3b8', fontSize: '13px' }}>Место</span>
                <span style={{ color: placeData.borderColor, fontSize: '16px', fontWeight: '800' }}>
                  {placeData.subtitle}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: '#94a3b8', fontSize: '13px' }}>Награда</span>
                <span style={{ color: '#22c55e', fontSize: '16px', fontWeight: '800' }}>
                  +{coinsEarned} 🪙
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: '#94a3b8', fontSize: '13px' }}>Рейтинг</span>
                {isBotGame ? (
                  <span style={{ color: '#64748b', fontSize: '13px', fontStyle: 'italic' }}>
                    Игра с ботами
                  </span>
                ) : (
                  <span style={{
                    color: ratingChange >= 0 ? '#22c55e' : '#ef4444',
                    fontSize: '16px', fontWeight: '800',
                  }}>
                    {ratingChange > 0 ? '+' : ''}{ratingChange} 📈
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Кнопки для ПОЛЬЗОВАТЕЛЯ — компактные */}
          {isCurrentUser && onContinueWatching && onExitToMenu && (
            <div style={{ display: 'flex', gap: '10px' }}>
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={onContinueWatching}
                style={{
                  flex: 1, padding: '10px 12px', borderRadius: '12px',
                  fontWeight: '700', fontSize: '13px', color: '#ffffff',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                  background: 'linear-gradient(145deg, #10b981 0%, #059669 100%)',
                  boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)',
                  border: '1.5px solid rgba(255,255,255,0.2)',
                  cursor: 'pointer',
                }}
              >
                <Eye size={16} strokeWidth={2.5} />
                Смотреть
              </motion.button>
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={onExitToMenu}
                style={{
                  flex: 1, padding: '10px 12px', borderRadius: '12px',
                  fontWeight: '700', fontSize: '13px', color: '#ffffff',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                  background: 'linear-gradient(145deg, #6366f1 0%, #4f46e5 100%)',
                  boxShadow: '0 4px 12px rgba(99, 102, 241, 0.3)',
                  border: '1.5px solid rgba(255,255,255,0.2)',
                  cursor: 'pointer',
                }}
              >
                <Home size={16} strokeWidth={2.5} />
                Главная
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
