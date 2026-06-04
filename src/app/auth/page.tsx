'use client'

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Send, ArrowLeft } from 'lucide-react';
import { getTelegramBotUsername } from '@/lib/auth/social-auth';
import type { TelegramWebAppUser } from '@/types/telegram-webapp';
import styles from './page.module.css';

declare global {
  interface Window {
    onTelegramAuth?: (user: TelegramWebAppUser & { auth_date: number; hash: string }) => void;
  }
}

const VK_ICON = (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
    <path d="M15.07 2H8.93C3.33 2 2 3.33 2 8.93v6.14C2 20.67 3.33 22 8.93 22h6.14c5.6 0 6.93-1.33 6.93-6.93V8.93C22 3.33 20.67 2 15.07 2zm3.08 14.58h-1.4c-.54 0-.71-.43-1.69-1.41-.86-.82-1.24-.93-1.45-.93-.3 0-.38.09-.38.52v1.29c0 .37-.12.59-1.08.59-1.58 0-3.35-.96-4.59-2.75-1.87-2.66-2.38-4.66-2.38-5.07 0-.23.09-.45.52-.45h1.4c.39 0 .54.18.69.6.75 2.36 2.01 4.4 2.52 4.4.19 0 .28-.09.28-.58V9.48c-.06-1.03-.6-1.12-.6-1.56 0-.2.16-.39.43-.39h2.2c.37 0 .5.2.5.64v3.45c0 .37.17.5.27.5.19 0 .35-.12.7-.47 1.07-1.19 1.84-3.03 1.84-3.03.1-.22.28-.43.67-.43h1.4c.42 0 .51.22.42.52-.18.84-1.93 3.31-1.93 3.31-.15.25-.21.36 0 .64.15.2.65.64 1 1.03.64.74 1.14 1.36 1.27 1.79.14.43-.08.65-.5.65z" />
  </svg>
);

const GOOGLE_ICON = (
  <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden>
    <path fill="#EA4335" d="M12 10.2v3.6h5.1c-.22 1.2-1.5 3.5-5.1 3.5-3.07 0-5.6-2.54-5.6-5.67S8.93 5.93 12 5.93c1.75 0 2.93.75 3.6 1.4l2.46-2.38C16.56 3.64 14.44 2.8 12 2.8 6.97 2.8 2.8 6.97 2.8 12S6.97 21.2 12 21.2c6.9 0 8.58-4.84 8.58-7.36 0-.5-.06-.87-.13-1.13H12z" />
  </svg>
);

export default function AuthPage() {
  const router = useRouter();
  const [phoneNumber, setPhoneNumber] = useState('');
  const [code, setCode] = useState('');
  const [step, setStep] = useState<'method' | 'phone' | 'code'>('method');
  const [isLoading, setIsLoading] = useState(false);
  const [redirectPath, setRedirectPath] = useState<string>('/');
  const botUsername = getTelegramBotUsername();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const redirect = params.get('redirect');
    if (redirect) setRedirectPath(redirect);
  }, []);

  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://telegram.org/js/telegram-widget.js?22';
    script.async = true;
    script.setAttribute('data-telegram-login', botUsername);
    script.setAttribute('data-size', 'large');
    script.setAttribute('data-radius', '14');
    script.setAttribute('data-request-access', 'write');
    script.setAttribute('data-onauth', 'onTelegramAuth(user)');

    const widgetContainer = document.getElementById('telegram-login-widget');
    if (widgetContainer) {
      widgetContainer.innerHTML = '';
      widgetContainer.appendChild(script);
    }

    window.onTelegramAuth = async (user: TelegramWebAppUser & { auth_date: number; hash: string }) => {
      setIsLoading(true);
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
          alert(data.error || 'Ошибка авторизации');
        }
      } catch {
        alert('Ошибка авторизации');
      } finally {
        setIsLoading(false);
      }
    };

    return () => {
      window.onTelegramAuth = undefined;
    };
  }, [router, redirectPath, botUsername]);

  const handlePhoneAuth = async () => {
    if (!phoneNumber) return;
    setIsLoading(true);
    try {
      await new Promise((r) => setTimeout(r, 1000));
      setStep('code');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCodeVerify = async () => {
    if (!code) return;
    setIsLoading(true);
    try {
      await new Promise((r) => setTimeout(r, 1000));
      router.push('/');
    } finally {
      setIsLoading(false);
    }
  };

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

        <AnimatePresence mode="wait">
          {step === 'method' && (
            <motion.div
              key="method"
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -16 }}
              transition={{ duration: 0.25 }}
            >
              <div className={styles.telegramBlock}>
                <div className={styles.telegramLabel}>
                  <span className={styles.telegramIcon}>
                    <Send size={18} strokeWidth={2.5} />
                  </span>
                  Вход через Telegram
                </div>
                <div className={styles.widgetHost} id="telegram-login-widget">
                  {isLoading && (
                    <span className={styles.widgetLoading}>Авторизация…</span>
                  )}
                </div>
                <p className={styles.widgetHint}>
                  Если кнопка не работает — проверьте, что бот @{botUsername} существует и
                  домен добавлен в BotFather → Domain.
                </p>
              </div>

              <div className={styles.divider}>или</div>

              <button
                type="button"
                className={`${styles.socialBtn} ${styles.vkBtn}`}
                disabled
                onClick={() => alert('VK авторизация скоро')}
              >
                {VK_ICON}
                <span>ВКонтакте</span>
                <span className={styles.badge}>скоро</span>
              </button>

              <button
                type="button"
                className={`${styles.socialBtn} ${styles.googleBtn}`}
                disabled
                onClick={() => alert('Google авторизация скоро')}
              >
                {GOOGLE_ICON}
                <span>Google</span>
                <span className={styles.badge}>скоро</span>
              </button>

              <Link href="/auth/login" className={styles.altLink}>
                Войти по логину и паролю →
              </Link>
            </motion.div>
          )}

          {step === 'phone' && (
            <motion.div
              key="phone"
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -16 }}
            >
              <button type="button" className={styles.backBtn} onClick={() => setStep('method')}>
                <ArrowLeft size={16} /> Назад
              </button>
              <label className={styles.fieldLabel}>Номер телефона</label>
              <input
                type="tel"
                className={styles.input}
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="+7 999 123 45 67"
              />
              <button
                type="button"
                className={styles.primaryBtn}
                onClick={handlePhoneAuth}
                disabled={isLoading || !phoneNumber}
              >
                {isLoading ? 'Отправка…' : 'Получить код'}
              </button>
            </motion.div>
          )}

          {step === 'code' && (
            <motion.div
              key="code"
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -16 }}
            >
              <button type="button" className={styles.backBtn} onClick={() => setStep('phone')}>
                <ArrowLeft size={16} /> Назад
              </button>
              <p className={styles.codeHint}>
                Код отправлен на <br />
                <strong>{phoneNumber}</strong>
              </p>
              <label className={styles.fieldLabel}>Код из SMS</label>
              <input
                type="text"
                className={`${styles.input} ${styles.inputCode}`}
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="••••••"
                maxLength={6}
              />
              <button
                type="button"
                className={`${styles.primaryBtn} ${styles.successBtn}`}
                onClick={handleCodeVerify}
                disabled={isLoading || !code}
              >
                {isLoading ? 'Проверка…' : 'Войти'}
              </button>
              <button type="button" className={styles.resendBtn} onClick={handlePhoneAuth} disabled={isLoading}>
                Отправить код повторно
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        <footer className={styles.footer}>
          © {new Date().getFullYear()} P.I.D.R.
        </footer>
      </motion.div>
    </div>
  );
}
