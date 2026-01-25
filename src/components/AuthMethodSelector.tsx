'use client';

/**
 * Компонент выбора способа входа
 * Поддержка: Telegram, Google, VK, Email
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaTelegram, FaGoogle, FaVk, FaEnvelope, FaTimes } from 'react-icons/fa';
import styles from './AuthMethodSelector.module.css';

export interface AuthMethodSelectorProps {
  onClose?: () => void;
  onAuthSuccess?: (userId: number, isNewUser: boolean) => void;
  onAuthError?: (error: string) => void;
  availableMethods?: ('telegram' | 'google' | 'vk' | 'email')[];
}

export default function AuthMethodSelector({
  onClose,
  onAuthSuccess,
  onAuthError,
  availableMethods = ['telegram', 'google', 'vk', 'email'],
}: AuthMethodSelectorProps) {
  const [loading, setLoading] = useState(false);
  const [selectedMethod, setSelectedMethod] = useState<string | null>(null);

  const handleTelegramLogin = async () => {
    setLoading(true);
    setSelectedMethod('telegram');

    try {
      // Проверяем, запущено ли приложение в Telegram Web App
      if (typeof window !== 'undefined' && (window as any).Telegram?.WebApp) {
        const tg = (window as any).Telegram.WebApp;
        const initData = tg.initData;

        if (!initData) {
          throw new Error('Telegram initData не найдена');
        }

        // Отправляем на сервер
        const response = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            method: 'telegram',
            initData,
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Ошибка авторизации');
        }

        onAuthSuccess?.(data.userId, data.isNewUser);
      } else {
        // Если не в Telegram Web App - показываем инструкцию
        throw new Error('Откройте приложение через Telegram');
      }
    } catch (error: any) {
      console.error('❌ Ошибка Telegram входа:', error);
      onAuthError?.(error.message);
    } finally {
      setLoading(false);
      setSelectedMethod(null);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    setSelectedMethod('google');

    try {
      // TODO: Интеграция с Google OAuth
      // Используйте @react-oauth/google или аналог
      
      // Пример:
      // const googleToken = await getGoogleToken();
      // const response = await fetch('/api/auth/login', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({
      //     method: 'google',
      //     googleToken,
      //   }),
      // });

      throw new Error('Google OAuth пока не настроен');
    } catch (error: any) {
      console.error('❌ Ошибка Google входа:', error);
      onAuthError?.(error.message);
    } finally {
      setLoading(false);
      setSelectedMethod(null);
    }
  };

  const handleVKLogin = async () => {
    setLoading(true);
    setSelectedMethod('vk');

    try {
      // TODO: Интеграция с VK OAuth
      // Используйте VK Connect SDK
      
      throw new Error('VK OAuth пока не настроен');
    } catch (error: any) {
      console.error('❌ Ошибка VK входа:', error);
      onAuthError?.(error.message);
    } finally {
      setLoading(false);
      setSelectedMethod(null);
    }
  };

  const handleEmailLogin = async () => {
    setLoading(true);
    setSelectedMethod('email');

    try {
      // TODO: Форма Email/Password
      throw new Error('Email авторизация пока не реализована');
    } catch (error: any) {
      console.error('❌ Ошибка Email входа:', error);
      onAuthError?.(error.message);
    } finally {
      setLoading(false);
      setSelectedMethod(null);
    }
  };

  const authMethods = [
    {
      id: 'telegram',
      name: 'Telegram',
      icon: FaTelegram,
      color: '#0088cc',
      handler: handleTelegramLogin,
      available: availableMethods.includes('telegram'),
    },
    {
      id: 'google',
      name: 'Google',
      icon: FaGoogle,
      color: '#DB4437',
      handler: handleGoogleLogin,
      available: availableMethods.includes('google'),
    },
    {
      id: 'vk',
      name: 'VK',
      icon: FaVk,
      color: '#0077FF',
      handler: handleVKLogin,
      available: availableMethods.includes('vk'),
    },
    {
      id: 'email',
      name: 'Email',
      icon: FaEnvelope,
      color: '#4CAF50',
      handler: handleEmailLogin,
      available: availableMethods.includes('email'),
    },
  ].filter((method) => method.available);

  return (
    <motion.div
      className={styles.overlay}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className={styles.modal}
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
      >
        {onClose && (
          <button className={styles.closeButton} onClick={onClose}>
            <FaTimes />
          </button>
        )}

        <h2 className={styles.title}>Выберите способ входа</h2>
        <p className={styles.subtitle}>
          Войдите удобным для вас способом
        </p>

        <div className={styles.methodsGrid}>
          {authMethods.map((method) => (
            <motion.button
              key={method.id}
              className={styles.methodButton}
              style={{
                borderColor: method.color,
                opacity: loading && selectedMethod !== method.id ? 0.5 : 1,
              }}
              onClick={method.handler}
              disabled={loading}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <method.icon
                className={styles.methodIcon}
                style={{ color: method.color }}
              />
              <span className={styles.methodName}>{method.name}</span>
              {loading && selectedMethod === method.id && (
                <div className={styles.spinner} />
              )}
            </motion.button>
          ))}
        </div>

        <div className={styles.footer}>
          <p className={styles.footerText}>
            Продолжая, вы соглашаетесь с{' '}
            <a href="/terms" target="_blank">
              условиями использования
            </a>{' '}
            и{' '}
            <a href="/privacy" target="_blank">
              политикой конфиденциальности
            </a>
          </p>
        </div>
      </motion.div>
    </motion.div>
  );
}

