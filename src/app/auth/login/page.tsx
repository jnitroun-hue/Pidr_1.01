"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Box, Button, Input, VStack, Text, Alert, Flex, HStack } from '@chakra-ui/react';
import { FaEye, FaEyeSlash, FaTelegram, FaVk, FaUser } from 'react-icons/fa';
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

  const handleVKLogin = async () => {
    if (!isVKMiniApp()) {
      showToast('Недоступно', 'Вход через VK доступен только в VK Mini App', 'warning');
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
        
        showToast('Успешно!', `Добро пожаловать, ${result.user.username}!`, 'success');

        setTimeout(() => {
          if (typeof window !== 'undefined') {
            window.location.href = '/';
          } else {
            router.push('/');
          }
        }, 1500);
      } else {
        setError(result.message || 'Ошибка входа через VK');
      }
    } catch (err) {
      setError('Ошибка сети. Попробуйте позже.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <VKAutoAuth />
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
          background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 30%, #0f172a 60%, #064e3b 100%)',
        }}
      >
        <Box 
          maxW="480px" 
          w="full" 
          bg="rgba(15, 23, 42, 0.95)"
          backdropFilter="blur(20px)"
          border="1px solid"
          borderColor="rgba(34, 197, 94, 0.3)"
          borderRadius="24px" 
          boxShadow="0 20px 60px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.1)"
          p={10}
          position="relative"
          zIndex={2}
        >
          <VStack gap={8}>
            {/* Header */}
            <Box textAlign="center" w="full">
              <Text 
                fontSize="3xl" 
                fontWeight="900" 
                color="#ffd700" 
                mb={2}
                letterSpacing="3px"
                textShadow="0 0 30px rgba(255, 215, 0, 0.5)"
              >
                P.I.D.R.
              </Text>
              <Text color="#e2e8f0" fontSize="xl" fontWeight="500">
                Войдите в свой аккаунт
              </Text>
            </Box>

            {/* Error Alert */}
            {error && (
              <Alert.Root status="error" w="full">
                <Alert.Content borderRadius="md" p={4} bg="rgba(239, 68, 68, 0.1)" border="1px solid rgba(239, 68, 68, 0.3)" color="#ef4444">
                  ❌ {error}
                </Alert.Content>
              </Alert.Root>
            )}

            {/* Login Form */}
            <Box w="full">
              <form onSubmit={handleLogin}>
                <VStack gap={5}>
                  <Box w="full">
                    <HStack mb={3}>
                      <FaUser color="#94a3b8" size={16} />
                      <Text fontWeight="600" color="#e2e8f0" fontSize="sm">
                        Логин, Email или Телефон
                      </Text>
                    </HStack>
                    <Input
                      type="text"
                      value={credentials.identifier}
                      onChange={(e) => setCredentials({ ...credentials, identifier: e.target.value })}
                      placeholder="username, email@example.com или +1234567890"
                      bg="rgba(15, 23, 42, 0.8)"
                      border="1px solid"
                      borderColor="rgba(34, 197, 94, 0.3)"
                      borderRadius="14px"
                      color="#e2e8f0"
                      h="50px"
                      fontSize="md"
                      _placeholder={{ color: '#64748b' }}
                      _hover={{ borderColor: 'rgba(255, 215, 0, 0.5)' }}
                      _focus={{ borderColor: 'rgba(255, 215, 0, 0.7)', boxShadow: '0 0 20px rgba(255, 215, 0, 0.2)' }}
                    />
                  </Box>

                  <Box w="full">
                    <Text mb={3} fontWeight="600" color="#e2e8f0" fontSize="sm">
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
                        borderRadius="14px"
                        color="#e2e8f0"
                        h="50px"
                        fontSize="md"
                        _placeholder={{ color: '#64748b' }}
                        _hover={{ borderColor: 'rgba(255, 215, 0, 0.5)' }}
                        _focus={{ borderColor: 'rgba(255, 215, 0, 0.7)', boxShadow: '0 0 20px rgba(255, 215, 0, 0.2)' }}
                        pr="3.5rem"
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
                        _hover={{ color: '#ffd700', bg: 'rgba(255, 215, 0, 0.1)' }}
                      >
                        {showPassword ? <FaEyeSlash size={18} /> : <FaEye size={18} />}
                      </Button>
                    </Box>
                  </Box>

                  <Button
                    type="submit"
                    size="lg"
                    w="full"
                    disabled={loading}
                    h="56px"
                    bg="linear-gradient(135deg, rgba(34, 197, 94, 0.9) 0%, rgba(22, 163, 74, 0.8) 100%)"
                    border="1px solid"
                    borderColor="rgba(34, 197, 94, 0.5)"
                    borderRadius="16px"
                    color="#ffffff"
                    fontWeight="700"
                    fontSize="1.1rem"
                    letterSpacing="0.5px"
                    boxShadow="0 8px 24px rgba(34, 197, 94, 0.3)"
                    transition="all 0.3s ease"
                    _hover={{
                      borderColor: 'rgba(255, 215, 0, 0.7)',
                      bg: 'linear-gradient(135deg, rgba(22, 163, 74, 1) 0%, rgba(21, 128, 61, 0.9) 100%)',
                      transform: 'translateY(-2px)',
                      boxShadow: '0 12px 32px rgba(34, 197, 94, 0.4)'
                    }}
                    _disabled={{ opacity: 0.6, cursor: 'not-allowed', transform: 'none' }}
                  >
                    {loading ? 'ВХОД...' : 'ВОЙТИ'}
                  </Button>
                </VStack>
              </form>
            </Box>

            {/* Divider */}
            <Flex align="center" w="full">
              <Box flex="1" height="1px" bg="rgba(100, 116, 139, 0.3)" />
              <Text px={4} color="#94a3b8" fontSize="sm" fontWeight="600">
                или
              </Text>
              <Box flex="1" height="1px" bg="rgba(100, 116, 139, 0.3)" />
            </Flex>

            {/* Social Login Buttons */}
            <VStack gap={4} w="full">
              <Button
                onClick={handleTelegramLogin}
                size="lg"
                w="full"
                disabled={loading}
                h="56px"
                bg="linear-gradient(135deg, rgba(34, 139, 230, 0.9) 0%, rgba(29, 78, 216, 0.8) 100%)"
                border="1px solid"
                borderColor="rgba(34, 139, 230, 0.5)"
                borderRadius="16px"
                color="#ffffff"
                fontWeight="700"
                fontSize="1rem"
                letterSpacing="0.5px"
                boxShadow="0 8px 24px rgba(34, 139, 230, 0.3)"
                transition="all 0.3s ease"
                _hover={{
                  borderColor: 'rgba(255, 215, 0, 0.7)',
                  bg: 'linear-gradient(135deg, rgba(29, 78, 216, 1) 0%, rgba(30, 64, 175, 0.9) 100%)',
                  transform: 'translateY(-2px)',
                  boxShadow: '0 12px 32px rgba(34, 139, 230, 0.4)'
                }}
                _disabled={{ opacity: 0.6, cursor: 'not-allowed', transform: 'none' }}
              >
                <FaTelegram style={{ marginRight: 12 }} size={22} />
                ВОЙТИ ЧЕРЕЗ TELEGRAM
              </Button>

              <Button
                onClick={handleVKLogin}
                size="lg"
                w="full"
                disabled={loading || !isVKMiniApp()}
                h="56px"
                bg={isVKMiniApp() ? "linear-gradient(135deg, rgba(74, 118, 168, 0.9) 0%, rgba(59, 89, 152, 0.8) 100%)" : "rgba(74, 118, 168, 0.3)"}
                border="1px solid"
                borderColor={isVKMiniApp() ? "rgba(74, 118, 168, 0.5)" : "rgba(74, 118, 168, 0.2)"}
                borderRadius="16px"
                color="#ffffff"
                fontWeight="700"
                fontSize="1rem"
                letterSpacing="0.5px"
                boxShadow={isVKMiniApp() ? "0 8px 24px rgba(74, 118, 168, 0.3)" : "none"}
                transition="all 0.3s ease"
                _hover={isVKMiniApp() ? {
                  borderColor: 'rgba(255, 215, 0, 0.7)',
                  bg: 'linear-gradient(135deg, rgba(59, 89, 152, 1) 0%, rgba(49, 79, 132, 0.9) 100%)',
                  transform: 'translateY(-2px)',
                  boxShadow: '0 12px 32px rgba(74, 118, 168, 0.4)'
                } : {}}
                _disabled={{ opacity: 0.5, cursor: 'not-allowed', transform: 'none' }}
              >
                <FaVk style={{ marginRight: 12 }} size={22} />
                ВОЙТИ ЧЕРЕЗ VK
                {!isVKMiniApp() && (
                  <Text as="span" ml={2} fontSize="xs" opacity={0.7}>
                    (только в VK Mini App)
                  </Text>
                )}
              </Button>
            </VStack>

            {/* Register Link */}
            <VStack gap={2} w="full">
              <Text textAlign="center" color="#94a3b8" fontSize="0.95rem">
                Нет аккаунта?{' '}
                <Link href="/auth/register">
                  <Text 
                    as="span" 
                    color="#22c55e" 
                    fontWeight="700" 
                    transition="all 0.3s ease"
                    _hover={{ color: '#ffd700', textDecoration: 'underline', textShadow: '0 0 10px rgba(255, 215, 0, 0.5)' }}
                  >
                    Зарегистрироваться
                  </Text>
                </Link>
              </Text>
            </VStack>
          </VStack>
        </Box>
      </Box>
    </>
  );
}
