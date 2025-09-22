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
        
        {/* Карты в центре - ПРОФЕССИОНАЛЬНЫЙ ВИД */}
        <div className="relative mb-12 flex items-center justify-center">
          <div className="relative">
            {/* Основная колода карт */}
            <div className="relative w-24 h-36">
              {/* Стопка карт (создаем эффект колоды) */}
              {[...Array(8)].map((_, i) => (
                <div
                  key={i}
                  className="absolute bg-white rounded-lg shadow-xl border border-gray-300"
                  style={{
                    width: '96px',
                    height: '144px',
                    left: `${i * 2}px`,
                    top: `${i * -2}px`,
                    zIndex: 10 - i,
                    background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
                    transform: `rotate(${(i - 4) * 2}deg)`,
                    animation: `cardFloat ${2 + i * 0.2}s ease-in-out infinite alternate`
                  }}
                >
                  {/* Рубашка карты */}
                  <div className="w-full h-full p-2 flex items-center justify-center">
                    <div className="w-full h-full bg-gradient-to-br from-blue-600 to-purple-700 rounded-md flex items-center justify-center relative overflow-hidden">
                      {/* Узор на рубашке */}
                      <div className="absolute inset-0 opacity-20">
                        <div className="w-full h-full" style={{
                          backgroundImage: `repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(255,255,255,0.1) 10px, rgba(255,255,255,0.1) 20px)`
                        }}></div>
                      </div>
                      <div className="text-white font-bold text-lg opacity-80">P.I.D.R.</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Разлетающиеся карты */}
            {CARD_VALUES.slice(0, 5).map((value, index) => (
              <div
                key={`flying-${value}`}
                className="absolute bg-white rounded-lg shadow-2xl border border-gray-300 w-20 h-28 flex flex-col items-center justify-center"
                style={{
                  left: `${120 + Math.cos((index * 2 * Math.PI) / 5) * 80}px`,
                  top: `${20 + Math.sin((index * 2 * Math.PI) / 5) * 60}px`,
                  transform: `rotate(${(index - 2) * 15}deg)`,
                  animation: `cardFly ${3 + index * 0.3}s ease-in-out infinite`,
                  animationDelay: `${index * 0.5}s`,
                  zIndex: 20 + index
                }}
              >
                {/* Значение карты */}
                <div className="text-red-600 font-bold text-sm">
                  <div>{value}</div>
                  <div className="text-base">♥</div>
                </div>
                <div className="text-2xl text-red-600 font-bold">♥</div>
                <div className="text-red-600 font-bold text-sm transform rotate-180">
                  <div>{value}</div>
                  <div className="text-base">♥</div>
                </div>
              </div>
            ))}

            {/* Блестящие эффекты */}
            {[...Array(12)].map((_, i) => (
              <div
                key={`sparkle-${i}`}
                className="absolute w-2 h-2 bg-yellow-400 rounded-full animate-ping"
                style={{
                  left: `${Math.random() * 300}px`,
                  top: `${Math.random() * 200}px`,
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
        
        @keyframes cardFloat {
          0%, 100% { transform: translateY(0px) rotate(var(--rotation, 0deg)); }
          50% { transform: translateY(-10px) rotate(var(--rotation, 0deg)); }
        }
        
        @keyframes cardFly {
          0%, 100% { 
            transform: translateY(0px) rotate(var(--rotation, 0deg)) scale(1); 
            opacity: 0.8;
          }
          50% { 
            transform: translateY(-20px) rotate(var(--rotation, 0deg)) scale(1.1); 
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
}
