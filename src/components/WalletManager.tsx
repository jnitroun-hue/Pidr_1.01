"use client";

import { useState, useEffect } from 'react';
import { Box, VStack, HStack, Text, Button, Tabs } from '@chakra-ui/react';
import { FaWallet, FaHistory, FaBitcoin, FaEthereum, FaCoins } from 'react-icons/fa';
import { SiSolana } from 'react-icons/si';
import { useWalletStore } from '../store/walletStore';
import CryptoExchange from './CryptoExchange';

const walletIcons = {
  'TON': { icon: FaBitcoin, color: '#0088ff' },
  'SOL': { icon: SiSolana, color: '#9945ff' },
  'ETH': { icon: FaEthereum, color: '#627eea' },
};

interface WalletManagerProps {
  showExchange?: boolean;
  onCoinsAdded?: (amount: number) => void;
}

export default function WalletManager({ showExchange = true, onCoinsAdded }: WalletManagerProps) {
  const {
    tonAddress, tonBalance, isTonConnected,
    solanaAddress, solanaBalance, isSolanaConnected,
    ethereumAddress, ethereumBalance, isEthereumConnected,
    connectTonWallet, connectSolanaWallet, connectEthereumWallet,
    disconnectTonWallet, disconnectSolanaWallet, disconnectEthereumWallet,
    transactions,
    loadUserTransactions,
    error,
    clearError,
  } = useWalletStore();

  const [activeTab, setActiveTab] = useState(showExchange ? 'exchange' : 'wallets');

  useEffect(() => {
    // Загружаем транзакции пользователя
    const user = typeof window !== 'undefined' ? 
      JSON.parse(localStorage.getItem('user') || '{}') : {};
    
    if (user.id) {
      loadUserTransactions(user.id);
    }
  }, [loadUserTransactions]);

  const wallets = [
    {
      name: 'TON',
      address: tonAddress,
      balance: tonBalance,
      isConnected: isTonConnected,
      connect: connectTonWallet,
      disconnect: disconnectTonWallet,
    },
    {
      name: 'Solana',
      address: solanaAddress,
      balance: solanaBalance,
      isConnected: isSolanaConnected,
      connect: connectSolanaWallet,
      disconnect: disconnectSolanaWallet,
    },
    {
      name: 'Ethereum',
      address: ethereumAddress,
      balance: ethereumBalance,
      isConnected: isEthereumConnected,
      connect: connectEthereumWallet,
      disconnect: disconnectEthereumWallet,
    },
  ];

  const handleSuccess = (amount: number) => {
    onCoinsAdded?.(amount);
    // Показываем уведомление об успешном обмене
    if (typeof window !== 'undefined') {
      alert(`Успешно! Получено ${amount} игровых монет!`);
    }
  };

  return (
    <Box w="full">
      {/* Tabs Navigation */}
      <HStack mb={6} justify="center" gap={4}>
        {showExchange && (
          <Button
            onClick={() => setActiveTab('exchange')}
            variant={activeTab === 'exchange' ? 'solid' : 'outline'}
            bg={activeTab === 'exchange' ? 
              'linear-gradient(135deg, rgba(34, 197, 94, 0.8) 0%, rgba(22, 163, 74, 0.6) 100%)' : 
              'transparent'
            }
            border="1px solid"
            borderColor="rgba(34, 197, 94, 0.4)"
            color={activeTab === 'exchange' ? '#e2e8f0' : '#22c55e'}
            _hover={{
              borderColor: 'rgba(255, 215, 0, 0.6)',
              color: '#ffd700'
            }}
          >
            <FaCoins style={{ marginRight: 8 }} />
            Обмен
          </Button>
        )}
        
        <Button
          onClick={() => setActiveTab('wallets')}
          variant={activeTab === 'wallets' ? 'solid' : 'outline'}
          bg={activeTab === 'wallets' ? 
            'linear-gradient(135deg, rgba(59, 130, 246, 0.8) 0%, rgba(37, 99, 235, 0.6) 100%)' : 
            'transparent'
          }
          border="1px solid"
          borderColor="rgba(59, 130, 246, 0.4)"
          color={activeTab === 'wallets' ? '#e2e8f0' : '#3b82f6'}
          _hover={{
            borderColor: 'rgba(255, 215, 0, 0.6)',
            color: '#ffd700'
          }}
        >
          <FaWallet style={{ marginRight: 8 }} />
          Кошелек
        </Button>
        
        <Button
          onClick={() => setActiveTab('history')}
          variant={activeTab === 'history' ? 'solid' : 'outline'}
          bg={activeTab === 'history' ? 
            'linear-gradient(135deg, rgba(139, 92, 246, 0.8) 0%, rgba(124, 58, 237, 0.6) 100%)' : 
            'transparent'
          }
          border="1px solid"
          borderColor="rgba(139, 92, 246, 0.4)"
          color={activeTab === 'history' ? '#e2e8f0' : '#8b5cf6'}
          _hover={{
            borderColor: 'rgba(255, 215, 0, 0.6)',
            color: '#ffd700'
          }}
        >
          <FaHistory style={{ marginRight: 8 }} />
          История
        </Button>
      </HStack>

      {/* Tab Content */}
      {activeTab === 'exchange' && showExchange && (
        <Box display="flex" justifyContent="center">
          <CryptoExchange onSuccess={handleSuccess} />
        </Box>
      )}

      {activeTab === 'wallets' && (
        <VStack gap={4}>
          {wallets.map((wallet) => {
            const walletConfig = walletIcons[wallet.name as keyof typeof walletIcons];
            const IconComponent = walletConfig?.icon || FaWallet;
            
            return (
              <Box
                key={wallet.name}
                w="full"
                bg="linear-gradient(135deg, rgba(15, 23, 42, 0.8) 0%, rgba(30, 41, 59, 0.6) 100%)"
                backdropFilter="blur(10px)"
                border="1px solid"
                borderColor={wallet.isConnected ? 'rgba(34, 197, 94, 0.4)' : 'rgba(100, 116, 139, 0.3)'}
                borderRadius="16px"
                boxShadow="0 4px 20px rgba(0, 0, 0, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.05)"
                p={4}
                transition="all 0.3s ease"
                _hover={{
                  borderColor: 'rgba(255, 215, 0, 0.4)',
                  transform: 'translateY(-2px)',
                  boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3), 0 0 15px rgba(255, 215, 0, 0.1)'
                }}
              >
                <HStack justify="space-between" align="center">
                  <HStack gap={4}>
                    <Box
                      bg={`linear-gradient(135deg, ${walletConfig?.color || '#64748b'} 0%, ${walletConfig?.color || '#475569'} 100%)`}
                      borderRadius="12px"
                      p={3}
                      display="flex"
                      alignItems="center"
                      justifyContent="center"
                    >
                      <IconComponent color="white" size={24} />
                    </Box>
                    
                    <VStack align="start" gap={1}>
                      <Text fontSize="lg" fontWeight="600" color="#e2e8f0">
                        {wallet.name}
                      </Text>
                      {wallet.isConnected ? (
                        <VStack align="start" gap={0}>
                          <Text fontSize="sm" color="#22c55e" fontWeight="600">
                            ✅ Подключен
                          </Text>
                          {wallet.address && (
                            <Text fontSize="xs" color="#94a3b8" fontFamily="mono">
                              {wallet.address.slice(0, 8)}...{wallet.address.slice(-6)}
                            </Text>
                          )}
                          <Text fontSize="sm" color="#ffd700" fontWeight="600">
                            {wallet.balance.toFixed(4)} {wallet.name === 'Solana' ? 'SOL' : wallet.name}
                          </Text>
                        </VStack>
                      ) : (
                        <Text fontSize="sm" color="#94a3b8">
                          Не подключен
                        </Text>
                      )}
                    </VStack>
                  </HStack>
                  
                  <Button
                    onClick={wallet.isConnected ? wallet.disconnect : wallet.connect}
                    size="sm"
                    bg={wallet.isConnected ? 
                      'linear-gradient(135deg, rgba(239, 68, 68, 0.8) 0%, rgba(220, 38, 38, 0.6) 100%)' :
                      'linear-gradient(135deg, rgba(34, 197, 94, 0.8) 0%, rgba(22, 163, 74, 0.6) 100%)'
                    }
                    border="1px solid"
                    borderColor={wallet.isConnected ? 'rgba(239, 68, 68, 0.4)' : 'rgba(34, 197, 94, 0.4)'}
                    borderRadius="12px"
                    color="#e2e8f0"
                    fontWeight="600"
                    fontSize="0.8rem"
                    transition="all 0.3s ease"
                    _hover={{
                      borderColor: 'rgba(255, 215, 0, 0.6)',
                      color: '#ffd700',
                      transform: 'scale(1.05)'
                    }}
                  >
                    {wallet.isConnected ? 'Отключить' : 'Подключить'}
                  </Button>
                </HStack>
              </Box>
            );
          })}
        </VStack>
      )}

      {activeTab === 'history' && (
        <VStack gap={4}>
          <Text fontSize="lg" fontWeight="600" color="#e2e8f0" textAlign="center">
            История транзакций
          </Text>
          
          {transactions.length === 0 ? (
            <Box
              w="full"
              bg="linear-gradient(135deg, rgba(15, 23, 42, 0.8) 0%, rgba(30, 41, 59, 0.6) 100%)"
              backdropFilter="blur(10px)"
              border="1px solid"
              borderColor="rgba(100, 116, 139, 0.3)"
              borderRadius="16px"
              p={6}
              textAlign="center"
            >
              <Text color="#94a3b8">
                Транзакций пока нет
              </Text>
            </Box>
          ) : (
            transactions.map((tx) => (
              <Box
                key={tx.id}
                w="full"
                bg="linear-gradient(135deg, rgba(15, 23, 42, 0.8) 0%, rgba(30, 41, 59, 0.6) 100%)"
                backdropFilter="blur(10px)"
                border="1px solid"
                borderColor={
                  tx.status === 'confirmed' ? 'rgba(34, 197, 94, 0.4)' :
                  tx.status === 'failed' ? 'rgba(239, 68, 68, 0.4)' :
                  'rgba(251, 191, 36, 0.4)'
                }
                borderRadius="16px"
                p={4}
              >
                <HStack justify="space-between" align="center">
                  <VStack align="start" gap={1}>
                    <HStack>
                      <Text fontSize="sm" fontWeight="600" color="#e2e8f0">
                        {tx.cryptoAmount} {tx.cryptoType}
                      </Text>
                      <Text fontSize="sm" color="#94a3b8">→</Text>
                      <HStack>
                        <FaCoins color="#ffd700" size={14} />
                        <Text fontSize="sm" fontWeight="600" color="#ffd700">
                          {tx.gameCoinsAmount}
                        </Text>
                      </HStack>
                    </HStack>
                    <Text fontSize="xs" color="#94a3b8">
                      {new Date(tx.createdAt).toLocaleString()}
                    </Text>
                    {tx.txHash && (
                      <Text fontSize="xs" color="#94a3b8" fontFamily="mono">
                        {tx.txHash.slice(0, 16)}...
                      </Text>
                    )}
                  </VStack>
                  
                  <Box
                    bg={
                      tx.status === 'confirmed' ? 'linear-gradient(135deg, #22c55e, #16a34a)' :
                      tx.status === 'failed' ? 'linear-gradient(135deg, #ef4444, #dc2626)' :
                      'linear-gradient(135deg, #fbbf24, #f59e0b)'
                    }
                    borderRadius="full"
                    px={3}
                    py={1}
                  >
                    <Text fontSize="xs" color="white" fontWeight="600">
                      {tx.status === 'confirmed' ? '✅ Готово' :
                       tx.status === 'failed' ? '❌ Ошибка' :
                       '⏳ В процессе'}
                    </Text>
                  </Box>
                </HStack>
              </Box>
            ))
          )}
        </VStack>
      )}
    </Box>
  );
}
