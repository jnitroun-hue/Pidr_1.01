'use client'
import { Box, Flex, Text, Button, Input, Grid, Image, VStack, HStack, Spinner } from '@chakra-ui/react';
import { motion } from 'framer-motion';
import { FaArrowLeft, FaCoins, FaPlus, FaGift, FaShoppingCart, FaStar, FaTelegram, FaShareAlt, FaWallet, FaLink, FaUnlink, FaEthereum } from 'react-icons/fa';
import { SiSolana } from 'react-icons/si';
import BottomNav from '../../components/BottomNav';
import { useWalletStore } from '../../store/walletStore';
import { useEffect } from 'react';
import { tonConnector } from '../../lib/wallets/ton-connector';
import { solanaConnector } from '../../lib/wallets/solana-connector';

export default function WalletPage() {
  const {
    tonAddress,
    tonBalance,
    isTonConnected,
    solanaAddress,
    solanaBalance,
    isSolanaConnected,
    ethereumAddress,
    ethereumBalance,
    isEthereumConnected,
    ethereumNetwork,
    isConnecting,
    error,
    connectTonWallet,
    disconnectTonWallet,
    connectSolanaWallet,
    disconnectSolanaWallet,
    connectEthereumWallet,
    disconnectEthereumWallet,
    updateBalances,
    clearError,
  } = useWalletStore();

  useEffect(() => {
    // Инициализация TON Connect при загрузке страницы
    tonConnector.init();
    
    // Проверяем подключенные кошельки
    if (tonConnector.isConnected()) {
      const wallet = tonConnector.getConnectedWallet();
      if (wallet) {
        useWalletStore.setState({
          tonAddress: wallet.account.address,
          isTonConnected: true,
        });
      }
    }
    
    // Обновляем балансы при загрузке
    updateBalances();
  }, []);

  useEffect(() => {
    if (error) {
      // Показываем ошибку в консоли, пока не разберемся с toaster в Chakra v3
      console.error('Wallet error:', error);
      clearError();
    }
  }, [error, clearError]);

  const formatAddress = (address: string) => {
    if (!address) return '';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  return (
    <Box minH="100vh" className="bg-gradient-to-br from-[#0f2027] via-[#232b3e] to-[#1e3c72] animate-gradient-move" pb={20}>
      <Flex direction="column" align="center" maxW="420px" mx="auto" w="100%" px={4}>
        {/* Header */}
        <Flex as="header" align="center" justify="space-between" w="100%" px={0} py={3} borderBottomWidth={1} borderColor="#232b3e" bg="transparent" position="sticky" top={0} zIndex={20} mb={2}>
          <Button variant="ghost" color="white" _hover={{ color: '#ffd700' }} onClick={() => history.back()}>
            <FaArrowLeft style={{marginRight: 8}} />
            <Text display={{ base: 'none', sm: 'inline' }}>Назад</Text>
          </Button>
          <Text fontSize="2xl" fontWeight="bold" color="#ffd700">Кошелёк</Text>
          <Box w={6} />
        </Flex>
        {/* Подключенные кошельки */}
        <Box bg="#232b3e" borderRadius="xl" boxShadow="lg" p={6} w="100%" mb={4}>
          <Text color="#ffd700" fontWeight={600} fontSize="md" mb={4}>Криптокошелек</Text>
          <VStack align="stretch" gap={3}>
            {/* TON Wallet */}
            <Flex align="center" justify="space-between" bg="#181f2a" borderRadius="lg" p={4}>
              <Flex align="center" gap={3}>
                <Box w={10} h={10} borderRadius="lg" bg="#0098EA" display="flex" alignItems="center" justifyContent="center">
                  <Text fontSize="lg" fontWeight="bold" color="white">TON</Text>
                </Box>
                <Box>
                  <Text fontWeight={600} color="white">Telegram Wallet</Text>
                  {isTonConnected && (
                    <Text fontSize="xs" color="gray.400">{formatAddress(tonAddress!)}</Text>
                  )}
                </Box>
              </Flex>
              <Button
                size="sm"
                colorScheme={isTonConnected ? 'red' : 'green'}
                onClick={isTonConnected ? disconnectTonWallet : connectTonWallet}
                loading={isConnecting}

              >
                {isTonConnected ? <><FaUnlink /> Отключить</> : <><FaLink /> Подключить</>}
              </Button>
            </Flex>
            
            {/* Solana Wallet */}
            <Flex align="center" justify="space-between" bg="#181f2a" borderRadius="lg" p={4}>
              <Flex align="center" gap={3}>
                <Box w={10} h={10} borderRadius="lg" bg="#9945FF" display="flex" alignItems="center" justifyContent="center">
                  <SiSolana size={24} color="white" />
                </Box>
                <Box>
                  <Text fontWeight={600} color="white">Phantom Wallet</Text>
                  {isSolanaConnected && (
                    <>
                      <Text fontSize="xs" color="gray.400">{formatAddress(solanaAddress!)}</Text>
                      <Text fontSize="xs" color="#ffd700">{solanaBalance.toFixed(4)} SOL</Text>
                    </>
                  )}
                </Box>
              </Flex>
              <Button
                size="sm"
                colorScheme={isSolanaConnected ? 'red' : 'purple'}
                onClick={isSolanaConnected ? disconnectSolanaWallet : connectSolanaWallet}
                loading={isConnecting}

              >
                {isSolanaConnected ? <><FaUnlink /> Отключить</> : <><FaLink /> Подключить</>}
              </Button>
            </Flex>
            
            {/* Ethereum Wallet */}
            <Flex align="center" justify="space-between" bg="#181f2a" borderRadius="lg" p={4}>
              <Flex align="center" gap={3}>
                <Box w={10} h={10} borderRadius="lg" bg="#627EEA" display="flex" alignItems="center" justifyContent="center">
                  <FaEthereum size={24} color="white" />
                </Box>
                <Box>
                  <Text fontWeight={600} color="white">MetaMask</Text>
                  {isEthereumConnected && (
                    <>
                      <Text fontSize="xs" color="gray.400">{formatAddress(ethereumAddress!)}</Text>
                      <Text fontSize="xs" color="#ffd700">{ethereumBalance.toFixed(4)} ETH</Text>
                      <Text fontSize="xs" color="gray.500">{ethereumNetwork}</Text>
                    </>
                  )}
                </Box>
              </Flex>
              <Button
                size="sm"
                colorScheme={isEthereumConnected ? 'red' : 'blue'}
                onClick={isEthereumConnected ? disconnectEthereumWallet : connectEthereumWallet}
                loading={isConnecting}
              >
                {isEthereumConnected ? <><FaUnlink /> Отключить</> : <><FaLink /> Подключить</>}
              </Button>
            </Flex>
          </VStack>
        </Box>
        
        {/* Игровой баланс */}
        <Box bg="#ffd700" color="#222" borderRadius="xl" boxShadow="lg" p={8} fontSize="4xl" fontWeight="bold" textAlign="center" mb={4} w="100%">
          <Flex fontSize="4xl" fontWeight="bold" color="#222" align="center" gap={2} justify="center"><FaCoins color="#222" /> 1000</Flex>
          <Text fontSize="lg" fontWeight="normal" mt={2}>игровых монет</Text>
          <Button px={4} py={2} borderRadius="lg" bg="#232b3e" color="#ffd700" fontWeight="bold" _hover={{ bg: 'gray.700', color: '#ffd700' }} mt={4}>
            <FaPlus style={{marginRight: 8}} />Пополнить
          </Button>
        </Box>
        {/* История транзакций */}
        <Box bg="#232b3e" borderRadius="xl" boxShadow="lg" p={6} w="100%" mb={4}>
          <Text color="#ffd700" fontWeight={600} fontSize="md" mb={4}>История транзакций</Text>
          <VStack align="stretch" gap={3}>
            <Flex align="center" gap={3}>
              <Flex w={10} h={10} borderRadius="lg" align="center" justify="center" bgGradient="linear(to-r, #ff4d4f, #ffd700)" color="white"><FaShoppingCart /></Flex>
              <Box flex={1}>
                <Text fontWeight={600} color="white">Покупка скина</Text>
                <Text fontSize="xs" color="gray.400">2 часа назад</Text>
              </Box>
              <Flex color="red.400" fontWeight="bold" align="center" gap={1}>-500 <FaCoins color="#ffd700" /></Flex>
            </Flex>
            <Flex align="center" gap={3}>
              <Flex w={10} h={10} borderRadius="lg" align="center" justify="center" bgGradient="linear(to-r, #ffd700, #ffb900)" color="white"><FaGift /></Flex>
              <Box flex={1}>
                <Text fontWeight={600} color="white">Бонус за победу</Text>
                <Text fontSize="xs" color="gray.400">5 часов назад</Text>
              </Box>
              <Flex color="green.400" fontWeight="bold" align="center" gap={1}>+100 <FaCoins color="#ffd700" /></Flex>
            </Flex>
            <Flex align="center" gap={3}>
              <Flex w={10} h={10} borderRadius="lg" align="center" justify="center" bgGradient="linear(to-r, #232b3e, #ffd700)" color="white"><FaStar /></Flex>
              <Box flex={1}>
                <Text fontWeight={600} color="white">Достижение разблокировано</Text>
                <Text fontSize="xs" color="gray.400">1 день назад</Text>
              </Box>
              <Flex color="green.400" fontWeight="bold" align="center" gap={1}>+250 <FaCoins color="#ffd700" /></Flex>
            </Flex>
          </VStack>
        </Box>
        {/* Способы пополнения */}
        <Box bg="#232b3e" borderRadius="xl" boxShadow="lg" p={6} w="100%" mb={4}>
          <Text color="#ffd700" fontWeight={600} fontSize="md" mb={4}>Способы пополнения</Text>
          <Grid templateColumns={{ base: '1fr', md: '1fr 1fr' }} gap={4}>
            <VStack bg="#181f2a" borderRadius="xl" p={4} align="center" textAlign="center" w="100%">
              <FaTelegram size={28} color="#4299e1" style={{ marginBottom: 8 }} />
              <Text color="white" fontWeight={600} mb={1}>Telegram Premium</Text>
              <Text fontSize="xs" color="gray.400" mb={2}>Получите +500 монет</Text>
              <Button w="full" px={4} py={2} borderRadius="lg" bg="#ffd700" color="#232b3e" fontWeight="bold" _hover={{ bg: 'yellow.400' }}>Активировать</Button>
            </VStack>
            <VStack bg="#181f2a" borderRadius="xl" p={4} align="center" textAlign="center" w="100%">
              <FaGift size={28} color="#ffd700" style={{ marginBottom: 8 }} />
              <Text color="white" fontWeight={600} mb={1}>Промокод</Text>
              <Text fontSize="xs" color="gray.400" mb={2}>Введите промокод</Text>
              <Input w="full" px={3} py={2} borderRadius="lg" bg="#232b3e" color="white" _focus={{ borderColor: '#ffd700' }} mb={2} placeholder="PIDR2024" />
              <Button w="full" px={4} py={2} borderRadius="lg" bg="#ffd700" color="#232b3e" fontWeight="bold" _hover={{ bg: 'yellow.400' }}>Применить</Button>
            </VStack>
            <VStack bg="#181f2a" borderRadius="xl" p={4} align="center" textAlign="center" w="100%">
              <FaShareAlt size={28} color="#38a169" style={{ marginBottom: 8 }} />
              <Text color="white" fontWeight={600} mb={1}>Поделиться</Text>
              <Text fontSize="xs" color="gray.400" mb={2}>+100 монет за приглашение</Text>
              <Button w="full" px={4} py={2} borderRadius="lg" bg="#ffd700" color="#232b3e" fontWeight="bold" _hover={{ bg: 'yellow.400' }}>Пригласить</Button>
            </VStack>
          </Grid>
        </Box>
        <BottomNav />
      </Flex>
    </Box>
  );
} 