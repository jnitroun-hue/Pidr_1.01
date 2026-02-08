"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Box, Button, Input, VStack, Text, Alert, Flex, HStack } from '@chakra-ui/react';
import { FaEye, FaEyeSlash, FaTelegram, FaCheckCircle, FaVk } from 'react-icons/fa';
import Link from 'next/link';
import { isVKMiniApp, loginWithVKMiniApp } from '@/lib/auth/vk-bridge';
import VKAutoAuth from '@/components/VKAutoAuth';

interface FormData {
  username: string;
  email: string;
  phone: string;
  password: string;
  confirmPassword: string;
}

interface FormValidation {
  username: boolean;
  email: boolean;
  phone: boolean;
  password: boolean;
  confirmPassword: boolean;
}

export default function RegisterPage() {
  const [formData, setFormData] = useState<FormData>({
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
  const [validation, setValidation] = useState<FormValidation>({
    username: false,
    email: false,
    phone: true,
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
      email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email),
      phone: !formData.phone || /^\+?[1-9]\d{1,14}$/.test(formData.phone),
      password: formData.password.length >= 6,
      confirmPassword: formData.password === formData.confirmPassword && formData.confirmPassword.length > 0
    });
  }, [formData]);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validation.username || !validation.email || !validation.password || !validation.confirmPassword) {
      setError('Исправьте ошибки в форме');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const registerData: Record<string, string> = {
        username: formData.username,
        email: formData.email,
        password: formData.password
      };

      if (formData.phone) registerData.phone = formData.phone;

      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
          window.location.href = '/';
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
            window.location.href = '/';
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
          window.location.href = '/';
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

  const getInputBorderColor = (field: keyof FormValidation, hasValue: boolean) => {
    if (!hasValue) return 'rgba(255, 215, 0, 0.2)';
    return validation[field] ? 'rgba(34, 197, 94, 0.4)' : 'rgba(239, 68, 68, 0.4)';
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
          maxH="90vh"
          overflowY="auto"
        >
          <VStack gap={5}>
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
                Создание аккаунта
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

            {/* Registration Form */}
            <Box w="full">
              <form onSubmit={handleRegister}>
                <VStack gap={3}>
                  <Box w="full">
                    <HStack mb={2} gap={2}>
                      <Text color="#e2e8f0" fontSize="sm" fontWeight="500">
                        Логин
                      </Text>
                      {formData.username && (
                        validation.username ? 
                          <FaCheckCircle color="#22c55e" size={12} /> : 
                          <Text as="span" color="#ef4444" fontSize="xs">(3-32 символа)</Text>
                      )}
                    </HStack>
                    <Input
                      type="text"
                      value={formData.username}
                      onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                      placeholder="username123"
                      bg="rgba(30, 41, 59, 0.5)"
                      border="1px solid"
                      borderColor={getInputBorderColor('username', !!formData.username)}
                      borderRadius="12px"
                      color="#ffffff"
                      h="44px"
                      _placeholder={{ color: '#64748b' }}
                      _hover={{ borderColor: validation.username ? 'rgba(34, 197, 94, 0.6)' : 'rgba(239, 68, 68, 0.6)' }}
                      _focus={{ 
                        borderColor: validation.username ? 'rgba(34, 197, 94, 0.8)' : 'rgba(239, 68, 68, 0.8)',
                        boxShadow: validation.username ? '0 0 0 3px rgba(34, 197, 94, 0.1)' : '0 0 0 3px rgba(239, 68, 68, 0.1)'
                      }}
                    />
                  </Box>

                  <Box w="full">
                    <HStack mb={2} gap={2}>
                      <Text color="#e2e8f0" fontSize="sm" fontWeight="500">
                        Email
                      </Text>
                      {formData.email && (
                        validation.email ? 
                          <FaCheckCircle color="#22c55e" size={12} /> : 
                          <Text as="span" color="#ef4444" fontSize="xs">(неверный формат)</Text>
                      )}
                    </HStack>
                    <Input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="example@email.com"
                      bg="rgba(30, 41, 59, 0.5)"
                      border="1px solid"
                      borderColor={getInputBorderColor('email', !!formData.email)}
                      borderRadius="12px"
                      color="#ffffff"
                      h="44px"
                      _placeholder={{ color: '#64748b' }}
                      _hover={{ borderColor: validation.email ? 'rgba(34, 197, 94, 0.6)' : 'rgba(239, 68, 68, 0.6)' }}
                      _focus={{ 
                        borderColor: validation.email ? 'rgba(34, 197, 94, 0.8)' : 'rgba(239, 68, 68, 0.8)',
                        boxShadow: validation.email ? '0 0 0 3px rgba(34, 197, 94, 0.1)' : '0 0 0 3px rgba(239, 68, 68, 0.1)'
                      }}
                    />
                  </Box>

                  <Box w="full">
                    <HStack mb={2} gap={2}>
                      <Text color="#e2e8f0" fontSize="sm" fontWeight="500">
                        Телефон <Text as="span" color="#64748b" fontSize="xs">(опционально)</Text>
                      </Text>
                      {formData.phone && (
                        validation.phone ? 
                          <FaCheckCircle color="#22c55e" size={12} /> : 
                          <Text as="span" color="#ef4444" fontSize="xs">(неверный формат)</Text>
                      )}
                    </HStack>
                    <Input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="+1234567890"
                      bg="rgba(30, 41, 59, 0.5)"
                      border="1px solid"
                      borderColor={getInputBorderColor('phone', !!formData.phone)}
                      borderRadius="12px"
                      color="#ffffff"
                      h="44px"
                      _placeholder={{ color: '#64748b' }}
                      _hover={{ borderColor: validation.phone ? 'rgba(34, 197, 94, 0.6)' : 'rgba(239, 68, 68, 0.6)' }}
                      _focus={{ 
                        borderColor: validation.phone ? 'rgba(34, 197, 94, 0.8)' : 'rgba(239, 68, 68, 0.8)',
                        boxShadow: validation.phone ? '0 0 0 3px rgba(34, 197, 94, 0.1)' : '0 0 0 3px rgba(239, 68, 68, 0.1)'
                      }}
                    />
                  </Box>

                  <Box w="full">
                    <HStack mb={2} gap={2}>
                      <Text color="#e2e8f0" fontSize="sm" fontWeight="500">
                        Пароль
                      </Text>
                      {formData.password && (
                        validation.password ? 
                          <FaCheckCircle color="#22c55e" size={12} /> : 
                          <Text as="span" color="#ef4444" fontSize="xs">(мин. 6 символов)</Text>
                      )}
                    </HStack>
                    <Box position="relative">
                      <Input
                        type={showPassword ? 'text' : 'password'}
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        placeholder="Введите пароль"
                        bg="rgba(30, 41, 59, 0.5)"
                        border="1px solid"
                        borderColor={getInputBorderColor('password', !!formData.password)}
                        borderRadius="12px"
                        color="#ffffff"
                        h="44px"
                        pr="3.5rem"
                        _placeholder={{ color: '#64748b' }}
                        _hover={{ borderColor: validation.password ? 'rgba(34, 197, 94, 0.6)' : 'rgba(239, 68, 68, 0.6)' }}
                        _focus={{ 
                          borderColor: validation.password ? 'rgba(34, 197, 94, 0.8)' : 'rgba(239, 68, 68, 0.8)',
                          boxShadow: validation.password ? '0 0 0 3px rgba(34, 197, 94, 0.1)' : '0 0 0 3px rgba(239, 68, 68, 0.1)'
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
                        {showPassword ? <FaEyeSlash size={16} /> : <FaEye size={16} />}
                      </Button>
                    </Box>
                  </Box>

                  <Box w="full">
                    <HStack mb={2} gap={2}>
                      <Text color="#e2e8f0" fontSize="sm" fontWeight="500">
                        Подтвердить пароль
                      </Text>
                      {formData.confirmPassword && (
                        validation.confirmPassword ? 
                          <FaCheckCircle color="#22c55e" size={12} /> : 
                          <Text as="span" color="#ef4444" fontSize="xs">(не совпадают)</Text>
                      )}
                    </HStack>
                    <Box position="relative">
                      <Input
                        type={showConfirmPassword ? 'text' : 'password'}
                        value={formData.confirmPassword}
                        onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                        placeholder="Повторите пароль"
                        bg="rgba(30, 41, 59, 0.5)"
                        border="1px solid"
                        borderColor={getInputBorderColor('confirmPassword', !!formData.confirmPassword)}
                        borderRadius="12px"
                        color="#ffffff"
                        h="44px"
                        pr="3.5rem"
                        _placeholder={{ color: '#64748b' }}
                        _hover={{ borderColor: validation.confirmPassword ? 'rgba(34, 197, 94, 0.6)' : 'rgba(239, 68, 68, 0.6)' }}
                        _focus={{ 
                          borderColor: validation.confirmPassword ? 'rgba(34, 197, 94, 0.8)' : 'rgba(239, 68, 68, 0.8)',
                          boxShadow: validation.confirmPassword ? '0 0 0 3px rgba(34, 197, 94, 0.1)' : '0 0 0 3px rgba(239, 68, 68, 0.1)'
                        }}
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        position="absolute"
                        right={2}
                        top="50%"
                        transform="translateY(-50%)"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        color="#94a3b8"
                        _hover={{ color: '#ffd700' }}
                      >
                        {showConfirmPassword ? <FaEyeSlash size={16} /> : <FaEye size={16} />}
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
                    disabled={loading || !validation.username || !validation.email || !validation.password || !validation.confirmPassword}
                    mt={2}
                    _hover={{ bg: '#ffed4e', transform: 'translateY(-2px)' }}
                    _active={{ transform: 'translateY(0)' }}
                    _disabled={{ opacity: 0.6, cursor: 'not-allowed' }}
                  >
                    {loading ? 'Создание...' : 'Создать аккаунт'}
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
                onClick={handleTelegramRegister}
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
                onClick={handleVKRegister}
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

            {/* Login Link */}
            <Text textAlign="center" color="#94a3b8" fontSize="sm">
              Уже есть аккаунт?{' '}
              <Link href="/auth/login">
                <Text 
                  as="span" 
                  color="#ffd700" 
                  fontWeight="600"
                  _hover={{ textDecoration: 'underline' }}
                >
                  Войти
                </Text>
              </Link>
            </Text>
          </VStack>
        </Box>
      </Box>
    </>
  );
}
