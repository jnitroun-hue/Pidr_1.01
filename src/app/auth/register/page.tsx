"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Box, Button, Input, VStack, Text, Alert, Flex, HStack } from '@chakra-ui/react';
import { FaEye, FaEyeSlash, FaTelegram, FaCheckCircle, FaVk, FaUser, FaEnvelope, FaPhone } from 'react-icons/fa';
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
    if (!hasValue) return 'rgba(34, 197, 94, 0.3)';
    return validation[field] ? 'rgba(34, 197, 94, 0.6)' : 'rgba(239, 68, 68, 0.6)';
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
          maxW="500px" 
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
          maxH="90vh"
          overflowY="auto"
          sx={{
            '&::-webkit-scrollbar': {
              width: '8px',
            },
            '&::-webkit-scrollbar-track': {
              background: 'rgba(15, 23, 42, 0.5)',
              borderRadius: '10px',
            },
            '&::-webkit-scrollbar-thumb': {
              background: 'rgba(34, 197, 94, 0.5)',
              borderRadius: '10px',
            },
          }}
        >
          <VStack gap={6}>
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
                Создайте свой аккаунт
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

            {/* Registration Form */}
            <Box w="full">
              <form onSubmit={handleRegister}>
                <VStack gap={4}>
                  <Box w="full">
                    <HStack mb={2}>
                      <FaUser color="#94a3b8" size={14} />
                      <Text fontWeight="600" color="#e2e8f0" fontSize="sm">
                        Логин
                        {formData.username && (
                          validation.username ? 
                            <FaCheckCircle style={{ display: 'inline', marginLeft: '8px', color: '#22c55e' }} /> : 
                            <Text as="span" color="#ef4444" fontSize="xs" ml={2}>(3-32 символа)</Text>
                        )}
                      </Text>
                    </HStack>
                    <Input
                      type="text"
                      value={formData.username}
                      onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                      placeholder="username123"
                      bg="rgba(15, 23, 42, 0.8)"
                      border="1px solid"
                      borderColor={getInputBorderColor('username', !!formData.username)}
                      borderRadius="14px"
                      color="#e2e8f0"
                      h="48px"
                      fontSize="md"
                      _placeholder={{ color: '#64748b' }}
                      _hover={{ borderColor: 'rgba(255, 215, 0, 0.5)' }}
                      _focus={{ borderColor: getInputBorderColor('username', !!formData.username), boxShadow: '0 0 20px rgba(34, 197, 94, 0.2)' }}
                    />
                  </Box>

                  <Box w="full">
                    <HStack mb={2}>
                      <FaEnvelope color="#94a3b8" size={14} />
                      <Text fontWeight="600" color="#e2e8f0" fontSize="sm">
                        Email
                        {formData.email && (
                          validation.email ? 
                            <FaCheckCircle style={{ display: 'inline', marginLeft: '8px', color: '#22c55e' }} /> : 
                            <Text as="span" color="#ef4444" fontSize="xs" ml={2}>(неверный формат)</Text>
                        )}
                      </Text>
                    </HStack>
                    <Input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="example@email.com"
                      bg="rgba(15, 23, 42, 0.8)"
                      border="1px solid"
                      borderColor={getInputBorderColor('email', !!formData.email)}
                      borderRadius="14px"
                      color="#e2e8f0"
                      h="48px"
                      fontSize="md"
                      _placeholder={{ color: '#64748b' }}
                      _hover={{ borderColor: 'rgba(255, 215, 0, 0.5)' }}
                      _focus={{ borderColor: getInputBorderColor('email', !!formData.email), boxShadow: '0 0 20px rgba(34, 197, 94, 0.2)' }}
                    />
                  </Box>

                  <Box w="full">
                    <HStack mb={2}>
                      <FaPhone color="#94a3b8" size={14} />
                      <Text fontWeight="600" color="#e2e8f0" fontSize="sm">
                        Телефон <Text as="span" color="#94a3b8" fontSize="xs">(опционально)</Text>
                        {formData.phone && (
                          validation.phone ? 
                            <FaCheckCircle style={{ display: 'inline', marginLeft: '8px', color: '#22c55e' }} /> : 
                            <Text as="span" color="#ef4444" fontSize="xs" ml={2}>(неверный формат)</Text>
                        )}
                      </Text>
                    </HStack>
                    <Input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="+1234567890"
                      bg="rgba(15, 23, 42, 0.8)"
                      border="1px solid"
                      borderColor={getInputBorderColor('phone', !!formData.phone)}
                      borderRadius="14px"
                      color="#e2e8f0"
                      h="48px"
                      fontSize="md"
                      _placeholder={{ color: '#64748b' }}
                      _hover={{ borderColor: 'rgba(255, 215, 0, 0.5)' }}
                      _focus={{ borderColor: getInputBorderColor('phone', !!formData.phone), boxShadow: '0 0 20px rgba(34, 197, 94, 0.2)' }}
                    />
                  </Box>

                  <Box w="full">
                    <Text mb={2} fontWeight="600" color="#e2e8f0" fontSize="sm">
                      Пароль
                      {formData.password && (
                        validation.password ? 
                          <FaCheckCircle style={{ display: 'inline', marginLeft: '8px', color: '#22c55e' }} /> : 
                          <Text as="span" color="#ef4444" fontSize="xs" ml={2}>(мин. 6 символов)</Text>
                      )}
                    </Text>
                    <Box position="relative">
                      <Input
                        type={showPassword ? 'text' : 'password'}
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        placeholder="Введите пароль"
                        bg="rgba(15, 23, 42, 0.8)"
                        border="1px solid"
                        borderColor={getInputBorderColor('password', !!formData.password)}
                        borderRadius="14px"
                        color="#e2e8f0"
                        h="48px"
                        fontSize="md"
                        _placeholder={{ color: '#64748b' }}
                        _hover={{ borderColor: 'rgba(255, 215, 0, 0.5)' }}
                        _focus={{ borderColor: getInputBorderColor('password', !!formData.password), boxShadow: '0 0 20px rgba(34, 197, 94, 0.2)' }}
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
                        color="#64748b"
                        _hover={{ color: '#ffd700', bg: 'rgba(255, 215, 0, 0.1)' }}
                      >
                        {showPassword ? <FaEyeSlash size={18} /> : <FaEye size={18} />}
                      </Button>
                    </Box>
                  </Box>

                  <Box w="full">
                    <Text mb={2} fontWeight="600" color="#e2e8f0" fontSize="sm">
                      Подтвердить пароль
                      {formData.confirmPassword && (
                        validation.confirmPassword ? 
                          <FaCheckCircle style={{ display: 'inline', marginLeft: '8px', color: '#22c55e' }} /> : 
                          <Text as="span" color="#ef4444" fontSize="xs" ml={2}>(пароли не совпадают)</Text>
                      )}
                    </Text>
                    <Box position="relative">
                      <Input
                        type={showConfirmPassword ? 'text' : 'password'}
                        value={formData.confirmPassword}
                        onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                        placeholder="Повторите пароль"
                        bg="rgba(15, 23, 42, 0.8)"
                        border="1px solid"
                        borderColor={getInputBorderColor('confirmPassword', !!formData.confirmPassword)}
                        borderRadius="14px"
                        color="#e2e8f0"
                        h="48px"
                        fontSize="md"
                        _placeholder={{ color: '#64748b' }}
                        _hover={{ borderColor: 'rgba(255, 215, 0, 0.5)' }}
                        _focus={{ borderColor: getInputBorderColor('confirmPassword', !!formData.confirmPassword), boxShadow: '0 0 20px rgba(34, 197, 94, 0.2)' }}
                        pr="3.5rem"
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        position="absolute"
                        right={2}
                        top="50%"
                        transform="translateY(-50%)"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        color="#64748b"
                        _hover={{ color: '#ffd700', bg: 'rgba(255, 215, 0, 0.1)' }}
                      >
                        {showConfirmPassword ? <FaEyeSlash size={18} /> : <FaEye size={18} />}
                      </Button>
                    </Box>
                  </Box>

                  <Button
                    type="submit"
                    size="lg"
                    w="full"
                    disabled={loading || !validation.username || !validation.email || !validation.password || !validation.confirmPassword}
                    h="56px"
                    mt={2}
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
                    {loading ? 'СОЗДАНИЕ...' : 'СОЗДАТЬ АККАУНТ'}
                  </Button>
                </VStack>
              </form>
            </Box>

            {/* Divider */}
            <Flex align="center" w="full">
              <Box flex="1" height="1px" bg="rgba(34, 197, 94, 0.3)" />
              <Text px={3} color="#94a3b8" fontSize="sm" fontWeight="600">
                или
              </Text>
              <Box flex="1" height="1px" bg="rgba(34, 197, 94, 0.3)" />
            </Flex>

            {/* Social Registration */}
            <VStack gap={3} w="full">
              <Button
                onClick={handleTelegramRegister}
                size="lg"
                w="full"
                disabled={loading}
                h="56px"
                bg="linear-gradient(135deg, rgba(0, 136, 255, 0.9) 0%, rgba(0, 102, 204, 0.8) 100%)"
                border="1px solid"
                borderColor="rgba(0, 136, 255, 0.5)"
                borderRadius="16px"
                color="#ffffff"
                fontWeight="700"
                fontSize="1rem"
                letterSpacing="0.5px"
                boxShadow="0 8px 24px rgba(0, 136, 255, 0.3)"
                transition="all 0.3s ease"
                _hover={{
                  borderColor: 'rgba(255, 215, 0, 0.7)',
                  bg: 'linear-gradient(135deg, rgba(0, 102, 204, 1) 0%, rgba(0, 85, 170, 0.9) 100%)',
                  transform: 'translateY(-2px)',
                  boxShadow: '0 12px 32px rgba(0, 136, 255, 0.4)'
                }}
                _disabled={{ opacity: 0.6, cursor: 'not-allowed', transform: 'none' }}
              >
                <FaTelegram style={{ marginRight: 8 }} size={20} />
                Регистрация через Telegram
              </Button>

              <Button
                onClick={handleVKRegister}
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
                <FaVk style={{ marginRight: 8 }} size={20} />
                Регистрация через VK
                {!isVKMiniApp() && (
                  <Text as="span" ml={2} fontSize="xs" opacity={0.7}>
                    (только в VK Mini App)
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
                  color="#22c55e" 
                  fontWeight="700" 
                  transition="all 0.3s ease"
                  _hover={{ color: '#ffd700', textDecoration: 'underline', textShadow: '0 0 10px rgba(255, 215, 0, 0.5)' }}
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
