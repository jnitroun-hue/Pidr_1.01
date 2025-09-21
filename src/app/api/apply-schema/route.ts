import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '../../../lib/supabase';

export async function POST(req: NextRequest) {
  try {
    console.log('🔧 Применяем обновленную схему БД...');

    // Добавляем недостающие поля в таблицу _pidr_users
    const schemaUpdates = [
      // Добавляем поле status если его нет
      `ALTER TABLE _pidr_users ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'offline'`,
      
      // Добавляем поле last_seen если его нет
      `ALTER TABLE _pidr_users ADD COLUMN IF NOT EXISTS last_seen TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP`,
      
      // Обновляем существующие записи
      `UPDATE _pidr_users SET status = 'offline' WHERE status IS NULL`,
      `UPDATE _pidr_users SET last_seen = created_at WHERE last_seen IS NULL`
    ];

    console.log('📝 Выполняем SQL команды...');
    
    for (const sql of schemaUpdates) {
      console.log(`🔍 Выполняем: ${sql}`);
      const { error } = await supabase.rpc('exec_sql', { sql_query: sql });
      
      if (error) {
        console.error(`❌ Ошибка выполнения SQL: ${sql}`, error);
        // Не останавливаемся, продолжаем с следующей командой
      } else {
        console.log(`✅ Успешно выполнено: ${sql}`);
      }
    }

    // Проверяем структуру таблицы
    const { data: columns, error: columnsError } = await supabase
      .from('information_schema.columns')
      .select('column_name, data_type, is_nullable, column_default')
      .eq('table_name', '_pidr_users')
      .order('ordinal_position');

    if (columnsError) {
      console.error('❌ Ошибка получения структуры таблицы:', columnsError);
    } else {
      console.log('📊 Текущая структура таблицы _pidr_users:', columns);
    }

    return NextResponse.json({
      success: true,
      message: 'Схема БД обновлена',
      columns: columns || []
    });

  } catch (error: any) {
    console.error('❌ Ошибка применения схемы:', error);
    return NextResponse.json({
      success: false,
      message: `Ошибка: ${error.message}`,
      error: error.message
    }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    console.log('🔍 Проверяем структуру таблицы _pidr_users...');

    // Проверяем, существует ли таблица
    const { data: tableExists } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_name', '_pidr_users')
      .single();

    if (!tableExists) {
      return NextResponse.json({
        success: false,
        message: 'Таблица _pidr_users не существует',
        tableExists: false
      });
    }

    // Получаем структуру таблицы
    const { data: columns, error } = await supabase
      .from('information_schema.columns')
      .select('column_name, data_type, is_nullable, column_default')
      .eq('table_name', '_pidr_users')
      .order('ordinal_position');

    if (error) {
      console.error('❌ Ошибка получения структуры таблицы:', error);
      return NextResponse.json({
        success: false,
        message: 'Ошибка получения структуры таблицы',
        error: error.message
      }, { status: 500 });
    }

    console.log('📊 Структура таблицы _pidr_users:', columns);

    // Проверяем наличие нужных полей
    const requiredFields = ['status', 'last_seen', 'avatar_url'];
    const missingFields = requiredFields.filter(field => 
      !columns?.some(col => col.column_name === field)
    );

    return NextResponse.json({
      success: true,
      tableExists: true,
      columns: columns || [],
      missingFields,
      needsUpdate: missingFields.length > 0
    });

  } catch (error: any) {
    console.error('❌ Ошибка проверки схемы:', error);
    return NextResponse.json({
      success: false,
      message: `Ошибка: ${error.message}`
    }, { status: 500 });
  }
}
