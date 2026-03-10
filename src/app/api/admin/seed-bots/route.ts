import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { requireAdmin } from '@/lib/admin-utils';

// 🤖 15 реалистичных ботов с прикольными никами и аватарами
// telegram_id < 0 — боты, это стандарт для нашей системы
const BOT_PROFILES = [
  {
    telegram_id: -1001,
    username: 'AlexStorm',
    first_name: 'Александр',
    last_name: 'Громов',
    rating: 1450,
    games_played: 87,
    games_won: 41,
    coins: 12500,
  },
  {
    telegram_id: -1002,
    username: 'DarkPhoenix',
    first_name: 'Дмитрий',
    last_name: 'Волков',
    rating: 1620,
    games_played: 145,
    games_won: 78,
    coins: 18700,
  },
  {
    telegram_id: -1003,
    username: 'MariaStar',
    first_name: 'Мария',
    last_name: 'Звёздная',
    rating: 1380,
    games_played: 62,
    games_won: 28,
    coins: 8900,
  },
  {
    telegram_id: -1004,
    username: 'NightWolf77',
    first_name: 'Никита',
    last_name: 'Серов',
    rating: 1510,
    games_played: 112,
    games_won: 56,
    coins: 15200,
  },
  {
    telegram_id: -1005,
    username: 'KiraCool',
    first_name: 'Кира',
    last_name: 'Мирная',
    rating: 1290,
    games_played: 43,
    games_won: 18,
    coins: 6300,
  },
  {
    telegram_id: -1006,
    username: 'MaxPower',
    first_name: 'Максим',
    last_name: 'Сильный',
    rating: 1700,
    games_played: 203,
    games_won: 115,
    coins: 24100,
  },
  {
    telegram_id: -1007,
    username: 'AceHunter',
    first_name: 'Артём',
    last_name: 'Козырев',
    rating: 1440,
    games_played: 78,
    games_won: 35,
    coins: 11600,
  },
  {
    telegram_id: -1008,
    username: 'SofiPlay',
    first_name: 'София',
    last_name: 'Игрова',
    rating: 1350,
    games_played: 56,
    games_won: 24,
    coins: 7800,
  },
  {
    telegram_id: -1009,
    username: 'IvanThunder',
    first_name: 'Иван',
    last_name: 'Громов',
    rating: 1560,
    games_played: 134,
    games_won: 69,
    coins: 16400,
  },
  {
    telegram_id: -1010,
    username: 'LuckyAnn',
    first_name: 'Анна',
    last_name: 'Удачная',
    rating: 1480,
    games_played: 91,
    games_won: 47,
    coins: 13900,
  },
  {
    telegram_id: -1011,
    username: 'ProVlad',
    first_name: 'Владислав',
    last_name: 'Мастеров',
    rating: 1630,
    games_played: 156,
    games_won: 84,
    coins: 19800,
  },
  {
    telegram_id: -1012,
    username: 'EgorBlaze',
    first_name: 'Егор',
    last_name: 'Пламенный',
    rating: 1410,
    games_played: 73,
    games_won: 33,
    coins: 10200,
  },
  {
    telegram_id: -1013,
    username: 'DianaFrost',
    first_name: 'Диана',
    last_name: 'Морозова',
    rating: 1340,
    games_played: 51,
    games_won: 22,
    coins: 7100,
  },
  {
    telegram_id: -1014,
    username: 'SergeyKing',
    first_name: 'Сергей',
    last_name: 'Королёв',
    rating: 1580,
    games_played: 128,
    games_won: 67,
    coins: 17500,
  },
  {
    telegram_id: -1015,
    username: 'AlinaShadow',
    first_name: 'Алина',
    last_name: 'Тенева',
    rating: 1470,
    games_played: 85,
    games_won: 40,
    coins: 12800,
  },
];

// Генерация SVG аватара с уникальным стилем для каждого бота
function generateBotAvatar(name: string, seed: number): string {
  const gradients = [
    ['#FF6B6B', '#EE5A24'], // Красный огонь
    ['#4ECDC4', '#2ECC71'], // Бирюзово-зелёный
    ['#45B7D1', '#6366F1'], // Голубой-фиолетовый
    ['#FFA502', '#FF6B6B'], // Оранжевый-красный
    ['#A29BFE', '#6C5CE7'], // Сиреневый
    ['#55EFC4', '#00B894'], // Мятный
    ['#FD79A8', '#E84393'], // Розовый
    ['#74B9FF', '#0984E3'], // Голубой
    ['#FDCB6E', '#E17055'], // Золотой-коралл
    ['#81ECEC', '#00CEC9'], // Аквамарин
    ['#DFE6E9', '#636E72'], // Серебро
    ['#FF7675', '#D63031'], // Вишнёвый
    ['#A0E7E5', '#4ECCA3'], // Нефрит
    ['#FFEAA7', '#FDCB6E'], // Солнечный
    ['#DCDDE1', '#7F8FA6'], // Платина
  ];

  const emojis = ['🦊', '🐺', '🦅', '🐯', '🦋', '🔥', '⚡', '🌟', '💎', '🎯', '🏆', '🎪', '🌊', '❄️', '🌸'];
  
  const gradient = gradients[seed % gradients.length];
  const emoji = emojis[seed % emojis.length];
  
  const initials = name
    .split(' ')
    .map(word => word[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200">
    <defs>
      <linearGradient id="grad${seed}" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" style="stop-color:${gradient[0]};stop-opacity:1" />
        <stop offset="100%" style="stop-color:${gradient[1]};stop-opacity:1" />
      </linearGradient>
      <filter id="shadow${seed}">
        <feDropShadow dx="0" dy="2" stdDeviation="3" flood-color="rgba(0,0,0,0.3)" />
      </filter>
    </defs>
    <circle cx="100" cy="100" r="98" fill="url(#grad${seed})" stroke="rgba(255,255,255,0.3)" stroke-width="3"/>
    <circle cx="100" cy="100" r="80" fill="rgba(0,0,0,0.15)"/>
    <text x="100" y="90" font-family="Arial,sans-serif" font-size="52" font-weight="bold" fill="white" text-anchor="middle" dominant-baseline="central" filter="url(#shadow${seed})">${initials}</text>
    <text x="100" y="150" font-size="36" text-anchor="middle" dominant-baseline="central">${emoji}</text>
  </svg>`;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export async function POST(request: NextRequest) {
  try {
    // Проверяем права админа
    const adminCheck = await requireAdmin(request);
    if (!adminCheck.isAdmin) {
      return NextResponse.json(
        { success: false, error: adminCheck.error || 'Forbidden' },
        { status: 403 }
      );
    }

    console.log('🤖 [SEED-BOTS] Запуск посева ботов...');

    let created = 0;
    let updated = 0;
    let errors = 0;

    for (let i = 0; i < BOT_PROFILES.length; i++) {
      const bot = BOT_PROFILES[i];
      const avatarUrl = generateBotAvatar(bot.first_name + ' ' + bot.last_name, i);

      // Проверяем существует ли бот
      const { data: existing } = await supabaseAdmin
        .from('_pidr_users')
        .select('id')
        .eq('telegram_id', bot.telegram_id.toString())
        .single();

      if (existing) {
        // Обновляем существующего бота
        const { error } = await supabaseAdmin
          .from('_pidr_users')
          .update({
            username: bot.username,
            first_name: bot.first_name,
            last_name: bot.last_name,
            rating: bot.rating,
            games_played: bot.games_played,
            games_won: bot.games_won,
            coins: bot.coins,
            avatar_url: avatarUrl,
            status: 'offline',
            is_active: true,
            updated_at: new Date().toISOString(),
          })
          .eq('telegram_id', bot.telegram_id.toString());

        if (error) {
          console.error(`❌ [SEED-BOTS] Ошибка обновления бота ${bot.username}:`, error);
          errors++;
        } else {
          updated++;
        }
      } else {
        // Создаём нового бота
        const { error } = await supabaseAdmin
          .from('_pidr_users')
          .insert({
            telegram_id: bot.telegram_id.toString(),
            username: bot.username,
            first_name: bot.first_name,
            last_name: bot.last_name,
            rating: bot.rating,
            games_played: bot.games_played,
            games_won: bot.games_won,
            coins: bot.coins,
            avatar_url: avatarUrl,
            status: 'offline',
            is_active: true,
            is_admin: false,
          });

        if (error) {
          console.error(`❌ [SEED-BOTS] Ошибка создания бота ${bot.username}:`, error);
          errors++;
        } else {
          created++;
        }
      }
    }

    // Считаем общее количество ботов в БД
    const { count } = await supabaseAdmin
      .from('_pidr_users')
      .select('id', { count: 'exact', head: true })
      .lt('telegram_id', '0');

    console.log(`✅ [SEED-BOTS] Готово! Создано: ${created}, обновлено: ${updated}, ошибок: ${errors}, всего ботов: ${count}`);

    return NextResponse.json({
      success: true,
      created,
      updated,
      errors,
      totalBots: count || 0,
      botProfiles: BOT_PROFILES.map(b => ({
        telegram_id: b.telegram_id,
        username: b.username,
        name: `${b.first_name} ${b.last_name}`,
        rating: b.rating,
      })),
    });
  } catch (error: any) {
    console.error('❌ [SEED-BOTS] Ошибка:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Внутренняя ошибка сервера' },
      { status: 500 }
    );
  }
}

// GET — получить список ботов
export async function GET(request: NextRequest) {
  try {
    const adminCheck = await requireAdmin(request);
    if (!adminCheck.isAdmin) {
      return NextResponse.json(
        { success: false, error: adminCheck.error || 'Forbidden' },
        { status: 403 }
      );
    }

    const { data: bots, error } = await supabaseAdmin
      .from('_pidr_users')
      .select('id, telegram_id, username, first_name, last_name, avatar_url, rating, games_played, games_won, coins, status')
      .lt('telegram_id', '0')
      .order('rating', { ascending: false });

    if (error) {
      throw error;
    }

    return NextResponse.json({
      success: true,
      bots: bots || [],
      total: bots?.length || 0,
    });
  } catch (error: any) {
    console.error('❌ [SEED-BOTS] Ошибка получения ботов:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Внутренняя ошибка сервера' },
      { status: 500 }
    );
  }
}

