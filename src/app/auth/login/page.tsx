"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { LogIn, Eye, EyeOff, Mail, Lock, User, Phone } from 'lucide-react';
import { isVKMiniApp, loginWithVKMiniApp } from '@/lib/auth/vk-bridge';
import Link from 'next/link';

export default function LoginPage() {
  const [credentials, setCredentials] = useState({ 
    identifier: '',
    password: '' 
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [availableAuthMethods, setAvailableAuthMethods] = useState<{
    telegram: boolean;
    vk: boolean;
  }>({ telegram: false, vk: false });
  const router = useRouter();

  useEffect(() => {
    // Проверяем сессию через API (без localStorage)
    const checkSession = async () => {
      try {
        const response = await fetch('/api/auth', {
          method: 'GET',
          credentials: 'include'
        });
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.user) {
            router.push('/');
          }
        }
      } catch (error) {
        // Игнорируем ошибки проверки
      }
    };
    checkSession();

    // Проверяем доступные методы авторизации
    const checkAvailableAuth = () => {
      // Проверяем Telegram WebApp
      const hasTelegram = typeof window !== 'undefined' && 
        window.Telegram?.WebApp?.initDataUnsafe?.user !== undefined;
      
      // Проверяем VK Mini App
      const hasVK = typeof window !== 'undefined' && 
        (window as any).VK?.Bridge !== undefined;
      
      setAvailableAuthMethods({
        telegram: hasTelegram,
        vk: hasVK
      });
    };

    checkAvailableAuth();
  }, [router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!credentials.identifier || !credentials.password) {
      setError('Заполните все поля');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const identifier = credentials.identifier;
      const loginData: Record<string, string> = { password: credentials.password };

      if (identifier.includes('@')) {
        loginData.email = identifier;
      } else if (identifier.startsWith('+') || /^\d+$/.test(identifier)) {
        loginData.phone = identifier;
      } else {
        loginData.username = identifier;
      }

      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(loginData)
      });

      const data = await response.json();

      if (data.success) {
        // Токен сохраняется в cookies сервером, не используем localStorage
        window.dispatchEvent(new CustomEvent('coinsUpdated', { 
          detail: { coins: data.user.coins } 
        }));

        console.log('✅ Логин успешен, ждем установки cookie и редиректим...');
        
        // ✅ УВЕЛИЧИВАЕМ ЗАДЕРЖКУ для установки cookie
        // Передаем данные пользователя через sessionStorage для немедленного использования
        if (typeof window !== 'undefined') {
          // ✅ Нормализуем данные пользователя для совместимости
          // API возвращает: avatar_url, games_played, games_won
          // Нужно: photoUrl, gamesPlayed, gamesWon
          const normalizedUser = {
            id: data.user.id,
            username: data.user.username,
            firstName: data.user.firstName || data.user.username || '',
            lastName: data.user.lastName || '',
            telegramId: data.user.telegramId || '',
            coins: data.user.coins || 1000,
            rating: data.user.rating || 0,
            gamesPlayed: data.user.games_played || data.user.gamesPlayed || 0,
            gamesWon: data.user.games_won || data.user.gamesWon || 0,
            photoUrl: data.user.avatar_url || data.user.photoUrl || ''
          };
          
          sessionStorage.setItem('pendingAuth', JSON.stringify({
            user: normalizedUser,
            timestamp: Date.now()
          }));
          
          console.log('💾 [Login] Сохранены данные pendingAuth:', normalizedUser.username);
        }
        
        setTimeout(() => {
          console.log('🔄 Редирект на главную страницу...');
          router.push('/');
        }, 1000); // Увеличено до 1 секунды
      } else {
        setError(data.message || 'Ошибка входа');
      }
    } catch (err) {
      setError('Ошибка сети');
    } finally {
      setLoading(false);
    }
  };

  const handleTelegramLogin = async () => {
    if (typeof window !== 'undefined' && window.Telegram?.WebApp) {
      const tg = window.Telegram.WebApp;
      const initData = tg.initData;
      const user = tg.initDataUnsafe?.user;

      if (!initData || !user) {
        setError('Откройте через Telegram');
        return;
      }

      setLoading(true);
      setError('');

      try {
        const response = await fetch('/api/auth', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            type: 'telegram',
            id: user.id,
            username: user.username,
            first_name: user.first_name,
            last_name: user.last_name,
            photo_url: user.photo_url,
            initData: initData,
          })
        });

        const data = await response.json();

        if (data.success) {
          // Токен сохраняется в cookies сервером, не используем localStorage
          window.dispatchEvent(new CustomEvent('coinsUpdated', { 
            detail: { coins: data.user.coins } 
          }));

          setTimeout(() => {
            router.push('/');
          }, 500);
        } else {
          setError(data.message || 'Ошибка входа');
        }
      } catch (err) {
        setError('Ошибка сети');
      } finally {
        setLoading(false);
      }
    } else {
      setError('Доступно только в Telegram WebApp');
    }
  };

  const handleVKLogin = async () => {
    if (!isVKMiniApp()) {
      setError('Доступно только в VK Mini App');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const result = await loginWithVKMiniApp();

      if (result.success && result.user) {
        window.dispatchEvent(new CustomEvent('coinsUpdated', { 
          detail: { coins: result.user.coins } 
        }));

        setTimeout(() => {
          router.push('/');
        }, 500);
      } else {
        setError(result.message || 'Ошибка входа');
      }
    } catch (err) {
      setError('Ошибка сети');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #334155 100%)',
      padding: '20px',
      paddingTop: '80px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }}>
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        style={{
          width: '100%',
          maxWidth: '420px'
        }}
      >
        <div style={{
          background: 'linear-gradient(145deg, rgba(30, 41, 59, 0.95) 0%, rgba(15, 23, 42, 0.95) 100%)',
          border: '2px solid rgba(99, 102, 241, 0.3)',
          borderRadius: '20px',
          padding: '32px',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)'
        }}>
          {/* Header */}
          <motion.div
            initial={{ y: -10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            style={{ textAlign: 'center', marginBottom: '32px' }}
          >
            <div style={{ fontSize: '48px', marginBottom: '12px' }}>🔐</div>
            <h1 style={{
              fontSize: '32px',
              fontWeight: '900',
              background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #ec4899 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              marginBottom: '8px'
            }}>
              Вход
            </h1>
            <p style={{ color: '#94a3b8', fontSize: '14px' }}>
              Войдите в свой аккаунт
            </p>
          </motion.div>

          {/* Error */}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              style={{
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                borderRadius: '12px',
                padding: '12px',
                marginBottom: '20px',
                color: '#fca5a5',
                fontSize: '14px'
              }}
            >
              {error}
            </motion.div>
          )}

          {/* Login Form */}
          <form onSubmit={handleLogin}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{
                  display: 'block',
                  color: '#e2e8f0',
                  fontSize: '14px',
                  fontWeight: '500',
                  marginBottom: '8px'
                }}>
                  Логин, Email или Телефон
                </label>
                <div style={{ position: 'relative' }}>
                  <User style={{
                    position: 'absolute',
                    left: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: '#64748b',
                    width: '18px',
                    height: '18px'
                  }} />
                  <input
                    type="text"
                    value={credentials.identifier}
                    onChange={(e) => setCredentials({ ...credentials, identifier: e.target.value })}
                    placeholder="Введите логин, email или телефон"
                    style={{
                      width: '100%',
                      background: 'rgba(30, 41, 59, 0.5)',
                      border: '1px solid rgba(99, 102, 241, 0.3)',
                      borderRadius: '12px',
                      padding: '12px 12px 12px 40px',
                      color: '#ffffff',
                      fontSize: '14px',
                      outline: 'none',
                      transition: 'all 0.3s ease'
                    }}
                    onFocus={(e) => e.target.style.borderColor = 'rgba(99, 102, 241, 0.6)'}
                    onBlur={(e) => e.target.style.borderColor = 'rgba(99, 102, 241, 0.3)'}
                  />
                </div>
              </div>

              <div>
                <label style={{
                  display: 'block',
                  color: '#e2e8f0',
                  fontSize: '14px',
                  fontWeight: '500',
                  marginBottom: '8px'
                }}>
                  Пароль
                </label>
                <div style={{ position: 'relative' }}>
                  <Lock style={{
                    position: 'absolute',
                    left: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: '#64748b',
                    width: '18px',
                    height: '18px'
                  }} />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={credentials.password}
                    onChange={(e) => setCredentials({ ...credentials, password: e.target.value })}
                    placeholder="Введите пароль"
                    style={{
                      width: '100%',
                      background: 'rgba(30, 41, 59, 0.5)',
                      border: '1px solid rgba(99, 102, 241, 0.3)',
                      borderRadius: '12px',
                      padding: '12px 40px 12px 40px',
                      color: '#ffffff',
                      fontSize: '14px',
                      outline: 'none',
                      transition: 'all 0.3s ease'
                    }}
                    onFocus={(e) => e.target.style.borderColor = 'rgba(99, 102, 241, 0.6)'}
                    onBlur={(e) => e.target.style.borderColor = 'rgba(99, 102, 241, 0.3)'}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{
                      position: 'absolute',
                      right: '12px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      color: '#94a3b8',
                      cursor: 'pointer',
                      padding: '4px'
                    }}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <motion.button
                type="submit"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                disabled={loading}
                style={{
                  width: '100%',
                  background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                  border: 'none',
                  borderRadius: '12px',
                  padding: '14px',
                  color: '#ffffff',
                  fontSize: '16px',
                  fontWeight: '700',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  opacity: loading ? 0.6 : 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  marginTop: '8px'
                }}
              >
                <LogIn size={20} />
                {loading ? 'Вход...' : 'Войти'}
              </motion.button>
            </div>
          </form>

          {/* Divider */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            margin: '24px 0'
          }}>
            <div style={{ flex: 1, height: '1px', background: 'rgba(99, 102, 241, 0.2)' }} />
            <span style={{ color: '#64748b', fontSize: '12px' }}>или</span>
            <div style={{ flex: 1, height: '1px', background: 'rgba(99, 102, 241, 0.2)' }} />
          </div>

          {/* Social Buttons */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {(availableAuthMethods.telegram || typeof window !== 'undefined' && window.Telegram?.WebApp) && (
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleTelegramLogin}
                disabled={loading}
                style={{
                  width: '100%',
                  background: availableAuthMethods.telegram 
                    ? 'rgba(0, 136, 204, 0.3)' 
                    : 'rgba(0, 136, 204, 0.2)',
                  border: `1px solid ${availableAuthMethods.telegram ? 'rgba(0, 136, 204, 0.6)' : 'rgba(0, 136, 204, 0.4)'}`,
                  borderRadius: '12px',
                  padding: '14px',
                  color: '#ffffff',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  opacity: loading ? 0.5 : 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  position: 'relative'
                }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.562 8.161c-.18 1.897-.962 6.502-1.359 8.627-.168.9-.5 1.201-.82 1.23-.697.064-1.226-.461-1.901-.903-1.056-.692-1.653-1.123-2.678-1.799-1.185-.781-.417-1.21.258-1.911.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.139-5.062 3.345-.479.329-.913.489-1.302.481-.428-.009-1.252-.242-1.865-.442-.752-.244-1.349-.374-1.297-.789.027-.216.324-.437.893-.663 3.498-1.524 5.831-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635.099-.002.321.023.465.141.121.099.154.232.17.325.015.093.034.305.019.471z"/>
                </svg>
                Telegram
                {availableAuthMethods.telegram && (
                  <span style={{
                    position: 'absolute',
                    right: '12px',
                    background: 'rgba(34, 197, 94, 0.3)',
                    color: '#22c55e',
                    fontSize: '10px',
                    padding: '2px 6px',
                    borderRadius: '8px',
                    fontWeight: '700'
                  }}>
                    ✓ Доступно
                  </span>
                )}
              </motion.button>
            )}

            {(availableAuthMethods.vk || isVKMiniApp()) && (
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleVKLogin}
                disabled={loading || !isVKMiniApp()}
                style={{
                  width: '100%',
                  background: availableAuthMethods.vk && isVKMiniApp()
                    ? 'rgba(74, 118, 168, 0.3)' 
                    : isVKMiniApp() 
                      ? 'rgba(74, 118, 168, 0.2)' 
                      : 'rgba(74, 118, 168, 0.1)',
                  border: `1px solid ${availableAuthMethods.vk && isVKMiniApp() ? 'rgba(74, 118, 168, 0.6)' : isVKMiniApp() ? 'rgba(74, 118, 168, 0.4)' : 'rgba(74, 118, 168, 0.2)'}`,
                  borderRadius: '12px',
                  padding: '14px',
                  color: '#ffffff',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: loading || !isVKMiniApp() ? 'not-allowed' : 'pointer',
                  opacity: loading || !isVKMiniApp() ? 0.3 : 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  position: 'relative'
                }}
              >
                <span style={{ fontSize: '20px' }}>🔵</span>
                VKontakte
                {availableAuthMethods.vk && isVKMiniApp() && (
                  <span style={{
                    position: 'absolute',
                    right: '12px',
                    background: 'rgba(34, 197, 94, 0.3)',
                    color: '#22c55e',
                    fontSize: '10px',
                    padding: '2px 6px',
                    borderRadius: '8px',
                    fontWeight: '700'
                  }}>
                    ✓ Доступно
                  </span>
                )}
              </motion.button>
            )}
          </div>

          {/* Register Link */}
          <div style={{
            textAlign: 'center',
            marginTop: '24px',
            color: '#94a3b8',
            fontSize: '14px'
          }}>
            Нет аккаунта?{' '}
            <Link href="/auth/register" style={{
              color: '#6366f1',
              fontWeight: '600',
              textDecoration: 'none'
            }}>
              Зарегистрироваться
            </Link>
          </div>

          {/* Back to Main Menu */}
          <div style={{
            textAlign: 'center',
            marginTop: '16px'
          }}>
            <Link href="/" style={{
              color: '#64748b',
              fontSize: '12px',
              textDecoration: 'none'
            }}>
              ← Вернуться в главное меню
            </Link>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

