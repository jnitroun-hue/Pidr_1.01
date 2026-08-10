import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { invalidateMarketplaceListCache } from '@/lib/marketplace/listing-cache';

// 🔔 WEBHOOK ДЛЯ ПОДТВЕРЖДЕНИЯ ОПЛАТЫ ЧЕРЕЗ TELEGRAM

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    console.log('🔔 [WEBHOOK] Получено уведомление от Telegram:', body);

    // ✅ TELEGRAM ОТПРАВЛЯЕТ:
    // {
    //   "update_id": 123456,
    //   "pre_checkout_query": {
    //     "id": "query_id",
    //     "from": { "id": 123456, "username": "user" },
    //     "currency": "XTR", // Telegram Stars
    //     "total_amount": 1000,
    //     "invoice_payload": "{\"listingId\":5,\"buyerId\":\"123456\",...}"
    //   }
    // }

    // ИЛИ:
    // {
    //   "update_id": 123457,
    //   "message": {
    //     "successful_payment": {
    //       "currency": "XTR",
    //       "total_amount": 1000,
    //       "invoice_payload": "{\"listingId\":5,\"buyerId\":\"123456\",...}",
    //       "telegram_payment_charge_id": "charge_id"
    //     }
    //   }
    // }

    // 🔍 ПРОВЕРЯЕМ КАКОЙ ТИП УВЕДОМЛЕНИЯ
    if (body.pre_checkout_query) {
      // ✅ PRE-CHECKOUT: Подтверждаем что можем обработать платеж
      const { id, invoice_payload } = body.pre_checkout_query;
      
      console.log(`✅ [PRE-CHECKOUT] Подтверждаем платеж: ${id}`);

      // TODO: Отправить ответ боту через Telegram Bot API
      // await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/answerPreCheckoutQuery`, {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ pre_checkout_query_id: id, ok: true })
      // });

      return NextResponse.json({ success: true, message: 'Pre-checkout confirmed' });
    }

    if (body.message?.successful_payment) {
      // ✅ УСПЕШНАЯ ОПЛАТА: Передаём NFT покупателю
      const { invoice_payload, telegram_payment_charge_id } = body.message.successful_payment;
      const payloadData = JSON.parse(invoice_payload);
      const { listingId, buyerId } = payloadData;

      console.log(`💰 [PAYMENT SUCCESS] Лот ${listingId} оплачен пользователем ${buyerId}, charge: ${telegram_payment_charge_id}`);

      // 1️⃣ ПОЛУЧАЕМ ЛОТИНГ
      const { data: listing, error: listingError } = await supabase
        .from('_pidr_nft_marketplace')
        .select('*, nft_card:_pidr_nft_cards(*)')
        .eq('id', listingId)
        .eq('status', 'active')
        .single();

      if (listingError || !listing) {
        console.error('❌ [PAYMENT] Лот не найден или уже продан:', listingError);
        return NextResponse.json({ success: false, error: 'Listing not found' }, { status: 404 });
      }

      // 2️⃣ ПЕРЕДАЁМ NFT ПОКУПАТЕЛЮ
      const { error: transferError } = await supabase
        .from('_pidr_nft_cards')
        .update({ user_id: parseInt(buyerId) })
        .eq('id', listing.nft_card_id);

      if (transferError) {
        console.error('❌ [PAYMENT] Ошибка передачи NFT:', transferError);
        return NextResponse.json({ success: false, error: 'Transfer failed' }, { status: 500 });
      }

      // 3️⃣ ОБНОВЛЯЕМ СТАТУС ЛОТА
      const { error: updateError } = await supabase
        .from('_pidr_nft_marketplace')
        .update({
          status: 'sold',
          buyer_user_id: parseInt(buyerId),
          sold_at: new Date().toISOString()
        })
        .eq('id', listingId);

      if (updateError) {
        console.error('❌ [PAYMENT] Ошибка обновления лота:', updateError);
      } else {
        await invalidateMarketplaceListCache();
      }

      console.log(`✅ [PAYMENT] NFT ${listing.nft_card_id} передан покупателю ${buyerId}`);

      return NextResponse.json({
        success: true,
        message: 'NFT transferred successfully'
      });
    }

    // ❌ НЕИЗВЕСТНЫЙ ТИП УВЕДОМЛЕНИЯ
    console.warn('⚠️ [WEBHOOK] Неизвестный тип уведомления:', body);
    return NextResponse.json({ success: false, error: 'Unknown update type' }, { status: 400 });

  } catch (error: any) {
    console.error('❌ [WEBHOOK] Ошибка:', error);
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
}

// ✅ GET ДЛЯ ПРОВЕРКИ ЧТО WEBHOOK РАБОТАЕТ
export async function GET() {
  return NextResponse.json({ 
    status: 'active',
    message: 'Telegram Payments Webhook is running' 
  });
}

