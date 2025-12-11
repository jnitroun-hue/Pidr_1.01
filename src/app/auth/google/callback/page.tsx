"use client";

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Box, Spinner, Text, Alert, VStack } from '@chakra-ui/react';

function GoogleCallbackContent() {
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const handleGoogleCallback = async () => {
      try {
        const code = searchParams.get('code');
        const error = searchParams.get('error');

        if (error) {
          setStatus('error');
          setMessage(`Ошибка авторизации: ${error}`);
          setTimeout(() => router.push('/auth/login'), 3000);
          return;
        }

        if (!code) {
          setStatus('error');
          setMessage('Отсутствует код авторизации');
          setTimeout(() => router.push('/auth/login'), 3000);
          return;
        }

        const response = await fetch('/api/auth/google', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            code,
            redirect_uri: `${window.location.origin}/auth/google/callback`
          })
        });

        const data = await response.json();

        if (data.success) {
          localStorage.setItem('auth_token', data.token);
          localStorage.setItem('user', JSON.stringify(data.user));
          
          setStatus('success');
          setMessage(data.message || 'Успешная авторизация!');
          
          // Проверяем реферальный код
          const pendingReferral = localStorage.getItem('pending_referral_code');
          if (pendingReferral) {
            await handlePendingReferral(pendingReferral, data.token);
          }

          setTimeout(() => router.push('/'), 2000);
        } else {
          setStatus('error');
          setMessage(data.message || 'Ошибка авторизации');
          setTimeout(() => router.push('/auth/login'), 3000);
        }
      } catch (error) {
        console.error('Google callback error:', error);
        setStatus('error');
        setMessage('Ошибка сети');
        setTimeout(() => router.push('/auth/login'), 3000);
      }
    };

    handleGoogleCallback();
  }, [searchParams, router]);

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

      if (response.ok) {
        localStorage.removeItem('pending_referral_code');
      }
    } catch (error) {
      console.error('Error processing pending referral:', error);
    }
  };

  return (
    <Box 
      minH="100vh" 
      bg="linear-gradient(135deg, #667eea 0%, #764ba2 100%)" 
      display="flex" 
      alignItems="center" 
      justifyContent="center" 
      p={4}
    >
      <VStack 
        gap={6} 
        bg="white" 
        borderRadius="xl" 
        boxShadow="2xl" 
        p={8} 
        maxW="400px" 
        w="full"
        textAlign="center"
      >
        {status === 'loading' && (
          <>
            <Spinner size="xl" color="blue.500" />
            <Text fontSize="lg" fontWeight="medium" color="gray.700">
              Авторизация через Google...
            </Text>
            <Text fontSize="sm" color="gray.500">
              Пожалуйста, подождите
            </Text>
          </>
        )}

        {status === 'success' && (
          <>
            <Box
              w="16"
              h="16"
              bg="green.100"
              borderRadius="full"
              display="flex"
              alignItems="center"
              justifyContent="center"
            >
              <Text fontSize="2xl">✅</Text>
            </Box>
            <Alert.Root status="success">
              <Alert.Indicator />
              <Alert.Content borderRadius="md" p={3} bg="green.100" color="green.800">
                ✅ {message}
              </Alert.Content>
            </Alert.Root>
            <Text fontSize="sm" color="gray.500">
              Перенаправление в игру...
            </Text>
          </>
        )}

        {status === 'error' && (
          <>
            <Box
              w="16"
              h="16"
              bg="red.100"
              borderRadius="full"
              display="flex"
              alignItems="center"
              justifyContent="center"
            >
              <Text fontSize="2xl">❌</Text>
            </Box>
            <Alert.Root status="error">
              <Alert.Indicator />
              <Alert.Content borderRadius="md" p={3} bg="red.100" color="red.800">
                ❌ {message}
              </Alert.Content>
            </Alert.Root>
            <Text fontSize="sm" color="gray.500">
              Перенаправление на страницу входа...
            </Text>
          </>
        )}
      </VStack>
    </Box>
  );
}

export default function GoogleCallbackPage() {
  return (
    <Suspense fallback={
      <Box minH="100vh" bg="linear-gradient(135deg, #ea4335 0%, #db4437 100%)" display="flex" alignItems="center" justifyContent="center">
        <VStack gap={4}>
          <Spinner size="xl" color="white" />
          <Text color="white" fontSize="lg">Обработка авторизации Google...</Text>
        </VStack>
      </Box>
    }>
      <GoogleCallbackContent />
    </Suspense>
  );
}
