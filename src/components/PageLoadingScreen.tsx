'use client';

import { motion } from 'framer-motion';
import CardDealerHero from './CardDealerHero';
import styles from './PageLoadingScreen.module.css';

export interface PageLoadingScreenProps {
  title?: string;
  subtitle?: string;
  fullScreen?: boolean;
  fixed?: boolean;
  compact?: boolean;
  showProgress?: boolean;
  /** 0–100; если не задан — бегущая полоска */
  progress?: number;
  dealerSize?: 'default' | 'compact';
}

export default function PageLoadingScreen({
  title = 'P.I.D.R.',
  subtitle = 'Загрузка...',
  fullScreen = true,
  fixed = false,
  compact = false,
  showProgress = true,
  progress,
  dealerSize,
}: PageLoadingScreenProps) {
  const indeterminate = progress === undefined;
  const resolvedDealerSize = dealerSize ?? (compact ? 'compact' : 'default');

  return (
    <div
      className={`${styles.root} ${styles.background} ${fullScreen ? styles.fullScreen : ''} ${fixed ? styles.fixed : ''} ${compact ? styles.compact : ''}`}
      role="status"
      aria-live="polite"
      aria-label={subtitle}
    >
      <motion.div
        className={styles.panel}
        initial={{ opacity: 0, y: 12, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.45, ease: 'easeOut' }}
      >
        <CardDealerHero size={resolvedDealerSize} />
        <h2 className={styles.title}>{title}</h2>
        <p className={styles.subtitle}>{subtitle}</p>

        {showProgress && (
          <>
            <div className={styles.progressTrack}>
              <motion.div
                className={`${styles.progressFill} ${indeterminate ? styles.progressFillIndeterminate : ''}`}
                style={indeterminate ? undefined : { width: `${Math.min(100, Math.max(0, progress))}%` }}
                initial={indeterminate ? false : { width: 0 }}
                animate={indeterminate ? undefined : { width: `${Math.min(100, Math.max(0, progress))}%` }}
                transition={{ duration: 0.35, ease: 'easeOut' }}
              />
            </div>
            {!indeterminate && (
              <div className={styles.progressText}>{Math.round(progress)}%</div>
            )}
          </>
        )}
      </motion.div>
    </div>
  );
}
