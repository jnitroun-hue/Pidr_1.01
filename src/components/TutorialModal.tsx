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
              zIndex: 9999,
              backdropFilter: 'blur(4px)',
              WebkitBackdropFilter: 'blur(4px)'
            }}
          />
          
          {/* Модалка - 60% ширины, 10% отступы от краев */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            style={{
              position: 'fixed',
              top: '10%',
              left: '10%',
              right: '10%',
              bottom: '10%',
              width: '80%',
              maxWidth: 'none',
              height: 'auto',
              maxHeight: '80vh',
              margin: '0',
              background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.98) 0%, rgba(15, 23, 42, 0.98) 100%)',
              borderRadius: '24px',
              border: '4px solid rgba(99, 102, 241, 0.6)',
              boxShadow: '0 25px 80px rgba(0, 0, 0, 0.6), 0 0 50px rgba(99, 102, 241, 0.4)',
              zIndex: 10000,
              padding: '40px',
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              boxSizing: 'border-box',
              // ✅ Гарантируем что модалка не уйдет за экран
              WebkitOverflowScrolling: 'touch',
              overscrollBehavior: 'contain'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Заголовок */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '24px',
              paddingBottom: '16px',
              borderBottom: '2px solid rgba(99, 102, 241, 0.3)',
              flexShrink: 0
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '16px',
                flex: 1,
                minWidth: 0
              }}>
                {step.icon && (
                  <div style={{
                    fontSize: '48px',
                    filter: 'drop-shadow(0 2px 4px rgba(0, 0, 0, 0.3))',
                    flexShrink: 0
                  }}>
                    {step.icon}
                  </div>
                )}
                {!step.icon && (
                  <Lightbulb 
                    size={32} 
                    style={{ 
                      color: '#fbbf24',
                      filter: 'drop-shadow(0 0 8px rgba(251, 191, 36, 0.5))',
                      flexShrink: 0
                    }} 
                  />
                )}
                <h2 style={{
                  fontSize: 'clamp(24px, 4vw, 32px)',
                  fontWeight: '800',
                  background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                  margin: 0,
                  wordBreak: 'break-word',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis'
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
                    transition: 'all 0.2s',
                    flexShrink: 0,
                    marginLeft: '12px'
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

            {/* Контент - растягивается */}
            <div style={{
              color: '#e2e8f0',
              fontSize: 'clamp(16px, 2.5vw, 20px)',
              lineHeight: '1.8',
              marginBottom: '32px',
              flex: 1,
              overflowY: 'auto',
              wordBreak: 'break-word'
            }}>
              {typeof step.content === 'string' ? (
                <p style={{ margin: 0, whiteSpace: 'pre-line' }}>
                  {step.content}
                </p>
              ) : (
                step.content
              )}
            </div>

            {/* Кнопка - внизу */}
            <motion.button
              onClick={showNext && onNext ? onNext : onClose}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              style={{
                width: '100%',
                padding: '20px 32px',
                background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                color: 'white',
                border: 'none',
                borderRadius: '16px',
                fontSize: 'clamp(18px, 3vw, 22px)',
                fontWeight: '700',
                cursor: 'pointer',
                boxShadow: '0 10px 30px rgba(99, 102, 241, 0.5)',
                transition: 'all 0.3s',
                touchAction: 'manipulation',
                WebkitTapHighlightColor: 'transparent',
                flexShrink: 0
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
