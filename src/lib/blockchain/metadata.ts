/**
 * NFT Metadata Generator
 * Генерирует метаданные для NFT в форматах TON и Metaplex (Solana)
 */

export interface CardMetadata {
  suit: string; // hearts, diamonds, clubs, spades
  rank: string; // 2-10, J, Q, K, A
  rarity: 'common' | 'rare' | 'epic' | 'legendary' | 'mythic';
  image_url: string;
}

/**
 * Генерация TON NFT метаданных (TEP-64 standard)
 * https://github.com/ton-blockchain/TEPs/blob/master/text/0064-token-data-standard.md
 */
export function generateTonMetadata(card: CardMetadata) {
  const suitEmoji: Record<string, string> = {
    hearts: '♥️',
    diamonds: '♦️',
    clubs: '♣️',
    spades: '♠️'
  };

  const rarityName: Record<string, string> = {
    common: 'Common',
    rare: 'Rare',
    epic: 'Epic',
    legendary: 'Legendary',
    mythic: 'Mythic'
  };

  return {
    name: `${card.rank} of ${card.suit.charAt(0).toUpperCase() + card.suit.slice(1)}`,
    description: `P.I.D.R. NFT Card - ${rarityName[card.rarity]} ${card.rank}${suitEmoji[card.suit]}\n\nUnique playing card from the P.I.D.R. Game Collection. Each card is a collectible NFT on the TON blockchain.`,
    image: card.image_url,
    attributes: [
      {
        trait_type: 'Suit',
        value: card.suit
      },
      {
        trait_type: 'Rank',
        value: card.rank
      },
      {
        trait_type: 'Rarity',
        value: rarityName[card.rarity]
      },
      {
        trait_type: 'Collection',
        value: 'P.I.D.R. Cards'
      }
    ],
    external_url: 'https://pidr-1-01.vercel.app/',
    marketplace: 'getgems.io',
  };
}

/**
 * Генерация Metaplex (Solana) метаданных
 * https://docs.metaplex.com/programs/token-metadata/token-standard
 */
export function generateMetaplexMetadata(card: CardMetadata) {
  const suitEmoji: Record<string, string> = {
    hearts: '♥️',
    diamonds: '♦️',
    clubs: '♣️',
    spades: '♠️'
  };

  const rarityName: Record<string, string> = {
    common: 'Common',
    rare: 'Rare',
    epic: 'Epic',
    legendary: 'Legendary',
    mythic: 'Mythic'
  };

  return {
    name: `${card.rank} of ${card.suit.charAt(0).toUpperCase() + card.suit.slice(1)}`,
    symbol: 'PIDR',
    description: `P.I.D.R. NFT Card - ${rarityName[card.rarity]} ${card.rank}${suitEmoji[card.suit]}\n\nUnique playing card from the P.I.D.R. Game Collection on Solana.`,
    image: card.image_url,
    animation_url: '',
    external_url: 'https://pidr-1-01.vercel.app/',
    attributes: [
      {
        trait_type: 'Suit',
        value: card.suit
      },
      {
        trait_type: 'Rank',
        value: card.rank
      },
      {
        trait_type: 'Rarity',
        value: rarityName[card.rarity]
      },
      {
        trait_type: 'Collection',
        value: 'P.I.D.R. Cards'
      }
    ],
    properties: {
      category: 'image',
      files: [
        {
          uri: card.image_url,
          type: 'image/png'
        }
      ],
      creators: [
        {
          address: '', // Заполнить адрес создателя
          share: 100
        }
      ]
    },
    collection: {
      name: 'P.I.D.R. Cards',
      family: 'P.I.D.R. Game'
    }
  };
}

/**
 * Сохранение метаданных в Supabase Storage
 */
export async function uploadMetadata(
  metadata: any,
  fileName: string,
  supabaseUrl: string,
  supabaseKey: string
): Promise<string | null> {
  try {
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(supabaseUrl, supabaseKey);

    const metadataBlob = new Blob([JSON.stringify(metadata, null, 2)], {
      type: 'application/json'
    });

    const { data, error } = await supabase.storage
      .from('nft-cards')
      .upload(`metadata/${fileName}.json`, metadataBlob, {
        contentType: 'application/json',
        upsert: true
      });

    if (error) {
      console.error('Ошибка загрузки метаданных:', error);
      return null;
    }

    // Получаем публичный URL
    const { data: publicUrlData } = supabase.storage
      .from('nft-cards')
      .getPublicUrl(`metadata/${fileName}.json`);

    return publicUrlData.publicUrl;
  } catch (error) {
    console.error('Ошибка uploadMetadata:', error);
    return null;
  }
}

