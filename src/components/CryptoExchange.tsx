"use client";

import { useState, useEffect } from 'react';
import { Box, VStack, HStack, Text, Input, Button, Select, Alert } from '@chakra-ui/react';
import { FaExchangeAlt, FaCoins, FaBitcoin, FaEthereum } from 'react-icons/fa';
import { SiSolana } from 'react-icons/si';
import { useWalletStore } from '../store/walletStore';
import { CryptoType } from '../lib/wallets/wallet-service';

const cryptoIcons: Record<CryptoType, any> = {
  'TON': FaBitcoin,
  'SOL': SiSolana,
  'ETH': FaEthereum,
};

interface CryptoExchangeProps {
  onSuccess?: (amount: number) => void;
}

export default function CryptoExchange({ onSuccess }: CryptoExchangeProps) {
  const {
    exchangeRates,
    isExchanging,
    error,
    loadExchangeRates,
    exchangeCryptoToCoins,
    calculateGameCoins,
    clearError,
  } = useWalletStore();

  const [selectedCrypto, setSelectedCrypto] = useState<CryptoType>('TON');
  const [cryptoAmount, setCryptoAmount] = useState('');
  const [gameCoinsPreview, setGameCoinsPreview] = useState(0);

  useEffect(() => {
    loadExchangeRates();
  }, [loadExchangeRates]);

  useEffect(() => {
    const amount = parseFloat(cryptoAmount) || 0;
    const preview = calculateGameCoins(selectedCrypto, amount);
    setGameCoinsPreview(preview);
  }, [cryptoAmount, selectedCrypto, calculateGameCoins]);

  const handleExchange = async () => {
    const amount = parseFloat(cryptoAmount);
    if (!amount || amount <= 0) {
      return;
    }

    try {
      const result = await exchangeCryptoToCoins(selectedCrypto, amount);
      if (result.success) {
        setCryptoAmount('');
        setGameCoinsPreview(0);
        onSuccess?.(result.gameCoinsAdded);
      }
    } catch (error) {
      // Ошибка уже обработана в store
    }
  };

  const selectedRate = exchangeRates.find(rate => rate.crypto === selectedCrypto);
  const IconComponent = cryptoIcons[selectedCrypto];

  return (
    <Box
      bg="linear-gradient(135deg, rgba(15, 23, 42, 0.95) 0%, rgba(30, 41, 59, 0.90) 100%)"
      backdropFilter="blur(20px)"
      border="1px solid"
      borderColor="rgba(34, 197, 94, 0.3)"
      borderRadius="20px"
      boxShadow="0 12px 48px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.1)"
      p={6}
      maxW="500px"
      w="full"
    >
      <VStack gap={6}>
        {/* Header */}
        <HStack justify="center" gap={3}>
          <FaExchangeAlt color="#22c55e" size={24} />
          <Text
            fontSize="xl"
            fontWeight="700"
            color="#e2e8f0"
            letterSpacing="1px"
          >
            ОБМЕН КРИПТОВАЛЮТ
          </Text>
        </HStack>

        {/* Error Alert */}
        {error && (
          <Alert.Root status="error">
            <Alert.Indicator />
            <Alert.Content borderRadius="md" p={3} bg="red.100" color="red.800">
              ❌ {error}
            </Alert.Content>
          </Alert.Root>
        )}

        {/* Crypto Selection */}
        <Box w="full">
          <Text mb={3} fontWeight="600" color="#e2e8f0">
            Выберите криптовалюту
          </Text>
          <Select
            value={selectedCrypto}
            onChange={(e) => setSelectedCrypto(e.target.value as CryptoType)}
            bg="linear-gradient(135deg, rgba(15, 23, 42, 0.8) 0%, rgba(30, 41, 59, 0.6) 100%)"
            backdropFilter="blur(10px)"
            border="1px solid"
            borderColor="rgba(34, 197, 94, 0.3)"
            borderRadius="12px"
            color="#e2e8f0"
            _hover={{ borderColor: 'rgba(255, 215, 0, 0.4)' }}
            _focus={{ 
              borderColor: 'rgba(255, 215, 0, 0.6)', 
              boxShadow: '0 0 20px rgba(255, 215, 0, 0.1)' 
            }}
          >
            {exchangeRates.map((rate) => (
              <option key={rate.crypto} value={rate.crypto}>
                {rate.crypto} (1 = {rate.rate} монет)
              </option>
            ))}
          </Select>
        </Box>

        {/* Amount Input */}
        <Box w="full">
          <Text mb={3} fontWeight="600" color="#e2e8f0">
            Количество {selectedCrypto}
          </Text>
          <Box position="relative">
            <Input
              type="number"
              step="0.001"
              min="0"
              value={cryptoAmount}
              onChange={(e) => setCryptoAmount(e.target.value)}
              placeholder={`Мин. ${selectedRate?.minAmount || 0}`}
              bg="linear-gradient(135deg, rgba(15, 23, 42, 0.8) 0%, rgba(30, 41, 59, 0.6) 100%)"
              backdropFilter="blur(10px)"
              border="1px solid"
              borderColor="rgba(34, 197, 94, 0.3)"
              borderRadius="12px"
              color="#e2e8f0"
              _placeholder={{ color: '#64748b' }}
              _hover={{ borderColor: 'rgba(255, 215, 0, 0.4)' }}
              _focus={{ 
                borderColor: 'rgba(255, 215, 0, 0.6)', 
                boxShadow: '0 0 20px rgba(255, 215, 0, 0.1)' 
              }}
              pr="3rem"
            />
            <Box
              position="absolute"
              right={3}
              top="50%"
              transform="translateY(-50%)"
              color="#22c55e"
            >
              <IconComponent size={20} />
            </Box>
          </Box>
        </Box>

        {/* Preview */}
        {gameCoinsPreview > 0 && (
          <Box
            w="full"
            bg="linear-gradient(135deg, rgba(34, 197, 94, 0.1) 0%, rgba(22, 163, 74, 0.05) 100%)"
            border="1px solid"
            borderColor="rgba(34, 197, 94, 0.3)"
            borderRadius="16px"
            p={4}
          >
            <HStack justify="space-between" align="center">
              <VStack align="start" gap={1}>
                <Text fontSize="sm" color="#94a3b8">
                  Вы получите:
                </Text>
                <HStack>
                  <FaCoins color="#ffd700" size={20} />
                  <Text fontSize="xl" fontWeight="700" color="#ffd700">
                    {gameCoinsPreview.toLocaleString()} монет
                  </Text>
                </HStack>
              </VStack>
              <Box
                bg="linear-gradient(135deg, #22c55e 0%, #16a34a 100%)"
                borderRadius="50%"
                p={2}
              >
                <FaExchangeAlt color="white" size={16} />
              </Box>
            </HStack>
          </Box>
        )}

        {/* Exchange Rate Info */}
        {selectedRate && (
          <Box
            w="full"
            bg="linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(37, 99, 235, 0.05) 100%)"
            border="1px solid"
            borderColor="rgba(59, 130, 246, 0.3)"
            borderRadius="12px"
            p={3}
          >
            <VStack gap={2} fontSize="sm" color="#94a3b8">
              <HStack justify="space-between" w="full">
                <Text>Курс обмена:</Text>
                <Text color="#e2e8f0" fontWeight="600">
                  1 {selectedCrypto} = {selectedRate.rate} монет
                </Text>
              </HStack>
              <HStack justify="space-between" w="full">
                <Text>Минимальная сумма:</Text>
                <Text color="#e2e8f0" fontWeight="600">
                  {selectedRate.minAmount} {selectedCrypto}
                </Text>
              </HStack>
            </VStack>
          </Box>
        )}

        {/* Exchange Button */}
        <Button
          onClick={handleExchange}
          disabled={
            isExchanging || 
            !cryptoAmount || 
            parseFloat(cryptoAmount) < (selectedRate?.minAmount || 0)
          }
          size="lg"
          w="full"
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
          {isExchanging ? 'ОБМЕН...' : 'ОБМЕНЯТЬ'}
        </Button>
      </VStack>
    </Box>
  );
}
