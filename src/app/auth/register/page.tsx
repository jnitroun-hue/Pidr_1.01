"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Box, Button, Input, VStack, Text, Alert, Flex, HStack } from '@chakra-ui/react';
import { FaEye, FaEyeSlash, FaTelegram, FaCheckCircle, FaVk, FaUser, FaEnvelope, FaPhone, FaLock } from 'react-icons/fa';
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

  const showToast = (title: string, description: string, type: 'success' | 'error' | 'warning' | 'info') => {
    alert(`${title}: ${description}`);
  };

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
      setError('Пожалуйста, исправьте ошибки в форме');
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

        showToast('Регистрация успешна!', `Добро пожаловать в P.I.D.R., ${data.user.username}!`, 'success');

        setTimeout(() => {
          if (typeof window !== 'undefined') {
            window.location.href = '/';
          } else {
            router.push('/');
          }
        }, 1500);
      } else {
        setError(data.message || 'Ошибка регистрации');
      }
    } catch (err) {
      setError('Ошибка сети. Попробуйте позже.');
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
        showToast('Ошибка', 'Откройте приложение через Telegram', 'error');
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
          
          showToast('Регистрация успешна!', `Добро пожаловать в P.I.D.R., ${data.user.username}!`, 'success');

          router.push('/');
        } else {
          setError(data.message || 'Ошибка регистрации через Telegram');
        }
      } catch (err) {
        setError('Ошибка сети. Попробуйте позже.');
      } finally {
        setLoading(false);
      }
    } else {
      showToast('Недоступно', 'Регистрация через Telegram доступна только в WebApp', 'warning');
    }
  };

  const handleVKRegister = async () => {
    if (!isVKMiniApp()) {
      showToast('Недоступно', 'Регистрация через VK доступна только в VK Mini App', 'warning');
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
        
        showToast('Регистрация успешна!', `Добро пожаловать в P.I.D.R., ${result.user.username}!`, 'success');

        setTimeout(() => {
          if (typeof window !== 'undefined') {
            window.location.href = '/';
          } else {
            router.push('/');
          }
        }, 1500);
      } else {
        setError(result.message || 'Ошибка регистрации через VK');
      }
    } catch (err) {
      setError('Ошибка сети. Попробуйте позже.');
    } finally {
      setLoading(false);
    }
  };

  const getInputBorderColor = (field: keyof FormValidation, hasValue: boolean) => {
    if (!hasValue) return 'rgba(255, 215, 0, 0.2)';
    return validation[field] ? 'rgba(34, 197, 94, 0.5)' : 'rgba(239, 68, 68, 0.5)';
  };

  const getInputBg = (field: keyof FormValidation, hasValue: boolean) => {
    if (!hasValue) return 'rgba(15, 23, 42, 0.6)';
    return validation[field] ? 'rgba(15, 23, 42, 0.8)' : 'rgba(239, 68, 68, 0.1)';
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
          maxW="540px" 
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
            maxH="90vh"
            overflowY="auto"
          >
            <VStack gap={7}>
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
                  Создайте свой аккаунт
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

              {/* Registration Form */}
              <Box w="full">
                <form onSubmit={handleRegister}>
                  <VStack gap={5}>
                    {/* Username */}
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
                        <HStack gap={2}>
                          <Text fontWeight="600" color="#e2e8f0" fontSize="sm" letterSpacing="0.5px">
                            Логин
                          </Text>
                          {formData.username && (
                            validation.username ? 
                              <FaCheckCircle color="#22c55e" size={14} /> : 
                              <Text as="span" color="#ef4444" fontSize="xs">(3-32 символа)</Text>
                          )}
                        </HStack>
                      </HStack>
                      <Input
                        type="text"
                        value={formData.username}
                        onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                        placeholder="username123"
                        bg={getInputBg('username', !!formData.username)}
                        border="2px solid"
                        borderColor={getInputBorderColor('username', !!formData.username)}
                        borderRadius="16px"
                        color="#ffffff"
                        h="52px"
                        fontSize="md"
                        px={5}
                        transition="all 0.3s ease"
                        _placeholder={{ color: '#64748b' }}
                        _hover={{ 
                          borderColor: validation.username ? 'rgba(34, 197, 94, 0.6)' : 'rgba(239, 68, 68, 0.6)',
                          bg: 'rgba(15, 23, 42, 0.9)',
                        }}
                        _focus={{ 
                          borderColor: validation.username ? 'rgba(34, 197, 94, 0.8)' : 'rgba(239, 68, 68, 0.8)',
                          bg: 'rgba(15, 23, 42, 0.95)',
                          boxShadow: validation.username ? '0 0 0 4px rgba(34, 197, 94, 0.1), 0 0 20px rgba(34, 197, 94, 0.2)' : '0 0 0 4px rgba(239, 68, 68, 0.1), 0 0 20px rgba(239, 68, 68, 0.2)',
                        }}
                      />
                    </Box>

                    {/* Email */}
                    <Box w="full">
                      <HStack mb={3} gap={2}>
                        <Box
                          p={2}
                          borderRadius="10px"
                          bg="rgba(255, 215, 0, 0.1)"
                          border="1px solid rgba(255, 215, 0, 0.2)"
                        >
                          <FaEnvelope color="#ffd700" size={14} />
                        </Box>
                        <HStack gap={2}>
                          <Text fontWeight="600" color="#e2e8f0" fontSize="sm" letterSpacing="0.5px">
                            Email
                          </Text>
                          {formData.email && (
                            validation.email ? 
                              <FaCheckCircle color="#22c55e" size={14} /> : 
                              <Text as="span" color="#ef4444" fontSize="xs">(неверный формат)</Text>
                          )}
                        </HStack>
                      </HStack>
                      <Input
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        placeholder="example@email.com"
                        bg={getInputBg('email', !!formData.email)}
                        border="2px solid"
                        borderColor={getInputBorderColor('email', !!formData.email)}
                        borderRadius="16px"
                        color="#ffffff"
                        h="52px"
                        fontSize="md"
                        px={5}
                        transition="all 0.3s ease"
                        _placeholder={{ color: '#64748b' }}
                        _hover={{ 
                          borderColor: validation.email ? 'rgba(34, 197, 94, 0.6)' : 'rgba(239, 68, 68, 0.6)',
                          bg: 'rgba(15, 23, 42, 0.9)',
                        }}
                        _focus={{ 
                          borderColor: validation.email ? 'rgba(34, 197, 94, 0.8)' : 'rgba(239, 68, 68, 0.8)',
                          bg: 'rgba(15, 23, 42, 0.95)',
                          boxShadow: validation.email ? '0 0 0 4px rgba(34, 197, 94, 0.1), 0 0 20px rgba(34, 197, 94, 0.2)' : '0 0 0 4px rgba(239, 68, 68, 0.1), 0 0 20px rgba(239, 68, 68, 0.2)',
                        }}
                      />
                    </Box>

                    {/* Phone */}
                    <Box w="full">
                      <HStack mb={3} gap={2}>
                        <Box
                          p={2}
                          borderRadius="10px"
                          bg="rgba(255, 215, 0, 0.1)"
                          border="1px solid rgba(255, 215, 0, 0.2)"
                        >
                          <FaPhone color="#ffd700" size={14} />
                        </Box>
                        <HStack gap={2}>
                          <Text fontWeight="600" color="#e2e8f0" fontSize="sm" letterSpacing="0.5px">
                            Телефон <Text as="span" color="#94a3b8" fontSize="xs">(опционально)</Text>
                          </Text>
                          {formData.phone && (
                            validation.phone ? 
                              <FaCheckCircle color="#22c55e" size={14} /> : 
                              <Text as="span" color="#ef4444" fontSize="xs">(неверный формат)</Text>
                          )}
                        </HStack>
                      </HStack>
                      <Input
                        type="tel"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        placeholder="+1234567890"
                        bg={getInputBg('phone', !!formData.phone)}
                        border="2px solid"
                        borderColor={getInputBorderColor('phone', !!formData.phone)}
                        borderRadius="16px"
                        color="#ffffff"
                        h="52px"
                        fontSize="md"
                        px={5}
                        transition="all 0.3s ease"
                        _placeholder={{ color: '#64748b' }}
                        _hover={{ 
                          borderColor: validation.phone ? 'rgba(34, 197, 94, 0.6)' : 'rgba(239, 68, 68, 0.6)',
                          bg: 'rgba(15, 23, 42, 0.9)',
                        }}
                        _focus={{ 
                          borderColor: validation.phone ? 'rgba(34, 197, 94, 0.8)' : 'rgba(239, 68, 68, 0.8)',
                          bg: 'rgba(15, 23, 42, 0.95)',
                          boxShadow: validation.phone ? '0 0 0 4px rgba(34, 197, 94, 0.1), 0 0 20px rgba(34, 197, 94, 0.2)' : '0 0 0 4px rgba(239, 68, 68, 0.1), 0 0 20px rgba(239, 68, 68, 0.2)',
                        }}
                      />
                    </Box>

                    {/* Password */}
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
                        <HStack gap={2}>
                          <Text fontWeight="600" color="#e2e8f0" fontSize="sm" letterSpacing="0.5px">
                            Пароль
                          </Text>
                          {formData.password && (
                            validation.password ? 
                              <FaCheckCircle color="#22c55e" size={14} /> : 
                              <Text as="span" color="#ef4444" fontSize="xs">(мин. 6 символов)</Text>
                          )}
                        </HStack>
                      </HStack>
                      <Box position="relative">
                        <Input
                          type={showPassword ? 'text' : 'password'}
                          value={formData.password}
                          onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                          placeholder="Введите пароль"
                          bg={getInputBg('password', !!formData.password)}
                          border="2px solid"
                          borderColor={getInputBorderColor('password', !!formData.password)}
                          borderRadius="16px"
                          color="#ffffff"
                          h="52px"
                          fontSize="md"
                          px={5}
                          pr="4rem"
                          transition="all 0.3s ease"
                          _placeholder={{ color: '#64748b' }}
                          _hover={{ 
                            borderColor: validation.password ? 'rgba(34, 197, 94, 0.6)' : 'rgba(239, 68, 68, 0.6)',
                            bg: 'rgba(15, 23, 42, 0.9)',
                          }}
                          _focus={{ 
                            borderColor: validation.password ? 'rgba(34, 197, 94, 0.8)' : 'rgba(239, 68, 68, 0.8)',
                            bg: 'rgba(15, 23, 42, 0.95)',
                            boxShadow: validation.password ? '0 0 0 4px rgba(34, 197, 94, 0.1), 0 0 20px rgba(34, 197, 94, 0.2)' : '0 0 0 4px rgba(239, 68, 68, 0.1), 0 0 20px rgba(239, 68, 68, 0.2)',
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

                    {/* Confirm Password */}
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
                        <HStack gap={2}>
                          <Text fontWeight="600" color="#e2e8f0" fontSize="sm" letterSpacing="0.5px">
                            Подтвердить пароль
                          </Text>
                          {formData.confirmPassword && (
                            validation.confirmPassword ? 
                              <FaCheckCircle color="#22c55e" size={14} /> : 
                              <Text as="span" color="#ef4444" fontSize="xs">(пароли не совпадают)</Text>
                          )}
                        </HStack>
                      </HStack>
                      <Box position="relative">
                        <Input
                          type={showConfirmPassword ? 'text' : 'password'}
                          value={formData.confirmPassword}
                          onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                          placeholder="Повторите пароль"
                          bg={getInputBg('confirmPassword', !!formData.confirmPassword)}
                          border="2px solid"
                          borderColor={getInputBorderColor('confirmPassword', !!formData.confirmPassword)}
                          borderRadius="16px"
                          color="#ffffff"
                          h="52px"
                          fontSize="md"
                          px={5}
                          pr="4rem"
                          transition="all 0.3s ease"
                          _placeholder={{ color: '#64748b' }}
                          _hover={{ 
                            borderColor: validation.confirmPassword ? 'rgba(34, 197, 94, 0.6)' : 'rgba(239, 68, 68, 0.6)',
                            bg: 'rgba(15, 23, 42, 0.9)',
                          }}
                          _focus={{ 
                            borderColor: validation.confirmPassword ? 'rgba(34, 197, 94, 0.8)' : 'rgba(239, 68, 68, 0.8)',
                            bg: 'rgba(15, 23, 42, 0.95)',
                            boxShadow: validation.confirmPassword ? '0 0 0 4px rgba(34, 197, 94, 0.1), 0 0 20px rgba(34, 197, 94, 0.2)' : '0 0 0 4px rgba(239, 68, 68, 0.1), 0 0 20px rgba(239, 68, 68, 0.2)',
                          }}
                        />
                        <Button
                          variant="ghost"
                          size="sm"
                          position="absolute"
                          right={3}
                          top="50%"
                          transform="translateY(-50%)"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          color="#94a3b8"
                          borderRadius="12px"
                          _hover={{ 
                            color: '#ffd700', 
                            bg: 'rgba(255, 215, 0, 0.15)',
                            transform: 'translateY(-50%) scale(1.1)',
                          }}
                          transition="all 0.2s ease"
                        >
                          {showConfirmPassword ? <FaEyeSlash size={18} /> : <FaEye size={18} />}
                        </Button>
                      </Box>
                    </Box>

                    {/* Submit Button */}
                    <Button
                      type="submit"
                      size="lg"
                      w="full"
                      disabled={loading || !validation.username || !validation.email || !validation.password || !validation.confirmPassword}
                      h="60px"
                      mt={2}
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
                      {loading ? 'СОЗДАНИЕ...' : 'СОЗДАТЬ АККАУНТ'}
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

              {/* Social Registration */}
              <VStack gap={4} w="full">
                <Button
                  onClick={handleTelegramRegister}
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
                  onClick={handleVKRegister}
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

              {/* Login Link */}
              <Text textAlign="center" color="#94a3b8" fontSize="0.95rem">
                Уже есть аккаунт?{' '}
                <Link href="/auth/login">
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
                    Войти
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
