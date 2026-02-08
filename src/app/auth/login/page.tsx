"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Box, Button, Input, VStack, Text, Alert, Flex, HStack } from '@chakra-ui/react';
import { FaEye, FaEyeSlash, FaTelegram, FaVk } from 'react-icons/fa';
import Link from 'next/link';
import { isVKMiniApp, loginWithVKMiniApp } from '@/lib/auth/vk-bridge';
import VKAutoAuth from '@/components/VKAutoAuth';

export default function LoginPage() {
  const [credentials, setCredentials] = useState({ 
    identifier: '',
    password: '' 
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem('auth_token');
    if (token) {
      router.push('/');
    }
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

        setTimeout(() => {
          window.location.href = '/';
        }, 500);
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

          setTimeout(() => {
            window.location.href = '/';
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
          window.location.href = '/';
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
    <>
      <VKAutoAuth />
      <Box 
        minH="100vh"
        display="flex"
        alignItems="center"
        justifyContent="center"
        bg="#0f172a"
        p={4}
      >
        <Box 
          w="full"
          maxW="420px"
          bg="rgba(15, 23, 42, 0.9)"
          backdropFilter="blur(20px)"
          border="1px solid rgba(255, 215, 0, 0.2)"
          borderRadius="20px"
          p={8}
          boxShadow="0 20px 60px rgba(0, 0, 0, 0.5)"
        >
          <VStack gap={6}>
            {/* Header */}
            <VStack gap={2}>
              <Text 
                fontSize="3xl" 
                fontWeight="900" 
                color="#ffd700"
                letterSpacing="2px"
              >
                P.I.D.R.
              </Text>
              <Text color="#94a3b8" fontSize="md">
                Вход в аккаунт
              </Text>
            </VStack>

            {/* Error */}
            {error && (
              <Alert.Root status="error" w="full" borderRadius="12px">
                <Alert.Content 
                  p={3} 
                  bg="rgba(239, 68, 68, 0.1)" 
                  border="1px solid rgba(239, 68, 68, 0.3)" 
                  color="#fca5a5"
                  borderRadius="12px"
                >
                  {error}
                </Alert.Content>
              </Alert.Root>
            )}

            {/* Login Form */}
            <Box w="full">
              <form onSubmit={handleLogin}>
                <VStack gap={4}>
                  <Box w="full">
                    <Text mb={2} color="#e2e8f0" fontSize="sm" fontWeight="500">
                      Логин, Email или Телефон
                    </Text>
                    <Input
                      type="text"
                      value={credentials.identifier}
                      onChange={(e) => setCredentials({ ...credentials, identifier: e.target.value })}
                      placeholder="Введите логин, email или телефон"
                      bg="rgba(30, 41, 59, 0.5)"
                      border="1px solid rgba(255, 215, 0, 0.2)"
                      borderRadius="12px"
                      color="#ffffff"
                      h="48px"
                      _placeholder={{ color: '#64748b' }}
                      _hover={{ borderColor: 'rgba(255, 215, 0, 0.4)' }}
                      _focus={{ 
                        borderColor: 'rgba(255, 215, 0, 0.6)',
                        boxShadow: '0 0 0 3px rgba(255, 215, 0, 0.1)'
                      }}
                    />
                  </Box>

                  <Box w="full">
                    <Text mb={2} color="#e2e8f0" fontSize="sm" fontWeight="500">
                      Пароль
                    </Text>
                    <Box position="relative">
                      <Input
                        type={showPassword ? 'text' : 'password'}
                        value={credentials.password}
                        onChange={(e) => setCredentials({ ...credentials, password: e.target.value })}
                        placeholder="Введите пароль"
                        bg="rgba(30, 41, 59, 0.5)"
                        border="1px solid rgba(255, 215, 0, 0.2)"
                        borderRadius="12px"
                        color="#ffffff"
                        h="48px"
                        pr="3.5rem"
                        _placeholder={{ color: '#64748b' }}
                        _hover={{ borderColor: 'rgba(255, 215, 0, 0.4)' }}
                        _focus={{ 
                          borderColor: 'rgba(255, 215, 0, 0.6)',
                          boxShadow: '0 0 0 3px rgba(255, 215, 0, 0.1)'
                        }}
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
                        {showPassword ? <FaEyeSlash size={18} /> : <FaEye size={18} />}
                      </Button>
                    </Box>
                  </Box>

                  <Button
                    type="submit"
                    w="full"
                    h="50px"
                    bg="#ffd700"
                    color="#0f172a"
                    fontWeight="700"
                    fontSize="md"
                    borderRadius="12px"
                    disabled={loading}
                    _hover={{ bg: '#ffed4e', transform: 'translateY(-2px)' }}
                    _active={{ transform: 'translateY(0)' }}
                    _disabled={{ opacity: 0.6, cursor: 'not-allowed' }}
                  >
                    {loading ? 'Вход...' : 'Войти'}
                  </Button>
                </VStack>
              </form>
            </Box>

            {/* Divider */}
            <Flex align="center" w="full" gap={3}>
              <Box flex="1" h="1px" bg="rgba(255, 215, 0, 0.2)" />
              <Text color="#64748b" fontSize="sm">или</Text>
              <Box flex="1" h="1px" bg="rgba(255, 215, 0, 0.2)" />
            </Flex>

            {/* Social Buttons */}
            <VStack gap={3} w="full">
              <Button
                onClick={handleTelegramLogin}
                w="full"
                h="50px"
                bg="rgba(0, 136, 204, 0.2)"
                border="1px solid rgba(0, 136, 204, 0.4)"
                color="#ffffff"
                fontWeight="600"
                borderRadius="12px"
                disabled={loading}
                _hover={{ 
                  bg: 'rgba(0, 136, 204, 0.3)',
                  borderColor: 'rgba(0, 136, 204, 0.6)'
                }}
                _disabled={{ opacity: 0.5 }}
              >
                <FaTelegram style={{ marginRight: 10 }} size={18} />
                Telegram
              </Button>

              <Button
                onClick={handleVKLogin}
                w="full"
                h="50px"
                bg={isVKMiniApp() ? "rgba(74, 118, 168, 0.2)" : "rgba(74, 118, 168, 0.1)"}
                border="1px solid"
                borderColor={isVKMiniApp() ? "rgba(74, 118, 168, 0.4)" : "rgba(74, 118, 168, 0.2)"}
                color="#ffffff"
                fontWeight="600"
                borderRadius="12px"
                disabled={loading || !isVKMiniApp()}
                _hover={isVKMiniApp() ? { 
                  bg: 'rgba(74, 118, 168, 0.3)',
                  borderColor: 'rgba(74, 118, 168, 0.6)'
                } : {}}
                _disabled={{ opacity: 0.3 }}
              >
                <FaVk style={{ marginRight: 10 }} size={18} />
                VKontakte
              </Button>
            </VStack>

            {/* Register Link */}
            <Text textAlign="center" color="#94a3b8" fontSize="sm">
              Нет аккаунта?{' '}
              <Link href="/auth/register">
                <Text 
                  as="span" 
                  color="#ffd700" 
                  fontWeight="600"
                  _hover={{ textDecoration: 'underline' }}
                >
                  Зарегистрироваться
                </Text>
              </Link>
            </Text>
          </VStack>
        </Box>
      </Box>
    </>
  );
}
