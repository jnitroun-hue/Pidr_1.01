'use client';

import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  AppNoticeType,
  getAppNoticeState,
  installGlobalAppAlert,
  resolveAppAlert,
  resolveAppConfirm,
  subscribeAppNotice,
} from '@/lib/app-notice';
import styles from './AppNoticeHost.module.css';

const ICONS: Record<AppNoticeType, string> = {
  success: '✅',
  error: '❌',
  warning: '⚠️',
  info: 'ℹ️',
};

function modalClass(type: AppNoticeType) {
  switch (type) {
    case 'success':
      return styles.modalSuccess;
    case 'error':
      return styles.modalError;
    case 'warning':
      return styles.modalWarning;
    default:
      return styles.modalInfo;
  }
}

function iconClass(type: AppNoticeType) {
  switch (type) {
    case 'success':
      return styles.iconSuccess;
    case 'error':
      return styles.iconError;
    case 'warning':
      return styles.iconWarning;
    default:
      return styles.iconInfo;
  }
}

function primaryBtnClass(type: AppNoticeType, destructive = false) {
  if (destructive) return styles.btnDanger;
  switch (type) {
    case 'success':
      return styles.btnSuccess;
    case 'error':
      return styles.btnError;
    case 'warning':
      return styles.btnPrimary;
    default:
      return styles.btnInfo;
  }
}

function DetailsBlock({ details }: { details?: string }) {
  if (!details) return null;

  const isUrlBlock = details.includes('https://') || details.includes('http://');

  return (
    <p className={`${styles.details} ${isUrlBlock ? styles.detailsUrl : ''}`}>
      {details}
    </p>
  );
}

export default function AppNoticeHost() {
  const [, forceUpdate] = useState(0);

  useEffect(() => {
    const unsubscribeNotice = subscribeAppNotice(() => forceUpdate((value) => value + 1));
    const uninstallAlert = installGlobalAppAlert();
    return () => {
      unsubscribeNotice();
      uninstallAlert();
    };
  }, []);

  const { currentAlert, currentConfirm } = getAppNoticeState();
  const isOpen = Boolean(currentAlert || currentConfirm);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className={styles.overlay}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => {
            if (currentAlert) resolveAppAlert();
          }}
        >
          {currentAlert && (
            <motion.div
              key={currentAlert.id}
              className={`${styles.modal} ${modalClass(currentAlert.type)}`}
              initial={{ scale: 0.92, opacity: 0, y: 16 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.92, opacity: 0, y: 16 }}
              transition={{ type: 'spring', stiffness: 280, damping: 24 }}
              onClick={(event) => event.stopPropagation()}
            >
              <div className={`${styles.iconWrap} ${iconClass(currentAlert.type)}`}>
                {ICONS[currentAlert.type]}
              </div>
              <h2 className={styles.title}>{currentAlert.title}</h2>
              <DetailsBlock details={currentAlert.details} />
              <div className={styles.actionsSingle}>
                <button
                  type="button"
                  className={`${styles.btn} ${primaryBtnClass(currentAlert.type)}`}
                  onClick={() => resolveAppAlert()}
                >
                  {currentAlert.confirmText}
                </button>
              </div>
            </motion.div>
          )}

          {currentConfirm && (
            <motion.div
              key={currentConfirm.id}
              className={`${styles.modal} ${modalClass(currentConfirm.type)}`}
              initial={{ scale: 0.92, opacity: 0, y: 16 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.92, opacity: 0, y: 16 }}
              transition={{ type: 'spring', stiffness: 280, damping: 24 }}
              onClick={(event) => event.stopPropagation()}
            >
              <div className={`${styles.iconWrap} ${iconClass(currentConfirm.type)}`}>
                {ICONS[currentConfirm.type]}
              </div>
              <h2 className={styles.title}>{currentConfirm.title}</h2>
              <DetailsBlock details={currentConfirm.details} />
              <div className={styles.actions}>
                <button
                  type="button"
                  className={`${styles.btn} ${styles.btnGhost}`}
                  onClick={() => resolveAppConfirm(false)}
                >
                  {currentConfirm.cancelText}
                </button>
                <button
                  type="button"
                  className={`${styles.btn} ${primaryBtnClass(currentConfirm.type, currentConfirm.destructive)}`}
                  onClick={() => resolveAppConfirm(true)}
                >
                  {currentConfirm.confirmText}
                </button>
              </div>
            </motion.div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
