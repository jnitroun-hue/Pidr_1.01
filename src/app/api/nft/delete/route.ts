/**
 * 🗑️ API: Удаление NFT карты
 * DELETE /api/nft/delete  ·  POST /api/nft/delete
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { requireAuth, getUserIdFromDatabase } from '@/lib/auth-utils';
import { NFT_CARDS_TABLE, NFT_MARKETPLACE_TABLE, NFT_STORAGE_BUCKET } from '@/lib/nft/constants';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function parseCardId(raw: unknown): string | number | null {
  if (raw === undefined || raw === null || raw === '') return null;
  if (typeof raw === 'number' && Number.isFinite(raw) && raw > 0) return raw;
  const s = String(raw).trim();
  if (!s) return null;
  const n = parseInt(s, 10);
  if (Number.isFinite(n) && n > 0 && String(n) === s) return n;
  return s;
}

async function handleDelete(request: NextRequest) {
  const auth = requireAuth(request);
  if (auth.error || !auth.userId) {
    return NextResponse.json({ success: false, error: 'Требуется авторизация' }, { status: 401 });
  }

  const { dbUserId: userId } = await getUserIdFromDatabase(auth.userId, auth.environment);
  if (!userId) {
    return NextResponse.json({ success: false, error: 'Пользователь не найден в БД' }, { status: 404 });
  }

  const body = await request.json().catch(() => ({}));
  const cardId = parseCardId(body.nft_card_id ?? body.nftId ?? body.id);

  if (!cardId) {
    return NextResponse.json({ success: false, error: 'nft_card_id обязателен' }, { status: 400 });
  }

  const { data: nft, error: fetchError } = await supabaseAdmin
    .from(NFT_CARDS_TABLE)
    .select('id, user_id, storage_path')
    .eq('id', cardId)
    .maybeSingle();

  if (fetchError) {
    console.error('❌ [delete-nft] fetch:', fetchError);
    return NextResponse.json({ success: false, error: fetchError.message }, { status: 500 });
  }

  if (!nft) {
    return NextResponse.json({ success: false, error: 'NFT карта не найдена' }, { status: 404 });
  }

  if (Number(nft.user_id) !== Number(userId)) {
    return NextResponse.json({ success: false, error: 'Вы не владелец этой карты' }, { status: 403 });
  }

  const { data: activeListing } = await supabaseAdmin
    .from(NFT_MARKETPLACE_TABLE)
    .select('id')
    .eq('nft_card_id', cardId)
    .eq('status', 'active')
    .maybeSingle();

  if (activeListing) {
    return NextResponse.json(
      {
        success: false,
        error: 'Нельзя удалить карту на продаже. Сначала снимите лот с маркетплейса.',
      },
      { status: 400 }
    );
  }

  if (nft.storage_path) {
    const storagePath = nft.storage_path.startsWith(`${NFT_STORAGE_BUCKET}/`)
      ? nft.storage_path.slice(NFT_STORAGE_BUCKET.length + 1)
      : nft.storage_path;

    const { error: storageError } = await supabaseAdmin.storage
      .from(NFT_STORAGE_BUCKET)
      .remove([storagePath]);

    if (storageError) {
      console.warn('⚠️ [delete-nft] storage remove:', storageError.message);
    }
  }

  await supabaseAdmin.from('_pidr_user_nft_deck').delete().eq('nft_card_id', cardId);

  const { error: deleteError } = await supabaseAdmin.from(NFT_CARDS_TABLE).delete().eq('id', cardId);

  if (deleteError) {
    return NextResponse.json(
      { success: false, error: `Ошибка удаления: ${deleteError.message}` },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true, message: 'NFT карта успешно удалена' });
}

export async function DELETE(request: NextRequest) {
  try {
    return await handleDelete(request);
  } catch (error: unknown) {
    console.error('❌ [delete-nft]:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Внутренняя ошибка сервера' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    return await handleDelete(request);
  } catch (error: unknown) {
    console.error('❌ [delete-nft]:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Внутренняя ошибка сервера' },
      { status: 500 }
    );
  }
}
