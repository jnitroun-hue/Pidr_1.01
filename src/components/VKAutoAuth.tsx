"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { isVKMiniApp, loginWithVKMiniApp } from '@/lib/auth/vk-bridge';
import { Box, Text, Spinner, VStack } from '@chakra-ui/react';

/**
 * Компонент для автоматической авторизации через VK Mini App
 * Используется на странице входа/регистрации
 */
export default function VKAutoAuth() {
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    // Проверяем, запущено ли приложение в VK Mini App
    if (!isVKMiniApp()) {
      return;
    }

    // Проверяем, авторизован ли пользователь уже
    const existingToken = localStorage.getItem('auth_token');
    if (existingToken) {
      console.log('✅ Пользователь уже авторизован');
      return;
    }

    // Автоматически авторизуемся через VK
    handleVKAuth();
  }, []);

  const handleVKAuth = async () => {
    setIsAuthenticating(true);
    setError(null);

    try {
      console.log('🔄 Начинаем VK авторизацию...');
      const result = await loginWithVKMiniApp();

      if (result.success && result.user) {
        console.log('✅ VK авторизация успешна:', result.user);

        // Диспатчим событие обновления монет
        window.dispatchEvent(new CustomEvent('coinsUpdated', { 
          detail: { coins: result.user.coins } 
        }));

        // Перенаправляем на главную страницу
        setTimeout(() => {
          router.replace('/');
        }, 1000);
      } else {
        console.error('❌ VK авторизация не удалась:', result.message);
        setError(result.message || 'Ошибка авторизации через VK');
        setIsAuthenticating(false);
      }
    } catch (error) {
      console.error('❌ Ошибка VK авторизации:', error);
      setError('Ошибка сети. Попробуйте позже.');
      setIsAuthenticating(false);
    }
  };

  // Показываем только если идет авторизация или есть ошибка
  if (!isAuthenticating && !error) {
    return null;
  }

  return (
    <Box
      position="fixed"
      top={0}
      left={0}
      right={0}
      bottom={0}
      bg="rgba(15, 23, 42, 0.95)"
      backdropFilter="blur(10px)"
      display="flex"
      alignItems="center"
      justifyContent="center"
      zIndex={9999}
    >
      <VStack gap={6}>
        {isAuthenticating && (
          <>
            <Spinner size="xl" color="#22c55e" thickness="4px" />
            <Text color="#e2e8f0" fontSize="lg" fontWeight="600">
              Авторизация через VK...
            </Text>
          </>
        )}
        
        {error && (
          <Box
            bg="rgba(239, 68, 68, 0.1)"
            border="1px solid rgba(239, 68, 68, 0.3)"
            borderRadius="12px"
            p={4}
            maxW="400px"
          >
            <Text color="#ef4444" fontSize="md" textAlign="center">
              ❌ {error}
            </Text>
          </Box>
        )}
      </VStack>
    </Box>
  );
}

