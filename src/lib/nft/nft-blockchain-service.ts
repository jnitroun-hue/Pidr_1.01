/**
 * ✅ БЕЗОПАСНЫЙ сервис для работы с NFT через TON Connect
 * 
 * ПРИНЦИПЫ БЕЗОПАСНОСТИ:
 * 1. Приватные ключи НИКОГДА не покидают кошелек пользователя
 * 2. Все транзакции подписываются через TON Connect
 * 3. NFT хранятся ТОЛЬКО в блокчейне TON
 * 4. Supabase - только для публичных метаданных
 * 5. IndexedDB - только для UI кеша изображений
 */

import { Address } from '@ton/core';

export interface NFTOnChain {
  address: string;
  ownerAddress: string;
  collectionAddress?: string;
  index: number;
  metadata: {
    name: string;
    description: string;
    image: string;
    attributes: Array<{
      trait_type: string;
      value: string;
    }>;
  };
}

export class NFTBlockchainService {
  private tonApiUrl: string;
  private tonApiKey: string;

  constructor() {
    this.tonApiUrl = process.env.NEXT_PUBLIC_TON_API_URL || 'https://toncenter.com/api/v2';
    this.tonApiKey = process.env.NEXT_PUBLIC_TON_API_KEY || '';
  }

  /**
   * ✅ Получить NFT пользователя из блокчейна
   * Читает данные напрямую из TON blockchain
   */
  async getUserNFTs(userAddress: string): Promise<NFTOnChain[]> {
    try {
      console.log('🔍 Получаем NFT из блокчейна для:', userAddress);

      // Нормализуем адрес
      const address = Address.parse(userAddress);
      const normalizedAddress = address.toString({ bounceable: false });

      // Запрос к TON API для получения NFT
      const response = await fetch(
        `${this.tonApiUrl}/getTokenData?address=${normalizedAddress}`,
        {
          headers: {
            'X-API-Key': this.tonApiKey
          }
        }
      );

      if (!response.ok) {
        throw new Error(`TON API error: ${response.status}`);
      }

      const data = await response.json();
      
      // Парсим NFT из ответа
      const nfts: NFTOnChain[] = [];
      
      if (data.result && Array.isArray(data.result)) {
        for (const item of data.result) {
          try {
            // Получаем метаданные NFT
            const metadata = await this.getNFTMetadata(item.metadata_url);
            
            nfts.push({
              address: item.address,
              ownerAddress: normalizedAddress,
              collectionAddress: item.collection_address,
              index: item.index,
              metadata
            });
          } catch (error) {
            console.warn('⚠️ Не удалось загрузить метаданные NFT:', error);
          }
        }
      }

      console.log(`✅ Найдено ${nfts.length} NFT в блокчейне`);
      return nfts;

    } catch (error) {
      console.error('❌ Ошибка получения NFT из блокчейна:', error);
      return [];
    }
  }

  /**
   * ✅ Получить метаданные NFT
   * Читает публичные метаданные из IPFS/HTTP
   */
  private async getNFTMetadata(metadataUrl: string): Promise<NFTOnChain['metadata']> {
    try {
      // Если IPFS, конвертируем в HTTP gateway
      let url = metadataUrl;
      if (url.startsWith('ipfs://')) {
        url = url.replace('ipfs://', 'https://ipfs.io/ipfs/');
      }

      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Metadata fetch failed: ${response.status}`);
      }

      const metadata = await response.json();
      
      return {
        name: metadata.name || 'Unknown',
        description: metadata.description || '',
        image: metadata.image || '',
        attributes: metadata.attributes || []
      };

    } catch (error) {
      console.error('❌ Ошибка загрузки метаданных:', error);
      throw error;
    }
  }

  /**
   * ✅ Проверить владение NFT
   * Проверяет в блокчейне, принадлежит ли NFT пользователю
   */
  async verifyNFTOwnership(nftAddress: string, userAddress: string): Promise<boolean> {
    try {
      const address = Address.parse(nftAddress);
      const normalizedNFTAddress = address.toString({ bounceable: false });

      const response = await fetch(
        `${this.tonApiUrl}/getNftItemByAddress?address=${normalizedNFTAddress}`,
        {
          headers: {
            'X-API-Key': this.tonApiKey
          }
        }
      );

      if (!response.ok) {
        return false;
      }

      const data = await response.json();
      
      if (data.result && data.result.owner_address) {
        const ownerAddress = Address.parse(data.result.owner_address);
        const normalizedOwner = ownerAddress.toString({ bounceable: false });
        
        const userAddr = Address.parse(userAddress);
        const normalizedUser = userAddr.toString({ bounceable: false });

        return normalizedOwner === normalizedUser;
      }

      return false;

    } catch (error) {
      console.error('❌ Ошибка проверки владения NFT:', error);
      return false;
    }
  }

  /**
   * ✅ Подготовить транзакцию для минта NFT
   * Возвращает данные транзакции, которую пользователь подпишет через TON Connect
   */
  async prepareMintTransaction(params: {
    collectionAddress: string;
    itemIndex: number;
    ownerAddress: string;
    metadataUrl: string;
    mintPrice: string; // в TON
  }) {
    try {
      const { collectionAddress, itemIndex, ownerAddress, metadataUrl, mintPrice } = params;

      // Создаем payload для минта
      const payload = {
        to: collectionAddress,
        value: mintPrice, // Цена минта в TON
        data: {
          op: 'mint',
          itemIndex,
          ownerAddress,
          metadataUrl
        }
      };

      console.log('📝 Транзакция минта подготовлена:', payload);
      return payload;

    } catch (error) {
      console.error('❌ Ошибка подготовки транзакции минта:', error);
      throw error;
    }
  }

  /**
   * ✅ Подготовить транзакцию для трансфера NFT
   * Возвращает данные транзакции, которую пользователь подпишет через TON Connect
   */
  async prepareTransferTransaction(params: {
    nftAddress: string;
    fromAddress: string;
    toAddress: string;
  }) {
    try {
      const { nftAddress, fromAddress, toAddress } = params;

      // Создаем payload для трансфера
      const payload = {
        to: nftAddress,
        value: '0.05', // Газ для трансфера
        data: {
          op: 'transfer',
          newOwner: toAddress,
          responseDestination: fromAddress,
          forwardAmount: '0.01'
        }
      };

      console.log('📝 Транзакция трансфера подготовлена:', payload);
      return payload;

    } catch (error) {
      console.error('❌ Ошибка подготовки транзакции трансфера:', error);
      throw error;
    }
  }

  /**
   * ✅ Синхронизировать NFT с Supabase (только публичные метаданные)
   * Сохраняет публичные данные для быстрого отображения в UI
   */
  async syncNFTsToSupabase(userAddress: string, nfts: NFTOnChain[]): Promise<void> {
    try {
      console.log('🔄 Синхронизация NFT с Supabase...');

      const response = await fetch('/api/nft/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          userAddress,
          nfts: nfts.map(nft => ({
            address: nft.address,
            collectionAddress: nft.collectionAddress,
            index: nft.index,
            metadata: nft.metadata
          }))
        })
      });

      if (!response.ok) {
        throw new Error(`Sync failed: ${response.status}`);
      }

      console.log('✅ NFT синхронизированы с Supabase');

    } catch (error) {
      console.error('❌ Ошибка синхронизации NFT:', error);
      throw error;
    }
  }
}

// Экспортируем singleton
export const nftBlockchainService = new NFTBlockchainService();

