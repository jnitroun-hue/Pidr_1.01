import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '../../../../lib/supabase';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET;

function getUserIdFromRequest(req: NextRequest): string | null {
  if (!JWT_SECRET) return null;
  const auth = req.headers.get('authorization');
  if (!auth) return null;
  const token = auth.replace('Bearer ', '');
  try {
    const payload = jwt.verify(token, JWT_SECRET) as any;
    return payload.userId;
  } catch {
    return null;
  }
}

// Курсы обмена криптовалют на игровые монеты
const EXCHANGE_RATES = {
  TON: 1000,      // 1 TON = 1000 монет
  BTC: 50000000,  // 1 BTC = 50M монет
  ETH: 2500000,   // 1 ETH = 2.5M монет
  USDT_TRC20: 1000, // 1 USDT = 1000 монет
  USDT_ERC20: 1000, // 1 USDT = 1000 монет
  SOL: 100000,    // 1 SOL = 100k монет
};

// POST /api/wallet/check-payments - Проверить новые платежи и обновить баланс
export async function POST(req: NextRequest) {
  const userId = getUserIdFromRequest(req);
  if (!userId) {
    return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
  }

  try {
    console.log(`💳 Проверяем платежи для пользователя ${userId}`);

    // 1. Получаем все HD адреса пользователя
    const { data: hdAddresses, error: addressError } = await supabase
      .from('_pidr_hd_wallets')
      .select('*')
      .eq('user_id', userId);

    if (addressError) {
      console.error('❌ Ошибка получения HD адресов:', addressError);
      return NextResponse.json({ 
        success: false, 
        message: 'Ошибка получения адресов' 
      }, { status: 500 });
    }

    if (!hdAddresses || hdAddresses.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'У пользователя нет HD адресов',
        newPayments: []
      });
    }

    console.log(`📍 Найдено ${hdAddresses.length} HD адресов для проверки`);

    // 2. Проверяем платежи по каждому адресу
    const newPayments = [];
    
    for (const hdAddress of hdAddresses) {
      try {
        // В реальном проекте здесь будут API вызовы к блокчейн сетям
        const payments = await checkAddressPayments(hdAddress);
        newPayments.push(...payments);
      } catch (error) {
        console.warn(`⚠️ Ошибка проверки адреса ${hdAddress.address}:`, error);
      }
    }

    console.log(`💰 Найдено новых платежей: ${newPayments.length}`);

    // 3. Если есть новые платежи - сохраняем их и обновляем баланс
    let totalGameCoins = 0;
    let newBalance = 0;

    if (newPayments.length > 0) {
      // Получаем текущий баланс пользователя
      const { data: currentUser, error: userError } = await supabase
        .from('_pidr_users')
        .select('coins')
        .eq('id', userId)
        .single();

      if (userError) {
        console.error('❌ Ошибка получения пользователя:', userError);
        return NextResponse.json({ 
          success: false, 
          message: 'Ошибка получения пользователя' 
        }, { status: 500 });
      }

      // Конвертируем платежи в игровые монеты
      for (const payment of newPayments) {
        const rate = EXCHANGE_RATES[payment.coin as keyof typeof EXCHANGE_RATES] || 1000;
        const gameCoins = Math.floor(payment.amount * rate);
        totalGameCoins += gameCoins;

        // Сохраняем транзакцию
        await supabase
          .from('_pidr_coin_transactions')
          .insert({
            user_id: userId,
            type: 'deposit',
            amount: gameCoins,
            crypto_amount: payment.amount,
            crypto_currency: payment.coin,
            tx_hash: payment.txHash,
            address: payment.address,
            status: 'completed',
            description: `Пополнение ${payment.amount} ${payment.coin}`,
            created_at: new Date().toISOString()
          });
      }

      // Обновляем баланс пользователя
      newBalance = (currentUser.coins || 0) + totalGameCoins;
      
      const { error: updateError } = await supabase
        .from('_pidr_users')
        .update({ 
          coins: newBalance,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId);

      if (updateError) {
        console.error('❌ Ошибка обновления баланса:', updateError);
        return NextResponse.json({ 
          success: false, 
          message: 'Ошибка обновления баланса' 
        }, { status: 500 });
      }

      console.log(`✅ Баланс обновлен: +${totalGameCoins} монет, новый баланс: ${newBalance}`);
    }

    return NextResponse.json({
      success: true,
      message: `Проверено ${hdAddresses.length} адресов`,
      newPayments,
      totalGameCoins,
      newBalance: newPayments.length > 0 ? newBalance : null
    });

  } catch (error) {
    console.error('❌ Check payments error:', error);
    return NextResponse.json({ 
      success: false, 
      message: 'Ошибка проверки платежей' 
    }, { status: 500 });
  }
}

// Функция для проверки платежей по конкретному адресу
async function checkAddressPayments(hdAddress: any): Promise<any[]> {
  const { coin, address } = hdAddress;
  
  try {
    // DEMO: Имитируем проверку платежей
    // В реальном проекте здесь будут вызовы к API блокчейн сетей
    
    if (Math.random() < 0.1) { // 10% шанс найти "новый" платеж для демо
      const demoPayment = {
        coin,
        address,
        amount: Math.random() * 0.01 + 0.001, // Случайная сумма
        txHash: `demo_${coin.toLowerCase()}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        blockHeight: Math.floor(Math.random() * 1000000),
        confirmations: 6,
        timestamp: Date.now()
      };

      console.log(`🎯 DEMO: Найден платеж на ${address}: ${demoPayment.amount} ${coin}`);
      return [demoPayment];
    }

    // Реальная проверка будет выглядеть так:
    switch (coin.toUpperCase()) {
      case 'TON':
        return await checkTONPayments(address);
      case 'BTC':
        return await checkBTCPayments(address);
      case 'ETH':
        return await checkETHPayments(address);
      case 'USDT_TRC20':
        return await checkTRC20Payments(address);
      case 'SOL':
        return await checkSOLPayments(address);
      default:
        return [];
    }
  } catch (error) {
    console.error(`❌ Ошибка проверки ${coin} адреса ${address}:`, error);
    return [];
  }
}

// Заглушки для реальных функций проверки платежей
async function checkTONPayments(address: string): Promise<any[]> {
  // TODO: Реализовать через TON API
  return [];
}

async function checkBTCPayments(address: string): Promise<any[]> {
  // TODO: Реализовать через Bitcoin API
  return [];
}

async function checkETHPayments(address: string): Promise<any[]> {
  // TODO: Реализовать через Ethereum API
  return [];
}

async function checkTRC20Payments(address: string): Promise<any[]> {
  // TODO: Реализовать через TRON API
  return [];
}

async function checkSOLPayments(address: string): Promise<any[]> {
  // TODO: Реализовать через Solana API
  return [];
}
