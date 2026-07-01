'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import styles from './GameStartCountdownModal.module.css';

export type CountdownDisplay = 3 | 2 | 1 | 'go' | null;

export function computeCountdownDisplay(launchAtMs: number): CountdownDisplay {
  const msLeft = launchAtMs - Date.now();
  if (msLeft <= 0) return 'go';
  const sec = Math.ceil(msLeft / 1000);
  if (sec >= 3) return 3;
  if (sec === 2) return 2;
  return 1;
}

interface GameStartCountdownModalProps {
  visible: boolean;
  launchAtMs: number;
}

export default function GameStartCountdownModal({
  visible,
  launchAtMs,
}: GameStartCountdownModalProps) {
  const [mounted, setMounted] = useState(false);
  const [display, setDisplay] = useState<CountdownDisplay>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!visible) {
      setDisplay(null);
      return;
    }

    const tick = () => setDisplay(computeCountdownDisplay(launchAtMs));
    tick();
    const id = window.setInterval(tick, 40);
    return () => window.clearInterval(id);
  }, [visible, launchAtMs]);

  if (!mounted || !visible || display === null) return null;

  return createPortal(
    <AnimatePresence>
      <motion.div
        className={styles.overlay}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        role="dialog"
        aria-modal="true"
        aria-label="Обратный отсчёт до начала игры"
      >
        <motion.div
          className={styles.card}
          initial={{ scale: 0.88, opacity: 0, y: 24 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.92, opacity: 0, y: 12 }}
          transition={{ type: 'spring', stiffness: 320, damping: 26 }}
        >
          <div className={styles.badge}>P.I.D.R. · Онлайн</div>

          <div className={styles.numberWrap}>
            <div className={styles.ring} aria-hidden />
            <AnimatePresence mode="wait">
              <motion.div
                key={display}
                className={display === 'go' ? styles.numberGo : styles.number}
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 1.35, opacity: 0 }}
                transition={{ duration: 0.35, ease: 'easeOut' }}
              >
                {display === 'go' ? 'GO!' : display}
              </motion.div>
            </AnimatePresence>
          </div>

          <p className={styles.subtitle}>
            {display === 'go' ? 'Поехали!' : 'Игра начинается…'}
          </p>
          <p className={styles.hint}>Синхронизация стола на всех устройствах</p>
        </motion.div>
      </motion.div>
    </AnimatePresence>,
    document.body
  );
}
