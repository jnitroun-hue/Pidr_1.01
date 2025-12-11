// Скрипт для генерации HD Wallet Master XPUBs
// Запуск: node generate-xpubs.js

const bip39 = require('bip39');
const bip32 = require('bip32');
const bitcoin = require('bitcoinjs-lib');

// Генерируем новую мнемоническую фразу или используем существующую
const mnemonic = bip39.generateMnemonic(); // Или вставьте свою: 'your twelve word mnemonic phrase here...'

console.log('🔐 ГЕНЕРАЦИЯ HD WALLET MASTER XPUB КЛЮЧЕЙ');
console.log('=' .repeat(60));
console.log('');

console.log('🔑 Мнемоническая фраза (СОХРАНИТЕ В БЕЗОПАСНОМ МЕСТЕ!):');
console.log(mnemonic);
console.log('');

// Генерируем seed из мнемоники
const seed = bip39.mnemonicToSeedSync(mnemonic);

// Конфигурация для разных монет
const coinConfigs = [
  {
    name: 'Bitcoin (BTC)',
    symbol: 'BTC',
    path: "m/44'/0'/0'",
    network: bitcoin.networks.bitcoin
  },
  {
    name: 'Ethereum (ETH)', 
    symbol: 'ETH',
    path: "m/44'/60'/0'"
  },
  {
    name: 'Toncoin (TON)',
    symbol: 'TON', 
    path: "m/44'/607'/0'"
  },
  {
    name: 'Solana (SOL)',
    symbol: 'SOL',
    path: "m/44'/501'/0'"
  },
  {
    name: 'TRON/USDT TRC20',
    symbol: 'TRC20',
    path: "m/44'/195'/0'"
  }
];

console.log('📊 MASTER XPUB КЛЮЧИ:');
console.log('');

const xpubs = {};

coinConfigs.forEach(config => {
  try {
    // Создаем мастер ключ
    const masterKey = bip32.fromSeed(seed, config.network);
    
    // Деривируем ключ по пути
    const accountKey = masterKey.derivePath(config.path);
    
    // Получаем XPUB
    const xpub = accountKey.neutered().toBase58();
    
    xpubs[config.symbol] = xpub;
    
    console.log(`${config.name}:`);
    console.log(`${config.symbol}_MASTER_XPUB=${xpub}`);
    console.log('');
  } catch (error) {
    console.log(`❌ Ошибка для ${config.name}: ${error.message}`);
    console.log('');
  }
});

console.log('🔧 ПЕРЕМЕННЫЕ ОКРУЖЕНИЯ ДЛЯ .ENV:');
console.log('=' .repeat(60));
Object.entries(xpubs).forEach(([symbol, xpub]) => {
  console.log(`${symbol}_MASTER_XPUB=${xpub}`);
});

console.log('');
console.log('⚠️  ВАЖНО:');
console.log('1. Сохраните мнемоническую фразу в безопасном месте');
console.log('2. Никогда не публикуйте приватные ключи');
console.log('3. XPUB ключи безопасны для публичного использования');
console.log('4. Добавьте XPUB ключи в переменные окружения Vercel');
