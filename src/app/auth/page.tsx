'use client'

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';

// Декларация типов для Telegram Login Widget
declare global {
  interface Window {
    onTelegramAuth?: (user: any) => void;
  }
}

export default function AuthPage() {
  const router = useRouter();
  const [authMethod, setAuthMethod] = useState<'phone' | 'vk' | 'google' | null>(null);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [code, setCode] = useState('');
  const [step, setStep] = useState<'method' | 'phone' | 'code'>('method');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Загружаем Telegram Login Widget скрипт
    const script = document.createElement('script');
    script.src = 'https://telegram.org/js/telegram-widget.js?22';
    script.async = true;
    script.setAttribute('data-telegram-login', 'NotPdr_1_01_bot'); // TODO: Замените на ваш bot username
    script.setAttribute('data-size', 'large');
    script.setAttribute('data-radius', '12');
    script.setAttribute('data-request-access', 'write');
    script.setAttribute('data-onauth', 'onTelegramAuth(user)');
    
    const widgetContainer = document.getElementById('telegram-login-widget');
    if (widgetContainer) {
      widgetContainer.appendChild(script);
    }

    // Обработчик успешной авторизации Telegram
    window.onTelegramAuth = async (user: any) => {
      console.log('✅ Telegram Auth Success:', user);
      setIsLoading(true);

      try {
        // Отправляем данные на сервер для создания сессии
        const response = await fetch('/api/auth/telegram-login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(user)
        });

        const data = await response.json();

        if (data.success) {
          console.log('✅ Сессия создана, перенаправление...');
          router.push('/');
        } else {
          alert(`Ошибка: ${data.error}`);
        }
      } catch (error) {
        console.error('❌ Ошибка авторизации:', error);
        alert('Ошибка авторизации');
      } finally {
        setIsLoading(false);
      }
    };

    return () => {
      // Очистка при размонтировании
      window.onTelegramAuth = undefined;
    };
  }, [router]);

  const handlePhoneAuth = async () => {
    if (!phoneNumber) {
      alert('Введите номер телефона');
      return;
    }

    setIsLoading(true);

    try {
      // TODO: Отправка SMS кода
      console.log('📱 Отправка SMS на:', phoneNumber);
      
      // Симуляция отправки
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setStep('code');
    } catch (error) {
      console.error('Ошибка отправки SMS:', error);
      alert('Ошибка отправки SMS');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCodeVerify = async () => {
    if (!code) {
      alert('Введите код');
      return;
    }

    setIsLoading(true);

    try {
      // TODO: Проверка кода
      console.log('🔐 Проверка кода:', code);
      
      // Симуляция проверки
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Перенаправление в игру
      router.push('/');
    } catch (error) {
      console.error('Ошибка проверки кода:', error);
      alert('Неверный код');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVKAuth = () => {
    alert('VK авторизация временно недоступна');
  };

  const handleGoogleAuth = () => {
    alert('Google авторизация временно недоступна');
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px'
    }}>
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        style={{
          width: '100%',
          maxWidth: '420px',
          background: 'linear-gradient(145deg, rgba(30, 41, 59, 0.95), rgba(15, 23, 42, 0.95))',
          borderRadius: '24px',
          padding: '40px',
          border: '1px solid rgba(251, 191, 36, 0.2)',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)',
          backdropFilter: 'blur(20px)'
        }}
      >
        {/* Логотип */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <h1 style={{
            fontSize: '32px',
            fontWeight: 'bold',
            background: 'linear-gradient(135deg, #fbbf24, #f59e0b)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            marginBottom: '8px'
          }}>
            P.I.D.R.
          </h1>
          <p style={{ color: '#94a3b8', fontSize: '14px' }}>
            ВХОД В ИГРУ
          </p>
        </div>

        <AnimatePresence mode="wait">
          {step === 'method' && (
            <motion.div
              key="method"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              {/* Telegram Login Widget */}
              <div style={{
                marginBottom: '16px',
                padding: '16px',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, rgba(0, 136, 204, 0.1), rgba(0, 102, 170, 0.1))',
                border: '2px solid rgba(0, 136, 204, 0.3)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '12px'
              }}>
                <div style={{
                  color: '#cbd5e1',
                  fontSize: '14px',
                  fontWeight: 'bold',
                  textAlign: 'center'
                }}>
                  ✈️ ВХОД ЧЕРЕЗ TELEGRAM
                </div>
                <div id="telegram-login-widget" style={{
                  display: 'flex',
                  justifyContent: 'center',
                  width: '100%'
                }}>
                  {isLoading && (
                    <div style={{ 
                      color: '#0088cc', 
                      fontSize: '14px',
                      textAlign: 'center'
                    }}>
                      ⏳ Авторизация...
                    </div>
                  )}
                </div>
              </div>

              {/* VK (Заглушка) */}
              <button
                onClick={handleVKAuth}
                style={{
                  width: '100%',
                  padding: '16px 24px',
                  marginBottom: '12px',
                  borderRadius: '12px',
                  background: 'linear-gradient(135deg, #4a76a8, #3b5998)',
                  border: '2px solid rgba(74, 118, 168, 0.5)',
                  color: '#fff',
                  fontSize: '16px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '12px',
                  transition: 'all 0.3s',
                  boxShadow: '0 8px 24px rgba(74, 118, 168, 0.3)',
                  opacity: 0.6
                }}
              >
                <span style={{ fontSize: '24px' }}>🔵</span>
                <span>ВКОНТАКТЕ</span>
                <span style={{ 
                  fontSize: '10px', 
                  background: 'rgba(255,255,255,0.2)', 
                  padding: '2px 6px', 
                  borderRadius: '4px' 
                }}>
                  СКОРО
                </span>
              </button>

              {/* Google (Заглушка) */}
              <button
                onClick={handleGoogleAuth}
                style={{
                  width: '100%',
                  padding: '16px 24px',
                  borderRadius: '12px',
                  background: 'linear-gradient(145deg, #fff, #f1f5f9)',
                  border: '2px solid rgba(203, 213, 225, 0.5)',
                  color: '#1e293b',
                  fontSize: '16px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '12px',
                  transition: 'all 0.3s',
                  boxShadow: '0 8px 24px rgba(0, 0, 0, 0.1)',
                  opacity: 0.6
                }}
              >
                <span style={{ fontSize: '24px' }}>🔴</span>
                <span>GOOGLE</span>
                <span style={{ 
                  fontSize: '10px', 
                  background: 'rgba(0,0,0,0.1)', 
                  padding: '2px 6px', 
                  borderRadius: '4px' 
                }}>
                  СКОРО
                </span>
              </button>
            </motion.div>
          )}

          {step === 'phone' && (
            <motion.div
              key="phone"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <button
                onClick={() => setStep('method')}
                style={{
                  marginBottom: '24px',
                  color: '#94a3b8',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '14px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                <span>←</span> Назад
              </button>

              <label style={{
                display: 'block',
                marginBottom: '8px',
                color: '#cbd5e1',
                fontSize: '14px',
                fontWeight: 'bold'
              }}>
                Номер телефона
              </label>

              <input
                type="tel"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="+7 999 123 45 67"
                style={{
                  width: '100%',
                  padding: '16px 20px',
                  marginBottom: '20px',
                  borderRadius: '12px',
                  background: 'rgba(15, 23, 42, 0.8)',
                  border: '2px solid rgba(71, 85, 105, 0.4)',
                  color: '#fff',
                  fontSize: '16px',
                  outline: 'none',
                  transition: 'all 0.3s'
                }}
                onFocus={(e) => e.currentTarget.style.borderColor = '#fbbf24'}
                onBlur={(e) => e.currentTarget.style.borderColor = 'rgba(71, 85, 105, 0.4)'}
              />

              <button
                onClick={handlePhoneAuth}
                disabled={isLoading || !phoneNumber}
                style={{
                  width: '100%',
                  padding: '16px',
                  borderRadius: '12px',
                  background: isLoading || !phoneNumber
                    ? 'rgba(75, 85, 99, 0.6)'
                    : 'linear-gradient(135deg, #fbbf24, #f59e0b)',
                  border: '2px solid rgba(251, 191, 36, 0.5)',
                  color: '#fff',
                  fontSize: '16px',
                  fontWeight: 'bold',
                  cursor: isLoading || !phoneNumber ? 'not-allowed' : 'pointer',
                  opacity: isLoading || !phoneNumber ? 0.6 : 1,
                  transition: 'all 0.3s',
                  boxShadow: '0 8px 24px rgba(251, 191, 36, 0.3)'
                }}
              >
                {isLoading ? '⏳ ОТПРАВКА...' : '📱 ПОЛУЧИТЬ КОД'}
              </button>
            </motion.div>
          )}

          {step === 'code' && (
            <motion.div
              key="code"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <button
                onClick={() => setStep('phone')}
                style={{
                  marginBottom: '24px',
                  color: '#94a3b8',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '14px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                <span>←</span> Назад
              </button>

              <p style={{
                marginBottom: '20px',
                color: '#cbd5e1',
                fontSize: '14px',
                textAlign: 'center'
              }}>
                Код отправлен на <br />
                <strong style={{ color: '#fbbf24' }}>{phoneNumber}</strong>
              </p>

              <label style={{
                display: 'block',
                marginBottom: '8px',
                color: '#cbd5e1',
                fontSize: '14px',
                fontWeight: 'bold'
              }}>
                Код из SMS
              </label>

              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="••••••"
                maxLength={6}
                style={{
                  width: '100%',
                  padding: '16px 20px',
                  marginBottom: '20px',
                  borderRadius: '12px',
                  background: 'rgba(15, 23, 42, 0.8)',
                  border: '2px solid rgba(71, 85, 105, 0.4)',
                  color: '#fff',
                  fontSize: '24px',
                  textAlign: 'center',
                  letterSpacing: '8px',
                  outline: 'none',
                  transition: 'all 0.3s',
                  fontWeight: 'bold'
                }}
                onFocus={(e) => e.currentTarget.style.borderColor = '#fbbf24'}
                onBlur={(e) => e.currentTarget.style.borderColor = 'rgba(71, 85, 105, 0.4)'}
              />

              <button
                onClick={handleCodeVerify}
                disabled={isLoading || !code}
                style={{
                  width: '100%',
                  padding: '16px',
                  borderRadius: '12px',
                  background: isLoading || !code
                    ? 'rgba(75, 85, 99, 0.6)'
                    : 'linear-gradient(135deg, #10b981, #059669)',
                  border: '2px solid rgba(16, 185, 129, 0.5)',
                  color: '#fff',
                  fontSize: '16px',
                  fontWeight: 'bold',
                  cursor: isLoading || !code ? 'not-allowed' : 'pointer',
                  opacity: isLoading || !code ? 0.6 : 1,
                  transition: 'all 0.3s',
                  boxShadow: '0 8px 24px rgba(16, 185, 129, 0.3)'
                }}
              >
                {isLoading ? '⏳ ПРОВЕРКА...' : '✅ ВОЙТИ'}
              </button>

              <button
                onClick={handlePhoneAuth}
                disabled={isLoading}
                style={{
                  width: '100%',
                  padding: '12px',
                  marginTop: '12px',
                  background: 'none',
                  border: 'none',
                  color: '#94a3b8',
                  fontSize: '14px',
                  cursor: 'pointer',
                  textDecoration: 'underline'
                }}
              >
                Отправить код повторно
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Footer */}
        <div style={{
          marginTop: '32px',
          paddingTop: '20px',
          borderTop: '1px solid rgba(71, 85, 105, 0.3)',
          textAlign: 'center',
          color: '#64748b',
          fontSize: '12px'
        }}>
          © 2025 P.I.D.R. • Все права защищены
        </div>
      </motion.div>
    </div>
  );
}

