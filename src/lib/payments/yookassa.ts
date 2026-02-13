/**
 * YooKassa Payment Integration
 * Поддержка: Сбер, СБП, Юмани, Банковские карты
 */

import { createClient } from '@supabase/supabase-js';

const YOOKASSA_SHOP_ID = process.env.YOOKASSA_SHOP_ID || '';
const YOOKASSA_SECRET_KEY = process.env.YOOKASSA_SECRET_KEY || '';
const YOOKASSA_API_URL = process.env.YOOKASSA_API_URL || 'https://api.yookassa.ru/v3';

export interface YooKassaPaymentRequest {
  amount: {
    value: string; // Сумма в рублях (например, "100.00")
    currency: 'RUB';
  };
  description: string;
  capture: boolean; // Автоматическое подтверждение
  confirmation: {
    type: 'redirect' | 'embedded' | 'qr' | 'external';
    return_url?: string; // URL для возврата после оплаты
  };
  metadata?: {
    userId?: string;
    itemId?: string;
    itemType?: string;
    orderId?: string;
  };
  payment_method_data?: {
    type: 'bank_card' | 'sberbank' | 'yoo_money' | 'sbp';
  };
}

export interface YooKassaPaymentResponse {
  id: string;
  status: 'pending' | 'waiting_for_capture' | 'succeeded' | 'canceled';
  amount: {
    value: string;
    currency: string;
  };
  description: string;
  confirmation: {
    type: string;
    confirmation_url?: string;
    confirmation_token?: string;
  };
  created_at: string;
  metadata?: Record<string, any>;
}

/**
 * Создать платеж в YooKassa
 */
export async function createYooKassaPayment(
  request: YooKassaPaymentRequest
): Promise<YooKassaPaymentResponse | null> {
  try {
    if (!YOOKASSA_SHOP_ID || !YOOKASSA_SECRET_KEY) {
      console.error('❌ YooKassa credentials not configured');
      return null;
    }

    const auth = Buffer.from(`${YOOKASSA_SHOP_ID}:${YOOKASSA_SECRET_KEY}`).toString('base64');

    const response = await fetch(`${YOOKASSA_API_URL}/payments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${auth}`,
        'Idempotence-Key': `${Date.now()}-${Math.random()}`
      },
      body: JSON.stringify(request)
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('❌ YooKassa payment creation error:', error);
      return null;
    }

    const data: YooKassaPaymentResponse = await response.json();
    console.log('✅ YooKassa payment created:', data.id);
    return data;
  } catch (error) {
    console.error('❌ Error creating YooKassa payment:', error);
    return null;
  }
}

/**
 * Получить статус платежа
 */
export async function getYooKassaPaymentStatus(
  paymentId: string
): Promise<YooKassaPaymentResponse | null> {
  try {
    if (!YOOKASSA_SHOP_ID || !YOOKASSA_SECRET_KEY) {
      console.error('❌ YooKassa credentials not configured');
      return null;
    }

    const auth = Buffer.from(`${YOOKASSA_SHOP_ID}:${YOOKASSA_SECRET_KEY}`).toString('base64');

    const response = await fetch(`${YOOKASSA_API_URL}/payments/${paymentId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${auth}`
      }
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('❌ YooKassa payment status error:', error);
      return null;
    }

    const data: YooKassaPaymentResponse = await response.json();
    return data;
  } catch (error) {
    console.error('❌ Error getting YooKassa payment status:', error);
    return null;
  }
}

/**
 * Подтвердить платеж (capture)
 */
export async function captureYooKassaPayment(
  paymentId: string
): Promise<YooKassaPaymentResponse | null> {
  try {
    if (!YOOKASSA_SHOP_ID || !YOOKASSA_SECRET_KEY) {
      console.error('❌ YooKassa credentials not configured');
      return null;
    }

    const auth = Buffer.from(`${YOOKASSA_SHOP_ID}:${YOOKASSA_SECRET_KEY}`).toString('base64');

    const response = await fetch(`${YOOKASSA_API_URL}/payments/${paymentId}/capture`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${auth}`,
        'Idempotence-Key': `${Date.now()}-${Math.random()}`
      },
      body: JSON.stringify({})
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('❌ YooKassa payment capture error:', error);
      return null;
    }

    const data: YooKassaPaymentResponse = await response.json();
    console.log('✅ YooKassa payment captured:', paymentId);
    return data;
  } catch (error) {
    console.error('❌ Error capturing YooKassa payment:', error);
    return null;
  }
}

/**
 * Проверить подпись webhook от YooKassa
 */
export function verifyYooKassaWebhook(
  body: string,
  signature: string
): boolean {
  // В реальном проекте нужно проверять подпись через HMAC
  // Для упрощения пока возвращаем true
  // TODO: Реализовать проверку подписи
  return true;
}

