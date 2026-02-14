import { NextRequest, NextResponse } from 'next/server';
import { getRedis, isRedisAvailable } from '@/lib/redis/init';

export async function GET(req: NextRequest) {
  try {
    console.log('🔍 Тестирование Redis подключения...');

    // Проверяем переменные окружения
    const redisUrl = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL || process.env.REDIS_URL;
    const redisToken = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN || process.env.REDIS_TOKEN;

    console.log('📊 Redis переменные:', {
      hasUrl: !!redisUrl,
      hasToken: !!redisToken,
      urlStart: redisUrl?.substring(0, 30),
      tokenStart: redisToken?.substring(0, 10),
      usingKV: !!process.env.KV_REST_API_URL,
      isAvailable: isRedisAvailable()
    });

    // Получаем Redis клиент через универсальную инициализацию
    const redis = getRedis();

    if (!redis) {
      return NextResponse.json({
        success: false,
        message: 'Redis не инициализирован',
        details: {
          KV_REST_API_URL: !!process.env.KV_REST_API_URL,
          KV_REST_API_TOKEN: !!process.env.KV_REST_API_TOKEN,
          UPSTASH_REDIS_REST_URL: !!process.env.UPSTASH_REDIS_REST_URL,
          UPSTASH_REDIS_REST_TOKEN: !!process.env.UPSTASH_REDIS_REST_TOKEN,
          REDIS_URL: !!process.env.REDIS_URL,
          REDIS_TOKEN: !!process.env.REDIS_TOKEN,
          hint: 'Добавьте KV_REST_API_URL и KV_REST_API_TOKEN в Vercel Environment Variables'
        }
      }, { status: 400 });
    }

    console.log('🔗 Redis клиент создан, тестируем подключение...');

    // Тестируем подключение
    const testKey = `test:${Date.now()}`;
    const testValue = 'Hello Redis!';

    // Записываем тестовые данные
    await redis.set(testKey, testValue, { ex: 10 }); // Удалится через 10 секунд
    console.log('✅ Данные записаны в Redis');

    // Читаем тестовые данные
    const result = await redis.get(testKey);
    console.log('✅ Данные прочитаны из Redis:', result);

    // Получаем информацию о Redis
    const info = await redis.ping();
    console.log('✅ Redis ping:', info);

    // Удаляем тестовые данные
    await redis.del(testKey);
    console.log('✅ Тестовые данные удалены');

    return NextResponse.json({
      success: true,
      message: 'Redis работает корректно!',
      details: {
        ping: info,
        testWrite: testValue,
        testRead: result,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error: any) {
    console.error('❌ Ошибка Redis:', error);
    
    return NextResponse.json({
      success: false,
      message: 'Ошибка подключения к Redis',
      error: error.message,
      details: {
        name: error.name,
        cause: error.cause?.message || 'Unknown'
      }
    }, { status: 500 });
  }
}
