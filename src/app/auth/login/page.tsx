"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Box, Button, Input, VStack, HStack, Text, Alert, Flex } from '@chakra-ui/react';
import { FaEye, FaEyeSlash, FaTelegram, FaGoogle } from 'react-icons/fa';
import Link from 'next/link';

// VK icon component
const VKIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
    <path d="M15.684 0H8.316C1.592 0 0 1.592 0 8.316v7.368C0 22.408 1.592 24 8.316 24h7.368C22.408 24 24 22.408 24 15.684V8.316C24 1.592 22.408 0 15.684 0zm3.692 17.123h-1.744c-.66 0-.864-.525-2.05-1.727-1.033-1.033-.148-1.49-.148-1.49.15-.108.3-.27.3-.511 0-.213-.064-.511-.945-.511-.75 0-.976.336-1.394.336-.475 0-.671-.3-.671-.671 0-.398.418-.671 1.008-.671.814 0 1.245.273 2.229.273.814 0 1.245-.336 1.245-.868 0-.418-.254-.786-.683-1.033l1.394-1.394c.088-.088.212-.148.348-.148.273 0 .498.225.498.498 0 .136-.06.26-.148.348l-1.394 1.394c.247.16.407.254.686.516.418.418.814.996.814 1.677 0 1.245-.976 2.229-2.229 2.229-.418 0-.796-.15-1.095-.387-.3.236-.677.387-1.095.387-.475 0-.9-.15-1.245-.398v.398c0 .273-.225.498-.498.498s-.498-.225-.498-.498V9.563c0-.814.66-1.474 1.474-1.474h3.444c.814 0 1.474.66 1.474 1.474v6.796c0 .273-.225.498-.498.498z"/>
  </svg>
);

export default function LoginPage() {
  const [credentials, setCredentials] = useState({ username: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();
  const showToast = (title: string, description: string, type: 'success' | 'error' | 'warning' | 'info') => {
    // Простое alert для демо - заменить на toast в production
    alert(`${title}: ${description}`);
  };

  useEffect(() => {
    // Проверяем, авторизован ли пользователь
    const token = localStorage.getItem('auth_token');
    if (token) {
      router.push('/');
    }
  }, [router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!credentials.username || !credentials.password) {
      setError('Пожалуйста, заполните все поля');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'local',
          username: credentials.username,
          password: credentials.password
        })
      });

      const data = await response.json();

      if (data.success) {
        console.log('✅ Успешная авторизация:', data.user);
        
        // Сохраняем данные пользователя
        localStorage.setItem('auth_token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        localStorage.setItem('current_user', JSON.stringify(data.user));
        
        // Диспатчим событие обновления монет
        window.dispatchEvent(new CustomEvent('coinsUpdated', { 
          detail: { coins: data.user.coins } 
        }));
        
        showToast('Успешно!', `Добро пожаловать, ${data.user.username}!`, 'success');

        // Проверяем реферальный код
        const pendingReferral = localStorage.getItem('pending_referral_code');
        if (pendingReferral) {
          await handlePendingReferral(pendingReferral, data.token);
        }

        // Перенаправляем в игру
        console.log('🚀 Начинаем перенаправление (локальный вход) через 1.5 сек');
        console.log('🔍 window.Telegram?.WebApp:', !!window.Telegram?.WebApp);
        
        setTimeout(() => {
          console.log('⏰ setTimeout выполнился (локальный)');
          
          if (typeof window !== 'undefined') {
            if (window.Telegram?.WebApp) {
              // Для Telegram WebApp используем router.replace
              console.log('🔄 Перенаправление в Telegram WebApp (локальный) через router');
              try {
                router.replace('/');
                console.log('✅ router.replace выполнен (локальный)');
              } catch (error) {
                console.error('❌ Ошибка router.replace (локальный):', error);
                window.location.href = '/';
              }
            } else {
              // Обычное перенаправление
              console.log('🔄 Обычное перенаправление (локальный)');
              window.location.href = '/';
            }
          } else {
            console.log('🔄 Server-side перенаправление (локальный)');
            router.push('/');
          }
        }, 1500);
      } else {
        setError(data.message || 'Ошибка входа');
      }
    } catch (error) {
      setError('Ошибка сети. Попробуйте позже.');
    } finally {
      setLoading(false);
    }
  };

  const handlePendingReferral = async (code: string, token: string) => {
    try {
      const response = await fetch('/api/referral', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          action: 'use_referral',
          referralCode: code
        })
      });

      const result = await response.json();
      if (result.success) {
        localStorage.removeItem('pending_referral_code');
        showToast('🎉 Бонус получен!', result.message, 'success');
      }
    } catch (error) {
      console.error('Error processing pending referral:', error);
    }
  };

  const handleTelegramLogin = async () => {
    if (typeof window !== 'undefined' && window.Telegram?.WebApp) {
      const tg = window.Telegram.WebApp;
      const initData = tg.initData;
      const user = tg.initDataUnsafe?.user;

      if (!initData || !user) {
        setError('Откройте приложение через Telegram');
        return;
      }

      setLoading(true);
      setError('');

      try {
        const response = await fetch('/api/auth', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
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
          console.log('✅ Успешная Telegram авторизация:', data.user);
          
          // Сохраняем данные пользователя
          localStorage.setItem('auth_token', data.token);
          localStorage.setItem('user', JSON.stringify(data.user));
          localStorage.setItem('current_user', JSON.stringify(data.user));
          
          // Диспатчим событие обновления монет
          window.dispatchEvent(new CustomEvent('coinsUpdated', { 
            detail: { coins: data.user.coins } 
          }));
          
          showToast('Успешно!', `Добро пожаловать, ${data.user.username}!`, 'success');

          // Перенаправляем в игру (Telegram)
          console.log('🚀 Начинаем перенаправление через 1.5 сек');
          console.log('🔍 window.Telegram?.WebApp:', !!window.Telegram?.WebApp);
          
          setTimeout(() => {
            console.log('⏰ setTimeout выполнился');
            
            if (typeof window !== 'undefined') {
              if (window.Telegram?.WebApp) {
                // Для Telegram WebApp используем router.replace
                console.log('🔄 Перенаправление в Telegram WebApp через router');
                try {
                  router.replace('/');
                  console.log('✅ router.replace выполнен');
                } catch (error) {
                  console.error('❌ Ошибка router.replace:', error);
                  // Пробуем window.location
                  window.location.href = '/';
                }
              } else {
                // Обычное перенаправление
                console.log('🔄 Обычное перенаправление');
                window.location.href = '/';
              }
            } else {
              console.log('🔄 Server-side перенаправление');
              router.push('/');
            }
          }, 1500);
        } else {
          setError(data.message || 'Ошибка входа через Telegram');
        }
      } catch (error) {
        setError('Ошибка сети. Попробуйте позже.');
      } finally {
        setLoading(false);
      }
    } else {
      showToast('Недоступно', 'Вход через Telegram доступен только в WebApp', 'warning');
    }
  };

  const handleGoogleLogin = () => {
    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    if (!clientId) {
      showToast('Ошибка конфигурации', 'Google OAuth не настроен', 'error');
      return;
    }

    const redirectUri = `${window.location.origin}/auth/google/callback`;
    const scope = 'openid profile email';
    const googleAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${encodeURIComponent(scope)}`;
    
    window.location.href = googleAuthUrl;
  };

  const handleVKLogin = () => {
    const clientId = process.env.NEXT_PUBLIC_VK_CLIENT_ID;
    if (!clientId) {
      showToast('Ошибка конфигурации', 'VK OAuth не настроен', 'error');
      return;
    }

    const redirectUri = `${window.location.origin}/auth/vk/callback`;
    const scope = 'email';
    const vkAuthUrl = `https://oauth.vk.com/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${scope}&v=5.131`;
    
    window.location.href = vkAuthUrl;
  };

  return (
    <Box 
      minH="100vh" 
      minW="100vw"
      bg="#0f172a"
      bgGradient="linear(135deg, #0f172a 0%, #1e293b 30%, #0f172a 60%, #064e3b 100%)"
      display="flex" 
      alignItems="center" 
      justifyContent="center" 
      p={4}
      position="relative"
      overflow="hidden"
      style={{
        background: '#0f172a',
        backgroundImage: 'linear-gradient(135deg, #0f172a 0%, #1e293b 30%, #0f172a 60%, #064e3b 100%)',
        WebkitBackgroundSize: 'cover',
        MozBackgroundSize: 'cover',
        OBackgroundSize: 'cover',
        backgroundSize: 'cover'
      }}
      _before={{
        content: '""',
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        background: 'radial-gradient(circle at 20% 20%, rgba(34, 197, 94, 0.08) 0%, transparent 50%), radial-gradient(circle at 80% 60%, rgba(255, 215, 0, 0.05) 0%, transparent 50%), radial-gradient(circle at 40% 80%, rgba(59, 130, 246, 0.06) 0%, transparent 50%)',
        pointerEvents: 'none',
        zIndex: 1
      }}
    >
      <Box 
        maxW="450px" 
        w="full" 
        bg="rgba(15, 23, 42, 0.95)"
        bgGradient="linear(135deg, rgba(15, 23, 42, 0.95) 0%, rgba(30, 41, 59, 0.90) 100%)"
        backdropFilter="blur(20px)"
        border="1px solid"
        borderColor="rgba(34, 197, 94, 0.3)"
        borderRadius="20px" 
        boxShadow="0 12px 48px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.1)"
        p={8}
        position="relative"
        zIndex={2}
        style={{
          background: 'rgba(15, 23, 42, 0.95)',
          backgroundImage: 'linear-gradient(135deg, rgba(15, 23, 42, 0.95) 0%, rgba(30, 41, 59, 0.90) 100%)'
        }}
      >
        <VStack gap={6}>
          {/* Header */}
          <Box textAlign="center">
            <Text 
              fontSize="2xl" 
              fontWeight="800" 
              color="#ffd700" 
              mb={2}
              letterSpacing="2px"
              textShadow="0 0 20px rgba(255, 215, 0, 0.5)"
            >
              P.I.D.R.
            </Text>
            <Text color="#e2e8f0" fontSize="lg" mb={4}>
              Войдите в свой аккаунт
            </Text>
          </Box>

          {/* Error Alert */}
          {error && (
            <Alert.Root status="error">
              <Alert.Indicator />
              <Alert.Content borderRadius="md" p={3} bg="red.100" color="red.800">
                ❌ {error}
              </Alert.Content>
            </Alert.Root>
          )}

          {/* Login Form */}
          <Box w="full">
            <form onSubmit={handleLogin}>
              <VStack gap={4}>
                <Box>
                  <Text mb={3} fontWeight="600" color="#e2e8f0">
                    Логин
                  </Text>
                  <Input
                    type="text"
                    value={credentials.username}
                    onChange={(e) => setCredentials({ ...credentials, username: e.target.value })}
                    placeholder="Введите ваш логин"
                    bg="linear-gradient(135deg, rgba(15, 23, 42, 0.8) 0%, rgba(30, 41, 59, 0.6) 100%)"
                    backdropFilter="blur(10px)"
                    border="1px solid"
                    borderColor="rgba(34, 197, 94, 0.3)"
                    borderRadius="12px"
                    color="#e2e8f0"
                    _placeholder={{ color: '#64748b' }}
                    _hover={{ borderColor: 'rgba(255, 215, 0, 0.4)' }}
                    _focus={{ 
                      borderColor: 'rgba(255, 215, 0, 0.6)', 
                      boxShadow: '0 0 20px rgba(255, 215, 0, 0.1)' 
                    }}
                  />
                </Box>

                <Box>
                  <Text mb={3} fontWeight="600" color="#e2e8f0">
                    Пароль
                  </Text>
                  <Box position="relative">
                    <Input
                      type={showPassword ? 'text' : 'password'}
                      value={credentials.password}
                      onChange={(e) => setCredentials({ ...credentials, password: e.target.value })}
                      placeholder="Введите пароль"
                      bg="linear-gradient(135deg, rgba(15, 23, 42, 0.8) 0%, rgba(30, 41, 59, 0.6) 100%)"
                      backdropFilter="blur(10px)"
                      border="1px solid"
                      borderColor="rgba(34, 197, 94, 0.3)"
                      borderRadius="12px"
                      color="#e2e8f0"
                      _placeholder={{ color: '#64748b' }}
                      _hover={{ borderColor: 'rgba(255, 215, 0, 0.4)' }}
                      _focus={{ 
                        borderColor: 'rgba(255, 215, 0, 0.6)', 
                        boxShadow: '0 0 20px rgba(255, 215, 0, 0.1)' 
                      }}
                      pr="3rem"
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      position="absolute"
                      right={2}
                      top="50%"
                      transform="translateY(-50%)"
                      onClick={() => setShowPassword(!showPassword)}
                      color="#94a3b8"
                      _hover={{ color: '#ffd700' }}
                    >
                      {showPassword ? <FaEyeSlash /> : <FaEye />}
                    </Button>
                  </Box>
                </Box>

                <Button
                  type="submit"
                  size="lg"
                  w="full"
                  disabled={loading}
                  mt={4}
                  bg="linear-gradient(135deg, rgba(34, 197, 94, 0.8) 0%, rgba(22, 163, 74, 0.6) 100%)"
                  border="1px solid"
                  borderColor="rgba(34, 197, 94, 0.4)"
                  borderRadius="16px"
                  boxShadow="0 4px 20px rgba(0, 0, 0, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.1)"
                  backdropFilter="blur(10px)"
                  color="#e2e8f0"
                  fontWeight="600"
                  fontSize="1.1rem"
                  letterSpacing="0.5px"
                  transition="all 0.3s ease"
                  _hover={{
                    borderColor: 'rgba(255, 215, 0, 0.6)',
                    bg: 'linear-gradient(135deg, rgba(22, 163, 74, 0.9) 0%, rgba(21, 128, 61, 0.8) 100%)',
                    color: '#ffd700',
                    transform: 'translateY(-2px)',
                    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3), 0 0 20px rgba(255, 215, 0, 0.1)'
                  }}
                  _disabled={{
                    opacity: 0.6,
                    cursor: 'not-allowed',
                    _hover: {}
                  }}
                >
                  {loading ? 'ВХОД...' : 'ВОЙТИ'}
                </Button>
              </VStack>
            </form>
          </Box>

          {/* Divider */}
          <Flex align="center" w="full">
            <Box flex="1" height="1px" bg="rgba(100, 116, 139, 0.3)" />
            <Text px={4} color="#94a3b8" fontSize="sm" fontWeight="500">
              или
            </Text>
            <Box flex="1" height="1px" bg="rgba(100, 116, 139, 0.3)" />
          </Flex>

          {/* Social Login */}
          <VStack gap={4} w="full">
            <Button
              onClick={handleTelegramLogin}
              size="lg"
              w="full"
              disabled={loading}
              bg="linear-gradient(135deg, rgba(34, 139, 230, 0.8) 0%, rgba(29, 78, 216, 0.6) 100%)"
              border="1px solid"
              borderColor="rgba(34, 139, 230, 0.4)"
              borderRadius="16px"
              boxShadow="0 4px 20px rgba(0, 0, 0, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.1)"
              backdropFilter="blur(10px)"
              color="#e2e8f0"
              fontWeight="600"
              fontSize="1.1rem"
              letterSpacing="0.5px"
              transition="all 0.3s ease"
              _hover={{
                borderColor: 'rgba(255, 215, 0, 0.6)',
                bg: 'linear-gradient(135deg, rgba(29, 78, 216, 0.9) 0%, rgba(30, 64, 175, 0.8) 100%)',
                color: '#ffd700',
                transform: 'translateY(-2px)',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3), 0 0 20px rgba(255, 215, 0, 0.1)'
              }}
              _disabled={{
                opacity: 0.6,
                cursor: 'not-allowed',
                _hover: {}
              }}
            >
              <FaTelegram style={{ marginRight: 12 }} size={20} />
              {loading ? 'ВХОД...' : 'ВОЙТИ ЧЕРЕЗ TELEGRAM'}
            </Button>

            <HStack gap={3} w="full">
              <Button
                onClick={handleGoogleLogin}
                size="md"
                flex={1}
                disabled={loading}
                bg="linear-gradient(135deg, rgba(239, 68, 68, 0.8) 0%, rgba(220, 38, 38, 0.6) 100%)"
                border="1px solid"
                borderColor="rgba(239, 68, 68, 0.4)"
                borderRadius="12px"
                boxShadow="0 4px 20px rgba(0, 0, 0, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.1)"
                backdropFilter="blur(10px)"
                color="#e2e8f0"
                fontWeight="600"
                transition="all 0.3s ease"
                _hover={{
                  borderColor: 'rgba(255, 215, 0, 0.6)',
                  bg: 'linear-gradient(135deg, rgba(220, 38, 38, 0.9) 0%, rgba(185, 28, 28, 0.8) 100%)',
                  color: '#ffd700',
                  transform: 'translateY(-2px)',
                  boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3), 0 0 20px rgba(255, 215, 0, 0.1)'
                }}
                _disabled={{
                  opacity: 0.6,
                  cursor: 'not-allowed',
                  _hover: {}
                }}
              >
                <FaGoogle style={{ marginRight: 8 }} /> Google
              </Button>
              <Button
                onClick={handleVKLogin}
                size="md"
                flex={1}
                disabled={loading}
                bg="linear-gradient(135deg, rgba(79, 172, 254, 0.8) 0%, rgba(37, 99, 235, 0.6) 100%)"
                border="1px solid"
                borderColor="rgba(79, 172, 254, 0.4)"
                borderRadius="12px"
                boxShadow="0 4px 20px rgba(0, 0, 0, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.1)"
                backdropFilter="blur(10px)"
                color="#e2e8f0"
                fontWeight="600"
                transition="all 0.3s ease"
                _hover={{
                  borderColor: 'rgba(255, 215, 0, 0.6)',
                  bg: 'linear-gradient(135deg, rgba(37, 99, 235, 0.9) 0%, rgba(30, 64, 175, 0.8) 100%)',
                  color: '#ffd700',
                  transform: 'translateY(-2px)',
                  boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3), 0 0 20px rgba(255, 215, 0, 0.1)'
                }}
                _disabled={{
                  opacity: 0.6,
                  cursor: 'not-allowed',
                  _hover: {}
                }}
              >
                <VKIcon />
                <span style={{ marginLeft: 8 }}>VK</span>
              </Button>
            </HStack>
          </VStack>

          {/* Register Link */}
          <VStack gap={2}>
            <Text textAlign="center" color="#94a3b8" fontSize="0.9rem">
              Нет аккаунта?{' '}
              <Link href="/auth/register">
                <Text 
                  as="span" 
                  color="#22c55e" 
                  fontWeight="600" 
                  transition="all 0.3s ease"
                  _hover={{ 
                    color: '#ffd700',
                    textDecoration: 'underline',
                    textShadow: '0 0 10px rgba(255, 215, 0, 0.5)'
                  }}
                >
                  Зарегистрироваться
                </Text>
              </Link>
            </Text>
            
            {/* Test Login Link */}
            <Text textAlign="center" color="#64748b" fontSize="0.8rem">
              Проблемы с входом?{' '}
              <Link href="/auth/test-login">
                <Text 
                  as="span" 
                  color="#f59e0b" 
                  fontWeight="500" 
                  transition="all 0.3s ease"
                  _hover={{ 
                    color: '#ffd700',
                    textDecoration: 'underline'
                  }}
                >
                  Тестовый вход
                </Text>
              </Link>
            </Text>
          </VStack>
        </VStack>
      </Box>
    </Box>
  );
}
