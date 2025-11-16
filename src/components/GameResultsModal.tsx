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

  const getMedalText = (place: number) => {
    return `${place}`;
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
      className={`transition-all duration-500 ${isVisible ? 'opacity-100' : 'opacity-0'}`}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(10px)',
        zIndex: 99999,
        pointerEvents: 'auto'
      }}
    >
      <div 
        className={`transform transition-all duration-700 ${
          isVisible ? 'scale-100' : 'scale-75'
        }`}
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: 'min(50vw, 90vw)', // ✅ 50% ЭКРАНА!
          maxWidth: '500px', // ✅ МАКСИМУМ 500px!
          maxHeight: 'min(60vh, 60dvh)', // ✅ 60% ВЫСОТЫ!
          overflowY: 'auto',
          background: 'linear-gradient(145deg, rgba(30, 41, 59, 0.98) 0%, rgba(15, 23, 42, 0.98) 100%)',
          borderRadius: '20px',
          border: '2px solid rgba(99, 102, 241, 0.4)',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7), 0 0 40px rgba(99, 102, 241, 0.3)'
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
              РЕЗУЛЬТАТЫ ИГРЫ
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

        {/* Results Table - КОМПАКТНАЯ */}
        <div className="px-6 py-4 space-y-2">
          {results.map((player, index) => (
            <div
              key={index}
              className="relative transform transition-all duration-300"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '12px',
                background: player.isUser 
                  ? 'linear-gradient(135deg, rgba(59, 130, 246, 0.2) 0%, rgba(37, 99, 235, 0.1) 100%)'
                  : 'linear-gradient(135deg, rgba(51, 65, 85, 0.6) 0%, rgba(30, 41, 59, 0.4) 100%)',
                border: player.isUser ? '2px solid rgba(59, 130, 246, 0.5)' : '1px solid rgba(99, 102, 241, 0.2)',
                borderRadius: '12px',
                boxShadow: player.isUser 
                  ? '0 4px 12px rgba(59, 130, 246, 0.3)' 
                  : '0 2px 8px rgba(0, 0, 0, 0.3)',
                animationDelay: `${index * 100}ms`,
                animation: 'slideInRight 0.5s ease-out forwards',
                opacity: 0
              }}
            >
              {/* Medal/Place - МАЛЕНЬКИЙ */}
              <div 
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: player.place === 1 
                    ? 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)'
                    : player.place === 2
                    ? 'linear-gradient(135deg, #d1d5db 0%, #9ca3af 100%)'
                    : player.place === 3
                    ? 'linear-gradient(135deg, #fb923c 0%, #f97316 100%)'
                    : player.place === results.length
                    ? 'linear-gradient(135deg, #DC143C 0%, #8B0000 100%)'
                    : 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
                  fontSize: '16px',
                  fontWeight: '900',
                  color: '#fff',
                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)'
                }}
              >
                {player.place}
              </div>

              {/* Avatar - МАЛЕНЬКИЙ */}
              {player.avatar && (
                <img 
                  src={player.avatar} 
                  alt={player.name}
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '50%',
                    objectFit: 'cover',
                    border: '2px solid rgba(255, 255, 255, 0.2)',
                    filter: player.place === results.length ? 'grayscale(0.5)' : 'none'
                  }}
                />
              )}

              {/* Name */}
              <div style={{ flex: 1 }}>
                <div style={{
                  fontSize: '15px',
                  fontWeight: '700',
                  color: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}>
                  {player.name}
                  {player.isUser && (
                    <span style={{
                      fontSize: '10px',
                      padding: '2px 6px',
                      background: '#3b82f6',
                      borderRadius: '4px',
                      fontWeight: '700'
                    }}>
                      ВЫ
                    </span>
                  )}
                </div>
                <div style={{
                  fontSize: '11px',
                  color: 'rgba(255, 255, 255, 0.5)'
                }}>
                  {player.place === results.length ? 'Проигравший' : `${player.place}-е место`}
                </div>
              </div>

              {/* Coins - КОМПАКТНО */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                fontSize: '14px',
                fontWeight: '700',
                color: player.coinsEarned > 0 ? '#22c55e' : player.coinsEarned < 0 ? '#ef4444' : '#94a3b8'
              }}>
                💰 {player.coinsEarned > 0 ? '+' : ''}{player.coinsEarned}
              </div>

              {/* Rating (if ranked) */}
              {isRanked && player.ratingChange !== undefined && (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  fontSize: '13px',
                  fontWeight: '700',
                  color: player.ratingChange >= 0 ? '#22c55e' : '#ef4444'
                }}>
                  📈 {player.ratingChange > 0 ? '+' : ''}{player.ratingChange}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Buttons - КАК В ГЛАВНОМ МЕНЮ */}
        <div 
          className="px-6 py-4 border-t border-slate-700/50 flex gap-3"
          style={{
            background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.5) 0%, rgba(15, 23, 42, 0.3) 100%)'
          }}
        >
          <button
            onClick={onPlayAgain}
            className="flex-1 transform transition-all duration-200 hover:scale-105 active:scale-95"
            style={{
              padding: '14px 20px',
              borderRadius: '16px',
              border: '2px solid rgba(16, 185, 129, 0.3)',
              background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.2) 0%, rgba(5, 150, 105, 0.1) 100%)',
              color: '#10b981',
              fontSize: '15px',
              fontWeight: '700',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(16, 185, 129, 0.2)'
            }}
          >
            <RotateCcw size={20} strokeWidth={2.5} />
            ИГРАТЬ СНОВА
          </button>

          <button
            onClick={onMainMenu}
            className="flex-1 transform transition-all duration-200 hover:scale-105 active:scale-95"
            style={{
              padding: '14px 20px',
              borderRadius: '16px',
              border: '2px solid rgba(99, 102, 241, 0.3)',
              background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.2) 0%, rgba(79, 70, 229, 0.1) 100%)',
              color: '#6366f1',
              fontSize: '15px',
              fontWeight: '700',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(99, 102, 241, 0.2)'
            }}
          >
            <Home size={20} strokeWidth={2.5} />
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

