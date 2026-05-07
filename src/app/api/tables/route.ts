import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { GAME_TABLES, getTableById, calculateTablePrice } from '@/data/tables';
import { TablePurchaseResult } from '@/types/tables';

/**
 * 🛍️ TABLES API
 * API для работы с столами
 */

const INVENTORY_TABLE_PRIMARY = '_pidr_user_tables';
const INVENTORY_TABLE_FALLBACK = 'user_tables';
const USERS_TABLE_PRIMARY = '_pidr_users';
const USERS_TABLE_FALLBACK = 'users';

type InventoryRow = {
  user_id: string;
  owned_tables: string[];
  equipped_table: string;
  favorite_tables: string[];
};

function isMissingRelationError(error: any): boolean {
  if (!error) return false;
  const message = String(error.message || '').toLowerCase();
  return error.code === 'PGRST205' || error.code === '42P01' || message.includes('does not exist');
}

async function pickInventoryTable(supabase: any): Promise<string> {
  const tables = [INVENTORY_TABLE_PRIMARY, INVENTORY_TABLE_FALLBACK];
  for (const table of tables) {
    const { error } = await supabase.from(table).select('user_id').limit(1);
    if (!error || !isMissingRelationError(error)) return table;
  }
  return INVENTORY_TABLE_PRIMARY;
}

async function pickUsersTable(supabase: any): Promise<string> {
  const tables = [USERS_TABLE_PRIMARY, USERS_TABLE_FALLBACK];
  for (const table of tables) {
    const { error } = await supabase.from(table).select('id').limit(1);
    if (!error || !isMissingRelationError(error)) return table;
  }
  return USERS_TABLE_PRIMARY;
}

async function getUserInventory(supabase: any, tableName: string, userId: string): Promise<InventoryRow | null> {
  const { data, error } = await supabase
    .from(tableName)
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (error && error.code !== 'PGRST116') throw error;
  return (data as InventoryRow | null) || null;
}

async function getUserWallet(supabase: any, tableName: string, userId: string) {
  if (tableName === USERS_TABLE_PRIMARY) {
    let query = supabase
      .from(tableName)
      .select('id, coins, gems, rating, telegram_id')
      .eq('id', userId)
      .maybeSingle();

    let { data, error } = await query;
    if (!data) {
      const fallback = await supabase
        .from(tableName)
        .select('id, coins, gems, rating, telegram_id')
        .eq('telegram_id', userId)
        .maybeSingle();
      data = fallback.data;
      error = fallback.error;
    }

    if (error || !data) return null;
    return {
      id: String(data.id),
      coins: Number(data.coins || 0),
      gems: Number(data.gems || 0),
      level: Number(data.rating || 0),
      update: async (coins: number, gems: number) => {
        return supabase.from(tableName).update({ coins, gems }).eq('id', data.id);
      }
    };
  }

  const { data, error } = await supabase
    .from(tableName)
    .select('id, balance, gems, level')
    .eq('id', userId)
    .maybeSingle();

  if (error || !data) return null;
  return {
    id: String(data.id),
    coins: Number(data.balance || 0),
    gems: Number(data.gems || 0),
    level: Number(data.level || 0),
    update: async (coins: number, gems: number) => {
      return supabase.from(tableName).update({ balance: coins, gems }).eq('id', data.id);
    }
  };
}

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

    const inventoryTable = await pickInventoryTable(supabase);

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
        const userTables = await getUserInventory(supabase, inventoryTable, userId);

        if (!userTables) {
          const defaultInventory = {
            user_id: userId,
            owned_tables: ['classic-green'],
            equipped_table: 'classic-green',
            favorite_tables: []
          };

          const { data: newInventory, error: createError } = await supabase
            .from(inventoryTable)
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
          .from(inventoryTable)
          .select('equipped_table')
          .eq('user_id', userId)
          .maybeSingle();

        if (equippedError || !equipped) {
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
  } catch (error: unknown) {
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

    const inventoryTable = await pickInventoryTable(supabase);
    const usersTable = await pickUsersTable(supabase);

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
        const user = await getUserWallet(supabase, usersTable, userId);
        if (!user) {
          return NextResponse.json({
            success: false,
            message: 'User not found'
          }, { status: 404 });
        }

        // Получаем инвентарь пользователя
        const userTables = await getUserInventory(supabase, inventoryTable, userId);

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
        if (table.currency === 'coins' && user.coins < price) {
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
        const newBalance = table.currency === 'coins' ? user.coins - price : user.coins;
        const newGems = table.currency === 'gems' ? (user.gems || 0) - price : user.gems;
        const newOwnedTables = [...ownedTables, tableId];

        // Обновляем баланс пользователя
        const { error: balanceError } = await user.update(newBalance, newGems);

        if (balanceError) {
          return NextResponse.json({
            success: false,
            message: 'Failed to update balance'
          }, { status: 500 });
        }

        // Обновляем инвентарь столов
        if (userTables) {
          const { error: updateError } = await supabase
            .from(inventoryTable)
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
            .from(inventoryTable)
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
          .from(inventoryTable)
          .select('owned_tables')
          .eq('user_id', userId)
          .maybeSingle();

        if (currentError || !currentTables) {
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
          .from(inventoryTable)
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
  } catch (error: unknown) {
    console.error('Tables POST API error:', error);
    return NextResponse.json({
      success: false,
      message: 'Internal server error'
    }, { status: 500 });
  }
}
