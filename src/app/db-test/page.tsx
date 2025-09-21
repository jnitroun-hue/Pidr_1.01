'use client';

import { useState, useEffect } from 'react';
import { Box, Button, Text, VStack, HStack, Badge, Alert, Spinner } from '@chakra-ui/react';

interface TableStatus {
  exists: boolean;
  count: number;
  error: string | null;
}

interface DatabaseStatus {
  hasSupabase: boolean;
  tables: Record<string, TableStatus>;
  summary: {
    total: number;
    existing: number;
    missing: number;
    ready: boolean;
  };
}

export default function DatabaseTestPage() {
  const [loading, setLoading] = useState(false);
  const [dbStatus, setDbStatus] = useState<DatabaseStatus | null>(null);
  const [testResults, setTestResults] = useState<any>(null);

  const checkDatabase = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/pidr-db');
      const data = await response.json();
      setDbStatus(data);
      console.log('📊 Database status:', data);
    } catch (error) {
      console.error('❌ Error checking database:', error);
    } finally {
      setLoading(false);
    }
  };

  const createTables = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/pidr-db', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'create-tables' })
      });
      const data = await response.json();
      setTestResults(data);
      console.log('🏗️ Create tables result:', data);
      
      // Перепроверяем статус после создания
      setTimeout(() => checkDatabase(), 2000);
    } catch (error) {
      console.error('❌ Error creating tables:', error);
    } finally {
      setLoading(false);
    }
  };

  const testInsert = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/pidr-db', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'test-insert' })
      });
      const data = await response.json();
      setTestResults(data);
      console.log('🧪 Test insert result:', data);
      
      // Перепроверяем статус
      setTimeout(() => checkDatabase(), 1000);
    } catch (error) {
      console.error('❌ Error testing insert:', error);
    } finally {
      setLoading(false);
    }
  };

  const testRoom = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/pidr-db', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'test-room' })
      });
      const data = await response.json();
      setTestResults(data);
      console.log('🏠 Test room result:', data);
      
      // Перепроверяем статус
      setTimeout(() => checkDatabase(), 1000);
    } catch (error) {
      console.error('❌ Error testing room:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkDatabase();
  }, []);

  return (
    <Box 
      minH="100vh" 
      bg="linear-gradient(135deg, #0f172a 0%, #1e293b 100%)" 
      p={4}
    >
      <VStack gap={6} maxW="800px" mx="auto">
        {/* Header */}
        <Box textAlign="center">
          <Text fontSize="3xl" fontWeight="bold" color="gold" mb={2}>
            🎮 P.I.D.R. DATABASE TEST
          </Text>
          <Text color="gray.300" fontSize="lg">
            Проверка и тестирование базы данных для игры
          </Text>
        </Box>

        {/* Controls */}
        <HStack gap={4} wrap="wrap">
          <Button
            onClick={checkDatabase}
            disabled={loading}
            colorScheme="blue"
            leftIcon={loading ? <Spinner size="sm" /> : undefined}
          >
            {loading ? 'Проверяем...' : '🔍 Проверить БД'}
          </Button>

          <Button
            onClick={createTables}
            disabled={loading}
            colorScheme="green"
            leftIcon={loading ? <Spinner size="sm" /> : undefined}
          >
            {loading ? 'Создаем...' : '🏗️ Создать таблицы'}
          </Button>

          <Button
            onClick={testInsert}
            disabled={loading || !dbStatus?.summary.ready}
            colorScheme="purple"
            leftIcon={loading ? <Spinner size="sm" /> : undefined}
          >
            {loading ? 'Тестируем...' : '🧪 Тест пользователя'}
          </Button>

          <Button
            onClick={testRoom}
            disabled={loading || !dbStatus?.summary.ready}
            colorScheme="orange"
            leftIcon={loading ? <Spinner size="sm" /> : undefined}
          >
            {loading ? 'Тестируем...' : '🏠 Тест комнаты'}
          </Button>
        </HStack>

        {/* Database Status */}
        {dbStatus && (
          <Box 
            w="full" 
            bg="rgba(15, 23, 42, 0.8)" 
            border="1px solid" 
            borderColor="gray.600" 
            borderRadius="lg" 
            p={6}
          >
            <VStack spacing={4} align="start">
              <HStack>
                <Text fontSize="xl" fontWeight="bold" color="white">
                  📊 Статус базы данных
                </Text>
                <Badge 
                  colorScheme={dbStatus.hasSupabase ? 'green' : 'red'}
                  fontSize="sm"
                >
                  {dbStatus.hasSupabase ? 'Supabase подключен' : 'Supabase не настроен'}
                </Badge>
              </HStack>

              {dbStatus.hasSupabase && (
                <HStack spacing={6}>
                  <VStack align="start" spacing={1}>
                    <Text color="gray.300" fontSize="sm">Всего таблиц</Text>
                    <Text color="white" fontSize="2xl" fontWeight="bold">
                      {dbStatus.summary.total}
                    </Text>
                  </VStack>
                  
                  <VStack align="start" spacing={1}>
                    <Text color="gray.300" fontSize="sm">Существует</Text>
                    <Text color="green.400" fontSize="2xl" fontWeight="bold">
                      {dbStatus.summary.existing}
                    </Text>
                  </VStack>
                  
                  <VStack align="start" spacing={1}>
                    <Text color="gray.300" fontSize="sm">Отсутствует</Text>
                    <Text color="red.400" fontSize="2xl" fontWeight="bold">
                      {dbStatus.summary.missing}
                    </Text>
                  </VStack>

                  <VStack align="start" spacing={1}>
                    <Text color="gray.300" fontSize="sm">Статус</Text>
                    <Badge 
                      colorScheme={dbStatus.summary.ready ? 'green' : 'yellow'}
                      fontSize="lg"
                      px={3}
                      py={1}
                    >
                      {dbStatus.summary.ready ? '✅ Готово' : '⚠️ Не готово'}
                    </Badge>
                  </VStack>
                </HStack>
              )}

              {/* Tables List */}
              {dbStatus.hasSupabase && Object.keys(dbStatus.tables).length > 0 && (
                <Box w="full">
                  <Text fontSize="lg" fontWeight="bold" color="white" mb={3}>
                    📋 Таблицы P.I.D.R.
                  </Text>
                  <VStack spacing={2} align="stretch">
                    {Object.entries(dbStatus.tables).map(([tableName, status]) => (
                      <HStack 
                        key={tableName}
                        justify="space-between"
                        p={3}
                        bg="rgba(30, 41, 59, 0.5)"
                        borderRadius="md"
                        border="1px solid"
                        borderColor={status.exists ? 'green.600' : 'red.600'}
                      >
                        <VStack align="start" spacing={0}>
                          <Text color="white" fontWeight="bold">
                            {tableName}
                          </Text>
                          {status.error && (
                            <Text color="red.400" fontSize="sm">
                              {status.error}
                            </Text>
                          )}
                        </VStack>

                        <HStack>
                          {status.exists && (
                            <Badge colorScheme="blue" fontSize="sm">
                              {status.count} записей
                            </Badge>
                          )}
                          <Badge 
                            colorScheme={status.exists ? 'green' : 'red'}
                            fontSize="sm"
                          >
                            {status.exists ? '✅ Есть' : '❌ Нет'}
                          </Badge>
                        </HStack>
                      </HStack>
                    ))}
                  </VStack>
                </Box>
              )}
            </VStack>
          </Box>
        )}

        {/* Test Results */}
        {testResults && (
          <Box 
            w="full" 
            bg="rgba(15, 23, 42, 0.8)" 
            border="1px solid" 
            borderColor="gray.600" 
            borderRadius="lg" 
            p={6}
          >
            <Text fontSize="xl" fontWeight="bold" color="white" mb={4}>
              🧪 Результаты тестирования
            </Text>
            
            <Alert.Root 
              status={testResults.success ? 'success' : 'error'}
              mb={4}
            >
              <Alert.Indicator />
              <Alert.Content>
                <Text fontWeight="bold">
                  {testResults.success ? '✅ Успешно' : '❌ Ошибка'}
                </Text>
                <Text>{testResults.message}</Text>
              </Alert.Content>
            </Alert.Root>

            {testResults.data && (
              <Box 
                bg="gray.800" 
                p={4} 
                borderRadius="md" 
                border="1px solid" 
                borderColor="gray.600"
              >
                <Text color="gray.300" fontSize="sm" mb={2}>Данные:</Text>
                <Text 
                  color="green.400" 
                  fontFamily="mono" 
                  fontSize="sm" 
                  whiteSpace="pre-wrap"
                >
                  {JSON.stringify(testResults.data, null, 2)}
                </Text>
              </Box>
            )}

            {testResults.results && (
              <Box mt={4}>
                <Text color="white" fontWeight="bold" mb={2}>
                  Детали выполнения:
                </Text>
                <VStack spacing={2} align="stretch">
                  {testResults.results.slice(0, 10).map((result: any, index: number) => (
                    <HStack 
                      key={index}
                      justify="space-between"
                      p={2}
                      bg={result.success ? "green.900" : "red.900"}
                      borderRadius="md"
                      fontSize="sm"
                    >
                      <Text color="white">
                        Команда {result.command}
                      </Text>
                      <Text color={result.success ? "green.300" : "red.300"}>
                        {result.success ? '✅' : `❌ ${result.error}`}
                      </Text>
                    </HStack>
                  ))}
                  {testResults.results.length > 10 && (
                    <Text color="gray.400" fontSize="sm" textAlign="center">
                      ... и еще {testResults.results.length - 10} команд
                    </Text>
                  )}
                </VStack>
              </Box>
            )}
          </Box>
        )}

        {/* Back Button */}
        <Button
          onClick={() => window.history.back()}
          variant="outline"
          colorScheme="gray"
          size="lg"
        >
          ← Назад в игру
        </Button>
      </VStack>
    </Box>
  );
}
