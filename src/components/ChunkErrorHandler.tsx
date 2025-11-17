'use client';

import { useEffect } from 'react';

/**
 * Обработчик ошибок загрузки chunks
 * Автоматически перезагружает страницу при ChunkLoadError
 */
export default function ChunkErrorHandler() {
  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      const error = event.error;
      
      // Проверяем, является ли это ChunkLoadError
      if (
        error?.message?.includes('ChunkLoadError') ||
        error?.message?.includes('Loading chunk') ||
        error?.name === 'ChunkLoadError' ||
        (error?.message && error.message.includes('failed'))
      ) {
        console.warn('⚠️ Обнаружена ошибка загрузки chunk, перезагружаем страницу...');
        
        // Перезагружаем страницу через небольшую задержку
        setTimeout(() => {
          window.location.reload();
        }, 1000);
      }
    };

    const handleRejection = (event: PromiseRejectionEvent) => {
      const error = event.reason;
      
      if (
        error?.message?.includes('ChunkLoadError') ||
        error?.message?.includes('Loading chunk') ||
        error?.name === 'ChunkLoadError' ||
        (error?.message && error.message.includes('failed'))
      ) {
        console.warn('⚠️ Обнаружена ошибка загрузки chunk в Promise, перезагружаем страницу...');
        
        setTimeout(() => {
          window.location.reload();
        }, 1000);
      }
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleRejection);

    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleRejection);
    };
  }, []);

  return null; // Компонент не рендерит ничего
}

