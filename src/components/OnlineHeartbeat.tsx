'use client';

import { useEffect, useRef, useState } from 'react';
import { useTelegram } from '../hooks/useTelegram';

/**
 * Компонент для автоматического обновления онлайн статуса
 * Поддерживает и Telegram WebApp, и веб-версию с JWT авторизацией
 */
export default function OnlineHeartbeat() {
  const { user: telegramUser } = useTelegram();
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const [resolvedUserId, setResolvedUserId] = useState<string | null>(null);
  const [authSource, setAuthSource] = useState<'telegram' | 'web'>('web');

  useEffect(() => {
    const resolveUser = async () => {
      const tg = typeof window !== 'undefined' ? (window as any).Telegram?.WebApp : null;
      const realTelegramUser = tg?.initDataUnsafe?.user;
      
      if (realTelegramUser?.id) {
        setResolvedUserId(realTelegramUser.id.toString());
        setAuthSource('telegram');
        return;
      }
      
      try {
        const resp = await fetch('/api/auth', { method: 'GET', credentials: 'include' });
        if (resp.ok) {
          const data = await resp.json();
          if (data.user?.id) {
            setResolvedUserId(data.user.id.toString());
            setAuthSource('web');
            return;
          }
        }
      } catch {}
      
      if (telegramUser?.id && telegramUser.id !== 123456789) {
        setResolvedUserId(telegramUser.id.toString());
        setAuthSource('telegram');
      }
    };
    
    resolveUser();
  }, [telegramUser?.id]);

  useEffect(() => {
    if (!resolvedUserId) return;

    sendHeartbeat();
    intervalRef.current = setInterval(sendHeartbeat, 15000);

    const handleBeforeUnload = () => { sendHeartbeat(); };
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      sendHeartbeat();
    };
  }, [resolvedUserId]);

  const sendHeartbeat = async () => {
    if (!resolvedUserId) return;

    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      
      if (authSource === 'telegram') {
        headers['x-telegram-id'] = resolvedUserId;
      } else {
        headers['x-auth-source'] = 'web';
      }
      
      await fetch('/api/user/heartbeat', {
        method: 'POST',
        credentials: 'include',
        headers,
      });
    } catch (error) {
      console.error('❌ [HEARTBEAT] Ошибка:', error);
    }
  };

  return null;
}

