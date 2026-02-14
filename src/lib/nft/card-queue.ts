/**
 * Redis Bull Queue для фоновой генерации NFT карт
 * Используется для сложных/анимированных карт
 */

import { getRedis } from '../redis/init';

// Получаем Redis клиент через универсальную инициализацию
const redis = getRedis();

if (!redis) {
  console.warn('⚠️ [CardQueue] Redis не настроен, очередь карт будет недоступна');
}

export interface CardGenerationJob {
  id: string;
  userId: string;
  rank: string;
  suit: string;
  rarity: string;
  mintType: 'random' | 'custom';
  customStyle?: string;
  customImage?: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  result?: {
    imageUrl: string;
    metadataUrl: string;
    nftId: string;
  };
  error?: string;
  createdAt: number;
  updatedAt: number;
}

const QUEUE_KEY = 'nft:generation:queue';
const JOB_KEY_PREFIX = 'nft:generation:job:';
const PROCESSING_KEY = 'nft:generation:processing';

export class CardQueue {
  /**
   * Добавить задачу в очередь
   */
  async addJob(job: Omit<CardGenerationJob, 'id' | 'status' | 'progress' | 'createdAt' | 'updatedAt'>): Promise<string> {
    if (!redis) {
      throw new Error('Redis not configured');
    }

    const jobId = `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const fullJob: CardGenerationJob = {
      ...job,
      id: jobId,
      status: 'pending',
      progress: 0,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    // Сохраняем задачу
    await redis.set(`${JOB_KEY_PREFIX}${jobId}`, JSON.stringify(fullJob), {
      ex: 3600 // TTL 1 час
    });

    // Добавляем в очередь
    await redis.zadd(QUEUE_KEY, {
      score: Date.now(),
      member: jobId
    });

    console.log('📝 Задача добавлена в очередь:', jobId);
    return jobId;
  }

  /**
   * Получить следующую задачу из очереди
   */
  async getNextJob(): Promise<CardGenerationJob | null> {
    if (!redis) {
      return null;
    }

    // Получаем первую задачу из очереди
    const jobs = await redis.zrange(QUEUE_KEY, 0, 0);
    if (!jobs || jobs.length === 0) {
      return null;
    }

    const jobId = jobs[0] as string;

    // Проверяем, не обрабатывается ли уже
    const isProcessing = await redis.sismember(PROCESSING_KEY, jobId);
    if (isProcessing) {
      return null;
    }

    // Помечаем как обрабатываемую
    await redis.sadd(PROCESSING_KEY, jobId);

    // Получаем данные задачи
    const jobData = await redis.get(`${JOB_KEY_PREFIX}${jobId}`);
    if (!jobData) {
      await this.removeJob(jobId);
      return null;
    }

    const job = JSON.parse(jobData as string) as CardGenerationJob;
    job.status = 'processing';
    job.updatedAt = Date.now();

    await redis.set(`${JOB_KEY_PREFIX}${jobId}`, JSON.stringify(job), {
      ex: 3600
    });

    return job;
  }

  /**
   * Обновить прогресс задачи
   */
  async updateJobProgress(jobId: string, progress: number): Promise<void> {
    if (!redis) return;

    const jobData = await redis.get(`${JOB_KEY_PREFIX}${jobId}`);
    if (!jobData) return;

    const job = JSON.parse(jobData as string) as CardGenerationJob;
    job.progress = progress;
    job.updatedAt = Date.now();

    await redis.set(`${JOB_KEY_PREFIX}${jobId}`, JSON.stringify(job), {
      ex: 3600
    });
  }

  /**
   * Завершить задачу
   */
  async completeJob(
    jobId: string,
    result: CardGenerationJob['result']
  ): Promise<void> {
    if (!redis) return;

    const jobData = await redis.get(`${JOB_KEY_PREFIX}${jobId}`);
    if (!jobData) return;

    const job = JSON.parse(jobData as string) as CardGenerationJob;
    job.status = 'completed';
    job.progress = 100;
    job.result = result;
    job.updatedAt = Date.now();

    await redis.set(`${JOB_KEY_PREFIX}${jobId}`, JSON.stringify(job), {
      ex: 3600
    });

    // Удаляем из очереди и обработки
    await this.removeJob(jobId);
    await redis.srem(PROCESSING_KEY, jobId);

    console.log('✅ Задача завершена:', jobId);
  }

  /**
   * Пометить задачу как неудавшуюся
   */
  async failJob(jobId: string, error: string): Promise<void> {
    if (!redis) return;

    const jobData = await redis.get(`${JOB_KEY_PREFIX}${jobId}`);
    if (!jobData) return;

    const job = JSON.parse(jobData as string) as CardGenerationJob;
    job.status = 'failed';
    job.error = error;
    job.updatedAt = Date.now();

    await redis.set(`${JOB_KEY_PREFIX}${jobId}`, JSON.stringify(job), {
      ex: 3600
    });

    // Удаляем из очереди и обработки
    await this.removeJob(jobId);
    await redis.srem(PROCESSING_KEY, jobId);

    console.error('❌ Задача провалена:', jobId, error);
  }

  /**
   * Получить статус задачи
   */
  async getJobStatus(jobId: string): Promise<CardGenerationJob | null> {
    if (!redis) return null;

    const jobData = await redis.get(`${JOB_KEY_PREFIX}${jobId}`);
    if (!jobData) return null;

    return JSON.parse(jobData as string) as CardGenerationJob;
  }

  /**
   * Удалить задачу из очереди
   */
  private async removeJob(jobId: string): Promise<void> {
    if (!redis) return;
    await redis.zrem(QUEUE_KEY, jobId);
  }

  /**
   * Получить длину очереди
   */
  async getQueueLength(): Promise<number> {
    if (!redis) return 0;
    return await redis.zcard(QUEUE_KEY);
  }
}

export const cardQueue = new CardQueue();

