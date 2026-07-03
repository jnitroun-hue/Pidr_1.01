'use client';

import { useEffect, useRef, useState } from 'react';
import { useTelegram } from '../hooks/useTelegram';
import { getApiHeaders, detectClientEnvironment } from '@/lib/api-headers';
import { hasAuthTokenCookie } from '@/lib/auth/session-client';

/**
 * Компонент для автоматического обновления онлайн статуса
 * Поддерживает и Telegram WebApp, и веб-версию с JWT авторизацией
 */
export default function OnlineHeartbeat() {
  const { user: telegramUser } = useTelegram();
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const [resolvedUserId, setResolvedUserId] = useState<string | null>(null);
  const [authSource, setAuthSource] = useState<'telegram' | 'vk' | 'web'>('web');

  useEffect(() => {
    const resolveUser = async () => {
      const env = detectClientEnvironment();
      const tg = typeof window !== 'undefined' ? (window as any).Telegram?.WebApp : null;
      const realTelegramUser = tg?.initDataUnsafe?.user;
      
      if (env === 'telegram' && realTelegramUser?.id) {
        setResolvedUserId(realTelegramUser.id.toString());
        setAuthSource('telegram');
        return;
      }

      if (env === 'vk') {
        const vkUserId = new URLSearchParams(window.location.search).get('vk_user_id');
        if (vkUserId) {
          setResolvedUserId(vkUserId);
          setAuthSource('vk');
          return;
        }
      }

      if (!hasAuthTokenCookie()) {
        return;
      }
      
      try {
        const resp = await fetch('/api/auth', {
          method: 'GET',
          credentials: 'include',
          cache: 'no-store',
          headers: getApiHeaders()
        });
        if (resp.ok) {
          const data = await resp.json();
          if (data.user?.id) {
            setResolvedUserId(String(data.user.id));
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
      const baseHeaders = getApiHeaders();
      const headers = new Headers(baseHeaders as HeadersInit);
      headers.set('Content-Type', 'application/json');
      
      if (authSource === 'telegram') {
        headers.set('x-telegram-id', resolvedUserId);
        headers.set('x-auth-source', 'telegram');
      } else if (authSource === 'vk') {
        headers.set('x-vk-id', resolvedUserId);
        headers.set('x-auth-source', 'vk');
      } else {
        headers.set('x-auth-source', 'web');
      }
      
      await fetch('/api/user/heartbeat', {
        method: 'POST',
        credentials: 'include',
        cache: 'no-store',
        headers,
      });
    } catch (error) {
      console.error('❌ [HEARTBEAT] Ошибка:', error);
    }
  };

  return null;
}

