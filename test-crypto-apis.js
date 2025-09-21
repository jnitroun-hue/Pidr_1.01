// 🧪 Тестовый скрипт для проверки всех криптовалютных API
// Запуск: node test-crypto-apis.js

// Простая загрузка .env файла без дополнительных пакетов
function loadEnv() {
  try {
    const fs = require('fs');
    const path = require('path');
    const envPath = path.join(process.cwd(), '.env');
    
    if (fs.existsSync(envPath)) {
      const envContent = fs.readFileSync(envPath, 'utf8');
      envContent.split('\n').forEach(line => {
        const [key, ...valueParts] = line.split('=');
        if (key && valueParts.length > 0) {
          const value = valueParts.join('=').trim();
          if (value && !key.startsWith('#')) {
            process.env[key.trim()] = value;
          }
        }
      });
      console.log('✅ .env файл загружен');
    } else {
      console.log('⚠️  .env файл не найден, используем системные переменные');
    }
  } catch (error) {
    console.log('⚠️  Ошибка загрузки .env:', error.message);
  }
}

loadEnv();

async function testCryptoAPIs() {
  console.log('🚀 P.I.D.R. Game - Тестирование криптовалютных API\n');
  console.log('='.repeat(60));
  
  let successCount = 0;
  let totalTests = 0;

  // ================== TON API ==================
  console.log('\n💎 TON Network API:');
  totalTests++;
  try {
    if (!process.env.TON_API_KEY) {
      console.log('❌ TON_API_KEY не найден в .env файле');
    } else {
      const tonResponse = await fetch('https://toncenter.com/api/v2/getMasterchainInfo', {
        headers: { 
          'X-API-Key': process.env.TON_API_KEY,
          'Content-Type': 'application/json'
        }
      });
      
      if (tonResponse.ok) {
        const data = await tonResponse.json();
        console.log('✅ TON API работает');
        console.log(`   🔗 Последний блок: ${data.result?.last?.seqno || 'N/A'}`);
        successCount++;
      } else {
        console.log(`❌ TON API ошибка: ${tonResponse.status} ${tonResponse.statusText}`);
      }
    }
  } catch (error) {
    console.log(`❌ TON API ошибка подключения: ${error.message}`);
  }

  // ================== Ethereum API ==================
  console.log('\n🔷 Ethereum API (Etherscan):');
  totalTests++;
  try {
    if (!process.env.ETHERSCAN_API_KEY) {
      console.log('❌ ETHERSCAN_API_KEY не найден в .env файле');
    } else {
      const ethResponse = await fetch(`https://api.etherscan.io/api?module=stats&action=ethsupply&apikey=${process.env.ETHERSCAN_API_KEY}`);
      
      if (ethResponse.ok) {
        const data = await ethResponse.json();
        if (data.status === '1') {
          console.log('✅ Ethereum API работает');
          console.log(`   💰 Общее предложение ETH: ${(parseInt(data.result) / 1e18).toFixed(0)} ETH`);
          successCount++;
        } else {
          console.log(`❌ Ethereum API ошибка: ${data.message}`);
        }
      } else {
        console.log(`❌ Ethereum API ошибка: ${ethResponse.status}`);
      }
    }
  } catch (error) {
    console.log(`❌ Ethereum API ошибка подключения: ${error.message}`);
  }

  // ================== TRON API ==================
  console.log('\n🔴 TRON API (TronGrid):');
  totalTests++;
  try {
    if (!process.env.TRON_GRID_API) {
      console.log('❌ TRON_GRID_API не найден в .env файле');
    } else {
      const tronResponse = await fetch('https://api.trongrid.io/wallet/getnowblock', {
        method: 'POST',
        headers: { 
          'TRON-PRO-API-KEY': process.env.TRON_GRID_API,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({})
      });
      
      if (tronResponse.ok) {
        const data = await tronResponse.json();
        console.log('✅ TRON API работает');
        console.log(`   🔗 Текущий блок: ${data.block_header?.raw_data?.number || 'N/A'}`);
        successCount++;
      } else {
        console.log(`❌ TRON API ошибка: ${tronResponse.status}`);
      }
    }
  } catch (error) {
    console.log(`❌ TRON API ошибка подключения: ${error.message}`);
  }

  // ================== Bitcoin API ==================
  console.log('\n💰 Bitcoin API (Blockchain.info):');
  totalTests++;
  try {
    const btcApiKey = process.env.BLOCKCHAIN_INFO_API;
    const btcUrl = btcApiKey 
      ? `https://blockchain.info/latestblock?api_code=${btcApiKey}`
      : 'https://blockchain.info/latestblock';
    
    const btcResponse = await fetch(btcUrl);
    
    if (btcResponse.ok) {
      const data = await btcResponse.json();
      console.log('✅ Bitcoin API работает');
      console.log(`   🔗 Последний блок: ${data.height}`);
      console.log(`   ⏰ Время блока: ${new Date(data.time * 1000).toLocaleString()}`);
      successCount++;
    } else {
      console.log(`❌ Bitcoin API ошибка: ${btcResponse.status}`);
    }
  } catch (error) {
    console.log(`❌ Bitcoin API ошибка подключения: ${error.message}`);
  }

  // ================== Solana API ==================
  console.log('\n☀️ Solana API:');
  totalTests++;
  try {
    const solanaUrl = process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com';
    
    const solResponse = await fetch(solanaUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'getSlot'
      })
    });
    
    if (solResponse.ok) {
      const data = await solResponse.json();
      if (data.result) {
        console.log('✅ Solana API работает');
        console.log(`   🔗 Текущий слот: ${data.result}`);
        successCount++;
      } else {
        console.log(`❌ Solana API ошибка: ${data.error?.message || 'Unknown error'}`);
      }
    } else {
      console.log(`❌ Solana API ошибка: ${solResponse.status}`);
    }
  } catch (error) {
    console.log(`❌ Solana API ошибка подключения: ${error.message}`);
  }

  // ================== CoinGecko API (курсы) ==================
  console.log('\n📊 CoinGecko API (курсы валют):');
  totalTests++;
  try {
    const geckoResponse = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,the-open-network,tether,solana&vs_currencies=usd');
    
    if (geckoResponse.ok) {
      const data = await geckoResponse.json();
      console.log('✅ CoinGecko API работает');
      console.log(`   💰 BTC: $${data.bitcoin?.usd || 'N/A'}`);
      console.log(`   💰 ETH: $${data.ethereum?.usd || 'N/A'}`);
      console.log(`   💰 TON: $${data['the-open-network']?.usd || 'N/A'}`);
      console.log(`   💰 USDT: $${data.tether?.usd || 'N/A'}`);
      console.log(`   💰 SOL: $${data.solana?.usd || 'N/A'}`);
      successCount++;
    } else {
      console.log(`❌ CoinGecko API ошибка: ${geckoResponse.status}`);
    }
  } catch (error) {
    console.log(`❌ CoinGecko API ошибка подключения: ${error.message}`);
  }

  // ================== Результаты ==================
  console.log('\n' + '='.repeat(60));
  console.log('📋 РЕЗУЛЬТАТЫ ТЕСТИРОВАНИЯ:');
  console.log(`✅ Работающих API: ${successCount}/${totalTests}`);
  console.log(`❌ Ошибок: ${totalTests - successCount}/${totalTests}`);
  
  if (successCount === totalTests) {
    console.log('\n🎉 ВСЕ API РАБОТАЮТ! Готов к запуску платежной системы! 🚀');
  } else if (successCount >= totalTests * 0.5) {
    console.log('\n⚠️  Большинство API работает, но есть проблемы. Проверьте ключи.');
  } else {
    console.log('\n🚨 КРИТИЧЕСКИЕ ОШИБКИ! Настройте API ключи перед запуском.');
  }

  console.log('\n💡 Следующие шаги:');
  console.log('1. Добавьте недостающие API ключи в .env файл');
  console.log('2. Создайте реальные мастер кошельки');
  console.log('3. Настройте мониторинг платежей');
  console.log('4. Протестируйте на testnet сетях');
  
  console.log('\n🔗 Полезные ссылки:');
  console.log('• TON Center: https://t.me/toncenter');
  console.log('• Etherscan: https://etherscan.io/myapikey');
  console.log('• TronGrid: https://www.trongrid.io/');
  console.log('• Blockchain.info: https://www.blockchain.com/api');
}

// Проверка .env файла
function checkEnvFile() {
  console.log('🔍 Проверка .env конфигурации:\n');
  
  const requiredKeys = [
    'TON_API_KEY',
    'ETHERSCAN_API_KEY', 
    'TRON_GRID_API',
    'BLOCKCHAIN_INFO_API',
    'SOLANA_RPC_URL'
  ];

  const optionalKeys = [
    'MASTER_TON_WALLET',
    'MASTER_BTC_WALLET',
    'MASTER_ETH_WALLET',
    'MASTER_TRON_WALLET',
    'MASTER_SOLANA_WALLET'
  ];

  console.log('📋 Обязательные API ключи:');
  requiredKeys.forEach(key => {
    const value = process.env[key];
    if (value) {
      console.log(`✅ ${key}: ${value.substring(0, 10)}...`);
    } else {
      console.log(`❌ ${key}: не найден`);
    }
  });

  console.log('\n💰 Мастер кошельки:');
  optionalKeys.forEach(key => {
    const value = process.env[key];
    if (value) {
      console.log(`✅ ${key}: ${value.substring(0, 10)}...`);
    } else {
      console.log(`⚠️  ${key}: не настроен`);
    }
  });
}

// Запуск тестирования
async function main() {
  console.log('🎮 P.I.D.R. Game - Crypto API Tester');
  console.log('====================================\n');
  
  checkEnvFile();
  console.log('\n' + '='.repeat(60));
  
  await testCryptoAPIs();
}

main().catch(console.error);
