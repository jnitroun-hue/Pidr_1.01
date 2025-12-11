// API для автоматической настройки базы данных P.I.D.R.
import { NextRequest, NextResponse } from 'next/server';
import { createPidrTables, checkDatabaseStatus } from '../../../lib/database/create-tables';
import { createTablesDirectly, generateCreateTablesSQL } from '../../../lib/database/create-tables-direct';

export async function GET(req: NextRequest) {
  try {
    console.log('🔍 Проверка статуса базы данных P.I.D.R...');
    
    const status = await checkDatabaseStatus();
    const totalTables = Object.keys(status).length;
    const existingTables = Object.values(status).filter(Boolean).length;
    const isReady = existingTables === totalTables;
    
    return NextResponse.json({
      success: true,
      ready: isReady,
      status,
      summary: {
        total: totalTables,
        existing: existingTables,
        missing: totalTables - existingTables
      },
      message: isReady 
        ? '✅ База данных готова к работе!'
        : `⚠️ Готово ${existingTables}/${totalTables} таблиц`,
      setupUrl: '/api/setup-database',
      instructions: !isReady ? 'Отправьте POST запрос на /api/setup-database для создания таблиц' : null
    });
  } catch (error: any) {
    console.error('❌ Ошибка проверки БД:', error);
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    console.log('🚀 Автоматическое создание всех таблиц P.I.D.R...');
    
    // Проверяем текущий статус
    const currentStatus = await checkDatabaseStatus();
    const existingCount = Object.values(currentStatus).filter(Boolean).length;
    
    console.log(`📊 Текущий статус: ${existingCount}/${Object.keys(currentStatus).length} таблиц существует`);
    
    // Пробуем создать таблицы напрямую (без RPC)
    console.log('🔄 Попытка прямого создания таблиц...');
    const directResult = await createTablesDirectly();
    
    // Если прямое создание не сработало, пробуем через RPC
    let result = directResult;
    if (!directResult.success) {
      console.log('🔄 Попытка создания через RPC...');
      result = await createPidrTables();
    }
    
    // Проверяем финальный статус
    const finalStatus = await checkDatabaseStatus();
    const finalCount = Object.values(finalStatus).filter(Boolean).length;
    
    return NextResponse.json({
      success: result.success,
      message: result.message,
      before: {
        existing: existingCount,
        status: currentStatus
      },
      after: {
        existing: finalCount,
        status: finalStatus
      },
      created: finalCount - existingCount,
      errors: result.errors,
      ready: finalCount === Object.keys(finalStatus).length,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('❌ Ошибка создания таблиц:', error);
    return NextResponse.json({ 
      success: false, 
      message: 'Критическая ошибка создания таблиц',
      error: error.message 
    }, { status: 500 });
  }
}
