import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '../../../lib/supabase';

export async function GET(req: NextRequest) {
  try {
    console.log('🧪 Тестируем HD кошельки...');

    const testUserId = 'test_user_hd_' + Date.now();
    const supportedCoins = ['USDT', 'TON', 'BTC', 'ETH', 'SOL'];
    const results: any[] = [];

    for (const coin of supportedCoins) {
      try {
        console.log(`🔍 Тестируем генерацию ${coin} адреса...`);

        // Генерируем адрес через API
        const response = await fetch(
          new URL('/api/wallet/hd-addresses', req.url).toString(),
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              coin: coin,
              userId: testUserId 
            })
          }
        );

        const data = await response.json();

        if (data.success) {
          results.push({
            coin: coin,
            status: 'success',
            address: data.address,
            details: data.details || data.address
          });
          console.log(`✅ ${coin}: ${data.address}`);
        } else {
          results.push({
            coin: coin,
            status: 'error',
            error: data.message
          });
          console.error(`❌ ${coin}: ${data.message}`);
        }

      } catch (coinError: any) {
        results.push({
          coin: coin,
          status: 'error',
          error: coinError.message
        });
        console.error(`❌ ${coin} error:`, coinError);
      }

      // Небольшая пауза между запросами
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    // Проверяем, что адреса сохранились в БД
    const { data: savedAddresses, error: dbError } = await supabase
      .from('_pidr_hd_wallets')
      .select('*')
      .eq('user_id', testUserId);

    console.log(`📊 Найдено ${savedAddresses?.length || 0} адресов в БД`);

    // Очищаем тестовые данные
    await supabase
      .from('_pidr_hd_wallets')
      .delete()
      .eq('user_id', testUserId);

    return NextResponse.json({
      success: true,
      message: 'HD кошельки протестированы',
      testUserId: testUserId,
      results: results,
      savedInDB: savedAddresses?.length || 0,
      dbError: dbError?.message || null,
      summary: {
        total: supportedCoins.length,
        successful: results.filter((r: any) => r.status === 'success').length,
        failed: results.filter((r: any) => r.status === 'error').length
      }
    });

  } catch (error: any) {
    console.error('❌ Test HD wallets error:', error);
    return NextResponse.json({
      success: false,
      message: `Ошибка тестирования: ${error.message}`,
      error: error.message
    }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { userId, coins } = await req.json();
    
    if (!userId) {
      return NextResponse.json({
        success: false,
        message: 'userId обязателен'
      }, { status: 400 });
    }

    const coinsToTest = coins || ['USDT', 'TON', 'ETH', 'SOL'];
    console.log(`🧪 Тестируем HD кошельки для пользователя ${userId}, монеты: ${coinsToTest.join(', ')}`);

    const results: any[] = [];

    for (const coin of coinsToTest) {
      try {
        // Генерируем адрес
        const response = await fetch(
          new URL('/api/wallet/hd-addresses', req.url).toString(),
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              coin: coin,
              userId: userId 
            })
          }
        );

        const data = await response.json();
        results.push({
          coin: coin,
          success: data.success,
          address: data.address,
          existing: data.existing || false,
          error: data.message || null
        });

      } catch (error: any) {
        results.push({
          coin: coin,
          success: false,
          error: error.message
        });
      }
    }

    // Получаем все адреса пользователя из БД
    const { data: userAddresses, error: dbError } = await supabase
      .from('_pidr_hd_wallets')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: true });

    return NextResponse.json({
      success: true,
      message: `HD кошельки протестированы для пользователя ${userId}`,
      userId: userId,
      results: results,
      userAddresses: userAddresses || [],
      dbError: dbError?.message || null,
      summary: {
        tested: coinsToTest.length,
        successful: results.filter((r: any) => r.success).length,
        existing: results.filter((r: any) => r.existing).length,
        totalInDB: userAddresses?.length || 0
      }
    });

  } catch (error: any) {
    console.error('❌ Test user HD wallets error:', error);
    return NextResponse.json({
      success: false,
      message: `Ошибка тестирования: ${error.message}`
    }, { status: 500 });
  }
}
