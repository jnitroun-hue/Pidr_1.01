/**
 * Упрощенный скрипт для прегенерации NFT карт
 * Принимает переменные окружения как аргументы
 * 
 * Запуск:
 * npx tsx scripts/pregenerate-cards-cli.ts <SUPABASE_URL> <SERVICE_ROLE_KEY>
 */

import { createClient } from '@supabase/supabase-js';

// Получаем аргументы из командной строки
const args = process.argv.slice(2);

if (args.length < 2) {
  console.log('');
  console.log('📝 Использование:');
  console.log('npx tsx scripts/pregenerate-cards-cli.ts <SUPABASE_URL> <SERVICE_ROLE_KEY>');
  console.log('');
  console.log('Пример:');
  console.log('npx tsx scripts/pregenerate-cards-cli.ts https://xxx.supabase.co eyJhbGc...');
  console.log('');
  console.log('💡 Переменные можно найти в Vercel Dashboard → Settings → Environment Variables');
  process.exit(1);
}

const SUPABASE_URL = args[0];
const SERVICE_ROLE_KEY = args[1];

console.log('🔗 Подключаемся к Supabase...');
console.log(`URL: ${SUPABASE_URL.substring(0, 30)}...`);

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

// Карты для прегенерации
const CARDS_TO_GENERATE = [
  { rank: '2', suit: 'hearts', rarity: 'common' },
  { rank: 'K', suit: 'spades', rarity: 'rare' },
  { rank: 'A', suit: 'diamonds', rarity: 'legendary' }
];

async function pregenerateCards() {
  console.log('🎨 Начало прегенерации базовых карт...\n');

  for (const card of CARDS_TO_GENERATE) {
    try {
      console.log(`📝 Генерация: ${card.rank} of ${card.suit} (${card.rarity})`);

      // Генерируем SVG карту
      const svg = generateCardSVG(card.rank, card.suit, card.rarity);

      // Загружаем в Supabase Storage
      const fileName = `${card.rank}.svg`;
      const storagePath = `base-cards/${card.suit}/${fileName}`;
      
      const { data, error } = await supabase.storage
        .from('nft-card')
        .upload(storagePath, Buffer.from(svg), {
          contentType: 'image/svg+xml',
          upsert: true
        });

      if (error) {
        console.error(`❌ Ошибка загрузки ${storagePath}:`, error.message);
        continue;
      }

      // Получаем публичный URL
      const { data: publicUrlData } = supabase.storage
        .from('nft-card')
        .getPublicUrl(storagePath);

      console.log(`✅ Карта загружена: ${publicUrlData.publicUrl}\n`);

      // Сохраняем в базу данных
      const { error: dbError } = await supabase
        .from('_pidr_nft_cards')
        .upsert({
          card_id: `${card.rank.toLowerCase()}_of_${card.suit}`,
          card_rank: card.rank,
          card_suit: card.suit,
          card_name: `${card.rank} of ${card.suit}`,
          rarity: card.rarity,
          image_url: publicUrlData.publicUrl,
          mint_price_ton: card.rarity === 'legendary' ? 3.0 : card.rarity === 'rare' ? 1.0 : 0.5,
          nft_contract_address: null
        }, {
          onConflict: 'card_id'
        });

      if (dbError) {
        console.error(`⚠️ Ошибка сохранения в БД:`, dbError.message);
      } else {
        console.log(`💾 Метаданные сохранены в БД\n`);
      }

    } catch (error: any) {
      console.error(`❌ Ошибка генерации карты ${card.rank} of ${card.suit}:`, error.message);
    }
  }

  console.log('\n✅ Прегенерация завершена!');
  console.log(`📊 Создано ${CARDS_TO_GENERATE.length} базовых карт`);
}

/**
 * Генерация SVG изображения карты
 */
function generateCardSVG(rank: string, suit: string, rarity: string): string {
  const suitSymbols: Record<string, string> = {
    hearts: '♥',
    diamonds: '♦',
    clubs: '♣',
    spades: '♠'
  };

  const suitColors: Record<string, string> = {
    hearts: '#e53e3e',
    diamonds: '#e53e3e',
    clubs: '#1a202c',
    spades: '#1a202c'
  };

  const rarityColors: Record<string, string> = {
    common: '#9ca3af',
    uncommon: '#10b981',
    rare: '#3b82f6',
    mythic: '#a855f7',
    legendary: '#f59e0b'
  };

  const suitSymbol = suitSymbols[suit] || '?';
  const suitColor = suitColors[suit] || '#000';
  const rarityColor = rarityColors[rarity] || '#999';

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="400" height="600" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="cardGradient" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" style="stop-color:#ffffff;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#f7fafc;stop-opacity:1" />
    </linearGradient>
    <filter id="shadow">
      <feDropShadow dx="0" dy="4" stdDeviation="8" flood-opacity="0.3"/>
    </filter>
  </defs>
  
  <!-- Фон карты -->
  <rect width="400" height="600" rx="20" fill="url(#cardGradient)" filter="url(#shadow)"/>
  
  <!-- Рамка редкости -->
  <rect x="8" y="8" width="384" height="584" rx="16" 
        fill="none" stroke="${rarityColor}" stroke-width="6"/>
  
  <!-- Верхний ранг -->
  <text x="40" y="80" font-family="Arial, sans-serif" font-size="64" 
        font-weight="bold" fill="${suitColor}">${rank}</text>
  <text x="40" y="150" font-family="Arial, sans-serif" font-size="72" 
        fill="${suitColor}">${suitSymbol}</text>
  
  <!-- Центральный символ масти -->
  <text x="200" y="350" font-family="Arial, sans-serif" font-size="180" 
        fill="${suitColor}" opacity="0.3" text-anchor="middle">${suitSymbol}</text>
  
  <!-- Нижний ранг (перевернутый) -->
  <text x="360" y="550" font-family="Arial, sans-serif" font-size="64" 
        font-weight="bold" fill="${suitColor}" text-anchor="end" 
        transform="rotate(180 360 520)">${rank}</text>
  <text x="360" y="480" font-family="Arial, sans-serif" font-size="72" 
        fill="${suitColor}" text-anchor="end" 
        transform="rotate(180 360 455)">${suitSymbol}</text>
  
  <!-- Метка редкости -->
  <rect x="150" y="560" width="100" height="30" rx="15" fill="${rarityColor}" opacity="0.8"/>
  <text x="200" y="582" font-family="Arial, sans-serif" font-size="14" 
        fill="#ffffff" text-anchor="middle" font-weight="bold">${rarity.toUpperCase()}</text>
  
  <!-- Декоративные элементы -->
  <circle cx="200" cy="50" r="5" fill="${rarityColor}" opacity="0.5"/>
  <circle cx="200" cy="550" r="5" fill="${rarityColor}" opacity="0.5"/>
</svg>`;
}

// Запуск скрипта
pregenerateCards().catch(console.error);

