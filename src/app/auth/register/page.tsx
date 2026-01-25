"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Box, Button, Input, VStack, Text, Alert, Flex } from '@chakra-ui/react';
import { FaEye, FaEyeSlash, FaTelegram, FaCheckCircle } from 'react-icons/fa';
import Link from 'next/link';

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

  const getInputBorderColor = (field: keyof FormValidation, hasValue: boolean) => {
    if (!hasValue) return 'rgba(34, 197, 94, 0.3)';
    return validation[field] ? 'rgba(34, 197, 94, 0.6)' : 'rgba(239, 68, 68, 0.6)';
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
              Создайте свой аккаунт
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
            <form onSubmit={handleRegister}>
              <VStack gap={4}>
                <Box w="full">
                  <Text mb={2} fontWeight="600" color="#e2e8f0">
                    Логин
                    {formData.username && (
                      validation.username ? 
                        <FaCheckCircle style={{ display: 'inline', marginLeft: '8px', color: '#22c55e' }} /> : 
                        <Text as="span" color="#ef4444" fontSize="sm" ml={2}>(3-32 символа)</Text>
                    )}
                  </Text>
                  <Input
                    type="text"
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    placeholder="username123"
                    bg="rgba(15, 23, 42, 0.8)"
                    border="1px solid"
                    borderColor={getInputBorderColor('username', !!formData.username)}
                    borderRadius="12px"
                    color="#e2e8f0"
                    _placeholder={{ color: '#64748b' }}
                  />
                </Box>

                <Box w="full">
                  <Text mb={2} fontWeight="600" color="#e2e8f0">
                    Email
                    {formData.email && (
                      validation.email ? 
                        <FaCheckCircle style={{ display: 'inline', marginLeft: '8px', color: '#22c55e' }} /> : 
                        <Text as="span" color="#ef4444" fontSize="sm" ml={2}>(неверный формат)</Text>
                    )}
                  </Text>
                  <Input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="example@email.com"
                    bg="rgba(15, 23, 42, 0.8)"
                    border="1px solid"
                    borderColor={getInputBorderColor('email', !!formData.email)}
                    borderRadius="12px"
                    color="#e2e8f0"
                    _placeholder={{ color: '#64748b' }}
                  />
                </Box>

                <Box w="full">
                  <Text mb={2} fontWeight="600" color="#e2e8f0">
                    Телефон <Text as="span" color="#94a3b8" fontSize="sm">(опционально)</Text>
                    {formData.phone && (
                      validation.phone ? 
                        <FaCheckCircle style={{ display: 'inline', marginLeft: '8px', color: '#22c55e' }} /> : 
                        <Text as="span" color="#ef4444" fontSize="sm" ml={2}>(неверный формат)</Text>
                    )}
                  </Text>
                  <Input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="+1234567890"
                    bg="rgba(15, 23, 42, 0.8)"
                    border="1px solid"
                    borderColor={getInputBorderColor('phone', !!formData.phone)}
                    borderRadius="12px"
                    color="#e2e8f0"
                    _placeholder={{ color: '#64748b' }}
                  />
                </Box>

                <Box w="full">
                  <Text mb={2} fontWeight="600" color="#e2e8f0">
                    Пароль
                    {formData.password && (
                      validation.password ? 
                        <FaCheckCircle style={{ display: 'inline', marginLeft: '8px', color: '#22c55e' }} /> : 
                        <Text as="span" color="#ef4444" fontSize="sm" ml={2}>(мин. 6 символов)</Text>
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
                      borderRadius="12px"
                      color="#e2e8f0"
                      _placeholder={{ color: '#64748b' }}
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
                      color="#64748b"
                      _hover={{ color: '#ffd700' }}
                    >
                      {showPassword ? <FaEyeSlash /> : <FaEye />}
                    </Button>
                  </Box>
                </Box>

                <Box w="full">
                  <Text mb={2} fontWeight="600" color="#e2e8f0">
                    Подтвердить пароль
                    {formData.confirmPassword && (
                      validation.confirmPassword ? 
                        <FaCheckCircle style={{ display: 'inline', marginLeft: '8px', color: '#22c55e' }} /> : 
                        <Text as="span" color="#ef4444" fontSize="sm" ml={2}>(пароли не совпадают)</Text>
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
                      borderRadius="12px"
                      color="#e2e8f0"
                      _placeholder={{ color: '#64748b' }}
                      pr="3rem"
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
                      _hover={{ color: '#ffd700' }}
                    >
                      {showConfirmPassword ? <FaEyeSlash /> : <FaEye />}
                    </Button>
                  </Box>
                </Box>

                <Button
                  type="submit"
                  size="lg"
                  w="full"
                  disabled={loading || !validation.username || !validation.email || !validation.password || !validation.confirmPassword}
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
                  {loading ? 'Создание...' : 'СОЗДАТЬ АККАУНТ'}
                </Button>
              </VStack>
            </form>
          </Box>

          <Flex align="center" w="full">
            <Box flex="1" height="1px" bg="rgba(34, 197, 94, 0.3)" />
            <Text px={3} color="#94a3b8" fontSize="sm" fontWeight="600">
              или
            </Text>
            <Box flex="1" height="1px" bg="rgba(34, 197, 94, 0.3)" />
          </Flex>

          <VStack gap={3} w="full">
            <Button
              onClick={handleTelegramRegister}
              size="lg"
              w="full"
              disabled={loading}
              bg="rgba(0, 136, 255, 0.8)"
              border="1px solid"
              borderColor="rgba(0, 136, 255, 0.4)"
              borderRadius="16px"
              color="#e2e8f0"
              fontWeight="600"
              fontSize="1rem"
              _hover={{
                bg: 'rgba(0, 102, 204, 0.9)',
                color: '#ffd700',
                transform: 'translateY(-2px)'
              }}
              _disabled={{ opacity: 0.6, cursor: 'not-allowed' }}
            >
              <FaTelegram style={{ marginRight: 8 }} /> Регистрация через Telegram
            </Button>
          </VStack>

          <Text textAlign="center" color="#94a3b8" fontSize="0.9rem">
            Уже есть аккаунт?{' '}
            <Link href="/auth/login">
              <Text 
                as="span" 
                color="#22c55e" 
                fontWeight="600" 
                _hover={{ color: '#ffd700', textDecoration: 'underline' }}
              >
                Войти
              </Text>
            </Link>
          </Text>
        </VStack>
      </Box>
    </Box>
  );
}
