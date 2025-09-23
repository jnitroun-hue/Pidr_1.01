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
        
        {/* ПРОФЕССИОНАЛЬНЫЙ ПОКЕРНЫЙ СТОЛ */}
        <div className="relative mb-12 flex items-center justify-center">
          {/* Покерный стол */}
          <div 
            className="relative w-96 h-64 rounded-full shadow-2xl"
            style={{
              background: 'radial-gradient(ellipse at center, #1e7e34 0%, #155724 50%, #0d4b14 100%)',
              border: '8px solid #8b4513',
              boxShadow: 'inset 0 0 50px rgba(0,0,0,0.3), 0 20px 40px rgba(0,0,0,0.4)'
            }}
          >
            {/* Фетровая текстура */}
            <div className="absolute inset-0 rounded-full opacity-30" style={{
              backgroundImage: `radial-gradient(circle at 25% 25%, transparent 20%, rgba(255,255,255,0.1) 21%, rgba(255,255,255,0.1) 25%, transparent 26%), 
                               radial-gradient(circle at 75% 75%, transparent 20%, rgba(255,255,255,0.1) 21%, rgba(255,255,255,0.1) 25%, transparent 26%)`
            }}></div>

            {/* Центральный логотип */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <div className="text-6xl mb-2 animate-pulse">♠️</div>
                <div className="text-white font-bold text-2xl opacity-80 tracking-wider">P.I.D.R.</div>
                <div className="text-yellow-400 font-semibold text-sm tracking-widest">POKER GAME</div>
              </div>
            </div>

            {/* Позиции игроков с картами */}
            {[0, 1, 2, 3, 4, 5].map((position) => {
              const angle = (position * 60) * Math.PI / 180;
              const x = Math.cos(angle) * 140;
              const y = Math.sin(angle) * 90;
              
              return (
                <div
                  key={position}
                  className="absolute"
                  style={{
                    left: `calc(50% + ${x}px - 20px)`,
                    top: `calc(50% + ${y}px - 15px)`,
                    animation: `playerGlow ${2 + position * 0.3}s ease-in-out infinite alternate`
                  }}
                >
                  {/* Две карты игрока */}
                  <div className="relative flex gap-1">
                    {[0, 1].map((cardIndex) => (
                      <div
                        key={cardIndex}
                        className="w-8 h-12 bg-white rounded border shadow-lg"
                        style={{
                          background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
                          transform: `rotate(${(cardIndex - 0.5) * 10 + (position - 2.5) * 5}deg)`,
                          animation: `cardDeal ${1.5 + position * 0.2}s ease-out ${position * 0.3}s both`
                        }}
                      >
                        {/* Рубашка карты */}
                        <div className="w-full h-full p-1 flex items-center justify-center">
                          <div className="w-full h-full bg-gradient-to-br from-red-700 to-red-900 rounded-sm flex items-center justify-center relative overflow-hidden">
                            {/* Узор */}
                            <div className="absolute inset-0 opacity-30">
                              <div className="w-full h-full" style={{
                                backgroundImage: `repeating-linear-gradient(45deg, transparent, transparent 2px, rgba(255,255,255,0.1) 2px, rgba(255,255,255,0.1) 4px)`
                              }}></div>
                            </div>
                            <div className="text-white font-bold text-xs">♠</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Фишки игрока */}
                  <div className="absolute -bottom-6 left-1/2 transform -translate-x-1/2 flex gap-1">
                    {[0, 1, 2].map((chip) => (
                      <div
                        key={chip}
                        className="w-4 h-4 rounded-full shadow-sm"
                        style={{
                          background: chip === 0 ? 'linear-gradient(135deg, #dc2626, #991b1b)' :
                                     chip === 1 ? 'linear-gradient(135deg, #2563eb, #1d4ed8)' :
                                     'linear-gradient(135deg, #16a34a, #15803d)',
                          animation: `chipStack ${1 + chip * 0.2}s ease-out ${position * 0.2 + chip * 0.1}s both`
                        }}
                      />
                    ))}
                  </div>
                </div>
              );
            })}

            {/* Центральные общие карты (флоп) */}
            <div className="absolute bottom-16 left-1/2 transform -translate-x-1/2 flex gap-2">
              {['A', 'K', 'Q', 'J', '10'].map((value, index) => (
                <div
                  key={value}
                  className="w-10 h-14 bg-white rounded shadow-xl border"
                  style={{
                    animation: `communityCard ${1 + index * 0.2}s ease-out ${1 + index * 0.3}s both`,
                    transform: `rotate(${(index - 2) * 2}deg)`
                  }}
                >
                  {/* Лицевая сторона карты */}
                  <div className="w-full h-full p-1 flex flex-col items-center justify-between">
                    <div className="text-red-600 font-bold text-xs">
                      <div>{value}</div>
                      <div className="text-sm">♥</div>
                    </div>
                    <div className="text-red-600 font-bold text-lg">♥</div>
                    <div className="text-red-600 font-bold text-xs transform rotate-180">
                      <div>{value}</div>
                      <div className="text-sm">♥</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Банк в центре */}
            <div className="absolute top-12 left-1/2 transform -translate-x-1/2">
              <div className="flex flex-col items-center">
                <div className="flex gap-1 mb-2">
                  {[0, 1, 2, 3, 4].map((chip) => (
                    <div
                      key={chip}
                      className="w-6 h-6 rounded-full shadow-lg"
                      style={{
                        background: chip % 2 === 0 ? 
                          'linear-gradient(135deg, #fbbf24, #f59e0b)' : 
                          'linear-gradient(135deg, #8b5cf6, #7c3aed)',
                        animation: `potChip ${1.5 + chip * 0.1}s ease-out ${2 + chip * 0.2}s both`,
                        zIndex: chip
                      }}
                    />
                  ))}
                </div>
                <div className="text-yellow-400 font-bold text-sm animate-pulse">POT</div>
              </div>
            </div>

            {/* Дилер батон */}
            <div 
              className="absolute w-8 h-8 bg-white rounded-full shadow-xl border-2 border-yellow-400 flex items-center justify-center"
              style={{
                right: '20px',
                top: '50%',
                transform: 'translateY(-50%)',
                animation: 'dealerButton 3s ease-in-out infinite'
              }}
            >
              <div className="text-yellow-600 font-bold text-xs">D</div>
            </div>
          </div>

          {/* Летающие фишки вокруг стола */}
          {[...Array(8)].map((_, i) => (
            <div
              key={`flying-chip-${i}`}
              className="absolute w-8 h-8 rounded-full shadow-2xl"
              style={{
                left: `${200 + Math.cos((i * 45) * Math.PI / 180) * 250}px`,
                top: `${150 + Math.sin((i * 45) * Math.PI / 180) * 150}px`,
                background: i % 3 === 0 ? 'linear-gradient(135deg, #dc2626, #991b1b)' :
                           i % 3 === 1 ? 'linear-gradient(135deg, #2563eb, #1d4ed8)' :
                           'linear-gradient(135deg, #16a34a, #15803d)',
                animation: `flyingChip ${3 + i * 0.2}s ease-in-out infinite`,
                animationDelay: `${i * 0.5}s`,
                zIndex: 100 + i
              }}
            />
          ))}
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
        
        @keyframes playerGlow {
          0% { box-shadow: 0 0 10px rgba(59, 130, 246, 0.3); }
          100% { box-shadow: 0 0 20px rgba(59, 130, 246, 0.6), 0 0 30px rgba(59, 130, 246, 0.3); }
        }
        
        @keyframes cardDeal {
          0% { 
            transform: translateX(-200px) translateY(-100px) rotate(180deg) scale(0.5);
            opacity: 0;
          }
          50% {
            opacity: 1;
          }
          100% { 
            transform: translateX(0) translateY(0) rotate(var(--final-rotation, 0deg)) scale(1);
            opacity: 1;
          }
        }
        
        @keyframes communityCard {
          0% { 
            transform: translateY(-50px) rotate(180deg) scale(0);
            opacity: 0;
          }
          50% {
            transform: translateY(-25px) rotate(90deg) scale(0.8);
            opacity: 0.7;
          }
          100% { 
            transform: translateY(0) rotate(var(--final-rotation, 0deg)) scale(1);
            opacity: 1;
          }
        }
        
        @keyframes chipStack {
          0% { 
            transform: translateY(50px) scale(0);
            opacity: 0;
          }
          70% {
            transform: translateY(-5px) scale(1.1);
            opacity: 1;
          }
          100% { 
            transform: translateY(0) scale(1);
            opacity: 1;
          }
        }
        
        @keyframes potChip {
          0% { 
            transform: scale(0) rotate(0deg);
            opacity: 0;
          }
          50% {
            transform: scale(1.2) rotate(180deg);
            opacity: 0.8;
          }
          100% { 
            transform: scale(1) rotate(360deg);
            opacity: 1;
          }
        }
        
        @keyframes dealerButton {
          0%, 100% { 
            transform: translateY(-50%) scale(1) rotate(0deg);
            box-shadow: 0 4px 15px rgba(251, 191, 36, 0.3);
          }
          50% { 
            transform: translateY(-50%) scale(1.1) rotate(180deg);
            box-shadow: 0 6px 25px rgba(251, 191, 36, 0.5);
          }
        }
        
        @keyframes flyingChip {
          0%, 100% { 
            transform: translateY(0px) rotate(0deg) scale(1);
            opacity: 0.8;
          }
          25% { 
            transform: translateY(-15px) rotate(90deg) scale(1.1);
            opacity: 1;
          }
          50% { 
            transform: translateY(-5px) rotate(180deg) scale(0.9);
            opacity: 0.9;
          }
          75% { 
            transform: translateY(-20px) rotate(270deg) scale(1.05);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
}
