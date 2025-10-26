'use client';

import { useState, useEffect } from 'react';
import { Trophy, Medal, Award, Home, RotateCcw, TrendingUp, Coins } from 'lucide-react';

interface PlayerResult {
  place: number;
  name: string;
  avatar?: string;
  coinsEarned: number;
  ratingChange?: number;
  isUser: boolean;
}

interface GameResultsModalProps {
  results: PlayerResult[];
  isRanked: boolean;
  onPlayAgain: () => void;
  onMainMenu: () => void;
}

export default function GameResultsModal({ 
  results, 
  isRanked, 
  onPlayAgain, 
  onMainMenu 
}: GameResultsModalProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Анимация появления
    setTimeout(() => setIsVisible(true), 100);
  }, []);

  const getMedalEmoji = (place: number) => {
    switch (place) {
      case 1: return '🥇';
      case 2: return '🥈';
      case 3: return '🥉';
      default: return place <= 5 ? '🏅' : '💀';
    }
  };

  const getPlaceColor = (place: number) => {
    switch (place) {
      case 1: return 'from-yellow-400 to-amber-600';
      case 2: return 'from-gray-300 to-gray-500';
      case 3: return 'from-orange-400 to-orange-600';
      default: return 'from-blue-500 to-indigo-600';
    }
  };

  return (
    <div 
      className={`fixed inset-0 z-[10001] flex items-center justify-center transition-all duration-500 ${
        isVisible ? 'opacity-100' : 'opacity-0'
      }`}
      style={{
        background: 'radial-gradient(circle at center, rgba(15, 23, 42, 0.98) 0%, rgba(0, 0, 0, 0.95) 100%)',
        backdropFilter: 'blur(20px)'
      }}
    >
      {/* Confetti Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(50)].map((_, i) => (
          <div
            key={i}
            className="absolute animate-float"
            style={{
              left: `${Math.random() * 100}%`,
              top: `-${Math.random() * 20}%`,
              animationDelay: `${Math.random() * 3}s`,
              animationDuration: `${3 + Math.random() * 2}s`,
              opacity: 0.6
            }}
          >
            {['🎉', '🎊', '⭐', '✨', '🏆'][Math.floor(Math.random() * 5)]}
          </div>
        ))}
      </div>

      <div 
        className={`relative max-w-3xl w-full transform transition-all duration-700 ${
          isVisible ? 'scale-100 translate-y-0' : 'scale-75 translate-y-10'
        }`}
        style={{
          background: 'linear-gradient(145deg, rgba(30, 41, 59, 0.95) 0%, rgba(15, 23, 42, 0.98) 100%)',
          borderRadius: '24px',
          border: '2px solid rgba(99, 102, 241, 0.3)',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 60px rgba(99, 102, 241, 0.2)',
          maxHeight: '90vh',
          overflow: 'auto',
          margin: '20px' // ✅ НОРМАЛЬНЫЕ ОТСТУПЫ!
        }}
      >
        {/* Header */}
        <div 
          className="px-8 py-6 border-b border-slate-700/50"
          style={{
            background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.1) 0%, rgba(139, 92, 246, 0.05) 100%)'
          }}
        >
          <div className="flex items-center justify-center gap-4">
            <Trophy className="text-yellow-400" size={36} strokeWidth={2.5} />
            <h2 
              className="text-3xl font-black text-white"
              style={{
                textShadow: '0 4px 12px rgba(99, 102, 241, 0.4)'
              }}
            >
              🎮 РЕЗУЛЬТАТЫ ИГРЫ
            </h2>
            <Trophy className="text-yellow-400" size={36} strokeWidth={2.5} />
          </div>
          {isRanked && (
            <div className="mt-3 flex items-center justify-center gap-2 text-sm text-amber-400">
              <TrendingUp size={16} />
              <span className="font-semibold">Рейтинговая игра</span>
            </div>
          )}
        </div>

        {/* Results Table */}
        <div className="px-8 py-6 space-y-3">
          {results.map((player, index) => (
            <div
              key={index}
              className={`relative p-4 rounded-xl transform transition-all duration-300 hover:scale-102 ${
                player.isUser ? 'ring-2 ring-blue-500 ring-offset-2 ring-offset-slate-800' : ''
              }`}
              style={{
                background: player.isUser 
                  ? 'linear-gradient(135deg, rgba(59, 130, 246, 0.2) 0%, rgba(37, 99, 235, 0.1) 100%)'
                  : 'linear-gradient(135deg, rgba(51, 65, 85, 0.6) 0%, rgba(30, 41, 59, 0.4) 100%)',
                border: '1px solid rgba(99, 102, 241, 0.2)',
                boxShadow: player.isUser 
                  ? '0 10px 25px rgba(59, 130, 246, 0.3)' 
                  : '0 4px 12px rgba(0, 0, 0, 0.3)',
                animationDelay: `${index * 100}ms`,
                animation: 'slideInRight 0.5s ease-out forwards',
                opacity: 0
              }}
            >
              <div className="flex items-center justify-between">
                {/* Place & Player Info */}
                <div className="flex items-center gap-4 flex-1">
                  {/* Medal/Place */}
                  <div 
                    className={`w-14 h-14 rounded-full flex items-center justify-center bg-gradient-to-br ${getPlaceColor(player.place)} shadow-lg`}
                  >
                    <span className="text-2xl font-black text-white drop-shadow-lg">
                      {getMedalEmoji(player.place)}
                    </span>
                  </div>

                  {/* Avatar & Name */}
                  <div className="flex items-center gap-3 flex-1">
                    {player.avatar && (
                      <img 
                        src={player.avatar} 
                        alt={player.name}
                        className="w-12 h-12 rounded-full border-2 border-slate-600 shadow-md"
                      />
                    )}
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-lg text-white">
                          {player.name}
                        </span>
                        {player.isUser && (
                          <span className="px-2 py-0.5 text-xs font-bold bg-blue-500 text-white rounded-full">
                            ВЫ
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-slate-400">
                        {player.place === results.length ? 'Проигравший' : `${player.place}-е место`}
                      </div>
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="flex items-center gap-6">
                    {/* Coins */}
                    <div className="flex items-center gap-2">
                      <Coins className="text-yellow-400" size={20} />
                      <span className={`font-bold text-lg ${
                        player.coinsEarned > 0 ? 'text-green-400' : 
                        player.coinsEarned < 0 ? 'text-red-400' : 
                        'text-slate-400'
                      }`}>
                        {player.coinsEarned > 0 ? '+' : ''}{player.coinsEarned}
                      </span>
                    </div>

                    {/* Rating (if ranked) */}
                    {isRanked && player.ratingChange !== undefined && (
                      <div className="flex items-center gap-2">
                        <TrendingUp 
                          className={player.ratingChange >= 0 ? 'text-green-400' : 'text-red-400'} 
                          size={18} 
                        />
                        <span className={`font-bold ${
                          player.ratingChange >= 0 ? 'text-green-400' : 'text-red-400'
                        }`}>
                          {player.ratingChange > 0 ? '+' : ''}{player.ratingChange}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Buttons */}
        <div 
          className="px-8 py-6 border-t border-slate-700/50 flex gap-4"
          style={{
            background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.5) 0%, rgba(15, 23, 42, 0.3) 100%)'
          }}
        >
          <button
            onClick={onPlayAgain}
            className="flex-1 py-4 px-6 rounded-xl font-bold text-lg text-white transform transition-all duration-200 hover:scale-105 active:scale-95 flex items-center justify-center gap-3 shadow-xl"
            style={{
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              boxShadow: '0 10px 25px rgba(16, 185, 129, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.1)',
              textShadow: '0 2px 4px rgba(0, 0, 0, 0.3)'
            }}
          >
            <RotateCcw size={24} strokeWidth={2.5} />
            ИГРАТЬ СНОВА
          </button>

          <button
            onClick={onMainMenu}
            className="flex-1 py-4 px-6 rounded-xl font-bold text-lg text-white transform transition-all duration-200 hover:scale-105 active:scale-95 flex items-center justify-center gap-3 shadow-xl"
            style={{
              background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
              boxShadow: '0 10px 25px rgba(99, 102, 241, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.1)',
              textShadow: '0 2px 4px rgba(0, 0, 0, 0.3)'
            }}
          >
            <Home size={24} strokeWidth={2.5} />
            В ГЛАВНОЕ МЕНЮ
          </button>
        </div>
      </div>

      <style jsx>{`
        @keyframes float {
          0%, 100% { transform: translateY(0) rotate(0deg); opacity: 0; }
          10% { opacity: 0.6; }
          90% { opacity: 0.6; }
          100% { transform: translateY(100vh) rotate(360deg); opacity: 0; }
        }
        @keyframes slideInRight {
          from {
            opacity: 0;
            transform: translateX(30px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
        .animate-float {
          animation: float linear infinite;
        }
      `}</style>
    </div>
  );
}

