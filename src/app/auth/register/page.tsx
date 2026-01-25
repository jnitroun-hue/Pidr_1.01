"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Box, Button, Input, VStack, HStack, Text, Alert, Flex } from '@chakra-ui/react';
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
    phone: false,
    password: false,
    confirmPassword: false
  });

  const router = useRouter();
  const showToast = (title: string, description: string, type: 'success' | 'error' | 'warning' | 'info') => {
    alert(`${title}: ${description}`);
  };

  useEffect(() => {
    // Проверяем, авторизован ли пользователь
    const token = localStorage.getItem('auth_token');
    if (token) {
      router.push('/');
    }
  }, [router]);

  // Валидация в реальном времени
  useEffect(() => {
    setValidation({
      username: formData.username.length >= 3 && formData.username.length <= 32 && /^[a-zA-Z0-9_]+$/.test(formData.username),
      email: !formData.email || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email), // опционально
      phone: !formData.phone || /^\+?[1-9]\d{1,14}$/.test(formData.phone), // опционально
      email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email),
      password: formData.password.length >= 6 && /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(formData.password),
      confirmPassword: formData.password === formData.confirmPassword && formData.confirmPassword.length > 0
    });
  }, [formData]);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();

    // Проверка валидации
    if (!validation.username || !validation.email || !validation.phone || !validation.password || !validation.confirmPassword) {
    if (!validation.username || !validation.email || !validation.password || !validation.confirmPassword) {
      setError('Пожалуйста, исправьте ошибки в форме');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Сначала регистрируем пользователя
      const registerData: any = {
        username: formData.username,
        password: formData.password
      };

      // Добавляем опциональные поля только если они заполнены
      if (formData.email) registerData.email = formData.email;
      if (formData.phone) registerData.phone = formData.phone;

      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(registerData)
      });

      const data = await response.json();

      if (data.success) {
        console.log('✅ Успешная регистрация:', data.user);
        
        // Сохраняем данные пользователя
        localStorage.setItem('auth_token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        localStorage.setItem('current_user', JSON.stringify(data.user));
        
        // Диспатчим событие обновления монет
        window.dispatchEvent(new CustomEvent('coinsUpdated', { 
          detail: { coins: data.user.coins } 
        }));

        showToast('Регистрация успешна!', `Добро пожаловать в P.I.D.R., ${data.user.username}!`, 'success');

        // Проверяем реферальный код
        const pendingReferral = localStorage.getItem('pending_referral_code');
        if (pendingReferral) {
          await handlePendingReferral(pendingReferral, data.token);
        }

        // Перенаправляем в игру
        console.log('🚀 Начинаем перенаправление (регистрация) через 1.5 сек');
        console.log('🔍 window.Telegram?.WebApp:', !!window.Telegram?.WebApp);
        
        setTimeout(() => {
          console.log('⏰ setTimeout выполнился (регистрация)');
          
          if (typeof window !== 'undefined') {
            if (window.Telegram?.WebApp) {
              // Для Telegram WebApp используем router.replace
              console.log('🔄 Перенаправление в Telegram WebApp (регистрация) через router');
              try {
                router.replace('/');
                console.log('✅ router.replace выполнен (регистрация)');
              } catch (error) {
                console.error('❌ Ошибка router.replace (регистрация):', error);
                window.location.href = '/';
              }
            } else {
              // Обычное перенаправление
              console.log('🔄 Обычное перенаправление (регистрация)');
              window.location.href = '/';
            }
          } else {
            console.log('🔄 Server-side перенаправление (регистрация)');
            router.push('/');
          }
        }, 1500);
      } else {
        setError(data.message || 'Ошибка регистрации');
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
        showToast('🎉 Реферальный бонус!', result.message, 'success');
      }
    } catch (error) {
      console.error('Error processing pending referral:', error);
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
      } catch (error) {
        setError('Ошибка сети. Попробуйте позже.');
      } finally {
        setLoading(false);
      }
    } else {
      showToast('Недоступно', 'Регистрация через Telegram доступна только в WebApp', 'warning');
    }
  };


  const getInputProps = (field: keyof FormValidation, hasValue: boolean) => ({
    borderColor: hasValue ? (validation[field] ? 'rgba(34, 197, 94, 0.6)' : 'rgba(239, 68, 68, 0.6)') : 'rgba(34, 197, 94, 0.3)',
    _hover: { borderColor: hasValue ? (validation[field] ? 'rgba(34, 197, 94, 0.8)' : 'rgba(239, 68, 68, 0.8)') : 'rgba(255, 215, 0, 0.4)' },
    _focus: { 
      borderColor: hasValue ? (validation[field] ? 'rgba(34, 197, 94, 1)' : 'rgba(239, 68, 68, 1)') : 'rgba(255, 215, 0, 0.6)',
      boxShadow: hasValue ? (validation[field] ? '0 0 20px rgba(34, 197, 94, 0.3)' : '0 0 20px rgba(239, 68, 68, 0.3)') : '0 0 20px rgba(255, 215, 0, 0.1)'
    }
  });

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
              Создайте свой аккаунт
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

          {/* Registration Form */}
          <Box w="full">
            <form onSubmit={handleRegister}>
              <VStack gap={4}>
                <Box>
                  <Text mb={2} fontWeight="600" color="#e2e8f0">
                    Логин
                    {formData.username && (
                      validation.username ? 
                        <FaCheckCircle style={{ display: 'inline', marginLeft: '8px', color: '#22c55e' }} /> : 
                        <Text as="span" color="#ef4444" fontSize="sm" ml={2}>(3-32 символа, только буквы, цифры, _)</Text>
                    )}
                  </Text>
                  <Input
                    type="text"
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    placeholder="username123"
                    bg="linear-gradient(135deg, rgba(15, 23, 42, 0.8) 0%, rgba(30, 41, 59, 0.6) 100%)"
                    backdropFilter="blur(10px)"
                    border="1px solid"
                    borderRadius="12px"
                    color="#e2e8f0"
                    _placeholder={{ color: '#64748b' }}
                    {...getInputProps('username', !!formData.username)}
                  />
                </Box>

                <Box>
                  <Text mb={2} fontWeight="600" color="#e2e8f0">
                    Email <Text as="span" color="#94a3b8" fontSize="sm">(опционально)</Text>
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
                    bg="linear-gradient(135deg, rgba(15, 23, 42, 0.8) 0%, rgba(30, 41, 59, 0.6) 100%)"
                    backdropFilter="blur(10px)"
                    border="1px solid"
                    borderRadius="12px"
                    color="#e2e8f0"
                    _placeholder={{ color: '#64748b' }}
                    {...getInputProps('email', !!formData.email)}
                  />
                </Box>

                <Box>
                  <Text mb={2} fontWeight="600" color="#e2e8f0">
                    Телефон <Text as="span" color="#94a3b8" fontSize="sm">(опционально)</Text>
                    {formData.phone && (
                      validation.phone ? 
                        <FaCheckCircle style={{ display: 'inline', marginLeft: '8px', color: '#22c55e' }} /> : 
                        <Text as="span" color="#ef4444" fontSize="sm" ml={2}>(неверный формат, используйте +1234567890)</Text>
                    )}
                  </Text>
                  <Input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="+1234567890"
                    bg="linear-gradient(135deg, rgba(15, 23, 42, 0.8) 0%, rgba(30, 41, 59, 0.6) 100%)"
                    backdropFilter="blur(10px)"
                    border="1px solid"
                    borderRadius="12px"
                    color="#e2e8f0"
                    _placeholder={{ color: '#64748b' }}
                    {...getInputProps('phone', !!formData.phone)}
                  />
                </Box>

                <Box>
                  <Text mb={2} fontWeight="600" color="#e2e8f0">
                    Пароль
                    {formData.password && (
                      validation.password ? 
                        <FaCheckCircle style={{ display: 'inline', marginLeft: '8px', color: '#22c55e' }} /> : 
                        <Text as="span" color="#ef4444" fontSize="sm" ml={2}>(мин. 6 символов, большая и маленькая буквы, цифра)</Text>
                    )}
                  </Text>
                  <Box position="relative">
                    <Input
                      type={showPassword ? 'text' : 'password'}
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      placeholder="Введите пароль"
                      bg="linear-gradient(135deg, rgba(15, 23, 42, 0.8) 0%, rgba(30, 41, 59, 0.6) 100%)"
                      backdropFilter="blur(10px)"
                      border="1px solid"
                      borderRadius="12px"
                      color="#e2e8f0"
                      _placeholder={{ color: '#64748b' }}
                      {...getInputProps('password', !!formData.password)}
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

                <Box>
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
                      bg="linear-gradient(135deg, rgba(15, 23, 42, 0.8) 0%, rgba(30, 41, 59, 0.6) 100%)"
                      backdropFilter="blur(10px)"
                      border="1px solid"
                      borderRadius="12px"
                      color="#e2e8f0"
                      _placeholder={{ color: '#64748b' }}
                      {...getInputProps('confirmPassword', !!formData.confirmPassword)}
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
                  {loading ? 'Создание...' : 'СОЗДАТЬ АККАУНТ'}
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
              bg="linear-gradient(135deg, rgba(0, 136, 255, 0.8) 0%, rgba(0, 102, 204, 0.6) 100%)"
              border="1px solid"
              borderColor="rgba(0, 136, 255, 0.4)"
              borderRadius="16px"
              boxShadow="0 4px 20px rgba(0, 0, 0, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.1)"
              backdropFilter="blur(10px)"
              color="#e2e8f0"
              fontWeight="600"
              fontSize="1rem"
              letterSpacing="0.5px"
              transition="all 0.3s ease"
              _hover={{
                borderColor: 'rgba(255, 215, 0, 0.6)',
                bg: 'linear-gradient(135deg, rgba(0, 102, 204, 0.9) 0%, rgba(0, 85, 170, 0.8) 100%)',
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
              <FaTelegram style={{ marginRight: 8 }} /> Регистрация через Telegram
            </Button>

          </VStack>

          {/* Login Link */}
          <Text textAlign="center" color="#94a3b8" fontSize="0.9rem">
            Уже есть аккаунт?{' '}
            <Link href="/auth/login">
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
                Войти
              </Text>
            </Link>
          </Text>
        </VStack>
      </Box>
    </Box>
  );
}
