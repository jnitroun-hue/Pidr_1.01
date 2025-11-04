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

// ✅ СИНХРОННАЯ ВЕРСИЯ (БЕЗ AWAIT)
function getSupabaseClientSync() {
  if (!supabaseClient) {
    const supabaseUrl = getSupabaseUrl();
    const supabaseAnonKey = getSupabaseAnonKey();

    if (!supabaseUrl || !supabaseAnonKey) {
      const isClient = typeof window !== 'undefined';
      const errorMsg = `❌ КРИТИЧНО! Supabase не настроен!\n\n` +
        `На ${isClient ? 'КЛИЕНТЕ' : 'СЕРВЕРЕ'} отсутствуют переменные окружения:\n` +
        `- NEXT_PUBLIC_SUPABASE_URL: ${supabaseUrl ? '✅' : '❌ ОТСУТСТВУЕТ'}\n` +
        `- NEXT_PUBLIC_SUPABASE_ANON_KEY: ${supabaseAnonKey ? '✅' : '❌ ОТСУТСТВУЕТ'}\n\n` +
        `РЕШЕНИЕ: Проверь что переменные добавлены на Vercel и redeploy!`;
      
      console.error(errorMsg);
      
      // Возвращаем mock клиент
      return {
        from: () => ({
          select: () => ({ data: null, error: { message: 'Supabase not configured' } }),
          insert: () => ({ data: null, error: { message: 'Supabase not configured' } }),
          update: () => ({ data: null, error: { message: 'Supabase not configured' } }),
          delete: () => ({ data: null, error: { message: 'Supabase not configured' } }),
          upsert: () => ({ data: null, error: { message: 'Supabase not configured' } }),
          eq: function() { return this; },
          limit: function() { return this; },
          single: function() { return this; },
          or: function() { return this; }
        }),
        channel: () => ({
          on: function() { return this; },
          subscribe: () => {},
          send: () => {}
        })
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