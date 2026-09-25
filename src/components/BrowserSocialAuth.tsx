'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ExternalLink, Send } from 'lucide-react';
import { buildVkOAuthUrl, getTelegramBotUsername } from '@/lib/auth/social-auth';
import type { TelegramWebAppUser } from '@/types/telegram-webapp';
import styles from '@/app/auth/page.module.css';

declare global {
  interface Window {
    onTelegramAuth?: (user: TelegramWebAppUser & { auth_date: number; hash: string }) => void;
  }
}

/** Вход через Telegram Login Widget и VK OAuth прямо в браузере. */
export default function BrowserSocialAuth({
  redirectPath = '/',
}: {
  redirectPath?: string;
}) {
  const router = useRouter();
  const hostRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const botUsername = getTelegramBotUsername();

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    host.innerHTML = '';

    const script = document.createElement('script');
    script.src = 'https://telegram.org/js/telegram-widget.js?22';
    script.async = true;
    script.setAttribute('data-telegram-login', botUsername);
    script.setAttribute('data-size', 'large');
    script.setAttribute('data-radius', '12');
    script.setAttribute('data-request-access', 'write');
    script.setAttribute('data-onauth', 'onTelegramAuth(user)');
    host.appendChild(script);

    const check = () => {
      if (host.querySelector('iframe')) {
        setStatus('ready');
        return;
      }
      const raw = host.textContent?.trim().toLowerCase() || '';
      if (raw.includes('invalid') || raw.includes('bot domain')) setStatus('error');
    };
    const observer = new MutationObserver(check);
    observer.observe(host, { childList: true, subtree: true, characterData: true });
    const timeout = window.setTimeout(check, 2500);

    window.onTelegramAuth = async (user) => {
      setBusy(true);
      setError('');
      try {
        const response = await fetch('/api/auth/telegram-login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(user),
        });
        const data = await response.json();
        if (data.success) router.push(redirectPath);
        else setError(data.error || data.message || 'Не удалось войти через Telegram');
      } catch {
        setError('Сеть недоступна. Попробуйте ещё раз.');
      } finally {
        setBusy(false);
      }
    };

    return () => {
      observer.disconnect();
      window.clearTimeout(timeout);
      window.onTelegramAuth = undefined;
    };
  }, [botUsername, redirectPath, router]);

  const openVk = () => {
    const oauthUrl = buildVkOAuthUrl(`${window.location.origin}/auth/vk/callback`);
    if (!oauthUrl) {
      setError('VK не подключён: нужен NEXT_PUBLIC_VK_CLIENT_ID');
      return;
    }
    window.location.href = oauthUrl;
  };

  return (
    <section className={styles.telegramBlock}>
      <div className={styles.telegramLabel}>
        <span className={styles.telegramIcon}><Send size={18} /></span>
        Тот же аккаунт, что в Telegram
      </div>
      <div
        ref={hostRef}
        className={`${styles.widgetHost} ${status === 'error' ? styles.widgetHostError : ''}`}
      >
        {status === 'loading' && <span className={styles.widgetLoading}>Кнопка Telegram…</span>}
        {busy && <span className={styles.widgetLoading}>Входим…</span>}
      </div>
      {status === 'error' && (
        <div className={styles.widgetFallback}>
          <p className={styles.widgetFallbackText}>
            Виджет Telegram откроется, когда домен сайта указан у бота @{botUsername} в BotFather → Domain.
          </p>
          <a className={styles.telegramOpenBtn} href={`https://t.me/${botUsername}`} target="_blank" rel="noreferrer">
            <ExternalLink size={16} /> Открыть бота
          </a>
        </div>
      )}
      <button type="button" className={styles.vkBtn} onClick={openVk}>
        Войти через VK
      </button>
      {error && <p className={styles.inlineError}>{error}</p>}
    </section>
  );
}
