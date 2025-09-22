/**
 * 🏦 UNIFIED MASTER WALLET API
 * Единый API для работы с Master кошельками
 * 
 * Endpoints:
 * GET /api/wallet/unified - Получить адреса пользователя
 * POST /api/wallet/unified - Создать новый адрес
 * PUT /api/wallet/unified - Обновить конфигурацию
 * DELETE /api/wallet/unified - Деактивировать адрес
 */

import { NextRequest, NextResponse } from 'next/server';
import { masterWallet, SupportedNetwork, SUPPORTED_NETWORKS } from '../../../../lib/wallets/unified-master-wallet';
import { supabase } from '../../../../lib/supabase';

// 🔐 Получение userId из запроса
function getUserIdFromRequest(req: NextRequest): string | null {
  // Из headers (если есть авторизация)
  const authHeader = req.headers.get('authorization');
  if (authHeader) {
    // Здесь должна быть логика извлечения userId из JWT
    // Пока возвращаем тестовый ID
  }
  
  // Из query параметров (для тестирования)
  const url = new URL(req.url);
  const userId = url.searchParams.get('userId');
  if (userId) return userId;
  
  // Из cookies (если есть сессия)
  const sessionCookie = req.cookies.get('pidr_session');
  if (sessionCookie) {
    // Здесь должна быть логика извлечения userId из сессии
  }
  
  return null;
}

/**
 * GET /api/wallet/unified
 * Получить все адреса пользователя или статистику системы
 */
export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const action = url.searchParams.get('action') || 'get_addresses';
    const userId = getUserIdFromRequest(req);
    const networks = url.searchParams.get('networks')?.split(',') as SupportedNetwork[] || [];

    console.log(`🔍 GET /api/wallet/unified - action: ${action}, userId: ${userId}`);

    switch (action) {
      case 'get_addresses': {
        if (!userId) {
          return NextResponse.json({
            success: false,
            message: 'userId обязателен для получения адресов'
          }, { status: 400 });
        }

        const addresses = [];
        const requestedNetworks = networks.length > 0 ? networks : Object.keys(SUPPORTED_NETWORKS) as SupportedNetwork[];

        for (const network of requestedNetworks) {
          try {
            const address = await masterWallet.getUserAddress(userId, network);
            if (address) {
              addresses.push({
                network: address.network,
                address: address.address,
                derivationIndex: address.derivationIndex,
                isActive: address.isActive,
                balance: address.balance || '0',
                createdAt: address.createdAt
              });
            }
          } catch (error) {
            console.error(`❌ Ошибка получения ${network} адреса:`, error);
          }
        }

        return NextResponse.json({
          success: true,
          addresses,
          totalNetworks: requestedNetworks.length,
          foundAddresses: addresses.length,
          userId
        });
      }

      case 'get_stats': {
        const stats = await masterWallet.getMasterWalletStats();
        const validation = masterWallet.validateConfiguration();

        return NextResponse.json({
          success: true,
          stats,
          configuration: validation,
          supportedNetworks: Object.keys(SUPPORTED_NETWORKS)
        });
      }

      case 'validate_config': {
        const validation = masterWallet.validateConfiguration();
        
        return NextResponse.json({
          success: validation.isValid,
          validation,
          supportedNetworks: SUPPORTED_NETWORKS
        });
      }

      default:
        return NextResponse.json({
          success: false,
          message: `Неизвестное действие: ${action}`
        }, { status: 400 });
    }

  } catch (error: any) {
    console.error('❌ GET /api/wallet/unified error:', error);
    return NextResponse.json({
      success: false,
      message: 'Внутренняя ошибка сервера',
      error: error.message
    }, { status: 500 });
  }
}

/**
 * POST /api/wallet/unified
 * Создать новый адрес для пользователя
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { network, userId: bodyUserId, memo } = body;
    
    const userId = getUserIdFromRequest(req) || bodyUserId;
    
    if (!userId || !network) {
      return NextResponse.json({
        success: false,
        message: 'userId и network обязательны'
      }, { status: 400 });
    }

    // Проверяем поддерживаемость сети
    if (!SUPPORTED_NETWORKS[network as SupportedNetwork]) {
      return NextResponse.json({
        success: false,
        message: `Сеть ${network} не поддерживается`,
        supportedNetworks: Object.keys(SUPPORTED_NETWORKS)
      }, { status: 400 });
    }

    console.log(`🎯 Генерация ${network} адреса для пользователя ${userId}`);

    // Генерируем адрес
    const address = await masterWallet.generateUserAddress(userId, network as SupportedNetwork);

    // Создаем платежные детали (если нужно)
    let paymentDetails = null;
    if (body.createPayment) {
      const amount = body.amount || '0';
      paymentDetails = await masterWallet.createPaymentDetails(userId, network as SupportedNetwork, amount, memo);
    }

    // Логируем действие
    await supabase.from('_pidr_wallet_logs').insert({
      user_id: userId,
      action: 'generate_address',
      details: {
        network,
        address: address.address,
        derivationIndex: address.derivationIndex,
        isNew: true
      }
    });

    return NextResponse.json({
      success: true,
      address: {
        network: address.network,
        address: address.address,
        derivationIndex: address.derivationIndex,
        isActive: address.isActive,
        createdAt: address.createdAt
      },
      paymentDetails,
      message: `${network} адрес успешно создан`
    });

  } catch (error: any) {
    console.error('❌ POST /api/wallet/unified error:', error);
    return NextResponse.json({
      success: false,
      message: 'Ошибка создания адреса',
      error: error.message
    }, { status: 500 });
  }
}

/**
 * PUT /api/wallet/unified
 * Обновить конфигурацию кошелька или адреса
 */
export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, userId: bodyUserId, network, ...updateData } = body;
    
    const userId = getUserIdFromRequest(req) || bodyUserId;
    
    if (!userId || !action) {
      return NextResponse.json({
        success: false,
        message: 'userId и action обязательны'
      }, { status: 400 });
    }

    console.log(`🔄 PUT /api/wallet/unified - action: ${action}, userId: ${userId}`);

    switch (action) {
      case 'update_balance': {
        if (!network || updateData.balance === undefined) {
          return NextResponse.json({
            success: false,
            message: 'network и balance обязательны для обновления баланса'
          }, { status: 400 });
        }

        // Обновляем баланс в БД
        const { error } = await supabase
          .from('_pidr_user_wallet_addresses')
          .update({
            balance: updateData.balance,
            last_checked_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('user_id', userId)
          .eq('network', network);

        if (error) {
          throw new Error(`Ошибка обновления баланса: ${error.message}`);
        }

        // Логируем действие
        await supabase.from('_pidr_wallet_logs').insert({
          user_id: userId,
          action: 'update_balance',
          details: {
            network,
            newBalance: updateData.balance,
            previousBalance: updateData.previousBalance || null
          }
        });

        return NextResponse.json({
          success: true,
          message: `Баланс ${network} обновлен`,
          newBalance: updateData.balance
        });
      }

      case 'deactivate_address': {
        if (!network) {
          return NextResponse.json({
            success: false,
            message: 'network обязателен для деактивации адреса'
          }, { status: 400 });
        }

        // Деактивируем адрес
        const { error } = await supabase
          .from('_pidr_user_wallet_addresses')
          .update({
            is_active: false,
            updated_at: new Date().toISOString()
          })
          .eq('user_id', userId)
          .eq('network', network);

        if (error) {
          throw new Error(`Ошибка деактивации адреса: ${error.message}`);
        }

        // Логируем действие
        await supabase.from('_pidr_wallet_logs').insert({
          user_id: userId,
          action: 'deactivate_address',
          details: { network }
        });

        return NextResponse.json({
          success: true,
          message: `Адрес ${network} деактивирован`
        });
      }

      default:
        return NextResponse.json({
          success: false,
          message: `Неизвестное действие: ${action}`
        }, { status: 400 });
    }

  } catch (error: any) {
    console.error('❌ PUT /api/wallet/unified error:', error);
    return NextResponse.json({
      success: false,
      message: 'Ошибка обновления',
      error: error.message
    }, { status: 500 });
  }
}

/**
 * DELETE /api/wallet/unified
 * Удалить или деактивировать адрес (безопасное удаление)
 */
export async function DELETE(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const network = url.searchParams.get('network');
    const userId = getUserIdFromRequest(req);
    const force = url.searchParams.get('force') === 'true';
    
    if (!userId || !network) {
      return NextResponse.json({
        success: false,
        message: 'userId и network обязательны'
      }, { status: 400 });
    }

    console.log(`🗑️ DELETE /api/wallet/unified - network: ${network}, userId: ${userId}, force: ${force}`);

    if (force) {
      // Полное удаление (только для разработки)
      const { error } = await supabase
        .from('_pidr_user_wallet_addresses')
        .delete()
        .eq('user_id', userId)
        .eq('network', network);

      if (error) {
        throw new Error(`Ошибка удаления адреса: ${error.message}`);
      }

      // Логируем действие
      await supabase.from('_pidr_wallet_logs').insert({
        user_id: userId,
        action: 'delete_address',
        details: { network, force: true }
      });

      return NextResponse.json({
        success: true,
        message: `Адрес ${network} полностью удален`
      });
    } else {
      // Безопасная деактивация
      const { error } = await supabase
        .from('_pidr_user_wallet_addresses')
        .update({
          is_active: false,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId)
        .eq('network', network);

      if (error) {
        throw new Error(`Ошибка деактивации адреса: ${error.message}`);
      }

      // Логируем действие
      await supabase.from('_pidr_wallet_logs').insert({
        user_id: userId,
        action: 'deactivate_address',
        details: { network }
      });

      return NextResponse.json({
        success: true,
        message: `Адрес ${network} деактивирован`
      });
    }

  } catch (error: any) {
    console.error('❌ DELETE /api/wallet/unified error:', error);
    return NextResponse.json({
      success: false,
      message: 'Ошибка удаления адреса',
      error: error.message
    }, { status: 500 });
  }
}
