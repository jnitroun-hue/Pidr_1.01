"use client";

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { UserPlus, Eye, EyeOff, Mail, Lock, User, Phone, CheckCircle } from 'lucide-react';
import { isVKMiniApp, loginWithVKMiniApp } from '@/lib/auth/vk-bridge';
import { buildVkOAuthUrl, detectMiniAppContext } from '@/lib/auth/social-auth';
import Link from 'next/link';
import { getApiHeaders } from '@/lib/api-headers';

export default function RegisterPage() {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: ''
  });
  
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [availableAuthMethods, setAvailableAuthMethods] = useState<{
    telegram: boolean;
    vk: boolean;
  }>({ telegram: false, vk: false });
  const autoLoginTriedRef = useRef(false);
  const [validation, setValidation] = useState({
    username: false,
    email: true, // Email опциональный
    phone: true, // Phone опциональный
    password: false,
    confirmPassword: false
  });

  const router = useRouter();

  useEffect(() => {
    // Проверяем сессию через API (без клиентского хранилища)
    const checkSession = async () => {
      try {
        const response = await fetch('/api/auth', {
          method: 'GET',
          credentials: 'include',
          cache: 'no-store',
          headers: getApiHeaders(),
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

    const checkAvailableAuth = () => {
      const context = detectMiniAppContext();
      setAvailableAuthMethods({
        telegram: context.isTelegramMiniApp,
        vk: context.isVKMiniApp,
      });
    };

    checkAvailableAuth();
  }, [router]);

  useEffect(() => {
    setValidation({
      username: formData.username.length >= 3 && formData.username.length <= 32 && /^[a-zA-Z0-9_]+$/.test(formData.username),
      email: !formData.email || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email),
      phone: !formData.phone || /^\+?[1-9]\d{1,14}$/.test(formData.phone),
      password: formData.password.length >= 6,
      confirmPassword: formData.password === formData.confirmPassword && formData.confirmPassword.length > 0
    });
  }, [formData]);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validation.username || !validation.password || !validation.confirmPassword) {
      setError('Исправьте ошибки в форме');
      return;
    }

    if (formData.email && !validation.email) {
      setError('Неверный формат email');
      return;
    }

    if (formData.phone && !validation.phone) {
      setError('Неверный формат телефона');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const registerData: Record<string, string> = {
        username: formData.username,
        password: formData.password
      };

      if (formData.email) registerData.email = formData.email;
      if (formData.phone) registerData.phone = formData.phone;

      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(registerData)
      });

      const data = await response.json();

      if (data.success) {
        // Токен сохраняется в cookies сервером, без клиентского хранилища
        window.dispatchEvent(new CustomEvent('coinsUpdated', { 
          detail: { coins: data.user.coins } 
        }));

        console.log('✅ Регистрация успешна!', {
          username: data.user.username,
          id: data.user.id,
          hasToken: !!data.token
        });
        
        // Cookie устанавливается сервером автоматически
        console.log('✅ Регистрация успешна, редирект...');
        router.push('/');
      } else {
        setError(data.message || 'Ошибка регистрации');
      }
    } catch (err) {
      setError('Ошибка сети');
    } finally {
      setLoading(false);
    }
  };

  const handleTelegramRegister = async () => {
    if (typeof window !== 'undefined' && window.Telegram?.WebApp) {
      const tg = window.Telegram.WebApp;
      const initData = tg.initData;
      const user = tg.initDataUnsafe?.user;

      if (!initData || !user) {
        setError('Откройте через Telegram');
        return;
      }

      setLoading(true);

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
            initData
          })
        });

        const data = await response.json();

        if (data.success) {
          // Токен сохраняется в cookies сервером, без клиентского хранилища
          setTimeout(() => {
            router.push('/');
          }, 500);
        } else {
          setError(data.message || 'Ошибка регистрации');
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

  const handleTelegramWebRegister = () => {
    const redirect = encodeURIComponent('/');
    router.push(`/auth?redirect=${redirect}`);
  };

  const handleVKRegister = async () => {
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
        setError(result.message || 'Ошибка регистрации');
      }
    } catch (err) {
      setError('Ошибка сети');
    } finally {
      setLoading(false);
    }
  };

  const handleVKOAuthWebRegister = () => {
    const redirectUri = `${window.location.origin}/auth/vk/callback`;
    const oauthUrl = buildVkOAuthUrl(redirectUri);
    if (!oauthUrl) {
      setError('VK OAuth не настроен: отсутствует NEXT_PUBLIC_VK_CLIENT_ID');
      return;
    }
    window.location.href = oauthUrl;
  };

  useEffect(() => {
    if (autoLoginTriedRef.current || loading) return;
    if (availableAuthMethods.telegram) {
      autoLoginTriedRef.current = true;
      void handleTelegramRegister();
      return;
    }
    if (availableAuthMethods.vk && isVKMiniApp()) {
      autoLoginTriedRef.current = true;
      void handleVKRegister();
    }
  }, [availableAuthMethods.telegram, availableAuthMethods.vk, loading]);

  const getInputBorderColor = (field: keyof typeof validation, hasValue: boolean) => {
    if (!hasValue) return 'rgba(99, 102, 241, 0.3)';
    return validation[field] ? 'rgba(34, 197, 94, 0.4)' : 'rgba(239, 68, 68, 0.4)';
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
          maxWidth: '420px',
          maxHeight: '90vh',
          overflowY: 'auto'
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
            <div style={{ fontSize: '48px', marginBottom: '12px' }}>✨</div>
            <h1 style={{
              fontSize: '32px',
              fontWeight: '900',
              background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #ec4899 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              marginBottom: '8px'
            }}>
              Регистрация
            </h1>
            <p style={{ color: '#94a3b8', fontSize: '14px' }}>
              Создайте новый аккаунт
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

          {/* Registration Form */}
          <form onSubmit={handleRegister}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <label style={{
                    color: '#e2e8f0',
                    fontSize: '14px',
                    fontWeight: '500'
                  }}>
                    Логин *
                  </label>
                  {formData.username && (
                    validation.username ? 
                      <CheckCircle size={14} color="#22c55e" /> : 
                      <span style={{ color: '#ef4444', fontSize: '12px' }}>(3-32 символа)</span>
                  )}
                </div>
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
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    placeholder="username123"
                    style={{
                      width: '100%',
                      background: 'rgba(30, 41, 59, 0.5)',
                      border: `1px solid ${getInputBorderColor('username', !!formData.username)}`,
                      borderRadius: '12px',
                      padding: '12px 12px 12px 40px',
                      color: '#ffffff',
                      fontSize: '14px',
                      outline: 'none',
                      transition: 'all 0.3s ease'
                    }}
                  />
                </div>
              </div>

              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <label style={{
                    color: '#e2e8f0',
                    fontSize: '14px',
                    fontWeight: '500'
                  }}>
                    Email <span style={{ color: '#64748b', fontSize: '12px' }}>(опционально)</span>
                  </label>
                  {formData.email && (
                    validation.email ? 
                      <CheckCircle size={14} color="#22c55e" /> : 
                      <span style={{ color: '#ef4444', fontSize: '12px' }}>(неверный формат)</span>
                  )}
                </div>
                <div style={{ position: 'relative' }}>
                  <Mail style={{
                    position: 'absolute',
                    left: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: '#64748b',
                    width: '18px',
                    height: '18px'
                  }} />
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="example@email.com"
                    style={{
                      width: '100%',
                      background: 'rgba(30, 41, 59, 0.5)',
                      border: `1px solid ${getInputBorderColor('email', !!formData.email)}`,
                      borderRadius: '12px',
                      padding: '12px 12px 12px 40px',
                      color: '#ffffff',
                      fontSize: '14px',
                      outline: 'none',
                      transition: 'all 0.3s ease'
                    }}
                  />
                </div>
              </div>

              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <label style={{
                    color: '#e2e8f0',
                    fontSize: '14px',
                    fontWeight: '500'
                  }}>
                    Телефон <span style={{ color: '#64748b', fontSize: '12px' }}>(опционально)</span>
                  </label>
                  {formData.phone && (
                    validation.phone ? 
                      <CheckCircle size={14} color="#22c55e" /> : 
                      <span style={{ color: '#ef4444', fontSize: '12px' }}>(неверный формат)</span>
                  )}
                </div>
                <div style={{ position: 'relative' }}>
                  <Phone style={{
                    position: 'absolute',
                    left: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: '#64748b',
                    width: '18px',
                    height: '18px'
                  }} />
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="+1234567890"
                    style={{
                      width: '100%',
                      background: 'rgba(30, 41, 59, 0.5)',
                      border: `1px solid ${getInputBorderColor('phone', !!formData.phone)}`,
                      borderRadius: '12px',
                      padding: '12px 12px 12px 40px',
                      color: '#ffffff',
                      fontSize: '14px',
                      outline: 'none',
                      transition: 'all 0.3s ease'
                    }}
                  />
                </div>
              </div>

              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <label style={{
                    color: '#e2e8f0',
                    fontSize: '14px',
                    fontWeight: '500'
                  }}>
                    Пароль *
                  </label>
                  {formData.password && (
                    validation.password ? 
                      <CheckCircle size={14} color="#22c55e" /> : 
                      <span style={{ color: '#ef4444', fontSize: '12px' }}>(мин. 6 символов)</span>
                  )}
                </div>
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
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder="Введите пароль"
                    style={{
                      width: '100%',
                      background: 'rgba(30, 41, 59, 0.5)',
                      border: `1px solid ${getInputBorderColor('password', !!formData.password)}`,
                      borderRadius: '12px',
                      padding: '12px 40px 12px 40px',
                      color: '#ffffff',
                      fontSize: '14px',
                      outline: 'none',
                      transition: 'all 0.3s ease'
                    }}
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

              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <label style={{
                    color: '#e2e8f0',
                    fontSize: '14px',
                    fontWeight: '500'
                  }}>
                    Подтвердить пароль *
                  </label>
                  {formData.confirmPassword && (
                    validation.confirmPassword ? 
                      <CheckCircle size={14} color="#22c55e" /> : 
                      <span style={{ color: '#ef4444', fontSize: '12px' }}>(не совпадают)</span>
                  )}
                </div>
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
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={formData.confirmPassword}
                    onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                    placeholder="Повторите пароль"
                    style={{
                      width: '100%',
                      background: 'rgba(30, 41, 59, 0.5)',
                      border: `1px solid ${getInputBorderColor('confirmPassword', !!formData.confirmPassword)}`,
                      borderRadius: '12px',
                      padding: '12px 40px 12px 40px',
                      color: '#ffffff',
                      fontSize: '14px',
                      outline: 'none',
                      transition: 'all 0.3s ease'
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
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
                    {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <motion.button
                type="submit"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                disabled={loading || !validation.username || !validation.password || !validation.confirmPassword}
                style={{
                  width: '100%',
                  background: validation.username && validation.password && validation.confirmPassword
                    ? 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)'
                    : 'rgba(99, 102, 241, 0.3)',
                  border: 'none',
                  borderRadius: '12px',
                  padding: '14px',
                  color: '#ffffff',
                  fontSize: '16px',
                  fontWeight: '700',
                  cursor: loading || !validation.username || !validation.password || !validation.confirmPassword
                    ? 'not-allowed' : 'pointer',
                  opacity: loading ? 0.6 : 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  marginTop: '8px'
                }}
              >
                <UserPlus size={20} />
                {loading ? 'Создание...' : 'Создать аккаунт'}
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
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={availableAuthMethods.telegram ? handleTelegramRegister : handleTelegramWebRegister}
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
              {availableAuthMethods.telegram ? 'Telegram Mini App' : 'Telegram (Web)'}
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
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={availableAuthMethods.vk ? handleVKRegister : handleVKOAuthWebRegister}
              disabled={loading}
              style={{
                width: '100%',
                background: availableAuthMethods.vk
                  ? 'rgba(74, 118, 168, 0.3)'
                  : 'rgba(74, 118, 168, 0.2)',
                border: `1px solid ${availableAuthMethods.vk ? 'rgba(74, 118, 168, 0.6)' : 'rgba(74, 118, 168, 0.4)'}`,
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
              <span style={{ fontSize: '20px' }}>🔵</span>
              {availableAuthMethods.vk ? 'VK Mini App' : 'VK (Web OAuth)'}
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
            </motion.button>
          </div>

          {/* Login Link */}
          <div style={{
            textAlign: 'center',
            marginTop: '24px',
            color: '#94a3b8',
            fontSize: '14px'
          }}>
            Уже есть аккаунт?{' '}
            <Link href="/auth/login" style={{
              color: '#6366f1',
              fontWeight: '600',
              textDecoration: 'none'
            }}>
              Войти
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

