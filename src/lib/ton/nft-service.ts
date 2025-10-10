import { Address, beginCell, Cell, toNano } from 'ton-core';
import { TonClient } from 'ton';

export interface NFTCardMetadata {
  card_id: string;
  card_name: string;
  card_rank: string;
  card_suit: string;
  rarity: string;
  image_url: string;
  description?: string;
  attributes?: Array<{
    trait_type: string;
    value: string;
  }>;
}

export class NFTService {
  private client: TonClient;
  private collectionAddress: Address;

  constructor(
    endpoint: string = 'https://toncenter.com/api/v2/jsonRPC',
    apiKey?: string,
    collectionAddress?: string
  ) {
    this.client = new TonClient({
      endpoint,
      apiKey: apiKey || process.env.NEXT_PUBLIC_TONCENTER_API_KEY
    });

    // Адрес коллекции (будет установлен после деплоя)
    this.collectionAddress = collectionAddress 
      ? Address.parse(collectionAddress)
      : Address.parse(process.env.NEXT_PUBLIC_NFT_COLLECTION_ADDRESS || '');
  }

  /**
   * Создать метаданные для NFT карты
   */
  createCardMetadata(card: NFTCardMetadata): string {
    const metadata = {
      name: card.card_name,
      description: card.description || `${card.card_name} - ${card.rarity} карта из коллекции P.I.D.R`,
      image: card.image_url,
      attributes: [
        { trait_type: 'Rank', value: card.card_rank },
        { trait_type: 'Suit', value: card.card_suit },
        { trait_type: 'Rarity', value: card.rarity },
        { trait_type: 'Card ID', value: card.card_id },
        ...(card.attributes || [])
      ]
    };

    // Конвертируем в base64 для on-chain хранения (или возвращаем URL для IPFS)
    return Buffer.from(JSON.stringify(metadata)).toString('base64');
  }

  /**
   * Создать Cell с метаданными NFT
   */
  createNFTContentCell(metadataUrl: string): Cell {
    // Формат: 0x01 (off-chain) + URL
    return beginCell()
      .storeUint(0x01, 8) // off-chain content flag
      .storeStringTail(metadataUrl)
      .endCell();
  }

  /**
   * Создать сообщение для минта NFT
   */
  createMintMessage(
    itemIndex: number,
    ownerAddress: Address,
    metadataUrl: string,
    mintPrice: string = '0.5' // в TON
  ): Cell {
    const nftContent = this.createNFTContentCell(metadataUrl);

    const mintBody = beginCell()
      .storeUint(1, 32) // op: mint
      .storeUint(0, 64) // query_id
      .storeUint(itemIndex, 64) // item_index
      .storeCoins(toNano(mintPrice)) // amount для NFT item
      .storeRef(
        beginCell()
          .storeAddress(ownerAddress) // owner_address
          .storeRef(nftContent) // nft_content
          .endCell()
      )
      .endCell();

    return mintBody;
  }

  /**
   * Получить адрес NFT по индексу
   */
  async getNFTAddressByIndex(itemIndex: number): Promise<Address> {
    const result = await this.client.runMethod(
      this.collectionAddress,
      'get_nft_address_by_index',
      [{ type: 'int', value: BigInt(itemIndex) }]
    );

    return result.stack.readAddress();
  }

  /**
   * Получить данные коллекции
   */
  async getCollectionData(): Promise<{
    nextItemIndex: number;
    collectionContent: Cell;
    ownerAddress: Address;
  }> {
    const result = await this.client.runMethod(
      this.collectionAddress,
      'get_collection_data',
      []
    );

    return {
      nextItemIndex: result.stack.readNumber(),
      collectionContent: result.stack.readCell(),
      ownerAddress: result.stack.readAddress()
    };
  }

  /**
   * Получить данные NFT item
   */
  async getNFTData(nftAddress: Address): Promise<{
    init: boolean;
    index: number;
    collectionAddress: Address;
    ownerAddress: Address;
    content: Cell;
  }> {
    const result = await this.client.runMethod(
      nftAddress,
      'get_nft_data',
      []
    );

    return {
      init: result.stack.readBoolean(),
      index: result.stack.readNumber(),
      collectionAddress: result.stack.readAddress(),
      ownerAddress: result.stack.readAddress(),
      content: result.stack.readCell()
    };
  }

  /**
   * Проверить владельца NFT
   */
  async verifyNFTOwnership(nftAddress: Address, expectedOwner: Address): Promise<boolean> {
    try {
      const nftData = await this.getNFTData(nftAddress);
      return nftData.ownerAddress.equals(expectedOwner);
    } catch (error) {
      console.error('Error verifying NFT ownership:', error);
      return false;
    }
  }

  /**
   * Получить все NFT пользователя (через индексацию)
   */
  async getUserNFTs(userAddress: Address, maxIndex: number = 1000): Promise<Address[]> {
    const userNFTs: Address[] = [];

    for (let i = 0; i < maxIndex; i++) {
      try {
        const nftAddress = await this.getNFTAddressByIndex(i);
        const nftData = await this.getNFTData(nftAddress);
        
        if (nftData.init && nftData.ownerAddress.equals(userAddress)) {
          userNFTs.push(nftAddress);
        }
      } catch (error) {
        // NFT не существует или ошибка - пропускаем
        continue;
      }
    }

    return userNFTs;
  }

  /**
   * Рассчитать комиссию за минт в зависимости от редкости
   */
  calculateMintPrice(rarity: string): string {
    const prices: Record<string, string> = {
      common: '0.5',
      rare: '1.0',
      epic: '2.0',
      legendary: '3.0',
      mythic: '2.5'
    };

    return prices[rarity.toLowerCase()] || '0.5';
  }

  /**
   * Создать URL для метаданных (Supabase Storage)
   */
  createMetadataUrl(cardId: string): string {
    const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    return `${baseUrl}/storage/v1/object/public/nft-metadata/${cardId}.json`;
  }
}

// Singleton экземпляр
let nftServiceInstance: NFTService | null = null;

export function getNFTService(): NFTService {
  if (!nftServiceInstance) {
    nftServiceInstance = new NFTService();
  }
  return nftServiceInstance;
}

