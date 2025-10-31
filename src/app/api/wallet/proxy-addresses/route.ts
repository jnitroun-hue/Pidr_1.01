import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '../../../../lib/supabase';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET;

function getUserIdFromRequest(req: NextRequest): string | null {
  if (!JWT_SECRET) return null;
  
  const token = req.cookies.get('auth_token')?.value;
  if (!token) return null;
  
  try {
    const payload = jwt.verify(token, JWT_SECRET) as any;
    return payload.userId;
  } catch {
    return null;
  }
}

// Создаем детерминистический прокси-адрес
function generateProxyAddress(userId: string, coin: string): string {
  const crypto = require('crypto');
  const secret = process.env.PROXY_WALLET_SECRET || 'pidr_proxy_secret_2024';
  
  const seed = crypto.createHash('sha256')
    .update(`${userId}_${coin}_${secret}`)
    .digest('hex');

  switch (coin) {
    case 'USDT': {
      const hash = crypto.createHash('sha256').update(seed + 'tron').digest('hex');
      return 'T' + hash.substring(0, 33).toUpperCase();
    }
    case 'TON': {
      const hash = crypto.createHash('sha256').update(seed + 'ton').digest('hex');
      return 'EQ' + hash.substring(0, 46);
    }
    case 'ETH': {
      const hash = crypto.createHash('sha256').update(seed + 'eth').digest('hex');
      return '0x' + hash.substring(0, 40);
    }
    case 'SOL': {
      const hash = crypto.createHash('sha256').update(seed + 'sol').digest('hex');
      // Простая base58-подобная кодировка
      const alphabet = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
      let result = '';
      for (let i = 0; i < 44; i++) {
        const byte = parseInt(hash.substring(i * 2, i * 2 + 2), 16);
        result += alphabet[byte % alphabet.length];
      }
      return result;
    }
    case 'BTC': {
      const hash = crypto.createHash('sha256').update(seed + 'btc').digest('hex');
      return '1' + hash.substring(0, 33);
    }
    default:
      throw new Error(`Unsupported coin: ${coin}`);
  }
}

// GET /api/wallet/proxy-addresses - Получить прокси-адреса пользователя
export async function GET(req: NextRequest) {
  try {
    const userId = getUserIdFromRequest(req);
    if (!userId) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    console.log(`💳 Получаем прокси-адреса для пользователя ${userId}`);

    // Проверяем, есть ли уже сохраненные адреса
    const { data: existingAddresses } = await supabase
      .from('_pidr_user_proxy_addresses')
      .select('*')
      .eq('user_id', userId);

    const coins = ['USDT', 'TON', 'ETH', 'SOL', 'BTC'];
    const addresses: any[] = [];

    for (const coin of coins) {
      // Проверяем, есть ли уже адрес для этой монеты
      const existing = existingAddresses?.find((addr: any) => addr.coin === coin);
      
      if (existing) {
        addresses.push({
          coin: existing.coin,
          proxyAddress: existing.proxy_address,
          masterAddress: existing.master_address,
          createdAt: existing.created_at
        });
      } else {
        // Генерируем новый прокси-адрес
        const proxyAddress = generateProxyAddress(userId, coin);
        
        // Мастер-адреса (замените на свои реальные)
        const masterAddresses = {
          USDT: process.env.MASTER_USDT_ADDRESS || 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t',
          TON: process.env.MASTER_TON_ADDRESS || 'EQBvW8Z5huBkMJYdnfAEM5JqTNkuWX3diqYENkWsIL0XggGG',
          ETH: process.env.MASTER_ETH_ADDRESS || '0x742d35Cc6639C0532fba96b9f8b1B8F4D3c8b3a1',
          SOL: process.env.MASTER_SOL_ADDRESS || '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgHPv',
          BTC: process.env.MASTER_BTC_ADDRESS || '1BvBMSEYstWetqTFn5Au4m4GFg7xJaNVN2'
        };

        const masterAddress = masterAddresses[coin as keyof typeof masterAddresses];

        // Сохраняем в БД
        const { data: savedAddress, error } = await supabase
          .from('_pidr_user_proxy_addresses')
          .insert({
            user_id: userId,
            coin: coin,
            proxy_address: proxyAddress,
            master_address: masterAddress,
            created_at: new Date().toISOString()
          })
          .select()
          .single();

        if (!error && savedAddress) {
          addresses.push({
            coin: savedAddress.coin,
            proxyAddress: savedAddress.proxy_address,
            masterAddress: savedAddress.master_address,
            createdAt: savedAddress.created_at
          });
        }
      }
    }

    console.log(`✅ Сгенерировано/найдено ${addresses.length} прокси-адресов`);

    return NextResponse.json({
      success: true,
      addresses: addresses
    });

  } catch (error: any) {
    console.error('❌ Proxy addresses error:', error);
    return NextResponse.json({
      success: false,
      message: 'Ошибка сервера'
    }, { status: 500 });
  }
}

// POST /api/wallet/proxy-addresses - Получить прокси-адрес для конкретной монеты
export async function POST(req: NextRequest) {
  try {
    const { coin, userId: providedUserId } = await req.json();
    
    let userId = getUserIdFromRequest(req);
    if (!userId && providedUserId) {
      userId = providedUserId; // Для демо-платежей
    }
    
    if (!userId || !coin) {
      return NextResponse.json({
        success: false,
        message: 'Недостаточно данных'
      }, { status: 400 });
    }

    console.log(`💳 Получаем прокси-адрес ${coin} для пользователя ${userId}`);

    // Проверяем, есть ли уже адрес
    const { data: existing } = await supabase
      .from('_pidr_user_proxy_addresses')
      .select('*')
      .eq('user_id', userId)
      .eq('coin', coin)
      .single();

    if (existing) {
      return NextResponse.json({
        success: true,
        address: existing.proxy_address,
        coin: existing.coin,
        existing: true
      });
    }

    // Генерируем новый прокси-адрес
    const proxyAddress = generateProxyAddress(userId, coin);
    
    const masterAddresses = {
      USDT: process.env.MASTER_USDT_ADDRESS || 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t',
      TON: process.env.MASTER_TON_ADDRESS || 'EQBvW8Z5huBkMJYdnfAEM5JqTNkuWX3diqYENkWsIL0XggGG',
      ETH: process.env.MASTER_ETH_ADDRESS || '0x742d35Cc6639C0532fba96b9f8b1B8F4D3c8b3a1',
      SOL: process.env.MASTER_SOL_ADDRESS || '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgHPv',
      BTC: process.env.MASTER_BTC_ADDRESS || '1BvBMSEYstWetqTFn5Au4m4GFg7xJaNVN2'
    };

    const masterAddress = masterAddresses[coin as keyof typeof masterAddresses];

    // Сохраняем в БД
    const { data: savedAddress, error } = await supabase
      .from('_pidr_user_proxy_addresses')
      .insert({
        user_id: userId,
        coin: coin,
        proxy_address: proxyAddress,
        master_address: masterAddress,
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      console.error('❌ Ошибка сохранения прокси-адреса:', error);
      return NextResponse.json({
        success: false,
        message: 'Ошибка сохранения адреса'
      }, { status: 500 });
    }

    console.log(`✅ Создан новый прокси-адрес ${coin}: ${proxyAddress}`);

    return NextResponse.json({
      success: true,
      address: proxyAddress,
      coin: coin,
      existing: false
    });

  } catch (error: any) {
    console.error('❌ Create proxy address error:', error);
    return NextResponse.json({
      success: false,
      message: 'Ошибка сервера'
    }, { status: 500 });
  }
}
