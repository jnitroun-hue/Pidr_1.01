import type { SupabaseClient } from '@supabase/supabase-js';

/** Передача NFT покупателю после успешной оплаты лота */
export async function fulfillNftListingPurchase(
  supabase: SupabaseClient,
  params: {
    listingId: number;
    buyerDbUserId: number;
    paidAmount?: number;
  }
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { listingId, buyerDbUserId, paidAmount } = params;

  const { data: listing, error: le } = await supabase
    .from('_pidr_nft_marketplace')
    .select('id, status, seller_user_id, nft_card_id, price_rub, price_ton, price_sol')
    .eq('id', listingId)
    .single();

  if (le || !listing) {
    return { ok: false, error: 'Лот не найден' };
  }

  if (listing.status !== 'active') {
    return { ok: false, error: 'Лот уже продан или снят' };
  }

  if (listing.seller_user_id === buyerDbUserId) {
    return { ok: false, error: 'Покупатель совпадает с продавцом' };
  }

  if (paidAmount != null && listing.price_rub) {
    const expected = Number(listing.price_rub);
    if (expected > 0 && Math.abs(expected - paidAmount) > 0.05) {
      return { ok: false, error: `Сумма не совпадает: ожид. ${expected}, оплата ${paidAmount}` };
    }
  }

  const { error: transferErr } = await supabase
    .from('_pidr_nft_cards')
    .update({ user_id: buyerDbUserId, updated_at: new Date().toISOString() })
    .eq('id', listing.nft_card_id);

  if (transferErr) {
    return { ok: false, error: transferErr.message };
  }

  const { error: updErr } = await supabase
    .from('_pidr_nft_marketplace')
    .update({
      status: 'sold',
      buyer_user_id: buyerDbUserId,
      sold_at: new Date().toISOString(),
    })
    .eq('id', listingId);

  if (updErr) {
    return { ok: false, error: updErr.message };
  }

  return { ok: true };
}
