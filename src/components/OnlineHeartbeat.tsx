'use client';

import { useEffect, useRef } from 'react';
import { useTelegram } from '../hooks/useTelegram';

/**
 * Компонент для автоматического обновления онлайн статуса
 * Отправляет heartbeat каждые 30 секунд
 */
export default function OnlineHeartbeat() {
  const { user } = useTelegram();
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!user?.id) return;

    // Отправляем первый heartbeat сразу
    sendHeartbeat();

    // Затем каждые 30 секунд
    intervalRef.current = setInterval(sendHeartbeat, 30000);

    // Отправляем heartbeat перед закрытием страницы
    const handleBeforeUnload = () => {
      sendHeartbeat();
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      window.removeEventListener('beforeunload', handleBeforeUnload);
      
      // Отправляем последний heartbeat при размонтировании
      sendHeartbeat();
    };
  }, [user?.id]);

  const sendHeartbeat = async () => {
    if (!user?.id) return;

    try {
      await fetch('/api/user/heartbeat', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'x-telegram-id': user.id.toString()
        }
      });
      
      console.log('💓 [HEARTBEAT] Онлайн статус обновлён');
    } catch (error) {
      console.error('❌ [HEARTBEAT] Ошибка:', error);
    }
  };

  // Этот компонент не рендерит ничего
  return null;
}

