'use client'

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Star, Crown, Coins, ArrowLeft, RotateCcw } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useGameStore } from '@/store/gameStore';

interface WinnerScreenProps {
  winner: {
    name: string;
    isUser: boolean;
    id: string;
  };
  isVisible: boolean;
  onClose: () => void;
  onPlayAgain?: () => void;
}

export default function WinnerScreen({ winner, isVisible, onClose, onPlayAgain }: WinnerScreenProps) {
  const router = useRouter();
  const { resetGame, startGame } = useGameStore();
  const [showConfetti, setShowConfetti] = useState(false);
  const [coinsEarned] = useState(winner.isUser ? Math.floor(Math.random() * 200) + 50 : 0);

  useEffect(() => {
    if (isVisible) {
      setShowConfetti(true);
      // Убираем конфетти через 3 секунды
      setTimeout(() => setShowConfetti(false), 3000);
    }
  }, [isVisible]);

  const handlePlayAgain = () => {
    resetGame();
    startGame('single', 9);
    onClose();
  };

  const handleBackToMenu = () => {
    resetGame();
    router.push('/');
    onClose();
  };

  if (!isVisible) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        style={{
          background: 'linear-gradient(135deg, rgba(0,0,0,0.9) 0%, rgba(15,23,42,0.95) 50%, rgba(30,58,138,0.9) 100%)',
          backdropFilter: 'blur(10px)'
        }}
      >
        {/* Конфетти эффект */}
        {showConfetti && (
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            {[...Array(50)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute w-2 h-2 rounded-full"
                style={{
                  background: ['#FFD700', '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FECA57'][i % 6],
                  left: `${Math.random() * 100}%`,
                  top: '-10px'
                }}
                animate={{
                  y: window.innerHeight + 100,
                  rotate: 360,
                  opacity: [1, 0.8, 0]
                }}
                transition={{
                  duration: Math.random() * 3 + 2,
                  delay: Math.random() * 2,
                  ease: 'easeOut'
                }}
              />
            ))}
          </div>
        )}

        {/* Основной контент */}
        <motion.div
          initial={{ scale: 0.5, y: 50 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.5, y: 50 }}
          transition={{ type: "spring", stiffness: 300, damping: 25 }}
          className="relative w-full max-w-md mx-auto text-center"
          style={{
            background: 'linear-gradient(135deg, #1e3a8a 0%, #1e293b 50%, #0f172a 100%)',
            border: '3px solid #ffd700',
            borderRadius: '24px',
            padding: '32px 24px',
            boxShadow: '0 25px 50px rgba(0,0,0,0.5), 0 0 50px rgba(255,215,0,0.3)',
          }}
        >
          {/* Корона для победителя */}
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ delay: 0.3, type: "spring", stiffness: 200 }}
            className="flex justify-center mb-6"
          >
            <div
              className="relative p-4 rounded-full"
              style={{
                background: 'linear-gradient(135deg, #ffd700 0%, #ffed4a 100%)',
                boxShadow: '0 8px 25px rgba(255,215,0,0.4)'
              }}
            >
              <Crown className="w-12 h-12 text-amber-900" />
              {/* Блестящий эффект */}
              <div className="absolute inset-0 rounded-full opacity-30">
                <div 
                  className="w-full h-full rounded-full"
                  style={{
                    background: 'linear-gradient(45deg, transparent 30%, rgba(255,255,255,0.6) 50%, transparent 70%)',
                    animation: 'shimmer 2s ease-in-out infinite'
                  }}
                />
              </div>
            </div>
          </motion.div>

          {/* Заголовок */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="text-4xl font-bold mb-2"
            style={{ 
              color: '#ffd700',
              textShadow: '0 0 20px rgba(255,215,0,0.5), 0 2px 4px rgba(0,0,0,0.3)'
            }}
          >
            🎉 ПОБЕДА! 🎉
          </motion.h1>

          {/* Имя победителя */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.7 }}
            className="mb-6"
          >
            <div
              className="inline-block px-6 py-3 rounded-xl mb-4"
              style={{
                background: winner.isUser 
                  ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
                  : 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                border: '2px solid rgba(255,255,255,0.2)',
                boxShadow: '0 4px 15px rgba(0,0,0,0.2)'
              }}
            >
              <h2 className="text-2xl font-bold text-white">
                {winner.isUser ? '🎊 ВЫ ВЫИГРАЛИ!' : `🤖 ${winner.name} ПОБЕДИЛ!`}
              </h2>
            </div>
            
            {!winner.isUser && (
              <p className="text-lg text-gray-300">
                Поздравляем {winner.name}!
              </p>
            )}
          </motion.div>

          {/* Награды для игрока */}
          {winner.isUser && coinsEarned > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.9 }}
              className="mb-6"
            >
              <div
                className="inline-flex items-center gap-3 px-6 py-3 rounded-xl"
                style={{
                  background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                  border: '2px solid rgba(255,255,255,0.2)'
                }}
              >
                <Coins className="w-6 h-6 text-white" />
                <span className="text-xl font-bold text-white">
                  +{coinsEarned} монет
                </span>
              </div>
            </motion.div>
          )}

          {/* Статистика игры */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.1 }}
            className="mb-8"
          >
            <div className="flex justify-center gap-4 text-sm">
              <div className="flex items-center gap-1 text-gray-300">
                <Trophy className="w-4 h-4" />
                <span>Игра завершена</span>
              </div>
              <div className="flex items-center gap-1 text-gray-300">
                <Star className="w-4 h-4" />
                <span>P.I.D.R.</span>
              </div>
            </div>
          </motion.div>

          {/* Кнопки действий */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.3 }}
            className="flex flex-col gap-3"
          >
            {/* Играть снова */}
            <button
              onClick={handlePlayAgain}
              className="flex items-center justify-center gap-3 w-full py-4 px-6 rounded-xl font-bold text-lg transition-all duration-300 hover:scale-105 active:scale-95"
              style={{
                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                border: '2px solid #ffd700',
                color: 'white',
                boxShadow: '0 4px 15px rgba(16,185,129,0.3)'
              }}
            >
              <RotateCcw className="w-5 h-5" />
              ИГРАТЬ СНОВА
            </button>

            {/* В главное меню */}
            <button
              onClick={handleBackToMenu}
              className="flex items-center justify-center gap-3 w-full py-3 px-6 rounded-xl font-bold transition-all duration-300 hover:scale-105 active:scale-95"
              style={{
                background: 'linear-gradient(135deg, rgba(55,65,81,0.8) 0%, rgba(31,41,55,0.8) 100%)',
                border: '2px solid rgba(255,255,255,0.2)',
                color: '#e5e7eb'
              }}
            >
              <ArrowLeft className="w-5 h-5" />
              В ГЛАВНОЕ МЕНЮ
            </button>
          </motion.div>
        </motion.div>

        <style jsx>{`
          @keyframes shimmer {
            0% { transform: translateX(-100%); }
            100% { transform: translateX(100%); }
          }
        `}</style>
      </motion.div>
    </AnimatePresence>
  );
}
