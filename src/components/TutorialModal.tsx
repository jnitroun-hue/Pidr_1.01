'use client'
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Lightbulb } from 'lucide-react';

export interface TutorialStep {
  id: string;
  title: string;
  content: string | React.ReactNode;
  icon?: string;
  highlight?: string; // Что подсветить на экране
}

interface TutorialModalProps {
  isOpen: boolean;
  step: TutorialStep | null;
  onClose: () => void;
  onNext?: () => void;
  showNext?: boolean;
}

export default function TutorialModal({ 
  isOpen, 
  step, 
  onClose, 
  onNext,
  showNext = false 
}: TutorialModalProps) {
  if (!isOpen || !step) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Затемнение фона */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(0, 0, 0, 0.85)',
              zIndex: 9999, // ✅ Высокий z-index для Telegram Web App
              backdropFilter: 'blur(4px)',
              // ✅ Для Telegram Web App
              WebkitBackdropFilter: 'blur(4px)'
            }}
          />
          
          {/* Модалка */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            style={{
              position: 'fixed',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              width: '90%',
              maxWidth: '500px',
              background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.98) 0%, rgba(15, 23, 42, 0.98) 100%)',
              borderRadius: '20px',
              border: '3px solid rgba(99, 102, 241, 0.5)',
              boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5), 0 0 40px rgba(99, 102, 241, 0.3)',
              zIndex: 10000, // ✅ Высокий z-index для Telegram Web App
              padding: '30px',
              maxHeight: '85vh',
              overflowY: 'auto',
              // ✅ Для Telegram Web App - убеждаемся что модалка поверх всего
              WebkitTransform: 'translate(-50%, -50%)',
              msTransform: 'translate(-50%, -50%)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Заголовок */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '20px',
              paddingBottom: '15px',
              borderBottom: '2px solid rgba(99, 102, 241, 0.3)'
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px'
              }}>
                {step.icon && (
                  <div style={{
                    fontSize: '32px',
                    filter: 'drop-shadow(0 2px 4px rgba(0, 0, 0, 0.3))'
                  }}>
                    {step.icon}
                  </div>
                )}
                {!step.icon && (
                  <Lightbulb 
                    size={28} 
                    style={{ 
                      color: '#fbbf24',
                      filter: 'drop-shadow(0 0 8px rgba(251, 191, 36, 0.5))'
                    }} 
                  />
                )}
                <h2 style={{
                  fontSize: '24px',
                  fontWeight: '800',
                  background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                  margin: 0
                }}>
                  {step.title}
                </h2>
              </div>
              {!showNext && (
                <button
                  onClick={onClose}
                  style={{
                    background: 'rgba(239, 68, 68, 0.2)',
                    border: '2px solid rgba(239, 68, 68, 0.3)',
                    borderRadius: '8px',
                    padding: '8px',
                    cursor: 'pointer',
                    color: '#ef4444',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(239, 68, 68, 0.3)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'rgba(239, 68, 68, 0.2)';
                  }}
                >
                  <X size={20} />
                </button>
              )}
            </div>

            {/* Контент */}
            <div style={{
              color: '#e2e8f0',
              fontSize: '16px',
              lineHeight: '1.7',
              marginBottom: '25px'
            }}>
              {typeof step.content === 'string' ? (
                <p style={{ margin: 0, whiteSpace: 'pre-line' }}>
                  {step.content}
                </p>
              ) : (
                step.content
              )}
            </div>

            {/* Кнопка */}
            <motion.button
              onClick={showNext && onNext ? onNext : onClose}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              style={{
                width: '100%',
                padding: '16px 24px',
                background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                color: 'white',
                border: 'none',
                borderRadius: '12px',
                fontSize: '18px',
                fontWeight: '700',
                cursor: 'pointer',
                boxShadow: '0 8px 24px rgba(99, 102, 241, 0.4)',
                transition: 'all 0.3s',
                // ✅ Для Telegram Web App - убеждаемся что кнопка кликабельна
                touchAction: 'manipulation',
                WebkitTapHighlightColor: 'transparent'
              }}
            >
              {showNext ? 'Далее →' : 'Понятно ✓'}
            </motion.button>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

