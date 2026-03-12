import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-utils';
import { supabaseAdmin } from '@/lib/supabase';

/**
 * GET /api/admin/transactions
 * Получить список транзакций (только для админов)
 */
export async function GET(req: NextRequest) {
  try {
    const adminCheck = await requireAdmin(req);
    
    if (!adminCheck.isAdmin) {
      return NextResponse.json({
        success: false,
        error: adminCheck.error || 'Требуются права администратора'
      }, { status: adminCheck.error?.includes('Unauthorized') ? 401 : 403 });
    }

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = (page - 1) * limit;
    const userId = searchParams.get('user_id');
    const transactionType = searchParams.get('type');
    const status = searchParams.get('status');

    // Строим запрос
    let query = supabaseAdmin
      .from('_pidr_coin_transactions')
      .select('*', { count: 'exact' });

    if (userId) {
      // Преобразуем user_id в BIGINT
      const userIdBigInt = parseInt(userId, 10);
      if (!isNaN(userIdBigInt)) {
        query = query.eq('user_id', userIdBigInt);
      }
    }
    if (transactionType) {
      query = query.eq('transaction_type', transactionType);
    }
    if (status) {
      query = query.eq('status', status);
    }

    // Получаем транзакции
    const { data: transactions, error: transactionsError, count } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (transactionsError) {
      console.error('❌ Ошибка загрузки транзакций:', transactionsError);
      return NextResponse.json({
        success: false,
        error: 'Ошибка загрузки транзакций'
      }, { status: 500 });
    }

    const totalPages = Math.ceil((count || 0) / limit);

    // Обогащаем транзакции никнеймами пользователей из _pidr_users
    const txList = transactions || [];
    const userIds = [...new Set(txList.map((t: any) => t.user_id).filter(Boolean))];
    const userMap: Record<number, string> = {};
    if (userIds.length > 0) {
      const { data: users } = await supabaseAdmin
        .from('_pidr_users')
        .select('id, username, first_name')
        .in('id', userIds);
      (users || []).forEach((u: any) => {
        userMap[u.id] = u.username || u.first_name || `ID ${u.id}`;
      });
    }

    const enrichedTransactions = txList.map((t: any) => ({
      ...t,
      username: userMap[t.user_id] || `#${t.user_id}`,
    }));

    return NextResponse.json({
      success: true,
      transactions: enrichedTransactions,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages
      }
    });
  } catch (error: any) {
    console.error('❌ [Admin Transactions] Ошибка:', error);
    return NextResponse.json({
      success: false,
      error: 'Внутренняя ошибка сервера'
    }, { status: 500 });
  }
}

