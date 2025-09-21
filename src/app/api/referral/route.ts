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
    
    if (action === 'use_referral') {
      // Использовать реферальный код при регистрации
      if (!referralCode) {
        return NextResponse.json({ error: 'Referral code is required' }, { status: 400 });
      }
      
      // Проверяем что пользователь еще не использовал реферальный код
      const { data: existingReferral } = await supabase
        .from('referrals')
        .select('id')
        .eq('referred_id', userId)
        .single();
      
      if (existingReferral) {
        return NextResponse.json({ 
          error: 'Вы уже использовали реферальный код',
          success: false 
        });
      }
      
      // Используем stored procedure для обработки реферального бонуса
      const { data, error } = await supabase
        .rpc('process_referral_bonus', {
          referrer_code: referralCode,
          new_user_id: userId
        });
      
      if (error || !data) {
        console.error('Error processing referral bonus:', error);
        return NextResponse.json({ 
          error: 'Неверный реферальный код или код уже использован',
          success: false 
        });
      }
      
      return NextResponse.json({ 
        message: 'Реферальный бонус успешно начислен!',
        coinsEarned: 100,
        success: true 
      });
    }
    
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    
  } catch (error) {
    console.error('Referral POST API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}