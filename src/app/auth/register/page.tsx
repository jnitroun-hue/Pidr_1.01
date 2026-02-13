"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { UserPlus, Eye, EyeOff, Mail, Lock, User, Phone, CheckCircle } from 'lucide-react';
import { isVKMiniApp, loginWithVKMiniApp } from '@/lib/auth/vk-bridge';
import Link from 'next/link';

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
  const [validation, setValidation] = useState({
    username: false,
    email: true, // Email опциональный
    phone: true, // Phone опциональный
    password: false,
    confirmPassword: false
  });

  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem('auth_token');
    if (token) {
      router.push('/');
    }
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
        localStorage.setItem('auth_token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        localStorage.setItem('current_user', JSON.stringify(data.user));
        
        window.dispatchEvent(new CustomEvent('coinsUpdated', { 
          detail: { coins: data.user.coins } 
        }));

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
          localStorage.setItem('auth_token', data.token);
          localStorage.setItem('user', JSON.stringify(data.user));
          
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
              onClick={handleTelegramRegister}
              disabled={loading}
              style={{
                width: '100%',
                background: 'rgba(0, 136, 204, 0.2)',
                border: '1px solid rgba(0, 136, 204, 0.4)',
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
                gap: '8px'
              }}
            >
              <span style={{ fontSize: '20px' }}>✈️</span>
              Telegram
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleVKRegister}
              disabled={loading || !isVKMiniApp()}
              style={{
                width: '100%',
                background: isVKMiniApp() ? 'rgba(74, 118, 168, 0.2)' : 'rgba(74, 118, 168, 0.1)',
                border: `1px solid ${isVKMiniApp() ? 'rgba(74, 118, 168, 0.4)' : 'rgba(74, 118, 168, 0.2)'}`,
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
                gap: '8px'
              }}
            >
              <span style={{ fontSize: '20px' }}>🔵</span>
              VKontakte
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

