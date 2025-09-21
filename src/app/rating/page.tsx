'use client'
import { Box, Flex, Text, Button, Grid, VStack } from '@chakra-ui/react';
import { motion } from 'framer-motion';
import { FaArrowLeft, FaTrophy, FaArrowUp, FaArrowDown } from 'react-icons/fa';
import BottomNav from '../../components/BottomNav';

export default function RatingPage() {
  return (
    <Box minH="100vh" bgGradient="linear(to-br, #0f2027, #2c5364)" pb={20}>
      <Flex as="header" align="center" justify="space-between" px={4} py={3} borderBottomWidth={1} borderColor="#232b3e" bg="transparent" position="sticky" top={0} zIndex={20}>
        <Button variant="ghost" color="white" _hover={{ color: '#ffd700' }} onClick={() => history.back()}>
          <FaArrowLeft style={{marginRight: 8}} />
          <Text display={{ base: 'none', sm: 'inline' }}>Назад</Text>
        </Button>
        <Text fontSize="lg" fontWeight="bold" color="#ffd700">Рейтинг</Text>
        <Box />
      </Flex>
      <Box as="main" maxW="lg" mx="auto" px={2}>
        {/* Рейтинг */}
        <motion.section initial={{opacity:0, y:20}} animate={{opacity:1, y:0}} transition={{duration:0.3}}>
          <Box bg="#232b3e" borderRadius="xl" boxShadow="lg" p={6} mt={6} mb={4}>
            <Flex align="center" gap={4} mb={4}>
              <Text fontSize="5xl" fontWeight="bold" color="#ffd700">2350</Text>
              <Box flex={1}>
                <Text fontSize="xs" color="gray.400" mb={1}>Текущий рейтинг</Text>
                <Box display="inline-block" bg="#ffd70010" border="1px solid #ffd700" borderRadius="2xl" px={3} py={1} fontSize="xs" color="#ffd700" fontWeight="bold" mb={2}><FaTrophy style={{display:'inline',marginRight:4}} />Золотой игрок</Box>
                <Box w="full" h={2} bg="#232b3e" borderRadius="md" mt={2} overflow="hidden">
                  <Box h={2} bgGradient="linear(to-r, #ffd700, #ffa500)" borderRadius="md" width="23.5%" />
                </Box>
                <Flex justify="space-between" fontSize="xs" color="gray.400" mt={1}>
                  <span>0</span><span>2500</span><span>5000</span><span>7500</span><span>10000</span>
                </Flex>
              </Box>
            </Flex>
          </Box>
        </motion.section>
        {/* История игр */}
        <motion.section initial={{opacity:0, y:20}} animate={{opacity:1, y:0}} transition={{duration:0.3}}>
          <Box bg="#232b3e" borderRadius="xl" boxShadow="lg" p={6} mb={4}>
            <Text color="#ffd700" fontWeight={600} fontSize="md" mt={8} mb={2}>История игр</Text>
            <VStack gap={3} align="stretch">
              <Flex bg="#232b3e" borderRadius="xl" p={4} align="center" justify="space-between">
                <Box>
                  <Text fontWeight={600} color="white">Рейтинговая игра</Text>
                  <Text fontSize="xs" color="gray.400">24 марта 2024, 15:30</Text>
                </Box>
                <Flex align="center" gap={2}>
                  <Text color="green.400" fontWeight="bold">+25</Text>
                  <FaArrowUp color="#38a169" />
                </Flex>
              </Flex>
              <Flex bg="#232b3e" borderRadius="xl" p={4} align="center" justify="space-between">
                <Box>
                  <Text fontWeight={600} color="white">Рейтинговая игра</Text>
                  <Text fontSize="xs" color="gray.400">24 марта 2024, 14:15</Text>
                </Box>
                <Flex align="center" gap={2}>
                  <Text color="red.400" fontWeight="bold">-15</Text>
                  <FaArrowDown color="#e53e3e" />
                </Flex>
              </Flex>
              <Flex bg="#232b3e" borderRadius="xl" p={4} align="center" justify="space-between">
                <Box>
                  <Text fontWeight={600} color="white">Рейтинговая игра</Text>
                  <Text fontSize="xs" color="gray.400">24 марта 2024, 12:45</Text>
                </Box>
                <Flex align="center" gap={2}>
                  <Text color="green.400" fontWeight="bold">+30</Text>
                  <FaArrowUp color="#38a169" />
                </Flex>
              </Flex>
            </VStack>
          </Box>
        </motion.section>
      </Box>
      <BottomNav />
    </Box>
  );
} 