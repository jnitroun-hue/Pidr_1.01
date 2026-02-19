import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-utils';

// ✅ Явная конфигурация runtime для Next.js 15
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// 💳 API ДЛЯ TELEGRAM PAYMENTS

export async function POST(request: NextRequest) {
  try {
    // ✅ ИСПРАВЛЕНО: requireAuth синхронная функция, не нужен await
    const auth = requireAuth(request);
    if (auth.error || !auth.userId) {
      return NextResponse.json({ success: false, message: auth.error || 'Требуется авторизация' }, { status: 401 });
    }

    const { userId } = auth;
    const telegramId = userId; // Для совместимости
    const body = await request.json();
    const { listingId, currency, amount } = body; // currency: 'TON' или 'SOL'

    console.log(`💳 [TELEGRAM PAYMENT] Пользователь ${telegramId} оплачивает лот ${listingId}: ${amount} ${currency}`);

    // ✅ ДЛЯ TON - ИСПОЛЬЗУЕМ TON CONNECT
    if (currency === 'TON') {
      // Генерируем TON payment URL для @wallet
      const tonPaymentUrl = `https://app.tonkeeper.com/transfer/${process.env.TON_RECEIVER_ADDRESS || 'EQBxxxx'}?amount=${Math.floor(amount * 1000000000)}&text=NFT_${listingId}_${telegramId}`;
      
      console.log(`✅ [TON PAYMENT] TON Payment URL: ${tonPaymentUrl}`);
      
      return NextResponse.json({
        success: true,
        paymentUrl: tonPaymentUrl,
        paymentMethod: 'TON_WALLET',
        message: 'Откройте TON кошелёк для оплаты'
      });
    }

    // ✅ ДЛЯ SOL - ИСПОЛЬЗУЕМ SOLANA PAY
    if (currency === 'SOL') {
      // Генерируем Solana Pay URL
      const solanaPayUrl = `solana:${process.env.SOLANA_RECEIVER_ADDRESS || ''}?amount=${amount}&label=NFT_${listingId}&message=NFT_Card_Purchase`;
      
      console.log(`✅ [SOL PAYMENT] Solana Pay URL: ${solanaPayUrl}`);
      
      return NextResponse.json({
        success: true,
        paymentUrl: solanaPayUrl,
        paymentMethod: 'SOLANA_PAY',
        message: 'Откройте Solana кошелёк для оплаты'
      });
    }

    // ❌ НЕИЗВЕСТНАЯ ВАЛЮТА
    return NextResponse.json({ 
      success: false, 
      error: 'Неподдерживаемая валюта' 
    }, { status: 400 });

  } catch (error: any) {
    console.error('❌ [TELEGRAM PAYMENT] Ошибка:', error);
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
}

// ✅ WEBHOOK ДЛЯ ПОДТВЕРЖДЕНИЯ ОПЛАТЫ
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const invoicePayload = searchParams.get('payload');

    if (!invoicePayload) {
      return NextResponse.json({ success: false, error: 'Missing payload' }, { status: 400 });
    }

    const data = JSON.parse(invoicePayload);
    console.log(`✅ [PAYMENT CONFIRMED] Лот ${data.listingId} оплачен пользователем ${data.buyerId}`);

    // TODO: Обновить статус лота в БД (sold), передать NFT покупателю

    return NextResponse.json({
      success: true,
      message: 'Payment confirmed'
    });

  } catch (error: any) {
    console.error('❌ [PAYMENT WEBHOOK] Ошибка:', error);
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
}

