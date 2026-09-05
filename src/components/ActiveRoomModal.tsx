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
          backdropFilter: 'blur(6px)',
        }}
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.92, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.92, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
          style={{
            background: 'var(--menu-card-bg)',
            color: 'var(--menu-text)',
            borderRadius: '20px',
            padding: '24px',
            maxWidth: '400px',
            width: '100%',
            border: '1px solid var(--menu-card-border)',
            boxShadow: 'var(--menu-shadow)',
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
              <DoorOpen size={24} color="var(--menu-accent)" />
              <h2
                style={{
                  color: 'var(--menu-text)',
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
                color: 'var(--menu-text-muted)',
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
              color: 'var(--menu-text-muted)',
              fontSize: '14px',
              lineHeight: 1.6,
              margin: '0 0 16px',
            }}
          >
            {description}
          </p>

          <div
            style={{
              background: 'var(--menu-accent-soft)',
              borderRadius: '12px',
              padding: '16px',
              marginBottom: '24px',
              border: '1px solid var(--menu-card-border)',
            }}
          >
            <div
              style={{
                color: 'var(--menu-text)',
                fontSize: '17px',
                fontWeight: 'bold',
                marginBottom: '8px',
              }}
            >
              {roomName}
            </div>
            <div
              style={{
                color: 'var(--menu-text-muted)',
                fontSize: '14px',
                marginBottom: '6px',
              }}
            >
              Код:{' '}
              <span style={{ color: 'var(--menu-accent)', fontWeight: 'bold' }}>{roomCode}</span>
            </div>
            <div style={{ color: 'var(--menu-text-muted)', fontSize: '14px' }}>
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
                border: '1px solid var(--menu-card-border)',
                background: 'var(--menu-accent-soft)',
                color: 'var(--menu-text)',
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
                background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
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
