'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Star, Crown, Gift, Coins, TrendingUp } from 'lucide-react';
import { useEffect, useState } from 'react';

interface VictoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  playerResult: {
    position: number; // 1-9 место
    isWinner: boolean; // true если в топ-3 (победители)
    playerName: string;
    totalPlayers: number;
    gameMode: 'single' | 'multiplayer';
    isRanked: boolean; // рейтинговая игра или нет
    rewards?: {
      experience: number; // +/- опыт
      coins: number; // монеты (всегда положительные для победителей)
      ratingChange: number; // изменение рейтинга
    };
  };
}

export default function VictoryModal({ isOpen, onClose, playerResult }: VictoryModalProps) {
  const [showRewards, setShowRewards] = useState(false);
  const [animatedExp, setAnimatedExp] = useState(0);
  const [animatedCoins, setAnimatedCoins] = useState(0);

  const { position, isWinner, playerName, totalPlayers, gameMode, isRanked, rewards } = playerResult;

  // Анимация наград
  useEffect(() => {
    if (showRewards && rewards) {
      const expDuration = 1500;
      const coinsDuration = 1200;
      
      // Анимация опыта
      const expInterval = setInterval(() => {
        setAnimatedExp(prev => {
          const increment = Math.ceil(Math.abs(rewards.experience) / 30);
          const next = prev + (rewards.experience > 0 ? increment : -increment);
          
          if (rewards.experience > 0 && next >= rewards.experience) {
            clearInterval(expInterval);
            return rewards.experience;
          } else if (rewards.experience < 0 && next <= rewards.experience) {
            clearInterval(expInterval);
            return rewards.experience;
          }
          
          return next;
        });
      }, 50);

      // Анимация монет
      const coinsInterval = setInterval(() => {
        setAnimatedCoins(prev => {
          const increment = Math.ceil(rewards.coins / 25);
          const next = prev + increment;
          
          if (next >= rewards.coins) {
            clearInterval(coinsInterval);
            return rewards.coins;
          }
          
          return next;
        });
      }, 48);

      return () => {
        clearInterval(expInterval);
        clearInterval(coinsInterval);
      };
    }
  }, [showRewards, rewards]);

  // Запуск анимации наград через 2 секунды
  useEffect(() => {
    if (isOpen && rewards) {
      const timer = setTimeout(() => setShowRewards(true), 2000);
      return () => clearTimeout(timer);
    }
  }, [isOpen, rewards]);

  const getPositionText = () => {
    switch (position) {
      case 1: return '1-е место';
      case 2: return '2-е место';
      case 3: return '3-е место';
      default: return `${position}-е место`;
    }
  };

  const getPositionColor = () => {
    switch (position) {
      case 1: return '#ffd700'; // Золото
      case 2: return '#c0c0c0'; // Серебро
      case 3: return '#cd7f32'; // Бронза
      default: return isWinner ? '#22c55e' : '#ef4444'; // Зеленый или красный
    }
  };

  const getPositionIcon = () => {
    switch (position) {
      case 1: return <Crown size={48} className="text-yellow-400" />;
      case 2: return <Trophy size={48} className="text-gray-400" />;
      case 3: return <Star size={48} className="text-orange-400" />;
      default: return isWinner ? <Trophy size={48} className="text-green-400" /> : <div className="text-4xl">😔</div>;
    }
  };

  const getMainMessage = () => {
    if (gameMode === 'single') {
      return isWinner ? `🎉 Победа! ${getPositionText()}` : `😔 Поражение - ${getPositionText()}`;
    } else {
      return isWinner ? `🏆 ${getPositionText()} из ${totalPlayers}!` : `💸 ${getPositionText()} из ${totalPlayers}`;
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.5, opacity: 0, rotateY: -180 }}
            animate={{ scale: 1, opacity: 1, rotateY: 0 }}
            exit={{ scale: 0.5, opacity: 0, rotateY: 180 }}
            transition={{ 
              type: "spring", 
              stiffness: 200, 
              damping: 20,
              duration: 0.8 
            }}
            className="relative mx-4 w-full max-w-md overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-8 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Фоновые эффекты */}
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 via-purple-500/10 to-pink-500/10" />
            <div className="absolute -top-20 -right-20 h-40 w-40 rounded-full bg-gradient-to-br from-yellow-400/20 to-orange-500/20 blur-3xl" />
            <div className="absolute -bottom-20 -left-20 h-40 w-40 rounded-full bg-gradient-to-br from-green-400/20 to-blue-500/20 blur-3xl" />

            {/* Контент */}
            <div className="relative z-10 text-center">
              {/* Иконка позиции */}
              <motion.div
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ delay: 0.3, type: "spring", stiffness: 200 }}
                className="mb-6 flex justify-center"
              >
                {getPositionIcon()}
              </motion.div>

              {/* Основное сообщение */}
              <motion.h1
                initial={{ y: 30, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="mb-2 text-3xl font-bold text-white"
                style={{ color: getPositionColor() }}
              >
                {getMainMessage()}
              </motion.h1>

              {/* Имя игрока */}
              <motion.p
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.7 }}
                className="mb-6 text-lg text-gray-300"
              >
                {playerName}
              </motion.p>

              {/* Награды (только для рейтинговых игр) */}
              {isRanked && rewards && (
                <motion.div
                  initial={{ y: 30, opacity: 0 }}
                  animate={{ y: 0, opacity: showRewards ? 1 : 0 }}
                  transition={{ delay: 1.5 }}
                  className="mb-6 space-y-4"
                >
                  <div className="rounded-2xl bg-white/10 p-4 backdrop-blur-sm">
                    <h3 className="mb-3 text-lg font-semibold text-white">Награды:</h3>
                    
                    {/* Опыт */}
                    <div className="mb-3 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <TrendingUp size={20} className="text-blue-400" />
                        <span className="text-gray-300">Опыт:</span>
                      </div>
                      <motion.span
                        className={`font-bold ${rewards.experience >= 0 ? 'text-green-400' : 'text-red-400'}`}
                        animate={{ scale: animatedExp !== 0 ? [1, 1.2, 1] : 1 }}
                        transition={{ duration: 0.3 }}
                      >
                        {rewards.experience >= 0 ? '+' : ''}{animatedExp}
                      </motion.span>
                    </div>

                    {/* Монеты */}
                    {rewards.coins > 0 && (
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Coins size={20} className="text-yellow-400" />
                          <span className="text-gray-300">Монеты:</span>
                        </div>
                        <motion.span
                          className="font-bold text-yellow-400"
                          animate={{ scale: animatedCoins !== 0 ? [1, 1.2, 1] : 1 }}
                          transition={{ duration: 0.3 }}
                        >
                          +{animatedCoins}
                        </motion.span>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}

              {/* Кнопка закрытия */}
              <motion.button
                initial={{ y: 30, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: isRanked ? 2.5 : 1.5 }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={onClose}
                className="rounded-xl bg-gradient-to-r from-blue-500 to-purple-600 px-8 py-3 font-semibold text-white shadow-lg transition-all hover:shadow-xl"
              >
                Продолжить
              </motion.button>
            </div>

            {/* Конфетти эффект для победителей */}
            {isWinner && (
              <>
                {[...Array(20)].map((_, i) => (
                  <motion.div
                    key={i}
                    initial={{ 
                      y: -100, 
                      x: Math.random() * 400 - 200,
                      rotate: 0,
                      opacity: 1 
                    }}
                    animate={{ 
                      y: 600, 
                      rotate: 360,
                      opacity: 0 
                    }}
                    transition={{ 
                      duration: 3 + Math.random() * 2,
                      delay: Math.random() * 2,
                      ease: "easeOut"
                    }}
                    className="absolute h-3 w-3 rounded-full"
                    style={{
                      backgroundColor: ['#ffd700', '#ff6b6b', '#4ecdc4', '#45b7d1', '#f9ca24'][Math.floor(Math.random() * 5)]
                    }}
                  />
                ))}
              </>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
