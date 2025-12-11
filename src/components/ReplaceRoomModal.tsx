'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, X } from 'lucide-react';

interface ReplaceRoomModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  currentRoomName: string;
  currentRoomCode: string;
}

export default function ReplaceRoomModal({
  isOpen,
  onClose,
  onConfirm,
  currentRoomName,
  currentRoomCode
}: ReplaceRoomModalProps) {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          zIndex: 10000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px'
        }}
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
          style={{
            backgroundColor: '#1e293b',
            borderRadius: '20px',
            padding: '24px',
            maxWidth: '400px',
            width: '100%',
            border: '2px solid rgba(239, 68, 68, 0.3)',
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)'
          }}
        >
          {/* Заголовок */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '20px'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px'
            }}>
              <AlertTriangle size={24} color="#f59e0b" />
              <h2 style={{
                color: '#ffffff',
                fontSize: '20px',
                fontWeight: 'bold',
                margin: 0
              }}>
                Заменить комнату?
              </h2>
            </div>
            <motion.button
              onClick={onClose}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              style={{
                background: 'none',
                border: 'none',
                color: '#94a3b8',
                cursor: 'pointer',
                padding: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <X size={20} />
            </motion.button>
          </div>

          {/* Сообщение */}
          <div style={{
            backgroundColor: '#0f172a',
            borderRadius: '12px',
            padding: '16px',
            marginBottom: '24px',
            border: '1px solid #334155'
          }}>
            <div style={{
              color: '#94a3b8',
              fontSize: '14px',
              lineHeight: '1.6',
              marginBottom: '12px'
            }}>
              У вас уже есть активная комната:
            </div>
            <div style={{
              color: '#ffffff',
              fontSize: '16px',
              fontWeight: 'bold',
              marginBottom: '4px'
            }}>
              {currentRoomName}
            </div>
            <div style={{
              color: '#64748b',
              fontSize: '14px'
            }}>
              Код: <span style={{ color: '#10b981', fontWeight: 'bold' }}>{currentRoomCode}</span>
            </div>
          </div>

          <div style={{
            color: '#f59e0b',
            fontSize: '14px',
            marginBottom: '24px',
            padding: '12px',
            backgroundColor: 'rgba(245, 158, 11, 0.1)',
            borderRadius: '12px',
            border: '1px solid rgba(245, 158, 11, 0.3)'
          }}>
            ⚠️ Если вы создадите новую комнату, старая будет закрыта.
          </div>

          {/* Кнопки */}
          <div style={{
            display: 'flex',
            gap: '12px'
          }}>
            <motion.button
              onClick={onClose}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              style={{
                flex: 1,
                padding: '12px',
                borderRadius: '12px',
                border: '2px solid #334155',
                background: 'transparent',
                color: '#94a3b8',
                fontSize: '14px',
                fontWeight: 'bold',
                cursor: 'pointer'
              }}
            >
              Нет
            </motion.button>
            <motion.button
              onClick={onConfirm}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              style={{
                flex: 1,
                padding: '12px',
                borderRadius: '12px',
                border: 'none',
                background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                color: '#ffffff',
                fontSize: '14px',
                fontWeight: 'bold',
                cursor: 'pointer'
              }}
            >
              Да, заменить
            </motion.button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

