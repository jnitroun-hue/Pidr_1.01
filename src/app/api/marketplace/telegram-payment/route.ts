import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-utils';

// 💳 API ДЛЯ TELEGRAM PAYMENTS

export async function POST(request: NextRequest) {
  try {
    // ПРОВЕРЯЕМ АВТОРИЗАЦИЮ
    const auth = await requireAuth(request);
    if (auth.error) {
      return NextResponse.json({ success: false, message: auth.error }, { status: 401 });
    }

    const telegramId = auth.userId as string;
    const body = await request.json();
    const { listingId, currency, amount } = body; // currency: 'TON' или 'SOL'

    console.log(`💳 [TELEGRAM PAYMENT] Пользователь ${telegramId} оплачивает лот ${listingId}: ${amount} ${currency}`);

    // ✅ СОЗДАЁМ TELEGRAM INVOICE
    const invoicePayload = JSON.stringify({
      listingId,
      buyerId: telegramId,
      currency,
      amount,
      timestamp: Date.now()
    });

    // ФОРМИРУЕМ INVOICE LINK
    const botUsername = process.env.TELEGRAM_BOT_USERNAME || 'your_bot'; // ✅ ТВОЙ БОТ!
    const title = `Покупка NFT карты`;
    const description = `Лот #${listingId} - ${amount} ${currency}`;
    const prices = [
      {
        label: `NFT Card ${listingId}`,
        amount: Math.floor(amount * 1000000000) // ✅ В НАНОСТАРСАХ (1 TON = 10^9)
      }
    ];

    // ✅ TELEGRAM INVOICE URL
    const invoiceUrl = `https://t.me/${botUsername}?start=pay_${listingId}`;

    console.log(`✅ [TELEGRAM PAYMENT] Invoice URL: ${invoiceUrl}`);

    return NextResponse.json({
      success: true,
      invoiceUrl,
      invoicePayload,
      message: 'Откройте ссылку для оплаты'
    });

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

