'use client';

import { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
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

function NoticeButton({
  label,
  extraClass = '',
  onPress,
}: {
  label: string;
  extraClass?: string;
  onPress: () => void;
}) {
  return (
    <button
      type="button"
      className={`${styles.noticeBtn} ${extraClass}`.trim()}
      onMouseDown={(event) => {
        event.preventDefault();
        event.stopPropagation();
        onPress();
      }}
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        onPress();
      }}
    >
      {label}
    </button>
  );
}

export default function AppNoticeHost() {
  const [portalRoot, setPortalRoot] = useState<HTMLElement | null>(null);
  const [snapshot, setSnapshot] = useState(getAppNoticeState);

  useEffect(() => {
    let root = document.getElementById('app-notice-root');
    if (!root) {
      root = document.createElement('div');
      root.id = 'app-notice-root';
      document.body.appendChild(root);
    }
    setPortalRoot(root);

    const unsubscribe = subscribeAppNotice(() => {
      setSnapshot(getAppNoticeState());
    });

    const cleanupAlert = installGlobalAppAlert();

    return () => {
      unsubscribe();
      cleanupAlert();
    };
  }, []);

  const { currentAlert, currentConfirm } = snapshot;
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
      document.body.style.removeProperty('overflow');
      return;
    }

    document.body.classList.add('app-notice-open');
    document.body.style.overflow = 'hidden';

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      if (currentConfirm) dismissConfirm(false);
      else dismissAlert();
    };

    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      document.body.classList.remove('app-notice-open');
      document.body.style.removeProperty('overflow');
    };
  }, [isOpen, currentConfirm, dismissAlert, dismissConfirm]);

  if (!portalRoot || !isOpen) return null;

  const handleBackdrop = () => {
    if (currentConfirm) dismissConfirm(false);
    else dismissAlert();
  };

  return createPortal(
    <div
      className={styles.overlay}
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) handleBackdrop();
      }}
    >
      {currentAlert && (
        <div
          className={`${styles.modal} ${modalClass(currentAlert.type)}`}
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="app-notice-title"
        >
          <button
            type="button"
            className={styles.closeIconBtn}
            aria-label="Закрыть"
            onMouseDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
              dismissAlert();
            }}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              dismissAlert();
            }}
          >
            <X size={20} strokeWidth={2.5} />
          </button>

          <div className={`${styles.iconWrap} ${iconClass(currentAlert.type)}`}>
            {ICONS[currentAlert.type]}
          </div>
          <h2 id="app-notice-title" className={styles.title}>
            {currentAlert.title}
          </h2>
          <DetailsBlock details={currentAlert.details} />

          <div className={styles.footer}>
            <NoticeButton
              label={currentAlert.confirmText}
              extraClass={primaryBtnClass(currentAlert.type)}
              onPress={dismissAlert}
            />
            <NoticeButton label="Закрыть" extraClass={styles.btnGhost} onPress={dismissAlert} />
          </div>
        </div>
      )}

      {currentConfirm && (
        <div
          className={`${styles.modal} ${modalClass(currentConfirm.type)}`}
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="app-notice-title"
        >
          <button
            type="button"
            className={styles.closeIconBtn}
            aria-label="Отмена"
            onMouseDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
              dismissConfirm(false);
            }}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              dismissConfirm(false);
            }}
          >
            <X size={20} strokeWidth={2.5} />
          </button>

          <div className={`${styles.iconWrap} ${iconClass(currentConfirm.type)}`}>
            {ICONS[currentConfirm.type]}
          </div>
          <h2 id="app-notice-title" className={styles.title}>
            {currentConfirm.title}
          </h2>
          <DetailsBlock details={currentConfirm.details} />

          <div className={styles.footerSplit}>
            <NoticeButton
              label={currentConfirm.cancelText}
              extraClass={styles.btnGhost}
              onPress={() => dismissConfirm(false)}
            />
            <NoticeButton
              label={currentConfirm.confirmText}
              extraClass={primaryBtnClass(currentConfirm.type, currentConfirm.destructive)}
              onPress={() => dismissConfirm(true)}
            />
          </div>
        </div>
      )}
    </div>,
    portalRoot
  );
}
