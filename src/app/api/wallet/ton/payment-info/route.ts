/**
 * ============================================================
 * TON PAYMENT INFO API
 * ============================================================
 * Endpoint для получения информации для TON платежа
 */

import { NextRequest, NextResponse } from 'next/server';
import { tonPaymentService } from '@/lib/wallets/ton-payment-service';
import { requireAuth } from '@/lib/auth-utils';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function noStoreJson(body: any, init?: ResponseInit) {
  const response = NextResponse.json(body, init);
  response.headers.set('Cache-Control', 'private, no-store, no-cache, must-revalidate');
  response.headers.set('Pragma', 'no-cache');
  response.headers.set('Expires', '0');
  return response;
}

export async function GET(req: NextRequest) {
  try {
    // Проверяем авторизацию
    const auth = requireAuth(req);
    if (auth.error || !auth.userId) {
      return noStoreJson({ 
        success: false, 
        message: auth.error || 'Не авторизован' 
      }, { status: 401 });
    }

    const userId = auth.userId;

    console.log(`📱 Запрос TON payment info для пользователя ${userId}`);

    // Получаем информацию для платежа
    const paymentInfo = await tonPaymentService.getPaymentInfo(userId);

    return noStoreJson({
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
    const msg = error instanceof Error ? error.message : String(error);
    if (msg === 'MASTER_TON_ADDRESS_NOT_SET' || msg.includes('MASTER_TON_ADDRESS_NOT_SET')) {
      return noStoreJson(
        {
          success: false,
          code: 'TON_NOT_CONFIGURED',
          message:
            'На сервере не задан MASTER_TON_ADDRESS — пополнение TON через этот метод недоступно. Добавьте переменную окружения в Vercel.'
        },
        { status: 503 }
      );
    }
    return noStoreJson({
      success: false,
      message: 'Ошибка получения информации для платежа: ' + (error instanceof Error ? error.message : String(error))
    }, { status: 500 });
  }
}

