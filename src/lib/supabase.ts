import { createClient } from '@supabase/supabase-js';

// Публичные переменные (для клиентской стороны)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '';

// Серверные переменные (только для API routes)
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

// Проверяем переменные только в рантайме, не при сборке
let supabaseClient: any = null;

function getSupabaseClient() {
  if (!supabaseClient) {
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
      console.error('❌ Missing Supabase environment variables');
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

// Публичный клиент (для обычных операций с RLS)
export const supabase = getSupabaseClient();

// Админский клиент (для серверных операций, минует RLS)
let supabaseAdminClient: any = null;

export function getSupabaseAdmin() {
  if (!supabaseAdminClient && typeof window === 'undefined') {
    // Только на сервере
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