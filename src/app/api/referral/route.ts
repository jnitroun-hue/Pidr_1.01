import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '../../../lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');
    
    // Получить токен авторизации
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const token = authHeader.substring(7);
    // TODO: Проверить токен и получить user_id
    const userId = 'mock-user-id'; // Заменить на реальную проверку токена
    
    if (action === 'get_code') {
      // Получить реферальный код пользователя
      const { data, error } = await supabase
        .from('users')
        .select('referral_code')
        .eq('id', userId)
        .single();
      
      if (error) {
        console.error('Error fetching referral code:', error);
        return NextResponse.json({ error: 'Failed to fetch referral code' }, { status: 500 });
      }
      
      return NextResponse.json({ 
        referralCode: data?.referral_code || '',
        success: true 
      });
    }
    
    if (action === 'stats') {
      // Получить статистику рефералов
      const { data: referrals, error } = await supabase
        .from('referrals')
        .select(`
          *,
          referred:referred_id(username, display_name, created_at)
        `)
        .eq('referrer_id', userId)
        .eq('is_rewarded', true);
      
      if (error) {
        console.error('Error fetching referral stats:', error);
        return NextResponse.json({ error: 'Failed to fetch referral stats' }, { status: 500 });
      }
      
      const totalReferred = referrals?.length || 0;
      const totalCoinsEarned = referrals?.reduce((sum: number, ref: any) => sum + (ref.reward_coins || 0), 0) || 0;
      
      return NextResponse.json({ 
        totalReferred,
        totalCoinsEarned,
        referrals: referrals || [],
        success: true 
      });
    }
    
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    
  } catch (error) {
    console.error('Referral API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, referralCode } = body;
    
    // Получить токен авторизации
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const token = authHeader.substring(7);
    // TODO: Проверить токен и получить user_id
    const userId = 'mock-user-id'; // Заменить на реальную проверку токена
    
    if (action === 'create_referral_link') {
      // Создать реферальную связь при регистрации
      const { referrerId } = body;
      
      if (!referralCode || !referrerId) {
        return NextResponse.json({ 
          error: 'Referral code and referrer ID are required',
          success: false 
        }, { status: 400 });
      }
      
      // Используем новую функцию для создания реферальной связи
      const { data, error } = await supabase
        .rpc('create_referral_link', {
          p_referrer_id: referrerId,
          p_referred_id: userId,
          p_referral_code: referralCode
        });
      
      if (error) {
        console.error('❌ Ошибка создания реферальной связи:', error);
        return NextResponse.json({ 
          error: 'Ошибка создания реферальной связи',
          success: false 
        }, { status: 500 });
      }
      
      const result = data as any;
      
      if (!result.success) {
        return NextResponse.json({ 
          error: result.error,
          success: false 
        }, { status: 400 });
      }
      
      return NextResponse.json({ 
        message: 'Реферальная связь создана! Бонус будет начислен рефереру когда вы получите первый ежедневный бонус.',
        success: true,
        referralId: result.referral_id
      });
    }
    
    if (action === 'get_stats') {
      // Получить статистику рефералов
      const { data, error } = await supabase
        .rpc('get_referral_stats', {
          p_user_id: userId
        });
      
      if (error) {
        console.error('❌ Ошибка получения статистики рефералов:', error);
        return NextResponse.json({ 
          error: 'Ошибка получения статистики',
          success: false 
        }, { status: 500 });
      }
      
      return NextResponse.json({ 
        success: true,
        stats: data
      });
    }
    
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    
  } catch (error) {
    console.error('Referral POST API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}