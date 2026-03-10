'use client'
import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Lightbulb, ChevronRight, Sparkles, Target, MousePointer2 } from 'lucide-react';

export interface TutorialStep {
  id: string;
  title: string;
  content: string | React.ReactNode;
  icon?: string;
  highlight?: string; // CSS selector для подсветки элемента
  arrowDirection?: 'up' | 'down' | 'left' | 'right' | 'none'; // Направление стрелки
  position?: 'top' | 'bottom' | 'center'; // Позиция модалки
  spotlightText?: string; // Текст у стрелки
  stepType?: 'welcome' | 'action' | 'info' | 'warning' | 'tip'; // Тип шага
}

interface TutorialModalProps {
  isOpen: boolean;
  step: TutorialStep | null;
  onClose: () => void;
  onNext?: () => void;
  showNext?: boolean;
  totalSteps?: number;
  currentStepIndex?: number;
}

// Анимированная стрелка-указатель
function AnimatedArrow({ direction = 'down', text }: { direction: string; text?: string }) {
  const arrowStyles: Record<string, React.CSSProperties> = {
    up: { transform: 'rotate(180deg)' },
    down: { transform: 'rotate(0deg)' },
    left: { transform: 'rotate(90deg)' },
    right: { transform: 'rotate(-90deg)' },
  };

  return (
    <motion.div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '8px',
        ...arrowStyles[direction],
      }}
    >
      <motion.div
        animate={{
          y: [0, 12, 0],
        }}
        transition={{
          duration: 1.2,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        {/* Линия стрелки */}
        <motion.div
          style={{
            width: '3px',
            height: '40px',
            background: 'linear-gradient(to bottom, transparent, #fbbf24)',
            borderRadius: '2px',
          }}
        />
        {/* Наконечник */}
        <svg width="20" height="14" viewBox="0 0 20 14" fill="none">
          <path d="M10 14L0 0H20L10 14Z" fill="#fbbf24" />
        </svg>
      </motion.div>
      {text && (
        <motion.span
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          style={{
            color: '#fbbf24',
            fontSize: '12px',
            fontWeight: '700',
            textTransform: 'uppercase',
            letterSpacing: '1px',
            transform: direction === 'up' ? 'rotate(180deg)' : 'none',
          }}
        >
          {text}
        </motion.span>
      )}
    </motion.div>
  );
}

// Пульсирующий маркер для указания на элемент
function PulsingMarker() {
  return (
    <motion.div
      style={{
        position: 'relative',
        width: '24px',
        height: '24px',
      }}
    >
      <motion.div
        animate={{
          scale: [1, 1.8, 1],
          opacity: [0.6, 0, 0.6],
        }}
        transition={{
          duration: 1.5,
          repeat: Infinity,
          ease: 'easeOut',
        }}
        style={{
          position: 'absolute',
          inset: 0,
          borderRadius: '50%',
          background: 'rgba(251, 191, 36, 0.4)',
        }}
      />
      <motion.div
        animate={{
          scale: [1, 1.3, 1],
        }}
        transition={{
          duration: 1.5,
          repeat: Infinity,
          ease: 'easeOut',
          delay: 0.2,
        }}
        style={{
          position: 'absolute',
          inset: '4px',
          borderRadius: '50%',
          background: '#fbbf24',
          boxShadow: '0 0 20px rgba(251, 191, 36, 0.6)',
        }}
      />
    </motion.div>
  );
}

// Иконки для типов шагов
function StepTypeIcon({ type }: { type?: string }) {
  switch (type) {
    case 'welcome':
      return <Sparkles size={20} color="#fbbf24" />;
    case 'action':
      return <MousePointer2 size={20} color="#22c55e" />;
    case 'warning':
      return <Target size={20} color="#ef4444" />;
    case 'tip':
      return <Lightbulb size={20} color="#fbbf24" />;
    default:
      return <Lightbulb size={20} color="#fbbf24" />;
  }
}

// Цвета для типов шагов
function getStepColors(type?: string) {
  switch (type) {
    case 'welcome':
      return {
        gradient: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
        glow: 'rgba(99, 102, 241, 0.4)',
        border: 'rgba(99, 102, 241, 0.6)',
        accent: '#818cf8',
      };
    case 'action':
      return {
        gradient: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
        glow: 'rgba(34, 197, 94, 0.4)',
        border: 'rgba(34, 197, 94, 0.6)',
        accent: '#4ade80',
      };
    case 'warning':
      return {
        gradient: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
        glow: 'rgba(239, 68, 68, 0.4)',
        border: 'rgba(239, 68, 68, 0.6)',
        accent: '#f87171',
      };
    case 'tip':
      return {
        gradient: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)',
        glow: 'rgba(251, 191, 36, 0.4)',
        border: 'rgba(251, 191, 36, 0.6)',
        accent: '#fcd34d',
      };
    default:
      return {
        gradient: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
        glow: 'rgba(99, 102, 241, 0.4)',
        border: 'rgba(99, 102, 241, 0.6)',
        accent: '#818cf8',
      };
  }
}

export default function TutorialModal({
  isOpen,
  step,
  onClose,
  onNext,
  showNext = false,
  totalSteps = 0,
  currentStepIndex = 0,
}: TutorialModalProps) {
  const [particles, setParticles] = useState<Array<{ id: number; x: number; y: number; size: number; delay: number }>>([]);

  // Генерируем частицы для фона
  useEffect(() => {
    if (isOpen) {
      const newParticles = Array.from({ length: 20 }, (_, i) => ({
        id: i,
        x: Math.random() * 100,
        y: Math.random() * 100,
        size: Math.random() * 4 + 2,
        delay: Math.random() * 2,
      }));
      setParticles(newParticles);
    }
  }, [isOpen, step?.id]);

  if (!isOpen || !step) return null;

  const colors = getStepColors(step.stepType);
  const positionStyles = getPositionStyles(step.position);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Затемнение фона с частицами */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
            onClick={onClose}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(0, 0, 0, 0.88)',
              zIndex: 9999,
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
              overflow: 'hidden',
            }}
          >
            {/* Анимированные частицы */}
            {particles.map((p) => (
              <motion.div
                key={p.id}
                initial={{ opacity: 0, scale: 0 }}
                animate={{
                  opacity: [0, 0.6, 0],
                  scale: [0, 1, 0],
                  y: [0, -60],
                }}
                transition={{
                  duration: 3,
                  repeat: Infinity,
                  delay: p.delay,
                  ease: 'easeOut',
                }}
                style={{
                  position: 'absolute',
                  left: `${p.x}%`,
                  top: `${p.y}%`,
                  width: `${p.size}px`,
                  height: `${p.size}px`,
                  borderRadius: '50%',
                  background: colors.accent,
                  boxShadow: `0 0 ${p.size * 3}px ${colors.glow}`,
                  pointerEvents: 'none',
                }}
              />
            ))}

            {/* Стрелка указатель (если есть направление) */}
            {step.arrowDirection && step.arrowDirection !== 'none' && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6 }}
                style={{
                  position: 'absolute',
                  ...(step.arrowDirection === 'down' && { bottom: '25%', left: '50%', transform: 'translateX(-50%)' }),
                  ...(step.arrowDirection === 'up' && { top: '15%', left: '50%', transform: 'translateX(-50%)' }),
                  ...(step.arrowDirection === 'left' && { left: '15%', top: '50%', transform: 'translateY(-50%)' }),
                  ...(step.arrowDirection === 'right' && { right: '15%', top: '50%', transform: 'translateY(-50%)' }),
                  zIndex: 10001,
                  pointerEvents: 'none',
                }}
              >
                <AnimatedArrow
                  direction={step.arrowDirection}
                  text={step.spotlightText}
                />
              </motion.div>
            )}
          </motion.div>

          {/* Основная модалка */}
          <motion.div
            initial={{ opacity: 0, scale: 0.7, y: 60 }}
            animate={{
              opacity: 1,
              scale: 1,
              y: 0,
              transition: {
                type: 'spring',
                damping: 22,
                stiffness: 280,
                mass: 0.7,
              },
            }}
            exit={{
              opacity: 0,
              scale: 0.85,
              y: 40,
              transition: { duration: 0.25, ease: 'easeIn' },
            }}
            style={{
              position: 'fixed',
              left: '5%',
              right: '5%',
              width: '90%',
              maxWidth: '500px',
              margin: '0 auto',
              background: 'linear-gradient(145deg, rgba(30, 41, 59, 0.98) 0%, rgba(15, 23, 42, 0.99) 100%)',
              borderRadius: '24px',
              border: `3px solid ${colors.border}`,
              boxShadow: `0 30px 80px rgba(0, 0, 0, 0.6), 0 0 60px ${colors.glow}, inset 0 1px 0 rgba(255, 255, 255, 0.1)`,
              zIndex: 10000,
              padding: '0',
              overflow: 'hidden',
              ...positionStyles,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Верхняя полоса с градиентом */}
            <motion.div
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ duration: 0.6, delay: 0.2, ease: 'easeOut' }}
              style={{
                height: '4px',
                background: colors.gradient,
                transformOrigin: 'left',
              }}
            />

            {/* Контейнер содержимого */}
            <div style={{ padding: 'clamp(20px, 4vw, 32px)' }}>
              {/* Индикатор шагов + кнопка закрытия */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '16px',
              }}>
                {/* Точки-индикаторы шагов */}
                {totalSteps > 1 && (
                  <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                    {Array.from({ length: totalSteps }, (_, i) => (
                      <motion.div
                        key={i}
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: 0.1 * i }}
                        style={{
                          width: i === currentStepIndex ? '24px' : '8px',
                          height: '8px',
                          borderRadius: '4px',
                          background: i === currentStepIndex
                            ? colors.gradient
                            : i < currentStepIndex
                              ? 'rgba(99, 102, 241, 0.4)'
                              : 'rgba(100, 116, 139, 0.3)',
                          transition: 'all 0.3s ease',
                        }}
                      />
                    ))}
                    <span style={{
                      color: '#64748b',
                      fontSize: '12px',
                      marginLeft: '8px',
                      fontWeight: '600',
                    }}>
                      {currentStepIndex + 1}/{totalSteps}
                    </span>
                  </div>
                )}

                {/* Тип шага */}
                {totalSteps <= 1 && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <StepTypeIcon type={step.stepType} />
                    <span style={{
                      color: colors.accent,
                      fontSize: '11px',
                      fontWeight: '700',
                      textTransform: 'uppercase',
                      letterSpacing: '1.5px',
                    }}>
                      {step.stepType === 'welcome' ? 'Добро пожаловать' :
                        step.stepType === 'action' ? 'Действие' :
                          step.stepType === 'warning' ? 'Важно' :
                            step.stepType === 'tip' ? 'Подсказка' : 'Обучение'}
                    </span>
                  </div>
                )}

                {/* Кнопка закрытия */}
                {!showNext && (
                  <motion.button
                    onClick={onClose}
                    whileHover={{ scale: 1.1, rotate: 90 }}
                    whileTap={{ scale: 0.9 }}
                    style={{
                      background: 'rgba(239, 68, 68, 0.15)',
                      border: '1.5px solid rgba(239, 68, 68, 0.3)',
                      borderRadius: '10px',
                      padding: '6px',
                      cursor: 'pointer',
                      color: '#ef4444',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'all 0.2s',
                    }}
                  >
                    <X size={16} />
                  </motion.button>
                )}
              </div>

              {/* Иконка + Заголовок */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '14px',
                marginBottom: '16px',
              }}>
                {step.icon && (
                  <motion.div
                    initial={{ scale: 0, rotate: -180 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{
                      type: 'spring',
                      damping: 12,
                      stiffness: 180,
                      delay: 0.15,
                    }}
                    style={{
                      fontSize: 'clamp(36px, 8vw, 52px)',
                      filter: 'drop-shadow(0 4px 8px rgba(0, 0, 0, 0.3))',
                      flexShrink: 0,
                      lineHeight: 1,
                    }}
                  >
                    {step.icon}
                  </motion.div>
                )}
                <div>
                  <motion.h2
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.2, duration: 0.4 }}
                    style={{
                      fontSize: 'clamp(18px, 4vw, 26px)',
                      fontWeight: '800',
                      background: colors.gradient,
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      backgroundClip: 'text',
                      margin: 0,
                      lineHeight: 1.2,
                    }}
                  >
                    {step.title}
                  </motion.h2>
                </div>
              </div>

              {/* Контент со стрелкой-маркером */}
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3, duration: 0.4 }}
                style={{
                  color: '#cbd5e1',
                  fontSize: 'clamp(14px, 2.5vw, 17px)',
                  lineHeight: '1.7',
                  marginBottom: '20px',
                  background: 'rgba(15, 23, 42, 0.5)',
                  borderRadius: '16px',
                  padding: 'clamp(14px, 3vw, 20px)',
                  border: '1px solid rgba(100, 116, 139, 0.15)',
                  position: 'relative',
                }}
              >
                {/* Декоративная линия слева */}
                <div style={{
                  position: 'absolute',
                  left: 0,
                  top: '12px',
                  bottom: '12px',
                  width: '3px',
                  borderRadius: '2px',
                  background: colors.gradient,
                }} />

                <div style={{ paddingLeft: '12px' }}>
                  {typeof step.content === 'string' ? (
                    <p style={{ margin: 0, whiteSpace: 'pre-line' }}>
                      {step.content}
                    </p>
                  ) : (
                    step.content
                  )}
                </div>
              </motion.div>

              {/* Визуальная подсказка со стрелкой (если нужно показать куда нажимать) */}
              {step.arrowDirection && step.arrowDirection !== 'none' && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    marginBottom: '16px',
                    padding: '10px 14px',
                    background: 'rgba(251, 191, 36, 0.08)',
                    border: '1px solid rgba(251, 191, 36, 0.2)',
                    borderRadius: '12px',
                  }}
                >
                  <PulsingMarker />
                  <span style={{
                    color: '#fbbf24',
                    fontSize: '13px',
                    fontWeight: '600',
                  }}>
                    {step.spotlightText || 'Обратите внимание на подсвеченный элемент'}
                  </span>
                </motion.div>
              )}

              {/* Кнопка действия */}
              <motion.button
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.45, duration: 0.3 }}
                onClick={showNext && onNext ? onNext : onClose}
                whileHover={{
                  scale: 1.03,
                  boxShadow: `0 15px 40px ${colors.glow}, 0 0 50px ${colors.glow}`,
                }}
                whileTap={{ scale: 0.97 }}
                style={{
                  width: '100%',
                  padding: 'clamp(14px, 3vw, 18px) 24px',
                  background: colors.gradient,
                  color: 'white',
                  border: 'none',
                  borderRadius: '14px',
                  fontSize: 'clamp(15px, 3vw, 18px)',
                  fontWeight: '700',
                  cursor: 'pointer',
                  boxShadow: `0 8px 24px ${colors.glow}`,
                  transition: 'all 0.3s',
                  touchAction: 'manipulation',
                  WebkitTapHighlightColor: 'transparent',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  position: 'relative',
                  overflow: 'hidden',
                }}
              >
                {/* Бегущий свет на кнопке */}
                <motion.div
                  animate={{ x: ['-100%', '200%'] }}
                  transition={{
                    duration: 2.5,
                    repeat: Infinity,
                    repeatDelay: 1.5,
                    ease: 'easeInOut',
                  }}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '50%',
                    height: '100%',
                    background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent)',
                    pointerEvents: 'none',
                  }}
                />
                <span style={{ position: 'relative', zIndex: 1 }}>
                  {showNext ? 'Далее' : 'Понятно'}
                </span>
                {showNext ? (
                  <ChevronRight size={18} style={{ position: 'relative', zIndex: 1 }} />
                ) : (
                  <span style={{ position: 'relative', zIndex: 1 }}>✓</span>
                )}
              </motion.button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

function getPositionStyles(position?: string): React.CSSProperties {
  switch (position) {
    case 'top':
      return { top: '5%', bottom: 'auto' };
    case 'bottom':
      return { bottom: '5%', top: 'auto' };
    case 'center':
    default:
      return { top: '50%', transform: 'translateY(-50%)' };
  }
}
