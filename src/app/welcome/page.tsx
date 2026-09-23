'use client'
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { Trophy, Users, Zap, BookOpen, Play, Star, Sparkles } from 'lucide-react';

export default function WelcomePage() {
  const router = useRouter();
  const [isVisible, setIsVisible] = useState(false);
  const [currentFeature, setCurrentFeature] = useState(0);

  useEffect(() => {
    setIsVisible(true);
    
    // Автоматическая смена фич
    const interval = setInterval(() => {
      setCurrentFeature(prev => (prev + 1) % 3);
    }, 3000);
    
    return () => clearInterval(interval);
  }, []);

  const features = [
    {
      icon: <Trophy size={48} />,
      title: 'Соревнуйся',
      description: 'Играй с друзьями и поднимайся в рейтинге!',
      color: '#fbbf24'
    },
    {
      icon: <Users size={48} />,
      title: 'Мультиплеер',
      description: 'До 9 игроков в одной комнате!',
      color: '#3b82f6'
    },
    {
      icon: <Zap size={48} />,
      title: 'NFT Карты',
      description: 'Создавай уникальные карты и торгуй ими!',
      color: '#8b5cf6'
    }
  ];

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #334155 100%)',
      display: 'flex',
      alignItems: 'flex-start',
      justifyContent: 'center',
      padding: '20px',
      paddingTop: 'calc(var(--app-chrome-top, 12px) + 56px)',
      paddingBottom: '48px',
      position: 'relative',
      overflowX: 'hidden',
      overflowY: 'auto'
    }}>
      {/* Анимированный фон */}
      <div style={{
        position: 'absolute',
        inset: 0,
        opacity: 0.1,
        background: 'radial-gradient(circle at 50% 50%, rgba(99, 102, 241, 0.3) 0%, transparent 50%)',
        animation: 'pulse 4s ease-in-out infinite'
      }} />

      {/* Падающие карты на фоне */}
      {[...Array(10)].map((_, i) => (
        <motion.div
          key={i}
          initial={{ y: -100, x: `${Math.random() * 100}%`, rotate: 0, opacity: 0 }}
          animate={{ 
            y: '110vh', 
            rotate: 360,
            opacity: [0, 0.3, 0.3, 0]
          }}
          transition={{ 
            duration: 8 + Math.random() * 4, 
            delay: i * 0.5,
            repeat: Infinity,
            ease: 'linear'
          }}
          style={{
            position: 'absolute',
            fontSize: '40px',
            pointerEvents: 'none'
          }}
        >
          {['🎴', '🃏', '♠️', '♥️', '♦️', '♣️'][Math.floor(Math.random() * 6)]}
        </motion.div>
      ))}

      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: isVisible ? 1 : 0.8, opacity: isVisible ? 1 : 0 }}
        transition={{ duration: 0.5 }}
        style={{
          maxWidth: '600px',
          width: '100%',
          background: 'linear-gradient(145deg, rgba(30, 41, 59, 0.95) 0%, rgba(15, 23, 42, 0.95) 100%)',
          borderRadius: '24px',
          padding: '40px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7), 0 0 40px rgba(99, 102, 241, 0.3)',
          border: '2px solid rgba(99, 102, 241, 0.3)',
          backdropFilter: 'blur(20px)',
          position: 'relative',
          zIndex: 1
        }}
      >
        {/* Логотип и название */}
        <motion.div
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
          style={{
            textAlign: 'center',
            marginBottom: '30px'
          }}
        >
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
              fontSize: '80px',
              marginBottom: '10px',
              filter: 'drop-shadow(0 8px 16px rgba(99, 102, 241, 0.5))'
            }}
          >
            🎴
          </motion.div>
          
          <h1 style={{
            fontSize: '48px',
            fontWeight: '900',
            background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #ec4899 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            marginBottom: '10px',
            textShadow: '0 4px 12px rgba(99, 102, 241, 0.3)'
          }}>
            The Must!
          </h1>
          
          <p style={{
            color: '#94a3b8',
            fontSize: '16px',
            fontWeight: '600',
            letterSpacing: '2px',
            textTransform: 'uppercase'
          }}>
            Карточная игра нового поколения
          </p>
        </motion.div>

        {/* Описание игры */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.4 }}
          style={{
            background: 'rgba(99, 102, 241, 0.1)',
            border: '1px solid rgba(99, 102, 241, 0.3)',
            borderRadius: '16px',
            padding: '20px',
            marginBottom: '30px'
          }}
        >
          <p style={{
            color: '#e2e8f0',
            fontSize: '15px',
            lineHeight: '1.6',
            textAlign: 'center',
            margin: 0
          }}>
            🎯 Стратегическая карточная игра с элементами блефа и тактики
            <br />
            🏆 Соревнуйся с игроками со всего мира
            <br />
            💎 Создавай уникальные NFT карты
          </p>
        </motion.div>

        {/* Карусель фич */}
        <div style={{
          height: '140px',
          marginBottom: '30px',
          position: 'relative'
        }}>
          <AnimatePresence mode="wait">
            <motion.div
              key={currentFeature}
              initial={{ x: 100, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -100, opacity: 0 }}
              transition={{ duration: 0.5 }}
              style={{
                position: 'absolute',
                width: '100%',
                textAlign: 'center'
              }}
            >
              <motion.div
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
                style={{
                  color: features[currentFeature].color,
                  marginBottom: '15px',
                  display: 'flex',
                  justifyContent: 'center'
                }}
              >
                {features[currentFeature].icon}
              </motion.div>
              <h3 style={{
                color: '#f1f5f9',
                fontSize: '24px',
                fontWeight: '800',
                marginBottom: '10px'
              }}>
                {features[currentFeature].title}
              </h3>
              <p style={{
                color: '#94a3b8',
                fontSize: '14px'
              }}>
                {features[currentFeature].description}
              </p>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Индикаторы */}
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          gap: '8px',
          marginBottom: '30px'
        }}>
          {features.map((_, index) => (
            <div
              key={index}
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                background: currentFeature === index ? '#6366f1' : 'rgba(148, 163, 184, 0.3)',
                transition: 'all 0.3s ease',
                cursor: 'pointer'
              }}
              onClick={() => setCurrentFeature(index)}
            />
          ))}
        </div>

        {/* Кнопки действий */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '12px'
        }}>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => router.push('/')}
            style={{
              background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
              color: 'white',
              border: 'none',
              borderRadius: '12px',
              padding: '16px',
              fontSize: '18px',
              fontWeight: '700',
              cursor: 'pointer',
              boxShadow: '0 8px 24px rgba(99, 102, 241, 0.4)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px',
              transition: 'all 0.3s ease'
            }}
          >
            <Play size={24} />
            Начать играть
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => router.push('/rules')}
            style={{
              background: 'rgba(99, 102, 241, 0.1)',
              color: '#6366f1',
              border: '2px solid rgba(99, 102, 241, 0.3)',
              borderRadius: '12px',
              padding: '16px',
              fontSize: '16px',
              fontWeight: '600',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px',
              transition: 'all 0.3s ease'
            }}
          >
            <BookOpen size={20} />
            Правила игры
          </motion.button>
        </div>

        {/* Статистика */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.6 }}
          style={{
            marginTop: '30px',
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '15px',
            paddingTop: '20px',
            borderTop: '1px solid rgba(148, 163, 184, 0.2)'
          }}
        >
          {[
            { icon: '👥', value: '10K+', label: 'Игроков' },
            { icon: '🎮', value: '50K+', label: 'Игр' },
            { icon: '⭐', value: '4.8', label: 'Рейтинг' }
          ].map((stat, index) => (
            <div
              key={index}
              style={{
                textAlign: 'center'
              }}
            >
              <div style={{ fontSize: '24px', marginBottom: '5px' }}>{stat.icon}</div>
              <div style={{
                color: '#f1f5f9',
                fontSize: '20px',
                fontWeight: '800',
                marginBottom: '2px'
              }}>
                {stat.value}
              </div>
              <div style={{
                color: '#64748b',
                fontSize: '12px'
              }}>
                {stat.label}
              </div>
            </div>
          ))}
        </motion.div>
      </motion.div>

      <style jsx global>{`
        @keyframes pulse {
          0%, 100% {
            opacity: 0.1;
            transform: scale(1);
          }
          50% {
            opacity: 0.2;
            transform: scale(1.05);
          }
        }
      `}</style>
    </div>
  );
}

