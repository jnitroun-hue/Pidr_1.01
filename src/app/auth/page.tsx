'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Send, LogIn, ExternalLink } from 'lucide-react';
import { getTelegramBotUsername } from '@/lib/auth/social-auth';
import type { TelegramWebAppUser } from '@/types/telegram-webapp';
import styles from './page.module.css';

declare global {
  interface Window {
    onTelegramAuth?: (user: TelegramWebAppUser & { auth_date: number; hash: string }) => void;
  }
}

type WidgetStatus = 'loading' | 'ready' | 'error';

export default function AuthPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [redirectPath, setRedirectPath] = useState<string>('/');
  const [widgetStatus, setWidgetStatus] = useState<WidgetStatus>('loading');
  const [authError, setAuthError] = useState('');
  const widgetHostRef = useRef<HTMLDivElement>(null);
  const botUsername = getTelegramBotUsername();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const redirect = params.get('redirect');
    if (redirect) setRedirectPath(redirect);
  }, []);

  useEffect(() => {
    const host = widgetHostRef.current;
    if (!host) return;

    host.innerHTML = '';

    const script = document.createElement('script');
    script.src = 'https://telegram.org/js/telegram-widget.js?22';
    script.async = true;
    script.setAttribute('data-telegram-login', botUsername);
    script.setAttribute('data-size', 'large');
    script.setAttribute('data-radius', '14');
    script.setAttribute('data-request-access', 'write');
    script.setAttribute('data-onauth', 'onTelegramAuth(user)');
    host.appendChild(script);

    const checkWidget = () => {
      const iframe = host.querySelector('iframe');
      const rawText = host.textContent?.trim().toLowerCase() || '';
      if (iframe) {
        setWidgetStatus('ready');
        return;
      }
      if (rawText.includes('invalid') || rawText.includes('bot domain')) {
        setWidgetStatus('error');
      }
    };

    const observer = new MutationObserver(checkWidget);
    observer.observe(host, { childList: true, subtree: true, characterData: true });
    const timeout = window.setTimeout(checkWidget, 2500);

    window.onTelegramAuth = async (user: TelegramWebAppUser & { auth_date: number; hash: string }) => {
      setIsLoading(true);
      setAuthError('');
      try {
        const response = await fetch('/api/auth/telegram-login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(user),
        });
        const data = await response.json();
        if (data.success) {
          router.push(redirectPath);
        } else {
          setAuthError(data.error || 'Не удалось войти через Telegram');
        }
      } catch {
        setAuthError('Ошибка сети при авторизации через Telegram');
      } finally {
        setIsLoading(false);
      }
    };

    return () => {
      observer.disconnect();
      window.clearTimeout(timeout);
      window.onTelegramAuth = undefined;
    };
  }, [router, redirectPath, botUsername]);

  return (
    <div className={styles.page}>
      <motion.div
        className={styles.card}
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      >
        <header className={styles.header}>
          <div className={styles.logoMark} aria-hidden>
            ♠
          </div>
          <h1 className={styles.title}>P.I.D.R.</h1>
          <p className={styles.subtitle}>Войдите, чтобы играть и сохранять прогресс</p>
        </header>

        <Link href={`/auth/login?redirect=${encodeURIComponent(redirectPath)}`} className={styles.primaryLinkBtn}>
          <LogIn size={20} />
          Войти по логину и паролю
        </Link>

        <div className={styles.divider}>или через Telegram</div>

        <section className={styles.telegramBlock}>
          <div className={styles.telegramLabel}>
            <span className={styles.telegramIcon}>
              <Send size={18} strokeWidth={2.5} />
            </span>
            Быстрый вход через Telegram
          </div>

          <div
            ref={widgetHostRef}
            className={`${styles.widgetHost} ${widgetStatus === 'error' ? styles.widgetHostError : ''}`}
            aria-live="polite"
          >
            {widgetStatus === 'loading' && (
              <span className={styles.widgetLoading}>Загружаем кнопку Telegram…</span>
            )}
            {isLoading && <span className={styles.widgetLoading}>Авторизация…</span>}
          </div>

          <AnimatePresence>
            {authError && (
              <motion.p
                className={styles.inlineError}
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
              >
                {authError}
              </motion.p>
            )}
          </AnimatePresence>

          {widgetStatus === 'error' && (
            <div className={styles.widgetFallback}>
              <p className={styles.widgetFallbackText}>
                Web-виджет Telegram сейчас недоступен для этого домена.
                Откройте бота в приложении или войдите по логину.
              </p>
              <a
                href={`https://t.me/${botUsername}?start=web_auth`}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.telegramOpenBtn}
              >
                <ExternalLink size={16} />
                Открыть @{botUsername}
              </a>
            </div>
          )}
        </section>

        <p className={styles.registerHint}>
          Нет аккаунта?{' '}
          <Link href="/auth/register" className={styles.registerLink}>
            Зарегистрироваться
          </Link>
        </p>

        <footer className={styles.footer}>
          © {new Date().getFullYear()} P.I.D.R.
        </footer>
      </motion.div>
    </div>
  );
}
