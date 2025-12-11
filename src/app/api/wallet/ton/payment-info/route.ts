/**
 * ============================================================
 * TON PAYMENT INFO API
 * ============================================================
 * Endpoint для получения информации для TON платежа
 */

import { NextRequest, NextResponse } from 'next/server';
import { tonPaymentService } from '@/lib/wallets/ton-payment-service';
import { requireAuth } from '@/lib/auth-utils';

export async function GET(req: NextRequest) {
  try {
    // Проверяем авторизацию
    const auth = requireAuth(req);
    if (auth.error || !auth.userId) {
      return NextResponse.json({ 
        success: false, 
        message: auth.error || 'Не авторизован' 
      }, { status: 401 });
    }

    const userId = auth.userId;

    console.log(`📱 Запрос TON payment info для пользователя ${userId}`);

    // Получаем информацию для платежа
    const paymentInfo = await tonPaymentService.getPaymentInfo(userId);

    return NextResponse.json({
      success: true,
      data: {
        coin: 'TON',
        network: 'TON',
        address: paymentInfo.address,
        memo: paymentInfo.memo,
        amount_ton: paymentInfo.amount_ton,
        amount_coins: paymentInfo.amount_coins,
        qr_url: paymentInfo.qr_url,
        rate: '1 TON = 1000 монет',
        min_amount: 0.1,
        instructions: [
          '1. Откройте ваш TON кошелек',
          '2. Отправьте TON на указанный адрес',
          '3. ОБЯЗАТЕЛЬНО укажите MEMO в комментарии к переводу',
          '4. Монеты зачислятся автоматически в течение 1-2 минут'
        ]
      }
    });

  } catch (error: any) {
    console.error('❌ Ошибка получения TON payment info:', error);
    return NextResponse.json({
      success: false,
      message: 'Ошибка получения информации для платежа: ' + (error instanceof Error ? error.message : String(error))
    }, { status: 500 });
  }
}

