import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '../../../../lib/supabase';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET;

function getUserIdFromRequest(req: NextRequest): string | null {
  if (!JWT_SECRET) return null;
  const auth = req.headers.get('authorization');
  if (!auth) return null;
  const token = auth.replace('Bearer ', '');
  try {
    const payload = jwt.verify(token, JWT_SECRET) as any;
    return payload.userId;
  } catch {
    return null;
  }
}

// GET /api/wallet/hd-addresses - Получить HD адреса пользователя
export async function GET(req: NextRequest) {
  const userId = getUserIdFromRequest(req);
  if (!userId) {
    return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
  }

  try {
    console.log(`💳 Получаем HD адреса для пользователя ${userId}`);

    const { data: hdAddresses, error } = await supabase
      .from('_pidr_hd_wallets')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('❌ Ошибка получения HD адресов:', error);
      return NextResponse.json({ 
        success: false, 
        message: 'Ошибка получения адресов' 
      }, { status: 500 });
    }

    // Если у пользователя нет адресов, генерируем их
    if (!hdAddresses || hdAddresses.length === 0) {
      console.log('💳 HD адреса не найдены, генерируем...');
      
      try {
        const { HDWalletService } = await import('../../../../lib/wallets/hd-wallet-service');
        const walletService = new HDWalletService();
        
        const supportedCoins = ['TON', 'BTC', 'ETH', 'USDT_TRC20', 'SOL'];
        const newAddresses = [];

        for (const coin of supportedCoins) {
          try {
            const hdAddress = await walletService.generateUserAddress(userId, coin);
            if (hdAddress) {
              console.log(`✅ Сгенерирован ${coin} адрес для пользователя`);
              
              const { data: savedAddress, error: saveError } = await supabase
                .from('_pidr_hd_wallets')
                .insert({
                  user_id: userId,
                  coin: hdAddress.coin,
                  address: hdAddress.address,
                  derivation_path: hdAddress.derivationPath,
                  address_index: hdAddress.index,
                  created_at: new Date().toISOString()
                })
                .select()
                .single();

              if (!saveError && savedAddress) {
                newAddresses.push(savedAddress);
              }
            }
          } catch (coinError) {
            console.warn(`⚠️ Не удалось создать ${coin} адрес:`, coinError);
          }
        }

        return NextResponse.json({ 
          success: true, 
          addresses: newAddresses,
          message: 'HD адреса успешно сгенерированы'
        });

      } catch (walletError) {
        console.error('❌ Ошибка генерации HD адресов:', walletError);
        return NextResponse.json({ 
          success: false, 
          message: 'Ошибка генерации адресов' 
        }, { status: 500 });
      }
    }

    // Форматируем адреса для фронтенда
    const formattedAddresses = hdAddresses.map((addr: any) => ({
      coin: addr.coin,
      address: addr.address,
      derivationPath: addr.derivation_path,
      index: addr.address_index,
      createdAt: addr.created_at
    }));

    console.log(`✅ Найдено ${hdAddresses.length} HD адресов для пользователя`);

    return NextResponse.json({ 
      success: true, 
      addresses: formattedAddresses
    });

  } catch (error) {
    console.error('❌ HD addresses GET error:', error);
    return NextResponse.json({ 
      success: false, 
      message: 'Ошибка сервера' 
    }, { status: 500 });
  }
}

// POST /api/wallet/hd-addresses - Сгенерировать новый адрес для конкретной монеты
export async function POST(req: NextRequest) {
  const userId = getUserIdFromRequest(req);
  if (!userId) {
    return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { coin } = await req.json();

    if (!coin) {
      return NextResponse.json({ 
        success: false, 
        message: 'Не указана монета' 
      }, { status: 400 });
    }

    console.log(`💳 Генерируем новый ${coin} адрес для пользователя ${userId}`);

    // Проверяем, есть ли уже адрес для этой монеты
    const { data: existingAddress } = await supabase
      .from('_pidr_hd_wallets')
      .select('id')
      .eq('user_id', userId)
      .eq('coin', coin)
      .single();

    if (existingAddress) {
      return NextResponse.json({ 
        success: false, 
        message: `Адрес для ${coin} уже существует` 
      }, { status: 400 });
    }

    // Генерируем новый адрес
    const { HDWalletService } = await import('../../../../lib/wallets/hd-wallet-service');
    const walletService = new HDWalletService();
    
    const hdAddress = await walletService.generateUserAddress(userId, coin);
    if (!hdAddress) {
      return NextResponse.json({ 
        success: false, 
        message: `Не удалось сгенерировать адрес для ${coin}` 
      }, { status: 500 });
    }

    // Сохраняем в базу данных
    const { data: savedAddress, error: saveError } = await supabase
      .from('_pidr_hd_wallets')
      .insert({
        user_id: userId,
        coin: hdAddress.coin,
        address: hdAddress.address,
        derivation_path: hdAddress.derivationPath,
        address_index: hdAddress.index,
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (saveError) {
      console.error('❌ Ошибка сохранения HD адреса:', saveError);
      return NextResponse.json({ 
        success: false, 
        message: 'Ошибка сохранения адреса' 
      }, { status: 500 });
    }

    console.log(`✅ Новый ${coin} адрес сгенерирован и сохранен`);

    return NextResponse.json({ 
      success: true, 
      address: {
        coin: savedAddress.coin,
        address: savedAddress.address,
        derivationPath: savedAddress.derivation_path,
        index: savedAddress.address_index,
        createdAt: savedAddress.created_at
      }
    });

  } catch (error) {
    console.error('❌ HD addresses POST error:', error);
    return NextResponse.json({ 
      success: false, 
      message: 'Ошибка сервера' 
    }, { status: 500 });
  }
}
