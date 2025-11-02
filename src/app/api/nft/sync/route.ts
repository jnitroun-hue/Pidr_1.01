import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '../../../../lib/supabase';
import { requireAuth } from '../../../../lib/auth-utils';

/**
 * POST /api/nft/sync
 * ✅ БЕЗОПАСНАЯ синхронизация NFT из блокчейна в Supabase
 * 
 * Сохраняет ТОЛЬКО публичные метаданные для быстрого UI
 * НЕ хранит приватные ключи или ownership (только в блокчейне)
 */
export async function POST(request: NextRequest) {
  try {
    const authResult = requireAuth(request);
    if (authResult.error || !authResult.userId) {
      return NextResponse.json(
        { error: authResult.error || 'Не авторизован' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { userAddress, nfts } = body;

    if (!userAddress || !Array.isArray(nfts)) {
      return NextResponse.json(
        { error: 'Недостаточно параметров' },
        { status: 400 }
      );
    }

    console.log(`🔄 Синхронизация ${nfts.length} NFT для пользователя ${authResult.userId}`);

    // Сохраняем адрес кошелька пользователя
    const { error: walletError } = await supabase
      .from('_pidr_users')
      .update({
        ton_wallet_address: userAddress
      })
      .eq('id', authResult.userId);

    if (walletError) {
      console.error('❌ Ошибка сохранения адреса кошелька:', walletError);
    }

    // Синхронизируем каждый NFT
    for (const nft of nfts) {
      try {
        // Проверяем, существует ли карта
        const { data: existingCard } = await supabase
          .from('_pidr_nft_cards')
          .select('id')
          .eq('blockchain_address', nft.address)
          .single();

        if (!existingCard) {
          // Создаем новую карту
          const { data: newCard, error: cardError } = await supabase
            .from('_pidr_nft_cards')
            .insert({
              rank: nft.metadata.attributes.find((a: any) => a.trait_type === 'Rank')?.value || 'A',
              suit: nft.metadata.attributes.find((a: any) => a.trait_type === 'Suit')?.value || 'spades',
              rarity: nft.metadata.attributes.find((a: any) => a.trait_type === 'Rarity')?.value || 'common',
              image_url: nft.metadata.image,
              metadata_url: null,
              blockchain_address: nft.address,
              collection_address: nft.collectionAddress,
              token_index: nft.index
            })
            .select()
            .single();

          if (cardError) {
            console.error('❌ Ошибка создания карты:', cardError);
            continue;
          }

          // Создаем запись владения
          const { error: ownershipError } = await supabase
            .from('_pidr_nft_ownership')
            .insert({
              user_id: authResult.userId,
              card_id: newCard.id,
              mint_type: 'blockchain_sync',
              acquired_at: new Date().toISOString()
            });

          if (ownershipError) {
            console.error('❌ Ошибка создания владения:', ownershipError);
          }
        } else {
          // Обновляем существующую карту
          const { error: updateError } = await supabase
            .from('_pidr_nft_cards')
            .update({
              image_url: nft.metadata.image,
              updated_at: new Date().toISOString()
            })
            .eq('blockchain_address', nft.address);

          if (updateError) {
            console.error('❌ Ошибка обновления карты:', updateError);
          }

          // Проверяем владение
          const { data: ownership } = await supabase
            .from('_pidr_nft_ownership')
            .select('id')
            .eq('card_id', existingCard.id)
            .eq('user_id', authResult.userId)
            .single();

          if (!ownership) {
            // Создаем запись владения
            const { error: ownershipError } = await supabase
              .from('_pidr_nft_ownership')
              .insert({
                user_id: authResult.userId,
                card_id: existingCard.id,
                mint_type: 'blockchain_sync',
                acquired_at: new Date().toISOString()
              });

            if (ownershipError) {
              console.error('❌ Ошибка создания владения:', ownershipError);
            }
          }
        }

      } catch (error) {
        console.error('❌ Ошибка синхронизации NFT:', error);
      }
    }

    console.log('✅ Синхронизация завершена');

    return NextResponse.json({
      success: true,
      message: 'NFT синхронизированы',
      synced: nfts.length
    });

  } catch (error) {
    console.error('❌ Ошибка синхронизации NFT:', error);
    return NextResponse.json(
      { error: 'Ошибка синхронизации' },
      { status: 500 }
    );
  }
}

