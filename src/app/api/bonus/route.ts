import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '../../../lib/supabase';
import { requireAuth } from '../../../lib/auth-utils';

// POST /api/bonus - Получить бонус
export async function POST(req: NextRequest) {
  console.log('🎁 POST /api/bonus - Получение бонуса...');
  
  const auth = requireAuth(req);
  if (auth.error) {
    console.error('❌ Ошибка авторизации:', auth.error);
    return NextResponse.json({ success: false, message: auth.error }, { status: 401 });
  }
  
  const userId = auth.userId;
  
  try {
    const { bonusType } = await req.json();
    
    if (!bonusType) {
      return NextResponse.json({ 
        success: false, 
        message: 'Не указан тип бонуса' 
      }, { status: 400 });
    }
    
    console.log(`🎁 Обработка бонуса "${bonusType}" для пользователя:`, userId);
    
    // Получаем текущего пользователя
    const { data: user, error: userError } = await supabase
      .from('_pidr_users')
      .select('id, username, coins, telegram_id')
      .eq('id', userId)
      .single();
      
    if (userError || !user) {
      console.error('❌ Пользователь не найден:', userError);
      return NextResponse.json({ 
        success: false, 
        message: 'Пользователь не найден' 
      }, { status: 404 });
    }
    
    console.log('👤 Текущий пользователь:', user.username, 'Баланс:', user.coins);
    
    // Рассчитываем размер бонуса
    let bonusAmount = 0;
    let bonusDescription = '';
    
    switch (bonusType) {
      case 'daily':
        // ✅ СТРОГАЯ ПРОВЕРКА ЕЖЕДНЕВНОГО БОНУСА
        const now = new Date();
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);
        
        console.log(`🔍 Проверяем ежедневный бонус для ${userId} за ${todayStart.toISOString()}`);
        
        const { data: dailyBonusToday, error: dailyError } = await supabase
          .from('_pidr_transactions')
          .select('id, created_at, amount')
          .eq('user_id', userId)
          .eq('type', 'bonus')
          .eq('bonus_type', 'daily')
          .gte('created_at', todayStart.toISOString())
          .lt('created_at', todayEnd.toISOString())
          .order('created_at', { ascending: false })
          .limit(1);
        
        if (dailyError) {
          console.error('❌ Ошибка проверки ежедневного бонуса:', dailyError);
        }
        
        if (dailyBonusToday && dailyBonusToday.length > 0) {
          const lastBonus = dailyBonusToday[0];
          const nextBonusTime = new Date(todayEnd.getTime());
          const hoursLeft = Math.ceil((nextBonusTime.getTime() - now.getTime()) / (1000 * 60 * 60));
          
          console.log(`⏰ Ежедневный бонус уже получен сегодня в ${lastBonus.created_at}`);
          return NextResponse.json({ 
            success: false, 
            message: `Ежедневный бонус уже получен! Следующий через ${hoursLeft} ч.`,
            data: { 
              cooldownUntil: nextBonusTime,
              hoursLeft,
              lastBonusAmount: lastBonus.amount,
              lastBonusTime: lastBonus.created_at
            }
          }, { status: 400 });
        }
        
        bonusAmount = Math.floor(Math.random() * 150) + 50; // 50-200 монет
        bonusDescription = 'Ежедневный бонус';
        console.log(`✅ Ежедневный бонус доступен: ${bonusAmount} монет`);
        break;
        
      case 'referral':
        // ❌ РЕФЕРАЛЫ НЕ ДОЛЖНЫ ВЫДАВАТЬСЯ НАПРЯМУЮ ЧЕРЕЗ ЭТОТ API
        // Рефералы обрабатываются автоматически через stored procedure
        console.log('❌ Попытка получить реферальный бонус напрямую');
        return NextResponse.json({ 
          success: false, 
          message: 'Реферальные бонусы начисляются автоматически при выполнении условий' 
        }, { status: 400 });
        break;
        
      case 'rank_up':
        bonusAmount = Math.floor(Math.random() * 1500) + 500; // 500-2000 монет
        bonusDescription = 'Бонус за повышение ранга';
        break;
        
      default:
        return NextResponse.json({ 
          success: false, 
          message: 'Неизвестный тип бонуса' 
        }, { status: 400 });
    }
    
    console.log(`💰 Размер бонуса: ${bonusAmount} монет`);
    
    // Начинаем транзакцию в Supabase
    const newBalance = user.coins + bonusAmount;
    
    // 1. Обновляем баланс пользователя
    const { error: updateError } = await supabase
      .from('_pidr_users')
      .update({ 
        coins: newBalance,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId);
      
    if (updateError) {
      console.error('❌ Ошибка обновления баланса:', updateError);
      return NextResponse.json({ 
        success: false, 
        message: 'Ошибка обновления баланса' 
      }, { status: 500 });
    }
    
    // 2. Записываем транзакцию для истории
    const { error: transactionError } = await supabase
      .from('_pidr_transactions')
      .insert({
        user_id: userId,
        type: 'bonus',
        amount: bonusAmount,
        description: bonusDescription,
        bonus_type: bonusType,
        created_at: new Date().toISOString()
      });
      
    if (transactionError) {
      console.warn('⚠️ Ошибка записи транзакции (не критично):', transactionError);
      // Не прерываем процесс, если запись транзакции не удалась
    }
    
    console.log(`✅ Бонус "${bonusType}" успешно начислен пользователю ${user.username}`);
    console.log(`💰 Новый баланс: ${user.coins} → ${newBalance} (+${bonusAmount})`);
    
    return NextResponse.json({ 
      success: true, 
      message: `${bonusDescription}: +${bonusAmount} монет!`,
      data: {
        bonusAmount,
        newBalance,
        oldBalance: user.coins,
        bonusType,
        description: bonusDescription
      }
    });
    
  } catch (error: any) {
    console.error('❌ Критическая ошибка API бонусов:', error);
    return NextResponse.json({ 
      success: false, 
      message: `Внутренняя ошибка сервера: ${error?.message || 'Неизвестная ошибка'}` 
    }, { status: 500 });
  }
}

// GET /api/bonus - Получить доступные бонусы
export async function GET(req: NextRequest) {
  console.log('🎁 GET /api/bonus - Получение списка доступных бонусов...');
  
  const auth = requireAuth(req);
  if (auth.error) {
    return NextResponse.json({ success: false, message: auth.error }, { status: 401 });
  }
  
  const userId = auth.userId;
  
  try {
    // Получаем информацию о последних бонусах пользователя
    const { data: recentBonuses } = await supabase
      .from('_pidr_transactions')
      .select('bonus_type, created_at')
      .eq('user_id', userId)
      .eq('type', 'bonus')
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()) // За последние 24 часа
      .order('created_at', { ascending: false });
    
    // Проверяем доступность бонусов
    const today = new Date().toDateString();
    const dailyBonusToday = recentBonuses?.find(b => 
      b.bonus_type === 'daily' && 
      new Date(b.created_at).toDateString() === today
    );
    
    const availableBonuses = [
      {
        id: 'daily',
        name: 'Ежедневный бонус',
        description: 'Получайте монеты каждый день',
        reward: '50-200 монет',
        icon: '📅',
        available: !dailyBonusToday,
        cooldownUntil: dailyBonusToday ? 
          new Date(new Date(dailyBonusToday.created_at).getTime() + 24 * 60 * 60 * 1000) : null
      },
      {
        id: 'referral',
        name: 'Реферальная система',
        description: 'Приглашайте друзей и получайте бонусы',
        reward: '500 монет за активного друга',
        icon: '👥',
        available: false, // Не доступен для ручного получения
        referrals: 0, // TODO: подсчитать из базы
        note: 'Бонус начисляется автоматически когда приглашенный друг получает первый ежедневный бонус'
      },
      {
        id: 'rank_up',
        name: 'Повышение ранга',
        description: 'Бонусы за достижение новых рангов',
        reward: '500-2000 монет',
        icon: '🏆',
        available: false, // TODO: проверить ранг пользователя
        nextRank: 'Серебро'
      }
    ];
    
    return NextResponse.json({ 
      success: true, 
      bonuses: availableBonuses 
    });
    
  } catch (error: any) {
    console.error('❌ Ошибка получения бонусов:', error);
    return NextResponse.json({ 
      success: false, 
      message: 'Ошибка получения бонусов' 
    }, { status: 500 });
  }
}
