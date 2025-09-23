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
        
        {/* КРАСИВАЯ МОБИЛЬНАЯ ЗАГРУЗКА */}
        <div className="relative mb-12 flex items-center justify-center">
          {/* Центральный логотип */}
          <div className="text-center">
            {/* Основной логотип */}
            <div className="relative mb-8">
              <div className="text-8xl mb-4 animate-bounce">🃏</div>
              <h1 className="text-4xl font-bold text-white mb-2 tracking-wider">P.I.D.R.</h1>
              <p className="text-xl text-blue-300 font-semibold tracking-widest">POKER GAME</p>
            </div>

            {/* Анимированные карты */}
            <div className="relative w-64 h-32 mx-auto mb-8">
              {/* Стопка карт */}
              {[0, 1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="absolute bg-white rounded-lg shadow-xl border border-gray-200"
                  style={{
                    width: '60px',
                    height: '84px',
                    left: `calc(50% - 30px + ${i * 8}px)`,
                    top: `calc(50% - 42px - ${i * 2}px)`,
                    zIndex: 5 - i,
                    transform: `rotate(${(i - 2) * 3}deg)`,
                    animation: `cardFloat ${2 + i * 0.3}s ease-in-out infinite alternate`,
                    animationDelay: `${i * 0.2}s`
                  }}
                >
                  {/* Рубашка карты */}
                  <div className="w-full h-full p-2 flex items-center justify-center">
                    <div className="w-full h-full bg-gradient-to-br from-blue-600 to-purple-700 rounded-md flex items-center justify-center relative overflow-hidden">
                      {/* Узор на рубашке */}
                      <div className="absolute inset-0 opacity-30">
                        <div className="w-full h-full" style={{
                          backgroundImage: `repeating-linear-gradient(45deg, transparent, transparent 4px, rgba(255,255,255,0.2) 4px, rgba(255,255,255,0.2) 8px)`
                        }}></div>
                      </div>
                      <div className="text-white font-bold text-sm">♠</div>
                    </div>
                  </div>
                </div>
              ))}

              {/* Разлетающиеся фишки */}
              {[0, 1, 2].map((i) => (
                <div
                  key={`chip-${i}`}
                  className="absolute w-8 h-8 rounded-full shadow-lg"
                  style={{
                    left: `${20 + i * 80}px`,
                    top: '10px',
                    background: i === 0 ? 'linear-gradient(135deg, #dc2626, #991b1b)' :
                               i === 1 ? 'linear-gradient(135deg, #2563eb, #1d4ed8)' :
                               'linear-gradient(135deg, #16a34a, #15803d)',
                    animation: `chipFloat ${1.5 + i * 0.2}s ease-in-out infinite`,
                    animationDelay: `${i * 0.4}s`,
                    zIndex: 10
                  }}
                />
              ))}
            </div>

            {/* Блестящие эффекты */}
            {[...Array(6)].map((_, i) => (
              <div
                key={`sparkle-${i}`}
                className="absolute w-2 h-2 bg-yellow-400 rounded-full animate-ping"
                style={{
                  left: `${Math.random() * 200 + 50}px`,
                  top: `${Math.random() * 100 + 50}px`,
                  animationDelay: `${Math.random() * 2}s`,
                  animationDuration: `${1 + Math.random()}s`
                }}
              />
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
              className="relative h-full bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 transition-all duration-300 ease-out rounded-full"
              style={{ width: `${progress}%` }}
            >
              {/* Блик на прогресс баре */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer rounded-full"></div>
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
        
        @keyframes cardFloat {
          0%, 100% { transform: translateY(0px) rotate(var(--rotation, 0deg)); }
          50% { transform: translateY(-8px) rotate(var(--rotation, 0deg)); }
        }
        
        @keyframes chipFloat {
          0%, 100% { 
            transform: translateY(0px) scale(1);
            opacity: 0.9;
          }
          50% { 
            transform: translateY(-12px) scale(1.1);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
}
