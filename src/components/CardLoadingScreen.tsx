'use client';

import { useState, useEffect } from 'react';
import { useTranslations, Language } from '../lib/i18n/translations';

interface CardLoadingScreenProps {
  onLoadingComplete?: () => void;
  language?: Language;
  loadingText?: string;
  duration?: number; // в миллисекундах
}

// Карты от 10 до Туза
const CARD_VALUES = ['10', 'J', 'Q', 'K', 'A'];
const CARD_SUITS = ['♠', '♥', '♦', '♣'];
const SUIT_COLORS = {
  '♠': 'text-gray-800', // Пики - черный
  '♣': 'text-gray-800', // Трефы - черный  
  '♥': 'text-red-600',  // Червы - красный
  '♦': 'text-red-600'   // Бубны - красный
};

export default function CardLoadingScreen({ 
  onLoadingComplete,
  language = 'ru',
  loadingText,
  duration = 3000 
}: CardLoadingScreenProps) {
  const [progress, setProgress] = useState(0);
  const [currentMessage, setCurrentMessage] = useState(0);
  const [isVisible, setIsVisible] = useState(true);
  const [cardsAnimating, setCardsAnimating] = useState(false);
  
  const t = useTranslations(language);
  
  const loadingMessages = [
    loadingText || t.loading.initializing,
    t.loading.connecting,
    t.loading.loadingGame,
    t.loading.preparingCards,
    t.loading.almostReady
  ];

  // Создаем массив карт
  const cards = CARD_VALUES.flatMap(value => 
    CARD_SUITS.map(suit => ({ value, suit, id: `${value}${suit}` }))
  );

  useEffect(() => {
    setCardsAnimating(true);
    
    const progressInterval = setInterval(() => {
      setProgress(prev => {
        const newProgress = prev + (100 / (duration / 50));
        
        // Меняем сообщение в зависимости от прогресса
        const messageIndex = Math.floor((newProgress / 100) * loadingMessages.length);
        setCurrentMessage(Math.min(messageIndex, loadingMessages.length - 1));
        
        if (newProgress >= 100) {
          clearInterval(progressInterval);
          
          // Плавно скрываем загрузку
          setTimeout(() => {
            setIsVisible(false);
            setTimeout(() => {
              onLoadingComplete?.();
            }, 500);
          }, 200);
          
          return 100;
        }
        
        return newProgress;
      });
    }, 50);

    return () => clearInterval(progressInterval);
  }, [duration, loadingMessages.length, onLoadingComplete]);

  if (!isVisible) return null;

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900 transition-opacity duration-500 ${!isVisible ? 'opacity-0' : 'opacity-100'}`}>
      {/* Фоновая анимация */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -left-40 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-40 -right-40 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-indigo-500/5 rounded-full blur-3xl animate-spin-slow"></div>
      </div>

      {/* Контейнер для карт и загрузки */}
      <div className="relative z-10 flex flex-col items-center">
        
        {/* Карты в центре */}
        <div className="relative mb-12">
          <div className="grid grid-cols-5 gap-4 p-8">
            {cards.map((card, index) => (
              <div
                key={card.id}
                className={`relative w-16 h-24 bg-white rounded-lg shadow-2xl border-2 border-gray-300 
                           flex flex-col items-center justify-center transform transition-all duration-1000
                           ${cardsAnimating ? 'animate-card-shimmer hover:scale-110' : ''}
                           hover:shadow-blue-500/50 hover:border-blue-400/50`}
                style={{
                  animationDelay: `${index * 100}ms`,
                  background: `linear-gradient(135deg, 
                    rgba(255,255,255,0.95) 0%, 
                    rgba(240,248,255,0.95) 50%, 
                    rgba(255,255,255,0.95) 100%)`,
                  backdropFilter: 'blur(10px)'
                }}
              >
                {/* Переливающаяся рамка */}
                <div className="absolute inset-0 rounded-lg bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 opacity-0 animate-border-glow"></div>
                
                {/* Значение карты сверху слева */}
                <div className={`absolute top-1 left-1 text-xs font-bold ${SUIT_COLORS[card.suit as keyof typeof SUIT_COLORS]}`}>
                  <div>{card.value}</div>
                  <div className="text-lg leading-none">{card.suit}</div>
                </div>
                
                {/* Большой символ масти в центре */}
                <div className={`text-3xl font-bold ${SUIT_COLORS[card.suit as keyof typeof SUIT_COLORS]} opacity-80`}>
                  {card.suit}
                </div>
                
                {/* Значение карты снизу справа (перевернуто) */}
                <div className={`absolute bottom-1 right-1 text-xs font-bold transform rotate-180 ${SUIT_COLORS[card.suit as keyof typeof SUIT_COLORS]}`}>
                  <div>{card.value}</div>
                  <div className="text-lg leading-none">{card.suit}</div>
                </div>
                
                {/* Блик на карте */}
                <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/20 to-transparent rounded-lg opacity-0 animate-card-glint"></div>
              </div>
            ))}
          </div>
        </div>

        {/* Текст загрузки */}
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-white mb-4 animate-pulse">
            P.I.D.R. GAME
          </h2>
          <p className="text-xl text-blue-200 animate-fade-in-out">
            {loadingMessages[currentMessage]}
          </p>
        </div>

        {/* Прогресс бар */}
        <div className="w-80 max-w-md">
          <div className="relative h-3 bg-gray-700/50 rounded-full overflow-hidden backdrop-blur-sm border border-gray-600/50">
            {/* Фоновый градиент */}
            <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 via-purple-600/20 to-pink-600/20"></div>
            
            {/* Прогресс */}
            <div 
              className="relative h-full bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 
                         transition-all duration-300 ease-out rounded-full"
              style={{ width: `${progress}%` }}
            >
              {/* Блик на прогресс баре */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent 
                             animate-shimmer rounded-full"></div>
            </div>
          </div>
          
          {/* Процент загрузки */}
          <div className="text-center mt-3">
            <span className="text-sm text-gray-300 font-mono">
              {Math.round(progress)}%
            </span>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes card-shimmer {
          0%, 100% { 
            transform: scale(1) rotateY(0deg); 
            box-shadow: 0 10px 25px rgba(0,0,0,0.3);
          }
          25% { 
            transform: scale(1.05) rotateY(5deg); 
            box-shadow: 0 15px 35px rgba(59, 130, 246, 0.4);
          }
          50% { 
            transform: scale(1.1) rotateY(0deg); 
            box-shadow: 0 20px 40px rgba(147, 51, 234, 0.4);
          }
          75% { 
            transform: scale(1.05) rotateY(-5deg); 
            box-shadow: 0 15px 35px rgba(236, 72, 153, 0.4);
          }
        }
        
        @keyframes border-glow {
          0%, 100% { opacity: 0; }
          50% { opacity: 0.6; }
        }
        
        @keyframes card-glint {
          0% { opacity: 0; transform: translateX(-100%) skewX(-15deg); }
          50% { opacity: 1; }
          100% { opacity: 0; transform: translateX(100%) skewX(-15deg); }
        }
        
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        
        @keyframes fade-in-out {
          0%, 100% { opacity: 0.7; }
          50% { opacity: 1; }
        }
        
        @keyframes spin-slow {
          from { transform: translate(-50%, -50%) rotate(0deg); }
          to { transform: translate(-50%, -50%) rotate(360deg); }
        }
        
        .animate-card-shimmer {
          animation: card-shimmer 3s ease-in-out infinite;
        }
        
        .animate-border-glow {
          animation: border-glow 2s ease-in-out infinite;
        }
        
        .animate-card-glint {
          animation: card-glint 3s ease-in-out infinite;
        }
        
        .animate-shimmer {
          animation: shimmer 2s ease-in-out infinite;
        }
        
        .animate-fade-in-out {
          animation: fade-in-out 2s ease-in-out infinite;
        }
        
        .animate-spin-slow {
          animation: spin-slow 20s linear infinite;
        }
      `}</style>
    </div>
  );
}
