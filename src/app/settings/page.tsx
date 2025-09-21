'use client'
import { Box, Flex, Text, Button, VStack } from '@chakra-ui/react';
import { motion } from 'framer-motion';
import { FaMoon, FaPalette, FaVolumeUp, FaBell, FaUser, FaTrash } from 'react-icons/fa';
import BottomNav from '../../components/BottomNav';

export default function SettingsPage() {
  return (
    <Box minH="100vh" bgGradient="linear(to-br, #181f2a, #232b3e)" pb={20}>
      <Flex as="header" align="center" justify="space-between" px={4} py={3} borderBottomWidth={1} borderColor="#232b3e" bg="#181f2a" position="sticky" top={0} zIndex={20}>
        <Box />
        <Text fontSize="lg" fontWeight="bold" color="#ffd700">Настройки</Text>
        <Box />
      </Flex>
      <Box as="main" maxW="lg" mx="auto" px={2}>
        {/* Внешний вид */}
        <motion.section initial={{opacity:0, y:20}} animate={{opacity:1, y:0}} transition={{duration:0.3}}>
          <Box bg="#232b3e" borderRadius="xl" p={4} mt={6} mb={4}>
            <Text color="#ffd700" fontWeight={600} fontSize="md" mb={2}>Внешний вид</Text>
            <VStack gap={4} align="stretch">
              <Flex align="center" justify="space-between">
                <Flex align="center" gap={3}>
                  <FaMoon size={20} color="#ffd700" />
                  <Box>
                    <Text fontWeight={600} color="white">Тёмная тема</Text>
                    <Text fontSize="xs" color="gray.400">Изменить цветовую схему приложения</Text>
                  </Box>
                </Flex>
                <input type="checkbox" style={{ accentColor: '#ffd700', width: 40, height: 24 }} />
              </Flex>
              <Flex align="center" justify="space-between">
                <Flex align="center" gap={3}>
                  <FaPalette size={20} color="#ffd700" />
                  <Box>
                    <Text fontWeight={600} color="white">Цветовая схема</Text>
                    <Text fontSize="xs" color="gray.400">Выберите основной цвет интерфейса</Text>
                  </Box>
                </Flex>
                <select style={{ background: '#181f2a', color: 'white', borderRadius: '0.5rem', width: 128, padding: 8 }}>
                  <option>Синий</option>
                  <option>Зелёный</option>
                  <option>Фиолетовый</option>
                  <option>Оранжевый</option>
                </select>
              </Flex>
            </VStack>
          </Box>
        </motion.section>
        {/* Игровой процесс */}
        <motion.section initial={{opacity:0, y:20}} animate={{opacity:1, y:0}} transition={{duration:0.3}}>
          <Box bg="#232b3e" borderRadius="xl" p={4} mb={4}>
            <Text color="#ffd700" fontWeight={600} fontSize="md" mb={2}>Игровой процесс</Text>
            <VStack gap={4} align="stretch">
              <Flex align="center" justify="space-between">
                <Flex align="center" gap={3}>
                  <FaVolumeUp size={20} color="#ffd700" />
                  <Box>
                    <Text fontWeight={600} color="white">Звуковые эффекты</Text>
                    <Text fontSize="xs" color="gray.400">Включить звуки в игре</Text>
                  </Box>
                </Flex>
                <input type="checkbox" style={{ accentColor: '#ffd700', width: 40, height: 24 }} defaultChecked />
              </Flex>
              <Flex align="center" justify="space-between">
                <Flex align="center" gap={3}>
                  <FaBell size={20} color="#ffd700" />
                  <Box>
                    <Text fontWeight={600} color="white">Уведомления</Text>
                    <Text fontSize="xs" color="gray.400">Получать уведомления о ходе игры</Text>
                  </Box>
                </Flex>
                <input type="checkbox" style={{ accentColor: '#ffd700', width: 40, height: 24 }} defaultChecked />
              </Flex>
            </VStack>
          </Box>
        </motion.section>
        {/* Аккаунт */}
        <motion.section initial={{opacity:0, y:20}} animate={{opacity:1, y:0}} transition={{duration:0.3}}>
          <Box bg="#232b3e" borderRadius="xl" p={4} mb={4}>
            <Text color="#ffd700" fontWeight={600} fontSize="md" mb={2}>Аккаунт</Text>
            <VStack gap={4} align="stretch">
              <Flex align="center" justify="space-between">
                <Flex align="center" gap={3}>
                  <FaUser size={20} color="#ffd700" />
                  <Box>
                    <Text fontWeight={600} color="white">Изменить никнейм</Text>
                    <Text fontSize="xs" color="gray.400">Текущий никнейм: Игрок #1</Text>
                  </Box>
                </Flex>
                <Button px={4} py={2} borderRadius="lg" bg="#ffd700" color="#232b3e" fontWeight="bold" _hover={{ bg: 'yellow.400' }}>Изменить</Button>
              </Flex>
              <Flex align="center" justify="space-between">
                <Flex align="center" gap={3}>
                  <FaTrash size={20} color="#ffd700" />
                  <Box>
                    <Text fontWeight={600} color="white">Удалить аккаунт</Text>
                    <Text fontSize="xs" color="gray.400">Это действие нельзя отменить</Text>
                  </Box>
                </Flex>
                <Button px={4} py={2} borderRadius="lg" bg="red.500" color="white" fontWeight="bold" _hover={{ bg: 'red.600' }}>Удалить</Button>
              </Flex>
            </VStack>
          </Box>
        </motion.section>
      </Box>
      <BottomNav />
    </Box>
  );
} 