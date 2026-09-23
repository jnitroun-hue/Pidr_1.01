import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { requireAuth, getUserIdFromDatabase } from '@/lib/auth-utils';
import { mintPromoFreeNft } from '@/lib/promo/mint-promo-nft';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** POST /api/promocode/claim-nft — забрать бесплатную карту после промокода PIDR20 */
export async function POST(req: NextRequest) {
  const auth = requireAuth(req);
  if (auth.error || !auth.userId) {
    return NextResponse.json({ success: false, message: auth.error || 'Требуется авторизация' }, { status: 401 });
  }

  const { dbUserId } = await getUserIdFromDatabase(auth.userId, auth.environment);
  if (!dbUserId) {
    return NextResponse.json({ success: false, message: 'Пользователь не найден' }, { status: 404 });
  }

  const { data: pending, error: pendingError } = await supabaseAdmin
    .from('_pidr_promo_nft_grants')
    .select('id')
    .eq('user_id', dbUserId)
    .eq('status', 'pending')
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (pendingError) {
    return NextResponse.json({ success: false, message: 'Бесплатная генерация ещё не включена на сервере.' }, { status: 503 });
  }
  if (!pending?.id) {
    return NextResponse.json({ success: false, message: 'Бесплатная карта уже получена или не назначена.' }, { status: 409 });
  }

  const { data: grant, error: grantError } = await supabaseAdmin
    .from('_pidr_promo_nft_grants')
    .update({ status: 'claiming' })
    .eq('id', pending.id)
    .eq('status', 'pending')
    .select('id')
    .maybeSingle();

  if (grantError) {
    return NextResponse.json({ success: false, message: 'Бесплатная генерация ещё не включена на сервере.' }, { status: 503 });
  }
  if (!grant?.id) {
    return NextResponse.json({ success: false, message: 'Бесплатная карта уже получена или не назначена.' }, { status: 409 });
  }

  try {
    const card = await mintPromoFreeNft(dbUserId);
    const { data: claimed, error: claimError } = await supabaseAdmin
      .from('_pidr_promo_nft_grants')
      .update({
        status: 'claimed',
        nft_card_id: card.id,
        claimed_at: new Date().toISOString(),
      })
      .eq('id', grant.id)
      .eq('status', 'claiming')
      .select('id')
      .maybeSingle();

    if (claimError || !claimed) {
      await supabaseAdmin.from('_pidr_nft_cards').delete().eq('id', card.id);
      await supabaseAdmin.from('_pidr_promo_nft_grants').update({ status: 'pending' }).eq('id', grant.id).eq('status', 'claiming');
      return NextResponse.json({ success: false, message: 'Не удалось закрепить карту за промокодом.' }, { status: 409 });
    }

    return NextResponse.json({ success: true, card });
  } catch (error) {
    await supabaseAdmin.from('_pidr_promo_nft_grants').update({ status: 'pending' }).eq('id', grant.id).eq('status', 'claiming');
    console.error('❌ [POST /api/promocode/claim-nft]', error);
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : 'Не удалось сгенерировать карту' },
      { status: 500 }
    );
  }
}
