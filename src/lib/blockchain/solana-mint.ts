/**
 * Solana NFT Minting Utility
 * Минт NFT в Solana через Metaplex и Phantom wallet
 */

import {
  Connection,
  PublicKey,
  Transaction,
  SystemProgram,
  LAMPORTS_PER_SOL
} from '@solana/web3.js';

export interface SolanaMintParams {
  ownerAddress: string; // Адрес кошелька Phantom
  metadataUrl: string; // URL метаданных (JSON)
  name: string; // Название NFT
  symbol: string; // Символ (например, PIDR)
  sellerFeeBasisPoints: number; // Роялти в базисных пунктах (500 = 5%)
}

/**
 * Создание транзакции для минта NFT через Metaplex
 * ВНИМАНИЕ: Это упрощенная версия. В production используйте @metaplex-foundation/js v3+
 */
export async function createSolanaMintTransaction(
  params: SolanaMintParams,
  connection: Connection
): Promise<Transaction> {
  try {
    const {
      ownerAddress,
      metadataUrl,
      name,
      symbol,
      sellerFeeBasisPoints
    } = params;

    // Парсим адрес владельца
    const owner = new PublicKey(ownerAddress);

    // Создаем простую транзакцию
    // В реальности здесь будет вызов Metaplex программы
    const transaction = new Transaction();

    // TODO: Добавить инструкции Metaplex для минта NFT
    // Это требует:
    // 1. Создание mint account
    // 2. Создание token account
    // 3. Создание metadata account
    // 4. Минт токена
    // 
    // Используйте @metaplex-foundation/js для упрощения

    // Пока добавляем заглушку (простой transfer)
    transaction.add(
      SystemProgram.transfer({
        fromPubkey: owner,
        toPubkey: owner,
        lamports: 0
      })
    );

    // Устанавливаем recent blockhash
    const { blockhash } = await connection.getLatestBlockhash();
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = owner;

    return transaction;
  } catch (error) {
    console.error('Ошибка создания Solana транзакции:', error);
    throw new Error(`Failed to create Solana mint transaction: ${error}`);
  }
}

/**
 * Подключение к Solana RPC
 */
export function getSolanaConnection(
  network: 'devnet' | 'testnet' | 'mainnet-beta' = 'devnet'
): Connection {
  const endpoints: Record<string, string> = {
    devnet: 'https://api.devnet.solana.com',
    testnet: 'https://api.testnet.solana.com',
    'mainnet-beta': 'https://api.mainnet-beta.solana.com'
  };

  return new Connection(endpoints[network], 'confirmed');
}

/**
 * Проверка баланса кошелька
 */
export async function checkSolanaBalance(
  walletAddress: string,
  connection: Connection
): Promise<number> {
  try {
    const publicKey = new PublicKey(walletAddress);
    const balance = await connection.getBalance(publicKey);
    return balance / LAMPORTS_PER_SOL; // Конвертируем в SOL
  } catch (error) {
    console.error('Ошибка проверки баланса:', error);
    return 0;
  }
}

/**
 * Проверка статуса транзакции
 */
export async function checkSolanaTransactionStatus(
  signature: string,
  connection: Connection
): Promise<{
  success: boolean;
  mintAddress?: string;
  error?: string;
}> {
  try {
    const status = await connection.getSignatureStatus(signature);
    
    if (status.value?.confirmationStatus === 'confirmed' || 
        status.value?.confirmationStatus === 'finalized') {
      return {
        success: true,
        mintAddress: `Mint${signature.slice(-10)}` // Заглушка
      };
    }

    return {
      success: false,
      error: 'Transaction not confirmed yet'
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
 * ВАЖНО: Полноценная интеграция Metaplex
 * 
 * Для production минта используйте современную версию Metaplex:
 * 
 * ```typescript
 * import { Metaplex } from '@metaplex-foundation/js';
 * import { Connection, clusterApiUrl } from '@solana/web3.js';
 * 
 * const connection = new Connection(clusterApiUrl('devnet'));
 * const metaplex = Metaplex.make(connection);
 * 
 * const { nft } = await metaplex.nfts().create({
 *   uri: metadataUrl,
 *   name: 'Card Name',
 *   sellerFeeBasisPoints: 500,
 *   symbol: 'PIDR',
 * });
 * ```
 * 
 * Документация: https://docs.metaplex.com/programs/token-metadata/
 */

/**
 * Параметры для Solana NFT Collection
 */
export const SOLANA_COLLECTION_PARAMS = {
  name: 'P.I.D.R. Cards',
  symbol: 'PIDR',
  description: 'Unique NFT playing cards from P.I.D.R. Game on Solana',
  seller_fee_basis_points: 500, // 5% royalty
  external_url: 'https://pidr-1-01.vercel.app/',
  creators: [
    {
      address: '', // Адрес создателя (ваш кошелек)
      share: 100
    }
  ]
};

