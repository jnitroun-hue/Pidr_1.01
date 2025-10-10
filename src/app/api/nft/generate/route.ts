import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '../../../../lib/auth-utils';
import { cardQueue } from '../../../../lib/nft/card-queue';

/**
 * POST /api/nft/generate
 * Запустить генерацию NFT карты (добавить в очередь)
 * Для сложных/анимированных карт
 */
export async function POST(request: NextRequest) {
  try {
    const authResult = await requireAuth(request);
    if (!authResult.authenticated || !authResult.userId) {
      return NextResponse.json(
        { error: 'Не авторизован' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const {
      rank,
      suit,
      rarity,
      mintType = 'random',
      customStyle,
      customImage
    } = body;

    // Валидация
    if (!rank || !suit || !rarity) {
      return NextResponse.json(
        { error: 'Недостаточно параметров' },
        { status: 400 }
      );
    }

    // Добавляем задачу в очередь
    const jobId = await cardQueue.addJob({
      userId: authResult.userId.toString(),
      rank,
      suit,
      rarity,
      mintType,
      customStyle,
      customImage
    });

    return NextResponse.json({
      success: true,
      jobId,
      message: 'Генерация начата'
    });

  } catch (error) {
    console.error('❌ Ошибка запуска генерации:', error);
    return NextResponse.json(
      { error: 'Ошибка запуска генерации' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/nft/generate?jobId=xxx
 * Получить статус генерации
 */
export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAuth(request);
    if (!authResult.authenticated || !authResult.userId) {
      return NextResponse.json(
        { error: 'Не авторизован' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const jobId = searchParams.get('jobId');

    if (!jobId) {
      return NextResponse.json(
        { error: 'Не указан jobId' },
        { status: 400 }
      );
    }

    const job = await cardQueue.getJobStatus(jobId);

    if (!job) {
      return NextResponse.json(
        { error: 'Задача не найдена' },
        { status: 404 }
      );
    }

    // Проверяем, что это задача текущего пользователя
    if (job.userId !== authResult.userId.toString()) {
      return NextResponse.json(
        { error: 'Доступ запрещен' },
        { status: 403 }
      );
    }

    return NextResponse.json({
      success: true,
      job
    });

  } catch (error) {
    console.error('❌ Ошибка получения статуса:', error);
    return NextResponse.json(
      { error: 'Ошибка получения статуса' },
      { status: 500 }
    );
  }
}

