import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { GAME_TABLES, getTableById, calculateTablePrice } from '@/data/tables';
import { GameTable, TablePurchaseResult } from '@/types/tables';

/**
 * 🛍️ TABLES API
 * API для работы с столами
 */

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');
    const userId = searchParams.get('userId');

    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || '',
      process.env.SUPABASE_SERVICE_ROLE_KEY || '',
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          },
        },
      }
    );

    switch (action) {
      case 'list':
        // Получить все доступные столы
        return NextResponse.json({
          success: true,
          tables: GAME_TABLES
        });

      case 'user_inventory':
        if (!userId) {
          return NextResponse.json({
            success: false,
            message: 'User ID is required'
          }, { status: 400 });
        }

        // Получить инвентарь пользователя
        const { data: userTables, error } = await supabase
          .from('user_tables')
          .select('*')
          .eq('user_id', userId)
          .single();

        if (error && error.code !== 'PGRST116') {
          console.error('Error fetching user tables:', error);
          return NextResponse.json({
            success: false,
            message: 'Failed to fetch user tables'
          }, { status: 500 });
        }

        // Если записи нет, создаем дефолтный инвентарь
        if (!userTables) {
          const defaultInventory = {
            user_id: userId,
            owned_tables: ['classic-green'],
            equipped_table: 'classic-green',
            favorite_tables: []
          };

          const { data: newInventory, error: createError } = await supabase
            .from('user_tables')
            .insert(defaultInventory)
            .select()
            .single();

          if (createError) {
            console.error('Error creating user tables:', createError);
            return NextResponse.json({
              success: false,
              message: 'Failed to create user tables'
            }, { status: 500 });
          }

          return NextResponse.json({
            success: true,
            inventory: newInventory
          });
        }

        return NextResponse.json({
          success: true,
          inventory: userTables
        });

      case 'equipped':
        if (!userId) {
          return NextResponse.json({
            success: false,
            message: 'User ID is required'
          }, { status: 400 });
        }

        // Получить экипированный стол
        const { data: equipped, error: equippedError } = await supabase
          .from('user_tables')
          .select('equipped_table')
          .eq('user_id', userId)
          .single();

        if (equippedError) {
          return NextResponse.json({
            success: false,
            message: 'Failed to fetch equipped table'
          }, { status: 500 });
        }

        const equippedTable = getTableById(equipped.equipped_table);
        
        return NextResponse.json({
          success: true,
          equippedTable
        });

      default:
        return NextResponse.json({
          success: false,
          message: 'Invalid action'
        }, { status: 400 });
    }
  } catch (error) {
    console.error('Tables API error:', error);
    return NextResponse.json({
      success: false,
      message: 'Internal server error'
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, userId, tableId, categoryId } = body;

    if (!userId) {
      return NextResponse.json({
        success: false,
        message: 'User ID is required'
      }, { status: 400 });
    }

    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || '',
      process.env.SUPABASE_SERVICE_ROLE_KEY || '',
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          },
        },
      }
    );

    switch (action) {
      case 'purchase':
        if (!tableId) {
          return NextResponse.json({
            success: false,
            message: 'Table ID is required'
          }, { status: 400 });
        }

        // Получаем данные стола
        const table = getTableById(tableId);
        if (!table) {
          return NextResponse.json({
            success: false,
            message: 'Table not found'
          }, { status: 404 });
        }

        // Получаем пользователя и его баланс
        const { data: user, error: userError } = await supabase
          .from('users')
          .select('balance, level, gems')
          .eq('id', userId)
          .single();

        if (userError) {
          return NextResponse.json({
            success: false,
            message: 'User not found'
          }, { status: 404 });
        }

        // Получаем инвентарь пользователя
        const { data: userTables, error: tablesError } = await supabase
          .from('user_tables')
          .select('*')
          .eq('user_id', userId)
          .single();

        if (tablesError && tablesError.code !== 'PGRST116') {
          return NextResponse.json({
            success: false,
            message: 'Failed to fetch user tables'
          }, { status: 500 });
        }

        // Проверяем, не куплен ли уже стол
        const ownedTables = userTables?.owned_tables || ['classic-green'];
        if (ownedTables.includes(tableId)) {
          return NextResponse.json({
            success: false,
            message: 'Table already owned'
          }, { status: 400 });
        }

        // Проверяем требования
        if (table.requirements?.level && user.level < table.requirements.level) {
          return NextResponse.json({
            success: false,
            message: `Requires level ${table.requirements.level}`
          }, { status: 400 });
        }

        if (table.requirements?.previousTables) {
          const missingTables = table.requirements.previousTables.filter(
            reqTableId => !ownedTables.includes(reqTableId)
          );
          if (missingTables.length > 0) {
            return NextResponse.json({
              success: false,
              message: 'Missing required tables'
            }, { status: 400 });
          }
        }

        // Рассчитываем цену со скидкой
        const price = calculateTablePrice(table, categoryId === 'featured');

        // Проверяем баланс
        if (table.currency === 'coins' && user.balance < price) {
          return NextResponse.json({
            success: false,
            message: 'Insufficient coins'
          }, { status: 400 });
        }

        if (table.currency === 'gems' && (user.gems || 0) < price) {
          return NextResponse.json({
            success: false,
            message: 'Insufficient gems'
          }, { status: 400 });
        }

        // Выполняем покупку
        const newBalance = table.currency === 'coins' ? user.balance - price : user.balance;
        const newGems = table.currency === 'gems' ? (user.gems || 0) - price : user.gems;
        const newOwnedTables = [...ownedTables, tableId];

        // Обновляем баланс пользователя
        const { error: balanceError } = await supabase
          .from('users')
          .update({ 
            balance: newBalance,
            gems: newGems
          })
          .eq('id', userId);

        if (balanceError) {
          return NextResponse.json({
            success: false,
            message: 'Failed to update balance'
          }, { status: 500 });
        }

        // Обновляем инвентарь столов
        if (userTables) {
          const { error: updateError } = await supabase
            .from('user_tables')
            .update({ owned_tables: newOwnedTables })
            .eq('user_id', userId);

          if (updateError) {
            return NextResponse.json({
              success: false,
              message: 'Failed to update table inventory'
            }, { status: 500 });
          }
        } else {
          const { error: insertError } = await supabase
            .from('user_tables')
            .insert({
              user_id: userId,
              owned_tables: newOwnedTables,
              equipped_table: 'classic-green',
              favorite_tables: []
            });

          if (insertError) {
            return NextResponse.json({
              success: false,
              message: 'Failed to create table inventory'
            }, { status: 500 });
          }
        }

        const result: TablePurchaseResult = {
          success: true,
          message: `${table.name} purchased successfully!`,
          table,
          newBalance: {
            coins: newBalance,
            gems: newGems || 0
          }
        };

        return NextResponse.json(result);

      case 'equip':
        if (!tableId) {
          return NextResponse.json({
            success: false,
            message: 'Table ID is required'
          }, { status: 400 });
        }

        // Проверяем, что стол принадлежит пользователю
        const { data: currentTables, error: currentError } = await supabase
          .from('user_tables')
          .select('owned_tables')
          .eq('user_id', userId)
          .single();

        if (currentError) {
          return NextResponse.json({
            success: false,
            message: 'Failed to fetch user tables'
          }, { status: 500 });
        }

        if (!currentTables.owned_tables.includes(tableId)) {
          return NextResponse.json({
            success: false,
            message: 'Table not owned'
          }, { status: 400 });
        }

        // Экипируем стол
        const { error: equipError } = await supabase
          .from('user_tables')
          .update({ equipped_table: tableId })
          .eq('user_id', userId);

        if (equipError) {
          return NextResponse.json({
            success: false,
            message: 'Failed to equip table'
          }, { status: 500 });
        }

        return NextResponse.json({
          success: true,
          message: 'Table equipped successfully',
          equippedTable: getTableById(tableId)
        });

      default:
        return NextResponse.json({
          success: false,
          message: 'Invalid action'
        }, { status: 400 });
    }
  } catch (error) {
    console.error('Tables POST API error:', error);
    return NextResponse.json({
      success: false,
      message: 'Internal server error'
    }, { status: 500 });
  }
}
