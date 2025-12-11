/**
 * TON NFT Minting Utility
 * Минт NFT в блокчейн TON через TON Connect
 */

import { Address, beginCell, Cell, toNano } from '@ton/core';

export interface TonMintParams {
  collectionAddress: string; // Адрес NFT коллекции
  ownerAddress: string; // Адрес кошелька получателя
  metadataUrl: string; // URL метаданных (JSON)
  itemIndex: number; // Порядковый номер NFT в коллекции
  royaltyPercent?: number; // Процент роялти (опционально)
}

/**
 * Создание транзакции для минта NFT
 * Возвращает payload для отправки через TON Connect
 */
export function createTonMintTransaction(params: TonMintParams) {
  const {
    collectionAddress,
    ownerAddress,
    metadataUrl,
    itemIndex,
    royaltyPercent = 5
  } = params;

  try {
    // Парсим адреса
    const collection = Address.parse(collectionAddress);
    const owner = Address.parse(ownerAddress);

    // Создаем payload для минта
    // Это упрощенная версия - в реальности нужен правильный формат для вашего контракта
    const mintPayload = beginCell()
      .storeUint(1, 32) // op code for mint (зависит от контракта)
      .storeUint(0, 64) // query id
      .storeUint(itemIndex, 64) // item index
      .storeCoins(toNano('0.05')) // forward amount
      .storeAddress(owner) // owner address
      .storeRef(
        beginCell()
          .storeBuffer(Buffer.from(metadataUrl))
          .endCell()
      )
      .endCell();

    // Формируем транзакцию для TON Connect
    return {
      validUntil: Math.floor(Date.now() / 1000) + 300, // 5 минут
      messages: [
        {
          address: collection.toString(),
          amount: toNano('0.1').toString(), // Стоимость минта + газ
          payload: mintPayload.toBoc().toString('base64')
        }
      ]
    };
  } catch (error) {
    console.error('Ошибка создания TON транзакции:', error);
    throw new Error(`Failed to create TON mint transaction: ${error}`);
  }
}

/**
 * Получение следующего доступного index для NFT в коллекции
 * Это нужно делать запросом к блокчейну
 */
export async function getNextAvailableIndex(
  collectionAddress: string
): Promise<number> {
  // TODO: Реализовать запрос к TON blockchain
  // Для прототипа используем случайное значение
  return Math.floor(Math.random() * 1000000);
}

/**
 * Проверка статуса транзакции минта
 */
export async function checkMintTransactionStatus(
  transactionHash: string
): Promise<{
  success: boolean;
  nftAddress?: string;
  error?: string;
}> {
  try {
    // TODO: Реализовать проверку через TON API
    // Для прототипа возвращаем успех
    return {
      success: true,
      nftAddress: `EQC...${transactionHash.slice(-10)}`
    };
  } catch (error) {
    console.error('Ошибка проверки транзакции:', error);
    return {
      success: false,
      error: String(error)
    };
  }
}

/**
 * Параметры для TON NFT Collection контракта
 * Используйте эти данные для деплоя коллекции
 */
export const TON_COLLECTION_PARAMS = {
  name: 'P.I.D.R. Cards',
  description: 'Unique NFT playing cards from P.I.D.R. Game',
  image: 'https://pidr-1-01.vercel.app/cards/collection-cover.png',
  royalty_percent: 5,
  royalty_address: '', // Адрес для получения роялти
  owner_address: '', // Адрес владельца коллекции
};

/**
 * Инструкция по деплою TON NFT Collection
 * 
 * 1. Установите Blueprint: npm install -g @ton-community/blueprint
 * 2. Создайте проект: blueprint create nft-collection
 * 3. Используйте стандартный контракт: https://github.com/ton-blockchain/token-contract/tree/main/nft
 * 4. Деплойте: blueprint run
 * 5. Скопируйте адрес коллекции в .env: TON_COLLECTION_ADDRESS=EQC...
 * 
 * Testnet: https://testnet.tonscan.org/
 * Mainnet: https://tonscan.org/
 */

