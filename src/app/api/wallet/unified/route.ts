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

// 🔐 Получение userId из запроса (исправлено)
function getUserIdFromRequest(req: NextRequest): string | null {
  const JWT_SECRET = process.env.JWT_SECRET;
  if (!JWT_SECRET) return null;
  
  const token = req.cookies.get('auth_token')?.value;
  if (!token) return null;
  
  try {
    const jwt = require('jsonwebtoken');
    const payload = jwt.verify(token, JWT_SECRET) as any;
    return payload.userId;
  } catch {
    return null;
  }
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
          } catch (error: unknown) {
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

      case 'get_master_address': {
        const network = url.searchParams.get('network') as SupportedNetwork;
        if (!network || !SUPPORTED_NETWORKS[network]) {
          return NextResponse.json({
            success: false,
            message: 'Параметр network обязателен и должен быть поддерживаемой сетью'
          }, { status: 400 });
        }

        try {
          const masterAddress = masterWallet.getMasterAddressForDeposit(network);
          return NextResponse.json({
            success: true,
            network,
            address: masterAddress.address,
            memo: masterAddress.memo,
            message: `Master адрес ${network} для депозитов`
          });
        } catch (error: any) {
          return NextResponse.json({
            success: false,
            message: error instanceof Error ? error.message : String(error)
          }, { status: 404 });
        }
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
      error: error instanceof Error ? error.message : String(error)
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

    // ✅ УПРОЩЕНО: Логи кошельков больше не записываются в БД
    console.log(`📝 [wallet] generate_address: ${network} для ${userId}`);

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
      error: error instanceof Error ? error.message : String(error)
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
        // ✅ УПРОЩЕНО: Баланс хранится в _pidr_users.coins
        // Индивидуальные адреса кошельков больше не используются
        return NextResponse.json({
          success: true,
          message: `Баланс ${network} обновлен (через _pidr_users.coins)`,
          newBalance: updateData.balance
        });
      }

      case 'deactivate_address': {
        // ✅ УПРОЩЕНО: Индивидуальные адреса больше не используются
        return NextResponse.json({
          success: true,
          message: `Адрес ${network} деактивирован (функция устарела)`
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
      error: error instanceof Error ? error.message : String(error)
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

    // ✅ УПРОЩЕНО: Индивидуальные адреса больше не хранятся в БД
    // Используем только MASTER_WALLET адреса из переменных окружения
    console.log(`📝 [wallet] delete/deactivate: ${network} для ${userId} (force: ${force})`);
    
    return NextResponse.json({
      success: true,
      message: `Адрес ${network} ${force ? 'удален' : 'деактивирован'} (функция устарела - используем MASTER_WALLET)`
    });

  } catch (error: any) {
    console.error('❌ DELETE /api/wallet/unified error:', error);
    return NextResponse.json({
      success: false,
      message: 'Ошибка удаления адреса',
      error: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}
