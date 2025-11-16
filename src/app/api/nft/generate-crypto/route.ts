/**
 * 🪙 API: Генерация NFT карт за криптовалюту
 * 
 * POST /api/nft/generate-crypto
 * 
 * Body: {
 *   theme: string,
 *   quantity: number,
 *   crypto: 'TON' | 'SOL' | 'ETH',
 *   transactionHash: string,
 *   walletAddress: string
 * }
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const body = await request.json();
    const { theme, quantity, crypto, transactionHash, walletAddress } = body;

    const telegramIdHeader = request.headers.get('x-telegram-id');
    
    if (!telegramIdHeader) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const userId = parseInt(telegramIdHeader, 10);

    console.log(`🪙 [generate-crypto] Генерация за ${crypto}:`, {
      userId,
      theme,
      quantity,
      transactionHash,
      walletAddress
    });

    // ✅ ПРОВЕРЯЕМ ТРАНЗАКЦИЮ (в реальности надо проверять через blockchain API)
    // Для MVP просто логируем
    console.log(`✅ Транзакция ${transactionHash} подтверждена (mock)`);

    // ✅ ГЕНЕРИРУЕМ КАРТЫ (используем существующий API)
    const generateResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/nft/generate-theme`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-telegram-id': userId.toString()
      },
      body: JSON.stringify({
        theme,
        quantity
      })
    });

    if (!generateResponse.ok) {
      const errorData = await generateResponse.json();
      return NextResponse.json(
        { success: false, error: errorData.error || 'Ошибка генерации' },
        { status: 500 }
      );
    }

    const generateData = await generateResponse.json();

    // ✅ ЗАПИСЫВАЕМ ТРАНЗАКЦИЮ В БД
    const { error: txError } = await supabase
      .from('_pidr_crypto_transactions')
      .insert({
        user_id: userId,
        crypto_type: crypto,
        transaction_hash: transactionHash,
        wallet_address: walletAddress,
        amount: quantity === 1 ? 0.1 : 1.0, // Примерная цена
        purpose: `NFT Generation: ${theme} x${quantity}`,
        status: 'completed',
        created_at: new Date().toISOString()
      });

    if (txError) {
      console.error('❌ Ошибка записи транзакции:', txError);
    }

    return NextResponse.json({
      success: true,
      message: `Сгенерировано ${quantity} карт за ${crypto}`,
      cards: generateData.cards
    });

  } catch (error: any) {
    console.error('❌ [generate-crypto] Ошибка:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

