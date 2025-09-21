import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || '';

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

export const supabase = getSupabaseClient(); 