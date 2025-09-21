"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Box, Button, Input, VStack, Text, Alert } from '@chakra-ui/react';
import { FaTelegram } from 'react-icons/fa';

export default function TestLoginPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [credentials, setCredentials] = useState({ username: '', password: '' });
  const router = useRouter();

  const handleTestTelegramLogin = async () => {
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      // Симулируем Telegram данные
      const telegramData = {
        type: 'telegram',
        id: Date.now(),
        username: 'test_user',
        first_name: 'Test',
        last_name: 'User',
        photo_url: null,
        initData: 'test_init_data'
      };

      console.log('📱 Sending test Telegram data:', telegramData);

      const response = await fetch('/api/auth/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(telegramData)
      });

      const data = await response.json();
      console.log('📡 Response:', data);

      if (data.success) {
        setSuccess(`✅ Успешный вход! Пользователь: ${data.user.username}`);
        
        // Сохраняем данные пользователя
        localStorage.setItem('auth_token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        localStorage.setItem('current_user', JSON.stringify(data.user));
        
        // Перенаправляем на главную страницу
        setTimeout(() => {
          router.push('/');
        }, 2000);
      } else {
        setError(data.message || 'Ошибка входа');
      }
    } catch (error) {
      console.error('❌ Test login error:', error);
      setError('Ошибка сети: ' + (error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleTestLocalLogin = async () => {
    if (!credentials.username || credentials.password.length < 6) {
      setError('Заполните все поля (пароль минимум 6 символов)');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const loginData = {
        type: 'local',
        username: credentials.username,
        password: credentials.password
      };

      console.log('👤 Sending test local data:', loginData);

      const response = await fetch('/api/auth/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(loginData)
      });

      const data = await response.json();
      console.log('📡 Response:', data);

      if (data.success) {
        setSuccess(`✅ Успешный вход! Пользователь: ${data.user.username}`);
        
        localStorage.setItem('auth_token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        localStorage.setItem('current_user', JSON.stringify(data.user));
        
        setTimeout(() => {
          router.push('/');
        }, 2000);
      } else {
        setError(data.message || 'Ошибка входа');
      }
    } catch (error) {
      console.error('❌ Test local login error:', error);
      setError('Ошибка сети: ' + (error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box 
      minH="100vh" 
      bg="linear-gradient(135deg, #0f172a 0%, #1e293b 30%, #0f172a 60%, #064e3b 100%)"
      display="flex" 
      alignItems="center" 
      justifyContent="center" 
      p={4}
      position="relative"
      _before={{
        content: '""',
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        background: 'radial-gradient(circle at 20% 20%, rgba(34, 197, 94, 0.08) 0%, transparent 50%), radial-gradient(circle at 80% 60%, rgba(255, 215, 0, 0.05) 0%, transparent 50%), radial-gradient(circle at 40% 80%, rgba(59, 130, 246, 0.06) 0%, transparent 50%)',
        pointerEvents: 'none'
      }}
    >
      <Box 
        maxW="450px" 
        w="full" 
        bg="linear-gradient(135deg, rgba(15, 23, 42, 0.95) 0%, rgba(30, 41, 59, 0.90) 100%)"
        backdropFilter="blur(20px)"
        border="1px solid"
        borderColor="rgba(34, 197, 94, 0.3)"
        borderRadius="20px" 
        boxShadow="0 12px 48px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.1)"
        p={8}
        position="relative"
        zIndex={2}
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
              P.I.D.R. TEST
            </Text>
            <Text color="#e2e8f0" fontSize="lg" mb={4}>
              Тестовая авторизация
            </Text>
          </Box>

          {/* Status Messages */}
          {error && (
            <Alert.Root status="error">
              <Alert.Indicator />
              <Alert.Content borderRadius="md" p={3} bg="red.100" color="red.800">
                ❌ {error}
              </Alert.Content>
            </Alert.Root>
          )}

          {success && (
            <Alert.Root status="success">
              <Alert.Indicator />
              <Alert.Content borderRadius="md" p={3} bg="green.100" color="green.800">
                {success}
              </Alert.Content>
            </Alert.Root>
          )}

          {/* Test Telegram Login */}
          <Button
            onClick={handleTestTelegramLogin}
            size="lg"
            w="full"
            disabled={loading}
            bg="linear-gradient(135deg, rgba(34, 139, 230, 0.8) 0%, rgba(29, 78, 216, 0.6) 100%)"
            border="1px solid"
            borderColor="rgba(34, 139, 230, 0.4)"
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
              bg: 'linear-gradient(135deg, rgba(29, 78, 216, 0.9) 0%, rgba(30, 64, 175, 0.8) 100%)',
              color: '#ffd700',
              transform: 'translateY(-2px)',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3), 0 0 20px rgba(255, 215, 0, 0.1)'
            }}
          >
            <FaTelegram style={{ marginRight: 12 }} size={20} />
            {loading ? 'ТЕСТ...' : 'ТЕСТ TELEGRAM ВХОД'}
          </Button>

          {/* Test Local Login */}
          <VStack gap={4} w="full">
            <Text color="#e2e8f0" fontSize="md" textAlign="center">
              Или тест локального входа:
            </Text>
            
            <Input
              placeholder="Логин"
              value={credentials.username}
              onChange={(e) => setCredentials(prev => ({ ...prev, username: e.target.value }))}
              bg="linear-gradient(135deg, rgba(15, 23, 42, 0.8) 0%, rgba(30, 41, 59, 0.6) 100%)"
              backdropFilter="blur(10px)"
              border="1px solid"
              borderColor="rgba(34, 197, 94, 0.3)"
              borderRadius="12px"
              color="#e2e8f0"
              _placeholder={{ color: '#64748b' }}
            />
            
            <Input
              type="password"
              placeholder="Пароль (минимум 6 символов)"
              value={credentials.password}
              onChange={(e) => setCredentials(prev => ({ ...prev, password: e.target.value }))}
              bg="linear-gradient(135deg, rgba(15, 23, 42, 0.8) 0%, rgba(30, 41, 59, 0.6) 100%)"
              backdropFilter="blur(10px)"
              border="1px solid"
              borderColor="rgba(34, 197, 94, 0.3)"
              borderRadius="12px"
              color="#e2e8f0"
              _placeholder={{ color: '#64748b' }}
            />

            <Button
              onClick={handleTestLocalLogin}
              size="lg"
              w="full"
              disabled={loading}
              bg="linear-gradient(135deg, rgba(34, 197, 94, 0.8) 0%, rgba(22, 163, 74, 0.6) 100%)"
              border="1px solid"
              borderColor="rgba(34, 197, 94, 0.4)"
              borderRadius="16px"
              color="#e2e8f0"
              fontWeight="600"
              _hover={{
                borderColor: 'rgba(255, 215, 0, 0.6)',
                color: '#ffd700'
              }}
            >
              {loading ? 'ТЕСТ...' : 'ТЕСТ ЛОКАЛЬНЫЙ ВХОД'}
            </Button>
          </VStack>

          {/* Back Link */}
          <Text textAlign="center" color="#94a3b8" fontSize="0.9rem">
            <Button
              variant="ghost"
              color="#22c55e"
              onClick={() => router.push('/auth/login')}
              _hover={{ color: '#ffd700' }}
            >
              ← Вернуться к обычному входу
            </Button>
          </Text>
        </VStack>
      </Box>
    </Box>
  );
}
