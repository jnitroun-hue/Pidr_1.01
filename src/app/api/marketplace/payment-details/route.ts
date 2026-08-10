import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, getUserIdFromDatabase } from '@/lib/auth-utils';
import { getSupabaseAdmin } from '@/lib/supabase';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function privateJson(body: unknown, init?: ResponseInit) {
  const response = NextResponse.json(body, init);
  response.headers.set('Cache-Control', 'private, no-store, no-cache, must-revalidate');
  response.headers.set('Pragma', 'no-cache');
  return response;
}

/**
 * Реквизиты не входят в публичный список магазина.
 * Их может запросить только авторизованный потенциальный покупатель на шаге оплаты.
 */
export async function POST(request: NextRequest) {
  try {
    const auth = requireAuth(request);
    if (auth.error || !auth.userId) {
      return privateJson({ success: false, error: auth.error || 'Не авторизован' }, { status: 401 });
    }

    const { dbUserId } = await getUserIdFromDatabase(auth.userId, auth.environment);
    if (!dbUserId) {
      return privateJson({ success: false, error: 'Пользователь не найден' }, { status: 404 });
    }

    const body = await request.json();
    const listingId = Number(body.listing_id);
    if (!Number.isInteger(listingId) || listingId <= 0) {
      return privateJson({ success: false, error: 'Некорректный listing_id' }, { status: 400 });
    }

    const db = getSupabaseAdmin();
    if (!db) {
      return privateJson({ success: false, error: 'База данных недоступна' }, { status: 503 });
    }

    const { data: listing, error } = await db
      .from('_pidr_nft_marketplace')
      .select(`
        id,
        seller_user_id,
        status,
        price_ton,
        price_sol,
        price_rub,
        fiat_payment_method,
        seller_wallet_address,
        seller_wallet_network,
        seller_fiat_phone,
        seller_fiat_qr_url
      `)
      .eq('id', listingId)
      .maybeSingle();

    if (error || !listing) {
      return privateJson({ success: false, error: 'Лот не найден' }, { status: 404 });
    }
    if (listing.status !== 'active') {
      return privateJson({ success: false, error: 'Лот уже недоступен' }, { status: 409 });
    }
    if (Number(listing.seller_user_id) === Number(dbUserId)) {
      return privateJson({ success: false, error: 'Нельзя покупать собственный лот' }, { status: 400 });
    }

    const isCrypto = Number(listing.price_ton) > 0 || Number(listing.price_sol) > 0;
    const isFiatP2p =
      Number(listing.price_rub) > 0 &&
      (listing.fiat_payment_method === 'sbp' || listing.fiat_payment_method === 'sberbank');

    return privateJson({
      success: true,
      details: {
        seller_wallet_address: isCrypto ? listing.seller_wallet_address : null,
        seller_wallet_network: isCrypto ? listing.seller_wallet_network : null,
        seller_fiat_phone: isFiatP2p ? listing.seller_fiat_phone : null,
        seller_fiat_qr_url: isFiatP2p ? listing.seller_fiat_qr_url : null,
      },
    });
  } catch (error) {
    return privateJson(
      { success: false, error: error instanceof Error ? error.message : 'Ошибка сервера' },
      { status: 500 }
    );
  }
}
