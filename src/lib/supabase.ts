import { createClient } from '@supabase/supabase-js';

// ✅ ПРОСТОЕ ЧТЕНИЕ ПЕРЕМЕННЫХ (БЕЗ ASYNC)
function getSupabaseUrl(): string {
  // Поддержка обоих форматов: NEXT_PUBLIC_* и без префикса
  if (typeof window === 'undefined') {
    // На сервере
    return process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || '';
  }
  // На клиенте - только NEXT_PUBLIC_* (Next.js ограничение)
  return process.env.NEXT_PUBLIC_SUPABASE_URL || '';
}

function getSupabaseAnonKey(): string {
  // Поддержка обоих форматов: NEXT_PUBLIC_* и без префикса
  if (typeof window === 'undefined') {
    // На сервере
    return process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '';
  }
  // На клиенте - только NEXT_PUBLIC_* (Next.js ограничение)
  return process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
}

// Серверные переменные (только для API routes)
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

// Проверяем переменные только в рантайме, не при сборке
let supabaseClient: any = null;

// ✅ ПУБЛИЧНЫЙ КЛИЕНТ ЧЕРЕЗ ПРОСТОЙ PROXY (СИНХРОННЫЙ)
export const supabase = new Proxy({} as any, {
  get(target, prop) {
    const client = getSupabaseClientSync(); // ✅ СИНХРОННЫЙ ВЫЗОВ!
    const value = (client as any)[prop];
    return typeof value === 'function' ? value.bind(client) : value;
  }
});

// ✅ КЭШИРОВАНИЕ КОНФИГУРАЦИИ С СЕРВЕРА (для клиента)
let cachedConfig: { url: string; key: string } | null = null;
let configLoadingPromise: Promise<{ url: string; key: string }> | null = null;

// ✅ ЗАГРУЗКА КОНФИГУРАЦИИ С СЕРВЕРА (fallback для клиента)
async function loadConfigFromServer(): Promise<{ url: string; key: string }> {
  if (cachedConfig) return cachedConfig;
  
  if (configLoadingPromise) return configLoadingPromise;
  
  configLoadingPromise = fetch('/api/config')
    .then(res => res.json())
    .then(data => {
      if (data.supabaseUrl && data.supabaseAnonKey) {
        cachedConfig = { url: data.supabaseUrl, key: data.supabaseAnonKey };
        return cachedConfig!;
      }
      throw new Error('Config not available from server');
    })
    .catch(error => {
      console.error('❌ [Supabase] Не удалось загрузить конфигурацию с сервера:', error);
      configLoadingPromise = null;
      throw error;
    });
  
  return configLoadingPromise;
}

// ✅ СИНХРОННАЯ ВЕРСИЯ (БЕЗ AWAIT)
function getSupabaseClientSync() {
  if (!supabaseClient) {
    const supabaseUrl = getSupabaseUrl();
    const supabaseAnonKey = getSupabaseAnonKey();

    if (!supabaseUrl || !supabaseAnonKey) {
      const isClient = typeof window !== 'undefined';
      
      // ✅ НА КЛИЕНТЕ: Пробуем загрузить с сервера асинхронно
      if (isClient) {
        // Загружаем конфигурацию с сервера в фоне
        loadConfigFromServer()
          .then(config => {
            console.log('✅ [Supabase] Конфигурация загружена с сервера');
            // Создаем клиент с загруженной конфигурацией
            if (!supabaseClient && config.url && config.key) {
              supabaseClient = createClient(config.url, config.key, {
                auth: { persistSession: false },
              });
            }
          })
          .catch(() => {
            // Игнорируем ошибку, используем mock клиент
          });
      }
      
      const errorMsg = `❌ КРИТИЧНО! Supabase не настроен!\n\n` +
        `На ${isClient ? 'КЛИЕНТЕ' : 'СЕРВЕРЕ'} отсутствуют переменные окружения:\n` +
        `- NEXT_PUBLIC_SUPABASE_URL: ${supabaseUrl ? '✅' : '❌ ОТСУТСТВУЕТ'}\n` +
        `- NEXT_PUBLIC_SUPABASE_ANON_KEY: ${supabaseAnonKey ? '✅' : '❌ ОТСУТСТВУЕТ'}\n\n` +
        `РЕШЕНИЕ:\n` +
        `1. Добавь переменные в Vercel с префиксом NEXT_PUBLIC_:\n` +
        `   - NEXT_PUBLIC_SUPABASE_URL\n` +
        `   - NEXT_PUBLIC_SUPABASE_ANON_KEY\n` +
        `2. Убедись что они добавлены для всех окружений (Production, Preview, Development)\n` +
        `3. Сделай redeploy проекта\n\n` +
        `⚠️ ВАЖНО: На клиенте Next.js может читать ТОЛЬКО переменные с префиксом NEXT_PUBLIC_!\n` +
        `${isClient ? '💡 Пробую загрузить конфигурацию с сервера...' : ''}`;
      
      // ✅ НЕ ПОКАЗЫВАЕМ ОШИБКУ В КОНСОЛИ ЕСЛИ ЭТО ПРОСТО ПРЕДУПРЕЖДЕНИЕ
      if (isClient) {
        console.warn(errorMsg);
      } else {
        console.error(errorMsg);
      }
      
      // Возвращаем mock клиент с правильным chaining
      const mockQueryBuilder = {
        eq: function() { return this; },
        neq: function() { return this; },
        gt: function() { return this; },
        gte: function() { return this; },
        lt: function() { return this; },
        lte: function() { return this; },
        like: function() { return this; },
        ilike: function() { return this; },
        is: function() { return this; },
        in: function() { return this; },
        contains: function() { return this; },
        containedBy: function() { return this; },
        rangeLt: function() { return this; },
        rangeGt: function() { return this; },
        rangeGte: function() { return this; },
        rangeLte: function() { return this; },
        rangeAdjacent: function() { return this; },
        overlaps: function() { return this; },
        textSearch: function() { return this; },
        match: function() { return this; },
        not: function() { return this; },
        or: function() { return this; },
        filter: function() { return this; },
        limit: function() { return this; },
        order: function() { return this; },
        range: function() { return this; },
        abortSignal: function() { return this; },
        single: function() { return Promise.resolve({ data: null, error: { message: 'Supabase not configured' } }); },
        maybeSingle: function() { return Promise.resolve({ data: null, error: { message: 'Supabase not configured' } }); },
        csv: function() { return Promise.resolve({ data: null, error: { message: 'Supabase not configured' } }); },
        then: function(resolve: any) { 
          return Promise.resolve({ data: null, error: { message: 'Supabase not configured' } }).then(resolve); 
        },
        catch: function(reject: any) { 
          return Promise.resolve({ data: null, error: { message: 'Supabase not configured' } }).catch(reject); 
        }
      };

      return {
        from: () => ({
          select: () => Object.create(mockQueryBuilder),
          insert: () => Object.create(mockQueryBuilder),
          update: () => Object.create(mockQueryBuilder),
          delete: () => Object.create(mockQueryBuilder),
          upsert: () => Object.create(mockQueryBuilder)
        }),
        channel: () => ({
          on: function() { return this; },
          subscribe: () => ({ unsubscribe: () => {} }), // ✅ Возвращаем объект с unsubscribe!
          send: () => {},
          unsubscribe: () => {}
        }),
        removeChannel: () => Promise.resolve({ status: 'ok' }), // ✅ Добавлен removeChannel!
        rpc: () => Promise.resolve({ data: null, error: { message: 'Supabase not configured' } }),
        auth: {
          getUser: () => Promise.resolve({ data: { user: null }, error: { message: 'Supabase not configured' } }),
          signInWithPassword: () => Promise.resolve({ data: null, error: { message: 'Supabase not configured' } }),
          signOut: () => Promise.resolve({ error: { message: 'Supabase not configured' } })
        },
        storage: {
          from: () => ({
            upload: () => Promise.resolve({ data: null, error: { message: 'Supabase not configured' } }),
            download: () => Promise.resolve({ data: null, error: { message: 'Supabase not configured' } }),
            list: () => Promise.resolve({ data: null, error: { message: 'Supabase not configured' } }),
            remove: () => Promise.resolve({ data: null, error: { message: 'Supabase not configured' } }),
            getPublicUrl: () => ({ data: { publicUrl: '' } })
          })
        }
      };
    }

    supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: false,
      },
    });
  }

  return supabaseClient;
}

// Админский клиент (для серверных операций, минует RLS)
let supabaseAdminClient: any = null;

export function getSupabaseAdmin() {
  if (!supabaseAdminClient && typeof window === 'undefined') {
    // Только на сервере
    const supabaseUrl = getSupabaseUrl(); // ✅ ИСПОЛЬЗУЕМ ФУНКЦИЮ!
    
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('❌ Missing Supabase admin credentials');
      return null;
    }

    console.log('🔧 Creating Supabase admin client');
    supabaseAdminClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });
  }

  return supabaseAdminClient;
}

// ✅ ЭКСПОРТ АДМИНСКОГО КЛИЕНТА (для обхода RLS)
export const supabaseAdmin = new Proxy({} as any, {
  get(target, prop) {
    const client = getSupabaseAdmin();
    if (!client) {
      // Возвращаем mock если админский клиент недоступен
      return () => Promise.resolve({ data: null, error: { message: 'Supabase admin not configured' } });
    }
    const value = (client as any)[prop];
    return typeof value === 'function' ? value.bind(client) : value;
  }
}); 