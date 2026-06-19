'use client';

import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  DAILY_WHEEL_AMOUNTS,
  DAILY_WHEEL_SEGMENT_COLORS,
} from '@/lib/bonus/daily-wheel';
import styles from './DailyBonusWheelModal.module.css';

const WHEEL_SEGMENTS = DAILY_WHEEL_AMOUNTS.map((amount, index) => ({
  amount,
  color: DAILY_WHEEL_SEGMENT_COLORS[index] ?? DAILY_WHEEL_SEGMENT_COLORS[0],
}));

function findSegmentIndex(amount: number): number {
  const exact = WHEEL_SEGMENTS.findIndex((segment) => segment.amount === amount);
  if (exact >= 0) return exact;

  let bestIndex = 0;
  let bestDiff = Number.POSITIVE_INFINITY;
  WHEEL_SEGMENTS.forEach((segment, index) => {
    const diff = Math.abs(segment.amount - amount);
    if (diff < bestDiff) {
      bestDiff = diff;
      bestIndex = index;
    }
  });
  return bestIndex;
}

function buildTargetRotation(amount: number): number {
  const segmentCount = WHEEL_SEGMENTS.length;
  const segmentAngle = 360 / segmentCount;
  const targetIndex = findSegmentIndex(amount);
  const segmentCenter = targetIndex * segmentAngle + segmentAngle / 2;
  const fullSpins = 6;

  return fullSpins * 360 + (360 - segmentCenter);
}

export interface DailyBonusWheelModalProps {
  isOpen: boolean;
  wonAmount: number;
  newBalance: number;
  onClose: () => void;
}

export default function DailyBonusWheelModal({
  isOpen,
  wonAmount,
  newBalance,
  onClose,
}: DailyBonusWheelModalProps) {
  const [phase, setPhase] = useState<'spinning' | 'won'>('spinning');
  const [rotation, setRotation] = useState(0);
  const [displayBalance, setDisplayBalance] = useState(0);

  const segmentGradient = useMemo(() => {
    const step = 360 / WHEEL_SEGMENTS.length;
    const parts = WHEEL_SEGMENTS.map((segment, index) => {
      const start = index * step;
      const end = (index + 1) * step;
      return `${segment.color} ${start}deg ${end}deg`;
    });
    return `conic-gradient(from -90deg, ${parts.join(', ')})`;
  }, []);

  useEffect(() => {
    if (!isOpen) {
      setPhase('spinning');
      setRotation(0);
      setDisplayBalance(0);
      return;
    }

    const targetRotation = buildTargetRotation(wonAmount);
    const frame = requestAnimationFrame(() => {
      setRotation(targetRotation);
    });

    const spinTimer = window.setTimeout(() => {
      setPhase('won');
    }, 4200);

    return () => {
      cancelAnimationFrame(frame);
      window.clearTimeout(spinTimer);
    };
  }, [isOpen, wonAmount]);

  useEffect(() => {
    if (phase !== 'won') return;

    const startBalance = Math.max(0, newBalance - wonAmount);
    const duration = 900;
    const startedAt = performance.now();

    const tick = (now: number) => {
      const progress = Math.min(1, (now - startedAt) / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayBalance(Math.round(startBalance + wonAmount * eased));
      if (progress < 1) requestAnimationFrame(tick);
    };

    requestAnimationFrame(tick);
  }, [phase, newBalance, wonAmount]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className={styles.overlay}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={phase === 'won' ? onClose : undefined}
        >
          <motion.div
            className={styles.modal}
            initial={{ scale: 0.92, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.92, opacity: 0, y: 20 }}
            transition={{ type: 'spring', stiffness: 260, damping: 22 }}
            onClick={(event) => event.stopPropagation()}
          >
            <h2 className={styles.title}>Колесо фортуны</h2>
            <p className={styles.subtitle}>Ежедневный бонус P.I.D.R.</p>

            <div className={styles.wheelWrap}>
              <span className={styles.sparkle}>✨</span>
              <span className={styles.sparkle}>💫</span>
              <span className={styles.sparkle}>⭐</span>
              <span className={styles.sparkle}>✨</span>
              <div className={styles.wheelRing} />
              <div className={styles.pointer} />
              <div
                className={styles.wheel}
                style={{
                  transform: `rotate(${rotation}deg)`,
                  transition: phase === 'spinning'
                    ? 'transform 4s cubic-bezier(0.12, 0.85, 0.18, 1)'
                    : 'none',
                }}
              >
                <div className={styles.wheelInner} style={{ background: segmentGradient }}>
                  {WHEEL_SEGMENTS.map((segment, index) => {
                    const segmentAngle = 360 / WHEEL_SEGMENTS.length;
                    const angle = index * segmentAngle + segmentAngle / 2;
                    return (
                      <div
                        key={`${segment.amount}-${index}`}
                        className={styles.segmentLabel}
                        style={{
                          transform: `rotate(${angle}deg) translate(0, -92px) rotate(-${angle}deg)`,
                        }}
                      >
                        <span className={styles.segmentCoin}>🪙</span>
                        <span>{segment.amount}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
              <div className={styles.hub}>🎁</div>
            </div>

            {phase === 'spinning' ? (
              <p className={styles.spinningText}>Крутим колесо…</p>
            ) : (
              <div className={styles.result}>
                <div className={styles.resultAmount}>+{wonAmount.toLocaleString('ru-RU')} 🪙</div>
                <div className={styles.resultBalance}>
                  Новый баланс: <strong>{displayBalance.toLocaleString('ru-RU')}</strong>
                </div>
              </div>
            )}

            <button
              type="button"
              className={styles.closeBtn}
              onClick={onClose}
              disabled={phase !== 'won'}
            >
              {phase === 'won' ? 'Забрать монеты' : 'Крутится…'}
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
