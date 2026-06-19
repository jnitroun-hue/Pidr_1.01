import { supabaseAdmin } from '@/lib/supabase';
import { GRAM } from '@/lib/crypto/gram-brand';
import {
  WEEKLY_TOP_PRIZES,
  buildPayoutIdempotencyKey,
  getPayoutWeekKey,
} from './weekly-prizes';

export interface WeeklyPayoutResult {
  weekKey: string;
  alreadyPaid: boolean;
  winners: Array<{
    place: number;
    userId: number;
    username: string;
    prize: string;
    status: 'credited' | 'ton_pending' | 'skipped_duplicate' | 'error';
    message?: string;
  }>;
}

async function wasAlreadyPaid(weekKey: string, place: number, userId: number): Promise<boolean> {
  const key = buildPayoutIdempotencyKey(weekKey, place, userId);

  const { data: coinTx } = await supabaseAdmin
    .from('_pidr_coin_transactions')
    .select('id')
    .eq('transaction_type', 'weekly_rating_prize')
    .ilike('description', `%${key}%`)
    .maybeSingle();

  if (coinTx) return true;

  const { data: cryptoTx } = await supabaseAdmin
    .from('_pidr_crypto_transactions')
    .select('id')
    .eq('transaction_hash', `weekly-${key}`)
    .maybeSingle();

  return !!cryptoTx;
}

async function creditCoins(
  userId: number,
  amount: number,
  weekKey: string,
  place: number,
  username: string
): Promise<{ ok: boolean; message?: string }> {
  const idempotencyKey = buildPayoutIdempotencyKey(weekKey, place, userId);

  if (await wasAlreadyPaid(weekKey, place, userId)) {
    return { ok: true, message: 'already_paid' };
  }

  const { data: user, error: userError } = await supabaseAdmin
    .from('_pidr_users')
    .select('id, coins, username, first_name')
    .eq('id', userId)
    .single();

  if (userError || !user) {
    return { ok: false, message: userError?.message || 'user_not_found' };
  }

  const balanceBefore = user.coins || 0;
  const balanceAfter = balanceBefore + amount;

  const { error: updateError } = await supabaseAdmin
    .from('_pidr_users')
    .update({ coins: balanceAfter })
    .eq('id', userId);

  if (updateError) {
    return { ok: false, message: updateError.message };
  }

  const displayName = username || user.username || user.first_name || 'Игрок';
  const { error: txError } = await supabaseAdmin.from('_pidr_coin_transactions').insert({
    user_id: userId,
    amount,
    transaction_type: 'weekly_rating_prize',
    description: `${idempotencyKey} | ${displayName} — ${place} место, ${amount} монет`,
    balance_before: balanceBefore,
    balance_after: balanceAfter,
  });

  if (txError) {
    console.warn('⚠️ [weekly-prizes] coin tx log failed:', txError.message);
  }

  return { ok: true };
}

async function registerTonPrize(
  userId: number,
  tonAmount: number,
  weekKey: string,
  place: number,
  username: string
): Promise<{ ok: boolean; walletAddress?: string | null; message?: string }> {
  const idempotencyKey = buildPayoutIdempotencyKey(weekKey, place, userId);

  if (await wasAlreadyPaid(weekKey, place, userId)) {
    return { ok: true, message: 'already_paid' };
  }

  const { data: wallet } = await supabaseAdmin
    .from('_pidr_player_wallets')
    .select('wallet_address')
    .eq('user_id', userId)
    .eq('wallet_type', 'ton')
    .eq('is_active', true)
    .maybeSingle();

  const walletAddress = wallet?.wallet_address ?? null;

  const { error: cryptoError } = await supabaseAdmin.from('_pidr_crypto_transactions').insert({
    user_id: userId,
    crypto_type: 'TON',
    transaction_hash: `weekly-${idempotencyKey}`,
    wallet_address: walletAddress || 'pending',
    amount: tonAmount,
    purpose: `weekly_rating_prize:${weekKey}:place:${place}`,
    status: walletAddress ? 'pending_payout' : 'awaiting_wallet',
    created_at: new Date().toISOString(),
  });

  if (cryptoError) {
    // Таблица может отсутствовать — логируем, но не падаем
    console.warn('⚠️ [weekly-prizes] crypto tx insert failed:', cryptoError.message);
  }

  return { ok: true, walletAddress };
}

async function notifyTelegram(
  telegramId: string | null | undefined,
  text: string
): Promise<void> {
  const botToken = process.env.TELEGRAM_BOT_TOKEN || process.env.BOT_TOKEN;
  if (!botToken || !telegramId) return;

  try {
    await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: telegramId,
        text,
        parse_mode: 'HTML',
      }),
    });
  } catch (e) {
    console.warn('⚠️ [weekly-prizes] Telegram notify failed:', e);
  }
}

export async function distributeWeeklyRatingPrizes(
  weekKey = getPayoutWeekKey()
): Promise<WeeklyPayoutResult> {
  const result: WeeklyPayoutResult = {
    weekKey,
    alreadyPaid: false,
    winners: [],
  };

  const { data: topPlayers, error } = await supabaseAdmin
    .from('_pidr_users')
    .select('id, username, first_name, rating, telegram_id')
    .eq('is_active', true)
    .order('rating', { ascending: false })
    .limit(10);

  if (error || !topPlayers?.length) {
    console.error('❌ [weekly-prizes] load top failed:', error);
    return result;
  }

  for (let i = 0; i < topPlayers.length; i++) {
    const player = topPlayers[i];
    const place = i + 1;
    const prize = WEEKLY_TOP_PRIZES.find((p) => p.place === place);
    if (!prize) continue;

    const username = player.username || player.first_name || 'Игрок';

    if (await wasAlreadyPaid(weekKey, place, player.id)) {
      result.winners.push({
        place,
        userId: player.id,
        username,
        prize: prize.label,
        status: 'skipped_duplicate',
      });
      continue;
    }

    if (prize.type === 'coins') {
      const credit = await creditCoins(player.id, prize.amount, weekKey, place, username);
      if (!credit.ok) {
        result.winners.push({
          place,
          userId: player.id,
          username,
          prize: prize.label,
          status: 'error',
          message: credit.message,
        });
        continue;
      }

      if (credit.message === 'already_paid') {
        result.winners.push({
          place,
          userId: player.id,
          username,
          prize: prize.label,
          status: 'skipped_duplicate',
        });
        continue;
      }

      result.winners.push({
        place,
        userId: player.id,
        username,
        prize: prize.label,
        status: 'credited',
      });

      await notifyTelegram(
        player.telegram_id,
        `🏆 <b>Еженедельный приз рейтинга!</b>\n\n` +
          `Вы заняли <b>${place} место</b> (${weekKey}).\n` +
          `Начислено: <b>${prize.label}</b> на игровой баланс.\n\n` +
          `Продолжайте бороться за топ!`
      );
    } else {
      const ton = await registerTonPrize(player.id, prize.amount, weekKey, place, username);
      if (!ton.ok) {
        result.winners.push({
          place,
          userId: player.id,
          username,
          prize: prize.label,
          status: 'error',
          message: ton.message,
        });
        continue;
      }

      if (ton.message === 'already_paid') {
        result.winners.push({
          place,
          userId: player.id,
          username,
          prize: prize.label,
          status: 'skipped_duplicate',
        });
        continue;
      }

      result.winners.push({
        place,
        userId: player.id,
        username,
        prize: prize.label,
        status: 'ton_pending',
        message: ton.walletAddress ? 'wallet_linked' : 'no_wallet',
      });

      const walletHint = ton.walletAddress
        ? `${GRAM.name} будет отправлен на ваш кошелёк <code>${ton.walletAddress.slice(0, 8)}…</code>.`
        : `Подключите ${GRAM.walletLabel} в профиле, чтобы получить приз.`;

      await notifyTelegram(
        player.telegram_id,
        `🏆 <b>Еженедельный приз рейтинга!</b>\n\n` +
          `Вы заняли <b>${place} место</b> (${weekKey}).\n` +
          `Приз: <b>${prize.label}</b>\n\n` +
          `${walletHint}`
      );
    }
  }

  const paidCount = result.winners.filter((w) => w.status === 'credited' || w.status === 'ton_pending').length;
  result.alreadyPaid = paidCount === 0 && result.winners.every((w) => w.status === 'skipped_duplicate');

  console.log(`✅ [weekly-prizes] ${weekKey}: обработано ${result.winners.length} мест`);
  return result;
}
