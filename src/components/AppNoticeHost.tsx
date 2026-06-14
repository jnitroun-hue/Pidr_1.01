'use client';

import { useEffect, useSyncExternalStore, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';
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

function CloseIconButton({ onClick, label = 'Закрыть' }: { onClick: () => void; label?: string }) {
  return (
    <button
      type="button"
      className={styles.closeIconBtn}
      onClick={(event) => {
        event.stopPropagation();
        onClick();
      }}
      aria-label={label}
    >
      <X size={20} strokeWidth={2.5} />
    </button>
  );
}

export default function AppNoticeHost() {
  const [mounted, setMounted] = useState(false);
  const { currentAlert, currentConfirm } = useSyncExternalStore(
    subscribeAppNotice,
    getAppNoticeState,
    getAppNoticeState
  );

  useEffect(() => {
    setMounted(true);
    return installGlobalAppAlert();
  }, []);

  const isOpen = Boolean(currentAlert || currentConfirm);

  const dismissAlert = useCallback(() => {
    resolveAppAlert();
  }, []);

  const dismissConfirm = useCallback((result: boolean) => {
    resolveAppConfirm(result);
  }, []);

  useEffect(() => {
    if (!isOpen) {
      document.body.classList.remove('app-notice-open');
      return;
    }

    document.body.classList.add('app-notice-open');

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      if (currentConfirm) dismissConfirm(false);
      else if (currentAlert) dismissAlert();
    };

    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      document.body.classList.remove('app-notice-open');
    };
  }, [isOpen, currentAlert, currentConfirm, dismissAlert, dismissConfirm]);

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key={currentAlert?.id ?? currentConfirm?.id ?? 'notice'}
          className={styles.overlay}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onPointerDown={(event) => {
            if (event.target === event.currentTarget) {
              if (currentConfirm) dismissConfirm(false);
              else if (currentAlert) dismissAlert();
            }
          }}
        >
          {currentAlert && (
            <motion.div
              className={`${styles.modal} ${modalClass(currentAlert.type)}`}
              role="alertdialog"
              aria-modal="true"
              aria-labelledby="app-notice-title"
              initial={{ scale: 0.92, opacity: 0, y: 16 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.92, opacity: 0, y: 16 }}
              transition={{ type: 'spring', stiffness: 280, damping: 24 }}
              onPointerDown={(event) => event.stopPropagation()}
            >
              <CloseIconButton onClick={dismissAlert} />

              <div className={`${styles.iconWrap} ${iconClass(currentAlert.type)}`}>
                {ICONS[currentAlert.type]}
              </div>
              <h2 id="app-notice-title" className={styles.title}>
                {currentAlert.title}
              </h2>
              <DetailsBlock details={currentAlert.details} />
              <div className={styles.actionsSingle}>
                <button
                  type="button"
                  className={`${styles.btn} ${primaryBtnClass(currentAlert.type)}`}
                  onClick={(event) => {
                    event.stopPropagation();
                    dismissAlert();
                  }}
                >
                  {currentAlert.confirmText}
                </button>
                <button
                  type="button"
                  className={`${styles.btn} ${styles.btnGhost}`}
                  onClick={(event) => {
                    event.stopPropagation();
                    dismissAlert();
                  }}
                >
                  Закрыть
                </button>
              </div>
            </motion.div>
          )}

          {currentConfirm && (
            <motion.div
              className={`${styles.modal} ${modalClass(currentConfirm.type)}`}
              role="alertdialog"
              aria-modal="true"
              aria-labelledby="app-notice-title"
              initial={{ scale: 0.92, opacity: 0, y: 16 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.92, opacity: 0, y: 16 }}
              transition={{ type: 'spring', stiffness: 280, damping: 24 }}
              onPointerDown={(event) => event.stopPropagation()}
            >
              <CloseIconButton onClick={() => dismissConfirm(false)} label="Отмена" />

              <div className={`${styles.iconWrap} ${iconClass(currentConfirm.type)}`}>
                {ICONS[currentConfirm.type]}
              </div>
              <h2 id="app-notice-title" className={styles.title}>
                {currentConfirm.title}
              </h2>
              <DetailsBlock details={currentConfirm.details} />
              <div className={styles.actions}>
                <button
                  type="button"
                  className={`${styles.btn} ${styles.btnGhost}`}
                  onClick={(event) => {
                    event.stopPropagation();
                    dismissConfirm(false);
                  }}
                >
                  {currentConfirm.cancelText}
                </button>
                <button
                  type="button"
                  className={`${styles.btn} ${primaryBtnClass(currentConfirm.type, currentConfirm.destructive)}`}
                  onClick={(event) => {
                    event.stopPropagation();
                    dismissConfirm(true);
                  }}
                >
                  {currentConfirm.confirmText}
                </button>
              </div>
            </motion.div>
          )}
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}
