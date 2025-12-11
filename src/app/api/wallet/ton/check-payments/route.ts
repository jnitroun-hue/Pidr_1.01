/**
 * ============================================================
 * TON CHECK PAYMENTS API
 * ============================================================
 * Endpoint для проверки новых TON платежей
 * Можно вызывать вручную или через cron
 */

import { NextRequest, NextResponse } from 'next/server';
import { tonPaymentService } from '@/lib/wallets/ton-payment-service';

export async function POST(req: NextRequest) {
  try {
    console.log('🔍 Начинаем проверку TON платежей...');

    // Проверяем и обрабатываем платежи
    const result = await tonPaymentService.checkAndProcessPayments();

    if (!result.success) {
      return NextResponse.json({
        success: false,
        message: 'Ошибка проверки платежей'
      }, { status: 500 });
    }

    console.log(`✅ Проверка завершена: ${result.processed} новых платежей`);

    return NextResponse.json({
      success: true,
      message: `Обработано ${result.processed} новых платежей`,
      data: {
        processed: result.processed,
        newPayments: result.newPayments
      }
    });

  } catch (error: any) {
    console.error('❌ Ошибка проверки TON платежей:', error);
    return NextResponse.json({
      success: false,
      message: 'Ошибка проверки платежей: ' + (error instanceof Error ? error.message : String(error))
    }, { status: 500 });
  }
}

// Для cron jobs (без авторизации, но с секретным ключом)
export async function GET(req: NextRequest) {
  try {
    // Проверяем секретный ключ для cron
    const authHeader = req.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET || 'change_me_in_production';

    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({
        success: false,
        message: 'Unauthorized: Invalid cron secret'
      }, { status: 401 });
    }

    console.log('🔍 [CRON] Начинаем проверку TON платежей...');

    // Проверяем и обрабатываем платежи
    const result = await tonPaymentService.checkAndProcessPayments();

    return NextResponse.json({
      success: true,
      message: `[CRON] Обработано ${result.processed} новых платежей`,
      data: {
        processed: result.processed,
        newPayments: result.newPayments
      }
    });

  } catch (error: any) {
    console.error('❌ [CRON] Ошибка проверки TON платежей:', error);
    return NextResponse.json({
      success: false,
      message: 'Ошибка: ' + (error instanceof Error ? error.message : String(error))
    }, { status: 500 });
  }
}

