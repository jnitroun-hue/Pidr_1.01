/**
 * Утилита для условного логирования
 * Логи отображаются только в development режиме
 */

const isDev = process.env.NODE_ENV === 'development';

export const logger = {
  log: (...args: any[]) => {
    if (isDev) console.log(...args);
  },
  warn: (...args: any[]) => {
    if (isDev) console.warn(...args);
  },
  error: (...args: any[]) => {
    // Ошибки показываем всегда
    console.error(...args);
  },
  info: (...args: any[]) => {
    if (isDev) console.info(...args);
  },
  debug: (...args: any[]) => {
    if (isDev && process.env.NEXT_PUBLIC_DEBUG === 'true') {
      console.debug(...args);
    }
  }
};

// Экспорт для удобства
export const { log, warn, error, info, debug } = logger;

