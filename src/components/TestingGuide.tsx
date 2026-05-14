"use client";

import { Box, VStack, HStack, Text, Badge, Code, Alert } from '@chakra-ui/react';
import { FaCheck, FaExclamationTriangle, FaInfo } from 'react-icons/fa';

export default function TestingGuide() {
  const bg = 'white';
  const borderColor = 'gray.200';

  const testScenarios = [
    {
      category: 'Аутентификация',
      status: 'ready',
      tests: [
        {
          name: 'Локальная регистрация',
          description: 'Создание аккаунта с логином, email и паролем',
          steps: [
            'Перейти на /auth/register',
            'Заполнить форму: username (3-32 символа), email, пароль (6+ символов с буквами и цифрами)',
            'Подтвердить пароль',
            'Нажать "Создать аккаунт"',
            'Проверить, что пользователь перенаправлен на главную страницу'
          ],
          expected: 'Пользователь создан, получен JWT токен, сохранен в cookies'
        },
        {
          name: 'Локальный вход',
          description: 'Вход по логину и паролю',
          steps: [
            'Перейти на /auth/login',
            'Ввести логин и пароль',
            'Нажать "Войти"',
            'Проверить перенаправление на главную'
          ],
          expected: 'Успешный вход, JWT токен сохранен'
        },
        {
          name: 'Telegram авторизация',
          description: 'Вход через Telegram WebApp',
          steps: [
            'Открыть приложение в Telegram WebApp',
            'На странице входа нажать "Войти через Telegram"',
            'Проверить автоматическое создание/обновление пользователя'
          ],
          expected: 'Пользователь авторизован через Telegram данные'
        }
      ]
    },
    {
      category: 'Управление комнатами',
      status: 'ready',
      tests: [
        {
          name: 'Создание комнаты',
          description: 'Создание новой игровой комнаты',
          steps: [
            'Авторизоваться в системе',
            'Перейти на создание комнаты',
            'Выбрать настройки: количество игроков, приватность, пароль (опционально)',
            'Создать комнату',
            'Проверить генерацию уникального кода комнаты'
          ],
          expected: 'Комната создана, пользователь добавлен как хост'
        },
        {
          name: 'Предотвращение дубликатов',
          description: 'Система должна предотвращать повторное присоединение к комнате',
          steps: [
            'Создать комнату пользователем A',
            'Попытаться создать еще одну комнату тем же пользователем',
            'Попытаться присоединиться к своей же комнате'
          ],
          expected: 'Ошибки: "У вас уже есть активная комната", "Вы уже в этой комнате"'
        },
        {
          name: 'Присоединение к комнате',
          description: 'Присоединение по коду комнаты',
          steps: [
            'Пользователь B вводит код комнаты пользователя A',
            'Если есть пароль - ввести пароль',
            'Присоединиться к комнате',
            'Проверить отображение в списке игроков'
          ],
          expected: 'Пользователь добавлен в комнату, обновлен счетчик игроков'
        },
        {
          name: 'Закрытие комнаты создателем',
          description: 'Только создатель может закрыть комнату',
          steps: [
            'Создать комнату',
            'Пригласить других игроков',
            'Нажать "Закрыть комнату" (кнопка видна только создателю)',
            'Проверить удаление всех игроков и комнаты'
          ],
          expected: 'Комната закрыта, все игроки исключены, статус "online"'
        },
        {
          name: 'Выход из комнаты',
          description: 'Покидание комнаты обычным игроком',
          steps: [
            'Присоединиться к чужой комнате',
            'Нажать "Выйти"',
            'Проверить удаление из списка игроков',
            'Создатель покидает комнату - права передаются следующему игроку'
          ],
          expected: 'Игрок удален, счетчик обновлен, права хоста переданы при необходимости'
        }
      ]
    },
    {
      category: 'Безопасность',
      status: 'ready',
      tests: [
        {
          name: 'Middleware авторизации',
          description: 'Проверка защищенных маршрутов',
          steps: [
            'Без авторизации попытаться зайти на /profile, /game, /multiplayer',
            'Проверить перенаправление на /auth/login',
            'Авторизоваться и попытаться зайти на /auth/login, /auth/register',
            'Проверить перенаправление на главную страницу'
          ],
          expected: 'Корректные перенаправления в зависимости от статуса авторизации'
        },
        {
          name: 'JWT токен валидация',
          description: 'Проверка валидности токенов',
          steps: [
            'Авторизоваться и получить токен',
            'Подделать токен в браузере',
            'Попытаться обратиться к защищенному API',
            'Проверить возврат 401 Unauthorized'
          ],
          expected: 'Недействительные токены отклоняются'
        }
      ]
    }
  ];

  const envVariables = [
    { name: 'JWT_SECRET', required: true, description: 'Секретный ключ для JWT токенов' },
    { name: 'SUPABASE_URL', required: true, description: 'URL базы данных Supabase' },
    { name: 'SUPABASE_ANON_KEY', required: true, description: 'Публичный ключ Supabase' },
    { name: 'BOT_TOKEN', required: true, description: 'Telegram Bot Token' },
    { name: 'NEXT_PUBLIC_GOOGLE_CLIENT_ID', required: false, description: 'Google OAuth Client ID' },
    { name: 'GOOGLE_CLIENT_SECRET', required: false, description: 'Google OAuth Client Secret' },
    { name: 'NEXT_PUBLIC_VK_CLIENT_ID', required: false, description: 'VK OAuth Client ID' },
    { name: 'VK_CLIENT_SECRET', required: false, description: 'VK OAuth Client Secret' },
  ];

  return (
    <Box maxW="6xl" mx="auto" p={6}>
      <VStack gap={8} align="stretch">
        {/* Header */}
        <Box>
          <Text fontSize="3xl" fontWeight="bold" color="blue.600" mb={2}>
            🧪 P.I.D.R. Testing Guide
          </Text>
          <Text color="gray.600" fontSize="lg">
            Руководство по тестированию для превью перед инвесторами
          </Text>
        </Box>

        {/* Environment Variables */}
        <Box bg={bg} p={6} borderRadius="xl" border="1px" borderColor={borderColor}>
          <HStack mb={4}>
            <FaInfo color="blue" />
            <Text fontSize="xl" fontWeight="semibold">Переменные окружения</Text>
          </HStack>
          <VStack gap={3} align="stretch">
            {envVariables.map((env) => (
              <HStack key={env.name} justify="space-between" p={3} bg="gray.50" borderRadius="md">
                <VStack align="start" gap={1}>
                  <Code colorScheme="blue">{env.name}</Code>
                  <Text fontSize="sm" color="gray.600">{env.description}</Text>
                </VStack>
                <Badge colorScheme={env.required ? 'red' : 'gray'}>
                  {env.required ? 'Обязательно' : 'Опционально'}
                </Badge>
              </HStack>
            ))}
          </VStack>
        </Box>

        {/* Test Scenarios */}
        <Box bg={bg} p={6} borderRadius="xl" border="1px" borderColor={borderColor}>
          <HStack mb={6}>
            <FaCheck color="green" />
            <Text fontSize="xl" fontWeight="semibold">Сценарии тестирования</Text>
          </HStack>

          <VStack gap={4}>
            {testScenarios.map((category, categoryIndex) => (
              <Box key={categoryIndex} border="1px solid" borderColor="gray.200" borderRadius="lg">
                <Box p={4} bg="gray.50" borderTopRadius="lg">
                  <HStack>
                    <Badge 
                      colorScheme={category.status === 'ready' ? 'green' : 'yellow'}
                      variant="solid"
                    >
                      {category.status === 'ready' ? 'Готово к тестированию' : 'В разработке'}
                    </Badge>
                    <Text fontWeight="semibold" fontSize="lg">{category.category}</Text>
                  </HStack>
                </Box>
                <Box p={4}>
                  <VStack gap={6} align="stretch">
                    {category.tests.map((test, testIndex) => (
                      <Box key={testIndex} p={4} bg="gray.50" borderRadius="lg">
                        <VStack align="stretch" gap={3}>
                          <HStack justify="space-between">
                            <Text fontWeight="bold" color="blue.600">{test.name}</Text>
                          </HStack>
                          
                          <Text color="gray.700" fontSize="sm">{test.description}</Text>
                          
                          <Box height="1px" bg="gray.300" />
                          
                          <Box>
                            <Text fontWeight="semibold" mb={2} color="gray.800">Шаги:</Text>
                            <VStack align="stretch" gap={1}>
                              {test.steps.map((step, stepIndex) => (
                                <HStack key={stepIndex}>
                                  <Badge size="sm" colorScheme="blue">{stepIndex + 1}</Badge>
                                  <Text fontSize="sm">{step}</Text>
                                </HStack>
                              ))}
                            </VStack>
                          </Box>
                          
                          <Box>
                            <Text fontWeight="semibold" color="green.600">Ожидаемый результат:</Text>
                            <Text fontSize="sm" color="gray.700">{test.expected}</Text>
                          </Box>
                        </VStack>
                      </Box>
                    ))}
                  </VStack>
                </Box>
              </Box>
            ))}
          </VStack>
        </Box>

        {/* Critical Warnings */}
        <Box>
          <Alert.Root status="warning">
            <Alert.Indicator />
            <Alert.Content borderRadius="lg">
              <Text fontWeight="bold">⚠️ Важно для превью:</Text>
              <VStack align="start" mt={2} gap={1}>
                <Text>• Убедитесь, что база данных Supabase настроена с актуальной схемой</Text>
                <Text>• Проверьте все переменные окружения перед демонстрацией</Text>
                <Text>• Протестируйте создание/закрытие комнат и предотвращение дубликатов</Text>
                <Text>• Проверьте работу системы авторизации (middleware)</Text>
                <Text>• Убедитесь в стабильности Telegram WebApp интеграции</Text>
              </VStack>
            </Alert.Content>
          </Alert.Root>
        </Box>

        {/* Quick Start */}
        <Box bg="blue.50" p={6} borderRadius="xl">
          <Text fontSize="lg" fontWeight="bold" color="blue.700" mb={3}>
            🚀 Быстрый старт для демонстрации:
          </Text>
          <VStack align="start" gap={2}>
            <Text>1. <Code>npm run dev</Code> - запустить development сервер</Text>
            <Text>2. Открыть <Code>http://localhost:3000</Code></Text>
            <Text>3. Зарегистрировать тестового пользователя через /auth/register</Text>
            <Text>4. Создать комнату и продемонстрировать функциональность</Text>
            <Text>5. Показать защиту от дубликатов (попытка создать вторую комнату)</Text>
          </VStack>
        </Box>
      </VStack>
    </Box>
  );
}
