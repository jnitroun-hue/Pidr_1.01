"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Box, Button, Input, VStack, Text, Alert, Flex } from '@chakra-ui/react';
import { FaEye, FaEyeSlash, FaTelegram } from 'react-icons/fa';
import Link from 'next/link';

export default function LoginPage() {
  const [credentials, setCredentials] = useState({ 
    identifier: '',
    password: '' 
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const showToast = (title: string, description: string, type: 'success' | 'error' | 'warning' | 'info') => {
    alert(`${title}: ${description}`);
  };

  useEffect(() => {
    const token = localStorage.getItem('auth_token');
    if (token) {
      router.push('/');
    }
  }, [router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!credentials.identifier || !credentials.password) {
      setError('Пожалуйста, заполните все поля');
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
        body: JSON.stringify(loginData)
      });

      const data = await response.json();

      if (data.success) {
        localStorage.setItem('auth_token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        localStorage.setItem('current_user', JSON.stringify(data.user));
        
        window.dispatchEvent(new CustomEvent('coinsUpdated', { 
          detail: { coins: data.user.coins } 
        }));
        
        showToast('Успешно!', `Добро пожаловать, ${data.user.username}!`, 'success');

        setTimeout(() => {
          if (typeof window !== 'undefined') {
            window.location.href = '/';
          } else {
            router.push('/');
          }
        }, 1500);
      } else {
        setError(data.message || 'Ошибка входа');
      }
    } catch (err) {
      setError('Ошибка сети. Попробуйте позже.');
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
          localStorage.setItem('auth_token', data.token);
          localStorage.setItem('user', JSON.stringify(data.user));
          localStorage.setItem('current_user', JSON.stringify(data.user));
          
          window.dispatchEvent(new CustomEvent('coinsUpdated', { 
            detail: { coins: data.user.coins } 
          }));
          
          showToast('Успешно!', `Добро пожаловать, ${data.user.username}!`, 'success');

          setTimeout(() => {
            if (typeof window !== 'undefined') {
              window.location.href = '/';
            } else {
              router.push('/');
            }
          }, 1500);
        } else {
          setError(data.message || 'Ошибка входа через Telegram');
        }
      } catch (err) {
        setError('Ошибка сети. Попробуйте позже.');
      } finally {
        setLoading(false);
      }
    } else {
      showToast('Недоступно', 'Вход через Telegram доступен только в WebApp', 'warning');
    }
  };

  return (
    <Box 
      minH="100vh" 
      minW="100vw"
      bg="#0f172a"
      display="flex" 
      alignItems="center" 
      justifyContent="center" 
      p={4}
      position="relative"
      overflow="hidden"
      style={{
        background: '#0f172a',
        backgroundImage: 'linear-gradient(135deg, #0f172a 0%, #1e293b 30%, #0f172a 60%, #064e3b 100%)'
      }}
    >
      <Box 
        maxW="450px" 
        w="full" 
        bg="rgba(15, 23, 42, 0.95)"
        backdropFilter="blur(20px)"
        border="1px solid"
        borderColor="rgba(34, 197, 94, 0.3)"
        borderRadius="20px" 
        boxShadow="0 12px 48px rgba(0, 0, 0, 0.4)"
        p={8}
        position="relative"
        zIndex={2}
      >
        <VStack gap={6}>
          <Box textAlign="center">
            <Text 
              fontSize="2xl" 
              fontWeight="800" 
              color="#ffd700" 
              mb={2}
              letterSpacing="2px"
            >
              P.I.D.R.
            </Text>
            <Text color="#e2e8f0" fontSize="lg" mb={4}>
              Войдите в свой аккаунт
            </Text>
          </Box>

          {error && (
            <Alert.Root status="error">
              <Alert.Content borderRadius="md" p={3} bg="red.100" color="red.800">
                ❌ {error}
              </Alert.Content>
            </Alert.Root>
          )}

          <Box w="full">
            <form onSubmit={handleLogin}>
              <VStack gap={4}>
                <Box w="full">
                  <Text mb={3} fontWeight="600" color="#e2e8f0">
                    Логин, Email или Телефон
                  </Text>
                  <Input
                    type="text"
                    value={credentials.identifier}
                    onChange={(e) => setCredentials({ ...credentials, identifier: e.target.value })}
                    placeholder="username, email@example.com или +1234567890"
                    bg="rgba(15, 23, 42, 0.8)"
                    border="1px solid"
                    borderColor="rgba(34, 197, 94, 0.3)"
                    borderRadius="12px"
                    color="#e2e8f0"
                    _placeholder={{ color: '#64748b' }}
                    _hover={{ borderColor: 'rgba(255, 215, 0, 0.4)' }}
                    _focus={{ borderColor: 'rgba(255, 215, 0, 0.6)' }}
                  />
                </Box>

                <Box w="full">
                  <Text mb={3} fontWeight="600" color="#e2e8f0">
                    Пароль
                  </Text>
                  <Box position="relative">
                    <Input
                      type={showPassword ? 'text' : 'password'}
                      value={credentials.password}
                      onChange={(e) => setCredentials({ ...credentials, password: e.target.value })}
                      placeholder="Введите пароль"
                      bg="rgba(15, 23, 42, 0.8)"
                      border="1px solid"
                      borderColor="rgba(34, 197, 94, 0.3)"
                      borderRadius="12px"
                      color="#e2e8f0"
                      _placeholder={{ color: '#64748b' }}
                      _hover={{ borderColor: 'rgba(255, 215, 0, 0.4)' }}
                      _focus={{ borderColor: 'rgba(255, 215, 0, 0.6)' }}
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
                  bg="rgba(34, 197, 94, 0.8)"
                  border="1px solid"
                  borderColor="rgba(34, 197, 94, 0.4)"
                  borderRadius="16px"
                  color="#e2e8f0"
                  fontWeight="600"
                  fontSize="1.1rem"
                  _hover={{
                    bg: 'rgba(22, 163, 74, 0.9)',
                    color: '#ffd700',
                    transform: 'translateY(-2px)'
                  }}
                  _disabled={{ opacity: 0.6, cursor: 'not-allowed' }}
                >
                  {loading ? 'ВХОД...' : 'ВОЙТИ'}
                </Button>
              </VStack>
            </form>
          </Box>

          <Flex align="center" w="full">
            <Box flex="1" height="1px" bg="rgba(100, 116, 139, 0.3)" />
            <Text px={4} color="#94a3b8" fontSize="sm" fontWeight="500">
              или
            </Text>
            <Box flex="1" height="1px" bg="rgba(100, 116, 139, 0.3)" />
          </Flex>

          <VStack gap={4} w="full">
            <Button
              onClick={handleTelegramLogin}
              size="lg"
              w="full"
              disabled={loading}
              bg="rgba(34, 139, 230, 0.8)"
              border="1px solid"
              borderColor="rgba(34, 139, 230, 0.4)"
              borderRadius="16px"
              color="#e2e8f0"
              fontWeight="600"
              fontSize="1.1rem"
              _hover={{
                bg: 'rgba(29, 78, 216, 0.9)',
                color: '#ffd700',
                transform: 'translateY(-2px)'
              }}
              _disabled={{ opacity: 0.6, cursor: 'not-allowed' }}
            >
              <FaTelegram style={{ marginRight: 12 }} size={20} />
              {loading ? 'ВХОД...' : 'ВОЙТИ ЧЕРЕЗ TELEGRAM'}
            </Button>
          </VStack>

          <VStack gap={2}>
            <Text textAlign="center" color="#94a3b8" fontSize="0.9rem">
              Нет аккаунта?{' '}
              <Link href="/auth/register">
                <Text 
                  as="span" 
                  color="#22c55e" 
                  fontWeight="600" 
                  _hover={{ color: '#ffd700', textDecoration: 'underline' }}
                >
                  Зарегистрироваться
                </Text>
              </Link>
            </Text>
          </VStack>
        </VStack>
      </Box>
    </Box>
  );
}
