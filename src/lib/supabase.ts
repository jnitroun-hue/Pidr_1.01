import { createClient } from '@supabase/supabase-js';

// ✅ ЛЕНИВАЯ ИНИЦИАЛИЗАЦИЯ - ПЕРЕМЕННЫЕ ЧИТАЮТСЯ ТОЛЬКО ПРИ ВЫЗОВЕ!
function getSupabaseUrl(): string {
  // На сервере
  if (typeof window === 'undefined') {
    return process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || '';
  }
  // На клиенте - читаем из window (Next.js автоматически инжектит NEXT_PUBLIC_*)
  return process.env.NEXT_PUBLIC_SUPABASE_URL || '';
}

function getSupabaseAnonKey(): string {
  // На сервере
  if (typeof window === 'undefined') {
    return process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '';
  }
  // На клиенте
  return process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
}

// Серверные переменные (только для API routes)
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

// Проверяем переменные только в рантайме, не при сборке
let supabaseClient: any = null;

function getSupabaseClient() {
  if (!supabaseClient) {
    const supabaseUrl = getSupabaseUrl();
    const supabaseAnonKey = getSupabaseAnonKey();

    if (typeof window === 'undefined') {
      // Серверная сторона - проверяем переменные
      console.log('🔍 Supabase config check:', {
        hasUrl: !!supabaseUrl,
        hasKey: !!supabaseAnonKey,
        urlStart: supabaseUrl?.substring(0, 20),
        keyStart: supabaseAnonKey?.substring(0, 20),
      });
    }

    if (!supabaseUrl || !supabaseAnonKey) {
      const isClient = typeof window !== 'undefined';
      const errorMsg = `❌ КРИТИЧНО! Supabase не настроен!\n\n` +
        `На ${isClient ? 'КЛИЕНТЕ' : 'СЕРВЕРЕ'} отсутствуют переменные окружения:\n` +
        `- NEXT_PUBLIC_SUPABASE_URL: ${supabaseUrl ? '✅' : '❌ ОТСУТСТВУЕТ'}\n` +
        `- NEXT_PUBLIC_SUPABASE_ANON_KEY: ${supabaseAnonKey ? '✅' : '❌ ОТСУТСТВУЕТ'}\n\n` +
        `РЕШЕНИЕ:\n` +
        `1. Открой Vercel Dashboard → Settings → Environment Variables\n` +
        `2. Добавь переменные NEXT_PUBLIC_SUPABASE_URL и NEXT_PUBLIC_SUPABASE_ANON_KEY\n` +
        `3. Redeploy проект`;
      
      console.error(errorMsg);
      
      // На клиенте показываем алерт
      if (isClient) {
        setTimeout(() => {
          alert('⚠️ ОШИБКА КОНФИГУРАЦИИ!\n\nSupabase не настроен на Vercel.\nСвяжись с разработчиком!');
        }, 1000);
      }
      
      // Возвращаем mock клиент для сборки
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

    if (supabaseUrl && !supabaseUrl.startsWith('https://') && !supabaseUrl.startsWith('postgresql://')) {
      console.error('❌ Invalid SUPABASE_URL format');
      throw new Error('SUPABASE_URL must start with https:// or postgresql://');
    }

    supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: false, // Отключаем автосессии для API роутов
      },
    });
  }

  return supabaseClient;
}

// ✅ ПУБЛИЧНЫЙ КЛИЕНТ ТЕПЕРЬ СОЗДАЁТСЯ ЧЕРЕЗ PROXY
export const supabase = new Proxy({} as any, {
  get(target, prop) {
    const client = getSupabaseClient();
    const value = (client as any)[prop];
    return typeof value === 'function' ? value.bind(client) : value;
  }
});

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