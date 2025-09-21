import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '../../../lib/supabase';
import { createPidrTables, checkDatabaseStatus } from '../../../lib/database/create-tables';

export async function GET(req: NextRequest) {
  console.log('🔍 P.I.D.R. Database API - проверка таблиц');
  
  try {
    // Проверяем подключение к Supabase
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json({
        success: false,
        message: 'Supabase не настроен',
        tables: {},
        hasSupabase: false
      });
    }

    console.log('✅ Supabase настроен, проверяем таблицы...');

    // Список таблиц P.I.D.R.
    const pidrTables = [
      '_pidr_users',
      '_pidr_rooms', 
      '_pidr_room_players',
      '_pidr_games',
      '_pidr_game_results',
      '_pidr_coin_transactions',
      '_pidr_friends',
      '_pidr_achievements',
      '_pidr_user_achievements',
      '_pidr_user_settings',
      '_pidr_hd_wallets'
    ];

    const tableStatus: Record<string, any> = {};

    // Проверяем каждую таблицу
    for (const tableName of pidrTables) {
      try {
        // Проверяем существование таблицы и получаем количество записей
        const { data, error, count } = await supabase
          .from(tableName)
          .select('*', { count: 'exact', head: true });

        if (error) {
          console.log(`❌ Таблица ${tableName}: ${error.message}`);
          tableStatus[tableName] = {
            exists: false,
            error: error.message,
            count: 0
          };
        } else {
          console.log(`✅ Таблица ${tableName}: ${count} записей`);
          tableStatus[tableName] = {
            exists: true,
            count: count || 0,
            error: null
          };
        }
      } catch (err: any) {
        console.log(`❌ Ошибка проверки ${tableName}:`, err.message);
        tableStatus[tableName] = {
          exists: false,
          error: err.message,
          count: 0
        };
      }
    }

    // Подсчитываем статистику
    const totalTables = pidrTables.length;
    const existingTables = Object.values(tableStatus).filter((t: any) => t.exists).length;
    const missingTables = totalTables - existingTables;

    return NextResponse.json({
      success: true,
      message: `Проверено ${totalTables} таблиц P.I.D.R.`,
      hasSupabase: true,
      tables: tableStatus,
      summary: {
        total: totalTables,
        existing: existingTables,
        missing: missingTables,
        ready: missingTables === 0
      }
    });

  } catch (error: any) {
    console.error('❌ Ошибка P.I.D.R. Database API:', error);
    return NextResponse.json({
      success: false,
      message: error.message,
      hasSupabase: false,
      tables: {}
    }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  console.log('🏗️ P.I.D.R. Database API - создание таблиц');
  
  try {
    const body = await req.json();
    const { action, userId, amount, transactionType, description } = body;
    
    // Новые действия для кошелька
    if (action === 'get_user_balance') {
      return await getUserBalance(userId);
    }
    
    if (action === 'get_user_transactions') {
      return await getUserTransactions(userId);
    }
    
    if (action === 'create_transaction') {
      return await createTransaction(userId, amount, transactionType, description);
    }
    
    if (action === 'update_user_balance') {
      return await updateUserBalance(userId, amount);
    }

    // HD Wallet actions
    if (action === 'save_hd_address') {
      return await saveHDAddress(body);
    }

    if (action === 'get_user_hd_address') {
      return await getUserHDAddress(userId, body.coin);
    }

    if (action === 'get_all_user_hd_addresses') {
      return await getAllUserHDAddresses(userId);
    }

    // Автоматическое создание таблиц
    if (action === 'create_all_tables') {
      return await handleCreateTables();
    }

    // Проверка статуса БД
    if (action === 'check_database') {
      return await handleCheckDatabase();
    }
    
    if (action === 'create-tables') {
      // Читаем SQL схему
      const fs = require('fs');
      const path = require('path');
      const schemaPath = path.join(process.cwd(), 'src/lib/database/pidr-schema.sql');
      
      if (!fs.existsSync(schemaPath)) {
        return NextResponse.json({
          success: false,
          message: 'Файл схемы не найден'
        }, { status: 404 });
      }

      const schemaSql: string = fs.readFileSync(schemaPath, 'utf8');
      
      // Разбиваем на отдельные команды
      const commands: string[] = schemaSql
        .split(';')
        .map((cmd: string) => cmd.trim())
        .filter((cmd: string) => cmd.length > 0 && !cmd.startsWith('--'));

      console.log(`📝 Выполняем ${commands.length} SQL команд...`);

      const results = [];
      let successCount = 0;
      let errorCount = 0;

      // Выполняем команды по одной
      for (let i = 0; i < commands.length; i++) {
        const command = commands[i];
        
        try {
          const { error } = await supabase.rpc('exec_sql', { sql_query: command });
          
          if (error) {
            console.log(`❌ Команда ${i + 1}: ${error.message}`);
            results.push({
              command: i + 1,
              success: false,
              error: error.message,
              sql: command.substring(0, 100) + '...'
            });
            errorCount++;
          } else {
            console.log(`✅ Команда ${i + 1}: выполнена`);
            results.push({
              command: i + 1,
              success: true,
              error: null
            });
            successCount++;
          }
        } catch (err: any) {
          console.log(`❌ Команда ${i + 1}: ${err.message}`);
          results.push({
            command: i + 1,
            success: false,
            error: err.message,
            sql: command.substring(0, 100) + '...'
          });
          errorCount++;
        }
      }

      return NextResponse.json({
        success: errorCount === 0,
        message: `Выполнено ${successCount}/${commands.length} команд`,
        results,
        summary: {
          total: commands.length,
          success: successCount,
          errors: errorCount
        }
      });
    }

    if (action === 'test-insert') {
      // Тестовая вставка пользователя
      const testUser = {
        telegram_id: '12345678',
        username: 'test_user',
        first_name: 'Test',
        last_name: 'User',
        coins: 1000,
        rating: 0
      };

      const { data, error } = await supabase
        .from('_pidr_users')
        .insert(testUser)
        .select()
        .single();

      if (error) {
        return NextResponse.json({
          success: false,
          message: 'Ошибка тестовой вставки',
          error: error.message
        }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        message: 'Тестовый пользователь создан',
        data
      });
    }

    if (action === 'test-room') {
      // Тестовое создание комнаты
      const testRoom = {
        room_code: 'TEST' + Math.random().toString(36).substring(2, 8).toUpperCase(),
        name: 'Тестовая комната',
        max_players: 4,
        current_players: 1,
        status: 'waiting'
      };

      const { data, error } = await supabase
        .from('_pidr_rooms')
        .insert(testRoom)
        .select()
        .single();

      if (error) {
        return NextResponse.json({
          success: false,
          message: 'Ошибка создания тестовой комнаты',
          error: error.message
        }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        message: 'Тестовая комната создана',
        data
      });
    }

    return NextResponse.json({
      success: false,
      message: 'Неизвестное действие'
    }, { status: 400 });

  } catch (error: any) {
    console.error('❌ Ошибка P.I.D.R. Database POST:', error);
    return NextResponse.json({
      success: false,
      message: error.message
    }, { status: 500 });
  }
}

// Функции для работы с кошельком
async function getUserBalance(userId: string) {
  try {
    console.log('📊 Получение баланса пользователя:', userId);
    
    const { data: user, error } = await supabase
      .from('_pidr_users')
      .select('id, coins, rating, games_played, games_won, username, first_name')
      .eq('telegram_id', userId)
      .single();

    if (error) {
      console.error('❌ Ошибка получения баланса:', error);
      return NextResponse.json({ success: false, error: error.message });
    }

    if (!user) {
      return NextResponse.json({ success: false, error: 'Пользователь не найден' });
    }

    return NextResponse.json({ 
      success: true, 
      balance: user.coins || 0,
      user: user 
    });
  } catch (error: any) {
    console.error('❌ Ошибка getUserBalance:', error);
    return NextResponse.json({ success: false, error: error.message });
  }
}

async function getUserTransactions(userId: string) {
  try {
    console.log('📋 Получение транзакций пользователя:', userId);
    
    // Сначала получаем пользователя по telegram_id
    const { data: user, error: userError } = await supabase
      .from('_pidr_users')
      .select('id')
      .eq('telegram_id', userId)
      .single();

    if (userError || !user) {
      console.error('❌ Пользователь не найден:', userError);
      return NextResponse.json({ success: false, error: 'Пользователь не найден' });
    }

    const { data: transactions, error } = await supabase
      .from('_pidr_coin_transactions')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) {
      console.error('❌ Ошибка получения транзакций:', error);
      return NextResponse.json({ success: false, error: error.message });
    }

    return NextResponse.json({ 
      success: true, 
      transactions: transactions || [] 
    });
  } catch (error: any) {
    console.error('❌ Ошибка getUserTransactions:', error);
    return NextResponse.json({ success: false, error: error.message });
  }
}

async function createTransaction(userId: string, amount: number, transactionType: string, description: string) {
  try {
    console.log('💰 Создание транзакции:', { userId, amount, transactionType, description });
    
    // Получаем пользователя
    const { data: user, error: userError } = await supabase
      .from('_pidr_users')
      .select('id, coins')
      .eq('telegram_id', userId)
      .single();

    if (userError || !user) {
      console.error('❌ Пользователь не найден:', userError);
      return NextResponse.json({ success: false, error: 'Пользователь не найден' });
    }

    const oldBalance = user.coins || 0;
    const newBalance = Math.max(0, oldBalance + amount);

    // Создаем транзакцию
    const { data: transaction, error: transactionError } = await supabase
      .from('_pidr_coin_transactions')
      .insert([{
        user_id: user.id,
        amount: amount,
        transaction_type: transactionType,
        description: description,
        balance_before: oldBalance,
        balance_after: newBalance
      }])
      .select()
      .single();

    if (transactionError) {
      console.error('❌ Ошибка создания транзакции:', transactionError);
      return NextResponse.json({ success: false, error: transactionError.message });
    }

    // Обновляем баланс пользователя
    const { error: updateError } = await supabase
      .from('_pidr_users')
      .update({ coins: newBalance })
      .eq('id', user.id);

    if (updateError) {
      console.error('❌ Ошибка обновления баланса:', updateError);
      return NextResponse.json({ success: false, error: updateError.message });
    }

    console.log('✅ Транзакция создана успешно');

    return NextResponse.json({ 
      success: true, 
      transaction: transaction,
      newBalance: newBalance,
      oldBalance: oldBalance 
    });
  } catch (error: any) {
    console.error('❌ Ошибка createTransaction:', error);
    return NextResponse.json({ success: false, error: error.message });
  }
}

async function updateUserBalance(userId: string, newBalance: number) {
  try {
    console.log('🔄 Обновление баланса пользователя:', { userId, newBalance });
    
    const { data: user, error: userError } = await supabase
      .from('_pidr_users')
      .select('id')
      .eq('telegram_id', userId)
      .single();

    if (userError || !user) {
      console.error('❌ Пользователь не найден:', userError);
      return NextResponse.json({ success: false, error: 'Пользователь не найден' });
    }

    const { error } = await supabase
      .from('_pidr_users')
      .update({ coins: Math.max(0, newBalance) })
      .eq('id', user.id);

    if (error) {
      console.error('❌ Ошибка обновления баланса:', error);
      return NextResponse.json({ success: false, error: error.message });
    }

    console.log('✅ Баланс обновлен успешно');

    return NextResponse.json({ success: true, balance: Math.max(0, newBalance) });
  } catch (error: any) {
    console.error('❌ Ошибка updateUserBalance:', error);
    return NextResponse.json({ success: false, error: error.message });
  }
}

// HD Wallet functions
async function saveHDAddress(addressData: any) {
  try {
    console.log('💾 Сохранение HD адреса:', addressData);

    const { data, error } = await supabase
      .from('_pidr_hd_wallets')
      .insert([
        {
          user_id: addressData.userId,
          coin: addressData.coin,
          address: addressData.address,
          derivation_path: addressData.derivationPath,
          address_index: addressData.index,
          created_at: new Date().toISOString()
        }
      ]);

    if (error) {
      console.error('❌ Ошибка сохранения HD адреса:', error);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      message: 'HD адрес сохранен',
      data 
    });

  } catch (error: any) {
    console.error('❌ Ошибка saveHDAddress:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

async function getUserHDAddress(userId: string, coin: string) {
  try {
    console.log(`🔍 Поиск HD адреса для пользователя ${userId}, монета ${coin}`);

    const { data, error } = await supabase
      .from('_pidr_hd_wallets')
      .select('*')
      .eq('user_id', userId)
      .eq('coin', coin.toUpperCase())
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows found
      console.error('❌ Ошибка получения HD адреса:', error);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({ 
        success: true, 
        address: null,
        message: 'Адрес не найден' 
      });
    }

    const address = {
      userId: data.user_id,
      coin: data.coin,
      address: data.address,
      derivationPath: data.derivation_path,
      index: data.address_index,
      created_at: new Date(data.created_at)
    };

    return NextResponse.json({ 
      success: true, 
      address,
      message: 'HD адрес найден' 
    });

  } catch (error: any) {
    console.error('❌ Ошибка getUserHDAddress:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

async function getAllUserHDAddresses(userId: string) {
  try {
    console.log(`🔍 Получение всех HD адресов для пользователя ${userId}`);

    const { data, error } = await supabase
      .from('_pidr_hd_wallets')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ Ошибка получения всех HD адресов:', error);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    const addresses = data.map((row: any) => ({
      userId: row.user_id,
      coin: row.coin,
      address: row.address,
      derivationPath: row.derivation_path,
      index: row.address_index,
      created_at: new Date(row.created_at)
    }));

    return NextResponse.json({ 
      success: true, 
      addresses,
      count: addresses.length,
      message: `Найдено ${addresses.length} HD адресов` 
    });

  } catch (error: any) {
    console.error('❌ Ошибка getAllUserHDAddresses:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// Обработчик автоматического создания таблиц
async function handleCreateTables() {
  try {
    console.log('🚀 Запуск автоматического создания таблиц P.I.D.R...');
    
    const result = await createPidrTables();
    
    return NextResponse.json({
      success: result.success,
      message: result.message,
      errors: result.errors,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('❌ Ошибка handleCreateTables:', error);
    return NextResponse.json({ 
      success: false, 
      message: 'Ошибка создания таблиц',
      error: error.message 
    }, { status: 500 });
  }
}

// Обработчик проверки БД
async function handleCheckDatabase() {
  try {
    console.log('🔍 Проверка статуса базы данных...');
    
    const status = await checkDatabaseStatus();
    const totalTables = Object.keys(status).length;
    const existingTables = Object.values(status).filter(Boolean).length;
    
    return NextResponse.json({
      success: true,
      status,
      summary: {
        total: totalTables,
        existing: existingTables,
        missing: totalTables - existingTables,
        ready: existingTables === totalTables
      },
      message: existingTables === totalTables 
        ? '✅ Все таблицы готовы к работе!'
        : `⚠️ Готово ${existingTables}/${totalTables} таблиц. Нужно создать недостающие.`
    });
  } catch (error: any) {
    console.error('❌ Ошибка handleCheckDatabase:', error);
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
}
