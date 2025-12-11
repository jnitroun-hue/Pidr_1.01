"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Box, Button, Input, VStack, HStack, Text, Alert, Flex } from '@chakra-ui/react';
import { FaEye, FaEyeSlash, FaTelegram, FaGoogle, FaCheckCircle } from 'react-icons/fa';
import Link from 'next/link';

// VK icon component
const VKIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
    <path d="M15.684 0H8.316C1.592 0 0 1.592 0 8.316v7.368C0 22.408 1.592 24 8.316 24h7.368C22.408 24 24 22.408 24 15.684V8.316C24 1.592 22.408 0 15.684 0zm3.692 17.123h-1.744c-.66 0-.864-.525-2.05-1.727-1.033-1.033-.148-1.49-.148-1.49.15-.108.3-.27.3-.511 0-.213-.064-.511-.945-.511-.75 0-.976.336-1.394.336-.475 0-.671-.3-.671-.671 0-.398.418-.671 1.008-.671.814 0 1.245.273 2.229.273.814 0 1.245-.336 1.245-.868 0-.418-.254-.786-.683-1.033l1.394-1.394c.088-.088.212-.148.348-.148.273 0 .498.225.498.498 0 .136-.06.26-.148.348l-1.394 1.394c.247.16.407.254.686.516.418.418.814.996.814 1.677 0 1.245-.976 2.229-2.229 2.229-.418 0-.796-.15-1.095-.387-.3.236-.677.387-1.095.387-.475 0-.9-.15-1.245-.398v.398c0 .273-.225.498-.498.498s-.498-.225-.498-.498V9.563c0-.814.66-1.474 1.474-1.474h3.444c.814 0 1.474.66 1.474 1.474v6.796c0 .273-.225.498-.498.498z"/>
  </svg>
);

interface FormData {
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
}

interface FormValidation {
  username: boolean;
  email: boolean;
  password: boolean;
  confirmPassword: boolean;
}

export default function RegisterPage() {
  const [formData, setFormData] = useState<FormData>({
    username: '',
    email: '',
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
      email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email),
      password: formData.password.length >= 6 && /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(formData.password),
      confirmPassword: formData.password === formData.confirmPassword && formData.confirmPassword.length > 0
    });
  }, [formData]);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();

    // Проверка валидации
    if (!validation.username || !validation.email || !validation.password || !validation.confirmPassword) {
      setError('Пожалуйста, исправьте ошибки в форме');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Сначала регистрируем пользователя
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: formData.username,
          email: formData.email,
          password: formData.password
        })
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

  const handleGoogleRegister = () => {
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

  const handleVKRegister = () => {
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

            <HStack gap={3} w="full">
              <Button
                onClick={handleGoogleRegister}
                size="md"
                flex={1}
                disabled={loading}
                bg="linear-gradient(135deg, rgba(219, 68, 55, 0.8) 0%, rgba(185, 28, 28, 0.6) 100%)"
                border="1px solid"
                borderColor="rgba(219, 68, 55, 0.4)"
                borderRadius="12px"
                boxShadow="0 4px 20px rgba(0, 0, 0, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.1)"
                backdropFilter="blur(10px)"
                color="#e2e8f0"
                fontWeight="600"
                fontSize="0.9rem"
                transition="all 0.3s ease"
                _hover={{
                  borderColor: 'rgba(255, 215, 0, 0.6)',
                  bg: 'linear-gradient(135deg, rgba(185, 28, 28, 0.9) 0%, rgba(153, 27, 27, 0.8) 100%)',
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
                onClick={handleVKRegister}
                size="md"
                flex={1}
                disabled={loading}
                bg="linear-gradient(135deg, rgba(69, 102, 142, 0.8) 0%, rgba(45, 85, 122, 0.6) 100%)"
                border="1px solid"
                borderColor="rgba(69, 102, 142, 0.4)"
                borderRadius="12px"
                boxShadow="0 4px 20px rgba(0, 0, 0, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.1)"
                backdropFilter="blur(10px)"
                color="#e2e8f0"
                fontWeight="600"
                fontSize="0.9rem"
                transition="all 0.3s ease"
                _hover={{
                  borderColor: 'rgba(255, 215, 0, 0.6)',
                  bg: 'linear-gradient(135deg, rgba(45, 85, 122, 0.9) 0%, rgba(37, 70, 102, 0.8) 100%)',
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
