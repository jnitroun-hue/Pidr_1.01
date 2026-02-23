import { NextRequest, NextResponse } from 'next/server';
import { supabase, supabaseAdmin } from '@/lib/supabase';
import { requireAuth, getUserIdFromDatabase } from '@/lib/auth-utils';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// GET /api/nft/generate-image - Получить все NFT карты пользователя
export async function GET(req: NextRequest) {
  try {
    const auth = requireAuth(req);
    if (auth.error || !auth.userId) {
      return NextResponse.json({ success: false, error: 'Требуется авторизация' }, { status: 401 });
    }

    const { dbUserId: userIdBigInt } = await getUserIdFromDatabase(auth.userId, auth.environment);
    if (!userIdBigInt) {
      return NextResponse.json({ success: false, error: 'Пользователь не найден' }, { status: 404 });
    }

    const { data, error } = await supabase
      .from('_pidr_nft_cards')
      .select('*')
      .eq('user_id', userIdBigInt)
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, cards: data });

  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// POST /api/nft/generate-image - Создать NFT карту с готовым изображением
export async function POST(req: NextRequest) {
  try {
    console.log('🎴 [NFT Image] Запрос на генерацию карты с готовым изображением');

    const auth = requireAuth(req);
    if (auth.error || !auth.userId) {
      return NextResponse.json({ success: false, error: 'Требуется авторизация' }, { status: 401 });
    }

    const { dbUserId: userIdBigInt, user: dbUser } = await getUserIdFromDatabase(auth.userId, auth.environment);
    if (!userIdBigInt || !dbUser) {
      return NextResponse.json({ success: false, error: 'Пользователь не найден' }, { status: 404 });
    }

    const userId = dbUser.telegram_id ? String(dbUser.telegram_id) : String(userIdBigInt);

    const body = await req.json();
    const { action, suit, rank, rankCost, suitCost, totalCost, imageData } = body;

    // Проверяем баланс пользователя
    if (dbUser.coins < totalCost) {
      return NextResponse.json({ success: false, error: 'Недостаточно монет' }, { status: 400 });
    }

    // Списываем монеты
    const { error: deductError } = await supabaseAdmin
      .from('_pidr_users')
      .update({ coins: dbUser.coins - totalCost })
      .eq('id', userIdBigInt);

    if (deductError) {
      return NextResponse.json({ success: false, error: 'Ошибка списания монет' }, { status: 500 });
    }

    console.log('✅ [NFT Image] Монеты списаны, загружаем изображение в Storage...');

    const base64Data = imageData.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');

    const timestamp = Date.now();
    const fileName = `${userId}/${suit}_${rank}_${timestamp}.png`;
    const bucketName = 'nft-card';

    const { data: uploadData, error: uploadError } = await supabase
      .storage
      .from(bucketName)
      .upload(fileName, buffer, {
        contentType: 'image/png',
        cacheControl: '3600',
        upsert: false
      });

    if (uploadError) {
      // Возвращаем монеты
      await supabaseAdmin
        .from('_pidr_users')
        .update({ coins: dbUser.coins })
        .eq('id', userIdBigInt);

      return NextResponse.json(
        { success: false, error: `Ошибка загрузки: ${uploadError.message}` },
        { status: 500 }
      );
    }

    const { data: publicUrlData } = supabase
      .storage
      .from(bucketName)
      .getPublicUrl(fileName);

    const imageUrl = publicUrlData.publicUrl;

    const { data: savedCard, error: saveError } = await supabase
      .from('_pidr_nft_cards')
      .insert([{
        user_id: userIdBigInt,
        suit,
        rank,
        image_url: imageUrl,
        storage_path: fileName,
        cost: totalCost,
        payment_method: 'coins',
        created_at: new Date().toISOString()
      }])
      .select()
      .single();

    if (saveError) {
      // Возвращаем монеты и удаляем файл
      await supabaseAdmin
        .from('_pidr_users')
        .update({ coins: dbUser.coins })
        .eq('id', userIdBigInt);

      await supabase.storage.from(bucketName).remove([fileName]);

      return NextResponse.json(
        { success: false, error: `Ошибка сохранения: ${saveError.message}` },
        { status: 500 }
      );
    }

    const newBalance = dbUser.coins - totalCost;

    return NextResponse.json({
      success: true,
      card: savedCard,
      newBalance,
      imageUrl
    });

  } catch (error: any) {
    console.error('❌ [NFT Image] КРИТИЧЕСКАЯ ОШИБКА:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
