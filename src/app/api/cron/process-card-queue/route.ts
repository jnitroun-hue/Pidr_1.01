import { NextRequest, NextResponse } from 'next/server';
import { cardQueue } from '../../../../lib/nft/card-queue';
import { createClient } from '@supabase/supabase-js';
import { NFT_CARDS_TABLE, NFT_STORAGE_BUCKET } from '@/lib/nft/constants';

// Проверяем переменные окружения
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.warn('⚠️ Supabase credentials not found for cron job');
}

const supabase = supabaseUrl && supabaseKey 
  ? createClient(supabaseUrl, supabaseKey)
  : null;

/**
 * GET /api/cron/process-card-queue
 * Cron job для обработки очереди генерации NFT карт
 * Запускается каждую минуту через Vercel Cron
 */
export async function GET(request: NextRequest) {
  try {
    // Проверяем наличие Supabase
    if (!supabase) {
      return NextResponse.json(
        { error: 'Supabase not configured' },
        { status: 500 }
      );
    }

    // Проверяем Authorization заголовок для cron
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    console.log('🔄 Начало обработки очереди NFT карт...');

    let processed = 0;
    const maxBatchSize = 5; // Обрабатываем до 5 задач за раз

    for (let i = 0; i < maxBatchSize; i++) {
      const job = await cardQueue.getNextJob();
      if (!job) {
        break; // Очередь пуста
      }

      console.log(`🎨 Обработка задачи: ${job.id}`);

      try {
        // Обновляем прогресс
        await cardQueue.updateJobProgress(job.id, 25);

        // Генерируем изображение карты
        const imageUrl = await generateCardImage(job);
        await cardQueue.updateJobProgress(job.id, 50);

        // Создаем метаданные
        const metadata = {
          name: `P.I.D.R Card - ${job.rank} of ${job.suit}`,
          description: `NFT карта из игры P.I.D.R. Редкость: ${job.rarity}`,
          image: imageUrl,
          attributes: [
            { trait_type: 'Rank', value: job.rank },
            { trait_type: 'Suit', value: job.suit },
            { trait_type: 'Rarity', value: job.rarity },
            { trait_type: 'Mint Type', value: job.mintType }
          ]
        };

        // Загружаем метаданные в Supabase Storage
        const metadataUrl = await uploadMetadata(job.id, metadata);
        await cardQueue.updateJobProgress(job.id, 75);

        // Сохраняем в базу данных
        const { data: nftData, error: nftError } = await supabase
          .from(NFT_CARDS_TABLE)
          .insert({
            rank: job.rank,
            suit: job.suit,
            rarity: job.rarity,
            image_url: imageUrl,
            metadata_url: metadataUrl
          })
          .select()
          .single();

        if (nftError) throw nftError;

        // Создаем запись владения
        const { error: ownershipError } = await supabase
          .from('_pidr_nft_ownership')
          .insert({
            user_id: parseInt(job.userId),
            card_id: nftData.id,
            mint_type: job.mintType,
            custom_style: job.customStyle,
            custom_image_url: job.customImage
          });

        if (ownershipError) throw ownershipError;

        // Завершаем задачу
        await cardQueue.completeJob(job.id, {
          imageUrl,
          metadataUrl,
          nftId: nftData.id
        });

        processed++;
        console.log(`✅ Задача ${job.id} завершена успешно`);

      } catch (error: unknown) {
        console.error(`❌ Ошибка обработки задачи ${job.id}:`, error);
        await cardQueue.failJob(job.id, error instanceof Error ? error.message : 'Unknown error');
      }
    }

    const queueLength = await cardQueue.getQueueLength();

    return NextResponse.json({
      success: true,
      processed,
      remainingInQueue: queueLength,
      timestamp: new Date().toISOString()
    });

  } catch (error: unknown) {
    console.error('❌ Ошибка cron job:', error);
    return NextResponse.json(
      { error: 'Ошибка обработки очереди' },
      { status: 500 }
    );
  }
}

/**
 * Генерация изображения карты
 */
async function generateCardImage(job: any): Promise<string> {
  // ✅ ПРОВЕРКА: supabase должен быть инициализирован
  if (!supabase) {
    throw new Error('Supabase not configured');
  }

  // TODO: Здесь можно использовать AI генерацию или Canvas на сервере
  // Пока возвращаем путь к базовой карте
  const fileName = `${job.suit}_${job.rank}_${job.rarity}_${Date.now()}.png`;
  
  // Если есть кастомное изображение, загружаем его
  if (job.customImage) {
    const { data, error } = await supabase.storage
      .from(NFT_STORAGE_BUCKET)
      .upload(`generated/${fileName}`, job.customImage, {
        contentType: 'image/png'
      });

    if (error) throw error;

    const { data: publicUrlData } = supabase.storage
      .from(NFT_STORAGE_BUCKET)
      .getPublicUrl(`generated/${fileName}`);

    return publicUrlData.publicUrl;
  }

  // Возвращаем URL базовой карты
  const { data: publicUrlData } = supabase.storage
    .from(NFT_STORAGE_BUCKET)
    .getPublicUrl(`base-cards/${job.suit}/${job.rank}.png`);

  return publicUrlData.publicUrl;
}

/**
 * Загрузка метаданных в Supabase Storage
 */
async function uploadMetadata(jobId: string, metadata: any): Promise<string> {
  // ✅ ПРОВЕРКА: supabase должен быть инициализирован
  if (!supabase) {
    throw new Error('Supabase not configured');
  }

  const fileName = `metadata_${jobId}.json`;
  const metadataBlob = new Blob([JSON.stringify(metadata, null, 2)], {
    type: 'application/json'
  });

  const { data, error } = await supabase.storage
    .from(NFT_STORAGE_BUCKET)
    .upload(`metadata/${fileName}`, metadataBlob, {
      contentType: 'application/json'
    });

  if (error) throw error;

  const { data: publicUrlData } = supabase.storage
    .from(NFT_STORAGE_BUCKET)
    .getPublicUrl(`metadata/${fileName}`);

  return publicUrlData.publicUrl;
}

