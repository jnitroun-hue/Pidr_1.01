"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Box, Button, Input, VStack, Text, Alert, Flex, HStack } from '@chakra-ui/react';
import { FaEye, FaEyeSlash, FaTelegram, FaVk, FaUser, FaLock } from 'react-icons/fa';
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
        position="relative"
        overflow="hidden"
        display="flex"
        alignItems="center"
        justifyContent="center"
        p={4}
        style={{
          background: 'linear-gradient(135deg, #0a0a1a 0%, #1a1a2e 25%, #16213e 50%, #0f172a 75%, #0a0a1a 100%)',
          backgroundSize: '400% 400%',
          animation: 'gradientShift 15s ease infinite',
        }}
      >
        <style jsx>{`
          @keyframes gradientShift {
            0% { background-position: 0% 50%; }
            50% { background-position: 100% 50%; }
            100% { background-position: 0% 50%; }
          }
          @keyframes float {
            0%, 100% { transform: translateY(0px); }
            50% { transform: translateY(-20px); }
          }
          @keyframes glow {
            0%, 100% { box-shadow: 0 0 20px rgba(255, 215, 0, 0.3), 0 0 40px rgba(255, 215, 0, 0.2); }
            50% { box-shadow: 0 0 30px rgba(255, 215, 0, 0.5), 0 0 60px rgba(255, 215, 0, 0.3); }
          }
        `}</style>
        
        {/* Animated Background Elements */}
        <Box
          position="absolute"
          top="-50%"
          left="-50%"
          width="200%"
          height="200%"
          style={{
            background: 'radial-gradient(circle at 20% 30%, rgba(255, 215, 0, 0.1) 0%, transparent 50%), radial-gradient(circle at 80% 70%, rgba(34, 197, 94, 0.08) 0%, transparent 50%), radial-gradient(circle at 50% 50%, rgba(59, 130, 246, 0.06) 0%, transparent 50%)',
            animation: 'float 20s ease-in-out infinite',
            pointerEvents: 'none',
          }}
        />

        <Box 
          maxW="520px" 
          w="full" 
          position="relative"
          zIndex={10}
        >
          {/* Main Card */}
          <Box
            bg="rgba(15, 23, 42, 0.85)"
            backdropFilter="blur(30px)"
            border="2px solid"
            borderColor="rgba(255, 215, 0, 0.2)"
            borderRadius="32px"
            boxShadow="0 25px 80px rgba(0, 0, 0, 0.6), inset 0 1px 0 rgba(255, 255, 255, 0.1), 0 0 0 1px rgba(255, 215, 0, 0.1)"
            p={12}
            style={{
              animation: 'glow 3s ease-in-out infinite',
            }}
          >
            <VStack gap={8}>
              {/* Header */}
              <VStack gap={3} textAlign="center">
                <Text 
                  fontSize="4xl" 
                  fontWeight="900" 
                  background="linear-gradient(135deg, #ffd700 0%, #ffed4e 50%, #ffd700 100%)"
                  style={{
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                    textShadow: 'none',
                    letterSpacing: '4px',
                  }}
                >
                  P.I.D.R.
                </Text>
                <Text 
                  color="#cbd5e1" 
                  fontSize="lg" 
                  fontWeight="500"
                  letterSpacing="0.5px"
                >
                  Добро пожаловать обратно
                </Text>
              </VStack>

              {/* Error Alert */}
              {error && (
                <Alert.Root status="error" w="full" borderRadius="16px">
                  <Alert.Content 
                    borderRadius="16px" 
                    p={4} 
                    bg="rgba(239, 68, 68, 0.15)" 
                    border="1px solid rgba(239, 68, 68, 0.4)" 
                    color="#fca5a5"
                    backdropFilter="blur(10px)"
                  >
                    <Text fontWeight="600">❌ {error}</Text>
                  </Alert.Content>
                </Alert.Root>
              )}

              {/* Login Form */}
              <Box w="full">
                <form onSubmit={handleLogin}>
                  <VStack gap={6}>
                    {/* Identifier Input */}
                    <Box w="full">
                      <HStack mb={3} gap={2}>
                        <Box
                          p={2}
                          borderRadius="10px"
                          bg="rgba(255, 215, 0, 0.1)"
                          border="1px solid rgba(255, 215, 0, 0.2)"
                        >
                          <FaUser color="#ffd700" size={14} />
                        </Box>
                        <Text fontWeight="600" color="#e2e8f0" fontSize="sm" letterSpacing="0.5px">
                          Логин, Email или Телефон
                        </Text>
                      </HStack>
                      <Input
                        type="text"
                        value={credentials.identifier}
                        onChange={(e) => setCredentials({ ...credentials, identifier: e.target.value })}
                        placeholder="username, email@example.com или +1234567890"
                        bg="rgba(15, 23, 42, 0.6)"
                        border="2px solid"
                        borderColor="rgba(255, 215, 0, 0.2)"
                        borderRadius="16px"
                        color="#ffffff"
                        h="56px"
                        fontSize="md"
                        px={5}
                        transition="all 0.3s ease"
                        _placeholder={{ color: '#64748b' }}
                        _hover={{ 
                          borderColor: 'rgba(255, 215, 0, 0.4)',
                          bg: 'rgba(15, 23, 42, 0.8)',
                        }}
                        _focus={{ 
                          borderColor: 'rgba(255, 215, 0, 0.6)',
                          bg: 'rgba(15, 23, 42, 0.9)',
                          boxShadow: '0 0 0 4px rgba(255, 215, 0, 0.1), 0 0 20px rgba(255, 215, 0, 0.2)',
                        }}
                      />
                    </Box>

                    {/* Password Input */}
                    <Box w="full">
                      <HStack mb={3} gap={2}>
                        <Box
                          p={2}
                          borderRadius="10px"
                          bg="rgba(255, 215, 0, 0.1)"
                          border="1px solid rgba(255, 215, 0, 0.2)"
                        >
                          <FaLock color="#ffd700" size={14} />
                        </Box>
                        <Text fontWeight="600" color="#e2e8f0" fontSize="sm" letterSpacing="0.5px">
                          Пароль
                        </Text>
                      </HStack>
                      <Box position="relative">
                        <Input
                          type={showPassword ? 'text' : 'password'}
                          value={credentials.password}
                          onChange={(e) => setCredentials({ ...credentials, password: e.target.value })}
                          placeholder="Введите пароль"
                          bg="rgba(15, 23, 42, 0.6)"
                          border="2px solid"
                          borderColor="rgba(255, 215, 0, 0.2)"
                          borderRadius="16px"
                          color="#ffffff"
                          h="56px"
                          fontSize="md"
                          px={5}
                          pr="4rem"
                          transition="all 0.3s ease"
                          _placeholder={{ color: '#64748b' }}
                          _hover={{ 
                            borderColor: 'rgba(255, 215, 0, 0.4)',
                            bg: 'rgba(15, 23, 42, 0.8)',
                          }}
                          _focus={{ 
                            borderColor: 'rgba(255, 215, 0, 0.6)',
                            bg: 'rgba(15, 23, 42, 0.9)',
                            boxShadow: '0 0 0 4px rgba(255, 215, 0, 0.1), 0 0 20px rgba(255, 215, 0, 0.2)',
                          }}
                        />
                        <Button
                          variant="ghost"
                          size="sm"
                          position="absolute"
                          right={3}
                          top="50%"
                          transform="translateY(-50%)"
                          onClick={() => setShowPassword(!showPassword)}
                          color="#94a3b8"
                          borderRadius="12px"
                          _hover={{ 
                            color: '#ffd700', 
                            bg: 'rgba(255, 215, 0, 0.15)',
                            transform: 'translateY(-50%) scale(1.1)',
                          }}
                          transition="all 0.2s ease"
                        >
                          {showPassword ? <FaEyeSlash size={18} /> : <FaEye size={18} />}
                        </Button>
                      </Box>
                    </Box>

                    {/* Submit Button */}
                    <Button
                      type="submit"
                      size="lg"
                      w="full"
                      disabled={loading}
                      h="60px"
                      bg="linear-gradient(135deg, #ffd700 0%, #ffed4e 50%, #ffd700 100%)"
                      backgroundSize="200% 200%"
                      border="2px solid"
                      borderColor="rgba(255, 215, 0, 0.5)"
                      borderRadius="18px"
                      color="#0f172a"
                      fontWeight="800"
                      fontSize="1.1rem"
                      letterSpacing="1px"
                      boxShadow="0 10px 30px rgba(255, 215, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.3)"
                      transition="all 0.3s ease"
                      style={{
                        animation: loading ? 'none' : 'gradientShift 3s ease infinite',
                      }}
                      _hover={{
                        transform: 'translateY(-3px)',
                        boxShadow: '0 15px 40px rgba(255, 215, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.4)',
                        borderColor: 'rgba(255, 215, 0, 0.8)',
                      }}
                      _active={{
                        transform: 'translateY(-1px)',
                      }}
                      _disabled={{ 
                        opacity: 0.6, 
                        cursor: 'not-allowed', 
                        transform: 'none',
                        animation: 'none',
                      }}
                    >
                      {loading ? 'ВХОД...' : 'ВОЙТИ'}
                    </Button>
                  </VStack>
                </form>
              </Box>

              {/* Divider */}
              <Flex align="center" w="full" gap={4}>
                <Box flex="1" height="2px" bg="linear-gradient(90deg, transparent, rgba(255, 215, 0, 0.3), transparent)" />
                <Text px={4} color="#94a3b8" fontSize="sm" fontWeight="600" letterSpacing="1px">
                  ИЛИ
                </Text>
                <Box flex="1" height="2px" bg="linear-gradient(90deg, transparent, rgba(255, 215, 0, 0.3), transparent)" />
              </Flex>

              {/* Social Login Buttons */}
              <VStack gap={4} w="full">
                <Button
                  onClick={handleTelegramLogin}
                  size="lg"
                  w="full"
                  disabled={loading}
                  h="60px"
                  bg="linear-gradient(135deg, #0088cc 0%, #0066aa 100%)"
                  border="2px solid"
                  borderColor="rgba(0, 136, 204, 0.5)"
                  borderRadius="18px"
                  color="#ffffff"
                  fontWeight="700"
                  fontSize="1rem"
                  letterSpacing="0.5px"
                  boxShadow="0 10px 30px rgba(0, 136, 204, 0.4)"
                  transition="all 0.3s ease"
                  _hover={{
                    transform: 'translateY(-3px)',
                    boxShadow: '0 15px 40px rgba(0, 136, 204, 0.5)',
                    borderColor: 'rgba(0, 136, 204, 0.8)',
                  }}
                  _disabled={{ opacity: 0.6, cursor: 'not-allowed', transform: 'none' }}
                >
                  <FaTelegram style={{ marginRight: 12 }} size={22} />
                  TELEGRAM
                </Button>

                <Button
                  onClick={handleVKLogin}
                  size="lg"
                  w="full"
                  disabled={loading || !isVKMiniApp()}
                  h="60px"
                  bg={isVKMiniApp() ? "linear-gradient(135deg, #4a76a8 0%, #3b5998 100%)" : "rgba(74, 118, 168, 0.2)"}
                  border="2px solid"
                  borderColor={isVKMiniApp() ? "rgba(74, 118, 168, 0.5)" : "rgba(74, 118, 168, 0.2)"}
                  borderRadius="18px"
                  color="#ffffff"
                  fontWeight="700"
                  fontSize="1rem"
                  letterSpacing="0.5px"
                  boxShadow={isVKMiniApp() ? "0 10px 30px rgba(74, 118, 168, 0.4)" : "none"}
                  transition="all 0.3s ease"
                  _hover={isVKMiniApp() ? {
                    transform: 'translateY(-3px)',
                    boxShadow: '0 15px 40px rgba(74, 118, 168, 0.5)',
                    borderColor: 'rgba(74, 118, 168, 0.8)',
                  } : {}}
                  _disabled={{ opacity: 0.5, cursor: 'not-allowed', transform: 'none' }}
                >
                  <FaVk style={{ marginRight: 12 }} size={22} />
                  VKONTAKTE
                  {!isVKMiniApp() && (
                    <Text as="span" ml={2} fontSize="xs" opacity={0.7}>
                      (VK Mini App)
                    </Text>
                  )}
                </Button>
              </VStack>

              {/* Register Link */}
              <Text textAlign="center" color="#94a3b8" fontSize="0.95rem">
                Нет аккаунта?{' '}
                <Link href="/auth/register">
                  <Text 
                    as="span" 
                    background="linear-gradient(135deg, #22c55e 0%, #16a34a 100%)"
                    style={{
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      backgroundClip: 'text',
                    }}
                    fontWeight="700" 
                    transition="all 0.3s ease"
                    _hover={{ 
                      textDecoration: 'underline',
                    }}
                  >
                    Зарегистрироваться
                  </Text>
                </Link>
              </Text>
            </VStack>
          </Box>
        </Box>
      </Box>
    </>
  );
}
