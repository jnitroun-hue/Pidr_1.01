'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { DoorOpen, X } from 'lucide-react';

interface ActiveRoomModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLeave: () => void;
  loading?: boolean;
  roomName: string;
  roomCode: string;
  gameMode: 'normal' | 'rated';
  title: string;
  description: string;
  modeLabel: string;
  modeNormal: string;
  modeRated: string;
  leaveButton: string;
  stayButton: string;
}

export default function ActiveRoomModal({
  isOpen,
  onClose,
  onLeave,
  loading = false,
  roomName,
  roomCode,
  gameMode,
  title,
  description,
  modeLabel,
  modeNormal,
  modeRated,
  leaveButton,
  stayButton,
}: ActiveRoomModalProps) {
  if (!isOpen) return null;

  const modeText = gameMode === 'rated' ? modeRated : modeNormal;

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
          backgroundColor: 'rgba(0, 0, 0, 0.75)',
          zIndex: 10000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px',
        }}
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.92, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.92, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
          style={{
            backgroundColor: '#1e293b',
            borderRadius: '20px',
            padding: '24px',
            maxWidth: '400px',
            width: '100%',
            border: '2px solid rgba(59, 130, 246, 0.35)',
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '16px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <DoorOpen size={24} color="#60a5fa" />
              <h2
                style={{
                  color: '#ffffff',
                  fontSize: '20px',
                  fontWeight: 'bold',
                  margin: 0,
                }}
              >
                {title}
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
                justifyContent: 'center',
              }}
            >
              <X size={20} />
            </motion.button>
          </div>

          <p
            style={{
              color: '#94a3b8',
              fontSize: '14px',
              lineHeight: 1.6,
              margin: '0 0 16px',
            }}
          >
            {description}
          </p>

          <div
            style={{
              backgroundColor: '#0f172a',
              borderRadius: '12px',
              padding: '16px',
              marginBottom: '24px',
              border: '1px solid #334155',
            }}
          >
            <div
              style={{
                color: '#ffffff',
                fontSize: '17px',
                fontWeight: 'bold',
                marginBottom: '8px',
              }}
            >
              {roomName}
            </div>
            <div
              style={{
                color: '#64748b',
                fontSize: '14px',
                marginBottom: '6px',
              }}
            >
              Код:{' '}
              <span style={{ color: '#10b981', fontWeight: 'bold' }}>{roomCode}</span>
            </div>
            <div style={{ color: '#64748b', fontSize: '14px' }}>
              {modeLabel}:{' '}
              <span style={{ color: '#fbbf24', fontWeight: 'bold' }}>{modeText}</span>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '12px' }}>
            <motion.button
              onClick={onClose}
              disabled={loading}
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
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.6 : 1,
              }}
            >
              {stayButton}
            </motion.button>
            <motion.button
              onClick={onLeave}
              disabled={loading}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              style={{
                flex: 1,
                padding: '12px',
                borderRadius: '12px',
                border: 'none',
                background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                color: '#ffffff',
                fontSize: '14px',
                fontWeight: 'bold',
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.7 : 1,
              }}
            >
              {loading ? '…' : leaveButton}
            </motion.button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
