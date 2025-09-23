'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

interface CardLoadingScreenProps {
  onLoadingComplete?: () => void;
  language?: 'ru' | 'en';
  loadingText?: string;
  duration?: number;
}

export default function CardLoadingScreen({ 
  onLoadingComplete,
  language = 'ru',
  loadingText,
  duration = 3000 
}: CardLoadingScreenProps) {
  const [progress, setProgress] = useState(0);
  const [currentMessage, setCurrentMessage] = useState(0);

  const loadingMessages = [
    'Тасуем колоду...',
    'Подготавливаем стол...',
    'Раздаем карты...',
    'Размещаем фишки...',
    'Добро пожаловать!'
  ];

  // 4 карты: Валет, Дама, Король, Туз с правильными цветами мастей
  const cards = [
    { suit: '♠', color: '#000000', name: 'J', suitName: 'Пики' },      // Черный
    { suit: '♥', color: '#dc2626', name: 'Q', suitName: 'Червы' },    // Красный  
    { suit: '♣', color: '#16a34a', name: 'K', suitName: 'Крести' },   // Зеленый
    { suit: '♦', color: '#2563eb', name: 'A', suitName: 'Буби' }      // Синий
  ];

  useEffect(() => {
    const progressInterval = setInterval(() => {
      setProgress(prev => {
        const newProgress = prev + Math.random() * 12 + 3;
        if (newProgress >= 100) {
          clearInterval(progressInterval);
          setTimeout(() => {
            onLoadingComplete?.();
          }, 500);
          return 100;
        }
        return newProgress;
      });
    }, 150);

    const messageInterval = setInterval(() => {
      setCurrentMessage(prev => (prev + 1) % loadingMessages.length);
    }, 1200);

    return () => {
      clearInterval(progressInterval);
      clearInterval(messageInterval);
    };
  }, [onLoadingComplete, loadingMessages.length]);

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{
        background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 25%, #1e3a8a 50%, #1e293b 75%, #0f172a 100%)',
        backgroundSize: '400% 400%',
        animation: 'gradientShift 10s ease infinite'
      }}
    >
      {/* Фоновые элементы */}
      <div className="absolute inset-0 overflow-hidden">
        {[...Array(12)].map((_, i) => (
          <div
            key={i}
            className="absolute opacity-10"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              fontSize: `${Math.random() * 25 + 15}px`,
              color: '#ffd700',
              animation: `floatSlow ${5 + Math.random() * 3}s ease-in-out infinite`,
              animationDelay: `${Math.random() * 3}s`
            }}
          >
            {['♠', '♥', '♦', '♣'][Math.floor(Math.random() * 4)]}
          </div>
        ))}
      </div>

      {/* Основной контент */}
      <div className="relative z-10 flex flex-col items-center text-center px-4">
        
        {/* Заголовок */}
        <motion.div
          initial={{ opacity: 0, y: -40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.2, ease: "easeOut" }}
          className="mb-10"
        >
          <h1 
            className="text-6xl font-bold text-white mb-3 tracking-wider"
            style={{
              textShadow: '0 0 30px rgba(255,215,0,0.6), 0 4px 8px rgba(0,0,0,0.5)',
              background: 'linear-gradient(135deg, #ffffff 0%, #ffd700 50%, #ffffff 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text'
            }}
          >
            P.I.D.R.
          </h1>
          <div className="text-xl font-bold text-yellow-400 tracking-[0.3em] mb-2">
            КАРТОЧНАЯ ИГРА
          </div>
          <div className="w-32 h-1 bg-gradient-to-r from-transparent via-yellow-400 to-transparent mx-auto"></div>
        </motion.div>

        {/* 4 карты по центру */}
        <div className="relative mb-16">
          <div className="flex items-center justify-center gap-6">
            {cards.map((card, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, scale: 0.3, rotateY: 180, y: 50 }}
                animate={{ opacity: 1, scale: 1, rotateY: 0, y: 0 }}
                transition={{ 
                  duration: 1,
                  delay: 0.5 + index * 0.2,
                  type: "spring",
                  stiffness: 120,
                  damping: 12
                }}
                className="relative"
              >
                <div 
                  className="w-20 h-28 bg-white rounded-xl shadow-2xl border-2 border-gray-100 flex flex-col items-center justify-between p-3 relative overflow-hidden"
                  style={{
                    background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 50%, #ffffff 100%)',
                    boxShadow: `0 12px 35px rgba(0,0,0,0.4), 0 0 20px ${card.color}30`,
                    animation: `cardFloat ${3 + index * 0.4}s ease-in-out infinite`,
                    animationDelay: `${index * 0.3}s`
                  }}
                >
                  {/* Переливающийся эффект */}
                  <div 
                    className="absolute inset-0 opacity-25"
                    style={{
                      background: `linear-gradient(45deg, transparent 30%, ${card.color}40 50%, transparent 70%)`,
                      animation: `shimmerCard ${2.5 + index * 0.3}s ease-in-out infinite`,
                      animationDelay: `${index * 0.5}s`
                    }}
                  />
                  
                  {/* Верхний угол */}
                  <div className="flex flex-col items-center z-10">
                    <div 
                      className="text-lg font-bold leading-none"
                      style={{ color: card.color }}
                    >
                      {card.name}
                    </div>
                    <div 
                      className="text-xl leading-none"
                      style={{ color: card.color }}
                    >
                      {card.suit}
                    </div>
                  </div>
                  
                  {/* Центральный символ */}
                  <div 
                    className="text-4xl font-bold z-10"
                    style={{ 
                      color: card.color,
                      textShadow: `0 0 15px ${card.color}60`,
                      animation: `pulse ${2 + index * 0.2}s ease-in-out infinite`
                    }}
                  >
                    {card.suit}
                  </div>
                  
                  {/* Нижний угол (перевернутый) */}
                  <div className="flex flex-col items-center transform rotate-180 z-10">
                    <div 
                      className="text-lg font-bold leading-none"
                      style={{ color: card.color }}
                    >
                      {card.name}
                    </div>
                    <div 
                      className="text-xl leading-none"
                      style={{ color: card.color }}
                    >
                      {card.suit}
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Полоска загрузки с процентами */}
        <div className="w-96 max-w-md mb-8">
          <div className="relative h-5 bg-gray-900/60 rounded-full overflow-hidden border-2 border-yellow-400/40 shadow-lg">
            <div className="absolute inset-0 bg-gradient-to-r from-yellow-600/30 via-yellow-400/30 to-yellow-600/30"></div>
            <motion.div 
              className="relative h-full rounded-full"
              style={{ 
                width: `${progress}%`,
                background: 'linear-gradient(90deg, #fbbf24 0%, #f59e0b 25%, #fbbf24 50%, #f59e0b 75%, #fbbf24 100%)',
                backgroundSize: '200% 100%',
                animation: 'gradientMove 2s ease-in-out infinite'
              }}
              transition={{ duration: 0.3, ease: "easeOut" }}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/50 to-transparent animate-shimmer rounded-full"></div>
            </motion.div>
          </div>
          <div className="text-center mt-4">
            <span 
              className="text-2xl text-yellow-400 font-mono font-bold"
              style={{
                textShadow: '0 0 10px rgba(251, 191, 36, 0.5)'
              }}
            >
              {Math.round(progress)}%
            </span>
          </div>
        </div>

        {/* Надпись "Загрузка игры" */}
        <motion.div
          key={currentMessage}
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -15 }}
          transition={{ duration: 0.6 }}
          className="text-center"
        >
          <h2 className="text-2xl text-white font-bold mb-3" style={{
            textShadow: '0 2px 4px rgba(0,0,0,0.5)'
          }}>
            Загрузка игры
          </h2>
          <p className="text-lg text-blue-200 font-medium">
            {loadingMessages[currentMessage]}
          </p>
        </motion.div>
      </div>

      <style jsx>{`
        @keyframes floatSlow {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-20px) rotate(10deg); }
        }
        
        @keyframes gradientShift {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        
        @keyframes cardFloat {
          0%, 100% { 
            transform: translateY(0px) scale(1) rotateZ(0deg);
            filter: brightness(1);
          }
          50% { 
            transform: translateY(-12px) scale(1.03) rotateZ(1deg);
            filter: brightness(1.1);
          }
        }
        
        @keyframes shimmerCard {
          0% { transform: translateX(-120%) rotate(45deg); }
          100% { transform: translateX(250%) rotate(45deg); }
        }
        
        @keyframes gradientMove {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        
        @keyframes pulse {
          0%, 100% { 
            transform: scale(1);
            opacity: 1;
          }
          50% { 
            transform: scale(1.1);
            opacity: 0.8;
          }
        }
      `}</style>
    </div>
  );
}