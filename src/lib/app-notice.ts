export type AppNoticeType = 'success' | 'error' | 'warning' | 'info';

export interface AppAlertOptions {
  title?: string;
  type?: AppNoticeType;
  details?: string;
  confirmText?: string;
}

export interface AppConfirmOptions {
  title?: string;
  type?: AppNoticeType;
  details?: string;
  confirmText?: string;
  cancelText?: string;
  destructive?: boolean;
}

interface AlertRequest {
  id: string;
  title: string;
  details?: string;
  type: AppNoticeType;
  confirmText: string;
  resolve: () => void;
}

interface ConfirmRequest {
  id: string;
  title: string;
  details?: string;
  type: AppNoticeType;
  confirmText: string;
  cancelText: string;
  destructive: boolean;
  resolve: (value: boolean) => void;
}

let currentAlert: AlertRequest | null = null;
let currentConfirm: ConfirmRequest | null = null;
const alertQueue: AlertRequest[] = [];
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((listener) => listener());
}

function parseNoticeMessage(message: string): {
  type: AppNoticeType;
  title: string;
  details?: string;
} {
  const trimmed = message.trim();
  let type: AppNoticeType = 'info';

  if (/^(✅|🎉|🔥|💰|🎁)/.test(trimmed)) type = 'success';
  else if (/^(❌|Ошибка)/i.test(trimmed)) type = 'error';
  else if (/^(⏰|⚠️|📊|ℹ️|💡)/.test(trimmed)) type = 'warning';

  const parts = trimmed.split('\n\n');
  const title = (parts[0] || trimmed).trim();
  const details = parts.length > 1 ? parts.slice(1).join('\n\n').trim() : undefined;

  return { type, title, details };
}

function enqueueAlert(request: AlertRequest) {
  if (!currentAlert && !currentConfirm) {
    currentAlert = request;
  } else {
    alertQueue.push(request);
  }
  emit();
}

function dequeueNextAlert() {
  if (currentAlert || currentConfirm || alertQueue.length === 0) return;
  currentAlert = alertQueue.shift() || null;
  emit();
}

export function subscribeAppNotice(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getAppNoticeState() {
  return { currentAlert, currentConfirm };
}

export function appAlert(message: string, options: AppAlertOptions = {}): Promise<void> {
  return new Promise((resolve) => {
    const parsed = parseNoticeMessage(message);
    enqueueAlert({
      id: crypto.randomUUID(),
      title: options.title || parsed.title,
      details: options.details ?? parsed.details,
      type: options.type || parsed.type,
      confirmText: options.confirmText || 'OK',
      resolve,
    });
  });
}

export function appConfirm(message: string, options: AppConfirmOptions = {}): Promise<boolean> {
  return new Promise((resolve) => {
    const parsed = parseNoticeMessage(message);
    currentConfirm = {
      id: crypto.randomUUID(),
      title: options.title || parsed.title || 'Подтвердите действие',
      details: options.details ?? parsed.details,
      type: options.type || parsed.type,
      confirmText: options.confirmText || 'Подтвердить',
      cancelText: options.cancelText || 'Отмена',
      destructive: options.destructive ?? false,
      resolve,
    };
    emit();
  });
}

export function resolveAppAlert() {
  if (!currentAlert) return;
  currentAlert.resolve();
  currentAlert = null;
  dequeueNextAlert();
}

export function resolveAppConfirm(result: boolean) {
  if (!currentConfirm) return;
  currentConfirm.resolve(result);
  currentConfirm = null;
  dequeueNextAlert();
}

export function installGlobalAppAlert() {
  if (typeof window === 'undefined') return () => {};

  const nativeAlert = window.alert.bind(window);
  window.alert = (message?: unknown) => {
    void appAlert(String(message ?? ''));
  };

  return () => {
    window.alert = nativeAlert;
  };
}
